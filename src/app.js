const HARI=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const ROM=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const DEF={namaRT:"RT 09",rw:"RW 01",kelurahan:"Sudimara Pinang",kota:"Kota Tangerang",kodepos:"15145",
 ketua:"Ir. Rama Ganeza S, S.T.",sekretaris:"",bendahara:"Sutrisno",
 jadwal:{hari:"Sabtu",pekan:2,jam:"19.30"},
 iuran:"Kas RT = 10000\nSampah = 10000\nInfaq Masjid MBM = 5000\nKonsumsi = 5000",
 nomorSuratBerikut:358,kodeSurat:"SP.RT.09",kodeRW:"01",kecamatan:"Pinang",komplek:"",ketuaRW:"Sutrisno",giliranUrut:[],albumUrl:"",tema:{preset:"Perunggu (bawaan)",accent:"#6b4a1f",bg:"#f1efec",fs:"Normal"},reminderHari:7,reminderMaks:3,
 tpl:["Assalamu'alaikum Bapak/Ibu {nama} ({alamat}).\nKami dari pengurus RT 09/RW 01 mengingatkan dengan hormat bahwa iuran warga {bulan_tunggak} belum tercatat.\n\nTotal: {total}\nRincian: {rincian}\n\nPembayaran dapat diserahkan ke Bendahara atau pada pertemuan warga bulan ini. Jika sudah membayar, mohon abaikan pesan ini.\nTerima kasih. - Pengurus RT 09",
 "Assalamu'alaikum Bapak/Ibu {nama} ({alamat}).\nIuran RT 09 atas nama Bapak/Ibu masih belum diterima untuk {bulan_tunggak}. Total tagihan saat ini {total}.\nRincian: {rincian}\n\nMohon dapat diselesaikan sebelum pertemuan warga berikutnya. Bila ada kendala, silakan hubungi Bendahara agar bisa dibantu cicilan.\nTerima kasih. - Pengurus RT 09",
 "Yth. Bapak/Ibu {nama} ({alamat}).\nIni pengingat terakhir dari pengurus RT 09. Tunggakan iuran sebesar {total} ({rincian}) belum diselesaikan.\n\nPelayanan surat pengantar RT dapat ditunda sampai tunggakan dilunasi atau ada kesepakatan cicilan dengan Bendahara.\nTerima kasih atas pengertiannya. - Pengurus RT 09"]};
const HUB=["KK","Istri","Suami","Anak","Menantu","Cucu","Orang tua","Mertua","Famili lain","Pembantu","Lainnya"];
const AGAMA=["Islam","Kristen Protestan","Katolik","Hindu","Buddha","Konghucu","Lainnya"];
const KAWIN=["Belum Menikah","Menikah","Janda","Duda"];
const TABS=[["beranda","Beranda",0],["warga","Data warga",1],["surat","Surat",1],["keuangan","Keuangan",1],["reminder","Pengingat",1],["sosial","Sosial & qurban",1],["kegiatan","Berita & notulen",0],["pertemuan","Pertemuan",0],["pengaturan","Pengaturan",1]];

const S={set:DEF,kel:[],keg:[],pert:[],tab:"beranda",admin:false,db:null,ready:false,slow:false,errs:{},q:"",fHun:"semua",fTipe:"semua",reveal:false};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const fmtTgl=s=>s?new Date(s+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"-";
const fmtTglS=s=>s?new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"-";
const digits=v=>String(v||"").replace(/\D/g,"");
const mask=v=>{const d=String(v||"");if(!d)return "-";return S.reveal?d:"•".repeat(Math.max(0,d.length-4))+d.slice(-4)};
const jiwa=f=>(f.anggota||[]).filter(a=>(a.status||"Aktif")==="Aktif");
const lengkap=f=>f.alamat&&f.hp&&digits(f.kk).length>=10&&digits(f.nikKepala).length>=10;
const byAlamat=(a,b)=>(a.alamat?0:1)-(b.alamat?0:1)||(a.alamat||"").localeCompare(b.alamat||"","id",{numeric:true})||a.kepala.localeCompare(b.kepala);
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2800)}
function upsert(arr,o){const i=arr.findIndex(x=>x.id===o.id);i>=0?arr[i]=o:arr.push(o)}
async function put(path,data){try{await S.db.doc(path).set(data)}catch(e){throw new Error(e&&e.code==="invalid_argument"?"Anda tidak memiliki izin mengubah data (perlu akses Editor).":"Gagal menyimpan ("+(e&&e.code||"error")+"). Coba lagi.")}}
async function del(path){try{await S.db.doc(path).delete()}catch(e){throw new Error("Gagal menghapus.")}}

/* ---- jadwal pertemuan ---- */
function nthWeekday(y,m,wd,n){const first=new Date(y,m,1);const off=(wd-first.getDay()+7)%7;const d=new Date(y,m,1+off+(n-1)*7);if(d.getMonth()!==m)d.setDate(d.getDate()-7);return d}
function nextMeeting(from){const j=S.set.jadwal,wd=HARI.indexOf(j.hari);const t0=new Date(from.getFullYear(),from.getMonth(),from.getDate());let y=from.getFullYear(),m=from.getMonth();
  for(let i=0;i<14;i++){const d=nthWeekday(y,m,wd,+j.pekan||2);if(d>=t0)return d;m++;if(m>11){m=0;y++}}return t0}
function hosts(){const seen={},ord=S.set.giliranUrut||[],rk=f=>{const i=ord.indexOf(f.id);return i<0?1e6:i};return S.kel.filter(f=>f.aktif!==false&&f.alamat&&(f.ikutGiliran===true||(f.ikutGiliran!==false&&f.hunian==="Tetap"))).sort((x,y)=>rk(x)-rk(y)||byAlamat(x,y)).filter(f=>seen[f.alamat]?false:(seen[f.alamat]=1))}
function nextHost(){const hs=hosts();if(!hs.length)return null;
  const done=S.pert.filter(p=>p.status!=="batal"&&p.tuanRumahId).sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
  if(!done.length)return hs[0];const last=done[done.length-1];let i=hs.findIndex(h=>h.id===last.tuanRumahId);if(i<0&&last.alamat)i=hs.findIndex(h=>h.alamat===last.alamat);return hs[(i+1)%hs.length]}
const upcoming=()=>S.pert.filter(p=>p.status==="terjadwal"&&p.tanggal>=iso(new Date())).sort((a,b)=>a.tanggal.localeCompare(b.tanggal))[0];

