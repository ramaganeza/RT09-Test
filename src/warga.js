/* Portal warga: masuk dengan No. KK + NIK, lihat data keluarga, tagihan sendiri, dan ajukan surat. BELUM DIUJI dengan Supabase sungguhan. */
const C=window.RT_CONFIG||{},sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY),$=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rp=n=>"Rp"+Number(n||0).toLocaleString("id-ID"),dg=v=>String(v||"").replace(/\D/g,"");
const mask=v=>{const d=dg(v);return d.length>4?"•".repeat(d.length-4)+d.slice(-4):d};
const JENIS=[["Surat Keterangan (umum)","ket",""],["Surat Keterangan Domisili","dom",""],["Pengantar KTP","ket","Mengurus KTP"],["Pengantar Kartu Keluarga","ket","Mengurus Kartu Keluarga"],["Pengantar SKCK","ket","Membuat SKCK"],["Keterangan Usaha","ket","Surat Keterangan Usaha"],["Keterangan Tidak Mampu","ket","Keterangan tidak mampu (SKTM)"]];
const BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const per=p=>{const [y,m]=String(p).split("-");return (BLN[+m-1]||"")+" "+y};
let cred=null,data=null;
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3000)}
const MSG={terkunci:"Terlalu banyak percobaan. Coba lagi 15 menit lagi atau hubungi pengurus RT.",tidak_cocok:"No. KK dan NIK tidak cocok. Periksa kembali.",terlalu_banyak:"Masih ada 5 pengajuan yang menunggu. Mohon tunggu diproses.",anggota_tidak_ditemukan:"Nama anggota tidak ditemukan."};
const err=e=>MSG[e&&e.error]||"Terjadi gangguan. Coba lagi.";
/* Panggil RPC; fungsi server mengembalikan {error:"kode"} (bukan melempar galat) agar penghitung percobaan gagal tersimpan. */
async function rpc(fn,args){const {data,error}=await sb.rpc(fn,args);if(error)return {error:"gangguan"};return data}
function head(){return `<div class="top"><div class="brand"><img class="logo" src="${LOGO}" alt="Logo RT 09"><div><b>Portal Warga RT 09 / RW 01</b><span>Kel. Sudimara Pinang</span></div></div>${cred?'<button class="btn sm" id="out">Keluar</button>':""}</div>`}
function login(){$("#w").innerHTML=head()+`<form class="card" id="lf" style="margin-top:20px"><h2>Masuk</h2><p class="muted small" style="margin:6px 0 14px">Gunakan No. KK keluarga Anda dan NIK salah satu anggota keluarga (16 digit).</p>
<div class="field"><label for="kk">No. Kartu Keluarga</label><input id="kk" inputmode="numeric" autocomplete="off" maxlength="19"></div><div class="field"><label for="nik">NIK</label><input id="nik" inputmode="numeric" autocomplete="off" maxlength="19"></div>
<p class="err" id="e" role="alert"></p><button class="btn pri" style="width:100%">Masuk</button><p class="hint" style="margin-top:10px">Data hanya dipakai untuk menampilkan informasi keluarga Anda. Jangan bagikan No. KK dan NIK kepada orang lain.</p></form>`;
 $("#lf").onsubmit=async e=>{e.preventDefault();$("#e").textContent="";const kk=dg($("#kk").value),nik=dg($("#nik").value);if(kk.length!==16||nik.length!==16){$("#e").textContent="No. KK dan NIK masing-masing 16 digit.";return}
  const d=await rpc("warga_masuk",{p_kk:kk,p_nik:nik});if(d.error){$("#e").textContent=err(d);return}cred={kk,nik};data=d;home()}}
