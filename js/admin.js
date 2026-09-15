/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Admin Dashboard & Gate QR Scanner Controller
 */

let allUsersData = [];
let allPaymentsData = [];
let html5QrCodeScanner = null;
let isScanning = false;

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = getSupabase();

  if (!supabase) {
    alert("Supabase SDK not loaded.");
    return;
  }

  // 1. STRICT ADMIN AUTH CHECK
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  const guardBanner = document.getElementById("admin-guard-banner");
  const adminContent = document.getElementById("admin-content-section");

  if (sessionError || !session || !session.user || session.user.email.toLowerCase() !== CONFIG.ADMIN_EMAIL.toLowerCase()) {
    guardBanner.style.display = "block";
    adminContent.style.display = "none";
    return;
  }

  // Admin access verified
  guardBanner.style.display = "none";
  adminContent.style.display = "block";
  document.getElementById("admin-user-tag").textContent = session.user.email;

  // Logout
  document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  // 2. SETUP TAB SWITCHING
  setupTabs();

  // 3. LOAD DATA
  await loadAdminData();

  // 4. SETUP CSV EXPORT & SEARCH
  setupSearchAndExport();

  // 5. SETUP SCREENSHOT MODAL
  setupScreenshotModal();

  // 5b. SETUP REJECTION & MISCONDUCT NOTICE MODAL
  setupRejectModal();

  // 6. SETUP GATE CAMERA QR SCANNER
  setupGateScanner();
});

// Tab Switcher
function setupTabs() {
  const btnUsers = document.getElementById("tab-btn-users");
  const btnPayments = document.getElementById("tab-btn-payments");
  const btnScanner = document.getElementById("tab-btn-scanner");

  const tabUsers = document.getElementById("tab-content-users");
  const tabPayments = document.getElementById("tab-content-payments");
  const tabScanner = document.getElementById("tab-content-scanner");

  function activateTab(activeBtn, activeContent) {
    [btnUsers, btnPayments, btnScanner].forEach(b => b.classList.remove("active"));
    [tabUsers, tabPayments, tabScanner].forEach(c => c.style.display = "none");

    activeBtn.classList.add("active");
    activeContent.style.display = "block";

    // Stop camera if leaving scanner tab
    if (activeBtn !== btnScanner && isScanning && html5QrCodeScanner) {
      stopCameraScanner();
    }
  }

  btnUsers.addEventListener("click", () => activateTab(btnUsers, tabUsers));
  btnPayments.addEventListener("click", () => activateTab(btnPayments, tabPayments));
  btnScanner.addEventListener("click", () => activateTab(btnScanner, tabScanner));

  document.getElementById("refresh-payments-btn").addEventListener("click", loadAdminData);
}

