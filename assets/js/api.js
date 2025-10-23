// REST Countries API helpers with simple localStorage caching
(function(){
  const API_BASE = 'https://restcountries.com/v3.1';
  const CACHE_KEY = 'countries_cache_v1';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  function now(){ return Date.now(); }

  function readCache(){
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data) || typeof parsed.ts !== 'number') return null;
      if ((now() - parsed.ts) > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (e) { return null; }
  }

  function writeCache(data){
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now(), data }));
    } catch (e) { /* ignore */ }
  }

  async function fetchAllCountries(opts={}){
    const { forceRefresh = false } = opts;
    if (!forceRefresh){
      const cached = readCache();
      if (cached) return cached;
    }
    const res = await fetch(`${API_BASE}/all?fields=name,cca2,cca3,ccn3,capital,region,subregion,continents,population,area,languages,currencies,flags,coatOfArms,idd,tld,latlng,timezones,car,maps,landlocked,borders,unMember,independent,status,gini,demonyms,startOfWeek,altSpellings`);
    if (!res.ok) throw new Error('Failed to fetch countries');
    const data = await res.json();
    // Sort by name for stability
    data.sort((a,b)=> (a.name?.common||'').localeCompare(b.name?.common||''));
    writeCache(data);
    return data;
  }

  async function fetchCountryByCCA3(code){
    const upper = String(code||'').trim().toUpperCase();
    if (!upper) throw new Error('Missing country code');

    const cached = readCache();
    if (cached){
      const found = cached.find(c => c.cca3 === upper);
      if (found) return found;
    }
    const res = await fetch(`${API_BASE}/alpha/${upper}`);
    if (!res.ok) throw new Error('Failed to fetch country');
    const arr = await res.json();
    return Array.isArray(arr) ? arr[0] : arr;
  }

  function indexCountriesByName(countries){
    const index = new Map();
    for (const c of countries){
      const names = new Set();
      if (c.name?.common) names.add(c.name.common);
      if (c.name?.official) names.add(c.name.official);
      if (Array.isArray(c.altSpellings)) for (const a of c.altSpellings) names.add(a);
      if (c.cca2) names.add(c.cca2);
      if (c.cca3) names.add(c.cca3);
      for (const n of names){ index.set(n.toLowerCase(), c); }
    }
    return index;
  }

  function makeCodeToCountryMap(countries){
    const m = new Map();
    for (const c of countries){ if (c.cca3) m.set(c.cca3, c); }
    return m;
  }

  function formatNumber(n){
    try { return new Intl.NumberFormat().format(n); } catch { return String(n); }
  }

  // expose
  window.EarthAtlasAPI = {
    fetchAllCountries,
    fetchCountryByCCA3,
    indexCountriesByName,
    makeCodeToCountryMap,
    formatNumber,
  };
})();
