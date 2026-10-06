/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Student Dashboard Controller (Local Express & SQLite API)
 */

let currentStudent = null;
let currentProfile = null;
let currentPayment = null;
let pollTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. AUTH CHECK
  try {
    const { session, user } = await API.getSession();
    if (!session || !user) {
      window.location.href = "auth.html?mode=login";
      return;
    }
    currentStudent = user;
    currentProfile = user;
  } catch (err) {
    window.location.href = "auth.html?mode=login";
    return;
  }

  // Sign out button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await API.logout();
      window.location.href = "index.html";
    });
  }

  // 2. RENDER PROFILE
  renderStudentProfile();

  // 3. FETCH PAYMENT STATUS
  await fetchStudentPayment();

  // 4. SETUP SCROLL-TO-BOTTOM ENFORCED CONSENT
  initConsentScrollEnforcement();

  // 5. LIVE STATUS POLLING (Checks for real-time payment updates)
  startLiveStatusPolling();
});

// Render Profile
function renderStudentProfile() {
  if (!currentProfile) return;

  const navName = document.getElementById("nav-user-name");
  const greetingName = document.getElementById("dash-greeting-name");
  const navAvatar = document.getElementById("nav-avatar-img");
  const paymentMobile = document.getElementById("payment-mobile");

  if (navName) navName.textContent = currentProfile.full_name || "Student";
  if (greetingName) greetingName.textContent = (currentProfile.full_name || "Student").split(" ")[0];
  if (navAvatar && currentProfile.avatar_url) navAvatar.src = currentProfile.avatar_url;
  if (paymentMobile && currentProfile.mobile) paymentMobile.value = currentProfile.mobile;
}

// Fetch Payment Status
async function fetchStudentPayment() {
  try {
    const payment = await API.getMyPayment();
    currentPayment = payment;
    updateStepUI();
  } catch (err) {
    console.warn("Could not fetch payment record:", err);
  }
}

// Update Active Step on Dashboard
function updateStepUI() {
  const step1 = document.getElementById("step-1-container");
  const step2 = document.getElementById("step-2-container");
  const stepStatus = document.getElementById("step-status-container");

  const node1 = document.getElementById("step-node-1");
  const node2 = document.getElementById("step-node-2");
  const node3 = document.getElementById("step-node-3");
  const node4 = document.getElementById("step-node-4");

  if (!step1 || !step2 || !stepStatus) return;

  // Reset classes
  [node1, node2, node3, node4].forEach(n => {
    if (n) n.classList.remove("active", "completed");
  });

  // State 1: Consent not yet given
  if (!currentProfile || !currentProfile.consent_agreed) {
    step1.style.display = "block";
    step2.style.display = "none";
    stepStatus.style.display = "none";

    if (node1) node1.classList.add("active");
    return;
  }

  // State 2: Consent given, but no payment submitted yet
  if (!currentPayment) {
    if (node1) node1.classList.add("completed");
    if (node2) node2.classList.add("active");

    step1.style.display = "none";
    step2.style.display = "block";
    stepStatus.style.display = "none";
    return;
  }

  // State 3: Payment submitted (Pending, Approved, or Rejected)
  if (node1) node1.classList.add("completed");
  if (node2) node2.classList.add("completed");
  if (node3) node3.classList.add("completed");

  step1.style.display = "none";
  step2.style.display = "none";
  stepStatus.style.display = "block";

  renderPaymentStatus(currentPayment);
}

