const ChartEngine = {
    charts: {},
    series: {},
    timeframe: '1h',

    init: () => {
        ChartEngine.setupPriceChart();
        ChartEngine.setupIndicatorCharts();
        ChartEngine.bindData();
    },

    setupPriceChart: () => {
        const container = document.getElementById('priceChart');
        ChartEngine.charts.price = LightweightCharts.createChart(container, {
            layout: { background: { color: 'transparent' }, textColor: '#9ca3af' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
            timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true }
        });

        ChartEngine.series.candles = ChartEngine.charts.price.addCandlestickSeries({
            upColor: '#10b981', downColor: '#ef4444',
            borderUpColor: '#10b981', borderDownColor: '#ef4444',
            wickUpColor: '#10b981', wickDownColor: '#ef4444'
        });
    },

    setupIndicatorCharts: () => {
        // RSI Chart Setup
        const rsiCtx = document.getElementById('rsiChart').getContext('2d');
        ChartEngine.charts.rsi = new Chart(rsiCtx, {
            type: 'line',
            data: { labels: Array(50).fill(''), datasets: [{ data: [], borderColor: '#8b5cf6', borderWidth: 2, pointRadius: 0, fill: false }] },
            options: ChartEngine.indicatorOptions(100, 0, 70, 30)
        });

        // MACD Chart Setup
        const macdCtx = document.getElementById('macdChart').getContext('2d');
        ChartEngine.charts.macd = new Chart(macdCtx, {
            type: 'bar',
            data: { labels: Array(50).fill(''), datasets: [{ data: [], backgroundColor: '#3b82f6' }] },
            options: ChartEngine.indicatorOptions()
        });
    },

    indicatorOptions: (max, min, overbought, oversold) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { 
                max, min,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { display: false }
            },
            x: { display: false }
        }
    }),

    bindData: () => {
        DataService.on('candle', (data) => {
            // Update Price Chart
            ChartEngine.series.candles.update(data);
            
            // Update Live Ticker
            document.getElementById('liveTicker').textContent = `$${data.close.toLocaleString()}`;

            // Update Indicators if they exist in DataService
            if (data.indicators) {
                ChartEngine.updateIndicators(data.indicators);
            }
        });
    },

    updateIndicators: (ind) => {
        // RSI Update
        const rsiData = ChartEngine.charts.rsi.data.datasets[0].data;
        rsiData.push(ind.rsi);
        if (rsiData.length > 50) rsiData.shift();
        ChartEngine.charts.rsi.update('none');

        // MACD Update
        const macdData = ChartEngine.charts.macd.data.datasets[0].data;
        macdData.push(ind.macd.hist);
        if (macdData.length > 50) macdData.shift();
        ChartEngine.charts.macd.update('none');
    },

    switchTF: (tf) => {
        ChartEngine.timeframe = tf;
        // Logic to clear and refetch Binance data for the new timeframe
        location.reload(); 
    }
};

document.addEventListener('DOMContentLoaded', ChartEngine.init);
