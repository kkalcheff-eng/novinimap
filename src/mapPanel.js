// src/mapPanel.js
import { NewsMapService } from './newsMapService.js';

const newsService = new NewsMapService();
let map = null;
let markers = [];
let allArticles = [];
let activeFilter = 'all';
let searchQuery = '';

export async function initMapPanel(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="map-panel-header">
      <div class="header-left">
        <h2>КАРТА НА НОВИНИТЕ: БЪЛГАРИЯ</h2>
        <span class="live-counter-badge" id="newsStats">Зареждане...</span>
      </div>
      <div class="header-right">
        <button id="refreshNewsBtn" class="refresh-btn" title="Обнови емисията">
          ↻ ОБНОВИ
        </button>
      </div>
    </div>

    <div class="map-side-by-side">
      <div class="map-container-wrapper">
        <div class="map-container" id="leafletMap"></div>
        <div class="map-legend">
          <span class="legend-item"><span class="legend-dot cyan"></span> Локация / Град</span>
          <span class="legend-item"><span class="legend-dot red"></span> 💀 Критично / Инцидент</span>
          <span class="legend-item"><span class="legend-tag">№</span> Брой новини в клъстера</span>
        </div>
      </div>

      <div class="news-feed">
        <div class="news-feed-controls">
          <div class="search-box-wrapper">
            <input 
              type="text" 
              id="newsSearchInput" 
              placeholder="🔍 Търси по град, ключова дума или източник..." 
              class="news-search-input"
            />
          </div>
          <div class="filter-chips" id="filterChipsContainer">
            <button class="filter-chip active" data-filter="all">Всички</button>
            <button class="filter-chip" data-filter="located">📍 С локация</button>
            <button class="filter-chip" data-filter="lethal">💀 Критични</button>
          </div>
        </div>

        <div id="newsList" class="news-list">
          ${renderSkeletons()}
        </div>
      </div>
    </div>
  `;

  // Attach controls & init
  setTimeout(() => {
    initLeafletMap();
    loadNews();

    const searchInput = document.getElementById('newsSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilterAndRender();
      });
    }

    const chipsContainer = document.getElementById('filterChipsContainer');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter || 'all';
        applyFilterAndRender();
      });
    }

    const refreshBtn = document.getElementById('refreshNewsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('rotating');
        const newsList = document.getElementById('newsList');
        if (newsList) newsList.innerHTML = renderSkeletons();
        loadNews(true).finally(() => {
          refreshBtn.classList.remove('rotating');
        });
      });
    }
  }, 120);
}

function renderSkeletons() {
  let html = '';
  for (let i = 0; i < 7; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton-line title skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line short skeleton"></div>
      </div>
    `;
  }
  return html;
}

function initLeafletMap() {
  const mapElement = document.getElementById('leafletMap');
  if (!mapElement) return;

  if (!map) {
    // OpenStreetMap official tiles (100% Free, Zero API Key Required)
    map = L.map('leafletMap', {
      center: [42.7339, 25.4858],
      zoom: 7,
      zoomControl: true,
      minZoom: 6,
      maxZoom: 18
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    window.addEventListener('resize', () => {
      if (map) map.invalidateSize();
    });
  }

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);
}

async function loadNews(force = false) {
  const newsList = document.getElementById('newsList');
  const statsBadge = document.getElementById('newsStats');

  try {
    const items = await newsService.fetchTrendingNews(force);
    allArticles = items || [];

    updateCityFilterChips();
    applyFilterAndRender();
  } catch (error) {
    console.error('[loadNews] Error:', error);
    if (newsList) {
      newsList.innerHTML = `<div class="error-state">Грешка при зареждане. Натиснете ↻ ОБНОВИ.</div>`;
    }
    if (statsBadge) statsBadge.textContent = 'Грешка';
  }
}

function updateCityFilterChips() {
  const chipsContainer = document.getElementById('filterChipsContainer');
  if (!chipsContainer || allArticles.length === 0) return;

  const clusters = newsService.getCityClusters(allArticles);
  const topCities = Object.keys(clusters)
    .sort((a, b) => clusters[b].count - clusters[a].count)
    .slice(0, 6);

  const locatedCount = allArticles.filter(a => a.location).length;
  const lethalCount = allArticles.filter(a => a.isLethal).length;

  let chipsHtml = `
    <button class="filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">Всички (${allArticles.length})</button>
    <button class="filter-chip ${activeFilter === 'located' ? 'active' : ''}" data-filter="located">📍 С локация (${locatedCount})</button>
    <button class="filter-chip ${activeFilter === 'lethal' ? 'active' : ''}" data-filter="lethal">💀 Критични (${lethalCount})</button>
  `;

  topCities.forEach(city => {
    const isSelected = activeFilter === `city:${city}`;
    chipsHtml += `
      <button class="filter-chip city-chip ${isSelected ? 'active' : ''}" data-filter="city:${city}">
        ${city} (${clusters[city].count})
      </button>
    `;
  });

  chipsContainer.innerHTML = chipsHtml;
}

function applyFilterAndRender() {
  const newsList = document.getElementById('newsList');
  const statsBadge = document.getElementById('newsStats');

  let filtered = allArticles;

  // Category filter
  if (activeFilter === 'located') {
    filtered = filtered.filter(a => a.location);
  } else if (activeFilter === 'lethal') {
    filtered = filtered.filter(a => a.isLethal);
  } else if (activeFilter.startsWith('city:')) {
    const cityName = activeFilter.replace('city:', '');
    filtered = filtered.filter(a => a.location && a.location.name === cityName);
  }

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(a => {
      const matchTitle = (a.title || '').toLowerCase().includes(searchQuery);
      const matchSummary = (a.summary || '').toLowerCase().includes(searchQuery);
      const matchSource = (a.source || '').toLowerCase().includes(searchQuery);
      const matchCity = a.location ? a.location.name.toLowerCase().includes(searchQuery) : false;
      return matchTitle || matchSummary || matchSource || matchCity;
    });
  }

  if (statsBadge) {
    const locatedTotal = allArticles.filter(a => a.location).length;
    statsBadge.textContent = `${filtered.length} новини (${locatedTotal} на картата)`;
  }

  renderNewsList(filtered, newsList);
  renderMapClusters(allArticles);
}

