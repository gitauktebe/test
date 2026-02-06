const UIHelpers = (() => {
  function initials(name){
    const parts = String(name||"").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "•";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }
  function formatRUB(v){
    const n = Number(v)||0;
    return new Intl.NumberFormat("ru-RU", { style:"currency", currency:"RUB", maximumFractionDigits:0 }).format(n);
  }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  /* ---------- Анимация чисел (0 -> target) ---------- */
  const animMap = new WeakMap();
  function cancelAnim(el){
    const id = animMap.get(el);
    if(id) cancelAnimationFrame(id);
    animMap.delete(el);
  }
  function animateNumber(el, from, to, durationMs, formatter){
    cancelAnim(el);
    const start = performance.now();
    const ease = (t)=> 1 - Math.pow(1 - t, 3); // easeOutCubic

    const step = (now)=>{
      const t = Math.min(1, (now - start) / durationMs);
      const k = ease(t);
      const val = from + (to - from) * k;

      el.textContent = formatter(val);

      if(t < 1){
        const rid = requestAnimationFrame(step);
        animMap.set(el, rid);
      }else{
        el.textContent = formatter(to);
        animMap.delete(el);
      }
    };
    const rid = requestAnimationFrame(step);
    animMap.set(el, rid);
  }

  /* Форматтеры под разные режимы */
  function fmtMoney(n){
    const v = Math.round(Math.max(0, n));
    return formatRUB(v);
  }
  function fmtProfit(n){
    const v = Math.round(n);
    if(v === 0) return formatRUB(0);
    const sign = v > 0 ? "+" : "−";
    return sign + formatRUB(Math.abs(v)).replace("−","");
  }
  function fmtCount(n){
    const v = Math.round(Math.max(0, n));
    return String(v);
  }

  return {
    initials,
    escapeHtml,
    animateNumber,
    fmtMoney,
    fmtProfit,
    fmtCount,
  };
})();

window.UIHelpers = UIHelpers;
