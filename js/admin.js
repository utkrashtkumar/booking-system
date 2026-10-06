/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Admin Dashboard & Gate QR Scanner Controller (Local SQLite / Express API)
 */

let allUsersData = [];
let allPaymentsData = [];
let html5QrCodeScanner = null;
let isScanning = false;

document.addEventListener("DOMContentLoaded", async () => {
  const guardBanner = document.getElementById("admin-guard-banner");
  const adminContent = document.getElementById("admin-content-section");

  // 1. STRICT ADMIN AUTH CHECK
  try {
    const { session, user } = await API.getSession();

    if (!session || !user || (user.email.toLowerCase() !== CONFIG.ADMIN_EMAIL.toLowerCase() && user.role !== 'admin')) {
      if (guardBanner) guardBanner.style.display = "block";
      if (adminContent) adminContent.style.display = "none";
      return;
    }

    // Admin access verified
    if (guardBanner) guardBanner.style.display = "none";
    if (adminContent) adminContent.style.display = "block";
    const tag = document.getElementById("admin-user-tag");
    if (tag) tag.textContent = user.email;

  } catch (err) {
    if (guardBanner) guardBanner.style.display = "block";
    if (adminContent) adminContent.style.display = "none";
    return;
  }

  // Logout
  const logoutBtn = document.getElementById("admin-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await API.logout();
      window.location.href = "index.html";
    });
  }

  // 2. SETUP TAB SWITCHING
  setupTabs();

  // 3. LOAD DATA
  await loadAdminData();
  await loadCheckInLog();

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
  const btnCheckin = document.getElementById("tab-btn-checkin");

  const tabUsers = document.getElementById("tab-content-users");
  const tabPayments = document.getElementById("tab-content-payments");
  const tabScanner = document.getElementById("tab-content-scanner");
  const tabCheckin = document.getElementById("tab-content-checkin");

  const allBtns = [btnUsers, btnPayments, btnScanner, btnCheckin];
  const allTabs = [tabUsers, tabPayments, tabScanner, tabCheckin];

  function activateTab(activeBtn, activeContent) {
    allBtns.forEach(b => { if (b) b.classList.remove("active"); });
    allTabs.forEach(c => { if (c) c.style.display = "none"; });

    if (activeBtn) activeBtn.classList.add("active");
    if (activeContent) activeContent.style.display = "block";

    // Stop camera if leaving scanner tab
    if (activeBtn !== btnScanner && isScanning && html5QrCodeScanner) {
      stopCameraScanner();
    }

    // Refresh check-in log when switching to it
    if (activeBtn === btnCheckin) {
      loadCheckInLog();
    }
  }

  if (btnUsers) btnUsers.addEventListener("click", () => activateTab(btnUsers, tabUsers));
  if (btnPayments) btnPayments.addEventListener("click", () => activateTab(btnPayments, tabPayments));
  if (btnScanner) btnScanner.addEventListener("click", () => activateTab(btnScanner, tabScanner));
  if (btnCheckin) btnCheckin.addEventListener("click", () => activateTab(btnCheckin, tabCheckin));

  const refreshBtn = document.getElementById("refresh-payments-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadAdminData);
}

// Load all registered users, payments, and passes
async function loadAdminData() {
  try {
    const data = await API.getAdminData();
    const profiles = data.profiles || [];
    const payments = data.payments || [];
    const passes = data.passes || [];

    allPaymentsData = payments;
    const passesMap = new Map(passes.map(p => [p.user_id, p]));
    const paymentsMap = new Map(payments.map(p => [p.user_id, p]));

    // Combine user records
    allUsersData = profiles.map(u => ({
      ...u,
      payment: paymentsMap.get(u.id) || null,
      pass: passesMap.get(u.id) || null
    }));

    // Update KPI counters
    updateKpis();

    // Render Tables
    renderUsersTable(allUsersData);
    renderPaymentsTable(allPaymentsData, profiles);

    // Update check-in badge count from passes
    const scannedCount = passes.filter(p => p.is_used).length;
    const badge = document.getElementById("checkin-count-badge");
    if (badge) badge.textContent = scannedCount;

  } catch (err) {
    console.error("Admin data load error:", err);
  }
}

