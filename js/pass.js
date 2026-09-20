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
      if (deniedReason) deniedReason.textContent = "You have not submitted your ₹200 payment yet. Please complete payment on your dashboard.";
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
      avatarImg.crossOrigin = "anonymous";
      avatarImg.onerror = () => {
        avatarImg.crossOrigin = null;
        avatarImg.src = "assets/avatars/av1.svg";
      };
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

          // Convert QRCode canvas to clean <img> so html2canvas never encounters a hidden 0x0 canvas
          const convertQrCanvasToImg = () => {
            const qrCanvas = qrContainer.querySelector("canvas");
            const qrImg = qrContainer.querySelector("img");
            if (qrCanvas && qrCanvas.width > 0 && qrCanvas.height > 0) {
              try {
                const dataUrl = qrCanvas.toDataURL("image/png");
                qrContainer.innerHTML = `<img src="${dataUrl}" alt="QR Entry Pass Code" style="width: 170px; height: 170px; display: block; margin: 0 auto; border-radius: 8px;">`;
                return;
              } catch (e) {
                console.warn("Canvas toDataURL failed:", e);
              }
            }
            if (qrImg && qrImg.src && qrImg.src.startsWith("data:")) {
              qrImg.style.display = "block";
              qrImg.style.width = "170px";
              qrImg.style.height = "170px";
              qrImg.style.margin = "0 auto";
              qrImg.style.borderRadius = "8px";
              if (qrCanvas) qrCanvas.remove();
            }
          };

          convertQrCanvasToImg();
          setTimeout(convertQrCanvasToImg, 60);
          setTimeout(convertQrCanvasToImg, 250);
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

    // 8. DIRECT CANVAS PASS RENDERER (Fail-Safe Fallback)
    function generateDirectCanvasPass({ pass, displayName, displayEmail, displayMobile, displayGender, payment }) {
      const canvas = document.createElement("canvas");
      const scale = 2;
      const width = 640;
      const height = 980;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, width, height);

      // Rounded Card Container
      const pad = 16;
      const cardW = width - pad * 2;
      const cardH = height - pad * 2;

      ctx.fillStyle = "#0e0e14";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(pad, pad, cardW, cardH, 18);
        ctx.fill();
        ctx.strokeStyle = "rgba(225, 29, 72, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillRect(pad, pad, cardW, cardH);
        ctx.strokeStyle = "rgba(225, 29, 72, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pad, pad, cardW, cardH);
      }

      // Watermark text
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-30 * Math.PI / 180);
      ctx.font = "900 44px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.textAlign = "center";
      ctx.fillText("OFFICIAL ENTRY PASS", 0, 0);
      ctx.restore();

      // Header College Logo
      const logoImg = document.querySelector("#pass-printable-card img[src*='Ietlogo']");
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(62, 62, 22, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.clip();
          ctx.drawImage(logoImg, 40, 40, 44, 44);
          ctx.restore();
        } catch (e) {}
      }

      // Header Title
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("INSTITUTE OF ENGINEERING & TECHNOLOGY, LUCKNOW", 95, 52);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px 'Space Grotesk', sans-serif";
      ctx.fillText("MCA FRESHERS ", 95, 76);
      const titleW = ctx.measureText("MCA FRESHERS ").width;
      ctx.fillStyle = "#fb7185";
      ctx.fillText("2026", 95 + titleW, 76);

      ctx.fillStyle = "#e11d48";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("Unofficial Student Event • Organized by MCA 2027 Seniors", 95, 94);

      // Verified Badge
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(width - 145, 50, 105, 22);
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("VERIFIED PASS ✓", width - 138, 65);

      // Divider
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(38, 112);
      ctx.lineTo(width - 38, 112);
      ctx.stroke();

      // Avatar
      const avatarImg = document.getElementById("pass-avatar-img");
      const avX = 42;
      const avY = 130;
      const avSize = 76;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
        try {
          ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
        } catch (e) {
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(avX, avY, avSize, avSize);
        }
      } else {
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(avX, avY, avSize, avSize);
      }
      ctx.restore();

      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Student Meta
      const metaX = 132;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("STUDENT ATTENDEE", metaX, 142);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 19px sans-serif";
      ctx.fillText(displayName, metaX, 166);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Email: ${displayEmail}`, metaX, 186);
      ctx.fillText(`Mobile: ${displayMobile}   •   Gender: ${displayGender}`, metaX, 202);
      ctx.fillText("Department: MCA (Batch of 2026–2028)", metaX, 218);

      // Event Details Bar
      ctx.fillStyle = "#14141e";
      ctx.fillRect(38, 235, width - 76, 30);
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "11.5px sans-serif";
      ctx.fillText("📅 27 September 2026 (11 AM - 6 PM)   •   📍 My Bar Headquarters, Lucknow", 48, 254);

      // Pass ID & UTR Box
      ctx.fillStyle = "#101018";
      ctx.fillRect(38, 280, width - 76, 48);
      ctx.strokeStyle = "rgba(225, 29, 72, 0.25)";
      ctx.strokeRect(38, 280, width - 76, 48);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9.5px sans-serif";
      ctx.fillText("PASS ID CODE", 50, 296);
      ctx.fillStyle = "#fb7185";
      ctx.font = "bold 15px monospace";
      ctx.fillText(pass.pass_code || "--", 50, 316);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9.5px sans-serif";
      ctx.fillText("UTR / TRANSACTION NO.", width - 230, 296);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 13.5px monospace";
      ctx.fillText(payment.utr_number || "--", width - 230, 316);

      // QR Code Box
      const qrContainer = document.getElementById("qrcode-container");
      const qrImg = qrContainer ? qrContainer.querySelector("img") : null;
      const qrCanvas = qrContainer ? qrContainer.querySelector("canvas") : null;
      const qrSize = 170;
      const qrX = (width - qrSize) / 2;
      const qrY = 352;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

      if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
        try {
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } catch (e) {}
      } else if (qrCanvas && qrCanvas.width > 0) {
        try {
          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        } catch (e) {}
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.fillText("Scan at entry gate via Admin Scanner for instant check-in verification.", width / 2, qrY + qrSize + 24);

      const issuedText = document.getElementById("pass-issued-date");
      if (issuedText) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px sans-serif";
        ctx.fillText(issuedText.textContent.trim(), width / 2, qrY + qrSize + 38);
      }

      // Legal & Consent Box
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
      ctx.fillRect(38, 615, width - 76, 85);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.strokeRect(38, 615, width - 76, 85);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("⚖️ MANDATORY ACKNOWLEDGEMENT & EVENT STATUS SUMMARY", 48, 632);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px sans-serif";
      ctx.fillText("• Unofficial Student-Organized Event: Organized voluntarily by senior students of MCA 2027 batch.", 48, 650);
      ctx.fillText("  NOT an official event of IET Lucknow and not authorized by any college authority or official college body.", 48, 664);
      ctx.fillText("• Voluntary Participation: Attendee participates voluntarily with free consent and agrees to all organizer rules.", 48, 680);

      // Security footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText("⚠️ Strictly Personal & Non-Transferable • Only MCA IET college students allowed • Outsiders strictly prohibited.", width / 2, 725);
      ctx.fillText("Organized voluntarily by senior students of MCA Batch of 2025–2027", width / 2, 740);

      // Trigger automatic high-res PNG download
      const link = document.createElement("a");
      link.download = `MCA_Freshers_2026_Pass_${pass.pass_code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }

    // 9. DOWNLOAD AS PNG (html2canvas with automatic native Canvas fallback)
    if (downloadPngBtn) {
      downloadPngBtn.addEventListener("click", async () => {
        const passElement = document.getElementById("pass-printable-card");
        downloadPngBtn.disabled = true;
        downloadPngBtn.textContent = "Generating Image...";

        let downloadedSuccessfully = false;

        if (typeof html2canvas !== "undefined") {
          try {
            // 1. Convert any leftover canvas to <img>
            const canvases = passElement.querySelectorAll("canvas");
            canvases.forEach(c => {
              if (c.width > 0 && c.height > 0) {
                try {
                  const dataUrl = c.toDataURL("image/png");
                  const img = document.createElement("img");
                  img.src = dataUrl;
                  img.style.width = (c.style.width || c.width + "px");
                  img.style.height = (c.style.height || c.height + "px");
                  img.style.display = "block";
                  img.style.margin = "0 auto";
                  img.style.borderRadius = "8px";
                  c.parentElement.replaceChild(img, c);
                } catch (e) {
                  c.remove();
                }
              } else {
                c.remove();
              }
            });

            // 2. Pre-decode images
            const passImgs = Array.from(passElement.querySelectorAll("img"));
            await Promise.all(passImgs.map(img => {
              if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
              return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
              });
            }));

            const canvas = await html2canvas(passElement, {
              scale: 2, // High resolution
              useCORS: true,
              allowTaint: false,
              backgroundColor: null,
              logging: false,
              ignoreElements: (el) => {
                if (el.tagName === "CANVAS" && (el.width === 0 || el.height === 0 || el.style.display === "none")) {
                  return true;
                }
                return false;
              },
              onclone: (clonedDoc) => {
                const card = clonedDoc.getElementById("pass-printable-card");
                if (card) {
                  const styleTag = clonedDoc.createElement("style");
                  styleTag.textContent = `
                    #pass-printable-card::before, #pass-printable-card::after,
                    #pass-printable-card *::before, #pass-printable-card *::after {
                      display: none !important;
                      content: none !important;
                      background: none !important;
                      background-image: none !important;
                    }
                    .gradient-text {
                      background: none !important;
                      background-image: none !important;
                      color: #fb7185 !important;
                    }
                  `;
                  clonedDoc.head.appendChild(styleTag);
                  card.querySelectorAll("canvas").forEach(c => c.remove());
                }
              }
            });

            const link = document.createElement("a");
            link.download = `MCA_Freshers_2026_Pass_${pass.pass_code}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            downloadedSuccessfully = true;
          } catch (html2canvasErr) {
            console.warn("html2canvas encountered error, executing native canvas pass generator fallback:", html2canvasErr);
          }
        }

        // Fallback: If html2canvas failed or was blocked, generate via direct Canvas 2D
        if (!downloadedSuccessfully) {
          try {
            generateDirectCanvasPass({ pass, displayName, displayEmail, displayMobile, displayGender, payment });
            downloadedSuccessfully = true;
          } catch (fallbackErr) {
            console.error("Fallback pass generation error:", fallbackErr);
            alert("Failed to export image. Please click 'Print / PDF' to save your pass.");
          }
        }

        downloadPngBtn.disabled = false;
        downloadPngBtn.innerHTML = `<span>🖼️ Save as Image</span>`;
      });
    }

  } catch (err) {
    console.error("Pass generation error:", err);
    if (loadingState) loadingState.style.display = "none";
    if (deniedState) deniedState.style.display = "block";
    if (deniedReason) deniedReason.textContent = "An error occurred while loading your pass: " + err.message;
  }
});
