// Simple in-browser Geo AI assistant. No external LLM calls; constrained rules.
(function(){
  // The assistant answers geography-only questions using REST Countries data where possible.
  // It refuses non-geographic queries. It can compare countries, populations, regions, capitals, neighbors, timezones, etc.

  const root = document.getElementById('geo-ai-root');
  if (!root) return;

  function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

  const ui = el(`
    <div class="geo-ai" aria-live="polite">
      <button class="launcher" aria-label="Open Geo AI">💬</button>
      <div class="panel" role="dialog" aria-label="Geo AI assistant">
        <header>
          <p class="title">Geo AI · geography-only Q&A</p>
          <button class="launcher" aria-label="Close">×</button>
        </header>
        <div class="messages" id="geoMsgs"></div>
        <div class="composer">
          <input id="geoInput" type="text" placeholder="Ask about countries, capitals, neighbors…" autocomplete="off" />
          <button class="send" id="geoSend">Ask</button>
          <p class="hint">Answers are for informational, geographic purposes only.</p>
        </div>
      </div>
    </div>
  `);

  root.appendChild(ui);

  const openBtn = ui.querySelectorAll('.launcher')[0];
  const closeBtn = ui.querySelectorAll('.launcher')[1];
  const panel = ui.querySelector('.panel');
  const msgs = ui.querySelector('#geoMsgs');
  const input = ui.querySelector('#geoInput');
  const sendBtn = ui.querySelector('#geoSend');

  function addMsg(text, who){
    const node = el(`<div class="msg ${who}"></div>`);
    node.textContent = text;
    msgs.appendChild(node);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function normalize(s){ return (s||'').trim().toLowerCase(); }

  function startsWithAny(s, arr){ return arr.some(p => s.startsWith(p)); }

  function softIncludesAny(s, arr){ return arr.some(p => s.includes(p)); }

  function isGeoQuestion(q){
    const banned = ['code', 'program', 'weather today', 'stock', 'recipe', 'login', 'password', 'crypto', 'movie', 'song', 'poem', 'medical', 'legal'];
    if (softIncludesAny(q, banned)) return false;
    const allow = ['country', 'capital', 'population', 'area', 'region', 'continent', 'neighbor', 'border', 'timezone', 'time zone', 'language', 'currency', 'tld', 'phone', 'calling code', 'map', 'where', 'city', 'cca2', 'cca3'];
    return softIncludesAny(q, allow);
  }

  function parseComparison(q){
    const between = q.split(/ vs | versus | compare /);
    if (between.length === 2) return between.map(s => s.trim());
    return null;
  }

  function isOnCountryPage(){ return location.pathname.endsWith('country.html'); }

  function mentionCountry(c){ return c?.name?.common || c?.name?.official || c?.cca3 || 'the country'; }

  function answerForCountry(c, q){
    const lc = q;
    if (lc.includes('capital')) return `${mentionCountry(c)}: capital is ${Array.isArray(c.capital) ? c.capital.join(', ') : (c.capital || '—')}.`;
    if (lc.includes('population')) return `${mentionCountry(c)}: population ${EarthAtlasAPI.formatNumber(c.population)}.`;
    if (lc.includes('area')) return `${mentionCountry(c)}: area ${EarthAtlasAPI.formatNumber(c.area)} km².`;
    if (lc.includes('region') || lc.includes('continent')) return `${mentionCountry(c)}: region ${c.region || '—'}${c.subregion ? ` · ${c.subregion}` : ''}; continents: ${(c.continents||[]).join(', ') || '—'}.`;
    if (lc.includes('language')) return `${mentionCountry(c)}: languages ${(c.languages ? Object.values(c.languages).join(', ') : '—')}.`;
    if (lc.includes('currency')) return `${mentionCountry(c)}: currencies ${(c.currencies ? Object.entries(c.currencies).map(([k,v])=>`${v.name} (${k}${v.symbol?` ${v.symbol}`:''})`).join(', ') : '—')}.`;
    if (lc.includes('neighbor') || lc.includes('border')) return `${mentionCountry(c)}: borders ${(c.borders||[]).join(', ') || 'none'}.`;
    if (lc.includes('timezone')) return `${mentionCountry(c)}: timezones ${(c.timezones||[]).join(', ') || '—'}.`;
    if (lc.includes('phone') || lc.includes('calling') || lc.includes('tld') || lc.includes('cca2') || lc.includes('cca3')){
      const cc = c.idd ? `${c.idd.root||''}${(c.idd.suffixes||[]).join(',')}` : '—';
      return `${mentionCountry(c)}: TLD ${(c.tld||[]).join(', ')||'—'}; calling ${cc}; codes ${[c.cca2,c.cca3,c.ccn3].filter(Boolean).join(', ')}.`;
    }
    return null;
  }

  function fuzzyFindCountryByText(indexByName, text){
    const key = normalize(text);
    // Direct match
    const direct = indexByName.get(key);
    if (direct) return direct;
    // Fuzzy: find first whose name includes token
    for (const [k, c] of indexByName.entries()){
      if (k.includes(key)) return c;
    }
    return null;
  }

  async function respond(q){
    const question = normalize(q);
    if (!question){ return; }
    if (!isGeoQuestion(question)){
      addMsg('I can only answer geography-related questions about countries and places.', 'bot');
      return;
    }

    try {
      const all = await EarthAtlasAPI.fetchAllCountries();
      const indexByName = EarthAtlasAPI.indexCountriesByName(all);

      // comparison?
      const cmp = parseComparison(question);
      if (cmp){
        const a = fuzzyFindCountryByText(indexByName, cmp[0]);
        const b = fuzzyFindCountryByText(indexByName, cmp[1]);
        if (!a || !b){ addMsg('I could not identify one or both countries.', 'bot'); return; }
        const diff = [
          `${mentionCountry(a)} vs ${mentionCountry(b)}`,
          `Population: ${EarthAtlasAPI.formatNumber(a.population)} vs ${EarthAtlasAPI.formatNumber(b.population)}`,
          `Area: ${EarthAtlasAPI.formatNumber(a.area)} km² vs ${EarthAtlasAPI.formatNumber(b.area)} km²`,
          `Capital: ${(a.capital||[]).join(', ')||'—'} vs ${(b.capital||[]).join(', ')||'—'}`,
          `Region: ${a.region||'—'} vs ${b.region||'—'}`,
        ].join('\n');
        addMsg(diff, 'bot');
        return;
      }

      // single-country intent: try to detect a country name within the question
      const tokens = question.split(/,|\?|\.|;|\s+/).filter(Boolean).slice(0, 6);
      let found = null;
      for (const t of tokens){
        const c = indexByName.get(t);
        if (c){ found = c; break; }
      }
      if (!found && isOnCountryPage()){
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        if (code) found = await EarthAtlasAPI.fetchCountryByCCA3(code);
      }

      if (found){
        const a = answerForCountry(found, question) || `${mentionCountry(found)} is in the region ${found.region||'—'}${found.subregion?` · ${found.subregion}`:''} with capital ${(found.capital||[]).join(', ')||'—'} and population ${EarthAtlasAPI.formatNumber(found.population)}.`;
        addMsg(a, 'bot');
        return;
      }

      // broader question: try keyword-based aggregation
      if (question.includes('largest') && (question.includes('area') || question.includes('land'))){
        const sorted = [...all].sort((a,b)=> (b.area||0) - (a.area||0));
        const top = sorted.slice(0, 5).map(c => `${c.name?.common}: ${EarthAtlasAPI.formatNumber(c.area)} km²`).join('\n');
        addMsg(`Largest by area (top 5):\n${top}`, 'bot');
        return;
      }
      if (question.includes('most') && question.includes('population')){
        const sorted = [...all].sort((a,b)=> (b.population||0) - (a.population||0));
        const top = sorted.slice(0, 5).map(c => `${c.name?.common}: ${EarthAtlasAPI.formatNumber(c.population)}`).join('\n');
        addMsg(`Most populous (top 5):\n${top}`, 'bot');
        return;
      }

      addMsg('Try asking about capitals, population, area, borders, languages, or compare like "France vs Germany".', 'bot');
    } catch (e){
      console.error(e);
      addMsg('I had trouble accessing country data right now.', 'bot');
    }
  }

  openBtn.addEventListener('click', ()=> panel.classList.add('open'));
  closeBtn.addEventListener('click', ()=> panel.classList.remove('open'));
  sendBtn.addEventListener('click', ()=> { const v = input.value; input.value = ''; if (v){ addMsg(v, 'user'); respond(v); } });
  input.addEventListener('keydown', (e)=> { if (e.key === 'Enter'){ sendBtn.click(); } });
})();
