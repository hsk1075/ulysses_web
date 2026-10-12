const PER_TRACK = 15;   // 트랙당 사진 수
const NAME = {L:"왼손", H:"홍양"};
/* 사진이 없을 때 배치를 보여주기 위한 임시 가로(l)/세로(p) 패턴. 실제 사진은 비율로 자동 판단됩니다. */
const DEMO = "lpplllpllplppll";

/* data.js 의 RAW 를 화면용 데이터로 변환 */
const TRACKS = RAW.map(t => {
  const n = Math.max(PER_TRACK, t.photos.length);
  return {...t, title: `${NAME[t.from]}으로부터(${t.n})`,
    photos: Array.from({length: n}, (_, i) => t.photos[i]
      ? {src: t.photos[i], caption: (t.captions || [])[i] || ""}
      : {src: "", caption: "", o: DEMO[(i + t.n + (t.from === "H" ? 3 : 0)) % DEMO.length]})};
});

/* 한글 파일명: Mac 에서 저장된 방식(NFD)과 입력한 방식(NFC)이 달라도 사진을 찾도록 */
function setSrc(im, src){
  if (/^https?:/.test(src)){ im.src = src; return; }
  im.onerror = () => { im.onerror = null; im.src = src.normalize("NFD"); };
  im.src = src.normalize("NFC");
}
const $ = id => document.getElementById(id);
/* 지금 보고 있는 트랙 (왼손·홍양 트랙 또는 방문자가 만든 트랙) */
let TR = TRACKS[0], idx = 0, last = null;
/* 방문자 트랙은 순서대로 왼쪽·오른쪽을 번갈아, 이름은 찍은 사람 */
const who = (tr, i) => {
  if (tr.custom) return {k: i % 2 === 0 ? "L" : "H", name: (tr.photos[i] || {}).author || ""};
  const k = i % 2 === 0 ? tr.from : (tr.from === "L" ? "H" : "L"); return {k, name: NAME[k]};
};
$("mini").src = "images/logo.png";

const unit = () => innerWidth < 640 ? 170 : 240;
const ratio = p => p.r || (p.o === "p" ? 2/3 : 3/2);
function thumb(tr, i){
  const p = tr.photos[i], w = who(tr, i), b = document.createElement("button");
  b.className = "ph" + (p.src ? "" : " empty");
  b.setAttribute("aria-label", `${w.name}, ${i+1}번째 사진`);
  if (p.src){ const im = new Image(); setSrc(im, p.src); im.alt = p.caption || ""; b.appendChild(im); }
  const l = document.createElement("span"); l.className = "lab"; l.textContent = p.caption || `${i+1} ${w.name}`; b.appendChild(l);
  return b;
}

/* 배치 규칙: 다음 사진이 가로면 오른쪽(아래끝 정렬), 세로면 아래(오른쪽끝 정렬) */
/* 모바일: 왼손은 왼쪽, 홍양은 오른쪽에 번갈아 놓이며 아래로 */
const MOBILE = 640;
function layoutMobile(){
  const tr = TR, ch = $("chain"), sc = ch.parentElement, cs = getComputedStyle(sc);
  const A = sc.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), g = 14; let y = 0;
  [...ch.querySelectorAll(".cell")].forEach((c, i) => {
    const r = ratio(tr.photos[i]), w = r >= 1 ? A * 0.72 : A * 0.5, h = w / r;
    const x = who(tr, i).k === "L" ? 0 : A - w;
    Object.assign(c.style, {left: x + "px", top: y + "px", width: w + "px", height: h + "px"});
    y += h + g;
  });
  ch.style.width = A + "px"; ch.style.height = Math.max(0, y - g) + "px";
}
function layout(){
  if (innerWidth < MOBILE) return layoutMobile();
  const tr = TR, ch = $("chain"), u = unit(), g = 4; let prev = null, W = 0, H = 0;
  [...ch.querySelectorAll(".cell")].forEach((c, i) => {
    const r = ratio(tr.photos[i]), w = r >= 1 ? u : u * r, h = r >= 1 ? u / r : u;
    let x = 0, y = 0;
    if (prev){ if (r < 1){ x = prev.x + prev.w - w; y = prev.y + prev.h + g; } else { x = prev.x + prev.w + g; y = prev.y + prev.h - h; } }
    Object.assign(c.style, {left: x + "px", top: y + "px", width: w + "px", height: h + "px"});
    prev = {x, y, w, h}; W = Math.max(W, x + w); H = Math.max(H, y + h);
  });
  ch.style.width = W + "px"; ch.style.height = H + "px";
}

