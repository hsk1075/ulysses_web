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
  im.onerror = () => { im.onerror = null; im.src = src.normalize("NFD"); };
  im.src = src.normalize("NFC");
}
const $ = id => document.getElementById(id);
const who = (tr, i) => { const k = i % 2 === 0 ? tr.from : (tr.from === "L" ? "H" : "L"); return {k, name:NAME[k]}; };
let cur = 0, idx = 0, last = null;
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
  const tr = TRACKS[cur], ch = $("chain"), sc = ch.parentElement, cs = getComputedStyle(sc);
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
  const tr = TRACKS[cur], ch = $("chain"), u = unit(), g = 4; let prev = null, W = 0, H = 0;
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
  const tr = TRACKS[cur], ch = $("chain"), n = tr.photos.length; ch.innerHTML = "";
  $("tt").textContent = tr.title; $("tn").textContent = tr.title;
  tr.photos.forEach((p, i) => {
    const c = document.createElement("div"); c.className = "cell";
    const b = thumb(tr, i); b.onclick = () => openV(i); c.appendChild(b); ch.appendChild(c);
    if (p.src && !p.r){ const im = new Image(); im.onload = () => { p.r = im.naturalWidth / im.naturalHeight; if (cur === TRACKS.indexOf(tr)) layout(); }; setSrc(im, p.src); }
  });
  layout();
}
addEventListener("resize", () => { if (!$("track").hidden) layout(); });

function route(){
  const m = /^#t([1-6])$/.exec(location.hash);
  $("vw").classList.remove("on");
  $("home").hidden = !!m; $("track").hidden = !m;
  if (m){ cur = +m[1] - 1; renderTrack(); window.scrollTo(0, 0); }
}
window.addEventListener("hashchange", route); route();

function frame(el, tr, i, click){
  const p = tr.photos[i], w = who(tr, i); el.innerHTML = "";
  const bx = document.createElement(click ? "button" : "div"); bx.className = "bx"; bx.style.aspectRatio = ratio(p);
  if (click) bx.onclick = click;
  if (p.src){ const im = new Image(); setSrc(im, p.src); im.alt = p.caption || ""; bx.appendChild(im); bx.classList.add("has"); } else bx.textContent = "사진 없음";
  const l = document.createElement("div"); l.className = "l2"; l.textContent = "";
  el.append(bx, l);
}
function openV(i){
  idx = i; const tr = TRACKS[cur], p = tr.photos[i], vw = $("vw");
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
  if (dx < 0 && idx < TRACKS[cur].photos.length - 1) openV(idx + 1);
  if (dx > 0 && idx > 0) openV(idx - 1);
});
document.addEventListener("keydown", e => {
  if (!$("vw").classList.contains("on")) return;
  if (e.key === "Escape") closeV();
  if (e.key === "ArrowLeft" && idx > 0) openV(idx - 1);
  if (e.key === "ArrowRight" && idx < TRACKS[cur].photos.length - 1) openV(idx + 1);
});
/* ---------- 홈: 천천히 떠다니는 링크 ---------- */
const home = $("home"), orbs = [...home.querySelectorAll(".orb")], logoEl = home.querySelector(".logo");
const start = [[.07,.16],[.03,.48],[.1,.8],[.72,.2],[.8,.52],[.68,.82]];
/* 기기에서 '동작 줄이기'가 켜져 있으면 멈추지 않고 더 천천히 */
const still = matchMedia("(prefers-reduced-motion: reduce)");
let st = [], raf = 0, tPrev = 0;
function initOrbs(){
  const W = home.clientWidth, H = home.clientHeight;
  st = orbs.map((el, i) => {
    const w = el.offsetWidth, h = el.offsetHeight, a = (i * 2.399 + 0.6), sp = 9 + (i % 3) * 3;
    return {el, w, h, x: Math.min(W - w - 8, start[i][0] * W), y: start[i][1] * H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hold: false};
  });
  st.forEach(o => {
    ["mouseenter","focus"].forEach(e => o.el.addEventListener(e, () => o.hold = true));
    ["mouseleave","blur"].forEach(e => o.el.addEventListener(e, () => o.hold = false));
  });
  place();
}
function place(){ st.forEach(o => o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0)`); }
function tick(t){
  const dt = Math.min(0.05, (t - tPrev) / 1000 || 0); tPrev = t;
  const W = home.clientWidth, H = home.clientHeight, pad = 8;
  const hr = home.getBoundingClientRect(), lr = logoEl.getBoundingClientRect();
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
function syncHome(){
  cancelAnimationFrame(raf); raf = 0;
  if (home.hidden) return;
  if (!st.length) initOrbs();
  tPrev = performance.now(); raf = requestAnimationFrame(tick);
}
window.addEventListener("hashchange", syncHome);
window.addEventListener("resize", () => { st = []; syncHome(); });
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { st = []; syncHome(); });
syncHome();