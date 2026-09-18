# Analisis Desain — Laravel POS

Dokumen ini memetakan kondisi desain/UI aplikasi POS per 18 Sep 2026: struktur layout,
sistem desain, pola halaman, temuan masalah, dan rekomendasi. Dibuat setelah audit +
perbaikan error `App\Models\Sale` dan perbaikan CSS dashboard.

## 1. Ringkasan Eksekutif

- Aplikasi memakai **dua framework CSS sekaligus**: **Tailwind CSS 3.4** (tema kustom)
  dan **Bootstrap 5.3** (SCSS). Keduanya di-build via Vite (`vite.config.js:6-10`).
- Pembagian kerja de-facto: **Tailwind untuk shell** (sidebar, topbar, layout),
  **Bootstrap untuk konten** (grid `row/col`, `card`, `btn`, `table`, `form`, `modal`, `alert`).
- **Insiden besar (sudah diperbaiki):** `layouts/admin.blade.php` sempat hanya memuat
  Tailwind, sehingga semua konten Bootstrap tampil rusak (kartu full-width bertumpuk,
  teks hilang). Fix: `@vite(['resources/sass/app.scss', 'resources/css/app.css', ...])`
  — Bootstrap dulu, Tailwind kemudian agar utilitas tema tetap menang.
- **Sistem komponen Tailwind (`<x-*>`) tidak dipakai sama sekali** — 7 file komponen
  adalah dead code (detail §5).
- **Satu layout tidak terpakai:** `layouts/cashier.blade.php` (detail §2).
- **Satu bug responsif aktif:** toggle sidebar mobile memakai Alpine.js (`x-data`)
  tetapi Alpine tidak pernah dimuat (detail §6.1).

## 2. Inventarisasi Layout

| Layout | File | Dipakai oleh | CSS yang dimuat | Keterangan |
|---|---|---|---|---|
| Admin (sidebar) | `resources/views/layouts/admin.blade.php` | Dashboard + seluruh CRUD klasik (`categories`, `products`, `debts`, `reports`, …) | Bootstrap SCSS + Tailwind + jQuery/DataTables/SweetAlert2 via CDN | Shell utama: sidebar 256px, topbar 64px, konten `p-4 sm:p-6 lg:p-8` |
| App (top-navbar) | `resources/views/layouts/app.blade.php` | Auth (login/lupa password) + **semua halaman Livewire** (`#[Layout('layouts.app')]` di `Pos`, `PurchaseManagement`, `StockManagement`, `StockOpnameManagement`, `StockTransferManagement`) + Livewire directives | Bootstrap SCSS saja | Punya `@livewireStyles`/`@livewireScripts`, jadi interaktivitas Livewire (termasuk `livewire.js`) bekerja — terverifikasi ada `wire:id` + `livewire.js` di HTML `/pos` |
| Cashier (split 60/40) | `resources/views/layouts/cashier.blade.php` | **Tidak dipakai siapa pun** (tidak ada `@extends('layouts.cashier')`) | Tailwind saja | Desain kasir 2 panel (katalog kiri, pesanan kanan) — bagus di atas kertas, tapi halaman POS aktual memakai layout `app` + grid Bootstrap |
| Welcome | `resources/views/welcome.blade.php` | Tidak dirutekan (`/` = dashboard) | Tailwind | Dead route view |

Implikasi: pengguna kasir berpindah antara **dua shell berbeda** — halaman POS
(top-navbar Bootstrap) vs halaman admin (sidebar Tailwind). Navigasi silang minim
(`layouts/app` hanya punya link POS/Stok/Pembelian).

## 3. Sistem Desain (Token & Tipografi)

### 3.1 Token Tailwind (`resources/css/app.css`, `tailwind.config.js`)
- Font: **Figtree** (via Bunny Fonts, 400–700) — konsisten di semua layout.
- Warna merek (CSS vars di `:root`): `primary` indigo-600 `#4F46E5`,
  `success` green-500, `danger` red-500, `warning` amber-500, `info` sky-400.
- Permukaan: `bg-main` gray-100, `bg-card` white; teks `text-main` gray-800,
  `text-muted` gray-500. Spacing semantik: `w-sidebar` 256px, `h-topbar` 64px.
- Token dipakai konsisten di sidebar, topbar, dan 7 komponen `<x-*>`.

