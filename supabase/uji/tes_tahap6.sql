-- Tes keamanan Tahap 6 (dijalankan dengan psql; di SQL Editor Supabase hapus baris \echo dan \set). Hasil yang diharapkan ada di UJI_COBA.md.
\set ON_ERROR_STOP off
\echo '--- 1 anon baca tabel langsung'
set role anon; select coll,id from docs order by 1,2; reset role;
\echo '--- 2 anon tidak boleh tulis'
set role anon; insert into docs values ('surat','hack','{}'); reset role;
\echo '--- 3 anon tidak boleh panggil _warga_cek'
set role anon; select _warga_cek('3671110000000001','3671110000000002'); reset role;
\echo '--- 4 login benar (kepala)'
set role anon; select jsonb_pretty(warga_masuk('3671 1100 0000 0001','3671110000000002')); reset role;
\echo '--- 5 login benar (istri)'
set role anon; select warga_masuk('3671110000000001','3671110000000003')->'keluarga'->>'kepala'; reset role;
\echo '--- 6 NIK anggota pindah ditolak'
set role anon; select warga_masuk('3671110000000001','3671110000000004'); reset role;
\echo '--- 7 NIK keluarga lain ditolak'
set role anon; select warga_masuk('3671110000000001','3671110000000011'); reset role;
\echo '--- 8 KK nonaktif ditolak'
set role anon; select warga_masuk('3671110000000020','3671110000000021'); reset role;
\echo '--- 9 kunci setelah 5 gagal'
set role anon; select warga_masuk('3671110000000010','1111111111111111'); select warga_masuk('3671110000000010','1111111111111111'); select warga_masuk('3671110000000010','1111111111111111'); select warga_masuk('3671110000000010','1111111111111111'); select warga_masuk('3671110000000010','1111111111111111');
select warga_masuk('3671110000000010','3671110000000011'); reset role;
\echo '--- 10 kunci hilang setelah 15 menit'
update warga_gagal set sejak = now() - interval '16 minutes';
set role anon; select warga_masuk('3671110000000010','3671110000000011')->'keluarga'->>'kepala'; reset role;
\echo '--- 11 ajukan surat'
set role anon; select warga_ajukan_surat('3671110000000001','3671110000000002','Sari Dewi','Surat Keterangan Domisili','dom','Mengurus sekolah'); reset role;
select id, jsonb_pretty(data) from docs where coll='surat' and data->>'sumber'='warga';
\echo '--- 12 anggota tidak ada / limit 5'
set role anon; select warga_ajukan_surat('3671110000000001','3671110000000002','Hantu','Surat Keterangan (umum)','ket','x'); 
select warga_ajukan_surat('3671110000000001','3671110000000002','Budi Santoso','Pengantar KTP','ket','a');select warga_ajukan_surat('3671110000000001','3671110000000002','Budi Santoso','Pengantar KTP','ket','a');select warga_ajukan_surat('3671110000000001','3671110000000002','Budi Santoso','Pengantar KTP','ket','a');select warga_ajukan_surat('3671110000000001','3671110000000002','Budi Santoso','Pengantar KTP','ket','a');
select warga_ajukan_surat('3671110000000001','3671110000000002','Budi Santoso','Pengantar KTP','ket','a'); reset role;
\echo '--- 13 admin (jwt rt_role) baca semua'
set role authenticated; select set_config('request.jwt.claims','{"app_metadata":{"rt_role":"admin"}}',false); select count(*) from docs; reset role;
\echo '--- 14 authenticated tanpa peran: hanya publik'
set role authenticated; select set_config('request.jwt.claims','{"app_metadata":{}}',false); select count(*) from docs; reset role;
