/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Local Express & SQLite Server (Zero External Dependencies)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'iet-mca-freshers-2026-super-secret-key';
const ADMIN_EMAIL = 'utkrashtu@gmail.com';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend files
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'freshers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to local SQLite database at freshers.db');
  }
});

// Database Promise Helpers
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Setup SQLite Schema & Seed Initial Admin
async function initDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      mobile TEXT,
      gender TEXT,
      consent_agreed INTEGER DEFAULT 0,
      consent_agreed_at TEXT,
      avatar_url TEXT DEFAULT 'assets/avatars/av1.svg',
      avatar_type TEXT DEFAULT 'preset',
      role TEXT DEFAULT 'student',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      utr_number TEXT UNIQUE NOT NULL,
      amount REAL DEFAULT 200.00,
      payment_mobile TEXT,
      screenshot_url TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      approved_at TEXT,
      reviewed_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS passes (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      payment_id TEXT,
      pass_code TEXT UNIQUE NOT NULL,
      qr_payload TEXT,
      issued_at TEXT DEFAULT (datetime('now')),
      is_used INTEGER DEFAULT 0,
      scanned_at TEXT,
      scanned_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
    )
  `);

  // Seed default Admin user if not present
  const admin = await dbGet('SELECT * FROM users WHERE lower(email) = ?', [ADMIN_EMAIL.toLowerCase()]);
  if (!admin) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminId = 'admin-' + Date.now();
    await dbRun(
      `INSERT INTO users (id, email, password_hash, full_name, mobile, gender, consent_agreed, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminId, ADMIN_EMAIL.toLowerCase(), adminPasswordHash, 'Chief Coordinator (Admin)', '9105802148', 'male', 1, 'admin']
    );
    console.log(`[Admin Seeded] Email: ${ADMIN_EMAIL} | Default Password: admin123`);
  }
}

initDatabase().catch(console.error);

// Auth Token Helper
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Authentication Middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

// Admin Check Middleware
function requireAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
    return next();
  }
  return res.status(403).json({ error: 'Administrator access required' });
}

// ========================================================
// AUTHENTICATION ROUTES
// ========================================================

