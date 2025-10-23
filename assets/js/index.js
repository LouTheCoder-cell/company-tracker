(function(){
  const gridEl = document.getElementById('grid');
  const emptyEl = document.getElementById('gridEmpty');
  const searchEl = document.getElementById('search');
  const regionEl = document.getElementById('regionFilter');
  const sortEl = document.getElementById('sortBy');

  let countries = [];
  let filtered = [];

  function uniqueRegions(list){
    const set = new Set();
    for (const c of list){ if (c.region) set.add(c.region); }
    return Array.from(set).sort();
  }

  function countryCard(c){
    const pop = EarthAtlasAPI.formatNumber(c.population);
    const area = EarthAtlasAPI.formatNumber(c.area);
    const region = c.region || '—';
    const flag = c.flags?.png || c.flags?.svg || '';
    const name = c.name?.common || 'Unknown';
    const capital = Array.isArray(c.capital) ? c.capital.join(', ') : (c.capital || '—');
    const url = `./country.html?code=${encodeURIComponent(c.cca3)}`;
    return `
      <a class="card" href="${url}" aria-label="${name}">
        <img class="card-flag" src="${flag}" alt="Flag of ${name}" loading="lazy" />
        <div class="card-body">
          <h3 class="card-title">${name}</h3>
          <div class="card-meta">
            <span>Region: ${region}</span>
            <span>Capital: ${capital}</span>
            <span>Pop: ${pop}</span>
            <span>Area: ${area} km²</span>
          </div>
        </div>
      </a>
    `;
  }

  function render(){
    const html = filtered.map(countryCard).join('');
    gridEl.innerHTML = html;
    const has = filtered.length > 0;
    emptyEl.hidden = has;
  }

  function applyFilters(){
    const q = (searchEl.value || '').trim().toLowerCase();
    const region = regionEl.value;
    const sortBy = sortEl.value;

    filtered = countries.filter(c => {
      if (region && c.region !== region) return false;
      if (!q) return true;
      const name = c.name?.common?.toLowerCase() || '';
      const official = c.name?.official?.toLowerCase() || '';
      const capital = (Array.isArray(c.capital) ? c.capital.join(' ') : (c.capital || '')).toLowerCase();
      const codes = [c.cca2, c.cca3, c.ccn3].filter(Boolean).join(' ').toLowerCase();
      return name.includes(q) || official.includes(q) || capital.includes(q) || codes.includes(q);
    });

    switch (sortBy){
      case 'population':
        filtered.sort((a,b)=> (b.population||0) - (a.population||0));
        break;
      case 'area':
        filtered.sort((a,b)=> (b.area||0) - (a.area||0));
        break;
      default:
        filtered.sort((a,b)=> (a.name?.common||'').localeCompare(b.name?.common||''));
    }

    render();
  }

  async function init(){
    try {
      countries = await EarthAtlasAPI.fetchAllCountries();
      // hydrate regions
      const regions = uniqueRegions(countries);
      for (const r of regions){
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        regionEl.appendChild(opt);
      }
      filtered = [...countries];
      applyFilters();
    } catch (e) {
      gridEl.innerHTML = `<p style="color:#e67e80">Failed to load countries. Please refresh.</p>`;
      console.error(e);
    }
  }

  // listeners
  searchEl.addEventListener('input', applyFilters);
  regionEl.addEventListener('change', applyFilters);
  sortEl.addEventListener('change', applyFilters);

  init();
})();
