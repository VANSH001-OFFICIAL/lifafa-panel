const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'asvr-mint-ultra-secret',
    resave: false,
    saveUninitialized: true
}));

// DATABASE (Memory Storage)
let users = [
    { 
        username: "admin", 
        mobile: "1234567890", 
        password: "123", 
        wallet: { balance: 1000.00, recharge: 500, withdraw: 0 },
        history: [] 
    }
];

// ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views/signup.html')));
app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    else res.redirect('/');
});

// SIGNUP LOGIC
app.post('/auth/signup', (req, res) => {
    const { username, mobile, password } = req.body;
    if (users.find(u => u.username === username || u.mobile === mobile)) {
        return res.send('User already exists! <a href="/signup">Try again</a>');
    }
    users.push({ 
        username, mobile, password, 
        wallet: { balance: 0.00, recharge: 0, withdraw: 0 },
        history: [] 
    });
    res.send('<h1>ASVR WALLET</h1><p>Registration Successful!</p><a href="/">Login Now</a>');
});

// LOGIN LOGIC
app.post('/login', (req, res) => {
    const { username, mobile, password } = req.body;
    const user = users.find(u => u.username === username && u.mobile === mobile && u.password === password);
    if (user) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid details! <a href="/">Try again</a>');
    }
});

// DASHBOARD DATA API
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauth"});
    const user = users.find(u => u.username === req.session.username);
    res.json({
        username: user.username,
        mobile: user.mobile,
        balance: user.wallet.balance,
        recharge: user.wallet.recharge,
        withdraw: user.wallet.withdraw,
        history: user.history // Transaction History sent here
    });
});

// ID-TO-ID TRANSFER API
app.post('/api/transfer', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({ success: false });

    const { receiverMobile, amount } = req.body;
    const tAmt = parseFloat(amount);
    const sender = users.find(u => u.username === req.session.username);
    const receiver = users.find(u => u.mobile === receiverMobile);

    if (!receiver || sender.mobile === receiverMobile || sender.wallet.balance < tAmt) {
        return res.json({ success: false, msg: "Transfer Failed: Check balance or mobile." });
    }

    // Process Transfer
    sender.wallet.balance -= tAmt;
    receiver.wallet.balance += tAmt;

    // Save to History
    const tDate = new Date().toLocaleString();
    sender.history.unshift({ type: 'Sent', to: receiver.username, amount: tAmt, date: tDate });
    receiver.history.unshift({ type: 'Received', from: sender.username, amount: tAmt, date: tDate });

    res.json({ success: true, msg: `Sent ₹${tAmt} to ${receiver.username}` });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ASVR Wallet Live on ${PORT}`));
