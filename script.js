// === Constants ===
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const FNG_API_URL = 'https://api.alternative.me/fng';
const NEWS_API_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
const REFRESH_INTERVAL = 300000; // 5 minutes

// === State Variables ===
let autoRefresh = true;
let chartType = 'line';
let fgDays = 7;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
let fgChart = null;

// === Utility Functions ===
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const formatCurrency = (value, currency) => {
  const symbols = { usd: '$', eur: '€', gbp: '£', jpy: '¥', aud: 'A$', cad: 'C$' };
  const symbol = symbols[currency.toLowerCase()] || currency.toUpperCase();
  return `${symbol}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const showError = (elementId, message) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<p class="error">⚠️ ${message}</p>`;
  }
};

const updateLastUpdateTime = () => {
  const element = document.getElementById('last-update');
  if (element) {
    element.textContent = new Date().toLocaleTimeString();
  }
};

// === Fetch Functions ===
const fetchTopMovers = async () => {
  const url = `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch top movers');
    const data = await res.json();

    const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    updateTopMoversUI(sorted.slice(0, 5), sorted.slice(-5).reverse());
  } catch (err) {
    console.error('Error fetching top movers:', err);
    showError('gainers', 'Unable to load top gainers');
    showError('losers', 'Unable to load top losers');
  }
};

const fetchMarketStats = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/global`);
    if (!res.ok) throw new Error('Failed to fetch market stats');
    const data = await res.json();

    updateMarketStatsUI(data.data);
  } catch (err) {
    console.error('Error fetching market stats:', err);
    showError('market-stats', 'Unable to load market statistics');
  }
};

const fetchCryptoPrices = async () => {
  const currency = document.getElementById('currencySelector')?.value || 'usd';
  const query = document.getElementById('coinSearch')?.value.toLowerCase() || '';
  
  const url = `${API_BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=50&sparkline=true&price_change_percentage=24h`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch crypto prices');
    const data = await res.json();

    const filtered = data.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.symbol.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    );
    
    updateCryptoPricesUI(filtered, currency);
    updatePortfolioValue(data, currency);
  } catch (err) {
    console.error('Error fetching crypto prices:', err);
    showError('crypto-prices', 'Unable to load cryptocurrency prices');
  }
};

const fetchFearGreed = async () => {
  try {
    const res = await fetch(`${FNG_API_URL}/?limit=${fgDays}`);
    if (!res.ok) throw new Error('Failed to fetch Fear & Greed data');
    const data = await res.json();

    updateFearGreedUI(data.data);
    renderFearGreedChart(data.data);
  } catch (err) {
    console.error('Error fetching Fear & Greed:', err);
    showError('fear-greed', 'Unable to load Fear & Greed Index');
  }
};

const fetchCryptoNews = async () => {
  try {
    const res = await fetch(NEWS_API_URL);
    if (!res.ok) throw new Error('Failed to fetch news');
    const data = await res.json();

    updateNewsUI(data.Data.slice(0, 10));
  } catch (err) {
    console.error('Error fetching news:', err);
    showError('news-feed', 'Unable to load news feed');
  }
};

const fetchSentiment = async () => {
  // Using news data as sentiment proxy
  try {
    const res = await fetch(NEWS_API_URL);
    if (!res.ok) throw new Error('Failed to fetch sentiment data');
    const data = await res.json();

    updateSentimentUI(data.Data.slice(0, 5));
  } catch (err) {
    console.error('Error fetching sentiment:', err);
    showError('sentiment', 'Unable to load sentiment analysis');
  }
};

// === UI Update Functions ===
const updateTopMoversUI = (gainers, losers) => {
  const gainersDiv = document.getElementById('gainers');
  const losersDiv = document.getElementById('losers');

  gainersDiv.innerHTML = '<h3>🚀 Top Gainers</h3>';
  losersDiv.innerHTML = '<h3>📉 Top Losers</h3>';

  gainers.forEach(coin => {
    const change = coin.price_change_percentage_24h.toFixed(2);
    gainersDiv.innerHTML += `
      <p>
        <strong>${coin.name}</strong> 
        <span class="symbol">(${coin.symbol.toUpperCase()})</span>
        <span class="green">+${change}%</span>
      </p>
    `;
  });

  losers.forEach(coin => {
    const change = coin.price_change_percentage_24h.toFixed(2);
    losersDiv.innerHTML += `
      <p>
        <strong>${coin.name}</strong> 
        <span class="symbol">(${coin.symbol.toUpperCase()})</span>
        <span class="red">${change}%</span>
      </p>
    `;
  });
};

