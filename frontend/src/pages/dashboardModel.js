export const STORAGE_KEY = 'helcobali-dashboard-local-v1';

export const newDashboardData = () => ({
  stores: [],
  products: [],
  rows: [],
  requests: [],
  production: [],
  activities: [],
  reviewed: [],
  settings: { minStock: null, expiryDays: 7 },
});

export function restoreDashboardData(raw) {
  if (!raw) return newDashboardData();
  const data = JSON.parse(raw);
  const collections = ['stores', 'products', 'rows', 'requests', 'production', 'activities', 'reviewed'];
  if (!data || typeof data !== 'object' || collections.some((key) => !Array.isArray(data[key]))
    || !data.settings || !Number.isInteger(data.settings.expiryDays)
    || (data.settings.minStock !== null && !Number.isInteger(data.settings.minStock))) {
    throw new Error('Format data lokal tidak dikenali.');
  }
  if (collections.filter((key) => key !== 'reviewed').some((key) => data[key].some((entry) => entry === null || typeof entry !== 'object'))
    || data.reviewed.some((id) => typeof id !== 'string')
    || data.rows.some((row) => !Number.isFinite(row.physical) || !row.expires || !row.storeId || !row.productId)
    || data.requests.some((request) => !Array.isArray(request.allocations))) {
    throw new Error('Isi data lokal tidak lengkap.');
  }
  return data;
}

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function daysUntil(date, now = new Date()) {
  return Math.round((new Date(`${date}T12:00:00`) - new Date(`${todayISO(now)}T12:00:00`)) / 86400000);
}

export const sum = (items, key) => items.reduce((total, item) => total + (item[key] || 0), 0);
export const expectedStock = (row) => row.opening + row.received - row.sold - row.damaged - row.returned;

export function statusesFor(row, rows, settings, now = new Date()) {
  const statuses = [];
  const remaining = daysUntil(row.expires, now);
  if (row.physical === 0) statuses.push('Habis');
  else if (remaining < 0) statuses.push('Kedaluwarsa');
  else if (remaining <= settings.expiryDays) statuses.push('Segera kedaluwarsa');

  if (settings.minStock !== null && sum(rows.filter((item) => item.storeId === row.storeId), 'physical') <= settings.minStock) {
    statuses.push('Stok kritis');
  }
  return statuses.length ? statuses : ['Aman'];
}

export function allocateFEFO(batches, request, now = new Date()) {
  let remaining = request.quantity;
  const allocations = batches
    .filter((batch) => batch.productId === request.productId && batch.status === 'Siap kirim'
      && batch.available > 0 && daysUntil(batch.expires, now) >= 0)
    .sort((a, b) => a.expires.localeCompare(b.expires))
    .flatMap((batch) => {
      const quantity = Math.min(batch.available, remaining);
      remaining -= quantity;
      return quantity ? [{ batchId: batch.id, batch: batch.batch, quantity, expires: batch.expires }] : [];
    });
  return remaining === 0 ? allocations : null;
}
