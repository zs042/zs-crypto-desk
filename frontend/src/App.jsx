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

    // LIVE RENDER PRODUCTION SERVER GATEWAY ROUTE
    const BACKEND_URL = 'https://zs-backend-1nbr.onrender.com';

    const fetchDatabaseAccount = () => {
        fetch(`${BACKEND_URL}/api/account`)
            .then((res) => res.json())
            .then((data) => {
                if (data) {
                    setUsdBalance(data.usdBalance ?? 10000);
                    setBitcoinOwned(data.bitcoinOwned ?? 0);
                    setEthereumOwned(data.ethereumOwned ?? 0);
                }
            })
            .catch((err) => console.error("Account balance link missing:", err));
    };

    const fetchTransactionLogs = () => {
        fetch(`${BACKEND_URL}/api/transactions`)
            .then((res) => res.json())
            .then((logs) => { if (Array.isArray(logs)) setTransactions(logs); })
            .catch((err) => console.error("Ledger connection logs missing:", err));
    };

    // TOP-LEVEL ACTION PIPELINE (UNFROZEN AND VISIBLE TO ALL BUTTONS!)
    const handleTradeExecution = async (coinId, actionType, pricePerCoin) => {
        const quantityAmount = parseFloat(amounts[coinId]);
        if (isNaN(quantityAmount) || quantityAmount <= 0) {
            alert("Please input a valid trade quantity amount greater than 0");
            return;
        }

        try {
            const transactionPayload = {
                coinId: coinId,
                pricePerCoin: pricePerCoin,
                [actionType === 'buy' ? 'purchaseAmount' : 'sellAmount']: quantityAmount
            };

            const serverResponse = await fetch(`${BACKEND_URL}/api/${actionType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionPayload)
            });

            if (!serverResponse.ok) {
                const errorData = await serverResponse.json();
                throw new Error(errorData.message || 'Server transaction pipeline rejection');
            }

            const data = await serverResponse.json();
            if (data.success) {
                setUsdBalance(data.account.usdBalance);
                setBitcoinOwned(data.account.bitcoinOwned);
                setEthereumOwned(data.account.ethereumOwned || 0);
                fetchTransactionLogs();
                alert(`Successfully executed ${actionType.toUpperCase()} order for ${quantityAmount} ${coinId.toUpperCase()}!`);
            } else {
                alert(data.message);
            }
        } catch (networkError) {
            console.error("Execution Failure:", networkError);
            alert(`Transaction Failed: ${networkError.message}`);
        }
    };

    useEffect(() => {
        fetchDatabaseAccount();
        fetchTransactionLogs();

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
                    const mockLivePrices = [
                        { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 92500, price_change_percentage_24h: 3.45 },
                        { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3150, price_change_percentage_24h: -1.20 }
                    ];
                    setCryptoData(mockLivePrices);
                    setLoading(false);
                });
        };

        fetchMarketPrices();
        const priceIntervalId = setInterval(fetchMarketPrices, 5000);
        return () => clearInterval(priceIntervalId);
    }, []);

    const handleAmountChange = (id, value) => {
        setAmounts({ ...amounts, [id]: value });
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
                    {loading ? <p className="text-slate-400 font-mono">Syncing market nodes...</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {cryptoData.map((coin) => (
                                <div key={coin.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-white">{coin.name} <span className="text-sm uppercase text-slate-400 font-normal">({coin.symbol})</span></h3>
                                            <p className="text-2xl font-black font-mono tracking-tight mt-1 text-white">${coin.current_price.toLocaleString()}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono ${coin.price_change_percentage_24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                                        </span>
                                    </div>

                                    <div className="h-24 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={coin.id === 'bitcoin' ? btcHistory : ethHistory}>
                                                <Line type="monotone" dataKey="p" stroke={coin.id === 'bitcoin' ? '#f59e0b' : '#a855f7'} strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Size:</label>
                                            <input 
                                                type="number" 
                                                value={amounts[coin.id] || ''} 
                                                onChange={(e) => handleAmountChange(coin.id, e.target.value)}
                                                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-indigo-500 text-white w-full"

                                                step="0.01"min="0"
                                                />
                                                <button onClick={() => handleTradeExecution(coin.id, 'buy', coin.current_price)}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 
                                                font-bold py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer">
                                                Buy Asset
                                                <button onClick={() => handleTradeExecution(coin.id, 'buy', coin.current_price)}
                                                                                        <tr key={tx._id || index} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 text-slate-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'Recent'}</td>
                                            <td className="py-3 font-bold text-white uppercase">{tx.coinId}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${tx.action === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {tx.action}
                                                </span>
                                            </td>
                                            <td className="py-3">{tx.amount || tx.purchaseAmount || tx.sellAmount}</td>
                                            <td className="py-3 text-slate-400">${(tx.pricePerCoin || 0).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}


            {/* Your Transaction Ledger section sits right here below */}
