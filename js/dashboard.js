/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Student Dashboard Controller
 */

let currentStudent = null;
let currentProfile = null;
let currentPayment = null;

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = getSupabase();

  if (!supabase) {
    alert("Supabase SDK not loaded. Please check your internet connection.");
    return;
  }

  // 1. AUTH CHECK
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || !session.user) {
    window.location.href = "auth.html?mode=login";
    return;
  }

  currentStudent = session.user;

  // Sign out button
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  // 2. FETCH PROFILE
  await fetchStudentProfile();

  // 3. FETCH PAYMENT STATUS
  await fetchStudentPayment();

  // 4. SETUP SCROLL-TO-BOTTOM ENFORCED CONSENT
  initConsentScrollEnforcement();

  // 5. SETUP REALTIME SUBSCRIPTION FOR LIVE STATUS
  initRealtimeStatusSubscription();
});

// Fetch Profile from Supabase (with self-healing fallback)
async function fetchStudentProfile() {
  const supabase = getSupabase();
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentStudent.id)
    .maybeSingle();

  if (!profile) {
    console.warn("Profile not found in profiles table, self-healing record for user:", currentStudent.id);
    const newProfileData = {
      id: currentStudent.id,
      full_name: currentStudent.user_metadata?.full_name || (currentStudent.email ? currentStudent.email.split("@")[0] : "Student"),
      email: currentStudent.email,
      mobile: currentStudent.user_metadata?.mobile || null,
      gender: currentStudent.user_metadata?.gender || "prefer_not_to_say",
      consent_agreed: false,
      avatar_url: "assets/avatars/av1.svg",
      avatar_type: "preset"
    };

    // Attempt to insert/upsert into public.profiles
    const { data: healedProfile, error: healErr } = await supabase
      .from("profiles")
      .upsert(newProfileData, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (!healErr && healedProfile) {
      profile = healedProfile;
    } else {
      console.warn("Could not auto-insert profile into profiles table:", healErr);
      profile = newProfileData;
    }
  }

  currentProfile = profile;

  // Update UI Elements
  document.getElementById("nav-user-name").textContent = currentProfile.full_name || "Student";
  document.getElementById("dash-greeting-name").textContent = (currentProfile.full_name || "Student").split(" ")[0];
  
  if (currentProfile.avatar_url) {
    document.getElementById("nav-avatar-img").src = currentProfile.avatar_url;
  }

  // Prefill mobile in payment form
  const paymentMobileInput = document.getElementById("payment-mobile");
  if (paymentMobileInput && currentProfile.mobile) {
    paymentMobileInput.value = currentProfile.mobile;
  }
}

