const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'asvr-admin-ultra-safe',
    resave: false,
    saveUninitialized: true
}));

// --- DATABASE (Memory Storage) ---
let users = [
    { 
        username: "admin", 
        mobile: "1234567890", 
        password: "123", 
        role: "admin", // Admin Role
        wallet: { balance: 5000.00, recharge: 1000, withdraw: 0 },
        history: [] 
    },
    { 
        username: "user1", 
        mobile: "0000000000", 
        password: "123", 
        role: "user", 
        wallet: { balance: 10.00, recharge: 0, withdraw: 0 },
        history: [] 
    }
];

// --- AUTH ROUTES ---

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views/signup.html')));

// Flexible Login: Username YA Mobile se login karein
app.post('/login', (req, res) => {
    const { loginId, password } = req.body; // loginId can be username or mobile
    const user = users.find(u => (u.username === loginId || u.mobile === loginId) && u.password === password);
    
    if (user) {
        req.session.loggedin = true;
        req.session.username = user.username;
        req.session.role = user.role;
        
        // Redirect based on Role
        if (user.role === 'admin') res.redirect('/admin');
        else res.redirect('/dashboard');
    } else {
        res.send('Invalid Credentials! <a href="/">Try again</a>');
    }
});

app.post('/auth/signup', (req, res) => {
    const { username, mobile, password } = req.body;
    if (users.find(u => u.username === username || u.mobile === mobile)) {
        return res.send('User already exists! <a href="/signup">Try again</a>');
    }
    users.push({ 
        username, mobile, password, role: "user",
        wallet: { balance: 0.00, recharge: 0, withdraw: 0 },
        history: [] 
    });
    res.send('ASVR Account Created! <a href="/">Login Now</a>');
});

// --- ADMIN PANEL ROUTES ---

app.get('/admin', (req, res) => {
    if (req.session.loggedin && req.session.role === 'admin') {
        res.sendFile(path.join(__dirname, 'views/admin.html'));
    } else {
        res.redirect('/');
    }
});

// Admin API to get all users
app.get('/api/admin/users', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Forbidden");
    res.json(users);
});

// --- USER DASHBOARD ROUTES ---

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    else res.redirect('/');
});

app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauth"});
    const user = users.find(u => u.username === req.session.username);
    res.json({ ...user.wallet, username: user.username, mobile: user.mobile, history: user.history });
});

// --- TRANSFER API ---
app.post('/api/transfer', (req, res) => {
    const { receiverMobile, amount } = req.body;
    const tAmt = parseFloat(amount);
    const sender = users.find(u => u.username === req.session.username);
    const receiver = users.find(u => u.mobile === receiverMobile);

    if (!receiver || sender.mobile === receiverMobile || sender.wallet.balance < tAmt) {
        return res.json({ success: false, msg: "Failed" });
    }

    sender.wallet.balance -= tAmt;
    receiver.wallet.balance += tAmt;
    const tDate = new Date().toLocaleString();
    sender.history.unshift({ type: 'Sent', to: receiver.username, amount: tAmt, date: tDate });
    receiver.history.unshift({ type: 'Received', from: sender.username, amount: tAmt, date: tDate });

    res.json({ success: true, msg: `Sent ₹${tAmt}` });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ASVR WALLET running on ${PORT}`));