// ============================================
// CHECK-IN LOG: Load Scanned Passes
// ============================================
async function loadCheckInLog() {
  const tbody = document.getElementById("checkin-table-body");
  const totalEl = document.getElementById("checkin-total-count");
  const badge = document.getElementById("checkin-count-badge");

  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-dim);">Loading check-in records...</td></tr>`;

  try {
    const res = await API.getCheckInLog();
    const scannedPasses = res.entries || [];

    const count = scannedPasses.length;
    if (badge) badge.textContent = count;
    if (totalEl) totalEl.innerHTML = `Total Entered: <strong style="color: var(--success);">${count}</strong>`;

    renderCheckInTable(scannedPasses);

    // Hook refresh button
    const refreshBtn = document.getElementById("refresh-checkin-btn");
    if (refreshBtn && !refreshBtn._bound) {
      refreshBtn._bound = true;
      refreshBtn.addEventListener("click", loadCheckInLog);
    }

  } catch (err) {
    console.error("Check-in log error:", err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--error);">Error loading check-in data: ${err.message}</td></tr>`;
  }
}

function renderCheckInTable(entries) {
  const tbody = document.getElementById("checkin-table-body");
  if (!tbody) return;

  if (entries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-dim);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎟️</div>
          <div>No students have checked in yet.</div>
          <div style="font-size: 0.8rem; margin-top: 0.3rem;">Scanned passes will appear here in real-time.</div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = entries.map((entry, i) => {
    const student = entry.profiles || {};
    const payment = entry.payments || {};
    const scannedTime = entry.scanned_at
      ? new Date(entry.scanned_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })
      : '--';
    const avatarSrc = student.avatar_url || 'assets/avatars/av1.svg';
    const scannedBy = entry.scanned_by || CONFIG.ADMIN_EMAIL || '--';

    return `
      <tr>
        <td style="font-weight: 800; color: var(--success);">${i + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${avatarSrc}" alt="Avatar" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 2px solid var(--success);">
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${student.full_name || 'Unknown'}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: capitalize;">${student.gender || ''}</div>
            </div>
          </div>
        </td>
        <td style="color: var(--text-main); font-size: 0.83rem;">${student.email || '--'}</td>
        <td>${student.mobile ? '+91 ' + student.mobile : '--'}</td>
        <td style="text-transform: capitalize; color: var(--text-muted);">${student.gender || '--'}</td>
        <td><span class="font-mono" style="color: var(--cyan); font-weight: 700;">${entry.pass_code || '--'}</span></td>
        <td><span class="font-mono" style="color: var(--gold); font-weight: 700;">${payment.utr_number || '--'}</span></td>
        <td>
          <div style="font-weight: 700; color: var(--success);">${scannedTime}</div>
          <div style="font-size: 0.7rem; color: var(--text-dim);">✅ Entered Venue</div>
        </td>
        <td style="font-size: 0.78rem; color: var(--text-dim);">${scannedBy}</td>
      </tr>
    `;
  }).join("");
}

// Update KPI Stats Counters
function updateKpis() {
  const totalUsers = allUsersData.length;
  const consentDone = allUsersData.filter(u => u.consent_agreed).length;
  const paymentsSubmitted = allPaymentsData.length;
  const pendingReviews = allPaymentsData.filter(p => p.status === "pending").length;
  const approvedPayments = allPaymentsData.filter(p => p.status === "approved").length;

  const kpiTotal = document.getElementById("kpi-total-users");
  const kpiConsent = document.getElementById("kpi-consent-agreed");
  const kpiSubmitted = document.getElementById("kpi-payments-submitted");
  const kpiPending = document.getElementById("kpi-pending-reviews");
  const kpiApproved = document.getElementById("kpi-approved-passes");

  if (kpiTotal) kpiTotal.textContent = totalUsers;
  if (kpiConsent) kpiConsent.textContent = consentDone;
  if (kpiSubmitted) kpiSubmitted.textContent = paymentsSubmitted;
  if (kpiPending) kpiPending.textContent = pendingReviews;
  if (kpiApproved) kpiApproved.textContent = approvedPayments;
}

