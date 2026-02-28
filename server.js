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

// Users ka data store karne ke liye (Database ki jagah memory use ho rahi hai)
let users = []; 

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views/signup.html')));

// Sign Up Logic
app.post('/auth/signup', (req, res) => {
    const { username, password } = req.body;
    const userExists = users.find(u => u.username === username);
    
    if (userExists) {
        return res.send('User already exists! <a href="/signup">Try again</a>');
    }

    // Naya user create karna
    const newUser = {
        username,
        password,
        wallet: { balance: 10.00, recharge: 0, withdraw: 0 } // Default 10rs bonus
    };
    users.push(newUser);
    res.send('Registration Successful! <a href="/">Login Now</a>');
});

// Login Logic
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid Credentials! <a href="/">Try again</a>');
    }
});

// Dashboard Data API
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).json({msg: "Unauthorized"});
    const user = users.find(u => u.username === req.session.username);
    res.json(user.wallet);
});

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    else res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
