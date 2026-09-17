# 🎟️ IET Lucknow MCA Freshers 2026 Portal

Official digital entry pass and event management platform for **MCA Freshers 2026** at the **Institute of Engineering & Technology (IET), Lucknow**.





---

## 🌟 Key Features

- **🎓 Landing Page (`index.html`):**
  - Cosmic luxury cyber-theme with smooth dark/light mode toggle.
  - Event details (Sunday, 27 September 2026 • 12:00 PM – 6:00 PM).
  - Highlighting party vibes, cultural acts, DJ console, catering, safety & female security, and zero-ragging strict decorum.
- **🔐 Authentication & Onboarding (`auth.html`):**
  - Registration with duplicate mobile & email verification.
  - Interactive eye visibility toggle buttons for password inspection.
  - Password matching validation.
  - Email verification popup modal.
- **🔑 Dedicated Password Reset (`reset-password.html`):**
  - Dual-mode recovery system connected to Supabase Auth.
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
- **Backend & Database:** [Supabase](https://supabase.com) (PostgreSQL, Supabase Auth, Row Level Security, Storage Buckets).
- **QR Code Engine:** `qrcode` with custom styled module drawers & PhonePe center badge.
- **Gate Scanner:** `html5-qrcode` library for real-time camera scanning.
- **Hosting & Edge Deployment:** [Vercel](https://vercel.com) 

---

## 📂 Project Structure

```
├── index.html                         # Public landing page
├── auth.html                          # Sign In / Sign Up portal
├── dashboard.html                     # Student pass portal (Consent, Payment, Status)
├── pass.html                          # Digital entry pass
├── reset-password.html                # Dedicated password recovery page
├── admin.html                         # Admin verification & gate QR scanner
├── vercel.json                        # Vercel deployment configuration
├── supabase-setup.sql                 # Complete database schema, RLS policies, & storage
├── supabase-email-confirm-signup.html # Email template for signup confirmation
├── supabase-email-reset-password.html   # Email template for password reset
├── generate_stylish_qr.py             # Python script for generating themed UPI QR
├── assets/
│   ├── Ietlogo.png                    # IET Lucknow official crest
│   ├── upi-qr-stylish.png             # Themed vertical payment card
│   ├── upi-qr-square.png              # Standalone square QR code
│   └── avatars/                       # Tech avatars for entry passes
├── css/
│   └── style.css                      # Central design system & responsive styling
└── js/
    ├── config.js                      # Supabase configuration & constants
    ├── theme.js                       # Dark/Light mode switcher
    ├── auth.js                        # Registration & Login controller
    ├── dashboard.js                   # Student onboarding & status flow
    ├── admin.js                       # Admin panel & camera scanner logic
    ├── pass.js                        # Pass rendering & PDF/image download
    └── reset-password.js              # Password recovery controller
```

---

## 🛠️ Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/utkrashtkumar/booking-system.git
   cd booking-system
   ```
2. Serve using any static server (Python or Node):
   ```bash
   # Using Python:
   python -m http.server 3000

   # Or using Node:
   npx serve . -p 3000
   ```
3. Open `http://localhost:3000` in your web browser.

---

## 🔒 Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and execute the script inside [`supabase-setup.sql`](supabase-setup.sql).
3. Paste the contents of [`supabase-email-confirm-signup.html`](supabase-email-confirm-signup.html) and [`supabase-email-reset-password.html`](supabase-email-reset-password.html) into **Authentication ➔ Email Templates**.


---

## 🏛️ Organizing Committee

- **Department:** Department of Master of Computer Applications (MCA)
- **Institution:** Institute of Engineering & Technology (IET), Sitapur Road, Lucknow – 226021
- **Organizers:** MCA Batch of 2025–2027

