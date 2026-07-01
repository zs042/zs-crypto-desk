const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// FETCH THE DYNAMIC CLOUD PORT ASSIGNED BY RENDER OR FALLBACK TO 5000 LOCAL
// FORCED PORT OVERRIDE TO SHATTER CLOUD CACHE LOCKS


// OPEN FIREWALL TO PERMIT VERCEL HANDSHAKES LIVE
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// WALLET SCHEMA
const AccountSchema = new mongoose.Schema({
    _id: String,
    usdBalance: Number,
    bitcoinOwned: Number,
    ethereumOwned: Number
});
const Account = mongoose.model('Account', AccountSchema);

// LEDGER SCHEMA
const TransactionSchema = new mongoose.Schema({
    coinName: String,
    type: String,
    amount: Number,
    priceAtTrade: Number,
    timestamp: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

async function initializeAccount() {
    try {
        let existingAccount = await Account.findById("main_user_wallet");
        if (!existingAccount) {
            await Account.create({ _id: "main_user_wallet", usdBalance: 10000, bitcoinOwned: 0, ethereumOwned: 0 });
            console.log("Fresh base account profile initialized inside database!");
        } else {
            if (existingAccount.ethereumOwned === undefined) {
                existingAccount.ethereumOwned = 0;
                await existingAccount.save();
            }
            console.log(`Loaded balance - USD: $${existingAccount.usdBalance}, BTC: ${existingAccount.bitcoinOwned}, ETH: ${existingAccount.ethereumOwned}`);
        }
    } catch (err) {
        console.error("Initialization error:", err.message);
    }
}
initializeAccount();

app.get('/api/account', async (req, res) => {
    try {
        const account = await Account.findById("main_user_wallet");
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const history = await Transaction.find().sort({ timestamp: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// FIX RE-ALIGNED BUY ROUTE
app.post('/api/buy', async (req, res) => {
    const { coinId, pricePerCoin, purchaseAmount } = req.body;
    const cost = pricePerCoin * purchaseAmount;

    try {
        let account = await Account.findById("main_user_wallet");

        if (account.usdBalance >= cost) {
            account.usdBalance -= cost;

            if (coinId === 'bitcoin') {
                account.bitcoinOwned += purchaseAmount;
            } else if (coinId === 'ethereum') {
                account.ethereumOwned += purchaseAmount;
            }

            await account.save();

            // Create ledger receipt record
            await Transaction.create({
                coinName: coinId === 'bitcoin' ? 'Bitcoin' : 'Ethereum',
                type: 'BUY',
                amount: purchaseAmount,
                priceAtTrade: pricePerCoin
            });

            res.json({ success: true, account: account });
        } else {
            res.status(400).json({ success: false, message: "Insufficient Funds on server database!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Database transaction failed!" });
    }
});

// FIX RE-ALIGNED SELL ROUTE
app.post('/api/sell', async (req, res) => {
    const { coinId, pricePerCoin, sellAmount } = req.body;
    const earnings = pricePerCoin * sellAmount;

    try {
        let account = await Account.findById("main_user_wallet");
        let currentCryptoOwned = coinId === 'bitcoin' ? account.bitcoinOwned : account.ethereumOwned;

        if (currentCryptoOwned >= sellAmount) {
            account.usdBalance += earnings;

            if (coinId === 'bitcoin') {
                account.bitcoinOwned -= sellAmount;
            } else if (coinId === 'ethereum') {
                account.ethereumOwned -= sellAmount;
            }

            await account.save();

            // Create ledger receipt record
            await Transaction.create({
                coinName: coinId === 'bitcoin' ? 'Bitcoin' : 'Ethereum',
                type: 'SELL',
                amount: sellAmount,
                priceAtTrade: pricePerCoin
            });

            res.json({ success: true, account: account });
        } else {
            res.status(400).json({ success: false, message: `You do not own enough ${coinId} to complete this trade!` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Database transaction failed!" });
    }
});

const port = process.env.PORT || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend server engine listening cleanly on port ${port}`);
});

