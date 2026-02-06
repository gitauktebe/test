const TelegramUtils = (() => {
  function applyTelegramOptimizations(updateHeaderHeight){
    const tg = window.Telegram && window.Telegram.WebApp;
    if(!tg) return;
    try{
      tg.ready();
      tg.expand();
      document.documentElement.style.setProperty("--tg-viewport-height", `${tg.viewportHeight || 0}px`);
      document.documentElement.style.setProperty("--tg-viewport-stable-height", `${tg.viewportStableHeight || 0}px`);
      if(tg.safeAreaInset){
        const inset = tg.safeAreaInset;
        document.documentElement.style.setProperty("--tg-safe-top", `${inset.top || 0}px`);
        document.documentElement.style.setProperty("--tg-safe-bottom", `${inset.bottom || 0}px`);
      }
      document.body.style.paddingTop = "12px";
      tg.onEvent("viewportChanged", () => {
        document.documentElement.style.setProperty("--tg-viewport-height", `${tg.viewportHeight || 0}px`);
        document.documentElement.style.setProperty("--tg-viewport-stable-height", `${tg.viewportStableHeight || 0}px`);
        if(tg.safeAreaInset){
          const inset = tg.safeAreaInset;
          document.documentElement.style.setProperty("--tg-safe-top", `${inset.top || 0}px`);
          document.documentElement.style.setProperty("--tg-safe-bottom", `${inset.bottom || 0}px`);
        }
        updateHeaderHeight();
      });
    }catch(e){}
  }

  return {
    applyTelegramOptimizations,
  };
})();

window.TelegramUtils = TelegramUtils;
