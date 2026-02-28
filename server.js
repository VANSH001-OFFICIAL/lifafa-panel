const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// --- MIDDLEWARE CONFIGURATION ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'asvr-full-secure-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours session
}));

// --- DATABASE (In-Memory) ---
// Isme Username, Mobile aur Password teeno store honge
let users = [
    { 
        username: "admin", 
        mobile: "1234567890", 
        password: "123", 
        wallet: { balance: 1000.00, recharge: 500, withdraw: 0 } 
    }
];

// --- 1. AUTHENTICATION ROUTES ---

// Login Page load karna
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

// Signup Page load karna
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/signup.html'));
});

// Naya Account banana (Signup Logic)
app.post('/auth/signup', (req, res) => {
    const { username, mobile, password } = req.body;

    // Check agar user pehle se exist karta hai
    const existingUser = users.find(u => u.username === username || u.mobile === mobile);
    if (existingUser) {
        return res.send('Error: Username or Mobile already registered! <a href="/signup">Try again</a>');
    }

    // Naya user object
    const newUser = {
        username: username,
        mobile: mobile,
        password: password,
        wallet: { balance: 0.00, recharge: 0, withdraw: 0 }
    };

    users.push(newUser);
    console.log("New User Registered:", username);
    res.send('<h1>ASVR WALLET</h1><p>Account Created Successfully!</p><a href="/">Login Now</a>');
});

// Login check karna (Username + Mobile + Password)
app.post('/login', (req, res) => {
    const { username, mobile, password } = req.body;
    
    const user = users.find(u => 
        u.username === username && 
        u.mobile === mobile && 
        u.password === password
    );

    if (user) {
        req.session.loggedin = true;
        req.session.username = username;
        req.session.mobile = mobile;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid Credentials! Check Username, Mobile and Password. <a href="/">Go Back</a>');
    }
});

// --- 2. DASHBOARD & WALLET API ---

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    } else {
        res.redirect('/');
    }
});

// Dashboard ka data bhejna
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauth"});
    
    const user = users.find(u => u.username === req.session.username);
    res.json({
        username: user.username,
        mobile: user.mobile,
        balance: user.wallet.balance,
        recharge: user.wallet.recharge,
        withdraw: user.wallet.withdraw
    });
});

// --- 3. ID TO ID TRANSFER (THE MAIN API FEATURE) ---
app.post('/api/transfer', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({ success: false, msg: "Login Required" });

    const { receiverMobile, amount } = req.body;
    const transferAmount = parseFloat(amount);

    const sender = users.find(u => u.username === req.session.username);
    const receiver = users.find(u => u.mobile === receiverMobile);

    // Validations
    if (!receiver) {
        return res.json({ success: false, msg: "Receiver Mobile not found in ASVR System!" });
    }
    if (sender.mobile === receiverMobile) {
        return res.json({ success: false, msg: "Self-transfer not allowed!" });
    }
    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.json({ success: false, msg: "Invalid Amount!" });
    }
    if (sender.wallet.balance < transferAmount) {
        return res.json({ success: false, msg: "Insufficient ASVR Balance!" });
    }

    // Processing Transaction
    sender.wallet.balance -= transferAmount;
    receiver.wallet.balance += transferAmount;

    console.log(`Transfer: ${sender.username} -> ${receiver.username} | Amount: ${transferAmount}`);

    res.json({ 
        success: true, 
        msg: `Successfully transferred ₹${transferAmount} to ${receiver.username} (${receiver.mobile})` 
    });
});

// Logout logic
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Port Setting for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ASVR WALLET SERVER STARTED ON PORT ${PORT}`);
});