// Load all registered users, payments, and passes
async function loadAdminData() {
  const supabase = getSupabase();

  try {
    // 1. Fetch Profiles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // 2. Fetch Payments
    const { data: payments, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .order("submitted_at", { ascending: false });

    // 3. Fetch Passes
    const { data: passes, error: passErr } = await supabase
      .from("passes")
      .select("*");

    allPaymentsData = payments || [];
    const passesMap = new Map((passes || []).map(p => [p.user_id, p]));
    const paymentsMap = new Map((payments || []).map(p => [p.user_id, p]));

    // Combine user records
    allUsersData = (profiles || []).map(u => ({
      ...u,
      payment: paymentsMap.get(u.id) || null,
      pass: passesMap.get(u.id) || null
    }));

    // Update KPI counters
    updateKpis();

    // Render Tables
    renderUsersTable(allUsersData);
    renderPaymentsTable(allPaymentsData, profiles || []);

  } catch (err) {
    console.error("Admin data load error:", err);
  }
}

// Update KPI Stats Counters
function updateKpis() {
  const totalUsers = allUsersData.length;
  const consentDone = allUsersData.filter(u => u.consent_agreed).length;
  const paymentsSubmitted = allPaymentsData.length;
  const pendingReviews = allPaymentsData.filter(p => p.status === "pending").length;
  const passesIssued = allUsersData.filter(u => u.pass || (u.payment && u.payment.status === "approved")).length;

  document.getElementById("kpi-total-users").textContent = totalUsers;
  document.getElementById("kpi-consent-done").textContent = consentDone;
  document.getElementById("kpi-payments-submitted").textContent = paymentsSubmitted;
  document.getElementById("kpi-pending-reviews").textContent = pendingReviews;
  document.getElementById("kpi-passes-issued").textContent = passesIssued;

  document.getElementById("pending-count-badge").textContent = pendingReviews;
}

// Render Users Table in Tab 1
function renderUsersTable(users) {
  const tbody = document.getElementById("users-table-body");
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-dim);">No matching attendees found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    let paymentStatusBadge = `<span class="badge badge-warning" style="background: var(--bg-glass); color: var(--text-dim); border: 1px solid var(--border-glass);">Not Paid</span>`;
    let utrText = "--";
    let passCodeText = "--";

    if (u.payment) {
      utrText = `<span class="font-mono">${u.payment.utr_number}</span>`;
      if (u.payment.status === "approved") {
        paymentStatusBadge = `<span class="badge badge-success">Approved ✓</span>`;
      } else if (u.payment.status === "rejected") {
        paymentStatusBadge = `<span class="badge badge-danger">Rejected</span>`;
      } else {
        paymentStatusBadge = `<span class="badge badge-warning">Pending Review</span>`;
      }
    }

    if (u.pass) {
      passCodeText = `<span class="font-mono" style="color: var(--cyan); font-weight: 700;">${u.pass.pass_code}</span>`;
    }

    const consentPill = u.consent_agreed 
      ? `<span style="color: var(--success); font-weight: 700;">✓ Agreed</span>`
      : `<span style="color: var(--text-dim);">Pending</span>`;

    const avatarSrc = u.avatar_url || "assets/avatars/av1.svg";

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-dim);">${i + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${avatarSrc}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-glass);">
            <div>
              <div style="font-weight: 600; color: var(--text-main);">${u.full_name || "Unnamed"}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${new Date(u.created_at).toLocaleDateString('en-IN')}</div>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${u.mobile ? `+91 ${u.mobile}` : "--"}</td>
        <td style="text-transform: capitalize;">${u.gender || "--"}</td>
        <td>${consentPill}</td>
        <td>${paymentStatusBadge}</td>
        <td>${utrText}</td>
        <td>${passCodeText}</td>
      </tr>
    `;
  }).join("");
}

// Render Payments Table in Tab 2
function renderPaymentsTable(payments, profiles) {
  const tbody = document.getElementById("payments-table-body");
  if (!tbody) return;

  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">No payment submissions yet.</td></tr>`;
    return;
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  tbody.innerHTML = payments.map((p) => {
    const student = profileMap.get(p.user_id) || {};
    const studentName = student.full_name || "Student";
    const timeFormatted = new Date(p.submitted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

    let statusBadge = `<span class="badge badge-warning">Pending Review</span>`;
    if (p.status === "approved") {
      statusBadge = `<span class="badge badge-success">Approved ✓</span>`;
    } else if (p.status === "rejected") {
      statusBadge = `<span class="badge badge-danger">Rejected</span>`;
    }

    const screenshotBtn = p.screenshot_url 
      ? `<button class="btn btn-secondary btn-sm" onclick="openScreenshotModal('${p.screenshot_url}')">View Proof 🖼️</button>`
      : `<span style="color: var(--text-dim); font-size: 0.8rem;">No file</span>`;

    const actionButtons = p.status === "approved" 
      ? `<span style="color: var(--success); font-weight: 700; font-size: 0.82rem;">Pass Active 🎟️</span>`
      : `
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-primary btn-sm" onclick="approvePayment('${p.id}', '${p.user_id}', '${p.utr_number}', '${studentName.replace(/'/g, "\\'")}', '${student.email || ''}', '${p.payment_mobile}')">Approve ✓</button>
          <button class="btn btn-danger btn-sm" onclick="openRejectModal('${p.id}', '${studentName.replace(/'/g, "\\'")}', '${(student.email || '').replace(/'/g, "\\'")}', '${(p.utr_number || '').replace(/'/g, "\\'")}')">Reject / Notice ✕</button>
        </div>
      `;

    return `
      <tr>
        <td style="font-size: 0.8rem; color: var(--text-dim);">${timeFormatted}</td>
        <td>
          <div style="font-weight: 600;">${studentName}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${student.email || ""}</div>
        </td>
        <td>+91 ${p.payment_mobile || student.mobile || "--"}</td>
        <td class="font-mono" style="color: var(--gold); font-weight: 700;">${p.utr_number}</td>
        <td style="font-weight: 700; color: var(--text-main);">₹${p.amount || 99}</td>
        <td>${screenshotBtn}</td>
        <td>${statusBadge}</td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join("");
}

// Approve Payment & Auto-Issue Pass
window.approvePayment = async function (paymentId, userId, utrNumber, studentName, studentEmail, studentMobile) {
  if (!confirm(`Are you sure you want to approve payment for ${studentName} (UTR: ${utrNumber})? This will generate their official entry pass.`)) {
    return;
  }

  const supabase = getSupabase();

  try {
    // 1. Update Payment Status to Approved
    const { error: payUpdateErr } = await supabase
      .from("payments")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        reviewed_by: CONFIG.ADMIN_EMAIL
      })
      .eq("id", paymentId);

    if (payUpdateErr) throw payUpdateErr;

    // 2. Generate and Insert Pass Record
    const passCode = `IET-MCA-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const qrPayload = JSON.stringify({
      event: "MCA_FRESHERS_2026",
      pass_code: passCode,
      name: studentName,
      email: studentEmail,
      mobile: studentMobile,
      utr: utrNumber
    });

    const { error: passInsertErr } = await supabase
      .from("passes")
      .upsert({
        user_id: userId,
        payment_id: paymentId,
        pass_code: passCode,
        qr_payload: qrPayload,
        issued_at: new Date().toISOString(),
        is_used: false
      });

    if (passInsertErr) {
      console.warn("Pass upsert note:", passInsertErr);
    }

    alert(`✅ Payment Approved! Pass ${passCode} has been issued to ${studentName}.`);
    await loadAdminData();

  } catch (err) {
    console.error("Approval error:", err);
    alert("Error approving payment: " + err.message);
  }
};

// ==========================================
// REJECTION & DISCIPLINARY NOTICE MODAL
// ==========================================
let currentRejectData = null;

const REJECT_PRESETS = {
  fake: "🚨 OFFICIAL NOTICE OF MISCONDUCT & MISBEHAVIOR: You have submitted a fraudulent/fake payment screenshot or forged UTR number. Your entry pass approval is REJECTED with immediate effect. This act of severe indiscipline has been formally recorded and reported to the MCA Batch of 2025–2027 Organizing Committee & College Disciplinary Authorities. For genuine verification appeals, contact the organizing team immediately at 8922921012 / 8006770753.",
  mismatch: "⚠️ Bank Statement Verification Failed: The UTR / Transaction ID submitted was not reflected in the official bank statement (8006770753-2@ibl / Bhanu Pratap Singh). Please verify that ₹99 was deducted from your bank account and resubmit with genuine receipt, or contact coordinators.",
  blurry: "⚠️ Unclear Payment Receipt: The uploaded screenshot is cropped, blurry, or missing the bank reference number and transaction timestamp. Please re-upload a clear and complete screenshot.",
  custom: ""
};

function setupRejectModal() {
  const modal = document.getElementById("reject-modal");
  const modalClose = document.getElementById("reject-modal-close");
  const cancelBtn = document.getElementById("reject-modal-cancel");
  const confirmBtn = document.getElementById("reject-modal-confirm");
  const noticeTextarea = document.getElementById("reject-notice-text");
  const radioInputs = document.querySelectorAll('input[name="reject-preset"]');

  if (!modal) return;

  function closeModal() {
    modal.classList.remove("active");
    currentRejectData = null;
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  // Preset switching
  radioInputs.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const presetKey = e.target.value;
      if (presetKey === "custom") {
        if (!noticeTextarea.value || Object.values(REJECT_PRESETS).includes(noticeTextarea.value)) {
          noticeTextarea.value = "";
        }
        noticeTextarea.focus();
      } else {
        noticeTextarea.value = REJECT_PRESETS[presetKey] || "";
      }
    });
  });

  // Confirm rejection & transmit notice
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      if (!currentRejectData) return;

      const notice = noticeTextarea.value.trim();
      if (!notice) {
        alert("Please provide a rejection / notice message to explain the decision to the student.");
        noticeTextarea.focus();
        return;
      }

      const isMisconduct = notice.toUpperCase().includes("MISCONDUCT") || notice.toUpperCase().includes("FRAUD") || notice.toUpperCase().includes("FAKE");
      const confirmPrompt = isMisconduct
        ? `⚠️ Are you sure you want to issue an OFFICIAL NOTICE OF MISCONDUCT and REJECT pass approval for ${currentRejectData.studentName}? This will flag their account with disciplinary action.`
        : `Are you sure you want to reject the payment for ${currentRejectData.studentName}?`;

      if (!confirm(confirmPrompt)) {
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>Transmitting Notice...</span>`;

      const supabase = getSupabase();
      try {
        const { error } = await supabase
          .from("payments")
          .update({
            status: "rejected",
            admin_note: notice,
            reviewed_by: CONFIG.ADMIN_EMAIL
          })
          .eq("id", currentRejectData.paymentId);

        if (error) throw error;

        closeModal();
        alert(`✅ Official Notice transmitted and pass approval rejected for ${currentRejectData.studentName}.`);
        await loadAdminData();
      } catch (err) {
        console.error("Rejection error:", err);
        alert("Error updating rejection status: " + err.message);
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>🚨 Send Notice &amp; Reject Pass</span>`;
      }
    });
  }
}

