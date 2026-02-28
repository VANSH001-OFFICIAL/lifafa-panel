const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'asvr-full-system-2026',
    resave: false,
    saveUninitialized: true
}));

// --- DATABASE SIMULATION ---
let users = [
    { username: "admin", mobile: "1234567890", password: "123", role: "admin", wallet: { balance: 5000, recharge: 0, withdraw: 0 }, history: [] }
];
let tasks = []; // Admin tasks
let submissions = []; // User submissions

// --- AUTH ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views/signup.html')));

app.post('/login', (req, res) => {
    const { loginId, password } = req.body;
    const user = users.find(u => (u.username === loginId || u.mobile === loginId) && u.password === password);
    if (user) {
        req.session.loggedin = true;
        req.session.username = user.username;
        req.session.role = user.role;
        res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
    } else {
        res.send('Invalid Credentials! <a href="/">Back</a>');
    }
});

app.post('/auth/signup', (req, res) => {
    const { username, mobile, password } = req.body;
    if (users.find(u => u.username === username || u.mobile === mobile)) return res.send('User exists! <a href="/signup">Back</a>');
    users.push({ username, mobile, password, role: "user", wallet: { balance: 0, recharge: 0, withdraw: 0 }, history: [] });
    res.send('Account Created! <a href="/">Login</a>');
});

// --- ADMIN APIs ---
app.get('/admin', (req, res) => (req.session.loggedin && req.session.role === 'admin') ? res.sendFile(path.join(__dirname, 'views/admin.html')) : res.redirect('/'));

app.post('/api/admin/add-task', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({success:false});
    const { title, link, amount, desc } = req.body;
    tasks.push({ id: Date.now(), title, link, amount: parseFloat(amount), desc });
    res.json({ success: true });
});

app.get('/api/admin/submissions', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json([]);
    res.json(submissions);
});

app.post('/api/admin/approve-task', (req, res) => {
    const { subId, action } = req.body;
    const sub = submissions.find(s => s.subId == subId);
    if (!sub || sub.status !== 'Pending') return res.json({ success: false });

    if (action === 'Approve') {
        const user = users.find(u => u.username === sub.username);
        user.wallet.balance += sub.amount;
        user.history.unshift({ type: 'Task Reward', from: 'Admin', amount: sub.amount, date: new Date().toLocaleString() });
        sub.status = 'Approved';
    } else { sub.status = 'Rejected'; }
    res.json({ success: true });
});

// --- USER APIs ---
app.get('/dashboard', (req, res) => req.session.loggedin ? res.sendFile(path.join(__dirname, 'views/dashboard.html')) : res.redirect('/'));

app.get('/api/data', (req, res) => {
    const user = users.find(u => u.username === req.session.username);
    res.json({ ...user.wallet, username: user.username, mobile: user.mobile, history: user.history });
});

app.get('/api/tasks', (req, res) => res.json(tasks));

app.post('/api/user/submit-task', (req, res) => {
    const { taskId, telegram, ssLink } = req.body;
    const task = tasks.find(t => t.id == taskId);
    submissions.push({ subId: Date.now(), taskId, taskTitle: task.title, amount: task.amount, username: req.session.username, telegram, ssLink, status: 'Pending' });
    res.json({ success: true });
});

app.post('/api/transfer', (req, res) => {
    const { receiverMobile, amount } = req.body;
    const tAmt = parseFloat(amount);
    const sender = users.find(u => u.username === req.session.username);
    const receiver = users.find(u => u.mobile === receiverMobile);

    if (!receiver || sender.mobile === receiverMobile || sender.wallet.balance < tAmt) return res.json({ success: false, msg: "Failed" });

    sender.wallet.balance -= tAmt;
    receiver.wallet.balance += tAmt;
    const tDate = new Date().toLocaleString();
    sender.history.unshift({ type: 'Sent', to: receiver.username, amount: tAmt, date: tDate });
    receiver.history.unshift({ type: 'Received', from: sender.username, amount: tAmt, date: tDate });
    res.json({ success: true, msg: "Transfer Done" });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ASVR running on ${PORT}`));