### 3.2 Bootstrap 5.3 (`resources/sass/app.scss` → `@import "bootstrap/scss/bootstrap"`)
- Satu-satunya isi `app.scss`; seluruh konten halaman mengandalkan
  `row/col-*`, `card`, `btn-*`, `table`, `form-control/select`, `alert`, `badge`,
  `list-group`, `modal`, `input-group`.
- **Konflik nama yang disadari:** `bg-primary/success/warning/...` didefinisikan
  **kedua** framework (Tailwind = indigo, Bootstrap = biru `#0D6EFD`). Urutan muat
  (Bootstrap → Tailwind) membuat versi Tailwind menang di layout admin.
  Praktisnya aman karena konten memakai varian Bootstrap standar dan shell memakai
  utilitas Tailwind — tapi ini fondasi yang rapuh (lihat rekomendasi §7).

### 3.3 Tipografi & Bahasa
- Figtree di mana-mana; hierarki heading konsisten (`h5 mb-0` card-header,
  `text-xl` topbar). Label form CRUD hasil generator masih lowercase
  (`name`, `phone`, `address`) — belum rapi.
- Campuran Indonesia/Inggris: menu Indonesia (Kasir, Hutang, Piutang) vs judul
  Inggris (Dashboard, Settings, Shift), badge `Lunas/Sebagian` vs status DB
  `paid/partial`. Bukan error, tapi perlu glosarium.

## 4. Pola Halaman

- **Dashboard** (`dashboard.blade.php`): 8 stat-card Bootstrap (`bg-primary…bg-light`)
  + grafik Chart.js 7 hari + widget shift. Setelah fix CSS tampil benar.
  Kartu memakai warna latar penuh (gaya Bootstrap) — beda bahasa visual dengan
  `x-stat-card` (kartu putih + aksen) yang tidak dipakai.
- **CRUD** (`products`, `members`, `debts`, …): pola seragam
  `card > card-header (judul + tombol) > table.table-bordered.table-striped`.
  Aksi destruktif dikonfirmasi SweetAlert global (`.delete-form` di `admin.blade.php:168`).
  DataTables server-side tidak dipakai — semua `latest()->get()` (risiko performa
  di data besar) dengan paginasi client-side DataTables (bahasa Indonesia via CDN).
- **POS** (`livewire/pos.blade.php`, 273 baris): grid produk `row-cols-2/4` + kartu
  klik → keranjang + modal checkout Bootstrap manual (`d-block`, tanpa JS Bootstrap).
  Metode bayar lengkap (cash/debit/credit/ewallet/QRIS/piutang/split). Mode hold/recall ada.
- **Struk** (`pos/receipt.blade.php`): standalone 58mm thermal, auto-print —
  desain mandiri yang baik (tidak tergantung framework).
- **Auth** (`auth/login.blade.php`): kartu Bootstrap tengah, standar Breeze — rapi.

## 5. Komponen & Pustaka JS

- **Komponen `<x-*>` (7 file, gaya Tailwind modern):** `stat-card`, `card`, `modal`,
  `form-input`, `datatable`, `badge-status`, plus satu file duplikat bernama aneh
  (`components/⚡stock-opname-management.blade.php` — emoji di nama file, berisiko
  di Windows/Git). **Pemakaian: 0** (grep `<x-` di seluruh `resources/views` kosong).
  Ironisnya halaman-halaman justru menduplikasi fungsinya secara manual
  (mis. badge status di `debts/index.blade.php:35-41` vs `x-badge-status`).
- **Pustaka runtime:** jQuery 3.7 + DataTables 1.13.6 + SweetAlert2 (global, CDN),
  Chart.js (CDN, hanya dashboard), Livewire 4.2 (halaman Livewire). Tanpa Alpine.js,
  tanpa Bootstrap JS (tidak dibutuhkan — modal dibuat manual, dropdown navbar
  di `app.blade.php` satu-satunya yang butuh `data-bs-toggle` dan akan mati tanpa
  bundle JS Bootstrap).

## 6. Temuan & Masalah

### P0 — Sudah diperbaiki sesi ini
1. Bootstrap tidak dimuat di layout admin → seluruh konten rusak. ✅ Fix + terverifikasi
   34/34 halaman HTTP 200.

