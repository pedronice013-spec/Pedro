/**
 * Crypto Command Center - News Engine
 * Version: 2.0 (Open Source / RSS / Keyword Sentiment)
 * No API Key Required
 */

const NEWS_CONFIG = {
    // Open-source proxy to bypass CORS restrictions
    PROXY: 'https://api.allorigins.win/get?url=',
    // Target RSS Feed
    FEED_URL: 'https://cointelegraph.com/rss',
    // Refresh every 5 minutes to stay current without spamming
    REFRESH_RATE: 300000 
};

const NewsEngine = {
    // Keywords for Sentiment Analysis
    keywords: {
        positive: ['surge', 'bull', 'gain', 'rally', 'breakout', 'ath', 'high', 'listing', 'adoption', 'growth', 'up'],
        negative: ['crash', 'drop', 'bear', 'fall', 'sec', 'lawsuit', 'hack', 'drain', 'dip', 'plummet', 'ban', 'warning']
    },

    init: () => {
        console.log("Initializing Open Source News Feed...");
        NewsEngine.fetchRSS();
        setInterval(NewsEngine.fetchRSS, NEWS_CONFIG.REFRESH_RATE);
    },

    fetchRSS: async () => {
        const grid = document.getElementById('newsGrid');
        
        try {
            const targetUrl = encodeURIComponent(NEWS_CONFIG.FEED_URL);
            const response = await fetch(`${NEWS_CONFIG.PROXY}${targetUrl}`);
            
            if (!response.ok) throw new Error('Proxy unreachable');
            
            const data = await response.json();
            
            // Parse XML String
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, "text/xml");
            const items = Array.from(xmlDoc.querySelectorAll("item"));

            if (items.length > 0) {
                NewsEngine.renderNews(items);
            } else {
                throw new Error('No items found in feed');
            }
        } catch (err) {
            console.error("RSS Engine Error:", err);
            grid.innerHTML = `
                <div class="col-span-full py-10 text-center border border-dashed border-gray-800 rounded-lg">
                    <p class="text-red-400 font-mono text-sm">FEED_ERROR: Connection to News Server Failed</p>
                    <p class="text-gray-600 text-xs mt-2 italic">Possible CORS proxy timeout. Retrying in 60s...</p>
                </div>`;
        }
    },

    /**
     * Determines sentiment by checking title for keywords
     */
    analyzeSentiment: (text) => {
        const lowerText = text.toLowerCase();
        let score = 0;

        NewsEngine.keywords.positive.forEach(word => { if (lowerText.includes(word)) score++; });
        NewsEngine.keywords.negative.forEach(word => { if (lowerText.includes(word)) score--; });

        if (score > 0) return 'pos';
        if (score < 0) return 'neg';
        return 'neu';
    },

    renderNews: (items) => {
        const grid = document.getElementById('newsGrid');
        
        grid.innerHTML = items.slice(0, 12).map(item => {
            const title = item.querySelector("title").textContent;
            const link = item.querySelector("link").textContent;
            
            // Get Sentiment
            const sentiment = NewsEngine.analyzeSentiment(title);
            const sentimentLabel = sentiment === 'pos' ? 'Bullish' : sentiment === 'neg' ? 'Bearish' : 'Neutral';
            const sentimentColor = sentiment === 'pos' ? 'text-green-400' : sentiment === 'neg' ? 'text-red-400' : 'text-blue-400';

            // Format Date
            const rawDate = item.querySelector("pubDate").textContent;
            const timeStr = new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Clean description (remove HTML tags and limit length)
            let desc = item.querySelector("description").textContent;
            desc = desc.replace(/<[^>]*>/g, '').substring(0, 110) + '...';

            return `
                <article class="glass-panel p-5 news-card sentiment-${sentiment} flex flex-col h-full">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[10px] uppercase tracking-widest text-blue-400 font-bold font-mono">Cointelegraph</span>
                        <span class="text-[10px] text-gray-500 font-mono">${timeStr}</span>
                    </div>
                    
                    <h3 class="text-base font-semibold leading-snug mb-3 hover:text-blue-400 transition-colors">
                        <a href="${link}" target="_blank">${title}</a>
                    </h3>

                    <p class="text-xs text-gray-500 line-clamp-3 mb-4 flex-grow">
                        ${desc}
                    </p>

                    <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                        <span class="text-[9px] px-2 py-0.5 rounded bg-gray-900 border border-white/10 ${sentimentColor} font-bold">
                            ${sentimentLabel}
                        </span>
                        <a href="${link}" target="_blank" class="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-all">
                            LINK <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                    </div>
                </article>
            `;
        }).join('');
    }
};

// Start the engine
document.addEventListener('DOMContentLoaded', NewsEngine.init);