// Pre-signup Duplicate Check
app.get('/api/auth/check', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    const mobile = (req.query.mobile || '').trim();

    let emailExists = false;
    let mobileExists = false;

    if (email) {
      const row = await dbGet('SELECT id FROM users WHERE lower(email) = ?', [email]);
      if (row) emailExists = true;
    }

    if (mobile) {
      const row = await dbGet('SELECT id FROM users WHERE mobile = ?', [mobile]);
      if (row) mobileExists = true;
    }

    res.json({ emailExists, mobileExists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, mobile, gender, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = (mobile || '').trim();

    // Check existing
    const existingEmail = await dbGet('SELECT id FROM users WHERE lower(email) = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    if (cleanMobile) {
      const existingMobile = await dbGet('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
      if (existingMobile) {
        return res.status(400).json({ error: 'This mobile number is already registered.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const role = cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student';

    await dbRun(
      `INSERT INTO users (id, email, password_hash, full_name, mobile, gender, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanEmail, passwordHash, name.trim(), cleanMobile, gender || 'prefer_not_to_say', role]
    );

    const newUser = await dbGet('SELECT id, email, full_name, mobile, gender, consent_agreed, avatar_url, avatar_type, role, created_at FROM users WHERE id = ?', [userId]);
    const token = generateToken(newUser);

    res.json({ token, user: newUser });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT * FROM users WHERE lower(email) = ?', [cleanEmail]);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      mobile: user.mobile,
      gender: user.gender,
      consent_agreed: Boolean(user.consent_agreed),
      consent_agreed_at: user.consent_agreed_at,
      avatar_url: user.avatar_url,
      avatar_type: user.avatar_type,
      role: user.role,
      created_at: user.created_at
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Current User (Session verification)
app.get('/api/auth/me', authenticate, (req, res) => {
  const u = req.user;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      mobile: u.mobile,
      gender: u.gender,
      consent_agreed: Boolean(u.consent_agreed),
      consent_agreed_at: u.consent_agreed_at,
      avatar_url: u.avatar_url,
      avatar_type: u.avatar_type,
      role: u.role,
      created_at: u.created_at
    }
  });
});

// Reset Password Request / Direct Update
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT id FROM users WHERE lower(email) = ?', [cleanEmail]);
    if (!user) {
      return res.status(404).json({ error: 'Account with this email was not found.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// PROFILE & CONSENT ROUTES
// ========================================================

// Update Mandatory Consent
app.put('/api/profile/consent', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();
    await dbRun('UPDATE users SET consent_agreed = 1, consent_agreed_at = ? WHERE id = ?', [now, userId]);
    const updated = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile Avatar (Preset or Uploaded file)
app.post('/api/profile/avatar', authenticate, upload.single('avatarFile'), async (req, res) => {
  try {
    const userId = req.user.id;
    let avatarUrl = req.body.avatarUrl || 'assets/avatars/av1.svg';
    let avatarType = req.body.avatarType || 'preset';

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
      avatarType = 'upload';
    }

    await dbRun('UPDATE users SET avatar_url = ?, avatar_type = ? WHERE id = ?', [avatarUrl, avatarType, userId]);
    res.json({ success: true, avatarUrl, avatarType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// PAYMENT ROUTES
// ========================================================

// Check Duplicate UTR in real-time
app.get('/api/payments/check-utr', async (req, res) => {
  try {
    const utr = (req.query.utr || '').trim().toUpperCase();
    if (!utr) return res.json({ exists: false });

    const payment = await dbGet('SELECT id, user_id FROM payments WHERE upper(utr_number) = ?', [utr]);
    res.json({ exists: Boolean(payment) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Current Student Payment Status
app.get('/api/payments/me', authenticate, async (req, res) => {
  try {
    const payment = await dbGet('SELECT * FROM payments WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1', [req.user.id]);
    res.json({ payment: payment || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Payment with Screenshot Proof
app.post('/api/payments', authenticate, upload.single('screenshot'), async (req, res) => {
  try {
    const userId = req.user.id;
    const utrNumber = (req.body.utrNumber || '').trim().toUpperCase();
    const paymentMobile = (req.body.paymentMobile || req.user.mobile || '').trim();

    if (!utrNumber || utrNumber.length < 6) {
      return res.status(400).json({ error: 'Valid UTR / Transaction ID is required.' });
    }

    // Atomic duplicate check
    const existing = await dbGet('SELECT id, user_id FROM payments WHERE upper(utr_number) = ?', [utrNumber]);
    if (existing && existing.user_id !== userId) {
      return res.status(400).json({ error: 'Transaction ID already exists. Please provide a different Transaction ID.' });
    }

    let screenshotUrl = '';
    if (req.file) {
      screenshotUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.screenshotDataUrl) {
      // Base64 fallback if uploaded via canvas or client reader
      screenshotUrl = req.body.screenshotDataUrl;
    }

    if (!screenshotUrl) {
      return res.status(400).json({ error: 'Payment screenshot proof is required.' });
    }

    const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    // Check if user already submitted a payment before
    const userPrevPayment = await dbGet('SELECT id FROM payments WHERE user_id = ?', [userId]);

    if (userPrevPayment) {
      // Update existing record for resubmissions
      await dbRun(
        `UPDATE payments
         SET utr_number = ?, payment_mobile = ?, screenshot_url = ?, status = 'pending', admin_note = NULL, submitted_at = ?
         WHERE user_id = ?`,
        [utrNumber, paymentMobile, screenshotUrl, now, userId]
      );
    } else {
      await dbRun(
        `INSERT INTO payments (id, user_id, utr_number, amount, payment_mobile, screenshot_url, status, submitted_at)
         VALUES (?, ?, ?, 200.00, ?, ?, 'pending', ?)`,
        [paymentId, userId, utrNumber, paymentMobile, screenshotUrl, now]
      );
    }

    const savedPayment = await dbGet('SELECT * FROM payments WHERE user_id = ?', [userId]);
    res.json({ success: true, payment: savedPayment });
  } catch (err) {
    console.error('Payment submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// PASS ROUTES
// ========================================================

// Fetch Current Student Pass
app.get('/api/passes/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    const payment = await dbGet('SELECT * FROM payments WHERE user_id = ?', [userId]);
    let pass = await dbGet('SELECT * FROM passes WHERE user_id = ?', [userId]);

    if (!payment || payment.status !== 'approved') {
      return res.json({ pass: null, profile, payment });
    }

    // Auto-generate pass if payment is approved but pass doesn't exist yet
    if (!pass) {
      const passId = 'pass_' + Date.now();
      const passCode = `IET-MCA-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const qrPayload = JSON.stringify({
        event: 'MCA_FRESHERS_2026',
        pass_code: passCode,
        name: profile.full_name,
        email: profile.email,
        mobile: profile.mobile || payment.payment_mobile || '',
        utr: payment.utr_number
      });

      await dbRun(
        `INSERT INTO passes (id, user_id, payment_id, pass_code, qr_payload, issued_at, is_used)
         VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
        [passId, userId, payment.id, passCode, qrPayload]
      );

      pass = await dbGet('SELECT * FROM passes WHERE id = ?', [passId]);
    }

    res.json({ pass, profile, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// ADMIN PORTAL & GATE SCANNER ROUTES
// ========================================================

// Admin Portal Data
app.get('/api/admin/data', authenticate, requireAdmin, async (req, res) => {
  try {
    const profiles = await dbAll('SELECT id, email, full_name, mobile, gender, consent_agreed, consent_agreed_at, avatar_url, avatar_type, role, created_at FROM users ORDER BY created_at DESC');
    const payments = await dbAll('SELECT * FROM payments ORDER BY submitted_at DESC');
    const passes = await dbAll('SELECT * FROM passes');

    res.json({ profiles, payments, passes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve Payment
app.post('/api/admin/payments/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [paymentId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const now = new Date().toISOString();
    await dbRun(
      `UPDATE payments SET status = 'approved', approved_at = ?, reviewed_by = ? WHERE id = ?`,
      [now, req.user.email, paymentId]
    );

    // Create or update pass record
    let pass = await dbGet('SELECT * FROM passes WHERE user_id = ?', [payment.user_id]);
    const student = await dbGet('SELECT * FROM users WHERE id = ?', [payment.user_id]);

    if (!pass) {
      const passId = 'pass_' + Date.now();
      const passCode = `IET-MCA-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const qrPayload = JSON.stringify({
        event: 'MCA_FRESHERS_2026',
        pass_code: passCode,
        name: student ? student.full_name : 'Student',
        email: student ? student.email : '',
        mobile: student ? (student.mobile || payment.payment_mobile) : payment.payment_mobile,
        utr: payment.utr_number
      });

      await dbRun(
        `INSERT INTO passes (id, user_id, payment_id, pass_code, qr_payload, issued_at, is_used)
         VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
        [passId, payment.user_id, paymentId, passCode, qrPayload]
      );

      pass = await dbGet('SELECT * FROM passes WHERE id = ?', [passId]);
    }

    res.json({ success: true, pass });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Payment
app.post('/api/admin/payments/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { note } = req.body;

    await dbRun(
      `UPDATE payments SET status = 'rejected', admin_note = ?, reviewed_by = ? WHERE id = ?`,
      [note || 'Payment rejected', req.user.email, paymentId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check-in Log
app.get('/api/admin/checkin-log', authenticate, requireAdmin, async (req, res) => {
  try {
    const records = await dbAll(`
      SELECT 
        p.id, p.pass_code, p.is_used, p.scanned_at, p.scanned_by,
        u.id as user_id, u.full_name, u.email, u.mobile, u.gender, u.avatar_url,
        pay.utr_number
      FROM passes p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN payments pay ON p.payment_id = pay.id
      WHERE p.is_used = 1
      ORDER BY p.scanned_at DESC
    `);

    // Shape response matching frontend structure
    const formatted = records.map(r => ({
      id: r.id,
      pass_code: r.pass_code,
      is_used: Boolean(r.is_used),
      scanned_at: r.scanned_at,
      scanned_by: r.scanned_by,
      profiles: {
        id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        mobile: r.mobile,
        gender: r.gender,
        avatar_url: r.avatar_url
      },
      payments: {
        utr_number: r.utr_number
      }
    }));

    res.json({ entries: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gate Camera QR Check-In Verification
app.post('/api/admin/checkin', authenticate, requireAdmin, async (req, res) => {
  try {
    let { passCode } = req.body;
    if (!passCode) {
      return res.status(400).json({ error: 'Pass code or QR payload is required.' });
    }

    passCode = passCode.trim();
    // Parse JSON if QR code contains full payload
    try {
      const parsed = JSON.parse(passCode);
      if (parsed.pass_code) {
        passCode = parsed.pass_code;
      }
    } catch (e) {
      // Plain pass code string
    }

    const pass = await dbGet('SELECT * FROM passes WHERE pass_code = ?', [passCode]);
    if (!pass) {
      return res.status(404).json({ error: 'Unrecognized pass code. Pass not found in system.', passCode });
    }

    const student = await dbGet('SELECT id, email, full_name, mobile, gender, avatar_url FROM users WHERE id = ?', [pass.user_id]);
    const payment = await dbGet('SELECT utr_number, payment_mobile, amount FROM payments WHERE id = ?', [pass.payment_id]);

    if (pass.is_used) {
      return res.status(409).json({
        error: 'Pass already scanned and used!',
        alreadyUsed: true,
        pass,
        student,
        payment
      });
    }

    const now = new Date().toISOString();
    await dbRun('UPDATE passes SET is_used = 1, scanned_at = ?, scanned_by = ? WHERE id = ?', [now, req.user.email, pass.id]);

    const updatedPass = await dbGet('SELECT * FROM passes WHERE id = ?', [pass.id]);

    res.json({
      success: true,
      pass: updatedPass,
      student,
      payment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 IET Lucknow Freshers 2026 Server running locally!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔐 Admin Login: ${ADMIN_EMAIL} (Password: admin123)`);
  console.log(`=======================================================`);
});