function renderTrack(){
  const tr = TR, ch = $("chain"); ch.innerHTML = "";
  $("tt").textContent = tr.title; $("tn").textContent = tr.title;
  $("toplink").href = tr.custom ? "#new" : "#";
  $("more").hidden = !tr.custom;
  tr.photos.forEach((p, i) => {
    const c = document.createElement("div"); c.className = "cell";
    const b = thumb(tr, i); b.onclick = () => openV(i); c.appendChild(b); ch.appendChild(c);
    if (p.src && !p.r){ const im = new Image(); im.onload = () => { p.r = im.naturalWidth / im.naturalHeight; if (TR === tr) layout(); }; setSrc(im, p.src); }
  });
  layout();
}
addEventListener("resize", () => { if (!$("track").hidden) layout(); });

/* 화면 전환: #t1~#t6 왼손·홍양 트랙 / #new 새로 만들기 공간 / #u/아이디 방문자가 만든 트랙 */
function route(){
  const h = location.hash, m = /^#t([1-6])$/.exec(h), u = /^#u\/([\w-]+)$/.exec(h), isNew = h === "#new";
  $("vw").classList.remove("on"); closeSheet();
  $("home").hidden = !!(m || u || isNew); $("new").hidden = !isNew; $("track").hidden = !(m || u);
  if (m){ TR = TRACKS[+m[1] - 1]; renderTrack(); window.scrollTo(0, 0); }
  if (u) openUserTrack(u[1]);
  if (isNew){ editMake(); loadNewSpace(); }
  /* 화면이 바뀐 다음에 떠다니기를 다시 시작 (숨겨진 동안엔 멈춰 있음) */
  if (typeof FLOAT !== "undefined") syncAll();
}

function frame(el, tr, i, click){
  const p = tr.photos[i]; el.innerHTML = "";
  const bx = document.createElement(click ? "button" : "div"); bx.className = "bx"; bx.style.aspectRatio = ratio(p);
  if (click) bx.onclick = click;
  if (p.src){ const im = new Image(); setSrc(im, p.src); im.alt = p.caption || ""; bx.appendChild(im); bx.classList.add("has"); } else bx.textContent = "사진 없음";
  const l = document.createElement("div"); l.className = "l2"; l.textContent = "";
  el.append(bx, l);
}
function openV(i){
  idx = i; const tr = TR, p = tr.photos[i], vw = $("vw");
  if (!vw.classList.contains("on")) last = document.activeElement;
  vw.classList.add("on");
  frame($("big"), tr, i);
  /* 양옆: 앞 사진은 왼쪽, 뒤 사진은 오른쪽에 작게. 없으면 자리만 비워 가운데 사진이 늘 가운데 오도록 */
  [["prev", i - 1], ["next", i + 1]].forEach(([id, j]) => {
    const el = $(id), ok = j >= 0 && j < tr.photos.length;
    el.classList.toggle("none", !ok); el.innerHTML = "";
    if (ok) frame(el, tr, j, () => openV(j));
  });
  fitV();
  $("cap").textContent = p.caption || "";
  $("pv").disabled = i === 0; $("nx").disabled = i === tr.photos.length - 1;
  $("cl").focus({preventScroll: true, focusVisible: false});
}
/* 사진 상자를 칸 안에 비율대로 딱 맞춰서, 캡션이 사진 바로 아래 붙게 */
function fitV(){
  ["prev", "big", "next"].forEach(id => {
    const el = $(id), bx = el.querySelector(".bx"); if (!bx) return;
    const r = parseFloat(bx.style.aspectRatio) || 1.5, W = el.clientWidth, H = el.clientHeight - 26;
    const w = Math.min(W, H * r); Object.assign(bx.style, {width: w + "px", height: w / r + "px", maxHeight: "none"});
  });
}
addEventListener("resize", () => { if ($("vw").classList.contains("on")) fitV(); });
function closeV(){ $("vw").classList.remove("on"); if (last) last.focus(); }
$("pv").onclick = () => openV(idx - 1);
$("nx").onclick = () => openV(idx + 1);
$("cl").onclick = closeV;
/* 휴대폰: 좌우로 밀어서 넘기기 */
let sx = null;
$("stage").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, {passive: true});
$("stage").addEventListener("touchend", e => {
  if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) < 40) return;
  if (dx < 0 && idx < TR.photos.length - 1) openV(idx + 1);
  if (dx > 0 && idx > 0) openV(idx - 1);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("sheet").hidden){ closeSheet(); return; }
  if (!$("vw").classList.contains("on")) return;
  if (e.key === "Escape") closeV();
  if (e.key === "ArrowLeft" && idx > 0) openV(idx - 1);
  if (e.key === "ArrowRight" && idx < TR.photos.length - 1) openV(idx + 1);
});

