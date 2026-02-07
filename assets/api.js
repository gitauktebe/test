const ApiClient = (() => {
  const API_URL = "https://script.google.com/macros/s/AKfycbw8mMVH32JvUahaFcG4KEEUfbXxxThKlskrgbkelpBIfeSm_r4jozlXyed0__gN9RGa/exec";

  async function apiCall(action, payload = {}, initData = ""){
    const body = JSON.stringify({ action, payload, initData });
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body,
    });
    if(!res.ok){
      throw new Error(`API error: ${res.status}`);
    }
    const text = await res.text();
    try{
      return JSON.parse(text);
    }catch{
      return text;
    }
  }

  return { apiCall };
})();

window.ApiClient = ApiClient;
