const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ================================
// MIDDLEWARE
// ================================
app.use(express.json());

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// ================================
// ACCOUNT SCHEMA
// ================================
const AccountSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    usdBalance: { type: Number, default: 10000 },
    bitcoinOwned: { type: Number, default: 0 },
    ethereumOwned: { type: Number, default: 0 }
});

const Account = mongoose.model('Account', AccountSchema);

// ================================
// TRANSACTION SCHEMA
// ================================
const TransactionSchema = new mongoose.Schema({
    coinName: String,
    type: String,
    amount: Number,
    priceAtTrade: Number,
    timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

// ================================
// INITIALIZE SEED WALLET PROFILES
// ================================
async function initializeAccount() {
    try {
        let account = await Account.findById("main_user_wallet");

        if (!account) {
            console.log("⚠️ No simulation wallet profile detected. Initializing seed container...");
            account = await Account.create({
                _id: "main_user_wallet",
                usdBalance: 10000,
                bitcoinOwned: 0,
                ethereumOwned: 0
            });
            console.log("✅ Simulation Wallet profile generated successfully with $10,000.00!");
        } else {
            if (account.ethereumOwned === undefined) {
                account.ethereumOwned = 0;
                await account.save();
            }
            console.log("✅ Simulation Wallet profile synchronized and loaded cleanly!");
        }
    } catch (err) {
        console.error("❌ Wallet initialization failure block:", err);
    }
}

// ================================
// DATABASE CONNECTION CORE (CLEAN SINGLE HANDSHAKE!)
// ================================
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Network Node Connected Cleanly Across Clusters');
        initializeAccount();
    })
    .catch((err) => {
        console.error('❌ MongoDB Cloud Network Door Handshake Failed');
        console.error(err);
    });

// ================================
// ROUTING APIS
// ================================
app.get('/', (req, res) => {
    res.send('Crypto Full-Stack Simulator Backend Node is active and live.');
});

app.get('/api/account', async (req, res) => {
    try {
        const account = await Account.findById("main_user_wallet");
        res.json(account || { _id: "main_user_wallet", usdBalance: 10000, bitcoinOwned: 0, ethereumOwned: 0 });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ================================
// TRADE ACTION ENGINES: BUY
// ================================
app.post('/api/buy', async (req, res) => {
    try {
        const { coinId, pricePerCoin, purchaseAmount } = req.body;
        let account = await Account.findById("main_user_wallet");

        // Fallback safety generation if a cluster disconnect wiped memory
        if (!account) {
            account = await Account.create({ _id: "main_user_wallet", usdBalance: 10000, bitcoinOwned: 0, ethereumOwned: 0 });
        }

        const cost = Number(pricePerCoin) * Number(purchaseAmount);

        if (account.usdBalance < cost) {
            return res.status(400).json({ success: false, message: "Insufficient simulation funds to clear trade cost." });
        }

        account.usdBalance -= cost;

        if (coinId === "bitcoin") {
            account.bitcoinOwned += Number(purchaseAmount);
        } else if (coinId === "ethereum") {
            account.ethereumOwned += Number(purchaseAmount);
        }

        await account.save();

        await Transaction.create({
            coinName: coinId,
            type: "BUY",
            amount: purchaseAmount,
            priceAtTrade: pricePerCoin
        });

        res.json({ success: true, account });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ================================
// TRADE ACTION ENGINES: SELL
// ================================
app.post('/api/sell', async (req, res) => {
    try {
        const { coinId, pricePerCoin, sellAmount } = req.body;
        let account = await Account.findById("main_user_wallet");

        if (!account) {
            return res.status(404).json({ success: false, message: "Simulation Wallet profile missing." });
        }

        if (coinId === "bitcoin") {
            if (account.bitcoinOwned < sellAmount) {
                return res.status(400).json({ success: false, message: "Insufficient asset volume: Not enough Bitcoin." });
            }
            account.bitcoinOwned -= Number(sellAmount);
        } else if (coinId === "ethereum") {
            if (account.ethereumOwned < sellAmount) {
                return res.status(400).json({ success: false, message: "Insufficient asset volume: Not enough Ethereum." });
            }
            account.ethereumOwned -= Number(sellAmount);
        }

        account.usdBalance += Number(pricePerCoin) * Number(sellAmount);
        await account.save();

        await Transaction.create({
            coinName: coinId,
            type: "SELL",
            amount: sellAmount,
            priceAtTrade: pricePerCoin
        });

        res.json({ success: true, account });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ================================
// FLUID PROCESS THREAD LISTENER
// ================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Crypto Server Network Engine running smoothly live on cloud gateway port ${PORT}`);
});