// Render Users Table
function renderUsersTable(users) {
  const tbody = document.getElementById("users-table-body");
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">No students found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : "--";
    const avatarSrc = u.avatar_url || "assets/avatars/av1.svg";

    let payStatusBadge = `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-dim);">No Payment</span>`;
    if (u.payment) {
      if (u.payment.status === "approved") {
        payStatusBadge = `<span class="badge badge-success">Approved ✓</span>`;
      } else if (u.payment.status === "rejected") {
        payStatusBadge = `<span class="badge badge-danger">Rejected</span>`;
      } else {
        payStatusBadge = `<span class="badge badge-warning">Pending Review</span>`;
      }
    }

    const consentBadge = u.consent_agreed
      ? `<span style="color: var(--success); font-weight: 700;">✓ Agreed</span>`
      : `<span style="color: var(--text-dim);">Pending</span>`;

    const passInfo = u.pass
      ? `<span class="font-mono" style="color: var(--cyan); font-weight: 700;">${u.pass.pass_code}</span>`
      : `<span style="color: var(--text-dim);">--</span>`;

    return `
      <tr>
        <td style="color: var(--text-dim); font-size: 0.8rem;">${i + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${avatarSrc}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-glass);">
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${u.full_name || "Unknown"}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${regDate}</div>
            </div>
          </div>
        </td>
        <td style="font-size: 0.85rem;">${u.email}</td>
        <td>${u.mobile ? "+91 " + u.mobile : "--"}</td>
        <td>${consentBadge}</td>
        <td>${payStatusBadge}</td>
        <td>${passInfo}</td>
      </tr>
    `;
  }).join("");
}