// Fetch Payment Status from Supabase
async function fetchStudentPayment() {
  const supabase = getSupabase();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", currentStudent.id)
    .maybeSingle();

  currentPayment = payment;

  // Determine which step to show
  updateStepUI();
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

  // Reset classes
  [node1, node2, node3, node4].forEach(n => {
    n.classList.remove("active", "completed");
  });

  // State 1: Consent not yet given
  if (!currentProfile.consent_agreed) {
    step1.style.display = "block";
    step2.style.display = "none";
    stepStatus.style.display = "none";

    node1.classList.add("active");
    return;
  }

  // State 2: Consent given, but no payment submitted yet
  if (!currentPayment) {
    node1.classList.add("completed");
    node2.classList.add("active");

    step1.style.display = "none";
    step2.style.display = "block";
    stepStatus.style.display = "none";
    return;
  }

  // State 3: Payment submitted (Pending, Approved, or Rejected)
  node1.classList.add("completed");
  node2.classList.add("completed");
  node3.classList.add("completed");

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
  const rejectionText = document.getElementById("rejection-note-text");

  utrSpan.textContent = payment.utr_number || "--";
  timeSpan.textContent = payment.submitted_at 
    ? new Date(payment.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : "Just now";

  if (payment.status === "approved") {
    node4.classList.add("completed", "active");

    iconBox.style.background = "var(--success-glow)";
    iconBox.style.color = "var(--success)";
    iconBox.textContent = "🎉";

    heading.innerHTML = `Entry Pass <span style="color: var(--success);">Approved &amp; Ready!</span>`;
    desc.textContent = "Congratulations! Your payment has been verified by the organizing team. Your official pass with unique scannable QR code is ready for download.";

    badge.className = "badge badge-success";
    badge.textContent = "Approved ✓";

    viewPassBtn.style.display = "inline-flex";
    resubmitBtn.style.display = "none";
    rejectionBox.style.display = "none";

    // Trigger celebration confetti
    if (typeof confetti === "function") {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

  } else if (payment.status === "rejected") {
    node4.classList.remove("completed", "active");

    const note = (payment.admin_note || "").trim();
    const isMisconduct = note.toUpperCase().includes("MISCONDUCT") || 
                         note.toUpperCase().includes("FAKE") || 
                         note.toUpperCase().includes("FRAUD") || 
                         note.toUpperCase().includes("FORGED") ||
                         note.toUpperCase().includes("DISCIPLINARY");

    if (isMisconduct) {
      iconBox.style.background = "rgba(239, 68, 68, 0.25)";
      iconBox.style.color = "var(--error)";
      iconBox.style.boxShadow = "0 0 25px rgba(239, 68, 68, 0.6)";
      iconBox.textContent = "🚨";

      heading.innerHTML = `<span class="blinking-red-name" style="font-size: 1.45rem;">🚨 PASS REJECTED: NOTICE OF MISCONDUCT</span>`;
      desc.innerHTML = `<strong style="color: var(--error);">Official disciplinary warning issued:</strong> Fake or fraudulent payment submissions violate event code of conduct rules. Your record has been flagged for disciplinary action by organizing committee.`;

      badge.className = "badge badge-danger";
      badge.textContent = "REJECTED • MISCONDUCT FLAGGED";

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
    } else {
      iconBox.style.background = "var(--error-glow)";
      iconBox.style.color = "var(--error)";
      iconBox.style.boxShadow = "none";
      iconBox.textContent = "❌";

      heading.innerHTML = `Payment <span style="color: var(--error);">Declined</span>`;
      desc.textContent = "There was an issue with your payment verification. Please review the admin note below and resubmit your valid transaction details.";

      badge.className = "badge badge-danger";
      badge.textContent = "Rejected";

      rejectionBox.className = "";
      rejectionBox.style.cssText = "display: block; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; text-align: left; max-width: 480px; margin-left: auto; margin-right: auto;";
      rejectionBox.innerHTML = `
        <div style="font-weight: 700; color: var(--error); font-size: 0.9rem; margin-bottom: 0.25rem;">Rejection Note from Admin:</div>
        <div id="rejection-note-text" style="font-size: 0.85rem; color: var(--text-main);">${note || "Invalid UTR or screenshot. Please resubmit with correct details."}</div>
      `;
    }

    viewPassBtn.style.display = "none";
    resubmitBtn.style.display = "inline-flex";
    resubmitBtn.innerHTML = `<span>Resubmit Genuine Payment Details</span>`;

    // Resubmit action
    resubmitBtn.onclick = () => {
      document.getElementById("step-status-container").style.display = "none";
      document.getElementById("step-2-container").style.display = "block";
      document.getElementById("step-node-2").classList.add("active");
    };

  } else {
    // PENDING
    node4.classList.add("active");

    iconBox.style.background = "rgba(245, 158, 11, 0.18)";
    iconBox.style.color = "var(--warning)";
    iconBox.textContent = "⏳";

    heading.textContent = "Payment Under Review";
    desc.textContent = "Your payment details have been submitted to the MCA Batch of 2025–2027 Organizing Committee. Approvals usually take 15-30 minutes.";

    badge.className = "badge badge-warning";
    badge.textContent = "Pending Review";

    viewPassBtn.style.display = "none";
    resubmitBtn.style.display = "none";
    rejectionBox.style.display = "none";
  }
}

// ==========================================
// SCROLL-ENFORCED CONSENT IMPLEMENTATION
// ==========================================
function initConsentScrollEnforcement() {
  const scrollBox = document.getElementById("terms-scroll-box");
  const consentCheckbox = document.getElementById("consent-checkbox");
  const agreeBtn = document.getElementById("agree-proceed-btn");
  const scrollHint = document.getElementById("terms-scroll-hint");

  let hasScrolledToBottom = false;

  scrollBox.addEventListener("scroll", () => {
    // Check if scrolled within 15px of bottom
    const isAtBottom = scrollBox.scrollHeight - scrollBox.scrollTop <= scrollBox.clientHeight + 18;
    if (isAtBottom && !hasScrolledToBottom) {
      hasScrolledToBottom = true;
      consentCheckbox.disabled = false;
      scrollHint.innerHTML = `✓ <span style="color: var(--success); font-weight: 600;">Acknowledgement read! You can now check the box below to agree.</span>`;
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
      const supabase = getSupabase();
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: currentStudent.id,
          full_name: (currentProfile && currentProfile.full_name) || currentStudent.user_metadata?.full_name || (currentStudent.email ? currentStudent.email.split("@")[0] : "Student"),
          email: currentStudent.email,
          mobile: (currentProfile && currentProfile.mobile) || currentStudent.user_metadata?.mobile || null,
          gender: (currentProfile && currentProfile.gender) || currentStudent.user_metadata?.gender || "prefer_not_to_say",
          avatar_url: (currentProfile && currentProfile.avatar_url) || "assets/avatars/av1.svg",
          avatar_type: "preset",
          consent_agreed: true,
          consent_agreed_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (error) throw error;

      currentProfile.consent_agreed = true;
      updateStepUI();

    } catch (err) {
      console.error("Consent recording error:", err);
      alert("Error saving consent. Please try again: " + err.message);
      agreeBtn.disabled = false;
      agreeBtn.textContent = "I Agree & Proceed to Payment (₹200)";
    }
  });
}

// Realtime listener for payment approval
function initRealtimeStatusSubscription() {
  const supabase = getSupabase();
  if (!supabase || !currentStudent) return;

  supabase
    .channel(`student-payment-${currentStudent.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${currentStudent.id}`
      },
      (payload) => {
        console.log("Realtime payment update received:", payload);
        currentPayment = payload.new;
        updateStepUI();
      }
    )
    .subscribe();
}