// Open modal helper
window.openRejectModal = function (paymentId, studentName, studentEmail, utrNumber) {
  currentRejectData = { paymentId, studentName, studentEmail, utrNumber };

  const modal = document.getElementById("reject-modal");
  const nameEl = document.getElementById("reject-modal-student-name");
  const emailEl = document.getElementById("reject-modal-student-email");
  const utrEl = document.getElementById("reject-modal-utr");
  const noticeTextarea = document.getElementById("reject-notice-text");
  const defaultRadio = document.querySelector('input[name="reject-preset"][value="fake"]');

  if (nameEl) nameEl.textContent = studentName || "Student";
  if (emailEl) emailEl.textContent = studentEmail || "--";
  if (utrEl) utrEl.textContent = utrNumber || "--";

  if (defaultRadio) defaultRadio.checked = true;
  if (noticeTextarea) noticeTextarea.value = REJECT_PRESETS.fake;

  if (modal) modal.classList.add("active");
};

// Legacy alias
window.rejectPayment = function (paymentId) {
  const p = allPaymentsData.find(item => item.id === paymentId);
  const student = p ? allUsersData.find(u => u.id === p.user_id) : null;
  const name = student ? student.full_name : "Student";
  const email = student ? student.email : "";
  const utr = p ? p.utr_number : "";
  openRejectModal(paymentId, name, email, utr);
};

