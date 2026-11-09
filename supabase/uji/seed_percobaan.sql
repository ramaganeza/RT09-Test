-- Data FIKTIF untuk proyek percobaan. Jangan pakai data warga asli di proyek percobaan.
insert into docs(coll,id,data) values
('keluarga','3671110000000001','{"kepala":"Budi Santoso","kk":"3671110000000001","nikKepala":"3671110000000002","alamat":"Hidup Baru I / 7","hunian":"Tetap","hp":"0812000111","aktif":true,"anggota":[{"nama":"Budi Santoso","hub":"KK","nik":"3671110000000002","jk":"L","tempatLahir":"Jakarta","tglLahir":"1980-01-02","agama":"Islam","statusKawin":"Menikah","status":"Aktif"},{"nama":"Sari Dewi","hub":"Istri","nik":"3671110000000003","jk":"P","tempatLahir":"Bandung","tglLahir":"1983-05-17","agama":"Islam","statusKawin":"Menikah","status":"Aktif"},{"nama":"Lama Pindah","hub":"Anak","nik":"3671110000000004","status":"Pindah"}]}'),
('keluarga','3671110000000010','{"kepala":"Andi Lain","kk":"3671110000000010","nikKepala":"3671110000000011","alamat":"Hidup Baru II / 3","hunian":"Kontrak","aktif":true,"anggota":[{"nama":"Andi Lain","hub":"KK","nik":"3671110000000011","status":"Aktif"}]}'),
('keluarga','3671110000000020','{"kepala":"Nonaktif","kk":"3671110000000020","nikKepala":"3671110000000021","aktif":false,"anggota":[]}'),
('pengaturan','rt','{"ketua":"X"}'),('kegiatan','k1','{"judul":"Publik"}'),
('piutang','piutang-warga-2025-11','{"jenis":"warga","periode":"2025-11","sementara":true,"items":[{"nama":"Budi","jumlah":99000,"kkId":"3671110000000001"}]}'),
('piutang','piutang-warga-2025-12','{"jenis":"warga","periode":"2025-12","sementara":true,"items":[{"nama":"Budi","jumlah":90000,"keterangan":"Okt-Des","kkId":"3671110000000001"},{"nama":"Andi","jumlah":30000,"kkId":"3671110000000010"}]}'),
('piutang','piutang-ibu-2026-01','{"jenis":"ibu","periode":"2026-01","items":[{"nama":"Ibu Sari","jumlah":20000,"kkId":"3671110000000001"}]}'),
('kas','kas-1','{"saldoAkhir":123456}'),
('surat','s-lain','{"kkId":"3671110000000010","nama":"Andi Lain","jenis":"X","status":"terbit","nomor":"1 / SP","tanggal":"2026-01-01"}')
on conflict (coll,id) do update set data = excluded.data;
