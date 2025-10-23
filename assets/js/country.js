(function(){
  const params = new URLSearchParams(location.search);
  const code = params.get('code');

  const titleEl = document.getElementById('countryName');
  const officialEl = document.getElementById('countryOfficial');
  const flagImg = document.getElementById('flagImg');
  const coatImg = document.getElementById('coatImg');
  const gridEl = document.getElementById('countryGrid');
  const neighborsSection = document.getElementById('neighborsSection');
  const neighborsEl = document.getElementById('neighbors');

  function field(name, valueHtml){
    return `
      <div class="fact">
        <h4>${name}</h4>
        <p>${valueHtml}</p>
      </div>
    `;
  }

  function link(href, text){
    return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  }

  function joinOrDash(arr){
    if (!arr || arr.length === 0) return '—';
    return arr.join(', ');
  }

  function formatCurrencies(c){
    if (!c) return '—';
    const parts = [];
    for (const [code, obj] of Object.entries(c)){
      parts.push(`${obj.name} (${code}${obj.symbol ? ` ${obj.symbol}` : ''})`);
    }
    return parts.join(', ');
  }

  function formatLanguages(l){
    if (!l) return '—';
    return Object.values(l).join(', ');
  }

  function formatDemonyms(d){
    if (!d) return '—';
    const en = d.en; const fr = d.fr;
    const parts = [];
    if (en) parts.push(`EN: ${en.m} / ${en.f}`);
    if (fr) parts.push(`FR: ${fr.m} / ${fr.f}`);
    return parts.join(' · ');
  }

  function factGrid(country){
    const area = EarthAtlasAPI.formatNumber(country.area);
    const pop = EarthAtlasAPI.formatNumber(country.population);
    const timezones = joinOrDash(country.timezones);
    const tld = joinOrDash(country.tld);

    const idd = country.idd ? `${country.idd.root || ''}${(country.idd.suffixes||[]).join(', ')}` : '—';
    const giniYear = country.gini ? Object.keys(country.gini)[0] : null;
    const gini = giniYear ? `${country.gini[giniYear]} (${giniYear})` : '—';

    const car = country.car ? `${country.car.side} · ${joinOrDash(country.car.signs||[])}` : '—';

    const maps = country.maps ? [
      link(country.maps.googleMaps, 'Google Maps'),
      link(country.maps.openStreetMaps, 'OpenStreetMap'),
    ].filter(Boolean).join(' · ') : '—';

    const latlng = Array.isArray(country.latlng) ? `${country.latlng[0]}, ${country.latlng[1]}` : '—';

    const facts = [
      field('Official name', country.name?.official || '—'),
      field('Capital', joinOrDash(country.capital)),
      field('Region', `${country.region || '—'}${country.subregion ? ` · ${country.subregion}` : ''}`),
      field('Continents', joinOrDash(country.continents)),
      field('Population', pop),
      field('Area', `${area} km²`),
      field('Languages', formatLanguages(country.languages)),
      field('Currencies', formatCurrencies(country.currencies)),
      field('TLD', tld),
      field('Calling code', idd),
      field('Timezones', timezones),
      field('Latitude/Longitude', latlng),
      field('Car', car),
      field('UN member', country.unMember ? 'Yes' : 'No'),
      field('Independent', country.independent != null ? (country.independent ? 'Yes' : 'No') : '—'),
      field('Status', country.status || '—'),
      field('GINI', gini),
      field('Demonyms', formatDemonyms(country.demonyms)),
      field('Start of week', country.startOfWeek || '—'),
      field('Maps', maps),
    ];

    return facts.join('\n');
  }

  function renderNeighbors(country){
    const borders = country.borders || [];
    if (borders.length === 0){ neighborsSection.hidden = true; return; }
    neighborsSection.hidden = false;
    const cached = window.EarthAtlasAPI && EarthAtlasAPI.fetchAllCountries ? null : null;
    // We'll try using cache to avoid extra network: the API helper caches in localStorage
    EarthAtlasAPI.fetchAllCountries().then(all => {
      const map = EarthAtlasAPI.makeCodeToCountryMap(all);
      const chips = borders.map(code => {
        const c = map.get(code);
        const name = c?.name?.common || code;
        const href = `./country.html?code=${encodeURIComponent(code)}`;
        return `<a class="chip" href="${href}">${name}</a>`;
      }).join('');
      neighborsEl.innerHTML = chips;
    }).catch(() => {
      neighborsEl.innerHTML = borders.map(code => `<span class="chip">${code}</span>`).join('');
    });
  }

  async function init(){
    if (!code){
      titleEl.textContent = 'Country not found';
      officialEl.textContent = '';
      return;
    }

    try {
      const country = await EarthAtlasAPI.fetchCountryByCCA3(code);
      const name = country.name?.common || 'Unknown';
      document.title = `Earth Atlas · ${name}`;

      titleEl.textContent = name;
      officialEl.textContent = country.name?.official || '';

      const flag = country.flags?.png || country.flags?.svg || '';
      const coat = country.coatOfArms?.png || country.coatOfArms?.svg || '';
      if (flag) { flagImg.src = flag; flagImg.alt = `Flag of ${name}`; }
      if (coat) { coatImg.src = coat; coatImg.alt = `Coat of arms of ${name}`; }

      gridEl.innerHTML = factGrid(country);
      renderNeighbors(country);
    } catch (e) {
      titleEl.textContent = 'Failed to load country';
      officialEl.textContent = '';
      gridEl.innerHTML = `<p style="color:#e67e80">An error occurred. Please go back.</p>`;
      console.error(e);
    }
  }

  init();
})();