const updateMarketStatsUI = (stats) => {
  const marketCap = Number(stats.total_market_cap.usd).toLocaleString(undefined, { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0 
  });
  
  const volume = Number(stats.total_volume.usd).toLocaleString(undefined, { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0 
  });
  
  const btcDom = stats.market_cap_percentage.btc.toFixed(2);
  const ethDom = stats.market_cap_percentage.eth.toFixed(2);

  document.getElementById('market-stats').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Total Market Cap</h4>
        <p class="stat-value">${marketCap}</p>
      </div>
      <div class="stat-card">
        <h4>24h Volume</h4>
        <p class="stat-value">${volume}</p>
      </div>
      <div class="stat-card">
        <h4>BTC Dominance</h4>
        <p class="stat-value">${btcDom}%</p>
      </div>
      <div class="stat-card">
        <h4>ETH Dominance</h4>
        <p class="stat-value">${ethDom}%</p>
      </div>
    </div>
  `;
};

const updateCryptoPricesUI = (coins, currency) => {
  const container = document.getElementById('crypto-prices');
  
  if (coins.length === 0) {
    container.innerHTML = '<p>No coins found matching your search.</p>';
    return;
  }

  container.innerHTML = '<div class="crypto-grid"></div>';
  const grid = container.querySelector('.crypto-grid');

  coins.forEach(coin => {
    const changeClass = coin.price_change_percentage_24h >= 0 ? 'green' : 'red';
    const isFav = favorites.includes(coin.id);
    const changeSign = coin.price_change_percentage_24h >= 0 ? '+' : '';

    const card = document.createElement('div');
    card.className = 'crypto-box';
    card.innerHTML = `
      <div class="crypto-header">
        <span class="favorite" data-id="${coin.id}" title="Toggle favorite">
          ${isFav ? '★' : '☆'}
        </span>
        <img src="${coin.image}" alt="${coin.name} logo" width="24" height="24" />
        <h3>${coin.name} <span class="symbol">(${coin.symbol.toUpperCase()})</span></h3>
      </div>
      <p class="price ${changeClass}">${formatCurrency(coin.current_price, currency)}</p>
      <p class="change">24h: <span class="${changeClass}">${changeSign}${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
      <p class="market-cap">Market Cap: ${formatCurrency(coin.market_cap, currency)}</p>
    `;
    
    card.querySelector('.favorite').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(coin.id);
    });
    
    grid.appendChild(card);
  });
};

const updateFearGreedUI = (data) => {
  const current = data[0];
  const yesterday = data[1];
  
  const change = current.value - yesterday.value;
  const changeText = change > 0 ? `↑ ${change.toFixed(0)}` : `↓ ${Math.abs(change).toFixed(0)}`;
  const changeClass = change >= 0 ? 'green' : 'red';

  document.getElementById('fear-greed').innerHTML = `
    <div class="fg-display">
      <div class="fg-value">
        <span class="fg-number">${current.value}</span>
        <span class="fg-label">${current.value_classification}</span>
      </div>
      <p class="fg-change">
        Change from yesterday: <span class="${changeClass}">${changeText}</span>
      </p>
      <p class="fg-timestamp">Updated: ${new Date(current.timestamp * 1000).toLocaleString()}</p>
    </div>
  `;
};

const renderFearGreedChart = (data) => {
  const ctx = document.getElementById('fgChart');
  if (!ctx) return;

  const reversedData = [...data].reverse();
  const labels = reversedData.map(d => new Date(d.timestamp * 1000).toLocaleDateString());
  const values = reversedData.map(d => parseInt(d.value));

  // Destroy previous chart if exists
  if (fgChart) {
    fgChart.destroy();
  }

  fgChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: 'Fear & Greed Index',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: chartType === 'line' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.6)',
        tension: 0.4,
        fill: chartType === 'line'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
};

const updateNewsUI = (articles) => {
  const container = document.getElementById('news-feed');
  
  if (!articles || articles.length === 0) {
    container.innerHTML = '<p>No news available at the moment.</p>';
    return;
  }

  container.innerHTML = '';
  
  articles.forEach(article => {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    newsCard.innerHTML = `
      <img src="${article.imageurl || 'https://via.placeholder.com/150'}" alt="${article.title}" />
      <div class="news-content">
        <h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
        <p>${article.body.substring(0, 150)}...</p>
        <div class="news-meta">
          <span class="news-source">${article.source}</span>
          <span class="news-time">${new Date(article.published_on * 1000).toLocaleDateString()}</span>
        </div>
      </div>
    `;
    container.appendChild(newsCard);
  });
};

const updateSentimentUI = (articles) => {
  const container = document.getElementById('sentiment');
  
  if (!articles || articles.length === 0) {
    container.innerHTML = '<p>No sentiment data available.</p>';
    return;
  }

  // Calculate simple sentiment based on article categories
  const positiveKeywords = ['surge', 'gain', 'rally', 'bullish', 'up', 'rise', 'soar'];
  const negativeKeywords = ['drop', 'fall', 'crash', 'bearish', 'down', 'decline', 'plunge'];
  
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  articles.forEach(article => {
    const text = (article.title + ' ' + article.body).toLowerCase();
    const hasPositive = positiveKeywords.some(word => text.includes(word));
    const hasNegative = negativeKeywords.some(word => text.includes(word));
    
    if (hasPositive && !hasNegative) positive++;
    else if (hasNegative && !hasPositive) negative++;
    else neutral++;
  });

  const total = articles.length;
  const posPercent = ((positive / total) * 100).toFixed(0);
  const negPercent = ((negative / total) * 100).toFixed(0);
  const neuPercent = ((neutral / total) * 100).toFixed(0);

  container.innerHTML = `
    <div class="sentiment-display">
      <div class="sentiment-bar">
        <div class="sentiment-positive" style="width: ${posPercent}%">
          <span>😊 ${posPercent}%</span>
        </div>
        <div class="sentiment-neutral" style="width: ${neuPercent}%">
          <span>😐 ${neuPercent}%</span>
        </div>
        <div class="sentiment-negative" style="width: ${negPercent}%">
          <span>😟 ${negPercent}%</span>
        </div>
      </div>
      <p class="sentiment-note">Based on recent news headlines (last 5 articles)</p>
    </div>
  `;
};

// === Event Handlers ===
const toggleFavorite = (coinId) => {
  if (favorites.includes(coinId)) {
    favorites = favorites.filter(id => id !== coinId);
  } else {
    favorites.push(coinId);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  fetchCryptoPrices();
};

const toggleTheme = () => {
  document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
};

// === Portfolio Functions ===
const updatePortfolio = () => {
  const list = document.getElementById('portfolio-list');
  
  if (!list) return;
  
  if (portfolio.length === 0) {
    list.innerHTML = '<p class="empty-portfolio">No coins in portfolio. Add some above!</p>';
    return;
  }
  
  list.innerHTML = '';
  
  portfolio.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'portfolio-item';
    div.innerHTML = `
      <span class="portfolio-coin">${item.name.toUpperCase()}</span>
      <span class="portfolio-quantity">${item.quantity}</span>
      <button class="remove-btn" onclick="removeFromPortfolio(${index})">🗑️ Remove</button>
    `;
    list.appendChild(div);
  });
  
  localStorage.setItem('portfolio', JSON.stringify(portfolio));
  fetchCryptoPrices(); // Update values
};

const updatePortfolioValue = async (coins, currency) => {
  let totalValue = 0;
  
  portfolio.forEach(item => {
    const coin = coins.find(c => c.id === item.name.toLowerCase() || c.symbol.toLowerCase() === item.name.toLowerCase());
    if (coin) {
      totalValue += coin.current_price * item.quantity;
    }
  });
  
  const totalElement = document.getElementById('total-value');
  if (totalElement) {
    totalElement.textContent = formatCurrency(totalValue, currency);
  }
};

window.removeFromPortfolio = (index) => {
  portfolio.splice(index, 1);
  updatePortfolio();
};

// === Refresh All Data ===
const refreshAllData = () => {
  fetchTopMovers();
  fetchMarketStats();
  fetchCryptoPrices();
  fetchFearGreed();
  fetchCryptoNews();
  fetchSentiment();
  updateLastUpdateTime();
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Auto refresh toggle
  document.getElementById('autoRefreshToggle')?.addEventListener('change', (e) => {
    autoRefresh = e.target.checked;
  });

  // Currency selector
  document.getElementById('currencySelector')?.addEventListener('change', fetchCryptoPrices);

  // Chart type selector
  document.getElementById('chartType')?.addEventListener('change', (e) => {
    chartType = e.target.value;
    fetchFearGreed();
  });

  // Days selector
  document.getElementById('fgDays')?.addEventListener('change', (e) => {
    fgDays = parseInt(e.target.value);
    fetchFearGreed();
  });

  // Search with debounce
  document.getElementById('coinSearch')?.addEventListener('input', debounce(fetchCryptoPrices, 500));

  // Portfolio form
  document.getElementById('portfolio-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('coin-name');
    const quantityInput = document.getElementById('coin-quantity');
    
    const name = nameInput.value.trim().toLowerCase();
    const quantity = parseFloat(quantityInput.value);
    
    if (name && quantity > 0) {
      // Check if coin already exists
      const existingIndex = portfolio.findIndex(item => item.name === name);
      if (existingIndex >= 0) {
        portfolio[existingIndex].quantity += quantity;
      } else {
        portfolio.push({ name, quantity });
      }
      
      updatePortfolio();
      nameInput.value = '';
      quantityInput.value = '';
    }
  });

  // Initial data fetch
  refreshAllData();
  updatePortfolio();

  // Auto refresh interval
  setInterval(() => {
    if (autoRefresh) {
      refreshAllData();
    }
  }, REFRESH_INTERVAL);
});
