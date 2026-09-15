/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Entry Pass Generator & Downloader Module (PDF, Image, QR Code)
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
  const downloadPdfBtn = document.getElementById("download-pdf-btn");

  if (!supabase) {
    alert("Supabase SDK not loaded.");
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

    // 2. Query Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // 3. Query Payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!payment) {
      loadingState.style.display = "none";
      deniedState.style.display = "block";
      deniedReason.textContent = "You have not submitted your ₹99 payment yet. Please complete payment on your dashboard.";
      return;
    }

    if (payment.status !== "approved") {
      loadingState.style.display = "none";
      deniedState.style.display = "block";
      if (payment.status === "rejected") {
        deniedReason.innerHTML = `Your payment was rejected. Reason: <strong>${payment.admin_note || "Invalid transaction"}</strong>. Please resubmit on your dashboard.`;
      } else {
        deniedReason.textContent = "Your payment is currently pending review by the organizing committee. Passes become active once verified.";
      }
      return;
    }

    // 4. Query or Generate Pass Record
    let { data: pass, error: passError } = await supabase
      .from("passes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // If pass record was not created during approval, create it now safely
    if (!pass) {
      const generatedCode = `IET-MCA-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const qrData = JSON.stringify({
        event: "MCA_FRESHERS_2026",
        pass_code: generatedCode,
        name: profile ? profile.full_name : session.user.email,
        email: session.user.email,
        mobile: profile ? profile.mobile : (payment.payment_mobile || ""),
        utr: payment.utr_number
      });

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
        .single();

      pass = newPass || {
        pass_code: generatedCode,
        qr_payload: qrData,
        issued_at: new Date().toISOString()
      };
    }

    // 5. Populate Pass UI
    studentName.textContent = profile ? profile.full_name : (session.user.user_metadata?.full_name || "Student");
    studentEmail.textContent = session.user.email;
    studentMobile.textContent = profile ? `+91 ${profile.mobile}` : (payment.payment_mobile ? `+91 ${payment.payment_mobile}` : "--");
    studentGender.textContent = profile && profile.gender ? (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)) : "Not specified";
    
    passCodeDisplay.textContent = pass.pass_code;
    utrDisplay.textContent = payment.utr_number;
    issuedDate.textContent = `Issued: ${new Date(pass.issued_at || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;

    if (profile && profile.avatar_url) {
      avatarImg.src = profile.avatar_url;
    } else {
      avatarImg.src = "assets/avatars/av1.svg";
    }

    // 6. Generate QR Code
    qrContainer.innerHTML = "";
    const qrPayloadString = pass.qr_payload || JSON.stringify({
      event: "MCA_FRESHERS_2026",
      pass_code: pass.pass_code,
      name: studentName.textContent,
      utr: payment.utr_number
    });

    new QRCode(qrContainer, {
      text: qrPayloadString,
      width: 170,
      height: 170,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    // Show Pass Card
    loadingState.style.display = "none";
    passWrapper.style.display = "block";

    // 7. DOWNLOAD AS PNG (html2canvas)
    downloadPngBtn.addEventListener("click", () => {
      const passElement = document.getElementById("pass-printable-card");
      downloadPngBtn.disabled = true;
      downloadPngBtn.textContent = "Generating Image...";

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

    // 8. DOWNLOAD AS PDF (jsPDF + html2canvas)
    downloadPdfBtn.addEventListener("click", () => {
      const passElement = document.getElementById("pass-printable-card");
      downloadPdfBtn.disabled = true;
      downloadPdfBtn.textContent = "Generating PDF...";

      html2canvas(passElement, {
        scale: 2,
        useCORS: true
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a5"
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
        pdf.save(`MCA_Freshers_2026_Pass_${pass.pass_code}.pdf`);

        downloadPdfBtn.disabled = false;
        downloadPdfBtn.innerHTML = `<span>📄 Download PDF</span>`;
      }).catch(err => {
        console.error("PDF export error:", err);
        alert("Failed to generate PDF: " + err.message);
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.innerHTML = `<span>📄 Download PDF</span>`;
      });
    });

  } catch (err) {
    console.error("Pass generation error:", err);
    loadingState.style.display = "none";
    deniedState.style.display = "block";
    deniedReason.textContent = "An error occurred while loading your pass: " + err.message;
  }
});
