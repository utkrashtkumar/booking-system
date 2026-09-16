/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Entry Pass Generator & Downloader Module (High-Reliability & Mobile-Optimized)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = getSupabase();

  const loadingState = document.getElementById("pass-loading");
  const deniedState = document.getElementById("pass-denied");
  const passWrapper = document.getElementById("pass-content-wrapper");
  const deniedReason = document.getElementById("denied-reason");

  const avatarImg = document.getElementById("pass-avatar-img");
  const studentName = document.getElementById("pass-student-name");
  const studentEmail = document.getElementById("pass-email");
  const studentMobile = document.getElementById("pass-mobile");
  const studentGender = document.getElementById("pass-gender");
  const passCodeDisplay = document.getElementById("pass-code-display");
  const utrDisplay = document.getElementById("pass-utr-display");
  const issuedDate = document.getElementById("pass-issued-date");
  const qrContainer = document.getElementById("qrcode-container");
  const downloadPngBtn = document.getElementById("download-png-btn");

  if (!supabase) {
    if (loadingState) loadingState.style.display = "none";
    if (deniedState) deniedState.style.display = "block";
    if (deniedReason) deniedReason.textContent = "Supabase SDK not loaded. Please check your internet connection.";
    return;
  }

  try {
    // 1. Check Authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      window.location.href = "auth.html?mode=login";
      return;
    }

    const userId = session.user.id;

    // 2. Query Profile (Safe query)
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // 3. Query Payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!payment) {
      if (loadingState) loadingState.style.display = "none";
      if (deniedState) deniedState.style.display = "block";
      if (deniedReason) deniedReason.textContent = "You have not submitted your ₹99 payment yet. Please complete payment on your dashboard.";
      return;
    }

    if (payment.status !== "approved") {
      if (loadingState) loadingState.style.display = "none";
      if (deniedState) deniedState.style.display = "block";
      if (payment.status === "rejected") {
        if (deniedReason) deniedReason.innerHTML = `Your payment was rejected. Reason: <strong>${payment.admin_note || "Invalid transaction"}</strong>. Please resubmit on your dashboard.`;
      } else {
        if (deniedReason) deniedReason.textContent = "Your payment is currently pending review by the organizing committee. Passes become active once verified.";
      }
      return;
    }

    // 4. Query or Generate Pass Record
    let { data: pass } = await supabase
      .from("passes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // If pass record was not created during approval, create it now safely
    if (!pass) {
      const generatedCode = `IET-MCA-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const resolvedName = (profile && profile.full_name) || session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split("@")[0] : "Student");
      const resolvedMobile = (profile && profile.mobile) || payment.payment_mobile || session.user.user_metadata?.mobile || "";

      const qrData = JSON.stringify({
        event: "MCA_FRESHERS_2026",
        pass_code: generatedCode,
        name: resolvedName,
        email: session.user.email,
        mobile: resolvedMobile,
        utr: payment.utr_number
      });

      try {
        const { data: newPass, error: createPassError } = await supabase
          .from("passes")
          .insert({
            user_id: userId,
            payment_id: payment.id,
            pass_code: generatedCode,
            qr_payload: qrData,
            issued_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        pass = newPass || {
          pass_code: generatedCode,
          qr_payload: qrData,
          issued_at: new Date().toISOString()
        };
      } catch (insertPassErr) {
        console.warn("Pass insert warning:", insertPassErr);
        pass = {
          pass_code: generatedCode,
          qr_payload: qrData,
          issued_at: new Date().toISOString()
        };
      }
    }

    // 5. Populate Pass UI Safely (Ensures reliable rendering on mobile & desktop)
    const displayName = (profile && profile.full_name) || session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split("@")[0] : "Student");
    const displayEmail = (profile && profile.email) || session.user.email || "--";
    let rawMobile = (profile && profile.mobile) || (payment && payment.payment_mobile) || session.user.user_metadata?.mobile || "";
    let displayMobile = "--";
    if (rawMobile) {
      displayMobile = rawMobile.startsWith("+91") ? rawMobile : `+91 ${rawMobile}`;
    }

    let displayGender = "Not specified";
    const rawGender = (profile && profile.gender) || session.user.user_metadata?.gender;
    if (rawGender && rawGender !== "prefer_not_to_say") {
      displayGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1);
    }

    if (studentName) studentName.textContent = displayName;
    if (studentEmail) studentEmail.textContent = displayEmail;
    if (studentMobile) studentMobile.textContent = displayMobile;
    if (studentGender) studentGender.textContent = displayGender;
    
    if (passCodeDisplay) passCodeDisplay.textContent = pass.pass_code || "--";
    if (utrDisplay) utrDisplay.textContent = payment.utr_number || "--";
    if (issuedDate) {
      const dateVal = pass.issued_at || payment.approved_at || Date.now();
      issuedDate.textContent = `Issued: ${new Date(dateVal).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;
    }

    if (avatarImg) {
      if (profile && profile.avatar_url) {
        avatarImg.src = profile.avatar_url;
      } else {
        avatarImg.src = "assets/avatars/av1.svg";
      }
    }

    // 6. Generate QR Code with Mobile-Resilient Fallback
    if (qrContainer) {
      qrContainer.innerHTML = "";
      const qrPayloadString = pass.qr_payload || JSON.stringify({
        event: "MCA_FRESHERS_2026",
        pass_code: pass.pass_code,
        name: displayName,
        utr: payment.utr_number
      });

      let qrRendered = false;

      if (typeof QRCode !== "undefined") {
        try {
          new QRCode(qrContainer, {
            text: qrPayloadString,
            width: 170,
            height: 170,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
          qrRendered = true;
        } catch (qrErr) {
          console.warn("QRCode canvas error, using image fallback:", qrErr);
        }
      }

      // Fallback for mobile if QRCode JS library didn't load from CDN
      if (!qrRendered) {
        const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=4&data=${encodeURIComponent(qrPayloadString)}`;
        qrContainer.innerHTML = `<img src="${fallbackQrUrl}" alt="QR Entry Pass Code" style="width: 170px; height: 170px; display: block; margin: 0 auto; border-radius: 8px;">`;
      }
    }

    // 7. Reveal the Pass Card & Hide Loading
    if (loadingState) loadingState.style.display = "none";
    if (deniedState) deniedState.style.display = "none";
    if (passWrapper) passWrapper.style.display = "block";

    // 8. DOWNLOAD AS PNG (html2canvas)
    if (downloadPngBtn) {
      downloadPngBtn.addEventListener("click", () => {
        const passElement = document.getElementById("pass-printable-card");
        downloadPngBtn.disabled = true;
        downloadPngBtn.textContent = "Generating Image...";

        if (typeof html2canvas === "undefined") {
          alert("Image export tool is loading. Please try again in a moment.");
          downloadPngBtn.disabled = false;
          downloadPngBtn.innerHTML = `<span>🖼️ Save as Image</span>`;
          return;
        }

        html2canvas(passElement, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: null
        }).then((canvas) => {
          const link = document.createElement("a");
          link.download = `MCA_Freshers_2026_Pass_${pass.pass_code}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          downloadPngBtn.disabled = false;
          downloadPngBtn.innerHTML = `<span>🖼️ Save as Image</span>`;
        }).catch(err => {
          console.error("PNG export error:", err);
          alert("Failed to export image: " + err.message);
          downloadPngBtn.disabled = false;
          downloadPngBtn.innerHTML = `<span>🖼️ Save as Image</span>`;
        });
      });
    }

  } catch (err) {
    console.error("Pass generation error:", err);
    if (loadingState) loadingState.style.display = "none";
    if (deniedState) deniedState.style.display = "block";
    if (deniedReason) deniedReason.textContent = "An error occurred while loading your pass: " + err.message;
  }
});
