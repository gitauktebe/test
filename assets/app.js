const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQsHwAvfQEsaYPsASfRJZfI5r9YtbX6Je0B7lEdR6qv_yL39idPRYSHNWEJefOJdQ34FsnaM_EDJaWu/pub?gid=0&single=true&output=csv";
const CSV_DELIM = ",";

const MODES = [
  { id:"buyin",   label:"Байин",   type:"money" },
  { id:"itm",     label:"ITM",     type:"money" },
  { id:"profit",  label:"Профит",  type:"money_profit" },
  { id:"champion",label:"Чемпион", type:"count", emoji:"🏆" },
  { id:"loser",   label:"Лузер",   type:"count", emoji:"🍺" },
];

const { parseCSV, normalizePlayers, toNumberLoose } = window.CSVUtils;
const { initials, escapeHtml, animateNumber, fmtMoney, fmtProfit, fmtCount } = window.UIHelpers;
const { applyTelegramOptimizations } = window.TelegramUtils;

const $ = (id)=>document.getElementById(id);
const listEl = $("list");
const modesEl = $("modes");
const modesWrap = $("modesWrap");
const headerEl = document.querySelector(".headerSticky");

let state = { mode: "profit", players: [], justSwitched: false };

function currentModeMeta(){
  return MODES.find(x=>x.id===state.mode) || MODES[0];
}

function modeValue(p, mode){
  switch(mode){
    case "buyin": return p.buyin_total;
    case "itm": return p.itm_total;
    case "champion": return p.champion_wins;
    case "loser": return p.first_out;
    case "profit": return p.profit;
    default: return 0;
  }
}

function valueClassForMode(p, mode){
  if(mode !== "profit") return "";
  const n = Number(p.profit)||0;
  if(n > 0) return "good";
  if(n < 0) return "bad";
  return "";
}
function fillClassForMode(p, mode){
  if(mode !== "profit") return "";
  const n = Number(p.profit)||0;
  if(n > 0) return "good";
  if(n < 0) return "bad";
  return "";
}

function buildButtons(){
  modesEl.innerHTML = "";
  for(const m of MODES){
    const b = document.createElement("button");
    b.className = "btn" + (m.id === state.mode ? " active" : "");
    b.textContent = m.label;
    b.onclick = ()=> setMode(m.id);
    modesEl.appendChild(b);
  }
  requestAnimationFrame(() => {
    const active = modesEl.querySelector(".btn.active");
    if(active) active.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
  });
}

function renderInitial(){
  listEl.innerHTML = "";
  for(const p of state.players){
    const el = document.createElement("div");
    el.className = "item";
    el.dataset.key = p._key;
    el.innerHTML = `
      <div class="left">
        <div class="avatar">${escapeHtml(initials(p.name))}</div>
        <div class="nameBlock">
          <b>${escapeHtml(p.name)}</b>
        </div>
      </div>
      <div class="right">
        <div class="iconSlot"></div>
        <div class="value">0</div>
        <div class="bar"><div class="fill"></div></div>
      </div>
    `;
    listEl.appendChild(el);
  }
  updateRightSide(true);
}

function updateRightSide(skipAnim=false){
  const mode = state.mode;
  const meta = currentModeMeta();

  // FLIP: позиции ДО
  const items = Array.from(listEl.children);
  const first = new Map();
  for(const el of items) first.set(el.dataset.key, el.getBoundingClientRect().top);

  // сортировка по убыванию
  const sorted = [...state.players].sort((a,b)=> modeValue(b, mode) - modeValue(a, mode));
  state.players = sorted;

  // перестановка DOM
  const byKeyEl = new Map(items.map(el => [el.dataset.key, el]));
  for(const p of sorted){
    const el = byKeyEl.get(p._key);
    if(el) listEl.appendChild(el);
  }

  // максимум для шкалы
  const maxVal = (() => {
    if(mode === "profit") return Math.max(...sorted.map(p => Math.abs(modeValue(p, mode))), 0);
    return Math.max(...sorted.map(p => modeValue(p, mode)), 0);
  })();

  const shouldAnimateFromZero = (!skipAnim && state.justSwitched);

  for(const p of sorted){
    const el = byKeyEl.get(p._key);
    if(!el) continue;

    const iconSlot = el.querySelector(".iconSlot");
    const valEl = el.querySelector(".value");
    const bar = el.querySelector(".bar");
    const fill = el.querySelector(".fill");

    const isCountMode = (mode === "champion" || mode === "loser");
    bar.classList.toggle("ticked", isCountMode);
    iconSlot.textContent = isCountMode ? (meta.emoji || "") : "";

    const v = modeValue(p, mode);

    // значение (цвет профита)
    const vClass = valueClassForMode(p, mode);
    valEl.className = "value" + (vClass ? " " + vClass : "");

    // fill (цвет профита)
    const fClass = fillClassForMode(p, mode);
    fill.className = "fill" + (fClass ? " " + fClass : "");

    // ширина шкалы
    const ratio = maxVal > 0 ? (mode === "profit" ? (Math.abs(v)/maxVal) : (v/maxVal)) : 0;
    const targetW = Math.max(0, Math.min(100, ratio * 100));

    if(skipAnim){
      fill.style.transition = "none";
      fill.style.width = targetW.toFixed(2) + "%";
      fill.offsetHeight;
      fill.style.transition = "";
    }else{
      if(shouldAnimateFromZero){
        fill.style.width = "0%";
        requestAnimationFrame(()=> fill.style.width = targetW.toFixed(2) + "%");
      }else{
        fill.style.width = targetW.toFixed(2) + "%";
      }
    }

    // анимация чисел
    if(skipAnim){
      if(mode === "buyin" || mode === "itm") valEl.textContent = fmtMoney(v);
      else if(mode === "profit") valEl.textContent = fmtProfit(v);
      else valEl.textContent = fmtCount(v);
    }else{
      const dur = 520;
      if(mode === "buyin" || mode === "itm"){
        animateNumber(valEl, shouldAnimateFromZero ? 0 : toNumberLoose(valEl.textContent), v, dur, fmtMoney);
      }else if(mode === "profit"){
        animateNumber(valEl, shouldAnimateFromZero ? 0 : 0, v, dur, fmtProfit);
      }else{
        animateNumber(valEl, shouldAnimateFromZero ? 0 : 0, v, dur, fmtCount);
      }
    }
  }

  // FLIP: анимация переезда
  const last = new Map();
  for(const el of Array.from(listEl.children)) last.set(el.dataset.key, el.getBoundingClientRect().top);

  for(const el of Array.from(listEl.children)){
    const key = el.dataset.key;
    const dy = (first.get(key) ?? 0) - (last.get(key) ?? 0);
    if(dy){
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      el.offsetHeight;
      el.style.transition = "transform .55s cubic-bezier(.2,.8,.2,1)";
      el.style.transform = "";
    }
  }

  state.justSwitched = false;
}

