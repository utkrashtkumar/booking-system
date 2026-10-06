# 🎟️ IET Lucknow MCA Freshers 2026 Portal

Official digital entry pass and event management platform for **MCA Freshers 2026** at the **Institute of Engineering & Technology (IET), Lucknow**.





---

## 🌟 Key Features

- **🎓 Landing Page (`index.html`):**
  - Cosmic luxury cyber-theme with smooth dark/light mode toggle.
  - Event details (Sunday, 27 September 2026 • 11:00 AM – 6:00 PM [Tentative] at The Twilight Kitchen And Bar, Lucknow).
  - Highlighting party vibes, cultural acts, DJ console, catering, safety & female security, and zero-ragging strict decorum.
- **🔐 Authentication & Onboarding (`auth.html`):**
  - Registration with duplicate mobile & email verification.
  - Interactive eye visibility toggle buttons for password inspection.
  - Password matching validation.
  - Email verification popup modal.
- **🔑 Dedicated Password Reset (`reset-password.html`):**
  - Secure account recovery system connected to Local Auth.
  - Real-time password parity checks and eye toggles.
- **📜 Student Dashboard (`dashboard.html`):**
  - 4-step progressive onboarding:
    1. Mandatory scroll-enforced Code of Conduct & Venue Consent form.
    2. UPI Payment verification screen with themed PhonePe QR code card and copyable UPI ID.
    3. Custom pass profile picture upload or tech avatar selection.
    4. Real-time payment verification status and digital entry pass.
  - Prominent Disciplinary Warning Banner if a fraudulent receipt or fake UTR is flagged.
- **🎟️ Digital Pass Generator (`pass.html`):**
  - Premium printable and downloadable event entry pass with unique ticket number, student details, security watermark, and scannable gate verification QR code.
- **🛡️ Admin Management & Gate QR Scanner (`admin.html`):**
  - Real-time KPI counters (Registrations, Consents, Submissions, Passes Issued).
  - Live embedded camera QR scanner for venue gate check-in to prevent pass duplication.
  - Modal-based pass rejection with 1-click presets (Strict Misconduct Notice for fake payments, Bank Mismatch, Blurry Receipt).
  - CSV export for student lists.

---

## 🚀 Technology Stack

- **Frontend:** Pure Vanilla HTML5, CSS3 (Modern custom tokens, Glassmorphism, CSS Variables, WCAG AAA compliant contrast), and JavaScript (ES6+).
- **Backend & Database:** Local Node.js + Express API server with SQLite (`freshers.db`) for lightweight, persistent data storage with zero external cloud conflicts.
- **QR Code Engine:** `qrcode` with custom styled module drawers & UPI payment integration.
- **Gate Scanner:** `html5-qrcode` library for real-time camera scanning.

---

## 📂 Project Structure

```
├── index.html                         # Public landing page
├── auth.html                          # Sign In / Sign Up portal
├── dashboard.html                     # Student pass portal (Consent, Payment, Status)
├── pass.html                          # Digital entry pass
├── reset-password.html                # Dedicated password recovery page
├── admin.html                         # Admin verification & gate QR scanner
├── server.js                          # Local Express & SQLite API server
├── package.json                       # Dependencies & scripts
├── generate_stylish_qr.py             # Python script for generating themed UPI QR
├── assets/
│   ├── Ietlogo.png                    # IET Lucknow official crest
│   ├── upi-qr.png                     # Themed payment QR card
│   └── avatars/                       # Tech avatars for entry passes
├── css/
│   └── style.css                      # Central design system & responsive styling
└── js/
    ├── config.js                      # Configuration & local API client
    ├── theme.js                       # Dark/Light mode switcher
    ├── auth.js                        # Registration & Login controller
    ├── dashboard.js                   # Student onboarding & status flow
    ├── admin.js                       # Admin panel & camera scanner logic
    ├── pass.js                        # Pass rendering & image download
    └── reset-password.js              # Password recovery controller
```

---

## 🛠️ Local Development & Running

1. Clone the repository:
   ```bash
   git clone https://github.com/utkrashtkumar/booking-system.git
   cd booking-system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in your web browser.
   - **Super Admin Account:** `utkrashtu@gmail.com`
   - **Default Admin Password:** `admin123`

---

## 🏛️ Organizing Committee

- **Department:** Department of Master of Computer Applications (MCA)
- **Institution:** Institute of Engineering & Technology (IET), Sitapur Road, Lucknow – 226021
- **Organizers:** MCA Batch of 2025–2027

