import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import bootstrapStylesheet from 'bootstrap/dist/css/bootstrap.min.css?url';
import 'bootstrap-icons/font/bootstrap-icons.css';
import {
  STORAGE_KEY, allocateFEFO, daysUntil, expectedStock, newDashboardData,
  restoreDashboardData, statusesFor, sum, todayISO,
} from './dashboardModel';
import './Dashboard.css';

const NAV = [
  { id: 'ringkasan', label: 'Ringkasan', icon: 'house' },
  { id: 'stok', label: 'Stok & kedaluwarsa', icon: 'boxes' },
  { id: 'restok', label: 'Permintaan restok', icon: 'file-earmark-text' },
  { id: 'produksi', label: 'Produksi & pengiriman', icon: 'truck', admin: true },
  { id: 'penjualan', label: 'Penjualan & retur', icon: 'receipt' },
  { id: 'rekonsiliasi', label: 'Rekonsiliasi', icon: 'clipboard-check', admin: true },
  { id: 'master', label: 'Gerai & produk', icon: 'shop', admin: true },
];
const number = new Intl.NumberFormat('id-ID');
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const dateLabel = (value) => dateFormat.format(new Date(`${value}T12:00:00`));
const newId = () => crypto.randomUUID();
const emptyFilters = () => ({ search: '', store: 'semua', product: 'semua', status: 'semua', until: '' });

function EmptyState({ title, detail, action }) {
  return <div className="hb-empty" role="status"><h2 className="h5">{title}</h2><p className="mb-3">{detail}</p>{action}</div>;
}

function Status({ label }) {
  const tone = ['Habis', 'Kedaluwarsa', 'Ditolak', 'Selisih'].includes(label) ? 'danger'
    : ['Segera kedaluwarsa', 'Stok kritis', 'Diajukan'].includes(label) ? 'warning' : 'neutral';
  return <span className={`hb-status hb-status-${tone}`}>{label}</span>;
}

function Heading({ title, detail, action }) {
  return <div className="hb-section-heading"><div><h2 className="h5 mb-1">{title}</h2>{detail && <p className="hb-muted mb-0">{detail}</p>}</div>{action}</div>;
}