/* ---------- 떠다니는 링크 (홈 / 새로 만들기 공간 공용) ---------- */
/* 기기에서 '동작 줄이기'가 켜져 있으면 멈추지 않고 더 천천히 */
const still = matchMedia("(prefers-reduced-motion: reduce)");
function makeFloater(sec, starts){
  const logoEl = sec.querySelector(".logo"); let st = [], raf = 0, tPrev = 0;
  function init(){
    const W = sec.clientWidth, H = sec.clientHeight;
    st = [...sec.querySelectorAll(".orb")].map((el, i) => {
      const w = el.offsetWidth, h = el.offsetHeight, a = (i * 2.399 + 0.6), sp = 9 + (i % 3) * 3;
      /* 시작 위치: 홈은 정해진 자리, 새 공간은 화면에 고르게 흩어지도록 */
      const s = (starts && starts[i]) || [(i * 0.618 + 0.05) % 0.9, (i * 0.382 + 0.12) % 0.85];
      if (!el.dataset.f){ el.dataset.f = 1;
        ["mouseenter","focus"].forEach(e => el.addEventListener(e, () => { const o = st.find(o => o.el === el); if (o) o.hold = true; }));
        ["mouseleave","blur"].forEach(e => el.addEventListener(e, () => { const o = st.find(o => o.el === el); if (o) o.hold = false; }));
      }
      return {el, w, h, x: Math.min(W - w - 8, s[0] * W), y: s[1] * H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hold: false};
    });
    place();
  }
  function place(){ st.forEach(o => o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0)`); }
  function tick(t){
    const dt = Math.min(0.05, (t - tPrev) / 1000 || 0); tPrev = t;
    const W = sec.clientWidth, H = sec.clientHeight, pad = 8;
    const hr = sec.getBoundingClientRect(), lr = logoEl.getBoundingClientRect();
    const ins = lr.width * 0.12;
    const box = {l: lr.left - hr.left + ins, r: lr.right - hr.left - ins, t: lr.top - hr.top + ins, b: lr.bottom - hr.top - ins};
    st.forEach(o => {
      if (o.hold) return;
      const k = still.matches ? 0.5 : 1; o.x += o.vx * dt * k; o.y += o.vy * dt * k;
      if (o.x < pad){ o.x = pad; o.vx = Math.abs(o.vx); }
      if (o.x + o.w > W - pad){ o.x = W - pad - o.w; o.vx = -Math.abs(o.vx); }
      if (o.y < pad){ o.y = pad; o.vy = Math.abs(o.vy); }
      if (o.y + o.h > H - pad){ o.y = H - pad - o.h; o.vy = -Math.abs(o.vy); }
      const ox = Math.min(o.x + o.w, box.r) - Math.max(o.x, box.l), oy = Math.min(o.y + o.h, box.b) - Math.max(o.y, box.t);
      if (ox > 0 && oy > 0){
        if (ox < oy){ const left = o.x + o.w / 2 < (box.l + box.r) / 2; o.x += left ? -ox : ox; o.vx = left ? -Math.abs(o.vx) : Math.abs(o.vx); }
        else { const up = o.y + o.h / 2 < (box.t + box.b) / 2; o.y += up ? -oy : oy; o.vy = up ? -Math.abs(o.vy) : Math.abs(o.vy); }
      }
    });
    place(); raf = requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(raf); raf = 0;
    if (sec.hidden) return;
    if (!st.length) init();
    tPrev = performance.now(); raf = requestAnimationFrame(tick);
  }
  return {sync, reset(){ st = []; sync(); }};
}
const FLOAT = [
  makeFloater($("home"), [[.07,.16],[.03,.48],[.1,.8],[.72,.2],[.8,.52],[.68,.82]]),
  makeFloater($("new"))
];
const syncAll = () => FLOAT.forEach(f => f.sync()), resetAll = () => FLOAT.forEach(f => f.reset());
window.addEventListener("resize", resetAll);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(resetAll);

/* ---------- 새로 만들기: 방문자가 트랙을 만들고 사진을 이어 찍기 (Supabase) ---------- */
const CFG = window.ULYSSES_CONFIG || {}, DB = (CFG.url || "").replace(/\/$/, ""), KEY = CFG.key || "";
const ready = () => !!(DB && KEY) || !!CFG.demo || CFG.backend === "claude";
/* 예전 anon 키(eyJ…)는 Authorization 에도 넣고, 새 publishable 키(sb_publishable_…)는 apikey 에만 */
const H = (extra = {}) => ({apikey: KEY, ...(KEY.startsWith("sb_") ? {} : {Authorization: `Bearer ${KEY}`}), ...extra});
async function api(path, opt = {}){
  const r = await fetch(`${DB}/rest/v1/${path}`, {...opt, headers: H({"Content-Type": "application/json", ...(opt.headers || {})})});
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
const publicUrl = path => `${DB}/storage/v1/object/public/photos/${path}`;

/* 저장소: 기본은 Supabase. config 에 backend:"claude" 면 Claude 미리보기 페이지의 저장소에 계속 보관,
   demo:true 면 이 페이지 안에서만 잠깐 보관 */
const BACKEND = CFG.backend === "claude" ? "claude" : CFG.demo ? "mem" : "supabase";
const mem = {tracks: [], photos: []};
const memStore = {
  list: async () => [...mem.tracks].reverse(),
  track: async id => mem.tracks.find(t => t.id === id),
  photos: async id => mem.photos.filter(p => p.track_id === id),
  create: async name => { const t = {id: "d" + Date.now().toString(36), name, created_at: new Date().toISOString()}; mem.tracks.push(t); return t; },
  add: async (track_id, author, img) => { mem.photos.push({track_id, author, url: URL.createObjectURL(img.blob), w: img.w, h: img.h, created_at: new Date().toISOString()}); }
};
let claudeKit = null;
async function kit(){
  if (!claudeKit) claudeKit = (async () => {
    const c = window.claude; if (!c || !c.use) return null;
    const [db, assets] = await Promise.all([c.use("db"), c.use("assets")]);
    return db ? {db, assets} : null;
  })();
  return claudeKit;
}
const claudeStore = {
  list: async () => { const k = await kit(); if (!k) return memStore.list();
    const q = await k.db.collection("tracks").orderBy("created_at", "desc").limit(40).get();
    return q.docs.map(d => ({id: d.id, ...d.data()})); },
  track: async id => { const k = await kit(); if (!k) return memStore.track(id);
    const d = await k.db.doc("tracks/" + id).get(); return d.exists ? {id, ...d.data()} : null; },
  photos: async id => { const k = await kit(); if (!k) return memStore.photos(id);
    const q = await k.db.collection("photos").where("track_id", "==", id).orderBy("created_at", "asc").get();
    return q.docs.map(d => { const p = d.data(); return {...p, url: "/_blob/" + p.asset}; }); },
  create: async name => { const k = await kit(); if (!k) return memStore.create(name);
    const ref = k.db.collection("tracks").doc(); await ref.set({name, created_at: new Date().toISOString()}); return {id: ref.id}; },
  add: async (track_id, author, img) => { const k = await kit(); if (!k) return memStore.add(track_id, author, img);
    if (!k.assets) throw new Error("no_upload");
    const a = await k.assets.upload(img.blob, {type: "image/jpeg"});
    await k.db.collection("photos").add({track_id, author, asset: a.id, w: img.w, h: img.h, created_at: new Date().toISOString()}); }
};
const store = BACKEND === "claude" ? claudeStore : BACKEND === "mem" ? memStore : {
  list: () => api("tracks?select=id,name&order=created_at.desc&limit=40"),
  track: async id => (await api(`tracks?id=eq.${id}&select=id,name`))[0],
  photos: async id => (await api(`photos?track_id=eq.${id}&select=author,path,w,h,created_at&order=created_at.asc`)).map(p => ({...p, url: publicUrl(p.path)})),
  create: async name => (await api("tracks", {method: "POST", headers: {Prefer: "return=representation"}, body: JSON.stringify({name})}))[0],
  add: async (trackId, author, img) => {
    const path = `${trackId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const up = await fetch(`${DB}/storage/v1/object/photos/${path}`, {method: "POST", headers: H({"Content-Type": "image/jpeg"}), body: img.blob});
    if (!up.ok) throw new Error(`${up.status} ${await up.text()}`);
    await api("photos", {method: "POST", body: JSON.stringify({track_id: trackId, author, path, w: img.w, h: img.h})});
  }
};

/* '으로부터 / 로부터': 이름 끝 글자에 받침이 없거나 ㄹ 받침이면 '로부터' */
function fromWord(name){
  const c = name.charCodeAt(name.length - 1);
  if (c >= 0xAC00 && c <= 0xD7A3){ const j = (c - 0xAC00) % 28; return name + (j === 0 || j === 8 ? "로부터" : "으로부터"); }
  return name + "으로부터";
}
const today = d => { const t = new Date(d); return `${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")}`; };

/* 새로 만들기 공간: 방문자 트랙들이 로고 주위를 떠다님 */
async function loadNewSpace(){
  const sec = $("new"), msg = $("newmsg");
  sec.querySelectorAll(".orb").forEach(o => o.remove());
  if (!ready()){ msg.textContent = "저장소가 아직 연결되지 않았어요 (js/config.js)"; return; }
  msg.textContent = "";
  try {
    const list = await store.list();
    if (location.hash !== "#new") return;
    list.forEach(t => {
      const a = document.createElement("a"); a.className = "orb"; a.href = `#u/${t.id}`; a.textContent = fromWord(t.name);
      if (t.id === sessionStorageGet("justMade")) a.classList.add("fresh");
      sec.appendChild(a);
    });
    FLOAT[1].reset();
  } catch (e){ msg.textContent = "트랙을 불러오지 못했어요"; console.error(e); }
}
function sessionStorageGet(k){ try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v){ try { sessionStorage.setItem(k, v); } catch {} }

/* 방문자가 만든 트랙 열기 */
async function openUserTrack(id){
  $("tn").textContent = ""; $("chain").innerHTML = ""; $("more").hidden = true;
  if (!ready()) return;
  try {
    const t = await store.track(id), ps = await store.photos(id);
    if (!t || location.hash !== `#u/${id}`) return;
    TR = {custom: true, id, name: t.name, title: fromWord(t.name),
      photos: ps.map(p => ({src: p.url, author: p.author, r: p.w && p.h ? p.w / p.h : 0, caption: `${p.author} · ${today(p.created_at)}`}))};
    renderTrack(); window.scrollTo(0, 0);
  } catch (e){ $("tn").textContent = "트랙을 불러오지 못했어요"; console.error(e); }
}

/* 입력 시트: mode 'make' = 새 트랙 이름 / 'more' = 이어 찍는 사람 이름 */
let mode = "make", pending = "";
function openSheet(m){
  mode = m; $("sheet").hidden = false; $("sheetmsg").textContent = "";
  $("sheetq").textContent = m === "make" ? "누구로부터 시작할까요" : `${TR.title}에 이어서`;
  $("nmsuf").textContent = m === "make" ? "으로부터" : "";
  $("nm").placeholder = m === "make" ? "이름" : "찍는 사람 이름";
  $("nm").value = ""; $("nm").focus();
}
function closeSheet(){ $("sheet").hidden = true; }
/* 새 공간 아래: 이름 칸 + '카메라' '앨범'이 처음부터 바로 보임 */
function editMake(){ $("mk").value = ""; $("mksuf").textContent = "으로부터"; }
$("mk").addEventListener("input", () => { const v = $("mk").value.trim(); $("mksuf").textContent = v ? fromWord(v).slice(v.length) : "으로부터"; });
$("more").onclick = () => openSheet("more");
$("sheetx").onclick = closeSheet;
$("nm").addEventListener("input", () => { if (mode === "make"){ const v = $("nm").value.trim(); $("nmsuf").textContent = v ? fromWord(v).slice(v.length) : "으로부터"; } });
/* 사진 고르기: '카메라' = 휴대폰 카메라 바로 열기 / '앨범' = 사진 보관함에서 고르기.
   버튼을 <label for="cam|alb"> 로 만들어서, 휴대폰 브라우저가 파일 창을 확실히 열게 함 */
document.querySelectorAll("label[data-need]").forEach(l => l.addEventListener("click", e => {
  const inp = $(l.dataset.need), v = inp.value.trim(), make = l.dataset.need === "mk", msg = make ? $("newmsg") : $("sheetmsg");
  if (!ready()){ e.preventDefault(); msg.textContent = "저장소가 아직 연결되지 않았어요 (js/config.js)"; return; }
  if (!v){ e.preventDefault(); msg.textContent = "이름을 먼저 적어 주세요"; inp.focus(); return; }
  msg.textContent = ""; mode = make ? "make" : "more"; pending = v; $(l.htmlFor).value = "";
}));
/* 이름 칸에서 Enter = 카메라 */
$("makeform").onsubmit = e => { e.preventDefault(); $("mkcam").click(); };
$("sheetform").onsubmit = e => { e.preventDefault(); $("nmcam").click(); };
["cam", "alb"].forEach(id => $(id).onchange = () => upload($(id).files[0]));
async function upload(f){
  if (!f) return;
  const name = pending, msg = mode === "make" ? $("newmsg") : $("sheetmsg");
  document.body.classList.add("busy"); msg.textContent = "올리는 중…";
  try {
    const img = await shrink(f);
    const trackId = mode === "more" ? TR.id : (await store.create(name)).id;
    await store.add(trackId, name, img);
    closeSheet();
    if (mode === "make"){ sessionStorageSet("justMade", trackId); editMake(); loadNewSpace(); }
    else openUserTrack(trackId);
  } catch (e){
    console.error(e);
    msg.textContent = e.message === "no_upload" ? "이 화면에서는 사진을 올릴 수 없어요" : "올리지 못했어요. 잠시 후 다시 해 주세요";
  } finally { document.body.classList.remove("busy"); }
}
/* 올리기 전에 사진을 긴 변 1600px JPEG 로 줄이기 (휴대폰 원본은 너무 커서) */
async function shrink(file, max = 1600){
  /* 일부 휴대폰 브라우저는 createImageBitmap 이 안 돼서, 그때는 <img> 로 읽기 */
  const bmp = await createImageBitmap(file).catch(() => new Promise((ok, no) => {
    const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file);
  }));
  if (!bmp.width){ bmp.width = bmp.naturalWidth; bmp.height = bmp.naturalHeight; }
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.86));
  return {blob, w, h};
}

window.addEventListener("hashchange", route); route();