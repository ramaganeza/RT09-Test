/* Jembatan: membuat window.claude.use("db" | "user" | "downloads") memakai Supabase,
   sehingga src/app.js berjalan tanpa diubah di luar Claude. BELUM DIUJI dengan proyek Supabase sungguhan. */
(function(){
  const C=window.RT_CONFIG||{};let sb=null,session=null,role="view";
  const ready=(async()=>{
    if(!window.supabase||!C.SUPABASE_URL||C.SUPABASE_URL.includes("GANTI"))return;
    sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);
    const r=await sb.auth.getSession();session=r.data.session;setRole();
    sb.auth.onAuthStateChange((_e,s)=>{session=s;setRole();location.reload()});
  })();
  function setRole(){const m=session&&session.user&&session.user.app_metadata;role=m&&m.rt_role?m.rt_role:(session?"interact":"view")}
  const split=p=>{const a=p.split("/");return {coll:a[0],id:a.slice(1).join("/")}};
  const merge=(a,b)=>{const o={...a};for(const k in b){o[k]=(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a&&typeof a[k]==="object"&&!Array.isArray(a[k]))?merge(a[k],b[k]):b[k]}return o};
  const snapDoc=r=>({id:r.id,data:()=>r.data});
  async function list(coll){const {data,error}=await sb.from("docs").select("id,data").eq("coll",coll);if(error)throw {code:error.code||"error",message:error.message};return data}
  function listen(filter,fn){const ch=sb.channel("rt-"+filter+Math.random()).on("postgres_changes",{event:"*",schema:"public",table:"docs"},()=>fn()).subscribe();return()=>sb.removeChannel(ch)}
  const db={
    collection:coll=>({onSnapshot(ok,err){const run=()=>list(coll).then(rows=>ok({metadata:{fromCache:false},docs:rows.map(snapDoc)}),e=>err&&err(e));run();return listen(coll,run)}}),
    doc:path=>{const {coll,id}=split(path);const get=async()=>{const {data,error}=await sb.from("docs").select("data").eq("coll",coll).eq("id",id).maybeSingle();if(error)throw {code:error.code,message:error.message};return data?data.data:null};
      const put=async d=>{const {error}=await sb.from("docs").upsert({coll,id,data:d,updated_at:new Date().toISOString()});if(error)throw {code:error.code==="42501"?"invalid_argument":error.code,message:error.message}};
      return {onSnapshot(ok,err){const run=()=>get().then(d=>ok({exists:!!d,data:()=>d||{}}),e=>err&&err(e));run();return listen(path,run)},
        set:put,update:async p=>put(merge((await get())||{},p)),delete:async()=>{const {error}=await sb.from("docs").delete().eq("coll",coll).eq("id",id);if(error)throw {code:error.code,message:error.message}}}}};
  const downloads={save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);return {status:"saved"}}};
  function loginBar(){if(document.getElementById("rt-login")||session)return;const d=document.createElement("div");d.id="rt-login";d.style.cssText="position:fixed;right:12px;top:12px;z-index:50;background:#fff;border:1px solid #ccc;border-radius:10px;padding:8px;display:flex;gap:6px;font:14px system-ui";
    d.innerHTML='<input type="email" placeholder="Email pengurus" style="padding:6px 8px"><button style="padding:6px 10px">Masuk</button>';
    d.querySelector("button").onclick=async()=>{const em=d.querySelector("input").value.trim();if(!em)return;const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.href}});d.querySelector("button").textContent=error?"Gagal":"Cek email"};document.body.appendChild(d)}
  window.claude={use:async name=>{await ready;if(!sb)return name==="downloads"?downloads:null;
    if(name==="db")return db;if(name==="downloads")return downloads;
    if(name==="user"){window.addEventListener("DOMContentLoaded",loginBar);setTimeout(loginBar,300);return {canEdit:()=>role==="admin"||role==="owner",isOwner:()=>role==="owner",id:async()=>session&&session.user.id}}return null}};
})();
