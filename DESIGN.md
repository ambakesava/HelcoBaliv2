# Dokumen Desain Dashboard (Bootstrap 5)

Dokumen ini menguraikan struktur, tata letak, dan komponen untuk antarmuka pengguna (UI) dashboard menggunakan kerangka kerja Bootstrap 5.

## 1. Arsitektur Tata Letak (Layout)

Dashboard ini menggunakan tata letak klasik berpemilik ganda (Dual-pane layout) yang terdiri dari Sidebar navigasi statis dan Area Konten dinamis.

*   **Sidebar (Kiri):** Kolom navigasi vertikal tetap (Fixed). Mengambil lebar `col-md-2` atau sekitar 250px pada layar desktop. Disembunyikan atau diubah menjadi menu *offcanvas* pada layar *mobile*.
*   **Header / Navbar (Atas):** Bilah navigasi horizontal untuk fungsi pencarian, notifikasi, dan profil pengguna. Mengambil sisa lebar layar.
*   **Main Content (Tengah/Kanan):** Area utama tempat data ditampilkan menggunakan sistem Grid Bootstrap.

---

## 2. Struktur Grid & Komponen

Berikut adalah hierarki komponen pembangun dashboard beserta class Bootstrap utama yang digunakan:

### A. Pembungkus Utama (Wrapper)
Gunakan `container-fluid` untuk memastikan dashboard memenuhi 100% lebar layar.

```html
<div class="container-fluid">
  <div class="row flex-nowrap">
    <!-- Sidebar & Content berada di sini -->
  </div>
</div>
```

## 3. Identitas Visual Dashboard

Dashboard memiliki identitas visual tersendiri:

*   **Warna utama:** Putih (`#ffffff`).
*   **Warna aksen:** Gold seperti situs HelcoBali (`#d4af37`, sesuai token `--color-amber-500` di `frontend/src/index.css`).
*   **Tipografi:** Poppins.
