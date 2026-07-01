import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export default function App() {
    const [usdBalance, setUsdBalance] = useState(10000);
    const [bitcoinOwned, setBitcoinOwned] = useState(0);
    const [ethereumOwned, setEthereumOwned] = useState(0);
    const [amounts, setAmounts] = useState({ bitcoin: '0.1', ethereum: '1.0' });
    const [cryptoData, setCryptoData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);

    const btcHistory = [{ p: 91200 }, { p: 91500 }, { p: 90800 }, { p: 91900 }, { p: 92100 }, { p: 91700 }, { p: 92300 }, { p: 92500 }];
    const ethHistory = [{ p: 3210 }, { p: 3190 }, { p: 3230 }, { p: 3180 }, { p: 3140 }, { p: 3160 }, { p: 3120 }, { p: 3150 }];

    const fetchDatabaseAccount = () => {
        fetch('https://onrender.com')
            .then((res) => res.json())
            .then((data) => {
                if (data) {
                    setUsdBalance(data.usdBalance);
                    setBitcoinOwned(data.bitcoinOwned);
                    setEthereumOwned(data.ethereumOwned || 0);
                }
            })
            .catch((err) => console.error(err));
    };

    const fetchTransactionLogs = () => {
        fetch('https://onrender.com')
            .then((res) => res.json())
            .then((logs) => { if (Array.isArray(logs)) setTransactions(logs); })
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        // 1. Fetch our permanent account balance data right away on load
        fetchDatabaseAccount();
        fetchTransactionLogs();

        // 2. Separate logic to fetch market price metrics
        const fetchMarketPrices = () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            fetch('https://coingecko.com', { signal: controller.signal })
                .then((response) => response.json())
                .then((data) => {
                    clearTimeout(timeoutId);
                    if (Array.isArray(data) && data.length > 0) {
                        setCryptoData(data);
                        setLoading(false);
                    } else {
                        throw new Error("API rate-limited");
                    }
                })
                .catch((error) => {
                    clearTimeout(timeoutId);
                    // Fallback static ticker values if API caps hit us while building
                    const mockLivePrices = [
                        { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', image: 'https://coingecko.com', current_price: 92500, price_change_percentage_24h: 3.45 },
                        { id: 'ethereum', name: 'Ethereum', symbol: 'eth', image: 'https://coingecko.com', current_price: 3150, price_change_percentage_24h: -1.20 }
                    ];
                    setCryptoData(mockLivePrices);
                    setLoading(false);
                });
        };

        // Run the price check immediately on startup
        fetchMarketPrices();

        // AUTOMATED REAL-TIME CRON TIMER: Fetch prices every 5 seconds (5000 milliseconds)
        const priceIntervalId = setInterval(() => {
            fetchMarketPrices();
        }, 5000);

        // Clean up timer memory if the user navigates away
        return () => clearInterval(priceIntervalId);
    }, []);


    const handleAmountChange = (id, value) => {
        setAmounts({ ...amounts, [id]: value });
    };

    const handleTrade = (action, coinId, pricePerCoin) => {
        const amount = parseFloat(amounts[coinId]);
        if (isNaN(amount) || amount <= 0) return alert("Enter valid amount");

        fetch(`http://localhost:5000/api/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coinId, pricePerCoin, [action === 'buy' ? 'purchaseAmount' : 'sellAmount']: amount })
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setUsdBalance(data.account.usdBalance);
                    setBitcoinOwned(data.account.bitcoinOwned);
                    setEthereumOwned(data.account.ethereumOwned);
                    fetchTransactionLogs();
                } else {
                    alert(data.message);
                }
            })
            .catch((err) => console.error(err));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
            <div className="max-w-6xl mx-auto space-y-8">

                <header className="flex justify-between items-center border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">ApexTrader Crypto Desk</h1>
                        <p className="text-sm text-slate-400 mt-1">Institutional Simulation Node v2.0</p>
                    </div>
                </header>

                <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">Available Capital</h2>
                        <p className="text-3xl font-black font-mono tracking-tight text-white">${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-amber-500">Bitcoin Allocation</h2>
                        <p className="text-3xl font-black font-mono tracking-tight text-white">{bitcoinOwned.toFixed(4)} <span className="text-lg font-medium text-amber-500">BTC</span></p>
                    </div>
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400">Ethereum Allocation</h2>
                        <p className="text-3xl font-black font-mono tracking-tight text-white">{ethereumOwned.toFixed(4)} <span className="text-lg font-medium text-purple-400">ETH</span></p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-slate-200">Spot Order Books</h2>
                    {loading ? <p>Loading...</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {cryptoData.map((coin) => (
                                <div key={coin.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-6">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold text-white uppercase">{coin.name} ({coin.symbol})</h3>
                                        <span className={`text-sm font-mono px-2 py-1 rounded ${coin.price_change_percentage_24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{coin.price_change_percentage_24h}%</span>
                                    </div>

                                    <div className="h-16 w-full opacity-60">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={coin.id === 'bitcoin' ? btcHistory : ethHistory}>
                                                <Line type="monotone" dataKey="p" stroke={coin.price_change_percentage_24h >= 0 ? '#10B981' : '#EF4444'} strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div>
                                        <span className="text-xs text-slate-500 uppercase">Spot Price</span>
                                        <p className="text-4xl font-black font-mono text-slate-100">${coin.current_price.toLocaleString()}</p>
                                    </div>

                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase text-slate-400">Trade Size</label>
                                            <input type="number" step="0.01" value={amounts[coin.id] || ''} onChange={(e) => handleAmountChange(coin.id, e.target.value)} className="bg-slate-900 border border-slate-700 text-white font-mono font-bold text-right px-3 py-1.5 rounded-lg w-32 outline-none text-sm focus:border-indigo-500" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => handleTrade('buy', coin.id, coin.current_price)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 rounded-xl">Buy</button>
                                            <button onClick={() => handleTrade('sell', coin.id, coin.current_price)} className="bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2 rounded-xl">Sell</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-slate-200">Transaction Ledger</h2>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        {transactions.length === 0 ? <p className="text-sm text-slate-500 italic text-center py-4">No audit trails recorded yet.</p> : (
                            <div className="max-h-60 overflow-y-auto space-y-2.5">
                                {transactions.map((tx) => (
                                    <div key={tx._id} className={`flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800 ${tx.type === 'BUY' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-500'}`}>
                                        <div>
                                            <span className={`text-xs font-mono font-black mr-2 ${tx.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>[{tx.type}]</span>
                                            <span className="text-sm">{tx.amount} {tx.coinName} at ${tx.priceAtTrade.toLocaleString()}</span>
                                        </div>
                                        <span className="text-xs font-mono text-slate-500">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
}
