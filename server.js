const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Middleware: Form data aur JSON handle karne ke liye
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session: Login state yaad rakhne ke liye
app.use(session({
    secret: 'vsv-secret-key-123',
    resave: false,
    saveUninitialized: true
}));

// Temporary Database (Memory mein save hoga)
let users = [
    { username: "admin", password: "123", wallet: { balance: 100.00, recharge: 0, withdraw: 0 } }
];

// --- ROUTES ---

// 1. Home / Login Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

// 2. Sign Up Page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/signup.html'));
});

// 3. Register Logic (POST /auth/signup)
app.post('/auth/signup', (req, res) => {
    const { username, password } = req.body;
    const userExists = users.find(u => u.username === username);
    
    if (userExists) {
        return res.send('User already exists! <a href="/signup">Try again</a>');
    }

    const newUser = {
        username,
        password,
        wallet: { balance: 0.07, recharge: 0, withdraw: 0 } 
    };
    users.push(newUser);
    res.send('Account Created! <a href="/">Login Now</a>');
});

// 4. Login Logic (POST /login) - Fix for "Cannot POST /login"
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send('Wrong ID/Password! <a href="/">Try again</a>');
    }
});

// 5. Dashboard (Protected)
app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    } else {
        res.redirect('/');
    }
});

// 6. Dashboard Data API
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauthorized"});
    const user = users.find(u => u.username === req.session.username);
    res.json(user.wallet);
});

// 7. Withdraw Logic
app.post('/api/withdraw', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauthorized"});
    
    const { amount } = req.body;
    const user = users.find(u => u.username === req.session.username);

    if (amount > 0 && user.wallet.balance >= amount) {
        user.wallet.balance -= parseFloat(amount);
        user.wallet.withdraw += parseFloat(amount);
        res.json({ success: true });
    } else {
        res.json({ success: false, msg: "Balance kam hai!" });
    }
});

// 8. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
