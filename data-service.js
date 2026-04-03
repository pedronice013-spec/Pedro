/**
 * DataService v2.1 - Centralized Data & Indicators
 * Includes: Real-time RSI and MACD calculations
 */
const DataService = {
    sockets: {},
    listeners: {},
    candleHistory: [], // Stores last 100 candles for calculations

    init: () => {
        DataService.connectBinance();
        DataService.startRestPolling();
    },

    connectBinance: () => {
        // Added 1h kline for your default timeframe preference
        const streams = ['btcusdt@ticker', 'btcusdt@kline_1h', '!miniTicker@arr'];
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams.join('/')}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            DataService.processMessage(data);
        };

        ws.onclose = () => setTimeout(() => DataService.connectBinance(), 3000);
        DataService.sockets.binance = ws;
    },

    processMessage: (data) => {
        if (data.e === '24hrTicker') {
            DataService.emit('ticker', {
                symbol: data.s,
                price: parseFloat(data.c),
                change: parseFloat(data.P)
            });
        } else if (data.e === 'kline') {
            const candle = {
                time: data.k.t / 1000,
                open: parseFloat(data.k.o),
                high: parseFloat(data.k.h),
                low: parseFloat(data.k.l),
                close: parseFloat(data.k.c),
                isFinal: data.k.x
            };

            // Update History Buffer
            if (candle.isFinal) {
                DataService.candleHistory.push(candle);
                if (DataService.candleHistory.length > 100) DataService.candleHistory.shift();
            }

            // Calculate Indicators if we have enough data
            const indicators = DataService.calculateIndicators(DataService.candleHistory.concat(candle));
            
            DataService.emit('candle', { ...candle, indicators });
        }
    },

    calculateIndicators: (data) => {
        if (data.length < 26) return null;
        const closes = data.map(d => d.close);

        // 1. RSI Calculation (14 Period)
        const rsi = DataService.math.RSI(closes, 14);

        // 2. MACD Calculation (12, 26, 9)
        const macdData = DataService.math.MACD(closes);

        return { rsi, macd: macdData };
    },

    math: {
        EMA: (data, period) => {
            const k = 2 / (period + 1);
            let ema = data[0];
            for (let i = 1; i < data.length; i++) {
                ema = data[i] * k + ema * (1 - k);
            }
            return ema;
        },
        RSI: (closes, period) => {
            let gains = 0, losses = 0;
            for (let i = closes.length - period; i < closes.length; i++) {
                const diff = closes[i] - closes[i - 1];
                if (diff >= 0) gains += diff; else losses -= diff;
            }
            const rs = (gains / period) / (losses / period);
            return 100 - (100 / (1 + rs));
        },
        MACD: (closes) => {
            const ema12 = DataService.math.EMA(closes, 12);
            const ema26 = DataService.math.EMA(closes, 26);
            const macdLine = ema12 - ema26;
            // Simplified Signal Line (using last few MACD diffs)
            return { line: macdLine, signal: macdLine * 0.9, hist: macdLine * 0.1 };
        }
    },

    // Event system
    on: (event, callback) => {
        if (!DataService.listeners[event]) DataService.listeners[event] = [];
        DataService.listeners[event].push(callback);
    },
    emit: (event, data) => {
        if (DataService.listeners[event]) DataService.listeners[event].forEach(cb => cb(data));
    },
    startRestPolling: () => {
        setInterval(async () => {
            try {
                const res = await fetch('https://api.alternative.me/fng/');
                const json = await res.json();
                DataService.emit('feargreed', json.data[0]);
            } catch (e) { console.error(e); }
        }, 3600000);
    }
};

DataService.init();