// Render Payments Table
function renderPaymentsTable(payments, profiles) {
  const pendingTbody = document.getElementById("pending-payments-table-body");
  const approvedTbody = document.getElementById("approved-payments-table-body");

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  const passMap = new Map((allUsersData || []).filter(u => u.pass).map(u => [u.id, u.pass]));

  const pendingPayments = payments.filter(p => p.status === "pending" || p.status === "rejected");
  const approvedPayments = payments.filter(p => p.status === "approved");

  // Pending Payments Table
  if (pendingTbody) {
    if (pendingPayments.length === 0) {
      pendingTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">🎉 No pending payments to review!</td></tr>`;
    } else {
      pendingTbody.innerHTML = pendingPayments.map(p => {
        const student = profileMap.get(p.user_id) || {};
        const studentName = student.full_name || "Student";
        const studentEmail = student.email || "";
        const studentMobile = p.payment_mobile || student.mobile || "";
        const subTime = p.submitted_at ? new Date(p.submitted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : "--";

        const screenshotBtn = p.screenshot_url
          ? `<button class="btn btn-secondary btn-sm" onclick="openScreenshotModal('${p.screenshot_url}')">View Proof 🖼️</button>`
          : `<span style="color: var(--text-dim); font-size: 0.8rem;">No file</span>`;

        let statusBadge = `<span class="badge badge-warning">Pending Review</span>`;
        if (p.status === "rejected") {
          statusBadge = `<span class="badge badge-danger">Rejected</span>`;
        }

        return `
          <tr>
            <td style="font-size: 0.8rem; color: var(--text-dim);">${subTime}</td>
            <td>
              <div style="font-weight: 600;">${studentName}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${studentEmail}</div>
            </td>
            <td>+91 ${studentMobile || "--"}</td>
            <td class="font-mono" style="color: var(--gold); font-weight: 700;">${p.utr_number}</td>
            <td>${screenshotBtn}</td>
            <td>${statusBadge}</td>
            <td>
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-primary btn-sm" onclick="approvePayment('${p.id}', '${p.user_id}', '${p.utr_number}', '${studentName.replace(/'/g, "\\'")}', '${studentEmail}', '${studentMobile}')">Approve ✓</button>
                <button class="btn btn-danger btn-sm" onclick="openRejectModal('${p.id}', '${studentName.replace(/'/g, "\\'")}', '${studentEmail}', '${p.utr_number}')">Reject ✕</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  // Approved Payments Table
  if (approvedTbody) {
    if (approvedPayments.length === 0) {
      approvedTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">No approved payments yet.</td></tr>`;
    } else {
      approvedTbody.innerHTML = approvedPayments.map(p => {
        const student = profileMap.get(p.user_id) || {};
        const studentName = student.full_name || "Student";
        const approvedTime = p.approved_at
          ? new Date(p.approved_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
          : new Date(p.submitted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

        const screenshotBtn = p.screenshot_url
          ? `<button class="btn btn-secondary btn-sm" onclick="openScreenshotModal('${p.screenshot_url}')">View Proof 🖼️</button>`
          : `<span style="color: var(--text-dim); font-size: 0.8rem;">No file</span>`;

        const pass = passMap.get(p.user_id);
        const passCodeText = pass
          ? `<span class="font-mono" style="color: var(--cyan); font-weight: 700;">${pass.pass_code}</span>`
          : `<span style="color: var(--text-dim);">--</span>`;

        return `
          <tr>
            <td style="font-size: 0.8rem; color: var(--success); font-weight: 600;">✅ ${approvedTime}</td>
            <td>
              <div style="font-weight: 600;">${studentName}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${student.email || ""}</div>
            </td>
            <td>+91 ${p.payment_mobile || student.mobile || "--"}</td>
            <td class="font-mono" style="color: var(--gold); font-weight: 700;">${p.utr_number}</td>
            <td style="font-weight: 700; color: var(--success);">₹${p.amount || 200}</td>
            <td>${screenshotBtn}</td>
            <td>${passCodeText}</td>
          </tr>
        `;
      }).join("");
    }
  }
}

// Approve Payment & Auto-Issue Pass
window.approvePayment = async function (paymentId, userId, utrNumber, studentName, studentEmail, studentMobile) {
  if (!confirm(`Are you sure you want to approve payment for ${studentName} (UTR: ${utrNumber})? This will generate their official entry pass.`)) {
    return;
  }

  try {
    const res = await API.approvePayment(paymentId);
    alert(`✅ Payment Approved! Pass ${res.pass ? res.pass.pass_code : ''} has been issued to ${studentName}.`);
    await loadAdminData();
  } catch (err) {
    console.error("Approval error:", err);
    alert("Error approving payment: " + err.message);
  }
};

// Rejection & Disciplinary Notice Modal
let currentRejectData = null;

const REJECT_PRESETS = {
  fake: "🚨 OFFICIAL NOTICE OF MISCONDUCT & MISBEHAVIOR: You have submitted a fraudulent/fake payment screenshot or forged UTR number. Your entry pass approval is REJECTED with immediate effect. This act of severe indiscipline has been formally recorded for disciplinary action by organizing committee. For genuine verification appeals, contact the organizing team immediately at +91 91058 02148 (Vibhu) / +91 63929 55739 (Utsav).",
  mismatch: "⚠️ Bank Statement Verification Failed: The UTR / Transaction ID submitted was not reflected in the official bank statement (9105802148@ptsbi / Vibhu Sharma). Please verify that ₹200 was deducted from your bank account and resubmit with genuine receipt, or contact coordinators.",
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

      try {
        await API.rejectPayment(currentRejectData.paymentId, notice);
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

window.openRejectModal = function (paymentId, studentName, studentEmail, utrNumber) {
  currentRejectData = { paymentId, studentName, studentEmail, utrNumber };

  const modal = document.getElementById("reject-modal");
  const nameEl = document.getElementById("reject-modal-student-name");
  const utrEl = document.getElementById("reject-modal-utr");
  const noticeTextarea = document.getElementById("reject-notice-text");
  const radioFake = document.querySelector('input[name="reject-preset"][value="fake"]');

  if (nameEl) nameEl.textContent = studentName + ` (${studentEmail})`;
  if (utrEl) utrEl.textContent = utrNumber;

  if (radioFake) radioFake.checked = true;
  if (noticeTextarea) noticeTextarea.value = REJECT_PRESETS.fake;

  if (modal) modal.classList.add("active");
};

// Search & Export
function setupSearchAndExport() {
  const searchInput = document.getElementById("search-users-input");
  const filterSelect = document.getElementById("filter-status-select");
  const exportBtn = document.getElementById("export-csv-btn");

  function filterUsers() {
    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const filter = filterSelect ? filterSelect.value : "all";

    const filtered = allUsersData.filter(u => {
      const matchQuery = !q ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.mobile && u.mobile.includes(q)) ||
        (u.pass && u.pass.pass_code && u.pass.pass_code.toLowerCase().includes(q)) ||
        (u.payment && u.payment.utr_number && u.payment.utr_number.toLowerCase().includes(q));

      let matchFilter = true;
      if (filter === "agreed") matchFilter = Boolean(u.consent_agreed);
      if (filter === "not_agreed") matchFilter = !u.consent_agreed;
      if (filter === "approved") matchFilter = u.payment && u.payment.status === "approved";
      if (filter === "pending") matchFilter = u.payment && u.payment.status === "pending";
      if (filter === "not_paid") matchFilter = !u.payment;

      return matchQuery && matchFilter;
    });

    renderUsersTable(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", filterUsers);
  if (filterSelect) filterSelect.addEventListener("change", filterUsers);

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

// Screenshot Viewer Modal
function setupScreenshotModal() {
  const modal = document.getElementById("screenshot-modal");
  const modalClose = document.getElementById("screenshot-modal-close");
  const modalImg = document.getElementById("modal-screenshot-img");
  const modalDownload = document.getElementById("modal-screenshot-download");

  window.openScreenshotModal = function (url) {
    if (modalImg) modalImg.src = url;
    if (modalDownload) modalDownload.href = url;
    if (modal) modal.classList.add("active");
  };

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      if (modal) modal.classList.remove("active");
    });
  }
}

// ========================================================
// TAB 3: GATE CAMERA QR SCANNER IMPLEMENTATION
// ========================================================
function setupGateScanner() {
  const startBtn = document.getElementById("start-camera-btn");
  const stopBtn = document.getElementById("stop-camera-btn");

  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    startCameraScanner();
  });

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stopCameraScanner();
    });
  }
}

function startCameraScanner() {
  const startBtn = document.getElementById("start-camera-btn");
  const stopBtn = document.getElementById("stop-camera-btn");
  const resultCard = document.getElementById("scan-result-card");

  if (resultCard) resultCard.style.display = "none";

  if (!html5QrCodeScanner) {
    html5QrCodeScanner = new Html5Qrcode("scanner-reader");
  }

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrCodeScanner.start(
    { facingMode: "environment" },
    config,
    onQrCodeSuccess,
    onQrCodeError
  ).then(() => {
    isScanning = true;
    if (startBtn) startBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-flex";
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
      if (startBtn) startBtn.style.display = "inline-flex";
      if (stopBtn) stopBtn.style.display = "none";
    }).catch(err => console.error("Camera stop error:", err));
  }
}

