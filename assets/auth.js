const AuthClient = (() => {
  function getTelegramContext(){
    const tg = window.Telegram && window.Telegram.WebApp;
    const initData = tg?.initData || "";
    return {
      tg: tg || null,
      initData,
      isTelegram: Boolean(tg && initData),
    };
  }

  async function registerMe(nickname = ""){
    const { initData, isTelegram } = getTelegramContext();
    if(!isTelegram) return null;
    return window.ApiClient.apiCall("register_or_update_user", { nickname }, initData);
  }

  return { getTelegramContext, registerMe };
})();

window.AuthClient = AuthClient;
