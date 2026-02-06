const CSVUtils = (() => {
  function parseCSV(text, delim = ","){
    const rows = [];
    let row = [], cur = "", inQuotes = false;
    for(let i=0;i<text.length;i++){
      const ch = text[i];
      const next = text[i+1];
      if(ch === '"'){
        if(inQuotes && next === '"'){ cur += '"'; i++; }
        else inQuotes = !inQuotes;
        continue;
      }
      if(!inQuotes && ch === delim){ row.push(cur); cur=""; continue; }
      if(!inQuotes && (ch === "\n" || ch === "\r")){
        if(ch === "\r" && next === "\n") i++;
        row.push(cur); rows.push(row);
        row=[]; cur=""; continue;
      }
      cur += ch;
    }
    row.push(cur); rows.push(row);
    return rows.filter(r => r.some(c => String(c).trim() !== ""));
  }
  function toNumberLoose(x){
    const s = String(x ?? "").replace(/\s+/g,"").replace(",",".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function countEmoji(text, emoji){
    const s = String(text ?? "");
    if(!s) return 0;
    const esc = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (s.match(new RegExp(esc, "g")) || []).length;
  }
  function parseCountCell(value, emoji){
    const n = toNumberLoose(value);
    if(n) return n;
    return countEmoji(value, emoji);
  }

  function normalizePlayers(rows){
    const header = rows[0].map(h=>String(h).trim());
    const idx = (k)=>header.indexOf(k);

    const iName = idx("name");
    const iBuy  = idx("buyin_total");
    const iItm  = idx("itm_total");
    const iCh   = idx("champion_wins");
    const iFo   = idx("first_out");

    if(iName === -1) throw new Error("В CSV нет колонки 'name'. Проверь заголовки.");

    const out = [];
    for(let r=1;r<rows.length;r++){
      const line = rows[r];
      const name = String(line[iName] ?? "").trim();
      if(!name) continue;

      const buy = iBuy >= 0 ? toNumberLoose(line[iBuy]) : 0;
      const itm = iItm >= 0 ? toNumberLoose(line[iItm]) : 0;

      const chRaw = iCh >= 0 ? line[iCh] : 0;
      const foRaw = iFo >= 0 ? line[iFo] : 0;

      const ch  = parseCountCell(chRaw, "🏆");
      const fo  = parseCountCell(foRaw, "🍺");

      out.push({
        name,
        buyin_total: buy,
        itm_total: itm,
        champion_wins: ch,
        first_out: fo,
        profit: itm - buy,
        _key: name,
      });
    }
    return out;
  }

  return {
    parseCSV,
    toNumberLoose,
    normalizePlayers,
  };
})();

window.CSVUtils = CSVUtils;
