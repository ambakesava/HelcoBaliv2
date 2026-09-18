    # Prompt Desain Sistem: Aplikasi POS Laravel Production-Ready

    Gunakan dokumen ini sebagai **prompt** untuk diberikan kepada AI (seperti Claude, ChatGPT, v0, dll) atau Desainer UI/UX untuk merancang ulang antarmuka aplikasi POS ini. Copy teks di bawah garis putus-putus dan paste ke AI yang Anda gunakan.

    ---

    ## 🎭 Role & Context
    Bertindaklah sebagai **Expert UI/UX Designer & Frontend Engineer** yang berpengalaman dalam merancang antarmuka sistem Enterprise dan Point of Sale (POS) modern yang responsif, cepat, dan intuitif.

    Saya memiliki aplikasi **Laravel 11 Point of Sale (POS) Production-Ready** yang dibangun dengan arsitektur Service-Repository dan Livewire 3. Saat ini, aplikasi mengalami krisis identitas desain karena pencampuran framework CSS dan layout yang tidak konsisten.

    ## 🛠 Tech Stack Saat Ini
    - **Backend:** Laravel 11, Livewire 3, Alpine.js.
    - **Frontend/CSS:** Kombinasi **Tailwind CSS 3.4** (utama untuk shell/layout) dan **Bootstrap 5.3** (untuk komponen konten seperti grid, card, form, table, modal).
    - **Pustaka Tambahan:** jQuery, DataTables, SweetAlert2, Chart.js.

    ## 🚨 Kondisi & Masalah Desain Saat Ini (As-Is)
    1. **Dua Framework Bentrok:** Sidebar & Topbar (Admin) menggunakan Tailwind, sementara konten tabel & form menggunakan Bootstrap.
    2. **Layout Terpisah (Silo):** Halaman Kasir (POS) menggunakan layout top-navbar (Bootstrap murni), sedangkan Halaman Admin menggunakan layout sidebar (Tailwind). Pengguna kesulitan navigasi antar modul.
    3. **Dead Code & Inkonsistensi:** Terdapat banyak komponen Blade bawaan Tailwind (`<x-card>`, `<x-modal>`, dll) yang tidak terpakai karena halaman CRUD manual memakai class Bootstrap.
    4. **Desain Kaku:** Beberapa halaman belum optimal untuk layar sentuh (tablet/iPad), yang mana sangat krusial untuk aplikasi kasir.

    ## 🎯 Tujuan Desain (To-Be)
    Saya ingin Anda membuat panduan desain, komponen UI, atau wireframe/mockup (dalam bentuk kode HTML/Tailwind) dengan tujuan berikut:
    1. **Unifikasi Desain (Single Source of Truth):** Migrasi bertahap ke **Tailwind CSS murni** untuk semua komponen (meninggalkan Bootstrap).
    2. **Layout Universal:** Satu sistem navigasi yang mulus antara modul Admin (Backoffice) dan Kasir (Front-end POS) tanpa terasa seperti aplikasi yang berbeda.
    3. **Modern & Clean Aesthetics:** Menggunakan font *Figtree*, skema warna indigo/brand (Tailwind), dengan ruang putih (whitespace) yang cukup, kontras teks yang baik, dan empty state yang ramah.
    4. **Mobile & Tablet First untuk POS:** Antarmuka kasir harus sangat responsif dan ramah sentuhan (touch-friendly) untuk kasir yang menggunakan perangkat sentuh.

    ## 📦 Scope Halaman/Modul yang Perlu Didesain
    Berikan desain (struktur HTML/Tailwind) dan panduan UX untuk halaman-halaman berikut:

    ### 1. Dashboard Admin
    - 8 Stat Cards (Total Penjualan, Total Transaksi, dll)
    - Grafik Penjualan (Area untuk Chart.js)
    - Widget Shift Kasir Aktif
    - *Fokus: Informasi yang mudah dipindai, gunakan visual hierarki yang baik.*

    ### 2. Modul Kasir (Point of Sale) - Prioritas Utama!
    - Layout split screen yang modern (seperti layout kasir populer Moka/Pawoon).
    - Panel kiri (60%): Grid produk dengan foto, filter kategori, dan search bar besar.
    - Panel kanan (40%): Keranjang belanja (Cart) dinamis dengan tombol aksi cepat (Hold, Recall, Split Payment, Bayar).
    - Modal Pembayaran: Input cash cepat, tombol nominal uang pas (Rp50.000, Rp100.000).

    ### 3. Halaman CRUD Standar (Master Data, Inventaris, Hutang Piutang)
    - Tabel data modern (menggantikan DataTables bawaan Bootstrap) dengan gaya Tailwind.
    - Filter, Search, dan Pagination yang selaras dengan tema.
    - Form input modern (floating labels atau layout horizontal yang rapi).
    - Status badge (misal: Lunas, Hutang, Parsial) yang konsisten.

    ## 📝 Instruksi untuk Anda (Output yang Diharapkan)
    1. **Berikan struktur komponen HTML/Blade dengan Tailwind CSS murni** untuk Layout Utama (Sidebar + Topbar) yang responsif.
    2. **Rancang desain HTML untuk halaman POS (Kasir)** dengan mempertimbangkan ergonomi klik/sentuh dan ruang layar.
    3. **Buatkan standarisasi komponen Blade Tailwind dasar** (seperti `<x-button>`, `<x-table>`, `<x-badge-status>`) yang bisa langsung dikopas ke dalam proyek Laravel.
    4. Abaikan kode PHP/Livewire yang kompleks; fokuslah pada struktur **UI/UX, markup HTML, dan penulisan class Tailwind CSS yang kaya dan modern**.

    ---
    *Silakan mulai dengan memberikan desain untuk **Layout Utama** dan **Modul Kasir (POS)** terlebih dahulu.*
