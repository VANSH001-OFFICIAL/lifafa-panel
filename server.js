const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'asvr-mint-secret',
    resave: false,
    saveUninitialized: true
}));

// Temporary Database (Memory)
let users = [
    { 
        username: "admin", 
        mobile: "9999999999", 
        password: "123", 
        wallet: { balance: 500.00, recharge: 0, withdraw: 0 } 
    }
];

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views/signup.html')));

// Sign Up with Mobile
app.post('/auth/signup', (req, res) => {
    const { username, mobile, password } = req.body;
    if (users.find(u => u.username === username || u.mobile === mobile)) {
        return res.send('Username or Mobile already exists! <a href="/signup">Try again</a>');
    }
    users.push({ 
        username, 
        mobile, 
        password, 
        wallet: { balance: 0.00, recharge: 0, withdraw: 0 } 
    });
    res.send('ASVR Account Created! <a href="/">Login Now</a>');
});

// Login with Username & Mobile
app.post('/login', (req, res) => {
    const { username, mobile, password } = req.body;
    const user = users.find(u => u.username === username && u.mobile === mobile && u.password === password);
    if (user) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid Details! Make sure Username, Mobile and Password are correct. <a href="/">Try again</a>');
    }
});

// --- API FEATURE: ID to ID Transaction ---
// Use: POST /api/transfer (Requires auth)
app.post('/api/transfer', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { receiverMobile, amount } = req.body;
    const sender = users.find(u => u.username === req.session.username);
    const receiver = users.find(u => u.mobile === receiverMobile);

    const transferAmt = parseFloat(amount);

    if (!receiver) return res.json({ success: false, msg: "Receiver mobile number not found in ASVR!" });
    if (sender.mobile === receiverMobile) return res.json({ success: false, msg: "Cannot send to yourself!" });
    if (transferAmt <= 0 || sender.wallet.balance < transferAmt) return res.json({ success: false, msg: "Insufficient Balance!" });

    // Transaction Logic
    sender.wallet.balance -= transferAmt;
    receiver.wallet.balance += transferAmt;

    res.json({ 
        success: true, 
        msg: `Transferred ₹${transferAmt} to ${receiver.username} successfully!` 
    });
});

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    else res.redirect('/');
});

app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauthorized"});
    const user = users.find(u => u.username === req.session.username);
    res.json({ ...user.wallet, username: user.username, mobile: user.mobile });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ASVR WALLET running on ${PORT}`));