function home(){const f=data.keluarga,tg=data.tagihan,tot=tg.reduce((s,x)=>s+(+x.jumlah||0),0);
 $("#w").innerHTML=head()+`<div class="card" style="margin-top:18px"><p class="muted small">Keluarga</p><h2>${esc(f.kepala)}</h2><p class="small muted">${esc(f.alamat||"-")} · ${esc(f.hunian||"")} · KK ${mask(f.kk)}</p>
 <h3 style="margin:14px 0 6px">Anggota keluarga</h3><div class="scroll"><table class="tbl"><thead><tr><th>Nama</th><th>Hubungan</th><th>NIK</th></tr></thead><tbody>${(f.anggota||[]).filter(a=>(a.status||"Aktif")==="Aktif").map(a=>`<tr><td>${esc(a.nama)}</td><td>${esc(a.hub||"")}</td><td class="mono">${mask(a.nik)}</td></tr>`).join("")}</tbody></table></div><p class="hint">Bila ada data yang salah, sampaikan ke pengurus RT.</p></div>
 <div class="card" style="margin-top:14px"><h3>Tagihan iuran</h3>${tg.length?`<p style="margin:8px 0"><b class="num">${rp(tot)}</b> belum terbayar</p>${tg.map(x=>`<p class="small">${x.jenis==="warga"?"Kas Bapak-Bapak":"Kas ibu-ibu"} · per ${per(x.periode)}: <b>${rp(x.jumlah)}</b>${x.keterangan?`<br><span class="muted">${esc(x.keterangan)}</span>`:""}${x.sementara?'<br><span class="pill p-warn">data sementara</span>':""}</p>`).join("")}`:`<p class="small muted" style="margin-top:6px">Tidak ada tagihan tercatat.</p>`}</div>
 <div class="card" style="margin-top:14px"><div class="row"><h3>Surat</h3><button class="btn pri sm" id="sb">Ajukan surat</button></div>${data.surat.length?`<table class="tbl"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Status</th></tr></thead><tbody>${data.surat.map(s=>`<tr><td>${esc(s.tanggal)}</td><td>${esc(s.jenis)}<br><span class="small muted">${esc(s.nama)}</span></td><td><span class="pill ${s.status==="terbit"?"p-good":s.status==="ditolak"?"p-bad":"p-warn"}">${s.status==="terbit"?"Terbit "+esc(s.nomor||""):s.status==="ditolak"?"Ditolak":"Menunggu Ketua RT"}</span></td></tr>`).join("")}</tbody></table>`:`<p class="small muted" style="margin-top:6px">Belum ada pengajuan.</p>`}<p class="hint" style="margin-top:8px">Surat yang sudah terbit diambil dari pengurus RT (cetak, tanda tangan, dan cap).</p></div>`;
 $("#out").onclick=()=>{cred=null;data=null;login()};$("#sb").onclick=ajukan}
function ajukan(){const f=data.keluarga,ang=(f.anggota||[]).filter(a=>(a.status||"Aktif")==="Aktif");
 $("#w").innerHTML=head()+`<form class="card" id="sf" style="margin-top:18px"><h2>Ajukan surat</h2><div class="field" style="margin-top:12px"><label for="n">Atas nama</label><select id="n">${ang.map(a=>`<option>${esc(a.nama)}</option>`).join("")}</select></div>
 <div class="field"><label for="j">Jenis surat</label><select id="j">${JENIS.map(j=>`<option>${esc(j[0])}</option>`).join("")}</select></div><div class="field"><label for="k">Keperluan</label><textarea id="k" rows="2" placeholder="Kosongkan untuk isian bawaan"></textarea></div><p class="err" id="e" role="alert"></p>
 <div class="mact"><button type="button" class="btn" id="bk">Batal</button><button class="btn pri">Kirim pengajuan</button></div></form>`;
 $("#bk").onclick=home;$("#sf").onsubmit=async e=>{e.preventDefault();const j=JENIS.find(x=>x[0]===$("#j").value);
  const a=await rpc("warga_ajukan_surat",{p_kk:cred.kk,p_nik:cred.nik,p_nama:$("#n").value,p_jenis:j[0],p_layout:j[1],p_keperluan:$("#k").value.trim()||j[2]});if(a.error){$("#e").textContent=err(a);return}
  const r=await rpc("warga_masuk",{p_kk:cred.kk,p_nik:cred.nik});if(!r.error)data=r;toast("Pengajuan terkirim, menunggu persetujuan Ketua RT");home()}}
login();