function renderMapClusters(items) {
  if (!map) return;

  // Clear existing markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const clusters = newsService.getCityClusters(items);

  Object.values(clusters).forEach(cluster => {
    const { name, coords, count, hasLethal, articles } = cluster;

    const markerHtml = `
      <div class="city-marker-cluster ${hasLethal ? 'is-lethal' : ''}">
        <div class="cluster-icon-wrapper">
          <span class="cluster-emoji">${hasLethal ? '💀' : '📍'}</span>
          <span class="cluster-count-tag ${count > 1 ? 'multi' : ''}">${count}</span>
        </div>
        <div class="cluster-city-label">${name}</div>
        <div class="cluster-pulse-ring"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'cluster-leaflet-icon',
      iconSize: [80, 50],
      iconAnchor: [40, 25]
    });

    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

    // Build rich multi-article popup
    const articlesListHtml = articles.slice(0, 8).map(art => `
      <div class="popup-article-item ${art.isLethal ? 'lethal' : ''}">
        <div class="popup-article-meta">
          <span class="popup-source-pill">${art.source}</span>
          <span class="popup-time">${art.timestamp}</span>
          ${art.isLethal ? '<span class="popup-alert-tag">💀 КРИТИЧНО</span>' : ''}
        </div>
        <div class="popup-article-title">${art.title}</div>
        <a href="${art.link}" target="_blank" class="popup-article-link">Прочети цялата новина →</a>
      </div>
    `).join('');

    const popupContent = `
      <div class="map-popup-cluster">
        <div class="popup-cluster-header">
          <div class="popup-header-title">
            <span class="popup-header-icon">${hasLethal ? '💀' : '📍'}</span>
            <strong>${name}</strong>
          </div>
          <span class="popup-cluster-badge">${count} ${count === 1 ? 'новина' : 'новини'}</span>
        </div>
        <div class="popup-articles-container">
          ${articlesListHtml}
        </div>
        ${articles.length > 8 ? `<div class="popup-more-notice">+ още ${articles.length - 8} новини за ${name} в емисията</div>` : ''}
      </div>
    `;

    marker.addTo(map).bindPopup(popupContent, {
      maxWidth: 290,
      className: 'cluster-custom-popup'
    });

    markers.push(marker);
    cluster._marker = marker;
  });
}

function renderNewsList(items, container) {
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-news-state">
        <div class="empty-icon">📰</div>
        <div class="empty-title">Няма намерени новини</div>
        <div class="empty-subtitle">Опитайте с друг филтър или изчистете търсенето.</div>
      </div>
    `;
    return;
  }

  const clusters = newsService.getCityClusters(allArticles);

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `news-card ${item.isLethal ? 'card-lethal' : ''}`;

    let locationBadge = '';
    if (item.location) {
      const cityName = item.location.name;
      const cityTotal = clusters[cityName] ? clusters[cityName].count : 1;
      const tagText = cityTotal > 1 ? `📍 ${cityName} (${cityTotal} в града)` : `📍 ${cityName}`;

      locationBadge = `
        <div class="location-badge ${item.isLethal ? 'badge-lethal' : ''}">
          ${item.isLethal ? '⚠️ ' : ''}${tagText}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="news-header-row">
        <span class="source-tag">${item.source}</span>
        <span class="news-time">${item.timestamp}</span>
        ${item.isLethal ? '<span class="lethal-pill">💀 КРИТИЧНО</span>' : ''}
      </div>
      <div class="news-title">${item.title}</div>
      ${item.summary ? `<div class="news-summary">${item.summary}</div>` : ''}
      <div class="news-card-footer">
        ${locationBadge}
        <a href="${item.link}" target="_blank" class="card-read-link" title="Отвори статията">Отвори ↗</a>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-read-link')) return;

      if (item.location && map) {
        map.flyTo([item.location.coords.lat, item.location.coords.lng], 11, {
          animate: true,
          duration: 1.2
        });

        // Find and open cluster marker
        const cityMarker = markers.find(m => {
          const latLng = m.getLatLng();
          return Math.abs(latLng.lat - item.location.coords.lat) < 0.01 &&
                 Math.abs(latLng.lng - item.location.coords.lng) < 0.01;
        });

        if (cityMarker) {
          setTimeout(() => cityMarker.openPopup(), 450);
        }
      } else if (item.link && item.link !== '#') {
        window.open(item.link, '_blank');
      }
    });

    container.appendChild(card);
  });
}