// On QR Scanned at Gate
async function onQrCodeSuccess(decodedText) {
  if (html5QrCodeScanner && isScanning) {
    html5QrCodeScanner.pause();
  }

  const resultCard = document.getElementById("scan-result-card");
  if (resultCard) {
    resultCard.style.display = "block";
    resultCard.innerHTML = `<div style="text-align: center; color: var(--cyan);">🔍 Verifying pass credentials with local database...</div>`;
  }

  try {
    const res = await API.checkInPass(decodedText);
    const pass = res.pass;
    const student = res.student || {};
    const payment = res.payment || {};

    playBeep(true);
    loadCheckInLog();

    if (resultCard) {
      resultCard.style.background = "rgba(16, 185, 129, 0.15)";
      resultCard.style.border = "2px solid var(--success)";
      const entryTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      resultCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge badge-success" style="font-size: 0.8rem;">✓ ACCESS GRANTED</span>
          <span class="font-mono" style="color: var(--cyan); font-weight: 700;">${pass.pass_code}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
          <img src="${student.avatar_url || 'assets/avatars/av1.svg'}" alt="Avatar" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--success);">
          <div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${student.full_name || 'Student'}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">${student.email} • +91 ${student.mobile || payment.payment_mobile || ''}</div>
            <div style="font-size: 0.75rem; color: var(--gold); font-weight: 700;">UTR: ${payment.utr_number || '--'}</div>
          </div>
        </div>

        <div style="background: var(--bg-surface); padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.8rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Gender:</span>
          <span style="color: var(--text-main); text-transform: capitalize; font-weight: 600;">${student.gender || '--'}</span>
        </div>
        <div style="background: var(--bg-surface); padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.8rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Entry Time:</span>
          <span style="color: var(--success); font-weight: 700;">🕐 ${entryTime}</span>
        </div>

        <div style="background: var(--bg-surface); padding: 0.6rem; border-radius: 8px; font-size: 0.8rem; color: var(--success); text-align: center; font-weight: 700;">
          🎉 WELCOME TO MCA FRESHERS 2026!
        </div>

        <button class="btn btn-primary btn-sm" onclick="resumeScanner()" style="width: 100%; margin-top: 1rem;">
          Scan Next Student →
        </button>
      `;
    }

  } catch (err) {
    playBeep(false);
    console.error("Gate scan validation error:", err);

    if (resultCard) {
      if (err.message && err.message.toLowerCase().includes("already")) {
        resultCard.style.background = "rgba(239, 68, 68, 0.15)";
        resultCard.style.border = "2px solid var(--error)";
        resultCard.innerHTML = `
          <div style="font-size: 1.5rem; color: var(--error); margin-bottom: 0.5rem;">❌ PASS ALREADY USED!</div>
          <div style="font-size: 0.95rem; color: var(--text-main); margin-top: 0.2rem;">
            This pass has already been scanned for entry.
          </div>
          <div style="font-size: 0.82rem; color: var(--error); margin-top: 0.5rem; font-weight: 700;">
            ⚠️ DUPLICATE ENTRY PROHIBITED. Please check student ID card.
          </div>
          <button class="btn btn-secondary btn-sm" onclick="resumeScanner()" style="margin-top: 1rem;">Scan Next</button>
        `;
      } else {
        resultCard.style.background = "rgba(245, 158, 11, 0.15)";
        resultCard.style.border = "2px solid var(--warning)";
        resultCard.innerHTML = `
          <div style="font-size: 1.5rem; color: var(--warning); margin-bottom: 0.5rem;">⚠️ UNRECOGNIZED PASS</div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">
            ${err.message || 'This pass code was not found in the verified database. Do not permit entry.'}
          </p>
          <button class="btn btn-secondary btn-sm" onclick="resumeScanner()" style="margin-top: 1rem;">Scan Next</button>
        `;
      }
    }
  }
}

function onQrCodeError(errorMessage) {
  // Ignored in normal scanning loop
}

window.resumeScanner = function () {
  const resultCard = document.getElementById("scan-result-card");
  if (resultCard) resultCard.style.display = "none";
  if (html5QrCodeScanner && isScanning) {
    html5QrCodeScanner.resume();
  }
};

function playBeep(isSuccess = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isSuccess ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isSuccess ? 0.18 : 0.3));
  } catch (e) {
    // Audio context not allowed or unsupported
  }
}
