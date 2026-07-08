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
// DATABASE CONNECTION
// ================================
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB Connected');
    initializeAccount();
})
.catch((err) => {
    console.error('❌ MongoDB Connection Failed');
    console.error(err);
});

// ================================
// ACCOUNT SCHEMA
// ================================
const AccountSchema = new mongoose.Schema({
    _id: String,
    usdBalance: {
        type: Number,
        default: 10000
    },
    bitcoinOwned: {
        type: Number,
        default: 0
    },
    ethereumOwned: {
        type: Number,
        default: 0
    }
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
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

// ================================
// INITIALIZE ACCOUNT
// ================================
async function initializeAccount() {

    try {

        let account = await Account.findById("main_user_wallet");

        if (!account) {

            account = await Account.create({
                _id: "main_user_wallet",
                usdBalance: 10000,
                bitcoinOwned: 0,
                ethereumOwned: 0
            });

            console.log("✅ Wallet Created");

        } else {

            if (account.ethereumOwned === undefined) {
                account.ethereumOwned = 0;
                await account.save();
            }

            console.log("✅ Wallet Loaded");
        }

    } catch (err) {

        console.error(err);

    }

}

// ================================
// ROUTES
// ================================
app.get('/', (req, res) => {

    res.send('Crypto Backend Running');

});

app.get('/api/account', async (req, res) => {

    try {

        const account = await Account.findById("main_user_wallet");

        res.json(account);

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

app.get('/api/transactions', async (req, res) => {

    try {

        const transactions = await Transaction.find().sort({
            timestamp: -1
        });

        res.json(transactions);

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// ================================
// BUY
// ================================
app.post('/api/buy', async (req, res) => {

    try {

        const {
            coinId,
            pricePerCoin,
            purchaseAmount
        } = req.body;

        const account = await Account.findById("main_user_wallet");

        const cost = Number(pricePerCoin) * Number(purchaseAmount);

        if (account.usdBalance < cost) {

            return res.status(400).json({
                success: false,
                message: "Insufficient Funds"
            });

        }

        account.usdBalance -= cost;

        if (coinId === "bitcoin") {

            account.bitcoinOwned += Number(purchaseAmount);

        }

        if (coinId === "ethereum") {

            account.ethereumOwned += Number(purchaseAmount);

        }

        await account.save();

        await Transaction.create({

            coinName: coinId,
            type: "BUY",
            amount: purchaseAmount,
            priceAtTrade: pricePerCoin

        });

        res.json({

            success: true,
            account

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

// ================================
// SELL
// ================================
app.post('/api/sell', async (req, res) => {

    try {

        const {
            coinId,
            pricePerCoin,
            sellAmount
        } = req.body;

        const account = await Account.findById("main_user_wallet");

        if (coinId === "bitcoin") {

            if (account.bitcoinOwned < sellAmount) {

                return res.status(400).json({
                    success: false,
                    message: "Not enough Bitcoin."
                });

            }

            account.bitcoinOwned -= Number(sellAmount);

        }

        if (coinId === "ethereum") {

            if (account.ethereumOwned < sellAmount) {

                return res.status(400).json({
                    success: false,
                    message: "Not enough Ethereum."
                });

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

        res.json({

            success: true,
            account

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {

    console.log(`🚀 Server running on port ${PORT}`);

});
