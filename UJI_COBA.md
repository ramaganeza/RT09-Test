# Uji coba di proyek percobaan

Gunakan proyek Supabase BARU yang terpisah dari data asli, dengan data fiktif.

## A. Sudah diuji di server Claude (PostgreSQL 16 lokal, tiruan Supabase)
Dijalankan: `schema.sql`, `tahap6_warga.sql`, `uji/seed_percobaan.sql`, `uji/tes_tahap6.sql`, lalu `warga.html` di browser terhadap fungsi SQL yang sama.

| # | Skenario | Hasil |
|---|---|---|
| 1 | Tanpa login membaca tabel `docs` | Hanya `pengaturan` dan `kegiatan` (KK, kas, piutang, surat tertutup) |
| 2 | Tanpa login menulis ke `docs` | Ditolak |
| 3 | Tanpa login memanggil `_warga_cek` | Ditolak |
| 4 | Masuk dengan KK + NIK kepala | Berhasil, hanya data keluarga itu dan tagihan miliknya |
| 5 | Masuk dengan NIK istri | Berhasil |
| 6 | NIK anggota yang sudah pindah / NIK keluarga lain / KK nonaktif | `tidak_cocok` |
| 7 | 5 kali salah, lalu NIK benar | `terkunci` |
| 8 | 15 menit kemudian | Bisa masuk lagi |
| 9 | Ajukan surat | Masuk sebagai `menunggu` dengan data lengkap (TTL, NIK, alamat) |
| 10 | Nama bukan anggota, atau lebih dari 5 pengajuan menunggu | `anggota_tidak_ditemukan`, `terlalu_banyak` |
| 11 | Peran `admin` pada JWT | Membaca semua; pengguna tanpa peran hanya data publik |
| 12 | `warga.html` end-to-end | Salah login ditolak, data sendiri tampil, NIK tersamarkan, data keluarga lain tidak tampil, pengajuan surat tampil di riwayat |

Bug yang ditemukan dan sudah diperbaiki: penghitung percobaan gagal ikut dibatalkan saat fungsi melempar galat, sehingga kunci tidak pernah aktif. Fungsi kini mengembalikan `{"error": ...}`.

## B. Belum bisa diuji dari server Claude (perlu Anda jalankan)
Server Claude tidak bisa membuat akun/proyek Supabase. Yang belum teruji: PostgREST (pemanggilan `rpc` dari browser), Supabase Auth (tautan masuk lewat email), realtime, dan penayangan GitHub Pages.

Langkah (sekitar 20 menit):
1. Buat proyek Supabase baru (nama: `rt09-percobaan`). Jalankan berurutan di SQL Editor: `supabase/schema.sql`, `supabase/tahap6_warga.sql`, `supabase/uji/seed_percobaan.sql`.
2. Isi `src/config.js` dengan Project URL dan anon key (Project Settings > API).
3. Buka `warga.html` (cukup klik dua kali berkasnya, atau lewat GitHub Pages). Cobalah:
   - KK `3671110000000001` + NIK `3671110000000003` harus masuk dan menampilkan tagihan Rp110.000.
   - KK `3671110000000001` + NIK `3671110000000011` harus ditolak.
   - Salah 5 kali pada KK `3671110000000010` harus terkunci.
   - Ajukan surat dari akun Budi.
3b. Agar tautan masuk email pengurus kembali ke situs Anda: Supabase > Authentication > URL Configuration, isi Site URL dan Redirect URLs dengan alamat GitHub Pages (https://NAMA-GITHUB.github.io/NAMA-REPO/).
4. Pengurus: di Authentication > Users tambahkan pengguna, lalu Edit user > `app_metadata` = `{"rt_role":"owner"}`. Buka `index.html`, masuk lewat email, lalu periksa:
   - Tab Surat memuat pengajuan dari warga (status Menunggu).
   - Setujui surat dan unduh PDF.
   - Edit data warga lalu muat ulang; perubahan harus tersimpan.
5. Catat setiap galat yang muncul di konsol browser dan kirim ke Claude untuk diperbaiki.

Lulus bila semua langkah di atas sesuai. Setelah itu baru buat proyek produksi dan impor data asli (minta Claude mengekspor ke JSON).