// Render Status Details Screen
function renderPaymentStatus(payment) {
  const node4 = document.getElementById("step-node-4");
  const iconBox = document.getElementById("status-icon-box");
  const heading = document.getElementById("status-heading");
  const desc = document.getElementById("status-desc");
  const badge = document.getElementById("detail-status-badge");
  const utrSpan = document.getElementById("detail-utr");
  const timeSpan = document.getElementById("detail-submitted-at");
  const viewPassBtn = document.getElementById("view-pass-btn");
  const resubmitBtn = document.getElementById("resubmit-payment-btn");
  const rejectionBox = document.getElementById("rejection-note-box");

  if (!utrSpan || !timeSpan) return;

  utrSpan.textContent = payment.utr_number || "--";
  timeSpan.textContent = payment.submitted_at 
    ? new Date(payment.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : "Just now";

  if (payment.status === "approved") {
    if (node4) node4.classList.add("completed", "active");

    if (iconBox) {
      iconBox.style.background = "var(--success-glow)";
      iconBox.style.color = "var(--success)";
      iconBox.textContent = "🎉";
    }

    if (heading) heading.innerHTML = `Entry Pass <span style="color: var(--success);">Approved &amp; Ready!</span>`;
    if (desc) desc.textContent = "Congratulations! Your payment has been verified by the organizing team. Your official pass with unique scannable QR code is ready for download.";

    if (badge) {
      badge.className = "badge badge-success";
      badge.textContent = "Approved ✓";
    }

    if (viewPassBtn) viewPassBtn.style.display = "inline-flex";
    if (resubmitBtn) resubmitBtn.style.display = "none";
    if (rejectionBox) rejectionBox.style.display = "none";

    // Trigger celebration confetti
    if (typeof confetti === "function") {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

  } else if (payment.status === "rejected") {
    if (node4) node4.classList.remove("completed", "active");

    const note = (payment.admin_note || "").trim();
    const isMisconduct = note.toUpperCase().includes("MISCONDUCT") || 
                         note.toUpperCase().includes("FAKE") || 
                         note.toUpperCase().includes("FRAUD") || 
                         note.toUpperCase().includes("FORGED") ||
                         note.toUpperCase().includes("DISCIPLINARY");

    if (isMisconduct) {
      if (iconBox) {
        iconBox.style.background = "rgba(239, 68, 68, 0.25)";
        iconBox.style.color = "var(--error)";
        iconBox.style.boxShadow = "0 0 25px rgba(239, 68, 68, 0.6)";
        iconBox.textContent = "🚨";
      }

      if (heading) heading.innerHTML = `<span class="blinking-red-name" style="font-size: 1.45rem;">🚨 PASS REJECTED: NOTICE OF MISCONDUCT</span>`;
      if (desc) desc.innerHTML = `<strong style="color: var(--error);">Official disciplinary warning issued:</strong> Fake or fraudulent payment submissions violate event code of conduct rules. Your record has been flagged for disciplinary action by organizing committee.`;

      if (badge) {
        badge.className = "badge badge-danger";
        badge.textContent = "REJECTED • MISCONDUCT FLAGGED";
      }

      if (rejectionBox) {
        rejectionBox.className = "disciplinary-alert-box";
        rejectionBox.style.display = "block";
        rejectionBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.25rem;">🚨</span>
            <strong style="color: var(--error); font-size: 0.95rem; letter-spacing: 0.02em;">OFFICIAL DISCIPLINARY NOTICE FROM ADMIN:</strong>
          </div>
          <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-main); background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 8px; border-left: 4px solid var(--error); margin-bottom: 0.75rem;">
            ${note || "Submission of fake/forged payment proof is strictly prohibited."}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
            ⚠️ <strong>Disciplinary Action Note:</strong> If you believe this is in error, immediately contact Chief Student Coordinators with your official bank account debit statement:
            <div style="margin-top: 0.4rem; display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="tel:9105802148" style="color: var(--cyan); font-weight: 700; text-decoration: none;">📞 +91 91058 02148 (Vibhu)</a>
              <a href="tel:6392955739" style="color: var(--cyan); font-weight: 700; text-decoration: none;">📞 +91 63929 55739 (Utsav)</a>
            </div>
          </div>
        `;
      }
    } else {
      if (iconBox) {
        iconBox.style.background = "var(--error-glow)";
        iconBox.style.color = "var(--error)";
        iconBox.style.boxShadow = "none";
        iconBox.textContent = "❌";
      }

      if (heading) heading.innerHTML = `Payment <span style="color: var(--error);">Declined</span>`;
      if (desc) desc.textContent = "There was an issue with your payment verification. Please review the admin note below and resubmit your valid transaction details.";

      if (badge) {
        badge.className = "badge badge-danger";
        badge.textContent = "Rejected";
      }

      if (rejectionBox) {
        rejectionBox.className = "";
        rejectionBox.style.cssText = "display: block; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; text-align: left; max-width: 480px; margin-left: auto; margin-right: auto;";
        rejectionBox.innerHTML = `
          <div style="font-weight: 700; color: var(--error); font-size: 0.9rem; margin-bottom: 0.25rem;">Rejection Note from Admin:</div>
          <div id="rejection-note-text" style="font-size: 0.85rem; color: var(--text-main);">${note || "Invalid UTR or screenshot. Please resubmit with correct details."}</div>
        `;
      }
    }

    if (viewPassBtn) viewPassBtn.style.display = "none";
    if (resubmitBtn) {
      resubmitBtn.style.display = "inline-flex";
      resubmitBtn.innerHTML = `<span>Resubmit Genuine Payment Details</span>`;
      resubmitBtn.onclick = () => {
        document.getElementById("step-status-container").style.display = "none";
        document.getElementById("step-2-container").style.display = "block";
        document.getElementById("step-node-2").classList.add("active");
      };
    }

  } else {
    // PENDING
    if (node4) node4.classList.add("active");

    if (iconBox) {
      iconBox.style.background = "rgba(245, 158, 11, 0.18)";
      iconBox.style.color = "var(--warning)";
      iconBox.textContent = "⏳";
    }

    if (heading) heading.textContent = "Payment Under Review";
    if (desc) desc.textContent = "Your payment details have been submitted to the MCA Batch of 2025–2027 Organizing Committee. Approvals usually take 15-30 minutes.";

    if (badge) {
      badge.className = "badge badge-warning";
      badge.textContent = "Pending Review";
    }

    if (viewPassBtn) viewPassBtn.style.display = "none";
    if (resubmitBtn) resubmitBtn.style.display = "none";
    if (rejectionBox) rejectionBox.style.display = "none";
  }
}

// Scroll-enforced consent implementation
function initConsentScrollEnforcement() {
  const scrollBox = document.getElementById("terms-scroll-box");
  const consentCheckbox = document.getElementById("consent-checkbox");
  const agreeBtn = document.getElementById("agree-proceed-btn");
  const scrollHint = document.getElementById("terms-scroll-hint");

  if (!scrollBox || !consentCheckbox || !agreeBtn) return;

  let hasScrolledToBottom = false;

  scrollBox.addEventListener("scroll", () => {
    const isAtBottom = scrollBox.scrollHeight - scrollBox.scrollTop <= scrollBox.clientHeight + 18;
    if (isAtBottom && !hasScrolledToBottom) {
      hasScrolledToBottom = true;
      consentCheckbox.disabled = false;
      if (scrollHint) {
        scrollHint.innerHTML = `✓ <span style="color: var(--success); font-weight: 600;">Acknowledgement read! You can now check the box below to agree.</span>`;
      }
    }
  });

  consentCheckbox.addEventListener("change", () => {
    agreeBtn.disabled = !consentCheckbox.checked;
  });

  agreeBtn.addEventListener("click", async () => {
    if (!consentCheckbox.checked) return;

    agreeBtn.disabled = true;
    agreeBtn.textContent = "Recording agreement...";

    try {
      const data = await API.updateConsent();
      currentProfile.consent_agreed = true;
      updateStepUI();
    } catch (err) {
      console.error("Consent recording error:", err);
      alert("Error saving consent: " + err.message);
      agreeBtn.disabled = false;
      agreeBtn.textContent = "I Agree & Proceed to Payment (₹200)";
    }
  });
}

// Live status polling (periodically checks for payment approval/rejection)
function startLiveStatusPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (currentStudent && (!currentPayment || currentPayment.status === "pending")) {
      try {
        const payment = await API.getMyPayment();
        if (payment && (!currentPayment || payment.status !== currentPayment.status)) {
          currentPayment = payment;
          updateStepUI();
        }
      } catch (e) {
        // quiet polling
      }
    }
  }, 10000); // Check every 10 seconds
}