### P1 — Bug aktif
2. **Toggle sidebar mobile mati** (`admin.blade.php:24,120`: `x-data`/`@click` tanpa
   Alpine). Di layar `<lg`, sidebar tidak bisa dibuka karena class awal
   `-translate-x-full` dan tidak ada runtime yang menangani event. Fix termurah:
   tambah Alpine via Vite (`npm i alpinejs` + `import Alpine from 'alpinejs'` di
   `app.js`), yang sekaligus menghidupkan `x-modal` bila dipakai nanti.

### P2 — Inkonsistensi struktural
3. `layouts/cashier.blade.php` tak terpakai padahal konsep split 60/40-nya paling
   cocok untuk kasir. Pilih: adopsi untuk `/pos` atau hapus agar tidak membusuk.
4. POS (`layouts/app`) vs admin (`layouts/admin`) = dua shell tanpa navigasi silang
   yang jelas; kasir yang butuh stok/laporan harus menebak URL.
5. Paginasi `$products->links()` merender gaya Tailwind di tengah halaman Bootstrap
   (paginator default Laravel 11). Samakan via `Paginator::useBootstrapFive()`.
6. Badge status ditulis manual per-view (`bg-success/warning/danger`) — ganti ke
   satu komponen agar label ID (`Lunas`) dan nilai DB (`paid`) konsisten.
7. Nama file `components/⚡stock-opname-management.blade.php` mengandung emoji —
   ganti nama ASCII untuk keamanan lintas-OS.

### P3 — Ketahanan & kerapian
8. CDN tanpa fallback/sri untuk font, DataTables (+paket bahasa), SweetAlert2,
   Chart.js — halaman tabel/grafik blank saat offline. Pertimbangkan vendoring
   atau `npm` + Vite.
9. DataTables diinisialisasi ganda: global di `admin.blade.php:188` **dan** di
   komponen `x-datatable` (yang tak terpakai) — sekarang harmless, tapi rawan
   double-init bila komponen dipakai.
10. Kontras: teks `text-muted` di atas `bg-light`/abu-abu muda di beberapa tabel
    tipis; badge `bg-warning` + teks gelap sudah benar.
11. Label form generator lowercase + field `tier` sisa (sudah dimigrasi ke
    `member_type_id` di sisi model/request — view menyusul sebagian).

## 7. Rekomendasi Roadmap

1. **Segera (≤1 hari):** pasang Alpine.js via Vite (bug P1); `Paginator::useBootstrapFive()`;
   hapus/rename file komponen ber-emoji.
2. **Pendek (≤1 minggu):** putuskan **satu bahasa visual kartu** (Bootstrap berwarna
   penuh vs Tailwind putih + aksen) dan terapkan ke dashboard; ganti badge manual
   dengan satu komponen; satukan navigasi POS ↔ admin.
3. **Menengah:** adopsi ATAU hapus `cashier.blade.php`; hidupkan komponen `<x-*>`
   yang layak (`form-input`, `badge-status`, `modal`) dan hapus yang tidak;
   vendor-kan aset CDN kritis; tambah empty-state untuk tabel kosong
   (saat ini tabel kosong hanya menampilkan header).
4. **Jangka panjang:** eliminasi salah satu framework CSS. Jalur termurah adalah
   **keluar dari Bootstrap** (konten → utilitas Tailwind + komponen `<x-*>`),
   karena shell dan token sudah Tailwind. Sampai saat itu, pertahankan aturan
   urutan muat "Bootstrap dulu, Tailwind kemudian" dan jangan menambah token
   warna yang bertabrakan nama.

## 8. Catatan Keputusan Sesi Ini

- Urutan CSS admin: `app.scss` (Bootstrap) → `app.css` (Tailwind) — disengaja.
- Warning deprecation Sass dari Bootstrap diredam di `vite.config.js`
  (`quietDeps` + `silenceDeprecations`) karena berasal dari `node_modules`,
  bukan kode aplikasi.
- Perbaikan model/kolom mengikuti **skema DB aktual** (mis. `payables.purchase_id`,
  `receivables.sale_id`, `debt_payments.debt_id`) dengan alias relasi
  (`purchase`, `sale`, `debt`) agar view lama tetap jalan — bukan migrasi ulang.