// Setup Search & CSV Export
function setupSearchAndExport() {
  const searchInput = document.getElementById("user-search-input");
  const filterSelect = document.getElementById("user-filter-select");
  const exportBtn = document.getElementById("export-csv-btn");

  function filterUsers() {
    const q = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;

    const filtered = allUsersData.filter(u => {
      // Search match
      const nameMatch = (u.full_name || "").toLowerCase().includes(q);
      const emailMatch = (u.email || "").toLowerCase().includes(q);
      const mobileMatch = (u.mobile || "").includes(q);
      const utrMatch = u.payment && (u.payment.utr_number || "").toLowerCase().includes(q);
      const matchesSearch = nameMatch || emailMatch || mobileMatch || utrMatch;

      // Status filter match
      let matchesStatus = true;
      if (filter === "pending") {
        matchesStatus = u.payment && u.payment.status === "pending";
      } else if (filter === "approved") {
        matchesStatus = u.payment && u.payment.status === "approved";
      } else if (filter === "rejected") {
        matchesStatus = u.payment && u.payment.status === "rejected";
      } else if (filter === "unpaid") {
        matchesStatus = !u.payment;
      }

      return matchesSearch && matchesStatus;
    });

    renderUsersTable(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", filterUsers);
  if (filterSelect) filterSelect.addEventListener("change", filterUsers);

  // CSV Export Action
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (allUsersData.length === 0) {
        alert("No attendees data to export.");
        return;
      }

      const headers = ["ID", "Full Name", "Email", "Mobile", "Gender", "Consent Agreed", "Payment Status", "UTR Number", "Pass Code", "Pass Scanned / Used", "Registered At"];
      const rows = allUsersData.map(u => [
        u.id,
        `"${(u.full_name || "").replace(/"/g, '""')}"`,
        u.email,
        u.mobile || "",
        u.gender || "",
        u.consent_agreed ? "Yes" : "No",
        u.payment ? u.payment.status : "Not Paid",
        u.payment ? u.payment.utr_number : "",
        u.pass ? u.pass.pass_code : "",
        u.pass && u.pass.is_used ? "YES" : "NO",
        new Date(u.created_at).toISOString()
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `IET_MCA_Freshers_2026_Attendees_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

// Setup Screenshot Viewer Modal
function setupScreenshotModal() {
  const modal = document.getElementById("screenshot-modal");
  const modalClose = document.getElementById("screenshot-modal-close");
  const modalImg = document.getElementById("modal-screenshot-img");
  const modalDownload = document.getElementById("modal-screenshot-download");

  window.openScreenshotModal = function (url) {
    modalImg.src = url;
    modalDownload.href = url;
    modal.classList.add("active");
  };

  if (modalClose) {
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
  }
}

// ========================================================
// TAB 3: GATE CAMERA QR SCANNER IMPLEMENTATION
// ========================================================
function setupGateScanner() {
  const startBtn = document.getElementById("start-camera-btn");
  const stopBtn = document.getElementById("stop-camera-btn");
  const resultCard = document.getElementById("scan-result-card");

  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    startCameraScanner();
  });

  stopBtn.addEventListener("click", () => {
    stopCameraScanner();
  });
}

function startCameraScanner() {
  const startBtn = document.getElementById("start-camera-btn");
  const stopBtn = document.getElementById("stop-camera-btn");
  const resultCard = document.getElementById("scan-result-card");

  resultCard.style.display = "none";

  if (!html5QrCodeScanner) {
    html5QrCodeScanner = new Html5Qrcode("scanner-reader");
  }

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrCodeScanner.start(
    { facingMode: "environment" }, // Prefer back camera
    config,
    onQrCodeSuccess,
    onQrCodeError
  ).then(() => {
    isScanning = true;
    startBtn.style.display = "none";
    stopBtn.style.display = "inline-flex";
  }).catch(err => {
    console.error("Camera start error:", err);
    alert("Camera permission denied or camera not accessible: " + err);
  });
}

function stopCameraScanner() {
  const startBtn = document.getElementById("start-camera-btn");
  const stopBtn = document.getElementById("stop-camera-btn");

  if (html5QrCodeScanner && isScanning) {
    html5QrCodeScanner.stop().then(() => {
      isScanning = false;
      startBtn.style.display = "inline-flex";
      stopBtn.style.display = "none";
    }).catch(err => console.error("Camera stop error:", err));
  }
}

// On QR Scanned at Gate
async function onQrCodeSuccess(decodedText) {
  // Pause scanning temporarily to display result
  if (html5QrCodeScanner && isScanning) {
    html5QrCodeScanner.pause();
  }

  const resultCard = document.getElementById("scan-result-card");
  resultCard.style.display = "block";
  resultCard.innerHTML = `<div style="text-align: center; color: var(--cyan);">🔍 Verifying pass credentials with database...</div>`;

  let passCode = decodedText.trim();
  // If payload is JSON
  try {
    const parsed = JSON.parse(decodedText);
    if (parsed.pass_code) {
      passCode = parsed.pass_code;
    }
  } catch (e) {
    // Plain string pass code
  }

  const supabase = getSupabase();

  try {
    // 1. Look up pass in database
    const { data: pass, error: passErr } = await supabase
      .from("passes")
      .select("*, profiles(*), payments(*)")
      .eq("pass_code", passCode)
      .maybeSingle();

    if (!pass) {
      // STATE 3: INVALID PASS
      playBeep(false);
      resultCard.style.background = "rgba(245, 158, 11, 0.15)";
      resultCard.style.border = "2px solid var(--warning)";
      resultCard.innerHTML = `
        <div style="font-size: 1.5rem; color: var(--warning); margin-bottom: 0.5rem;">⚠️ UNRECOGNIZED PASS</div>
        <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">Pass Code: ${passCode}</div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">
          This pass code was not found in the verified database. Do not permit entry.
        </p>
        <button class="btn btn-secondary btn-sm" onclick="resumeScanner()" style="margin-top: 1rem;">Scan Next</button>
      `;
      return;
    }

    const student = pass.profiles || {};
    const payment = pass.payments || {};

    // 2. CHECK IF ALREADY USED
    if (pass.is_used) {
      // STATE 2: ALREADY SCANNED / DUPLICATE
      playBeep(false);
      resultCard.style.background = "rgba(239, 68, 68, 0.15)";
      resultCard.style.border = "2px solid var(--error)";
      resultCard.innerHTML = `
        <div style="font-size: 1.5rem; color: var(--error); margin-bottom: 0.5rem;">❌ PASS ALREADY USED!</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main);">${student.full_name || "Student"}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
          Checked in previously on: <strong>${new Date(pass.scanned_at || Date.now()).toLocaleTimeString()}</strong>
        </div>
        <div style="font-size: 0.82rem; color: var(--error); margin-top: 0.5rem; font-weight: 700;">
          ⚠️ DUPLICATE ENTRY PROHIBITED. Please check student ID card.
        </div>
        <button class="btn btn-secondary btn-sm" onclick="resumeScanner()" style="margin-top: 1rem;">Scan Next</button>
      `;
      return;
    }

    // 3. STATE 1: VALID FIRST-TIME SCAN -> GRANT ENTRY
    playBeep(true);

    // Mark as used in database
    await supabase
      .from("passes")
      .update({
        is_used: true,
        scanned_at: new Date().toISOString(),
        scanned_by: CONFIG.ADMIN_EMAIL
      })
      .eq("id", pass.id);

    resultCard.style.background = "rgba(16, 185, 129, 0.15)";
    resultCard.style.border = "2px solid var(--success)";
    resultCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span class="badge badge-success" style="font-size: 0.8rem;">✓ ACCESS GRANTED</span>
        <span class="font-mono" style="color: var(--cyan); font-weight: 700;">${pass.pass_code}</span>
      </div>

      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
        <img src="${student.avatar_url || 'assets/avatars/av1.svg'}" alt="Avatar" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--success);">
        <div>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${student.full_name || "Student"}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${student.email} • +91 ${student.mobile || payment.payment_mobile || ""}</div>
          <div style="font-size: 0.75rem; color: var(--gold); font-weight: 700;">UTR: ${payment.utr_number || "--"}</div>
        </div>
      </div>

      <div style="background: var(--bg-surface); padding: 0.6rem; border-radius: 8px; font-size: 0.8rem; color: var(--success); text-align: center; font-weight: 700;">
        🎉 WELCOME TO MCA FRESHERS 2026!
      </div>

      <button class="btn btn-primary btn-sm" onclick="resumeScanner()" style="width: 100%; margin-top: 1rem;">
        Scan Next Student →
      </button>
    `;

  } catch (err) {
    console.error("Gate scan validation error:", err);
    resultCard.innerHTML = `<div style="color: var(--error);">Error verifying pass: ${err.message}</div>
      <button class="btn btn-secondary btn-sm" onclick="resumeScanner()" style="margin-top: 0.5rem;">Resume Scanner</button>`;
  }
}

function onQrCodeError(errorMessage) {
  // Ignored in normal scanning loop
}

// Resume Scanner helper
window.resumeScanner = function () {
  const resultCard = document.getElementById("scan-result-card");
  resultCard.style.display = "none";
  if (html5QrCodeScanner && isScanning) {
    html5QrCodeScanner.resume();
  }
};

// Audio feedback chime using Web Audio API
function playBeep(isSuccess = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isSuccess ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime); // High pitch for success, low for error
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isSuccess ? 0.18 : 0.3));
  } catch (e) {
    // Audio context not allowed or unsupported
  }
}
