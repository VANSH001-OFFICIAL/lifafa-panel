const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'asvr-secret-key-2026',
    resave: false,
    saveUninitialized: true
}));

// Database Simulation (Memory Storage)
let users = [
    { 
        username: "admin", 
        password: "123", 
        wallet: { balance: 100.50, recharge: 500, withdraw: 400 } 
    }
];

// --- 1. LOGIN & SIGNUP ROUTES ---

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views/signup.html')));

app.post('/auth/signup', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.send('User already exists! <a href="/signup">Try again</a>');
    }
    const newUser = { 
        username, 
        password, 
        wallet: { balance: 0.00, recharge: 0, withdraw: 0 } 
    };
    users.push(newUser);
    res.send('<h1>ASVR WALLET</h1><p>Account Created!</p><a href="/">Login Now</a>');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send('Wrong ID or Password! <a href="/">Try again</a>');
    }
});

// --- 2. DASHBOARD & API ROUTES ---

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    else res.redirect('/');
});

// API to fetch wallet data
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauthorized"});
    const user = users.find(u => u.username === req.session.username);
    res.json({
        username: user.username,
        balance: user.wallet.balance,
        recharge: user.wallet.recharge,
        withdraw: user.wallet.withdraw
    });
});

// API for Withdraw Logic
app.post('/api/withdraw', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauthorized"});
    const { amount } = req.body;
    const user = users.find(u => u.username === req.session.username);

    if (amount > 0 && user.wallet.balance >= amount) {
        user.wallet.balance -= parseFloat(amount);
        user.wallet.withdraw += parseFloat(amount);
        res.json({ success: true });
    } else {
        res.json({ success: false, msg: "Insufficient Funds in ASVR Wallet!" });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Render/Heroku Port setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ASVR WALLET is live on port ${PORT}`);
});
