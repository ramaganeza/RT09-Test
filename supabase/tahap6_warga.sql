-- TAHAP 6: portal warga (login dengan No. KK + NIK anggota keluarga). Jalankan SETELAH schema.sql.
-- Tabel docs tetap tertutup untuk publik. Warga hanya lewat fungsi di bawah, yang hanya mengembalikan data keluarganya sendiri.

-- Aman dijalankan berulang kali (menimpa versi lama).
drop function if exists public.warga_ajukan_surat(text,text,text,text,text,text);
drop function if exists public.warga_masuk(text,text);
drop function if exists public._warga_cek(text,text);

create table if not exists public.warga_gagal (kk text primary key, n int not null default 0, sejak timestamptz not null default now());
alter table public.warga_gagal enable row level security;  -- tanpa policy: tidak bisa diakses langsung

create or replace function public._warga_cek(p_kk text, p_nik text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_kk text := regexp_replace(coalesce(p_kk,''),'\D','','g'); v_nik text := regexp_replace(coalesce(p_nik,''),'\D','','g');
        d jsonb; v_n int; v_sejak timestamptz; ok boolean := false;
begin
  select n, sejak into v_n, v_sejak from warga_gagal where kk = v_kk;
  if found and v_sejak < now() - interval '15 minutes' then delete from warga_gagal where kk = v_kk; v_n := 0; end if;
  if coalesce(v_n,0) >= 5 then return jsonb_build_object('error','terkunci'); end if;
  select data into d from docs where coll = 'keluarga' and id = v_kk;
  if d is not null and coalesce(d->>'aktif','true') <> 'false' and length(v_nik) = 16 then
    ok := regexp_replace(coalesce(d->>'nikKepala',''),'\D','','g') = v_nik
       or exists (select 1 from jsonb_array_elements(coalesce(d->'anggota','[]'::jsonb)) a
                  where regexp_replace(coalesce(a->>'nik',''),'\D','','g') = v_nik and coalesce(a->>'status','Aktif') = 'Aktif');
  end if;
  if not ok then
    insert into warga_gagal(kk,n,sejak) values (v_kk,1,now()) on conflict (kk) do update set n = warga_gagal.n + 1;
    return jsonb_build_object('error','tidak_cocok');  -- jangan RAISE: galat membatalkan transaksi dan penghitung gagal ikut hilang
  end if;
  delete from warga_gagal where kk = v_kk;
  return d || jsonb_build_object('id', v_kk);
end $$;
revoke all on function public._warga_cek(text,text) from public, anon, authenticated;

create or replace function public.warga_masuk(p_kk text, p_nik text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb := public._warga_cek(p_kk,p_nik); tag jsonb := '[]'::jsonb; sur jsonb; seen text[] := '{}'; r record; e jsonb;
begin
  if d ? 'error' then return d; end if;
  for r in select data from docs where coll = 'piutang' order by data->>'periode' desc loop
    continue when (r.data->>'jenis') = any(seen);
    seen := seen || (r.data->>'jenis');
    for e in select * from jsonb_array_elements(coalesce(r.data->'items','[]'::jsonb)) loop
      if e->>'kkId' = d->>'id' then
        tag := tag || jsonb_build_object('jenis', r.data->>'jenis', 'periode', r.data->>'periode', 'jumlah', e->'jumlah', 'keterangan', e->>'keterangan', 'sementara', coalesce((r.data->>'sementara')::boolean,false));
      end if;
    end loop;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'jenis',data->>'jenis','status',data->>'status','nomor',data->>'nomor','tanggal',data->>'tanggal','nama',data->>'nama') order by data->>'tanggal' desc), '[]'::jsonb)
    into sur from docs where coll = 'surat' and data->>'kkId' = d->>'id';
  return jsonb_build_object('keluarga', jsonb_build_object('kepala',d->>'kepala','alamat',d->>'alamat','hp',d->>'hp','hunian',d->>'hunian','kk',d->>'kk','anggota',coalesce(d->'anggota','[]'::jsonb)), 'tagihan', tag, 'surat', sur);
end $$;

create or replace function public.warga_ajukan_surat(p_kk text, p_nik text, p_nama text, p_jenis text, p_layout text, p_keperluan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb := public._warga_cek(p_kk,p_nik); a jsonb; sid text := 's-' || (extract(epoch from clock_timestamp())*1000)::bigint::text;
        bln text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; tgl date; ttl text;
begin
  if d ? 'error' then return d; end if;
  if (select count(*) from docs where coll='surat' and data->>'kkId' = d->>'id' and data->>'status' = 'menunggu') >= 5 then return jsonb_build_object('error','terlalu_banyak'); end if;
  select x into a from jsonb_array_elements(coalesce(d->'anggota','[]'::jsonb)) x where x->>'nama' = p_nama and coalesce(x->>'status','Aktif') = 'Aktif' limit 1;
  if a is null then return jsonb_build_object('error','anggota_tidak_ditemukan'); end if;
  begin tgl := (a->>'tglLahir')::date; exception when others then tgl := null; end;
  ttl := concat_ws(', ', nullif(a->>'tempatLahir',''), case when tgl is null then null else extract(day from tgl)::int || ' ' || bln[extract(month from tgl)::int] || ' ' || extract(year from tgl)::int end);
  insert into docs(coll,id,data) values ('surat', sid, jsonb_build_object(
    'tanggal', to_char(current_date,'YYYY-MM-DD'), 'tglBuat', to_char(current_date,'YYYY-MM-DD'), 'jenis', left(p_jenis,80), 'layout', case when p_layout = 'dom' then 'dom' else 'ket' end,
    'status','menunggu','kkId', d->>'id','nama', a->>'nama','ttl', ttl,'agama', coalesce(a->>'agama',''),
    'jk', case a->>'jk' when 'P' then 'Wanita' when 'L' then 'Pria' else '' end,'statusKawin', coalesce(a->>'statusKawin',''),
    'nik', regexp_replace(coalesce(nullif(a->>'nik',''), case when a->>'hub'='KK' then d->>'nikKepala' end, ''),'\D','','g'),
    'kk', regexp_replace(coalesce(d->>'kk',''),'\D','','g'),'alamat', coalesce(d->>'alamat',''),'hunian', coalesce(d->>'hunian',''),
    'keperluan', left(coalesce(p_keperluan,''),300),'alamatAsal','','catatan','Diajukan warga lewat portal','no',null,'nomor','','sumber','warga'));
  return jsonb_build_object('ok',true,'id',sid);
end $$;

grant execute on function public.warga_masuk(text,text) to anon, authenticated;
grant execute on function public.warga_ajukan_surat(text,text,text,text,text,text) to anon, authenticated;
