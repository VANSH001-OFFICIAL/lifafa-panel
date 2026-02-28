const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'vsv-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Dummy Data (Database ki jagah)
const ADMIN_USER = { user: "admin", pass: "12345" };
let wallet = { balance: 0.07, recharge: 0, withdraw: 0 };

// Login Route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.user && password === ADMIN_USER.pass) {
        req.session.loggedin = true;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid Username or Password! <a href="/">Try again</a>');
    }
});

// Middleware to protect dashboard
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) next();
    else res.redirect('/');
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/dashboard', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'views/dashboard.html')));

// API for Dashboard Data
app.get('/api/data', checkAuth, (req, res) => res.json(wallet));

app.post('/api/withdraw', checkAuth, (req, res) => {
    const { amount } = req.body;
    if (amount <= wallet.balance) {
        wallet.balance -= amount;
        wallet.withdraw += parseFloat(amount);
        res.json({ success: true });
    } else {
        res.json({ success: false, msg: "Insufficient Funds" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
