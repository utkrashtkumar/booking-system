/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Central Configuration File
 */

const CONFIG = {
  // Supabase Project Credentials
  SUPABASE_URL: "https://nmtbzzbfwoifbxkgfrgr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tdGJ6emJmd29pZmJ4a2dmcmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODA5MDIsImV4cCI6MjA5OTU1NjkwMn0.ubl5OTVCziqbytRHlKCBiF6nwo-ZV4CI1jBAd08vMuk",

  // Designated Super Admin
  ADMIN_EMAIL: "utkrashtu@gmail.com",

  // Event Details
  EVENT: {
    NAME: "MCA Freshers 2026",
    COLLEGE: "Institute of Engineering & Technology (IET), Lucknow",
    ORGANIZER: "MCA Batch of 2025–2027",
    JUNIORS_BATCH: "Batch of 2026–2028",
    DATE_TEXT: "27 September 2026 (12:00 PM to 6:00 PM)",
    DATE: "27 September 2026",
    TIME: "12:00 PM - 6:00 PM",
    COUNTDOWN_TARGET: "2026-09-27T12:00:00+05:30",
    VENUE: "IET Lucknow Auditorium / Campus Grounds",
    DRESS_CODE: "Smart Casuals / Ethnic Glamour",
    ENTRY_FEE: 99, // In INR
  },

  // Payment Details (Authorized PhonePe UPI)
  PAYMENT: {
    UPI_ID: "8006770753-2@ibl",
    RECEIVER_NAME: "Bhanu Pratap Singh",
    RECEIVER_DISPLAY: "Bhanu Pratap Singh (DSW)",
    UPI_NAME: "Bhanu Pratap Singh (DSW)",
    UPI_MOBILE: "8006770753",
    AMOUNT: 99,
    QR_IMAGE: "assets/upi-qr.png"
  },

  // Helpline Numbers
  HELPLINE: [
    { number: "8922921012", display: "+91 8922921012", name: "Utkarsh (Coordinator)" },
    { number: "8006770753", display: "+91 8006770753", name: "Helpline 2 (Organizing Team)" }
  ],

  // Terms & Conditions list
  TERMS: [
    "🚫 STRICTLY NO ALCOHOL & SUBSTANCE USE: Bringing, consuming, or being under the influence of alcohol, drugs, or any intoxicants is strictly prohibited. Violators will face immediate expulsion, police reporting, and disciplinary action by the college.",
    "👔 DRESS CODE & PROFESSIONAL CONDUCT: Attendees must adhere to decent, smart casual or formal dress etiquette. Offensive slogans, inappropriate attire, and indecent behavior will not be tolerated.",
    "🤝 RESPECT & DECORUM: Treat all juniors, seniors, professors, and venue staff with utmost respect and courtesy. Maintain high professional standards at all times.",
    "🚷 ZERO TOLERANCE FOR HARASSMENT: Eve-teasing, ragging, non-consensual physical contact, verbal abuse, or harassment in any form will lead to immediate confiscation of pass, permanent eviction, and official FIR filing.",
    "📸 PHOTOGRAPHY GUIDELINES: Photography is welcome in designated event photo booths and main stage areas. Taking unconsented, candid, or intrusive pictures/videos of fellow students is strictly prohibited.",
    "🎟️ PERSONAL & NON-TRANSFERABLE PASS: Each entry pass is strictly unique to the registered student with their verified roll, photo, and UTR. Attempting to sell, lend, forge, or duplicate a pass will result in cancellation without refund.",
    "🏛️ ORGANIZERS' AUTHORITY: The MCA Batch of 2025–2027 Organizing Committee reserves the sole right to verify identity at the gate and deny entry to any individual violating venue protocols.",
    "📵 PERFORMANCE ETIQUETTE: Kindly silence mobile devices during formal introductions, cultural performances, and dignitary addresses.",
    "⏰ TIMING & VENUE ACCESS: Entry gates will close promptly at the designated time. No late entries will be accommodated without prior written permission from coordinators.",
    "🔒 VALUABLES: Attendees are advised to look after their personal belongings. Organizers will not be held liable for unattended items.",
    "🚫 OUTSIDERS STRICTLY PROHIBITED: Only MCA IET college students allowed. Outsiders, non-college guests, or unverified individuals are strictly prohibited from entering the venue under any circumstances."
  ]
};

// Initialize Supabase Client
let supabaseClient = null;
if (typeof supabase !== "undefined") {
  supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase SDK not loaded yet. Will initialize once library is ready.");
}

function getSupabase() {
  if (!supabaseClient && typeof supabase !== "undefined") {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}