/* ---- dialog & formulir ---- */
function modal(html,wide){$("#modal").innerHTML=`<div class="ov"><div class="dlg ${wide?"wide":""}" role="dialog" aria-modal="true">${html}</div></div>`;$("#modal .ov").addEventListener("mousedown",e=>{if(e.target.classList.contains("ov"))closeM()})}
function closeM(){$("#modal").innerHTML=""}
function fieldHtml(f){const v=f.value??"",id="f_"+f.id,sh=f.showIf?` data-showif="${f.showIf[0]}=${f.showIf[1]}"`:"";let c;
  if(f.type==="select")c=`<select id="${id}">${f.options.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  else if(f.type==="textarea")c=`<textarea id="${id}" rows="${f.rows||4}" placeholder="${esc(f.ph||"")}">${esc(v)}</textarea>`;
  else if(f.type==="check")return `<div class="field"${sh}><label class="chk"><input type="checkbox" id="${id}" ${v?"checked":""}> ${esc(f.label)}</label></div>`;
  else c=`<input id="${id}" type="${f.type||"text"}" value="${esc(v)}" ${f.list?`list="${f.list}"`:""} ${f.inputmode?`inputmode="${f.inputmode}"`:""} placeholder="${esc(f.ph||"")}" autocomplete="off">`;
  return `<div class="field ${f.half?"half":""}"${sh}><label for="${id}">${esc(f.label)}</label>${c}${f.hint?`<p class="hint">${esc(f.hint)}</p>`:""}</div>`}
function openForm({title,fields,save,label="Simpan",wide}){
  modal(`<form id="mf" novalidate><h3>${esc(title)}</h3><div class="fgrid">${fields.map(fieldHtml).join("")}</div><p class="err" id="merr" role="alert"></p><div class="mact"><button type="button" class="btn" id="mc">Batal</button><button class="btn pri" type="submit" id="ms">${label}</button></div></form>`,wide);
  const tg=()=>document.querySelectorAll("#mf [data-showif]").forEach(d=>{const [k,v]=d.dataset.showif.split("=");d.hidden=$("#f_"+k).value!==v});tg();
  $("#mf").addEventListener("change",tg);$("#mc").onclick=closeM;
  $("#mf").onsubmit=async e=>{e.preventDefault();const v={};fields.forEach(f=>{const el=$("#f_"+f.id);v[f.id]=f.type==="check"?el.checked:el.value.trim()});
    const b=$("#ms");b.disabled=true;$("#merr").textContent="";
    try{const r=await save(v);if(r&&r.error){$("#merr").textContent=r.error;b.disabled=false;return}if(!r||!r.keep)closeM()}catch(x){$("#merr").textContent=x.message;b.disabled=false}}}
function confirmM(text,yes,label="Ya, lanjutkan"){modal(`<h3>Konfirmasi</h3><p style="margin:12px 0">${esc(text)}</p><div class="mact"><button class="btn" id="mc">Batal</button><button class="btn pri" id="my">${label}</button></div>`);
  $("#mc").onclick=closeM;$("#my").onclick=async()=>{try{await yes();closeM()}catch(x){toast(x.message)}}}

/* ---- tampilan ---- */
function head(){return `<div class="top"><div class="brand"><img class="logo" src="${LOGO}" alt="Logo RT 09"><div><b>Sistem Informasi ${esc(S.set.namaRT)} / ${esc(S.set.rw)}</b><span>Kel. ${esc(S.set.kelurahan)}, ${esc(S.set.kota)}</span></div></div>
 <span class="pill ${S.admin?"p-gold":"p-mute"}">${S.admin?"Pengurus (bisa mengubah)":"Hanya lihat"}</span></div>`}
function render(){
  const a=$("#app");applyTema();
  if(!S.db){a.innerHTML=head()+`<div class="card" style="margin-top:20px;max-width:560px"><h2>Belum bisa membuka data</h2><p class="muted" style="margin-top:8px">Halaman ini menyimpan data RT di basis data Claude. Buka lewat akun yang sudah diundang pengurus. Jika Anda sudah masuk dan pesan ini tetap muncul, minta pengurus memeriksa pengaturan berbagi.</p></div>`;return}
  const tabs=TABS.filter(t=>!t[2]||S.admin);
  if(!tabs.some(t=>t[0]===S.tab))S.tab="beranda";
  const body=(S.slow&&!S.ready?`<div class="banner">Data belum terjangkau. Memeriksa koneksi...</div>`:"")+((S.db&&!S.ready&&!S.slow)?'<div class="sk"></div><div class="sk"></div><div class="sk"></div>':({beranda:vBeranda,warga:vWarga,kegiatan:vKegiatan,pertemuan:vPertemuan,surat:vSurat,keuangan:vKeuangan,reminder:vReminder,sosial:vSosial,pengaturan:vPengaturan}[S.tab])());
  const ae=document.activeElement,keep=ae&&ae.id&&/^(q|qs)$/.test(ae.id)?ae.id:null;
  a.innerHTML=shellHtml(tabs,body);S.anim=false;
  bind();
  $("#alamatList").innerHTML=[...new Set(S.kel.map(f=>f.alamat).filter(Boolean))].sort((x,y)=>x.localeCompare(y,"id",{numeric:true})).map(x=>`<option value="${esc(x)}">`).join("");
}
function vBeranda(){
  const kk=S.kel.filter(f=>f.aktif!==false),n=kk.reduce((s,f)=>s+jiwa(f).length,0),tp=kk.filter(f=>f.hunian==="Tetap").length;
  const up=upcoming(),nm=nextMeeting(new Date()),nh=nextHost(),last=S.keg.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,3),s=S.set;
  return quick()+`<div class="grid g2"><div class="card lift"><p class="muted small">Pertemuan warga berikutnya</p>
   ${up?`<h2 style="margin:6px 0 4px">${fmtTgl(up.tanggal)}</h2><p>Di rumah <b>${esc(up.tuanRumahNama||"-")}</b>${up.alamat?" ("+esc(up.alamat)+")":""} · pukul ${esc(s.jadwal.jam)}</p>`:
   `<h2 style="margin:6px 0 4px">${fmtTgl(iso(nm))}</h2><p>Jadwal rutin: ${esc(s.jadwal.hari)}, pekan ke-${s.jadwal.pekan}, pukul ${esc(s.jadwal.jam)}.</p><p class="muted small" style="margin-top:4px">${nh?"Giliran tuan rumah berikutnya: "+esc(nh.kepala)+" ("+esc(nh.alamat)+")":"Data giliran tuan rumah belum ada."}</p>`}
   <p style="margin-top:12px"><a class="btn sm" href="#pertemuan" style="text-decoration:none;display:inline-block">Lihat giliran</a></p></div>
  <div class="card"><p class="muted small">Pengurus</p><dl class="kv" style="margin-top:8px"><dt>Ketua RT</dt><dd>${esc(s.ketua)}</dd><dt>Ketua RW</dt><dd>${esc(s.ketuaRW||"Belum diisi")}</dd><dt>Sekretaris</dt><dd>${esc(s.sekretaris||"Belum diisi")}</dd><dt>Bendahara</dt><dd>${esc(s.bendahara)}</dd></dl></div>${albumCard()}</div>
  ${S.admin?`<div class="grid g4" style="margin-top:14px"><div class="card stat"><b>${kk.length}</b><span>Kartu Keluarga aktif</span></div><div class="card stat"><b>${n}</b><span>Jiwa tercatat</span></div><div class="card stat"><b>${tp}</b><span>KK tetap</span></div><div class="card stat"><b>${kk.filter(f=>!lengkap(f)).length}</b><span>Data perlu dilengkapi</span></div></div>`:""}
  <h3 class="sect">Kegiatan terbaru</h3>${last.length?`<div class="tl">${last.map(evHtml).join("")}</div>`:`<div class="card empty">Belum ada berita atau notulensi.</div>`}
  ${attention()}`;
}
function vWarga(){
  const kk=S.kel;const q=S.q.toLowerCase();
  let list=kk.filter(f=>{if(S.fHun==="nonaktif")return f.aktif===false;if(f.aktif===false)return false;if(S.fHun==="lengkap")return !lengkap(f);if(S.fHun!=="semua"&&f.hunian!==S.fHun)return false;return true})
   .filter(f=>!q||(f.kepala+" "+f.alamat+" "+(f.anggota||[]).map(a=>a.nama).join(" ")+" "+f.hp).toLowerCase().includes(q)||digits(f.kk).includes(q)||digits(f.nikKepala).includes(q)).sort(byAlamat);
  return `<div class="row" style="margin-bottom:12px"><div><h2>Data warga</h2><p class="muted small">${kk.filter(f=>f.aktif!==false).length} KK aktif · ${kk.filter(f=>f.aktif!==false).reduce((s,f)=>s+jiwa(f).length,0)} jiwa tercatat</p></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="rev">${S.reveal?"Sembunyikan nomor":"Tampilkan nomor"}</button><button class="btn pri" id="addKK">+ Tambah warga baru</button></div></div>
  <div class="tools"><input id="q" type="search" placeholder="Cari nama, alamat, No. KK, NIK, HP" value="${esc(S.q)}" aria-label="Cari"><select id="fh" aria-label="Filter">${[["semua","Semua KK aktif"],["Tetap","Tetap"],["Kontrak","Kontrak"],["lengkap","Perlu dilengkapi"],["nonaktif","Nonaktif / pindah"]].map(o=>`<option value="${o[0]}" ${S.fHun===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></div>
  <div class="card scroll" style="padding:6px">${list.length?`<table class="tbl"><thead><tr><th>Kepala keluarga</th><th>Alamat</th><th>No. HP</th><th>Hunian</th><th>Jiwa</th><th></th></tr></thead><tbody>
  ${list.map(f=>`<tr class="click" tabindex="0" data-kk="${esc(f.id)}"><td><b>${esc(f.kepala)}</b></td><td>${esc(f.alamat||"-")}</td><td class="mono">${esc(f.hp||"-")}</td><td><span class="pill ${f.hunian==="Tetap"?"p-good":"p-warn"}">${esc(f.hunian||"-")}</span></td><td class="num">${jiwa(f).length}</td><td>${f.aktif===false?'<span class="pill p-mute">Nonaktif</span>':lengkap(f)?"":'<span class="pill p-warn">Lengkapi</span>'}</td></tr>`).join("")}</tbody></table>`:`<div class="empty">${S.kel.length?"Tidak ada yang cocok.":"Belum ada data warga."}</div>`}</div>`;
}
function evHtml(e){const t={berita:"Berita",kegiatan:"Kegiatan",notulen:"Notulen"}[e.tipe]||e.tipe;
  return `<article class="ev ${e.tipe==="notulen"?"notulen":""}" data-ev="${esc(e.id)}"><div class="row"><span class="small muted">${fmtTglS(e.tanggal)} · <span class="pill ${e.tipe==="notulen"?"p-gold":"p-mute"}">${t}</span></span>${S.admin?`<span><button class="btn sm" data-editev="${esc(e.id)}">Ubah</button> <button class="btn sm bad" data-delev="${esc(e.id)}">Hapus</button></span>`:""}</div>
  <h3>${esc(e.judul)}</h3>${e.ringkasan?`<p class="small">${esc(e.ringkasan)}</p>`:""}
  ${e.tipe==="notulen"?`<dl class="kv" style="margin-top:8px">${e.tuanRumah?`<dt>Tempat</dt><dd>${esc(e.tuanRumah)}</dd>`:""}${e.hadir?`<dt>Hadir</dt><dd>${esc(e.hadir)} orang</dd>`:""}${e.agenda?`<dt>Agenda</dt><dd style="white-space:pre-wrap">${esc(e.agenda)}</dd>`:""}${e.keputusan?`<dt>Keputusan</dt><dd style="white-space:pre-wrap">${esc(e.keputusan)}</dd>`:""}${e.tindakLanjut?`<dt>Tindak lanjut</dt><dd style="white-space:pre-wrap">${esc(e.tindakLanjut)}</dd>`:""}</dl>`:""}
  ${e.isi?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:var(--accent);font-weight:600">Baca selengkapnya</summary><div class="body">${esc(e.isi)}</div></details>`:""}
  ${e.sumber?`<p class="hint" style="margin-top:8px">Sumber: ${esc(e.sumber)}</p>`:""}</article>`}
function vKegiatan(){
  const all=S.keg.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)),list=all.filter(e=>S.fTipe==="semua"||e.tipe===S.fTipe);let y="";
  return `<div class="row" style="margin-bottom:12px"><div><h2>Berita & notulen</h2><p class="muted small">Riwayat kegiatan RT 09, dari yang terbaru</p></div>${S.admin?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="addNot">+ Notulen rapat</button><button class="btn pri" id="addEv">+ Berita / kegiatan</button></div>`:""}</div>
  <div class="chips">${[["semua","Semua"],["berita","Berita"],["kegiatan","Kegiatan"],["notulen","Notulen"]].map(c=>`<button class="chipb" data-ft="${c[0]}" aria-pressed="${S.fTipe===c[0]}">${c[1]} (${c[0]==="semua"?all.length:all.filter(e=>e.tipe===c[0]).length})</button>`).join("")}</div>
  ${list.length?`<div class="tl">${list.map(e=>{const yy=e.tanggal.slice(0,4);const h=yy!==y?`<p class="yr">${yy}</p>`:"";y=yy;return h+evHtml(e)}).join("")}</div>`:`<div class="card empty">${S.fTipe==="notulen"?"Belum ada notulensi. Setelah pertemuan, pengurus dapat menambahkan lewat tombol Notulen rapat.":"Belum ada data."}</div>`}`;
}
function vPertemuan(){
  const hs=hosts(),nh=nextHost(),nm=nextMeeting(new Date()),pl=S.pert.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const hosted=new Set(S.pert.filter(p=>p.status==="selesai").map(p=>p.tuanRumahId)),skipped=S.kel.filter(f=>f.aktif!==false&&f.alamat&&f.ikutGiliran===false).sort(byAlamat);
  return `<div class="row" style="margin-bottom:12px"><div><h2>Pertemuan rutin bulanan</h2><p class="muted small">${esc(S.set.jadwal.hari)}, pekan ke-${S.set.jadwal.pekan} tiap bulan, pukul ${esc(S.set.jadwal.jam)} · bergilir dari rumah ke rumah</p></div>${S.admin?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-set="jadwal">Ubah jadwal rutin</button><button class="btn pri" id="addPert">+ Jadwalkan pertemuan</button></div>`:""}</div>
  <div class="card" style="margin-bottom:14px"><p class="muted small">Usulan berikutnya</p><h3 style="margin-top:4px">${fmtTgl(iso(nm))}</h3><p>${nh?`Tuan rumah: <b>${esc(nh.kepala)}</b> (${esc(nh.alamat)})`:"Belum ada KK tetap beralamat untuk digilir."}</p></div>
  <div class="grid g2" style="align-items:start"><div class="card"><h3 style="margin-bottom:8px">Jadwal & riwayat</h3>${pl.length?`<div class="grid" style="gap:10px">${pl.map(p=>`<div class="row" style="border-bottom:1px solid var(--line);padding-bottom:8px"><div><b>${fmtTglS(p.tanggal)}</b><p class="small muted">${esc(p.tuanRumahNama||"-")}${p.alamat?" · "+esc(p.alamat):""}</p>${p.catatan?`<p class="small">${esc(p.catatan)}</p>`:""}</div>
   <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="pill ${p.status==="selesai"?"p-good":p.status==="batal"?"p-bad":"p-warn"}">${p.status==="selesai"?"Selesai":p.status==="batal"?"Batal":"Terjadwal"}</span>${S.admin?`<button class="btn sm" data-editp="${esc(p.id)}">Ubah</button>`:""}${S.admin&&p.status==="terjadwal"?`<button class="btn sm pri" data-done="${esc(p.id)}">Selesai + notulen</button><button class="btn sm" data-cancelp="${esc(p.id)}">Batalkan</button>`:""}</div></div>`).join("")}</div>`:`<p class="muted small">Belum ada pertemuan tercatat di sistem.</p>`}</div>
  <div class="card"><div class="row"><h3>Urutan giliran tuan rumah</h3>${S.admin?`<span style="display:flex;gap:6px">${(S.set.giliranUrut||[]).length?`<button class="btn sm" id="gReset">Urut alamat</button>`:""}<button class="btn sm pri" id="gAdd">+ Tambah tuan rumah</button></span>`:""}</div><p class="hint" style="margin:4px 0 8px">${S.admin?"Geser dengan tombol panah, keluarkan KK dari giliran, atau tambahkan KK lain (termasuk yang mengontrak). Rumah yang sama dihitung satu giliran.":"Diurutkan menurut alamat."}</p>
   ${hs.length?`<ol class="gl">${hs.map((h,i)=>`<li><span class="gi">${i+1}. ${esc(h.kepala)} <span class="muted small">${esc(h.alamat)}</span> ${hosted.has(h.id)?'<span class="pill p-good">sudah</span>':""}${nh&&nh.id===h.id?' <span class="pill p-gold">berikutnya</span>':""}</span>${S.admin?`<button class="btn sm" data-gup="${i}" aria-label="Naikkan" ${i?"":"disabled"}>▲</button><button class="btn sm" data-gdn="${i}" aria-label="Turunkan" ${i<hs.length-1?"":"disabled"}>▼</button><button class="btn sm" data-gskip="${esc(h.id)}">Keluarkan</button>`:""}</li>`).join("")}</ol>`:`<p class="muted small">Belum ada data.</p>`}
   ${S.admin&&skipped.length?`<p class="small muted" style="margin-top:12px">Dikeluarkan dari giliran:</p><ol class="gl">${skipped.map(h=>`<li><span class="gi">${esc(h.kepala)} <span class="muted small">${esc(h.alamat)}</span></span><button class="btn sm" data-gin="${esc(h.id)}">Ikutkan</button></li>`).join("")}</ol>`:""}</div></div>`;
}
function vKeuanganLama(){return `<h2 style="margin-bottom:12px">Keuangan & surat</h2><div class="grid g2"><div class="card"><h3>Kas, iuran, piutang</h3><p class="muted small" style="margin-top:6px">Menunggu data terbaru dari bendahara (Sutrisno). Setelah data masuk, bagian ini menampilkan saldo kas, status iuran per KK, tunggakan, dan pengingat otomatis. Nominal iuran dan template pesan sudah bisa diatur di Pengaturan.</p></div>
 <div class="card"><h3>Surat pengantar RT</h3><p class="muted small" style="margin-top:6px">Pengajuan oleh warga, persetujuan Ketua RT, dan nomor otomatis disiapkan di tahap berikutnya. Nomor surat berikutnya sudah tercatat: <span class="mono">${esc(S.set.nomorSuratBerikut)} / SP.${esc(S.set.namaRT.replace(" ",""))}</span>.</p></div></div>`}
function vPengaturan(){const s=S.set,j=s.jadwal;
  return `<div class="row" style="margin-bottom:12px"><div><h2>Pengaturan</h2><p class="muted small">Semua isian ini mengubah tampilan di seluruh aplikasi.</p></div></div>
  <div class="grid g2" style="align-items:start">
  <div class="card"><div class="row"><h3>Identitas & pengurus</h3><button class="btn sm" data-set="id">Ubah</button></div><dl class="kv" style="margin-top:10px"><dt>Wilayah</dt><dd>${esc(s.namaRT)} / ${esc(s.rw)}, Kel. ${esc(s.kelurahan)}, ${esc(s.kota)} ${esc(s.kodepos)}</dd><dt>Ketua RT</dt><dd>${esc(s.ketua)}</dd><dt>Sekretaris</dt><dd>${esc(s.sekretaris||"Belum diisi")}</dd><dt>Bendahara</dt><dd>${esc(s.bendahara)}</dd></dl></div>
  <div class="card"><div class="row"><h3>Jadwal pertemuan</h3><button class="btn sm" data-set="jadwal">Ubah</button></div><dl class="kv" style="margin-top:10px"><dt>Hari</dt><dd>${esc(j.hari)}, pekan ke-${j.pekan}</dd><dt>Jam</dt><dd>${esc(j.jam)}</dd></dl></div>
  <div class="card"><div class="row"><h3>Iuran bulanan</h3><button class="btn sm" data-set="iuran">Ubah</button></div><div class="small" style="margin-top:10px;white-space:pre-wrap">${esc(s.iuran)}</div><p class="small muted" style="margin-top:8px">Total: Rp${iuranTotal(s.iuran).toLocaleString("id-ID")} per bulan</p></div>
  <div class="card"><div class="row"><h3>Penomoran surat</h3><span><button class="btn sm" id="ttdBtn">Tanda tangan</button> <button class="btn sm" data-set="surat">Ubah</button></span></div><p class="mono" style="margin-top:10px">${esc(s.nomorSuratBerikut)} / SP.${esc(s.namaRT.replace(" ",""))} / ${esc(s.rw.replace(/\D/g,""))} / ${ROM[new Date().getMonth()]} / ${new Date().getFullYear()}</p><p class="small muted">Nomor berikutnya, melanjutkan buku Surat Keluar (terakhir 357).</p></div>
  <div class="card"><div class="row"><h3>Tampilan</h3><button class="btn sm" data-set="tema">Ubah</button></div><dl class="kv" style="margin-top:10px"><dt>Warna</dt><dd><span class="sw" style="background:${esc((s.tema&&s.tema.preset==="Kustom"?s.tema.accent:(PRESET[(s.tema||{}).preset]||PRESET["Perunggu (bawaan)"]).accent))}"></span> ${esc((s.tema||{}).preset||"Perunggu (bawaan)")}</dd><dt>Ukuran huruf</dt><dd>${esc((s.tema||{}).fs||"Normal")}</dd></dl></div>
  <div class="card"><div class="row"><h3>Album foto</h3><button class="btn sm" data-set="album">Ubah</button></div><p class="small" style="margin-top:10px;overflow-wrap:anywhere">${albumOk(s.albumUrl)?esc(s.albumUrl):'<span class="muted">Belum diisi. Tempel tautan folder Google Drive.</span>'}</p></div>
  <div class="card" style="grid-column:1/-1"><div class="row"><h3>Template pesan pengingat</h3><button class="btn sm" data-set="tpl">Ubah</button></div>${s.tpl.map((t,i)=>`<details style="margin-top:8px"><summary class="small" style="cursor:pointer;font-weight:600">Pengingat ${i+1}</summary><div class="small" style="white-space:pre-wrap;margin-top:6px;background:var(--bg);padding:10px;border-radius:8px">${esc(t)}</div></details>`).join("")}<p class="hint" style="margin-top:8px">Kata kunci: {nama} {alamat} {bulan_tunggak} {total} {rincian}</p></div></div>`}
const iuranTotal=t=>String(t).split("\n").reduce((s,l)=>s+(parseInt(digits((l.split("=")[1]||"")))||0),0);

/* ---- detail KK ---- */
function openKK(id){
  const f=S.kel.find(x=>x.id===id);if(!f){closeM();return}
  const an=f.anggota||[];
  modal(`<div class="row"><div><h3>${esc(f.kepala)}</h3><p class="small muted">${esc(f.alamat||"Alamat belum tercatat")} · RT 09 / RW 01</p></div><button class="btn sm" id="mc">Tutup</button></div>
  ${f.aktif===false?`<div class="banner" style="margin-top:10px">KK nonaktif: ${esc(f.mutasi||"pindah / tidak tinggal lagi")}</div>`:""}
  <dl class="kv" style="margin:14px 0"><dt>No. KK</dt><dd class="mono">${mask(f.kk)}</dd><dt>NIK kepala</dt><dd class="mono">${mask(f.nikKepala)}</dd><dt>No. HP</dt><dd class="mono">${esc(f.hp||"-")}</dd><dt>Hunian</dt><dd>${esc(f.hunian||"-")}</dd><dt>Ikut giliran</dt><dd>${f.ikutGiliran===false?"Tidak":"Ya"}</dd>${f.catatan?`<dt>Catatan</dt><dd>${esc(f.catatan)}</dd>`:""}</dl>
  ${S.admin?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn sm" id="eKK">Ubah data KK</button><button class="btn sm pri" id="aM">+ Tambah anggota</button>${f.aktif===false?`<button class="btn sm" id="reKK">Aktifkan kembali</button>`:`<button class="btn sm bad" id="offKK">Tandai pindah / nonaktif</button>`}</div>`:""}
  <div class="scroll"><table class="tbl"><thead><tr><th>Nama</th><th>Hubungan</th><th>NIK</th><th>Tgl lahir</th><th>Status</th>${S.admin?"<th></th>":""}</tr></thead><tbody>
  ${an.map((a,i)=>`<tr><td><b>${esc(a.nama)}</b><p class="small muted">${esc([a.pekerjaan,a.pendidikan].filter(Boolean).join(" · "))}</p></td><td>${esc(a.hub||"-")}</td><td class="mono">${mask(a.nik)}</td><td>${a.tglLahir?fmtTglS(a.tglLahir):"-"}</td><td><span class="pill ${(a.status||"Aktif")==="Aktif"?"p-good":"p-mute"}">${esc(a.status||"Aktif")}</span></td>${S.admin?`<td style="white-space:nowrap"><button class="btn sm" data-em="${i}">Ubah</button> <button class="btn sm bad" data-dm="${i}">Hapus</button></td>`:""}</tr>`).join("")}</tbody></table></div>
  ${(f.riwayat||[]).length?`<h3 style="margin:16px 0 6px;font-size:.95rem">Riwayat perubahan</h3><ul class="small muted" style="margin:0;padding-left:18px">${f.riwayat.slice(-6).reverse().map(r=>`<li>${fmtTglS(r.tgl)}: ${esc(r.ket)}</li>`).join("")}</ul>`:""}`,true);
  $("#mc").onclick=closeM;
  if(!S.admin)return;
  $("#eKK").onclick=()=>kkForm(f);
  $("#aM").onclick=()=>memberForm(f,null);
  document.querySelectorAll("[data-em]").forEach(b=>b.onclick=()=>memberForm(f,+b.dataset.em));
  document.querySelectorAll("[data-dm]").forEach(b=>b.onclick=()=>confirmM("Hapus "+an[+b.dataset.dm].nama+" dari KK ini? Jika orangnya pindah atau meninggal, lebih baik ubah statusnya agar riwayat tetap ada.",async()=>{const n=an.slice();const [x]=n.splice(+b.dataset.dm,1);await saveKK({...f,anggota:n},"Anggota dihapus: "+x.nama);openKK(f.id)},"Hapus"));
  const off=$("#offKK");if(off)off.onclick=()=>openForm({title:"Tandai KK nonaktif",fields:[{id:"alasan",label:"Alasan",type:"select",options:["Pindah keluar","Rumah dikosongkan","Meninggal dunia","Lainnya"]},{id:"tgl",label:"Tanggal",type:"date",value:iso(new Date()),half:true},{id:"ket",label:"Tujuan / keterangan",half:true}],save:async v=>{await saveKK({...f,aktif:false,mutasi:v.alasan+(v.ket?" - "+v.ket:"")+" ("+fmtTglS(v.tgl)+")"},"Dinonaktifkan: "+v.alasan);return{keep:true,after:openKK(f.id)}}});
  const re=$("#reKK");if(re)re.onclick=async()=>{await saveKK({...f,aktif:true,mutasi:""},"Diaktifkan kembali");openKK(f.id)};
}
async function saveKK(f,ket){const o={...f};delete o.id;o.riwayat=[...(f.riwayat||[]),...(ket?[{tgl:iso(new Date()),ket}]:[])];await put("keluarga/"+f.id,o);upsert(S.kel,{...o,id:f.id});render()}
function dupNik(nik,exceptKey){if(digits(nik).length<10)return null;const k=digits(nik).slice(-10);
  for(const f of S.kel)for(const [i,a] of (f.anggota||[]).entries()){if(f.id+":"+i===exceptKey)continue;if(digits(a.nik).slice(-10)===k)return f.kepala}return null}
function kkForm(f){
  const baru=!f;
  openForm({title:baru?"Tambah warga baru (keluarga)":"Ubah data KK",fields:[
   {id:"kepala",label:"Nama kepala keluarga",value:f?.kepala},{id:"nikKepala",label:"NIK kepala keluarga",value:f?.nikKepala,inputmode:"numeric",half:true,hint:"16 digit. Boleh dikosongkan dulu."},{id:"kk",label:"No. Kartu Keluarga",value:f?.kk,inputmode:"numeric",half:true,hint:"16 digit"},
   {id:"alamat",label:"Alamat",value:f?.alamat,list:"alamatList",half:true,ph:"Hidup Baru III / 22"},{id:"hp",label:"No. HP / WhatsApp",value:f?.hp,inputmode:"tel",half:true},
   {id:"hunian",label:"Status hunian",type:"select",options:["Tetap","Kontrak","Numpang"],value:f?.hunian||"Tetap",half:true},{id:"ikutGiliran",label:"Ikut giliran tuan rumah pertemuan",type:"check",value:f?f.ikutGiliran!==false:true},
   {id:"catatan",label:"Catatan",value:f?.catatan}],
   save:async v=>{if(!v.kepala)return{error:"Nama kepala keluarga wajib diisi."};
    for(const k of ["nikKepala","kk"])if(v[k]&&(digits(v[k]).length<10||digits(v[k]).length>16))return{error:(k==="kk"?"No. KK":"NIK")+" harus 10 sampai 16 digit angka."};
    const d=dupNik(v.nikKepala,f?f.id+":"+(f.anggota||[]).findIndex(a=>a.hub==="KK"):"");if(d&&baru)return{error:"NIK ini sudah terdaftar atas nama keluarga "+d+"."};
    const base={...(f||{aktif:true,anggota:[{nama:v.kepala,nik:digits(v.nikKepala),hub:"KK",status:"Aktif"}],riwayat:[]}),kepala:v.kepala,nikKepala:digits(v.nikKepala),kk:digits(v.kk),alamat:v.alamat,hp:digits(v.hp),hunian:v.hunian,ikutGiliran:v.ikutGiliran,catatan:v.catatan};
    if(f){base.anggota=(f.anggota||[]).map(a=>a.hub==="KK"?{...a,nama:v.kepala,nik:digits(v.nikKepala)||a.nik}:a)}
    base.id=f?f.id:(digits(v.kk)||"kk-"+Date.now());
    if(baru&&S.kel.some(x=>x.id===base.id))return{error:"No. KK ini sudah ada."};
    await saveKK(base,baru?"Warga baru terdaftar":"Data KK diubah");toast(baru?"Warga baru tersimpan":"Perubahan tersimpan");openKK(base.id);return{keep:true}}})}
function memberForm(f,idx){
  const a=idx==null?{}:f.anggota[idx];
  openForm({title:idx==null?"Tambah anggota keluarga":"Ubah anggota",wide:true,fields:[
   {id:"nama",label:"Nama lengkap",value:a.nama},{id:"nik",label:"NIK",value:a.nik,inputmode:"numeric",half:true},{id:"hub",label:"Hubungan dalam keluarga",type:"select",options:HUB,value:a.hub||"Anak",half:true},
   {id:"jk",label:"Jenis kelamin",type:"select",options:["L","P"],value:a.jk||"L",half:true},{id:"tglLahir",label:"Tanggal lahir",type:"date",value:a.tglLahir,half:true},
   {id:"tempatLahir",label:"Tempat lahir",value:a.tempatLahir,half:true},{id:"agama",label:"Agama",type:"select",options:AGAMA,value:a.agama||"Islam",half:true},
   {id:"statusKawin",label:"Status perkawinan",type:"select",options:KAWIN,value:a.statusKawin||"Belum Menikah",half:true},{id:"pendidikan",label:"Pendidikan",value:a.pendidikan,half:true},
   {id:"pekerjaan",label:"Pekerjaan",value:a.pekerjaan,half:true},{id:"status",label:"Status warga",type:"select",options:["Aktif","Pindah","Meninggal"],value:a.status||"Aktif",half:true}],
   save:async v=>{if(!v.nama)return{error:"Nama wajib diisi."};if(v.nik&&(digits(v.nik).length<10||digits(v.nik).length>16))return{error:"NIK harus 10 sampai 16 digit angka."};
    const d=dupNik(v.nik,f.id+":"+idx);if(d)return{error:"NIK ini sudah terdaftar di keluarga "+d+"."};
    const m={...a,...v,nik:digits(v.nik)};const n=(f.anggota||[]).slice();idx==null?n.push(m):n[idx]=m;
    await saveKK({...f,anggota:n},(idx==null?"Anggota ditambahkan: ":"Anggota diubah: ")+v.nama+(v.status!=="Aktif"?" ("+v.status+")":""));toast("Tersimpan");openKK(f.id);return{keep:true}}})}

/* ---- kegiatan, pertemuan, pengaturan ---- */
function evForm(e,tipe){
  const isN=(e?.tipe||tipe)==="notulen";
  openForm({title:e?"Ubah "+e.tipe:isN?"Notulen rapat baru":"Berita / kegiatan baru",wide:true,fields:[
   {id:"tipe",label:"Jenis",type:"select",options:["berita","kegiatan","notulen"],value:e?.tipe||tipe||"berita",half:true},{id:"tanggal",label:"Tanggal",type:"date",value:e?.tanggal||iso(new Date()),half:true},
   {id:"judul",label:"Judul",value:e?.judul},{id:"ringkasan",label:"Ringkasan singkat",value:e?.ringkasan},{id:"isi",label:"Uraian lengkap",type:"textarea",rows:5,value:e?.isi},
   {id:"tuanRumah",label:"Tempat / tuan rumah",value:e?.tuanRumah,showIf:["tipe","notulen"],half:true},{id:"hadir",label:"Jumlah hadir",value:e?.hadir,inputmode:"numeric",showIf:["tipe","notulen"],half:true},
   {id:"agenda",label:"Agenda",type:"textarea",rows:3,value:e?.agenda,showIf:["tipe","notulen"]},{id:"keputusan",label:"Keputusan / hasil pembahasan",type:"textarea",rows:4,value:e?.keputusan,showIf:["tipe","notulen"]},{id:"tindakLanjut",label:"Tindak lanjut (siapa, kapan)",type:"textarea",rows:3,value:e?.tindakLanjut,showIf:["tipe","notulen"]},
   {id:"sumber",label:"Sumber / catatan",value:e?.sumber}],
   save:async v=>{if(!v.judul||!v.tanggal)return{error:"Judul dan tanggal wajib diisi."};const id=e?.id||"ev-"+Date.now();const o={...v};await put("kegiatan/"+id,o);upsert(S.keg,{...o,id});render();toast("Tersimpan")}})}
function pertForm(p){
  const nm=nextMeeting(new Date()),nh=nextHost(),hs=hosts().slice(),lab=h=>h.kepala+" - "+h.alamat;
  if(p&&p.tuanRumahId&&!hs.some(h=>h.id===p.tuanRumahId)){const o=S.kel.find(f=>f.id===p.tuanRumahId);if(o)hs.push(o)}
  const opts=hs.map(lab),ST=[["terjadwal","Terjadwal"],["selesai","Selesai"],["batal","Batal"]],cur=p&&hs.find(h=>h.id===p.tuanRumahId);
  openForm({title:p?"Ubah pertemuan":"Jadwalkan pertemuan",fields:[{id:"tanggal",label:"Tanggal",type:"date",value:p?p.tanggal:iso(nm),half:true},{id:"status",label:"Status",type:"select",options:ST.map(x=>x[1]),value:p?ST.find(x=>x[0]===p.status)[1]:"Terjadwal",half:true},{id:"tuan",label:"Tuan rumah",type:"select",options:opts.length?opts:["(belum ada data)"],value:cur?lab(cur):(!p&&nh?lab(nh):(opts[0]||"")) },{id:"catatan",label:"Catatan",value:p?.catatan,ph:"Contoh: bahas kerja bakti"}],
   save:async v=>{const h=hs.find(x=>lab(x)===v.tuan),id=p?p.id:"p-"+Date.now(),st=ST.find(x=>x[1]===v.status)[0];if(!v.tanggal)return{error:"Tanggal wajib diisi."};
    const o={...(p||{}),tanggal:v.tanggal,tuanRumahId:h?h.id:(p?.tuanRumahId||""),tuanRumahNama:h?h.kepala:(p?.tuanRumahNama||""),alamat:h?h.alamat:(p?.alamat||""),status:st,catatan:v.catatan};delete o.id;await put("pertemuan/"+id,o);upsert(S.pert,{...o,id});render();toast(p?"Pertemuan diperbarui":"Pertemuan dijadwalkan")}})}
async function giliranSimpan(ids){const n={...S.set,giliranUrut:ids};await put("pengaturan/rt",n);S.set=n;render()}
function giliranTambah(){
  const hs=hosts(),adr=new Set(hs.map(h=>h.alamat)),cand=S.kel.filter(f=>f.aktif!==false&&f.alamat&&!adr.has(f.alamat)).sort(byAlamat);
  if(!cand.length){toast("Semua rumah beralamat sudah ada dalam giliran");return}
  const lb=cand.map(f=>f.kepala+" - "+f.alamat+" ("+(f.hunian||"-")+(f.ikutGiliran===false?", dikeluarkan":"")+")");
  openForm({title:"Tambah tuan rumah",fields:[{id:"kk",label:"Keluarga",type:"select",options:lb,value:lb[0],hint:"Ditempatkan di urutan paling akhir. Urutan bisa digeser sesudahnya."}],
   save:async v=>{const f=cand[lb.indexOf(v.kk)];if(adr.has(f.alamat))return{error:"Rumah di alamat ini sudah ada dalam giliran (satu rumah dihitung satu giliran)."};
    const o={...f,ikutGiliran:true};delete o.id;await put("keluarga/"+f.id,o);upsert(S.kel,{...o,id:f.id});
    const ids=hosts().map(h=>h.id).filter(i=>i!==f.id).concat(f.id);const n={...S.set,giliranUrut:ids};await put("pengaturan/rt",n);S.set=n;render();toast(f.kepala+" masuk giliran")}})}
async function giliranSkip(id,ikut){const f=S.kel.find(x=>x.id===id);if(!f)return;const o={...f,ikutGiliran:ikut};delete o.id;await put("keluarga/"+id,o);upsert(S.kel,{...o,id});render()}
function setForm(kind){
  const s=S.set,j=s.jadwal;
  const cfg={
   id:{title:"Identitas & pengurus",fields:[{id:"namaRT",label:"RT",value:s.namaRT,half:true},{id:"rw",label:"RW",value:s.rw,half:true},{id:"kelurahan",label:"Kelurahan",value:s.kelurahan,half:true},{id:"kota",label:"Kota",value:s.kota,half:true},{id:"kodepos",label:"Kode pos",value:s.kodepos,half:true},{id:"kecamatan",label:"Kecamatan",value:s.kecamatan,half:true},{id:"komplek",label:"Nama kompleks (kop surat)",value:s.komplek},{id:"ketuaRW",label:"Ketua RW (untuk tanda tangan surat)",value:s.ketuaRW},{id:"ketua",label:"Ketua RT",value:s.ketua},{id:"sekretaris",label:"Sekretaris",value:s.sekretaris},{id:"bendahara",label:"Bendahara",value:s.bendahara}],to:v=>v},
   jadwal:{title:"Jadwal pertemuan rutin",fields:[{id:"hari",label:"Hari",type:"select",options:HARI,value:j.hari,half:true},{id:"pekan",label:"Pekan ke-",type:"select",options:["1","2","3","4","5"],value:String(j.pekan),half:true},{id:"jam",label:"Jam",value:j.jam,half:true}],to:v=>({jadwal:{hari:v.hari,pekan:+v.pekan,jam:v.jam}})},
   iuran:{title:"Iuran bulanan",fields:[{id:"iuran",label:"Komponen iuran",type:"textarea",rows:6,value:s.iuran,hint:"Satu baris per komponen, format: Nama = nominal"}],to:v=>v},
   surat:{title:"Penomoran surat",fields:[{id:"nomorSuratBerikut",label:"Nomor surat berikutnya",value:s.nomorSuratBerikut,inputmode:"numeric"},{id:"kodeSurat",label:"Kode surat",value:s.kodeSurat,half:true},{id:"kodeRW",label:"Kode RW",value:s.kodeRW,half:true}],to:v=>({nomorSuratBerikut:+digits(v.nomorSuratBerikut)||s.nomorSuratBerikut,kodeSurat:v.kodeSurat||s.kodeSurat,kodeRW:v.kodeRW||s.kodeRW})},
   tpl:{title:"Template pesan pengingat",fields:[0,1,2].map(i=>({id:"t"+i,label:"Pengingat "+(i+1),type:"textarea",rows:7,value:s.tpl[i]})).concat([{id:"_h",label:"",type:"select",options:["Kata kunci: {sapaan} {alamat} {jenis} {bulan_tunggak} {total} {rincian}"]}]),to:v=>({tpl:[v.t0,v.t1,v.t2]})},
   tema:{title:"Tampilan",fields:[{id:"preset",label:"Warna dasar",type:"select",options:Object.keys(PRESET),value:(s.tema||{}).preset||"Perunggu (bawaan)"},{id:"accent",label:"Warna aksen (untuk Kustom)",type:"color",value:(s.tema||{}).accent||"#6b4a1f",half:true},{id:"bg",label:"Warna latar (untuk Kustom)",type:"color",value:(s.tema||{}).bg||"#f1efec",half:true},{id:"fs",label:"Ukuran huruf",type:"select",options:["Kecil","Normal","Besar"],value:(s.tema||{}).fs||"Normal"}],to:v=>({tema:{preset:v.preset,accent:v.accent,bg:v.bg,fs:v.fs}})},
   album:{title:"Tautan album foto",fields:[{id:"albumUrl",label:"Tautan folder Google Drive",value:s.albumUrl,ph:"https://drive.google.com/drive/folders/...",hint:"Atur berbagi folder menjadi 'Siapa saja yang memiliki link' bila warga perlu membukanya. Kosongkan untuk menghapus."}],to:v=>{if(v.albumUrl&&!albumOk(v.albumUrl))throw new Error("Tautan harus diawali https://");return {albumUrl:v.albumUrl}}}}[kind];
  openForm({title:cfg.title,fields:cfg.fields,wide:kind==="tpl",save:async v=>{if(kind==="id"&&(!v.namaRT||!v.ketua))return{error:"RT dan nama Ketua wajib diisi."};const n={...S.set,...cfg.to(v)};await put("pengaturan/rt",n);S.set=n;render();toast("Pengaturan tersimpan")}})}

/* ===================== TAHAP 3 & 4 ===================== */
Object.assign(S,{surat:[],kas:[],piu:[],rem:[],sos:[],qur:null,ver:[],ttd:null,kTab:"kas",sTab:"qurban",sSub:"semua",izinKirim:false,owner:false,dl:null});
const rp=n=>"Rp"+Number(n||0).toLocaleString("id-ID");
const BLNN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const perLabel=p=>{const [y,m]=String(p).split("-");return (BLNN[+m-1]||"")+" "+y};
const rtNum=()=>digits(S.set.namaRT)||"09",rwNum=()=>digits(S.set.rw)||"01";
const fmtNik=v=>{const d=digits(v);return d.length===16?d.slice(0,6)+" "+d.slice(6,12)+" "+d.slice(12):d};
const tglPanjang=s=>s?new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"";
const JENIS=[["Surat Keterangan (umum)","ket",""],["Surat Keterangan Domisili","dom",""],["Pengantar KTP","ket","Mengurus KTP"],["Pengantar Kartu Keluarga","ket","Mengurus Kartu Keluarga"],["Pengantar SKCK","ket","Membuat SKCK"],["Keterangan Usaha","ket","Surat Keterangan Usaha"],["Keterangan Tidak Mampu","ket","Keterangan tidak mampu (SKTM)"],["Pengantar Akta Kelahiran","ket","Mengurus akta kelahiran"],["Keterangan Meninggal Dunia","ket","Mengurus keterangan / akta kematian"],["Pengantar Numpang Nikah","ket","Mengurus pernikahan"],["Surat Pindah Alamat","ket","Pindah alamat"],["Keterangan Kehilangan","ket","Laporan kehilangan"],["Keterangan Ahli Waris","ket","Mengurus hak ahli waris"],["Keterangan Penghasilan","ket","Keterangan penghasilan"]];
const SUB=(a,b)=>a.localeCompare(b,"id",{numeric:true});

/* ---------- surat ---------- */
function people(){const o=[],seen={};S.kel.filter(f=>f.aktif!==false).sort(byAlamat).forEach(f=>(f.anggota||[]).forEach(a=>{if((a.status||"Aktif")!=="Aktif")return;let l=a.nama+" - "+(f.alamat||f.kepala)+(a.hub&&a.hub!=="KK"?" ("+a.hub+")":"");seen[l]=(seen[l]||0)+1;if(seen[l]>1)l+=" #"+seen[l];o.push({label:l,f,a})}));return o}
function ttlOf(a){return [a.tempatLahir,a.tglLahir?tglPanjang(a.tglLahir):""].filter(Boolean).join(", ")}
function kopLines(){const s=S.set;return ["RUKUN TETANGGA "+rtNum()+", RUKUN WARGA "+rwNum(),s.komplek||"","KEL. "+s.kelurahan.toUpperCase()+" - KEC. "+(s.kecamatan||"Pinang").toUpperCase(),s.kota.toUpperCase()+". "+s.kodepos].filter(Boolean)}
function suratBody(x){
  const s=S.set,alamatFull="Jl. "+x.alamat+", RT "+rtNum()+" / "+rwNum()+", Kel. "+s.kelurahan+", Kec. "+(s.kecamatan||"Pinang")+", "+s.kota;
  const rows=[["Nama",x.nama],["Tempat, tgl lahir",x.ttl||"-"],["Kewarganegaraan","Indonesia"],["Agama",x.agama||"-"],["Jenis Kelamin",x.jk||"-"],["Status",x.statusKawin||"-"],["No NIK",fmtNik(x.nik)||"-"],["No. KK",fmtNik(x.kk)||"-"]];
  const intro="Yang bertanda tangan di bawah ini, Ketua RT "+rtNum()+" / "+rwNum()+", Kelurahan "+s.kelurahan+", Kec. "+(s.kecamatan||"Pinang")+", "+s.kota+", menerangkan bahwa:";
  let mid,outro,judul="SURAT KETERANGAN";
  if(x.layout==="dom"){judul="SURAT KETERANGAN DOMISILI";if(x.alamatAsal)rows.push(["Alamat asal",x.alamatAsal]);
    mid="Bahwa yang namanya tersebut di atas benar berdomisili di wilayah kami, tinggal"+(x.hunian==="Kontrak"?" dan mengontrak":"")+" di alamat:\n"+alamatFull+".\nDan surat keterangan domisili ini untuk keperluan: "+(x.keperluan||"-")+".\nSurat keterangan domisili ini berlaku selama yang bersangkutan bertempat tinggal di wilayah kami. Apabila yang bersangkutan pindah alamat agar melapor kepada pengurus RT.";
    outro="Demikian Surat Keterangan Domisili ini kami buat agar dapat dipergunakan sebagaimana mestinya."}
  else{rows.push(["Alamat",alamatFull],["Keperluan",x.keperluan||"-"]);mid="Yang bersangkutan adalah benar tercatat sebagai warga kami yang bertempat tinggal pada alamat tersebut di atas.";outro="Demikian Surat Keterangan ini kami buat dengan sebenarnya, untuk dapat dipergunakan sebagaimana mestinya."}
  return {judul,intro,rows,mid,outro,tgl:"Tangerang, "+tglPanjang(x.tanggal)}
}
function paperHtml(x){
  const b=suratBody(x),terbit=x.status==="terbit",k=kopLines();
  return `<div class="paper"><div class="kop"><img src="${LOGO}" alt=""><div>${k.map((l,i)=>`<div class="${i===0?"k1":""}">${esc(l)}</div>`).join("")}</div></div>
  <h4>${b.judul}</h4><div class="nom">Nomor : ${terbit?esc(x.nomor):"<i>(diberi nomor saat disetujui)</i>"}</div>
  <p>${esc(b.intro)}</p><table class="pt">${b.rows.map(r=>`<tr><td>${esc(r[0])}</td><td>: ${esc(r[1])}</td></tr>`).join("")}</table>
  <p style="white-space:pre-wrap">${esc(b.mid)}</p><p>${esc(b.outro)}</p>
  <div class="sig"><div></div><div>${esc(b.tgl)}</div></div>
  <div class="sig2"><div><div>Mengetahui,</div><div>KETUA RW. ${rwNum()}</div><div class="sp"></div><div><b>${esc(S.set.ketuaRW||"(nama Ketua RW belum diisi)")}</b></div></div>
  <div><div>&nbsp;</div><div>KETUA RT. ${rtNum()}</div><div class="sp">${terbit&&S.ttd?`<img src="${S.ttd.data}" alt="Tanda tangan" style="height:54px">`:""}</div><div><b>${esc(S.set.ketua)}</b></div></div></div>
  ${terbit?"":`<div class="draft">DRAF</div>`}</div>`}
function pdfSurat(x){
  const J=window.jspdf&&window.jspdf.jsPDF;if(!J)throw new Error("Pustaka PDF belum termuat. Periksa koneksi internet lalu coba lagi.");
  const d=new J({unit:"mm",format:"a4"}),b=suratBody(x),k=kopLines(),L=22,R=188;let y=14;
  try{d.addImage(LOGO,"PNG",L,y-3,24,24)}catch(e){}
  d.setFont("times","bold");d.setFontSize(12.5);const cx=(L+24+R)/2+2;
  k.forEach((l,i)=>{d.setFont("times",i===0?"bold":"normal");d.setFontSize(i===0?13:10.5);d.text(l,cx,y+i*5,{align:"center"})});
  y=38;d.setLineWidth(.9);d.line(L,y,R,y);d.setLineWidth(.25);d.line(L,y+1.3,R,y+1.3);
  y=49;d.setFont("times","bold");d.setFontSize(13);d.text(b.judul,105,y,{align:"center"});const w=d.getTextWidth(b.judul);d.setLineWidth(.4);d.line(105-w/2,y+1,105+w/2,y+1);
  y+=6;d.setFont("times","normal");d.setFontSize(11.5);d.text("Nomor : "+(x.status==="terbit"?x.nomor:"(draf, belum bernomor)"),105,y,{align:"center"});
  y+=9;d.setFontSize(11.5);let t=d.splitTextToSize(b.intro,R-L);d.text(t,L,y);y+=t.length*5.4+3;
  b.rows.forEach(r=>{const v=d.splitTextToSize(String(r[1]),R-L-50);d.text(r[0],L+4,y);d.text(":",L+42,y);d.text(v,L+46,y);y+=v.length*5.4+0.6});
  y+=3;t=d.splitTextToSize(b.mid,R-L);d.text(t,L,y);y+=t.length*5.4+3;t=d.splitTextToSize(b.outro,R-L);d.text(t,L,y);y+=t.length*5.4+9;
  if(y>230){d.addPage();y=25}
  d.text(b.tgl,R-62,y);y+=6;d.text("Mengetahui,",L+8,y);y+=5;d.text("KETUA RW. "+rwNum(),L+8,y);d.text("KETUA RT. "+rtNum(),R-62,y);
  if(x.status==="terbit"&&S.ttd){try{const h=18,wd=Math.min(40,h*(S.ttd.ratio||2));d.addImage(S.ttd.data,"PNG",R-62,y+1,wd,h)}catch(e){}}
  y+=26;d.setFont("times","bold");d.text(S.set.ketuaRW||"(nama Ketua RW)",L+8,y);d.text(S.set.ketua,R-62,y);
  if(x.status!=="terbit"){d.setTextColor(200,60,50);d.setFontSize(48);d.text("DRAF",105,150,{align:"center",angle:30});d.setTextColor(0)}
  return d.output("blob")}
async function unduhPdf(x){try{const blob=pdfSurat(x);if(!S.dl){toast("Fitur unduh tidak tersedia di tampilan ini");return}await S.dl.save({filename:"Surat-"+(x.no||"draf")+"-"+x.nama.replace(/[^A-Za-z0-9]+/g,"-")+".pdf",data:blob});toast("PDF disimpan")}catch(e){if(e&&e.code==="declined")return;toast(e.message||"Gagal membuat PDF")}}
function suratDoc(v,p,j,old){return {tanggal:v.tanggal,jenis:v.jenis,layout:j[1],status:old?.status||"menunggu",kkId:p.f.id,nama:p.a.nama,ttl:ttlOf(p.a),agama:p.a.agama||"",jk:p.a.jk==="P"?"Wanita":p.a.jk==="L"?"Pria":"",statusKawin:p.a.statusKawin||"",nik:digits(p.a.nik||(p.a.hub==="KK"?p.f.nikKepala:"")),kk:digits(p.f.kk),alamat:p.f.alamat||"",hunian:p.f.hunian||"",keperluan:v.keperluan||j[2],alamatAsal:v.alamatAsal||"",catatan:v.catatan||"",tglBuat:old?.tglBuat||iso(new Date()),no:old?.no||null,nomor:old?.nomor||"",tglSetuju:old?.tglSetuju||"",disetujuOleh:old?.disetujuOleh||""}}
function suratForm(x){
  const pp=people(),lb=pp.map(p=>p.label);if(!pp.length){toast("Belum ada data warga");return}
  const cur=x?pp.findIndex(p=>p.f.id===x.kkId&&p.a.nama===x.nama):-1;
  openForm({title:x?"Ubah surat":"Surat baru",wide:true,fields:[
   {id:"orang",label:"Pemohon",type:"select",options:lb,value:cur>=0?lb[cur]:lb[0]},{id:"jenis",label:"Jenis surat",type:"select",options:JENIS.map(j=>j[0]),value:x?.jenis||JENIS[0][0],half:true},{id:"tanggal",label:"Tanggal surat",type:"date",value:x?.tanggal||iso(new Date()),half:true},
   {id:"keperluan",label:"Keperluan",type:"textarea",rows:2,value:x?.keperluan,hint:"Kosongkan untuk memakai isian bawaan jenis surat."},{id:"alamatAsal",label:"Alamat asal (khusus domisili)",value:x?.alamatAsal,showIf:["jenis","Surat Keterangan Domisili"]},{id:"catatan",label:"Catatan internal (tidak dicetak)",value:x?.catatan}],
   save:async v=>{const p=pp[lb.indexOf(v.orang)],j=JENIS.find(a=>a[0]===v.jenis);if(!p.f.alamat)return{error:"Alamat keluarga ini belum diisi. Lengkapi di Data warga dulu."};
    const id=x?.id||"s-"+Date.now(),o=suratDoc(v,p,j,x);await put("surat/"+id,o);upsert(S.surat,{...o,id});render();toast("Surat tersimpan, menunggu persetujuan Ketua RT")}})}
async function terbitkan(x){
  const no=+S.set.nomorSuratBerikut||358,t=new Date(x.tanggal+"T00:00:00");
  const nomor=no+" / "+S.set.kodeSurat+" / "+S.set.kodeRW+" / "+ROM[t.getMonth()]+" / "+t.getFullYear();
  const n={...S.set,nomorSuratBerikut:no+1};await put("pengaturan/rt",n);S.set=n;
  const o={...x,no,nomor,status:"terbit",tglSetuju:iso(new Date()),disetujuOleh:S.set.ketua};delete o.id;await put("surat/"+x.id,o);upsert(S.surat,{...o,id:x.id});render();return {...o,id:x.id}}
function openSurat(id){const x=S.surat.find(s=>s.id===id);if(!x)return;
  modal(`<div class="row"><h3>${esc(x.jenis)}</h3><button class="btn sm" id="mc">Tutup</button></div><div style="margin:12px 0" class="scroll">${paperHtml(x)}</div>
  <div class="mact" style="justify-content:space-between"><span class="pill ${x.status==="terbit"?"p-good":x.status==="ditolak"?"p-bad":"p-warn"}">${x.status==="terbit"?"Terbit":x.status==="ditolak"?"Ditolak":"Menunggu persetujuan Ketua RT"}</span>
  <span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" id="pdf">Unduh PDF</button>${x.status==="menunggu"?`<button class="btn sm" id="eS">Ubah</button><button class="btn sm bad" id="nS">Tolak</button>${S.owner?`<button class="btn sm pri" id="aS">Setujui & beri nomor</button>`:`<span class="hint">Persetujuan oleh Ketua RT</span>`}`:""}${x.status!=="terbit"?`<button class="btn sm bad" id="dS">Hapus</button>`:""}</span></div>`,true);
  $("#mc").onclick=closeM;$("#pdf").onclick=()=>unduhPdf(x);
  const e=$("#eS");if(e)e.onclick=()=>suratForm(x);
  const a=$("#aS");if(a)a.onclick=async()=>{a.disabled=true;try{const n=await terbitkan(x);openSurat(n.id);toast("Surat terbit, nomor "+n.nomor)}catch(er){toast(er.message);a.disabled=false}};
  const n=$("#nS");if(n)n.onclick=async()=>{const o={...x,status:"ditolak"};delete o.id;try{await put("surat/"+x.id,o);upsert(S.surat,{...o,id:x.id});render();openSurat(x.id)}catch(er){toast(er.message)}};
  const d=$("#dS");if(d)d.onclick=()=>confirmM("Hapus surat ini?",async()=>{await del("surat/"+x.id);S.surat=S.surat.filter(s=>s.id!==x.id);render()},"Hapus")}
function vSurat(){
  const l=S.surat.slice().sort((a,b)=>(b.tanggal+b.tglBuat).localeCompare(a.tanggal+a.tglBuat)),q=S.q.toLowerCase();
  const list=l.filter(x=>!q||(x.nama+" "+x.jenis+" "+(x.nomor||"")+" "+x.keperluan).toLowerCase().includes(q)),mn=l.filter(x=>x.status==="menunggu").length;
  return `<div class="row" style="margin-bottom:12px"><div><h2>Surat pengantar & keterangan</h2><p class="muted small">Nomor berikutnya: <span class="mono">${esc(S.set.nomorSuratBerikut)} / ${esc(S.set.kodeSurat)} / ${esc(S.set.kodeRW)} / ${ROM[new Date().getMonth()]} / ${new Date().getFullYear()}</span></p></div><button class="btn pri" id="addSurat">+ Surat baru</button></div>
  ${mn?`<div class="banner">${mn} surat menunggu persetujuan Ketua RT${S.owner?".":". Hanya akun Ketua RT yang dapat menyetujui."}</div>`:""}
  <div class="tools"><input id="qs" type="search" placeholder="Cari nama, jenis, atau nomor surat" value="${esc(S.q)}" aria-label="Cari surat"></div>
  <div class="card scroll" style="padding:6px">${list.length?`<table class="tbl"><thead><tr><th>Tanggal</th><th>Nomor</th><th>Pemohon</th><th>Jenis</th><th>Status</th></tr></thead><tbody>${list.map(x=>`<tr class="click" tabindex="0" data-surat="${esc(x.id)}"><td>${fmtTglS(x.tanggal)}</td><td class="mono">${esc(x.nomor||"-")}</td><td><b>${esc(x.nama)}</b></td><td>${esc(x.jenis)}</td><td><span class="pill ${x.status==="terbit"?"p-good":x.status==="ditolak"?"p-bad":"p-warn"}">${x.status==="terbit"?"Terbit":x.status==="ditolak"?"Ditolak":"Menunggu"}</span></td></tr>`).join("")}</tbody></table>`:`<div class="empty">Belum ada surat di sistem ini. Buku surat keluar sebelumnya (no. 186 sampai 357) belum diimpor; nomor berikutnya sudah melanjutkan dari 358.</div>`}</div>
  <p class="hint" style="margin-top:8px">PDF memakai kop dan logo RT, siap dicetak lalu ditandatangani dan dicap. Tanda tangan digital Ketua RT dapat diunggah di Pengaturan.</p>`}

/* ---------- keuangan ---------- */
const kasList=j=>S.kas.filter(k=>k.jenis===j).sort((a,b)=>b.periode.localeCompare(a.periode));
const piuList=j=>S.piu.filter(k=>k.jenis===j).sort((a,b)=>b.periode.localeCompare(a.periode));
const dataSementara=()=>S.kas.concat(S.piu).some(d=>d.sementara);
function vKeuangan(){
  const kr=kasList("kasRT")[0],ki=kasList("kasIbu")[0],pw=piuList("warga")[0],pi=piuList("ibu")[0],s=S.set,ib=s.iuranBaru||{};
  const tabs=[["kas","Kas Bapak-Bapak"],["ibu","Kas ibu-ibu"],["piutang","Piutang"],["ver","Catatan verifikasi"]];
  return `<div class="row" style="margin-bottom:10px"><div><h2>Keuangan</h2><p class="muted small">Iuran bulanan ${rp(iuranTotal(s.iuran))}${ib.total?`, menjadi ${rp(ib.total)} mulai ${perLabel(ib.mulai)}`:""}</p></div>${S.admin?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="addKas">+ Laporan kas bulan baru</button><button class="btn" id="addPiu">+ Perbarui piutang</button></div>`:""}</div>
  ${dataSementara()?`<div class="banner"><b>Data sementara.</b> Kas Bapak-Bapak tercatat sampai ${kr?perLabel(kr.periode):"-"}, kas ibu-ibu sampai ${ki?perLabel(ki.periode):"-"}, piutang sampai ${pw?perLabel(pw.periode):"-"}. Perbarui dengan data terbaru dari bendahara sebelum dipakai untuk menagih.</div>`:""}
  <div class="grid g4" style="margin-bottom:14px"><div class="card stat"><b>${kr?rp(kr.saldoAkhir):"-"}</b><span>Saldo kas Bapak-Bapak${kr?" ("+perLabel(kr.periode)+")":""}</span></div><div class="card stat"><b>${ki?rp(ki.saldoAkhir):"-"}</b><span>Saldo kas ibu-ibu${ki?" ("+perLabel(ki.periode)+")":""}</span></div><div class="card stat"><b>${pw?rp(pw.total):"-"}</b><span>Piutang warga, ${pw?pw.items.length:0} KK</span></div><div class="card stat"><b>${pi?rp(pi.total):"-"}</b><span>Piutang ibu-ibu, ${pi?pi.items.length:0} orang</span></div></div>
  <div class="chips">${tabs.map(t=>`<button class="chipb" data-kt="${t[0]}" aria-pressed="${S.kTab===t[0]}">${t[1]}</button>`).join("")}</div>`+({kas:()=>kasView("kasRT"),ibu:()=>kasView("kasIbu"),piutang:piutangView,ver:verView}[S.kTab])();
}
function kasView(j){
  const l=kasList(j);if(!l.length)return `<div class="card empty">Belum ada laporan kas.</div>`;
  const mx=Math.max(...l.map(k=>k.saldoAkhir||0));
  return `<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:10px">Saldo akhir per periode</h3><div class="grid" style="gap:8px">${l.slice().reverse().map(k=>`<div style="display:grid;grid-template-columns:110px 1fr 110px;gap:10px;align-items:center;font-size:.85rem"><span class="muted">${perLabel(k.periode)}</span><span style="background:var(--accent-soft);border-radius:4px;height:14px;display:block"><span style="display:block;height:100%;border-radius:4px;background:var(--accent);width:${mx?Math.round(k.saldoAkhir/mx*100):0}%"></span></span><b class="num" style="text-align:right">${rp(k.saldoAkhir)}</b></div>`).join("")}</div></div>
  <div class="grid">${l.map(k=>`<details class="card"${k===l[0]?" open":""}><summary style="cursor:pointer;font-weight:600">${esc(k.judul)} ${k.sementara?'<span class="pill p-warn">sementara</span>':""}</summary>
   <dl class="kv" style="margin-top:12px;grid-template-columns:1fr auto"><dt>Saldo awal</dt><dd class="num">${rp(k.saldoAwal)}</dd><dt>Setoran wajib (${(k.setoranWajib||[]).length||"-"} setoran)</dt><dd class="num">${rp(k.totalWajib)}</dd><dt>Setoran piutang</dt><dd class="num">${rp(k.totalPiutang)}</dd>${(k.pengeluaran||[]).map(p=>`<dt>Keluar: ${esc(p.ket)}</dt><dd class="num">- ${rp(p.jumlah)}</dd>`).join("")}<dt><b>Saldo akhir</b></dt><dd class="num"><b>${rp(k.saldoAkhir)}</b></dd></dl>
   ${(k.setoranWajib||[]).length?`<details style="margin-top:10px"><summary class="small" style="cursor:pointer;color:var(--accent);font-weight:600">Daftar setoran</summary><div class="scroll"><table class="tbl"><tbody>${k.setoranWajib.map(s=>`<tr><td>${esc(s.nama)}</td><td class="num">${rp(s.jumlah)}</td><td class="small muted">${esc(s.ket||"")}</td></tr>`).join("")}${(k.setoranPiutang||[]).map(s=>`<tr><td>${esc(s.nama)} <span class="pill p-gold">piutang</span></td><td class="num">${rp(s.jumlah)}</td><td></td></tr>`).join("")}</tbody></table></div></details>`:""}</details>`).join("")}</div>`;
}
function piutangView(){
  return ["warga","ibu"].map(j=>{const l=piuList(j),cur=l[0];if(!cur)return "";const prev=l[1];
    const lunas=prev?prev.items.filter(p=>!cur.items.some(c=>(c.kkId&&c.kkId===p.kkId)||c.nama===p.nama)):[];
    return `<div class="card" style="margin-bottom:14px"><div class="row"><h3>Piutang ${j==="warga"?"warga RT":"kas ibu-ibu"} ${cur.sementara?'<span class="pill p-warn">sementara</span>':""}</h3><span class="small muted">${perLabel(cur.periode)} · total <b class="num">${rp(cur.total)}</b></span></div>
    <div class="scroll"><table class="tbl"><thead><tr><th>Nama</th><th>Keluarga</th><th class="r">Jumlah</th><th>Perubahan</th><th>Keterangan</th></tr></thead><tbody>${cur.items.map((it,i)=>{const f=S.kel.find(x=>x.id===it.kkId);const pv=prev&&prev.items.find(p=>(it.kkId&&p.kkId===it.kkId)||p.nama===it.nama);const dlt=pv?it.jumlah-pv.jumlah:null;
     return `<tr><td><b>${esc(it.nama)}</b></td><td class="small">${f?esc(f.kepala):`<span class="pill p-warn">belum ditautkan</span>`} ${S.admin?`<button class="btn sm" data-link="${esc(cur.id)}|${i}">Tautkan</button>`:""}</td><td class="num" style="text-align:right">${rp(it.jumlah)}</td><td class="small">${dlt==null?'<span class="pill p-gold">baru</span>':dlt<0?`<span class="pill p-good">turun ${rp(-dlt)}</span>`:dlt>0?`<span class="pill p-bad">naik ${rp(dlt)}</span>`:`<span class="pill p-mute">tetap</span>`}</td><td class="small muted" style="min-width:220px">${esc(it.keterangan||"")}</td></tr>`}).join("")}</tbody></table></div>
    ${lunas.length?`<p class="small" style="margin-top:10px"><span class="pill p-good">Lunas sejak ${perLabel(prev.periode)}</span> ${lunas.map(x=>esc(x.nama)).join(", ")}</p>`:""}</div>`}).join("")||`<div class="card empty">Belum ada data piutang.</div>`;
}
function verView(){const it=(S.ver||[]);return `<div class="card"><h3>Catatan verifikasi data</h3><p class="small muted" style="margin:6px 0 10px">Hal yang ditemukan saat data diimpor dan perlu dicek bendahara.</p><ol style="margin:0;padding-left:20px;display:grid;gap:8px">${it.map(v=>`<li><b class="small">${esc(v.sumber)}</b><p class="small">${esc(v.ket)}</p></li>`).join("")||"<li>Tidak ada catatan.</li>"}</ol></div>`}
function parseLines(t){return String(t).split("\n").map(l=>l.trim()).filter(Boolean)}
function kasForm(){
  openForm({title:"Laporan kas bulan baru",wide:true,fields:[
   {id:"jenis",label:"Jenis kas",type:"select",options:["Kas Bapak-Bapak","Kas ibu-ibu"],half:true},{id:"periode",label:"Periode (bulan)",type:"month",value:iso(new Date()).slice(0,7),half:true},
   {id:"judul",label:"Judul laporan",ph:"Contoh: Kas RT 20 Jan - 20 Feb 2026"},{id:"setoran",label:"Setoran wajib (satu baris per orang)",type:"textarea",rows:5,ph:"Nama = jumlah = keterangan\nSutrisno = 30000 = Iuran Januari",hint:"Boleh dikosongkan bila hanya mengisi total di bawah."},
   {id:"totWajib",label:"Total setoran wajib (jika daftar kosong)",inputmode:"numeric",half:true},{id:"totPiutang",label:"Total setoran piutang",inputmode:"numeric",half:true},
   {id:"keluar",label:"Pengeluaran (satu baris per item)",type:"textarea",rows:3,ph:"Konsumsi pertemuan = 150000"},{id:"awal",label:"Saldo awal (kosong = saldo akhir laporan sebelumnya)",inputmode:"numeric"}],
   save:async v=>{const j=v.jenis.startsWith("Kas Bapak")?"kasRT":"kasIbu";if(!v.periode)return{error:"Periode wajib diisi."};
    const sw=parseLines(v.setoran).map(l=>{const p=l.split("=").map(x=>x.trim());return {nama:p[0],jumlah:parseInt(digits(p[1]))||0,ket:p[2]||""}}),kl=parseLines(v.keluar).map(l=>{const p=l.split("=").map(x=>x.trim());return {ket:p[0],jumlah:parseInt(digits(p[1]))||0}});
    const prev=kasList(j).find(k=>k.periode<v.periode),awal=v.awal!==""?parseInt(digits(v.awal))||0:(prev?prev.saldoAkhir:0),tw=sw.length?sw.reduce((s,x)=>s+x.jumlah,0):parseInt(digits(v.totWajib))||0,tp=parseInt(digits(v.totPiutang))||0,tk=kl.reduce((s,x)=>s+x.jumlah,0);
    const id=(j==="kasRT"?"kas-rt-":"kas-ibu-")+v.periode,o={jenis:j,periode:v.periode,judul:v.judul||(j==="kasRT"?"Kas Bapak-Bapak ":"Kas ibu-ibu ")+perLabel(v.periode),setoranWajib:sw,setoranPiutang:[],pengeluaran:kl,saldoAwal:awal,totalMasuk:tw+tp,totalKeluar:tk,saldoAkhir:awal+tw+tp-tk,totalWajib:tw,totalPiutang:tp,sementara:false};
    await put("kas/"+id,o);upsert(S.kas,{...o,id});S.kTab=j==="kasRT"?"kas":"ibu";render();toast("Laporan tersimpan. Saldo akhir "+rp(o.saldoAkhir))}})}
function matchKK(n){const t=toks(n.replace(/^ibu\s+/i,""));if(!t.size)return "";let best=null,bs=0;S.kel.forEach(f=>{const c=toks(f.kepala+" "+(f.anggota||[]).map(a=>a.nama).join(" "));let sc=0;t.forEach(w=>{if(c.has(w))sc++});if(sc>bs){bs=sc;best=f}});return bs>=1?best.id:""}
function toks(s){return new Set((String(s).toLowerCase().match(/[a-z]{3,}/g)||[]).filter(w=>!["ibu","bapak","bpk","hej","hery"].includes(w)))}
function piuForm(){
  openForm({title:"Perbarui piutang",wide:true,fields:[{id:"jenis",label:"Jenis",type:"select",options:["Piutang warga RT","Piutang kas ibu-ibu"],half:true},{id:"periode",label:"Per bulan",type:"month",value:iso(new Date()).slice(0,7),half:true},
   {id:"items",label:"Daftar piutang (satu baris per orang)",type:"textarea",rows:8,ph:"Nama | jumlah | keterangan\nEdy Maryanto | 90000 | Tunggakan s.d November Rp150.000, bayar Desember",hint:"Nama akan ditautkan otomatis ke data warga bila cocok; yang belum cocok bisa ditautkan manual."}],
   save:async v=>{const j=v.jenis.includes("warga")?"warga":"ibu";const items=parseLines(v.items).map(l=>{const p=l.split("|").map(x=>x.trim());return {nama:p[0],jumlah:parseInt(digits(p[1]))||0,keterangan:p[2]||"",kkId:matchKK(p[0])}}).filter(x=>x.nama&&x.jumlah>0);if(!items.length)return{error:"Isi minimal satu baris dengan jumlah lebih dari 0."};
    const o={jenis:j,periode:v.periode,judul:"Piutang "+(j==="warga"?"warga RT":"kas ibu-ibu")+" s.d "+perLabel(v.periode),items,total:items.reduce((s,x)=>s+x.jumlah,0),sementara:false},id="piutang-"+j+"-"+v.periode;
    await put("piutang/"+id,o);upsert(S.piu,{...o,id});S.kTab="piutang";render();toast("Piutang diperbarui: "+rp(o.total))}})}
function linkForm(ref){
  const [id,i]=ref.split("|"),d=S.piu.find(x=>x.id===id),it=d.items[+i],ks=S.kel.filter(f=>f.aktif!==false).sort(byAlamat),lb=ks.map(f=>f.kepala+" - "+(f.alamat||"alamat kosong")),cur=ks.findIndex(f=>f.id===it.kkId);
  openForm({title:"Tautkan "+it.nama+" ke keluarga",fields:[{id:"kk",label:"Keluarga",type:"select",options:lb,value:cur>=0?lb[cur]:lb[0]}],save:async v=>{const k=ks[lb.indexOf(v.kk)],items=d.items.map((x,n)=>n===+i?{...x,kkId:k.id}:x),o={...d,items};delete o.id;await put("piutang/"+id,o);upsert(S.piu,{...o,id});render();toast("Tertaut")}})}

/* ---------- pengingat ---------- */
function remQueue(){
  const out=[];["warga","ibu"].forEach(j=>{const cur=piuList(j)[0];if(!cur)return;cur.items.forEach(it=>{if(!(it.jumlah>0))return;const f=S.kel.find(x=>x.id===it.kkId),key=j+":"+(it.kkId||it.nama),logs=S.rem.filter(r=>r.key===key).sort((a,b)=>b.tgl.localeCompare(a.tgl)),last=logs[0],max=+S.set.reminderMaks||3,gap=+S.set.reminderHari||7;
    let tahap=1,status="siap",info="";if(last){const days=Math.floor((new Date(iso(new Date())+"T00:00:00")-new Date(last.tgl+"T00:00:00"))/864e5);tahap=Math.min(last.tahap+1,max);if(last.tahap>=max){status="selesai";info="Sudah "+max+" kali, tindak lanjut oleh pengurus"}else if(days<gap){status="tunggu";info="Tunggu "+(gap-days)+" hari lagi (terakhir "+fmtTglS(last.tgl)+")"}else info="Terakhir tahap "+last.tahap+", "+fmtTglS(last.tgl)}
    const sapaan=/^ibu\b/i.test(it.nama)?it.nama:"Bapak/Ibu "+it.nama.replace(/^bp\.?\s*/i,"");
    const msg=fill2(S.set.tpl[Math.min(tahap,3)-1]||S.set.tpl[0],{sapaan,nama:it.nama,alamat:f&&f.alamat?"Hb "+f.alamat.replace("Hidup Baru ",""):"-",jenis:j==="warga"?"warga":"kas ibu-ibu",bulan_tunggak:"s.d "+perLabel(cur.periode),total:rp(it.jumlah),rincian:(it.keterangan||"-").replace(/\s+/g," ")});
    out.push({key,j,it,f,tahap,status,info,msg,hp:f?digits(f.hp):"",per:cur.periode,sementara:cur.sementara})})});return out}
const fill2=(t,m)=>t.replace(/\{(\w+)\}/g,(x,k)=>m[k]!=null?m[k]:x);
function waLink(hp,msg){let n=digits(hp);if(!n)return "";if(n.startsWith("0"))n="62"+n.slice(1);return "https://wa.me/"+n+"?text="+encodeURIComponent(msg)}
function vReminder(){
  const q=remQueue(),ready=q.filter(x=>x.status==="siap").length,sem=q.some(x=>x.sementara);
  return `<div class="row" style="margin-bottom:10px"><div><h2>Pengingat pembayaran</h2><p class="muted small">Jadwal: pengingat 1, lalu tiap ${S.set.reminderHari||7} hari sampai tahap ${S.set.reminderMaks||3}. Isi pesan diambil dari template di Pengaturan.</p></div><button class="btn" id="copyAll" ${ready&&S.izinKirim?"":"disabled"}>Salin semua pesan siap kirim (${ready})</button></div>
  ${sem?`<div class="banner"><b>Data piutang masih sementara</b> (per ${q.length?perLabel(q[0].per):"-"}). Perbarui data di menu Keuangan lebih dulu agar warga tidak ditagih nominal yang sudah usang. Tombol kirim terkunci sampai Anda mencentang di bawah.</div>
  <label class="chk" style="margin-bottom:14px"><input type="checkbox" id="izin" ${S.izinKirim?"checked":""}> Saya sudah memeriksa bahwa nominal di bawah masih berlaku</label>`:""}
  <div class="grid">${q.map((x,i)=>{const ok=!sem||S.izinKirim,wa=waLink(x.hp,x.msg);return `<div class="card"><div class="row"><div><b>${esc(x.it.nama)}</b> <span class="pill ${x.j==="warga"?"p-gold":"p-mute"}">${x.j==="warga"?"warga RT":"kas ibu-ibu"}</span><p class="small muted">${x.f?esc(x.f.kepala)+" · "+esc(x.f.alamat||"-"):"Belum ditautkan ke keluarga"} · ${x.hp?esc(x.hp):"HP belum ada"}</p></div><div style="text-align:right"><b class="num">${rp(x.it.jumlah)}</b><p><span class="pill ${x.status==="siap"?"p-warn":x.status==="selesai"?"p-bad":"p-mute"}">${x.status==="siap"?"Siap tahap "+x.tahap:x.status==="selesai"?"Selesai":"Tahap "+x.tahap+" menunggu"}</span></p></div></div>
   ${x.info?`<p class="small muted" style="margin-top:6px">${esc(x.info)}</p>`:""}<details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:var(--accent);font-weight:600">Lihat pesan</summary><div class="wa">${esc(x.msg)}</div></details>
   <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" data-rcopy="${i}">Salin pesan</button>${wa&&x.status==="siap"&&ok?`<a class="btn sm pri" style="text-decoration:none;display:inline-flex;align-items:center" target="_blank" rel="noopener" href="${wa}">Buka WhatsApp</a>`:`<button class="btn sm" disabled>${!x.hp?"HP belum ada":x.status!=="siap"?"Belum waktunya":"Terkunci"}</button>`}<button class="btn sm" data-rsent="${i}" ${x.status==="siap"&&ok?"":"disabled"}>Tandai terkirim</button></div></div>`}).join("")||`<div class="card empty">Tidak ada piutang yang perlu diingatkan.</div>`}</div>
  <h3 class="sect">Riwayat pengingat</h3><div class="card scroll" style="padding:6px">${S.rem.length?`<table class="tbl"><tbody>${S.rem.slice().sort((a,b)=>b.tgl.localeCompare(a.tgl)).slice(0,30).map(r=>`<tr><td>${fmtTglS(r.tgl)}</td><td>${esc(r.nama)}</td><td>Tahap ${r.tahap}</td><td class="small muted">${esc(r.via||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="empty">Belum ada pengingat yang dicatat terkirim.</div>`}</div>
  <p class="hint" style="margin-top:8px">Pesan dikirim lewat WhatsApp oleh pengurus. Pengiriman otomatis tanpa klik memerlukan server tersendiri (disiapkan saat penayangan untuk warga).</p>`}

/* ---------- sosial & qurban ---------- */
const SOSKAT={yatim:"Anak yatim",dhuafa:"Dhuafa & mustahiq",wakaf:"Infaq & wakaf MBM",infaq:"Infaq & wakaf MBM"};
function vSosial(){
  const tabs=[["qurban","Qurban 2027"],["yatim","Anak yatim"],["dhuafa","Dhuafa & mustahiq"],["wakaf","Infaq & wakaf"]];
  return `<div class="row" style="margin-bottom:10px"><div><h2>Sosial & qurban</h2><p class="muted small">Pendataan penerima untuk qurban 2027. Data ini sensitif, hanya terlihat oleh pengurus.</p></div></div>
  <div class="chips">${tabs.map(t=>`<button class="chipb" data-st="${t[0]}" aria-pressed="${S.sTab===t[0]}">${t[1]}</button>`).join("")}</div>`+(S.sTab==="qurban"?qurbanView():sosList(S.sTab))}
function sosList(k){
  const l=S.sos.filter(x=>k==="wakaf"?(x.kategori==="wakaf"||x.kategori==="infaq"):x.kategori===k).sort((a,b)=>SUB(a.alamat||"~",b.alamat||"~")),kat=k==="wakaf"?"wakaf":k;
  return `<div class="row" style="margin-bottom:10px"><p class="muted small">${l.length} data</p><button class="btn pri sm" data-sadd="${kat}">+ Tambah</button></div><div class="card scroll" style="padding:6px"><table class="tbl"><thead><tr><th>Nama</th><th>Alamat</th><th>Keterangan</th><th></th></tr></thead><tbody>${l.map(x=>`<tr><td><b>${esc(x.nama)}</b>${x.tglLahir?`<p class="small muted">Lahir ${fmtTglS(x.tglLahir)}</p>`:""}${x.perluTinjau?' <span class="pill p-warn">perlu ditinjau</span>':""}</td><td class="small">${esc(x.alamat||"-")}</td><td class="small" style="min-width:200px">${esc(x.ket||"")}${x.tahun?`<p class="muted">Tercatat: ${esc(x.tahun)}</p>`:""}<p class="hint">${esc(x.sumber||"")}</p></td><td style="white-space:nowrap"><button class="btn sm" data-sedit="${esc(x.id)}">Ubah</button> <button class="btn sm bad" data-sdel="${esc(x.id)}">Hapus</button></td></tr>`).join("")||`<tr><td colspan="4" class="empty">Belum ada data.</td></tr>`}</tbody></table></div>`}
function sosForm(x,kat){
  openForm({title:x?"Ubah data":"Tambah data",fields:[{id:"nama",label:"Nama",value:x?.nama},{id:"alamat",label:"Alamat",value:x?.alamat,list:"alamatList",half:true},{id:"tglLahir",label:"Tanggal lahir (bila anak yatim)",type:"date",value:x?.tglLahir,half:true},{id:"ket",label:"Keterangan",value:x?.ket},{id:"tahun",label:"Tahun tercatat",value:x?.tahun,half:true},{id:"sumber",label:"Sumber",value:x?.sumber,half:true}],
   save:async v=>{if(!v.nama)return{error:"Nama wajib diisi."};const id=x?.id||"s-"+Date.now(),o={...(x||{}),...v,kategori:x?.kategori||kat};delete o.id;await put("sosial/"+id,o);upsert(S.sos,{...o,id});render();toast("Tersimpan")}})}
function katOf(f){const k=new Set();S.sos.forEach(x=>{if(x.kkId===f.id)k.add(x.kategori)});return k}
function qurbanView(){
  const q=S.qur||{penerima:{},pequrban:[]},pn=q.penerima||{},ks=S.kel.filter(f=>f.aktif!==false).sort(byAlamat);
  const ikut=f=>pn[f.id]?pn[f.id].ikut!==false:f.hunian!=="Kontrak",bag=f=>pn[f.id]&&pn[f.id].bagian!=null?pn[f.id].bagian:1;
  const tot=ks.filter(ikut).length,tb=ks.filter(ikut).reduce((s,f)=>s+(+bag(f)||0),0),lepas=S.sos.filter(x=>(x.kategori==="yatim"||x.kategori==="dhuafa")&&!x.kkId);
  return `<div class="grid g4" style="margin-bottom:14px"><div class="card stat"><b>${tot}</b><span>KK penerima</span></div><div class="card stat"><b>${tb}</b><span>Total bagian</span></div><div class="card stat"><b>${S.sos.filter(x=>x.kategori==="yatim").length}</b><span>Anak yatim</span></div><div class="card stat"><b>${S.sos.filter(x=>x.kategori==="dhuafa").length}</b><span>Dhuafa / mustahiq</span></div></div>
  <p class="small muted" style="margin-bottom:10px">${esc(q.catatan||"")} Kontrak tidak ikut secara bawaan; ubah sesuai kesepakatan.</p>
  ${lepas.length?`<div class="banner">Penerima prioritas yang belum ditautkan ke KK: ${lepas.map(x=>esc(x.nama)+" ("+esc(x.alamat||"-")+")").join(", ")}. Tambahkan alamatnya agar muncul di tabel, atau pastikan ada di data warga.</div>`:""}
  <div class="card scroll" style="padding:6px"><table class="tbl"><thead><tr><th>Ikut</th><th>Keluarga</th><th>Alamat</th><th>Prioritas</th><th>Bagian</th></tr></thead><tbody>${ks.map(f=>{const k=katOf(f);return `<tr><td><input type="checkbox" style="width:auto;min-height:0" aria-label="Ikut ${esc(f.kepala)}" data-qik="${esc(f.id)}" ${ikut(f)?"checked":""}></td><td><b>${esc(f.kepala)}</b> <span class="pill ${f.hunian==="Tetap"?"p-good":"p-warn"}">${esc(f.hunian||"-")}</span></td><td class="small">${esc(f.alamat||"-")}</td><td>${[...k].map(c=>`<span class="pill p-gold">${c==="yatim"?"Yatim":c==="dhuafa"?"Dhuafa":"Wakaf"}</span>`).join(" ")}</td><td><input type="number" min="0" style="width:72px" value="${bag(f)}" aria-label="Bagian ${esc(f.kepala)}" data-qbg="${esc(f.id)}"></td></tr>`}).join("")}</tbody></table></div>
  <h3 class="sect">Calon pequrban</h3><div class="card"><div class="row"><p class="small muted">${(q.pequrban||[]).length?"":"Belum ada yang mendaftar."}</p><button class="btn sm pri" id="addPq">+ Tambah pequrban</button></div>${(q.pequrban||[]).length?`<table class="tbl"><tbody>${q.pequrban.map((p,i)=>`<tr><td><b>${esc(p.nama)}</b></td><td>${esc(p.hewan)}</td><td class="small muted">${esc(p.ket||"")}</td><td><button class="btn sm bad" data-pqd="${i}">Hapus</button></td></tr>`).join("")}</tbody></table>`:""}</div>`}
async function qWrite(patch){try{if(!S.qur)S.qur={tahun:2027,penerima:{},pequrban:[]};await S.db.doc("qurban/2027").update(patch)}catch(e){toast("Gagal menyimpan ("+(e&&e.code||"error")+")")}}

/* ---------- pengaturan tanda tangan ---------- */
function ttdForm(){
  modal(`<h3>Tanda tangan Ketua RT</h3><p class="small muted" style="margin:8px 0">Unggah gambar tanda tangan (PNG berlatar transparan paling baik). Gambar dikecilkan otomatis dan hanya tampil di surat yang sudah disetujui.</p>
  <div class="field"><input type="file" id="ttdf" accept="image/png,image/jpeg" aria-label="Berkas tanda tangan"></div>${S.ttd?`<div class="field"><p class="small muted">Saat ini:</p><img src="${S.ttd.data}" alt="Tanda tangan" style="height:60px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:4px"></div>`:""}
  <p class="err" id="merr"></p><div class="mact">${S.ttd?`<button class="btn bad" id="ttdx">Hapus</button>`:""}<button class="btn" id="mc">Tutup</button></div>`);
  $("#mc").onclick=closeM;const x=$("#ttdx");if(x)x.onclick=async()=>{try{await del("rahasia/ttd");S.ttd=null;closeM();render()}catch(e){$("#merr").textContent=e.message}};
  $("#ttdf").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=async()=>{const sc=Math.min(1,360/im.width),c=document.createElement("canvas");c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);c.getContext("2d").drawImage(im,0,0,c.width,c.height);const data=c.toDataURL("image/png");try{await put("rahasia/ttd",{data,ratio:c.width/c.height});S.ttd={data,ratio:c.width/c.height};closeM();render();toast("Tanda tangan tersimpan")}catch(er){$("#merr").textContent=er.message}};im.onerror=()=>{$("#merr").textContent="Berkas bukan gambar yang valid."};im.src=r.result};r.readAsDataURL(f)}}

/* ---------- event tahap 3-4 ---------- */
function bind2(){
  const on=(s,ev,fn)=>document.querySelectorAll(s).forEach(e=>e.addEventListener(ev,fn));
  on("#addSurat","click",()=>suratForm(null));on("[data-surat]","click",e=>openSurat(e.currentTarget.dataset.surat));on("[data-surat]","keydown",e=>{if(e.key==="Enter")openSurat(e.currentTarget.dataset.surat)});
  on("#qs","input",e=>{S.q=e.target.value;const p=e.target.selectionStart;render();const q=$("#qs");q.focus();q.setSelectionRange(p,p)});
  on("[data-kt]","click",e=>{S.kTab=e.currentTarget.dataset.kt;render()});on("#addKas","click",kasForm);on("#addPiu","click",piuForm);on("[data-link]","click",e=>linkForm(e.currentTarget.dataset.link));
  on("#izin","change",e=>{S.izinKirim=e.target.checked;render()});
  on("[data-rcopy]","click",e=>{const x=remQueue()[+e.currentTarget.dataset.rcopy];(navigator.clipboard?navigator.clipboard.writeText(x.msg):Promise.reject()).then(()=>toast("Pesan disalin")).catch(()=>toast("Salin manual dari kotak pesan"))});
  on("[data-rsent]","click",async e=>{const x=remQueue()[+e.currentTarget.dataset.rsent],id="r-"+Date.now(),o={key:x.key,nama:x.it.nama,tahap:x.tahap,tgl:iso(new Date()),via:"WhatsApp",jenis:x.j};try{await put("reminder/"+id,o);upsert(S.rem,{...o,id});render();toast("Dicatat terkirim, tahap "+x.tahap)}catch(er){toast(er.message)}});
  on("#copyAll","click",()=>{const t=remQueue().filter(x=>x.status==="siap").map(x=>"Kepada: "+x.it.nama+(x.hp?" ("+x.hp+")":"")+"\n"+x.msg).join("\n\n-----\n\n");(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast("Semua pesan disalin")).catch(()=>toast("Gagal menyalin"))});
  on("[data-st]","click",e=>{S.sTab=e.currentTarget.dataset.st;render()});on("[data-sadd]","click",e=>sosForm(null,e.currentTarget.dataset.sadd));on("[data-sedit]","click",e=>sosForm(S.sos.find(x=>x.id===e.currentTarget.dataset.sedit)));
  on("[data-sdel]","click",e=>{const id=e.currentTarget.dataset.sdel;confirmM("Hapus data ini?",async()=>{await del("sosial/"+id);S.sos=S.sos.filter(x=>x.id!==id);render()},"Hapus")});
  on("[data-qik]","change",async e=>{const id=e.target.dataset.qik,cur=(S.qur&&S.qur.penerima&&S.qur.penerima[id])||{};const n={ikut:e.target.checked,bagian:cur.bagian!=null?cur.bagian:1};S.qur=S.qur||{penerima:{},pequrban:[]};S.qur.penerima={...S.qur.penerima,[id]:n};await qWrite({penerima:{[id]:n}});render()});
  on("[data-qbg]","change",async e=>{const id=e.target.dataset.qbg,k=S.kel.find(f=>f.id===id),cur=(S.qur&&S.qur.penerima&&S.qur.penerima[id])||{ikut:k.hunian!=="Kontrak"};const n={ikut:cur.ikut!==false,bagian:Math.max(0,parseInt(e.target.value)||0)};S.qur=S.qur||{penerima:{},pequrban:[]};S.qur.penerima={...S.qur.penerima,[id]:n};await qWrite({penerima:{[id]:n}});render()});
  on("#addPq","click",()=>openForm({title:"Tambah calon pequrban",fields:[{id:"nama",label:"Nama"},{id:"hewan",label:"Hewan",type:"select",options:["Kambing","Domba","Sapi (1 bagian dari 7)","Sapi (satu ekor)"],half:true},{id:"ket",label:"Keterangan",half:true}],save:async v=>{if(!v.nama)return{error:"Nama wajib diisi."};const l=[...((S.qur&&S.qur.pequrban)||[]),v];await qWrite({pequrban:l});S.qur={...(S.qur||{}),pequrban:l};render()}}));
  on("[data-pqd]","click",async e=>{const l=((S.qur&&S.qur.pequrban)||[]).filter((_,i)=>i!==+e.currentTarget.dataset.pqd);await qWrite({pequrban:l});S.qur={...S.qur,pequrban:l};render()});
  on("#ttdBtn","click",ttdForm);
}


const ICO={foto:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 16l-5-5-8 8"/>',beranda:'<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',warga:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2 .6 3 2.3 3 6"/>',surat:'<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7"/>',keuangan:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',reminder:'<path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4"/>',sosial:'<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.600-7 10-7 10z"/>',kegiatan:'<path d="M4 5h16v14H4zM8 9h8M8 13h8M8 16h4"/>',pertemuan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',pengaturan:'<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 00.3 1.800l.1.1a2 2 0 11-2.800 2.800l-.1-.1a1.700 1.700 0 00-1.800-.3 1.700 1.700 0 00-1 1.500V21a2 2 0 11-4 0v-.1a1.700 1.700 0 00-1.100-1.500 1.700 1.700 0 00-1.800.3l-.1.100a2 2 0 11-2.800-2.800l.1-.1a1.700 1.700 0 00.3-1.800 1.700 1.700 0 00-1.500-1H3a2 2 0 110-4h.1a1.700 1.700 0 001.500-1.100 1.700 1.700 0 00-.3-1.800l-.1-.1a2 2 0 112.800-2.800l.1.100a1.700 1.700 0 001.800.3H9a1.700 1.700 0 001-1.500V3a2 2 0 114 0v.1a1.700 1.700 0 001 1.500 1.700 1.700 0 001.800-.3l.1-.1a2 2 0 112.800 2.800l-.1.100a1.700 1.700 0 00-.3 1.800V9a1.700 1.700 0 001.500 1H21a2 2 0 110 4h-.1a1.700 1.700 0 00-1.500 1z"/>',cari:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',plus:'<path d="M12 5v14M5 12h14"/>',qurban:'<path d="M4 20h16M6 20V10l6-6 6 6v10"/>'};
const ic=n=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[n]||""}</svg>`;
const tabBadge=id=>id==="surat"?(S.surat||[]).filter(x=>x.status==="menunggu").length:id==="reminder"?(S.admin&&S.piu&&S.piu.length?remQueue().filter(x=>x.status==="siap").length:0):0;
const bdgH=id=>{const n=tabBadge(id);return n?`<span class="bdg" aria-label="${n} perlu perhatian">${n}</span>`:""};
function shellHtml(tabs,content){
  const lk=(t,cls)=>`<a href="#${t[0]}" ${S.tab===t[0]?'aria-current="page"':""}>${ic(t[0])}<span>${t[1]}</span>${bdgH(t[0])}</a>`;
  const main=tabs.slice(0,S.admin?4:3),more=tabs.slice(main.length);
  return `<div class="shell"><aside class="side" aria-label="Menu utama"><div class="brand"><img class="logo" src="${LOGO}" alt="Logo RT 09"><div><b>${esc(S.set.namaRT)} / ${esc(S.set.rw)}</b><span>Kel. ${esc(S.set.kelurahan)}</span></div></div>
   ${S.admin?`<button class="sbtn" id="sbtn" aria-label="Cari">${ic("cari")}<span>Cari…</span><kbd>Ctrl K</kbd></button>`:""}
   <nav class="snav">${tabs.map(t=>lk(t)).join("")}</nav>${albumA("alb",1)}<span class="pill ${S.admin?"p-gold":"p-mute"}" style="align-self:flex-start">${S.admin?"Pengurus (bisa mengubah)":"Hanya lihat"}</span></aside>
  <main class="mn ${S.anim?"anim":""}" id="mn"><div class="mtop"><div class="brand"><img class="logo" src="${LOGO}" alt="Logo RT 09"><div><b>${esc(S.set.namaRT)} / ${esc(S.set.rw)}</b><span>${S.admin?"Pengurus":"Hanya lihat"}</span></div></div><span style="display:flex;gap:8px">${S.set.albumUrl&&albumOk(S.set.albumUrl)?`<a class="ib" href="${esc(S.set.albumUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Album foto">${ic("foto")}</a>`:""}${S.admin?`<button class="ib" id="sbtn2" aria-label="Cari">${ic("cari")}</button>`:""}</span></div>${content}</main></div>
  <nav class="bnav" aria-label="Menu bawah">${main.map(t=>lk(t)).join("")}${more.length?`<button id="menuBtn" aria-label="Menu lainnya">${ic("menu")}<span>Menu</span>${more.some(t=>tabBadge(t[0]))?'<span class="bdg">!</span>':""}</button>`:""}</nav>`}
function openMenu(){const tabs=TABS.filter(t=>!t[2]||S.admin);modal(`<div class="row"><h3>Menu</h3><button class="btn sm" id="mc">Tutup</button></div><div class="mgrid">${tabs.map(t=>`<a href="#${t[0]}" ${S.tab===t[0]?'aria-current="page"':""}>${ic(t[0])}<span>${t[1]}</span>${bdgH(t[0])}</a>`).join("")}${albumA("",1)}</div>`);$("#mc").onclick=closeM;document.querySelectorAll(".mgrid a").forEach(a=>a.addEventListener("click",()=>setTimeout(closeM,0)))}
function openSearch(){
  if(!S.admin)return;modal(`<h3>Cari</h3><input id="gs" type="search" placeholder="Nama warga, alamat, nomor surat" autocomplete="off" aria-label="Cari" style="margin-top:10px"><div class="sres" id="gsr"><p class="empty small">Ketik minimal 2 huruf.</p></div><div class="mact"><button class="btn" id="mc">Tutup</button></div>`);
  $("#mc").onclick=closeM;const gs=$("#gs");gs.focus();
  gs.oninput=()=>{const q=gs.value.trim().toLowerCase();if(q.length<2){$("#gsr").innerHTML='<p class="empty small">Ketik minimal 2 huruf.</p>';return}
   const w=S.kel.filter(f=>(f.kepala+" "+f.alamat+" "+(f.anggota||[]).map(a=>a.nama).join(" ")).toLowerCase().includes(q)||digits(f.kk).includes(q)).slice(0,8),
   su=(S.surat||[]).filter(x=>(x.nama+" "+(x.nomor||"")+" "+x.jenis).toLowerCase().includes(q)).slice(0,6);
   $("#gsr").innerHTML=(w.length?'<h5>Warga</h5>'+w.map(f=>`<button data-gk="${esc(f.id)}"><b>${esc(f.kepala)}</b><small>${esc(f.alamat||"alamat kosong")} · ${jiwa(f).length} jiwa</small></button>`).join(""):"")+(su.length?'<h5>Surat</h5>'+su.map(x=>`<button data-gs="${esc(x.id)}"><b>${esc(x.nama)}</b><small>${esc(x.jenis)} · ${esc(x.nomor||"menunggu")}</small></button>`).join(""):"")||'<p class="empty small">Tidak ditemukan.</p>';
   document.querySelectorAll("[data-gk]").forEach(b=>b.onclick=()=>{closeM();openKK(b.dataset.gk)});document.querySelectorAll("[data-gs]").forEach(b=>b.onclick=()=>{closeM();openSurat(b.dataset.gs)})}}
function stackTables(){document.querySelectorAll("table.tbl").forEach(t=>{const h=[...t.querySelectorAll("thead th")].map(x=>x.textContent.trim());if(!h.length)return;t.classList.add("stack");t.querySelectorAll("tbody tr").forEach(r=>[...r.children].forEach((c,i)=>{c.dataset.label=h[i]||""}))})}
function attention(){
  if(!S.admin)return "";const it=[];const mn=(S.surat||[]).filter(x=>x.status==="menunggu").length,rm=S.piu&&S.piu.length?remQueue().filter(x=>x.status==="siap").length:0,lg=S.kel.filter(f=>f.aktif!==false&&!lengkap(f)).length;
  if(mn)it.push(`<a href="#surat">${ic("surat")}${mn} surat menunggu persetujuan Ketua RT</a>`);
  if(rm)it.push(`<a href="#reminder">${ic("reminder")}${rm} pengingat pembayaran siap dikirim</a>`);
  if(dataSementara())it.push(`<a href="#keuangan">${ic("keuangan")}Data kas dan piutang masih sementara, perlu diperbarui</a>`);
  if(lg)it.push(`<a href="#warga" data-filt="lengkap">${ic("warga")}${lg} KK datanya belum lengkap</a>`);
  return `<h3 class="sect">Perlu perhatian</h3><div class="att">${it.join("")||'<a class="ok" href="#warga">Semua beres. Tidak ada yang perlu ditindak.</a>'}</div>`}
function quick(){return S.admin?`<div class="qa"><button data-qa="surat">${ic("surat")}Buat surat</button><button data-qa="warga">${ic("plus")}Tambah warga</button><button data-qa="kas">${ic("keuangan")}Laporan kas</button><button data-qa="cari">${ic("cari")}Cari warga</button></div>`:""}
function bind3(){
  const on=(s,ev,fn)=>document.querySelectorAll(s).forEach(e=>e.addEventListener(ev,fn));
  on("#sbtn,#sbtn2","click",openSearch);on("#menuBtn","click",openMenu);
  on("[data-filt]","click",e=>{S.fHun=e.currentTarget.dataset.filt});
  on("[data-qa]","click",e=>{const a=e.currentTarget.dataset.qa;if(a==="surat"){S.tab="surat";location.hash="surat";render();suratForm(null)}else if(a==="warga")kkForm(null);else if(a==="kas"){S.tab="keuangan";location.hash="keuangan";render();kasForm()}else openSearch()});
  on("[data-editp]","click",e=>pertForm(S.pert.find(x=>x.id===e.currentTarget.dataset.editp)));
  const mv=(i,d)=>{const ids=hosts().map(h=>h.id);const j=i+d;if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];giliranSimpan(ids).catch(x=>toast(x.message))};
  on("[data-gup]","click",e=>mv(+e.currentTarget.dataset.gup,-1));on("[data-gdn]","click",e=>mv(+e.currentTarget.dataset.gdn,1));
  on("[data-gskip]","click",e=>giliranSkip(e.currentTarget.dataset.gskip,false).catch(x=>toast(x.message)));on("[data-gin]","click",e=>giliranSkip(e.currentTarget.dataset.gin,true).catch(x=>toast(x.message)));
  on("#gAdd","click",giliranTambah);on("#gReset","click",()=>giliranSimpan([]).catch(x=>toast(x.message)));
  stackTables()}
document.addEventListener("keydown",e=>{const t=e.target&&e.target.tagName;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openSearch()}else if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(t||"")&&S.admin){e.preventDefault();openSearch()}else if(e.key==="Escape"&&$("#modal").innerHTML)closeM()});


const PRESET={"Perunggu (bawaan)":{accent:"#6b4a1f",bg:"#f1efec"},"Hijau zaitun":{accent:"#2f5d3a",bg:"#eef1ec"},"Biru laut":{accent:"#1f4d7a",bg:"#edf1f5"},"Marun":{accent:"#7a2630",bg:"#f4eeee"},"Arang":{accent:"#383d45",bg:"#f0f0ef"},"Kustom":null};
const lumOf=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||"");if(!m)return 0;const v=[0,2,4].map(i=>parseInt(m[1].substr(i,2),16)/255).map(c=>c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]};
function applyTema(){
  const t=S.set.tema||{},p=t.preset==="Kustom"?t:(PRESET[t.preset]||null),fs={Kecil:13,Normal:14,Besar:16}[t.fs]||14;let css="";
  if(p&&t.preset!=="Perunggu (bawaan)"){const a=/^#[0-9a-f]{6}$/i.test(p.accent)?p.accent:"#6b4a1f",b=/^#[0-9a-f]{6}$/i.test(p.bg)?p.bg:"#f1efec",ink=lumOf(a)>.5?"#1a1208":"#ffffff";
   const dk=`--accent:color-mix(in srgb,${a} 55%,#fff);--accent-soft:color-mix(in srgb,${a} 28%,#15110d);--gold:color-mix(in srgb,${a} 60%,#fff);--accent-ink:#1a1208;`;
   css+=`:root:root{--accent:${a};--accent-ink:${ink};--accent-soft:color-mix(in srgb,${a} 13%,#fff);--gold:color-mix(in srgb,${a} 45%,#fff);--bg:${b};--chip:${b}}@media (prefers-color-scheme:dark){:root:root:not([data-theme="light"]){${dk}--chip:#efe8dc}}:root:root[data-theme="dark"]{${dk}--chip:#efe8dc}`}
  css+=`html body{font-size:${fs}px}`;
  let el=document.getElementById("tema");if(!el){el=document.createElement("style");el.id="tema";document.head.appendChild(el)}if(el.textContent!==css)el.textContent=css}