function TrendChart({ activities, range, setRange }) {
  const canvasRef = useRef(null);
  const sales = activities.filter((item) => item.kind === 'terjual' || item.kind === 'retur');
  const series = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let offset = range - 1; offset >= 0; offset -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - offset);
      const date = todayISO(day);
      const entries = activities.filter((item) => item.date === date);
      result.push({ date, label: shortDate.format(day), sold: sum(entries.filter((item) => item.kind === 'terjual'), 'quantity'), returned: sum(entries.filter((item) => item.kind === 'retur'), 'quantity') });
    }
    return result;
  }, [activities, range]);

  useEffect(() => {
    if (!canvasRef.current || !sales.length) return undefined;
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: series.map((item) => item.label),
        datasets: [
          { label: 'Terjual', data: series.map((item) => item.sold), borderColor: '#806000', backgroundColor: '#d4af37', tension: 0, borderWidth: 2 },
          { label: 'Retur', data: series.map((item) => item.returned), borderColor: '#394047', backgroundColor: '#394047', tension: 0, borderWidth: 2 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
    return () => chart.destroy();
  }, [sales.length, series]);

  return <section className="hb-panel hb-chart-panel" aria-labelledby="hb-chart-heading">
    <div className="hb-section-heading"><h2 id="hb-chart-heading" className="h5 mb-0">Penjualan & retur</h2><label className="visually-hidden" htmlFor="hb-range">Rentang grafik</label><select id="hb-range" className="form-select" value={range} onChange={(event) => setRange(Number(event.target.value))}><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option></select></div>
    {sales.length ? <><div className="hb-chart"><canvas ref={canvasRef} role="img" aria-label={`Grafik laporan penjualan dan retur, ${range} hari terakhir`} /></div><table className="visually-hidden"><caption>Data grafik penjualan dan retur</caption><thead><tr><th>Tanggal</th><th>Terjual</th><th>Retur</th></tr></thead><tbody>{series.map((item) => <tr key={item.date}><td>{item.date}</td><td>{item.sold}</td><td>{item.returned}</td></tr>)}</tbody></table></>
      : <EmptyState title="Belum ada laporan" detail="Grafik akan tersedia setelah laporan penjualan atau retur dicatat." />}
  </section>;
}

export default function Dashboard() {
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(newDashboardData);
  const dataRef = useRef(data);
  const [storageError, setStorageError] = useState('');
  const [cssReady, setCssReady] = useState(false);
  const [cssError, setCssError] = useState(false);
  const [role, setRole] = useState('admin');
  const [selectedStore, setSelectedStore] = useState('');
  const [page, setPage] = useState('ringkasan');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [range, setRange] = useState(7);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState('');
  const modalRef = useRef(null);
  const sidebarRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const mainRef = useRef(null);

  const readLocalData = useCallback(() => {
    try {
      const restored = restoreDashboardData(window.localStorage.getItem(STORAGE_KEY));
      dataRef.current = restored;
      setData(restored);
      setStorageError('');
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = bootstrapStylesheet;
    stylesheet.onload = () => setCssReady(true);
    stylesheet.onerror = () => setCssError(true);
    document.head.appendChild(stylesheet);
    const oldTitle = document.title;
    document.title = 'Dashboard Konsinyasi | HelcoBali';
    return () => { stylesheet.remove(); document.title = oldTitle; };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(readLocalData, 0);
    return () => window.clearTimeout(timer);
  }, [readLocalData]);

  function updateData(change) {
    const next = change(dataRef.current);
    dataRef.current = next;
    setData(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError('Penyimpanan browser gagal. Perubahan sesi ini belum tersimpan.');
    }
  }

  useEffect(() => {
    if (!modal) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = modalRef.current;
    (panel?.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])') || panel)?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setModal(null); }
      if (event.key !== 'Tab') return;
      const focusables = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previouslyFocused?.isConnected) previouslyFocused.focus(); };
  }, [modal]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const opener = mobileTriggerRef.current;
    sidebarRef.current?.querySelector('button')?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); }
      if (event.key !== 'Tab') return;
      const focusables = [...sidebarRef.current.querySelectorAll('button:not([disabled]), select:not([disabled])')];
      if (event.shiftKey && document.activeElement === focusables[0]) { event.preventDefault(); focusables.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusables.at(-1)) { event.preventDefault(); focusables[0]?.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); opener?.focus(); };
  }, [mobileOpen]);

  const isAdmin = role === 'admin';
  const stores = data.stores;
  const products = data.products;
  const scopedStores = isAdmin ? stores : stores.filter((store) => store.id === selectedStore);
  const scopedRows = isAdmin ? data.rows : data.rows.filter((row) => row.storeId === selectedStore);
  const scopedRequests = isAdmin ? data.requests : data.requests.filter((request) => request.storeId === selectedStore);
  const scopedActivities = isAdmin ? data.activities : data.activities.filter((item) => item.storeId === selectedStore);
  const canRecord = stores.length > 0 && products.length > 0 && (isAdmin || !!selectedStore);
  const storeName = (id) => stores.find((store) => store.id === id)?.name || 'Gerai tidak tersedia';
  const productName = (id) => products.find((product) => product.id === id)?.name || 'Produk tidak tersedia';
  const stockOf = (id) => sum(scopedRows.filter((row) => row.storeId === id), 'physical');
  const expiring = scopedRows.filter((row) => row.physical > 0 && daysUntil(row.expires) >= 0 && daysUntil(row.expires) <= data.settings.expiryDays);
  const criticalStores = data.settings.minStock === null ? [] : scopedStores.filter((store) => scopedRows.some((row) => row.storeId === store.id) && stockOf(store.id) <= data.settings.minStock);
  const pendingRequests = scopedRequests.filter((request) => request.status === 'Diajukan');
  const monthlyReports = scopedActivities.filter((item) => item.kind === 'terjual' && item.date.slice(0, 7) === todayISO().slice(0, 7));
  const alerts = [
    ...(criticalStores.length ? [{ label: 'Stok kritis', detail: `${criticalStores.length} gerai perlu diperiksa`, target: 'stok', status: 'Stok kritis' }] : []),
    ...(expiring.length ? [{ label: 'Segera kedaluwarsa', detail: `${expiring.length} batch perlu diperiksa`, target: 'stok', status: 'Segera kedaluwarsa' }] : []),
    ...(pendingRequests.length ? [{ label: 'Permintaan restok', detail: `${pendingRequests.length} permintaan menunggu tinjauan`, target: 'restok' }] : []),
  ];
  const filteredRows = scopedRows.filter((row) => {
    const query = filters.search.toLocaleLowerCase('id-ID').trim();
    return (!query || `${storeName(row.storeId)} ${productName(row.productId)} ${row.batch}`.toLocaleLowerCase('id-ID').includes(query))
      && (filters.store === 'semua' || row.storeId === filters.store)
      && (filters.product === 'semua' || row.productId === filters.product)
      && (filters.status === 'semua' || statusesFor(row, scopedRows, data.settings).includes(filters.status))
      && (!filters.until || row.expires <= filters.until);
  }).sort((a, b) => a.expires.localeCompare(b.expires));
  const recon = scopedStores.filter((store) => scopedRows.some((row) => row.storeId === store.id)).map((store) => {
    const rows = scopedRows.filter((row) => row.storeId === store.id);
    const expected = rows.reduce((total, row) => total + expectedStock(row), 0);
    const soldRows = rows.filter((row) => row.sold > 0);
    const hasPrices = soldRows.every((row) => products.find((product) => product.id === row.productId)?.price);
    return { ...store, opening: sum(rows, 'opening'), received: sum(rows, 'received'), sold: sum(rows, 'sold'), physical: sum(rows, 'physical'), expected, difference: sum(rows, 'physical') - expected, billed: hasPrices ? rows.reduce((total, row) => total + row.sold * (products.find((product) => product.id === row.productId)?.price || 0), 0) : null };
  });

  function navigate(target, status) {
    setPage(target);
    setMobileOpen(false);
    if (status) setFilters((previous) => ({ ...previous, status }));
    window.requestAnimationFrame(() => mainRef.current?.focus());
    window.scrollTo(0, 0);
  }
  function openModal(type, values = {}) {
    setNotice('');
    setForm(values);
    setModal({ type });
  }
  function prepare(type, values = {}) {
    if (type === 'report' && !scopedRows.length) {
      navigate('stok');
      setNotice('Catat batch stok terlebih dahulu sebelum membuat laporan.');
      return;
    }
    if (!canRecord) {
      if (isAdmin) navigate('master');
      else setNotice('Pilih gerai yang memiliki produk untuk mulai mencatat.');
      return;
    }
    openModal(type, values);
  }
  function submit(event) {
    event.preventDefault();
    const { type } = modal;
    const quantity = Number(form.quantity);
    if (['batch', 'production', 'restock', 'report'].includes(type) && (!Number.isInteger(quantity) || quantity < (form.kind === 'stok' ? 0 : 1) || quantity > 10000)) {
      setNotice('Masukkan jumlah botol yang valid.'); return;
    }
    if (type === 'store' || type === 'product') {
      const name = form.name?.trim();
      if (!name) return;
      if (type === 'store' && stores.some((store) => store.name.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'))) return setNotice('Gerai tersebut sudah dicatat.');
      if (type === 'product' && products.some((product) => product.name.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'))) return setNotice('Produk tersebut sudah dicatat.');
      if (type === 'product' && form.price !== '' && (!Number.isInteger(Number(form.price)) || Number(form.price) < 1)) return setNotice('Harga harus bilangan positif atau dibiarkan kosong.');
      const record = { id: newId(), name, ...(type === 'store' ? { location: form.location?.trim() || '' } : { price: form.price === '' ? null : Number(form.price) }) };
      updateData((previous) => ({ ...previous, [type === 'store' ? 'stores' : 'products']: [...previous[type === 'store' ? 'stores' : 'products'], record] }));
    } else if (type === 'batch' || type === 'production') {
      const batch = form.batch?.trim();
      if (!batch || !form.expires || daysUntil(form.expires) < 0) return setNotice('Isi nomor batch dan tanggal kedaluwarsa yang belum lewat.');
      if (type === 'batch') {
        if (!stores.some((store) => store.id === form.storeId) || !products.some((product) => product.id === form.productId)) return setNotice('Pilih gerai dan produk yang tersedia.');
        if (data.rows.some((row) => row.batch === batch && row.storeId === form.storeId)) return setNotice('Batch sudah tercatat pada gerai ini.');
        updateData((previous) => ({ ...previous, rows: [{ id: newId(), batch, storeId: form.storeId, productId: form.productId, opening: quantity, received: 0, sold: 0, damaged: 0, returned: 0, physical: quantity, expires: form.expires }, ...previous.rows] }));
      } else {
        if (data.production.some((item) => item.batch === batch)) return setNotice('Nomor batch produksi sudah tercatat.');
        updateData((previous) => ({ ...previous, production: [{ id: newId(), batch, productId: form.productId, quantity, available: quantity, expires: form.expires, created: todayISO(), status: 'Diseduh' }, ...previous.production] }));
      }
    } else if (type === 'restock') {
      if (!stores.some((store) => store.id === form.storeId) || !products.some((product) => product.id === form.productId)) return setNotice('Pilih gerai dan produk yang tersedia.');
      updateData((previous) => ({ ...previous, requests: [{ id: newId(), storeId: isAdmin ? form.storeId : selectedStore, productId: form.productId, quantity, status: 'Diajukan', created: todayISO(), note: form.note?.trim() || '', allocations: [] }, ...previous.requests] }));
      navigate('restok');
    } else if (type === 'report') {
      const row = scopedRows.find((item) => item.id === form.rowId);
      if (!row) return setNotice('Pilih batch yang tersedia.');
      if (form.kind !== 'stok' && quantity > row.physical) return setNotice('Jumlah melebihi stok fisik batch.');
      updateData((previous) => ({
        ...previous,
        rows: previous.rows.map((item) => item.id === row.id ? { ...item, physical: form.kind === 'stok' ? quantity : item.physical - quantity, sold: item.sold + (form.kind === 'terjual' ? quantity : 0), damaged: item.damaged + (form.kind === 'rusak' ? quantity : 0), returned: item.returned + (form.kind === 'retur' ? quantity : 0) } : item),
        activities: [{ id: newId(), rowId: row.id, storeId: row.storeId, productId: row.productId, batch: row.batch, kind: form.kind, quantity, date: todayISO(), note: form.note?.trim() || '' }, ...previous.activities],
      }));
    } else if (type === 'settings') {
      const minStock = Number(form.minStock); const expiryDays = Number(form.expiryDays);
      if (!Number.isInteger(minStock) || minStock < 1 || minStock > 10000 || !Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 30) return setNotice('Periksa kembali batas stok dan hari peringatan.');
      updateData((previous) => ({ ...previous, settings: { minStock, expiryDays } }));
    }
    setModal(null);
    setNotice('Catatan diperbarui.');
  }

  function updateRequest(request, next) {
    if (!isAdmin && (next !== 'Diterima' || request.storeId !== selectedStore)) return;
    if (isAdmin && next === 'Diterima') return;
    let allocations = request.allocations;
    if (next === 'Dikirim') {
      allocations = allocateFEFO(data.production, request);
      if (!allocations) { setNotice('Stok produksi siap kirim belum mencukupi permintaan.'); return; }
    }
    updateData((previous) => ({
      ...previous,
      production: next === 'Dikirim' ? previous.production.map((batch) => ({ ...batch, available: batch.available - (allocations.find((item) => item.batchId === batch.id)?.quantity || 0) })) : previous.production,
      rows: next === 'Diterima' ? [...previous.rows, ...allocations.map((item) => ({ id: newId(), batch: item.batch, storeId: request.storeId, productId: request.productId, opening: 0, received: item.quantity, sold: 0, damaged: 0, returned: 0, physical: item.quantity, expires: item.expires }))] : previous.rows,
      requests: previous.requests.map((item) => item.id === request.id ? { ...item, status: next, allocations } : item),
    }));
    setNotice(next === 'Diterima' ? 'Penerimaan dicatat di stok gerai.' : `Permintaan diperbarui: ${next.toLowerCase()}.`);
  }

  function inventory(compact = false) {
    if (!scopedRows.length) return <EmptyState title="Belum ada batch stok" detail="Catat batch dan jumlah stok dari gerai sebelum menampilkan laporan." action={canRecord && <button className="btn hb-btn-gold" onClick={() => prepare('batch', { storeId: isAdmin ? stores[0].id : selectedStore, productId: products[0].id, batch: '', quantity: '', expires: '' })}>Catat batch stok</button>} />;
    const shown = compact ? filteredRows.slice(0, 5) : filteredRows;
    return <section aria-label="Stok per gerai"><Heading title="Stok per gerai" detail="Diurutkan berdasarkan kedaluwarsa terdekat." action={<div className="d-flex gap-2 flex-wrap">{compact && <button className="btn btn-outline-dark" onClick={() => navigate('stok')}>Lihat semua</button>}{!compact && <button className="btn hb-btn-gold" onClick={() => prepare('batch', { storeId: isAdmin ? stores[0].id : selectedStore, productId: products[0].id, batch: '', quantity: '', expires: '' })}>Catat batch</button>}</div>} />
      <div className="hb-filters"><label className="visually-hidden" htmlFor={`hb-search-${compact}`}>Cari gerai, produk atau batch</label><input id={`hb-search-${compact}`} className="form-control" type="search" placeholder="Cari gerai, produk, batch" value={filters.search} onChange={(event) => setFilters((old) => ({ ...old, search: event.target.value }))} /><select className="form-select" aria-label="Filter gerai" value={filters.store} onChange={(event) => setFilters((old) => ({ ...old, store: event.target.value }))}><option value="semua">Semua gerai</option>{scopedStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select><select className="form-select" aria-label="Filter produk" value={filters.product} onChange={(event) => setFilters((old) => ({ ...old, product: event.target.value }))}><option value="semua">Semua produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><select className="form-select" aria-label="Filter status" value={filters.status} onChange={(event) => setFilters((old) => ({ ...old, status: event.target.value }))}><option value="semua">Semua status</option>{['Aman', 'Stok kritis', 'Segera kedaluwarsa', 'Kedaluwarsa', 'Habis'].map((status) => <option key={status}>{status}</option>)}</select><label className="visually-hidden" htmlFor={`hb-until-${compact}`}>Kedaluwarsa hingga</label><input id={`hb-until-${compact}`} className="form-control" type="date" title="Kedaluwarsa hingga" value={filters.until} onChange={(event) => setFilters((old) => ({ ...old, until: event.target.value }))} /></div>
      {shown.length ? <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th scope="col">Gerai</th><th scope="col">Produk / batch</th><th scope="col">Stok fisik</th><th scope="col">Kedaluwarsa</th><th scope="col">Status</th><th scope="col">Aksi</th></tr></thead><tbody>{shown.map((row) => <tr key={row.id}><td>{storeName(row.storeId)}</td><td><strong>{productName(row.productId)}</strong><span className="d-block hb-muted">{row.batch}</span></td><td>{number.format(row.physical)} botol</td><td>{dateLabel(row.expires)}</td><td><div className="hb-statuses">{statusesFor(row, scopedRows, data.settings).map((status) => <Status key={status} label={status} />)}</div></td><td><button className="btn btn-outline-dark" onClick={() => openModal('detail', { rowId: row.id })}>Detail</button></td></tr>)}</tbody></table></div> : <EmptyState title="Batch tidak ditemukan" detail="Coba ubah pencarian atau filter." action={<button className="btn btn-outline-dark" onClick={() => setFilters(emptyFilters())}>Hapus filter</button>} />}
    </section>;
  }

  function restock() {
    return <section><Heading title="Permintaan restok" detail="Alur pengajuan hingga penerimaan pada perangkat ini." action={canRecord && <button className="btn hb-btn-gold" onClick={() => prepare('restock', { storeId: isAdmin ? stores[0].id : selectedStore, productId: products[0].id, quantity: '', note: '' })}>Ajukan restok</button>} />
      {scopedRequests.length ? <div className="hb-request-grid">{scopedRequests.map((request) => <article className="hb-panel" key={request.id}><div className="hb-section-heading"><div><h3 className="h6 mb-1">{productName(request.productId)}</h3><p className="hb-muted mb-0">{storeName(request.storeId)} · {dateLabel(request.created)}</p></div><Status label={request.status} /></div><p className="mb-2">{number.format(request.quantity)} botol</p>{request.note && <p className="hb-muted">{request.note}</p>}{request.allocations.length > 0 && <p className="hb-muted">Batch: {request.allocations.map((item) => `${item.batch} (${item.quantity} botol)`).join(', ')}</p>}<div className="d-flex flex-wrap gap-2">{isAdmin && request.status === 'Diajukan' && <><button className="btn hb-btn-gold" onClick={() => updateRequest(request, 'Disetujui')}>Setujui</button><button className="btn btn-outline-dark" onClick={() => updateRequest(request, 'Ditolak')}>Tolak</button></>}{isAdmin && request.status === 'Disetujui' && <button className="btn hb-btn-gold" onClick={() => updateRequest(request, 'Produksi')}>Mulai produksi</button>}{isAdmin && request.status === 'Produksi' && <button className="btn hb-btn-gold" onClick={() => updateRequest(request, 'Dikirim')}>Kirim batch FEFO</button>}{!isAdmin && request.status === 'Dikirim' && <button className="btn hb-btn-gold" onClick={() => updateRequest(request, 'Diterima')}>Konfirmasi diterima</button>}{['Diterima', 'Ditolak'].includes(request.status) && <span className="hb-muted">Alur selesai</span>}</div></article>)}</div> : <EmptyState title="Belum ada permintaan" detail="Permintaan yang Anda catat akan muncul di sini." action={canRecord && <button className="btn hb-btn-gold" onClick={() => prepare('restock', { storeId: isAdmin ? stores[0].id : selectedStore, productId: products[0].id, quantity: '', note: '' })}>Ajukan restok</button>} />}
    </section>;
  }

  function production() {
    return <section><Heading title="Batch produksi" detail="Pengiriman menggunakan batch siap kirim dengan kedaluwarsa paling dekat (FEFO)." action={products.length > 0 && <button className="btn hb-btn-gold" onClick={() => openModal('production', { productId: products[0].id, batch: '', quantity: '', expires: '' })}>Catat produksi</button>} />
      {data.production.length ? <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th scope="col">Batch</th><th scope="col">Produk</th><th scope="col">Kedaluwarsa</th><th scope="col">Tersedia</th><th scope="col">Status</th><th scope="col">Aksi</th></tr></thead><tbody>{[...data.production].sort((a, b) => a.expires.localeCompare(b.expires)).map((batch) => <tr key={batch.id}><td>{batch.batch}</td><td>{productName(batch.productId)}</td><td>{dateLabel(batch.expires)}</td><td>{number.format(batch.available)} botol</td><td><Status label={batch.status} /></td><td>{batch.status === 'Diseduh' ? <button className="btn btn-outline-dark" onClick={() => { updateData((previous) => ({ ...previous, production: previous.production.map((item) => item.id === batch.id ? { ...item, status: 'Siap kirim' } : item) })); setNotice('Batch siap dialokasikan.'); }}>Tandai siap</button> : <span className="hb-muted">{batch.available ? 'Siap dialokasikan' : 'Sudah dialokasikan'}</span>}</td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada batch produksi" detail="Catat batch produksi berdasarkan data sebenarnya." action={products.length > 0 && <button className="btn hb-btn-gold" onClick={() => openModal('production', { productId: products[0].id, batch: '', quantity: '', expires: '' })}>Catat produksi</button>} />}
    </section>;
  }

  function reports() {
    const actions = [{ kind: 'terjual', label: 'Catat penjualan', icon: 'cart' }, { kind: 'rusak', label: 'Catat barang rusak', icon: 'exclamation-triangle' }, { kind: 'retur', label: 'Catat retur', icon: 'arrow-return-left' }, { kind: 'stok', label: 'Hitung stok fisik', icon: 'boxes' }];
    return <section><Heading title="Penjualan & retur" detail="Setiap laporan mengubah stok batch terkait." /><div className="hb-actions">{actions.map((action) => <button className="hb-action" key={action.kind} onClick={() => prepare('report', { kind: action.kind, rowId: scopedRows[0]?.id || '', quantity: '', note: '' })}><i className={`bi bi-${action.icon}`} aria-hidden="true" />{action.label}</button>)}</div><Heading title="Riwayat laporan" detail="Berasal dari catatan yang dimasukkan di browser ini." />
      {scopedActivities.length ? <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th scope="col">Tanggal</th><th scope="col">Gerai</th><th scope="col">Produk / batch</th><th scope="col">Jenis</th><th scope="col">Jumlah</th></tr></thead><tbody>{[...scopedActivities].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <tr key={item.id}><td>{dateLabel(item.date)}</td><td>{storeName(item.storeId)}</td><td>{productName(item.productId)}<span className="d-block hb-muted">{item.batch}</span></td><td>{item.kind === 'stok' ? 'Stok fisik' : item.kind === 'terjual' ? 'Terjual' : item.kind === 'rusak' ? 'Rusak' : 'Retur'}</td><td>{number.format(item.quantity)} botol</td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada laporan" detail="Laporan akan tampil setelah Anda mencatat transaksi atau stok fisik." />}
    </section>;
  }

  function reconciliation() {
    return <section><Heading title="Rekonsiliasi stok" detail="Stok seharusnya = stok awal + diterima − terjual − rusak − retur. Estimasi tagihan hanya dihitung bila harga telah dicatat." />
      {recon.length ? <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th scope="col">Gerai</th><th scope="col">Awal</th><th scope="col">Diterima</th><th scope="col">Terjual</th><th scope="col">Seharusnya</th><th scope="col">Fisik</th><th scope="col">Selisih</th><th scope="col">Est. tagihan</th><th scope="col">Tindakan</th></tr></thead><tbody>{recon.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.opening}</td><td>{item.received}</td><td>{item.sold}</td><td>{item.expected}</td><td>{item.physical}</td><td>{item.difference ? <Status label="Selisih" /> : 'Sesuai'}{item.difference ? ` ${item.difference > 0 ? '+' : ''}${item.difference} botol` : ''}</td><td>{item.billed === null ? 'Harga belum dicatat' : currency.format(item.billed)}</td><td>{item.difference ? <button className="btn btn-outline-dark" onClick={() => { updateData((previous) => ({ ...previous, reviewed: previous.reviewed.includes(item.id) ? previous.reviewed.filter((id) => id !== item.id) : [...previous.reviewed, item.id] })); setNotice('Penanda pemeriksaan diperbarui.'); }}>{data.reviewed.includes(item.id) ? 'Batalkan tinjauan' : 'Tandai tinjau'}</button> : 'Selesai'}</td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada stok untuk direkonsiliasi" detail="Catat batch stok terlebih dahulu." />}
    </section>;
  }

  function masters() {
    return <section><Heading title="Gerai & produk" detail="Masukkan nama dan harga berdasarkan data Anda. Informasi ini disimpan pada browser ini." /><div className="hb-master-grid"><div className="hb-panel"><Heading title="Gerai" action={<button className="btn hb-btn-gold" onClick={() => openModal('store', { name: '', location: '' })}>Tambah gerai</button>} />{stores.length ? <ul className="hb-simple-list">{stores.map((store) => <li key={store.id}><strong>{store.name}</strong>{store.location && <span className="hb-muted">{store.location}</span>}</li>)}</ul> : <EmptyState title="Belum ada gerai" detail="Tambahkan gerai untuk mencatat stok." />}</div><div className="hb-panel"><Heading title="Produk" action={<button className="btn hb-btn-gold" onClick={() => openModal('product', { name: '', price: '' })}>Tambah produk</button>} />{products.length ? <ul className="hb-simple-list">{products.map((product) => <li key={product.id}><strong>{product.name}</strong><span className="hb-muted">{product.price ? currency.format(product.price) : 'Harga belum dicatat'}</span></li>)}</ul> : <EmptyState title="Belum ada produk" detail="Tambahkan produk agar batch bisa dicatat." />}</div></div></section>;
  }

  function modalBody() {
    if (modal.type === 'notifications') return <div className="modal-body">{alerts.length ? <div className="d-grid gap-2">{alerts.map((alert) => <button key={alert.label} className="hb-alert-action" onClick={() => { setModal(null); navigate(alert.target, alert.status); }}><strong>{alert.label}</strong><span>{alert.detail}</span></button>)}</div> : <p className="mb-0">Belum ada peringatan dari data yang dicatat.</p>}</div>;
    if (modal.type === 'detail') {
      const row = scopedRows.find((item) => item.id === form.rowId);
      if (!row) return <div className="modal-body">Batch tidak tersedia.</div>;
      return <div className="modal-body"><p>{storeName(row.storeId)} · {productName(row.productId)}</p><p>Batch {row.batch}, kedaluwarsa {dateLabel(row.expires)}</p><dl className="hb-details">{[['Stok awal', row.opening], ['Diterima', row.received], ['Terjual', row.sold], ['Rusak', row.damaged], ['Retur', row.returned], ['Stok seharusnya', expectedStock(row)], ['Stok fisik', row.physical], ['Selisih', row.physical - expectedStock(row)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number.format(value)} botol</dd></div>)}</dl><button className="btn hb-btn-gold" onClick={() => openModal('report', { kind: 'stok', rowId: row.id, quantity: '', note: '' })}>Catat stok fisik</button></div>;
    }
    return <form id="hb-modal-form" onSubmit={submit}><div className="modal-body hb-form">
      {['store', 'product'].includes(modal.type) && <><label htmlFor="hb-name">{modal.type === 'store' ? 'Nama gerai' : 'Nama produk'}</label><input id="hb-name" className="form-control" required maxLength={100} value={form.name} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} />{modal.type === 'store' ? <><label htmlFor="hb-location">Lokasi (opsional)</label><input id="hb-location" className="form-control" maxLength={120} value={form.location} onChange={(event) => setForm((old) => ({ ...old, location: event.target.value }))} /></> : <><label htmlFor="hb-price">Harga per botol (opsional)</label><input id="hb-price" className="form-control" type="number" min="1" step="1" value={form.price} onChange={(event) => setForm((old) => ({ ...old, price: event.target.value }))} /></>}</>}
      {['batch', 'restock'].includes(modal.type) && <><label htmlFor="hb-store">Gerai</label><select id="hb-store" className="form-select" disabled={!isAdmin} value={isAdmin ? form.storeId : selectedStore} onChange={(event) => setForm((old) => ({ ...old, storeId: event.target.value }))}>{(isAdmin ? stores : scopedStores).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></>}
      {['batch', 'production', 'restock'].includes(modal.type) && <><label htmlFor="hb-product">Produk</label><select id="hb-product" className="form-select" value={form.productId} onChange={(event) => setForm((old) => ({ ...old, productId: event.target.value }))}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></>}
      {['batch', 'production'].includes(modal.type) && <><label htmlFor="hb-batch">Nomor batch sebenarnya</label><input id="hb-batch" className="form-control" required maxLength={80} value={form.batch} onChange={(event) => setForm((old) => ({ ...old, batch: event.target.value }))} /><label htmlFor="hb-expires">Tanggal kedaluwarsa</label><input id="hb-expires" className="form-control" type="date" min={todayISO()} required value={form.expires} onChange={(event) => setForm((old) => ({ ...old, expires: event.target.value }))} /></>}
      {modal.type === 'report' && <><label htmlFor="hb-kind">Jenis laporan</label><select id="hb-kind" className="form-select" value={form.kind} onChange={(event) => setForm((old) => ({ ...old, kind: event.target.value, quantity: '' }))}><option value="terjual">Botol terjual</option><option value="rusak">Barang rusak</option><option value="retur">Retur</option><option value="stok">Hitung stok fisik</option></select><label htmlFor="hb-row">Gerai, produk, batch</label><select id="hb-row" className="form-select" value={form.rowId} onChange={(event) => setForm((old) => ({ ...old, rowId: event.target.value, quantity: '' }))}>{scopedRows.map((row) => <option key={row.id} value={row.id}>{storeName(row.storeId)} · {productName(row.productId)} · {row.batch} ({row.physical} botol)</option>)}</select></>}
      {['batch', 'production', 'restock', 'report'].includes(modal.type) && <><label htmlFor="hb-quantity">{modal.type === 'batch' ? 'Stok awal (botol)' : form.kind === 'stok' ? 'Stok fisik (botol)' : 'Jumlah botol'}</label><input id="hb-quantity" className="form-control" type="number" min={form.kind === 'stok' ? '0' : '1'} max={form.kind === 'stok' ? '10000' : modal.type === 'report' ? scopedRows.find((row) => row.id === form.rowId)?.physical || 1 : '10000'} step="1" required value={form.quantity} onChange={(event) => setForm((old) => ({ ...old, quantity: event.target.value }))} /></>}
      {['restock', 'report'].includes(modal.type) && <><label htmlFor="hb-note">Catatan (opsional)</label><textarea id="hb-note" className="form-control" maxLength={200} rows={3} value={form.note} onChange={(event) => setForm((old) => ({ ...old, note: event.target.value }))} /></>}
      {modal.type === 'settings' && <><label htmlFor="hb-threshold">Stok minimum per gerai (botol)</label><input id="hb-threshold" className="form-control" type="number" min="1" max="10000" required value={form.minStock} onChange={(event) => setForm((old) => ({ ...old, minStock: event.target.value }))} /><label htmlFor="hb-expiry">Peringatan kedaluwarsa (hari)</label><input id="hb-expiry" className="form-control" type="number" min="1" max="30" required value={form.expiryDays} onChange={(event) => setForm((old) => ({ ...old, expiryDays: event.target.value }))} /></>}
    </div></form>;
  }

  const modalTitle = { notifications: 'Peringatan', detail: 'Detail batch', store: 'Tambah gerai', product: 'Tambah produk', batch: 'Catat batch stok', production: 'Catat batch produksi', restock: 'Ajukan restok', report: 'Catat laporan gerai', settings: 'Atur batas peringatan' };
  const activeTitle = NAV.find((item) => item.id === page)?.label || 'Ringkasan';

  if (cssError) return <div className="hb-dashboard hb-wait" role="alert">Tampilan dashboard gagal dimuat. <button onClick={() => window.location.reload()}>Coba lagi</button></div>;
  if (phase === 'loading' || !cssReady) return <div className="hb-dashboard hb-wait" role="status">Menyiapkan dashboard...</div>;
  if (phase === 'error') return <div className="hb-dashboard hb-wait" role="alert"><p>Data lokal tidak dapat dibaca. Periksa izin penyimpanan browser atau pulihkan data lokal.</p><button className="btn btn-outline-dark me-2" onClick={() => { setPhase('loading'); readLocalData(); }}>Coba lagi</button><button className="btn hb-btn-gold" onClick={() => { if (window.confirm('Hapus data dashboard yang tersimpan di browser ini?')) { try { window.localStorage.removeItem(STORAGE_KEY); const empty = newDashboardData(); dataRef.current = empty; setData(empty); setPhase('ready'); } catch { setStorageError('Browser menolak penghapusan data.'); } } }}>Hapus data lokal</button>{storageError && <p>{storageError}</p>}</div>;

  return <div className="hb-dashboard" data-bs-theme="light">
    <div className="hb-shell" inert={modal ? true : undefined}>
      <header className="hb-topbar" inert={mobileOpen ? true : undefined}><div className="hb-brand"><button ref={mobileTriggerRef} className="hb-menu-toggle d-md-none" type="button" aria-label="Buka navigasi" aria-controls="hb-sidebar" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><i className="bi bi-list" aria-hidden="true" /></button><button type="button" className="hb-wordmark" onClick={() => navigate('ringkasan')}>HelcoBali</button><span className="hb-local-marker">Data lokal</span></div><label className="hb-top-search"><span className="visually-hidden">Cari stok</span><i className="bi bi-search" aria-hidden="true" /><input className="form-control" type="search" placeholder="Cari stok, gerai atau batch" value={filters.search} onChange={(event) => { setFilters((old) => ({ ...old, search: event.target.value })); if (event.target.value) navigate('stok'); }} /></label><div className="hb-top-actions"><button className="hb-notify" type="button" aria-label="Buka peringatan" onClick={() => openModal('notifications')}><i className="bi bi-bell" aria-hidden="true" />{alerts.length > 0 && <span className="visually-hidden">Ada peringatan</span>}</button><label className="hb-role"><span>Mode tampilan</span><select className="form-select" value={role} onChange={(event) => { setRole(event.target.value); setPage('ringkasan'); setFilters(emptyFilters()); }}><option value="admin">Admin</option><option value="pic">Staf gerai</option></select></label></div></header>
      {mobileOpen && <div className="hb-mobile-backdrop d-md-none" role="presentation" onClick={() => setMobileOpen(false)} />}
      <div className="hb-layout"><aside ref={sidebarRef} id="hb-sidebar" className={`hb-sidebar ${mobileOpen ? 'hb-sidebar-open' : ''}`} aria-label="Navigasi dashboard" inert={modal ? true : undefined}><div className="hb-sidebar-head d-md-none"><strong>Menu dashboard</strong><button className="hb-icon-button" type="button" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)}><i className="bi bi-x-lg" aria-hidden="true" /></button></div><nav>{NAV.filter((item) => isAdmin || !item.admin).map((item) => <button key={item.id} type="button" className={`hb-nav-item ${page === item.id ? 'hb-nav-active' : ''}`} aria-current={page === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><i className={`bi bi-${item.icon}`} aria-hidden="true" /><span>{item.label}</span></button>)}</nav><div className="hb-sidebar-foot"><p>Catatan tersimpan di browser ini, tidak tersinkron ke server.</p><Link to="/">Kembali ke toko</Link></div></aside>
        <main ref={mainRef} className="hb-main" tabIndex={-1} inert={mobileOpen ? true : undefined}><div className="hb-page-head"><div><p className="hb-overline">Konsinyasi / {role === 'admin' ? 'Admin' : 'Staf gerai'}</p><h1>{activeTitle}</h1><p className="hb-muted mb-0">Catatan pada perangkat ini. Bukan data dari server.</p></div>{page === 'ringkasan' && (isAdmin ? <button className="btn hb-btn-gold" onClick={() => canRecord ? prepare('batch', { storeId: stores[0].id, productId: products[0].id, batch: '', quantity: '', expires: '' }) : navigate('master')}>{canRecord ? 'Catat batch' : 'Tambahkan gerai & produk'}</button> : null)}</div>
          {storageError && <div className="alert alert-danger" role="alert">{storageError}</div>}
          {!isAdmin && <div className="hb-store-picker"><label htmlFor="hb-active-store">Gerai yang ditampilkan</label><select id="hb-active-store" className="form-select" value={selectedStore} onChange={(event) => { setSelectedStore(event.target.value); setFilters(emptyFilters()); }}><option value="">Pilih gerai</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select><p className="hb-muted mb-0">Mode tampilan untuk memeriksa catatan, bukan verifikasi akses pengguna.</p></div>}
          {!isAdmin && !selectedStore ? <EmptyState title="Pilih gerai terlebih dahulu" detail={stores.length ? 'Pilih gerai di atas untuk melihat catatan.' : 'Belum ada gerai. Tambahkan gerai dari mode admin.'} /> : <>
            {page === 'ringkasan' && <><section aria-label="Ringkasan" className="hb-summary">{scopedRows.length || scopedActivities.length || scopedRequests.length ? <div className="hb-metrics"><div><span>Total stok tercatat</span><strong>{scopedRows.length ? `${number.format(sum(scopedRows, 'physical'))} botol` : 'Belum dicatat'}</strong></div><div><span>Terjual bulan ini</span><strong>{monthlyReports.length ? `${number.format(sum(monthlyReports, 'quantity'))} botol` : 'Belum dilaporkan'}</strong></div><div><span>Mendekati kedaluwarsa</span><strong>{scopedRows.length ? `${number.format(expiring.length)} batch` : 'Belum dicatat'}</strong></div><div><span>Restok menunggu</span><strong>{scopedRequests.length ? `${number.format(pendingRequests.length)} permintaan` : 'Belum diajukan'}</strong></div></div> : <EmptyState title="Belum ada data konsinyasi" detail="Ringkasan akan terisi dari catatan gerai yang Anda masukkan, tanpa angka contoh." action={isAdmin && <button className="btn hb-btn-gold" onClick={() => navigate('master')}>Tambahkan gerai & produk</button>} />}</section><div className="hb-overview-grid"><TrendChart activities={scopedActivities} range={range} setRange={setRange} /><section className="hb-panel"><Heading title="Perlu ditindaklanjuti" action={isAdmin && <button className="btn btn-outline-dark" onClick={() => openModal('settings', { minStock: data.settings.minStock ?? '', expiryDays: data.settings.expiryDays })}>Atur batas</button>} />{alerts.length ? <div className="hb-attention">{alerts.map((alert) => <button key={alert.label} onClick={() => navigate(alert.target, alert.status)}><strong>{alert.label}</strong><span>{alert.detail}</span></button>)}</div> : <p className="hb-muted mb-0">Belum ada peringatan dari catatan yang tersedia.{data.settings.minStock === null ? ' Atur batas stok untuk mengaktifkan peringatan stok kritis.' : ''}</p>}</section></div>{inventory(true)}</>}
            {page === 'stok' && <>{inventory()}</>}
            {page === 'restok' && restock()}
            {page === 'produksi' && isAdmin && production()}
            {page === 'penjualan' && reports()}
            {page === 'rekonsiliasi' && isAdmin && reconciliation()}
            {page === 'master' && isAdmin && masters()}
          </>}
          <footer className="hb-footer">HelcoBali · Dashboard konsinyasi lokal</footer>
        </main>
      </div>
    </div>
    {notice && !modal && <div className="hb-toast" role="status"><span>{notice}</span><button className="hb-icon-button" type="button" aria-label="Tutup pesan" onClick={() => setNotice('')}><i className="bi bi-x-lg" aria-hidden="true" /></button></div>}
    {modal && <><div className="hb-modal-backdrop" role="presentation" /><div className="hb-modal-layer" onClick={(event) => { if (event.target === event.currentTarget) setModal(null); }}><div ref={modalRef} className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="dialog" aria-modal="true" aria-labelledby="hb-modal-heading" tabIndex={-1}><div className="modal-content"><div className="modal-header"><h2 className="modal-title h5 mb-0" id="hb-modal-heading">{modalTitle[modal.type]}</h2><button className="hb-icon-button" type="button" aria-label="Tutup dialog" onClick={() => setModal(null)}><i className="bi bi-x-lg" aria-hidden="true" /></button></div>{notice && <div className="hb-modal-alert" role="alert">{notice}</div>}{modalBody()}<div className="modal-footer"><button className="btn btn-outline-dark" type="button" onClick={() => setModal(null)}>Tutup</button>{!['notifications', 'detail'].includes(modal.type) && <button className="btn hb-btn-gold" type="submit" form="hb-modal-form">Simpan catatan</button>}</div></div></div></div></>}
  </div>;
}