function setMode(mode){
  if(state.mode === mode) return;
  state.mode = mode;
  state.justSwitched = true;
  buildButtons();
  updateRightSide(false);
}

async function load(){
  const url = SHEET_CSV_URL + (SHEET_CSV_URL.includes("?") ? "&" : "?") + "v=" + Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error("Не удалось загрузить CSV (" + res.status + ")");
  const text = await res.text();

  let rows = parseCSV(text, CSV_DELIM);
  if(rows.length && rows[0].length <= 1 && text.includes(";")){
    rows = parseCSV(text, ";");
  }

  state.players = normalizePlayers(rows);
  buildButtons();
  renderInitial();
}

function updateHeaderHeight(){
  if(!headerEl) return;
  const rect = headerEl.getBoundingClientRect();
  document.documentElement.style.setProperty("--header-height", `${rect.height}px`);
}

const headerResizeObserver = headerEl ? new ResizeObserver(updateHeaderHeight) : null;
if(headerResizeObserver && headerEl){
  headerResizeObserver.observe(headerEl);
}

function setModeByIndex(nextIndex){
  if(nextIndex < 0 || nextIndex >= MODES.length) return;
  const nextMode = MODES[nextIndex]?.id;
  if(nextMode) setMode(nextMode);
}

function setupSwipeNavigation(){
  const swipe = {
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    startTime: 0,
  };
  const horizontalThreshold = 60;
  const verticalThreshold = 50;
  const maxDurationMs = 700;

  const isSwipeTarget = (target) => !target.closest?.(".modesWrap");

  document.addEventListener("touchstart", (event) => {
    if(event.touches.length !== 1) return;
    const target = event.target;
    if(!isSwipeTarget(target)) return;
    const touch = event.touches[0];
    swipe.active = true;
    swipe.moved = false;
    swipe.startX = touch.clientX;
    swipe.startY = touch.clientY;
    swipe.lastX = touch.clientX;
    swipe.lastY = touch.clientY;
    swipe.startTime = Date.now();
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if(!swipe.active || event.touches.length !== 1) return;
    const touch = event.touches[0];
    swipe.lastX = touch.clientX;
    swipe.lastY = touch.clientY;
    swipe.moved = true;
  }, { passive: true });

  document.addEventListener("touchend", () => {
    if(!swipe.active) return;
    swipe.active = false;
    if(!swipe.moved) return;
    const dx = swipe.lastX - swipe.startX;
    const dy = swipe.lastY - swipe.startY;
    const dt = Date.now() - swipe.startTime;

    if(Math.abs(dy) > verticalThreshold || Math.abs(dx) < horizontalThreshold || dt > maxDurationMs){
      return;
    }
    if(Math.abs(dx) < Math.abs(dy) * 1.2){
      return;
    }

    const currentIndex = MODES.findIndex((m) => m.id === state.mode);
    if(dx < 0){
      setModeByIndex(currentIndex + 1);
    }else{
      setModeByIndex(currentIndex - 1);
    }
  }, { passive: true });
}

applyTelegramOptimizations(updateHeaderHeight);
updateHeaderHeight();
setupSwipeNavigation();
load().catch(err=>{
  listEl.innerHTML = `<div class="item"><div>Ошибка: ${escapeHtml(err?.message || err)}</div></div>`;
});