const albumOk=u=>/^https:\/\/[^\s]+$/i.test(u||"");
const albumA=(cls,ico)=>S.set.albumUrl&&albumOk(S.set.albumUrl)?`<a class="${cls}" href="${esc(S.set.albumUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Album foto (Google Drive, tab baru)">${ico?ic("foto"):""}<span>Album foto</span></a>`:"";
function albumCard(){const u=albumOk(S.set.albumUrl);return `<div class="card lift"><p class="muted small">Album foto kegiatan</p>${u?`<p style="margin:6px 0 10px">Dokumentasi pertemuan dan kegiatan warga tersimpan di Google Drive.</p><a class="btn pri sm" style="text-decoration:none;display:inline-flex;align-items:center" href="${esc(S.set.albumUrl)}" target="_blank" rel="noopener noreferrer">Buka album</a>`:`<p class="small muted" style="margin:6px 0 10px">Tautan album belum diisi.</p>${S.admin?`<button class="btn sm" data-set="album">Atur tautan</button>`:""}`}</div>`}

/* ---- event ---- */
function bind(){
  const on=(s,ev,fn)=>document.querySelectorAll(s).forEach(e=>e.addEventListener(ev,fn));
  on("[data-kk]","click",e=>openKK(e.currentTarget.dataset.kk));on("[data-kk]","keydown",e=>{if(e.key==="Enter")openKK(e.currentTarget.dataset.kk)});
  on("#q","input",e=>{S.q=e.target.value;const p=e.target.selectionStart;render();const q=$("#q");q.focus();q.setSelectionRange(p,p)});
  on("#fh","change",e=>{S.fHun=e.target.value;render()});on("#rev","click",()=>{S.reveal=!S.reveal;render()});
  on("#addKK","click",()=>kkForm(null));
  on("[data-ft]","click",e=>{S.fTipe=e.currentTarget.dataset.ft;render()});
  on("#addEv","click",()=>evForm(null,"berita"));on("#addNot","click",()=>evForm(null,"notulen"));
  on("[data-editev]","click",e=>evForm(S.keg.find(x=>x.id===e.currentTarget.dataset.editev)));
  on("[data-delev]","click",e=>{const id=e.currentTarget.dataset.delev;confirmM("Hapus catatan ini?",async()=>{await del("kegiatan/"+id);S.keg=S.keg.filter(x=>x.id!==id);render()},"Hapus")});
  on("#addPert","click",()=>pertForm());
  on("[data-cancelp]","click",e=>{const p=S.pert.find(x=>x.id===e.currentTarget.dataset.cancelp);confirmM("Batalkan pertemuan "+fmtTglS(p.tanggal)+"?",async()=>{const o={...p,status:"batal"};delete o.id;await put("pertemuan/"+p.id,o);upsert(S.pert,{...o,id:p.id});render()},"Batalkan")});
  on("[data-done]","click",e=>{const p=S.pert.find(x=>x.id===e.currentTarget.dataset.done);const o={...p,status:"selesai"};delete o.id;
    put("pertemuan/"+p.id,o).then(()=>{upsert(S.pert,{...o,id:p.id});render();evForm({tipe:"notulen",tanggal:p.tanggal,judul:"Notulen pertemuan warga "+fmtTglS(p.tanggal),tuanRumah:(p.tuanRumahNama||"")+(p.alamat?", "+p.alamat:"")},"notulen")}).catch(x=>toast(x.message))});
  on("[data-set]","click",e=>setForm(e.currentTarget.dataset.set));
  bind2();bind3();
}
function route(){const h=location.hash.slice(1);if(TABS.some(t=>t[0]===h)){if(S.tab!==h){S.anim=true;window.scrollTo(0,0);closeM()}S.tab=h}render()}
window.addEventListener("hashchange",route);

