# Sistem Informasi RT 09 / RW 01

Aplikasi web statis (HTML, CSS, JavaScript) tanpa proses build. Data disimpan di Supabase (Postgres).

## Struktur
- `index.html`: kerangka halaman.
- `src/app.js`: seluruh logika aplikasi (warga, surat, keuangan, pengingat, sosial & qurban, pengaturan).
- `src/shim.js`: lapisan data. Aplikasi memanggil `claude.use("db")`; berkas ini menjawabnya dengan Supabase. Untuk memakai backend lain (Firebase, API sendiri), ganti hanya berkas ini.
- `src/config.js`: alamat dan kunci publik Supabase.
- `supabase/schema.sql`: tabel dan aturan keamanan (RLS).
- `.github/workflows/pages.yml`: penayangan otomatis ke GitHub Pages.

## Langkah pemasangan
1. Buat repositori **privat** di GitHub dan unggah isi folder ini.
2. Buat proyek di supabase.com, jalankan `supabase/schema.sql`, lalu isi `src/config.js`.
3. Di Supabase Authentication, tambahkan pengurus dan beri `app_metadata` `{"rt_role":"owner"}` (Ketua RT) atau `{"rt_role":"admin"}`.
4. Aktifkan GitHub Pages (Settings > Pages > Source: GitHub Actions).
5. Pindahkan data dari versi Claude (minta Claude mengekspor koleksi ke JSON), lalu impor ke tabel `docs` (kolom `coll`, `id`, `data`).

Panduan uji coba: lihat `UJI_COBA.md`.

## Tahap 6: portal warga (`warga.html`)
Warga masuk dengan No. KK + NIK anggota keluarga, lalu melihat data keluarganya, tagihan iuran sendiri, dan mengajukan surat (masuk ke tab Surat pengurus sebagai "Menunggu"). Jalankan `supabase/tahap6_warga.sql` setelah `schema.sql`.
- Tabel `docs` tetap tertutup; warga hanya lewat fungsi `warga_masuk` dan `warga_ajukan_surat`, yang hanya mengembalikan data keluarganya sendiri.
- Salah memasukkan KK/NIK 5 kali mengunci keluarga itu 15 menit.
- Keluarga yang No. KK-nya belum tercatat (id `nokk-...`) belum bisa masuk; lengkapi dulu datanya.
- Keterbatasan: No. KK dan NIK adalah data yang relatif mudah diketahui orang dekat. Untuk keamanan lebih kuat tambahkan verifikasi OTP WhatsApp/SMS atau PIN yang dibagikan pengurus.

## Catatan keamanan
- Jangan menaruh data warga (NIK, KK, piutang) di repositori. Data hanya di Supabase.
- Halaman GitHub Pages bersifat publik walau repositori privat; keamanan data ada di RLS, bukan di halaman.
- `shim.js` belum diuji dengan proyek Supabase sungguhan; uji di proyek percobaan dulu.
- Login warga dengan KK (Tahap 6) perlu fungsi server (RPC) dengan pembatasan percobaan; lihat komentar di akhir `schema.sql`.