/* ---- mulai ---- */
(async()=>{
  render();
  try{const u=await window.claude?.use?.("user");S.admin=!!(u&&u.canEdit&&u.canEdit());S.owner=!!(u&&u.isOwner&&u.isOwner());try{S.dl=await window.claude?.use?.("downloads")}catch(e){S.dl=null}S.db=await window.claude?.use?.("db")}catch(e){S.db=null}
  route();if(!S.db)return;
  const timer=setTimeout(()=>{S.slow=true;render()},10000),got={};
  const sub=(name,fn)=>S.db.collection(name).onSnapshot(s=>{fn(s.docs.map(d=>({id:d.id,...d.data()})));got[name]=1;if(!s.metadata.fromCache){clearTimeout(timer);S.ready=true;S.slow=false}render()},e=>{S.errs[name]=e.code;clearTimeout(timer);render()});
  S.db.doc("pengaturan/rt").onSnapshot(s=>{if(s.exists)S.set={...DEF,...s.data(),jadwal:{...DEF.jadwal,...(s.data().jadwal||{})}};render()},()=>{});
  if(S.admin){sub("surat",a=>S.surat=a);sub("kas",a=>S.kas=a);sub("piutang",a=>S.piu=a);sub("reminder",a=>S.rem=a);sub("sosial",a=>S.sos=a);
    S.db.doc("verifikasi/data").onSnapshot(s=>{S.ver=s.exists?(s.data().items||[]):[];render()},()=>{});
    S.db.doc("qurban/2027").onSnapshot(s=>{S.qur=s.exists?s.data():null;render()},()=>{});
    S.db.doc("rahasia/ttd").onSnapshot(s=>{S.ttd=s.exists?s.data():null;render()},()=>{});}
  sub("keluarga",a=>S.kel=a);sub("kegiatan",a=>S.keg=a);sub("pertemuan",a=>S.pert=a);
})();
