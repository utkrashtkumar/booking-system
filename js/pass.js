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

    // 6. Generate QR Code on pass card
    let qrInstance = null;
    const qrPayloadString = pass.qr_payload || JSON.stringify({
      event: "MCA_FRESHERS_2026",
      pass_code: pass.pass_code,
      name: displayName,
      utr: payment.utr_number
    });

    if (qrContainer) {
      qrContainer.innerHTML = "";
      if (typeof QRCode !== "undefined") {
        try {
          qrInstance = new QRCode(qrContainer, {
            text: qrPayloadString,
            width: 170,
            height: 170,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch (qrInitErr) {
          console.warn("QRCode DOM generation error:", qrInitErr);
        }
      }
    }

    // 7. Reveal the Pass Card & Hide Loading
    if (loadingState) loadingState.style.display = "none";
    if (deniedState) deniedState.style.display = "none";
    if (passWrapper) passWrapper.style.display = "block";

    // 8. DIRECT CANVAS PASS RENDERER (Guaranteed Pixel-Perfect Export with QR Code)
    async function generateDirectCanvasPass({ pass, displayName, displayEmail, displayMobile, displayGender, payment, skipExternalAvatar = false }) {
      const canvas = document.createElement("canvas");
      const scale = 2; // Ultra-sharp Retina 2x scale
      const width = 680;
      const height = 770;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      // 1. Outer Dark Background
      ctx.fillStyle = "#07070b";
      ctx.fillRect(0, 0, width, height);

      // 2. Card Body Container with Crimson Border
      const pad = 16;
      const cardW = width - pad * 2;
      const cardH = height - pad * 2;
      const r = 18;

      ctx.save();
      ctx.fillStyle = "#0e0e16";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(pad, pad, cardW, cardH, r);
        ctx.fill();
        ctx.strokeStyle = "rgba(225, 29, 72, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillRect(pad, pad, cardW, cardH);
        ctx.strokeStyle = "rgba(225, 29, 72, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pad, pad, cardW, cardH);
      }
      ctx.restore();

      // Top subtle crimson specular line
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + r, pad + 1);
      ctx.lineTo(pad + cardW - r, pad + 1);
      ctx.stroke();
      ctx.restore();

      // 3. Watermark Text
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-30 * Math.PI / 180);
      ctx.font = "900 44px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.textAlign = "center";
      ctx.fillText("OFFICIAL ENTRY PASS", 0, 0);
      ctx.restore();

      // 4. College Logo (Pre-loaded & Awaited)
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
        logoImg.src = "Ietlogo.png";
        if (logoImg.complete && logoImg.naturalWidth > 0) resolve();
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(64, 62, 22, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.clip();
          ctx.drawImage(logoImg, 42, 40, 44, 44);
          ctx.restore();
        } catch (e) {}
      }

      // 5. College Header Text
      ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
      ctx.fillText("INSTITUTE OF ENGINEERING & TECHNOLOGY, LUCKNOW", 96, 52);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText("MCA FRESHERS ", 96, 75);
      const titleW = ctx.measureText("MCA FRESHERS ").width;
      ctx.fillStyle = "#fb7185";
      ctx.fillText("2026", 96 + titleW, 75);

      ctx.fillStyle = "#e11d48";
      ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
      ctx.fillText("Unofficial Student Event • Organized by MCA 2027 Seniors", 96, 92);

      // Verified Badge Pill
      ctx.fillStyle = "#064e3b";
      const badgeW = 108;
      const badgeH = 22;
      const badgeX = width - pad - badgeW - 14;
      const badgeY = 52;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 9.5px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VERIFIED PASS ✓", badgeX + badgeW / 2, badgeY + 15);

      // Header Divider Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(38, 110);
      ctx.lineTo(width - 38, 110);
      ctx.stroke();

      // 6. Student Avatar
      const avX = 42;
      const avY = 126;
      const avSize = 76;

      let avatarDrawn = false;
      if (!skipExternalAvatar) {
        const avatarImg = new Image();
        avatarImg.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          avatarImg.onload = resolve;
          avatarImg.onerror = resolve;
          const domAv = document.getElementById("pass-avatar-img");
          avatarImg.src = (profile && profile.avatar_url) ? profile.avatar_url : (domAv ? domAv.src : "assets/avatars/av1.svg");
          if (avatarImg.complete && avatarImg.naturalWidth > 0) resolve();
        });

        if (avatarImg.complete && avatarImg.naturalWidth > 0) {
          try {
            ctx.save();
            ctx.beginPath();
            ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
            ctx.restore();
            avatarDrawn = true;
          } catch (e) {}
        }
      }

      if (!avatarDrawn) {
        // High-contrast clean student initials avatar fallback
        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#1e1b4b";
        ctx.fill();
        ctx.fillStyle = "#e0e7ff";
        ctx.font = "bold 28px 'Space Grotesk', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const initials = displayName ? displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() : "ST";
        ctx.fillText(initials, avX + avSize / 2, avY + avSize / 2);
        ctx.restore();
      }

      // Avatar Crimson Border
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Student Meta
      ctx.textAlign = "left";
      const metaX = 136;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9.5px system-ui, sans-serif";
      ctx.fillText("STUDENT ATTENDEE", metaX, 138);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 19px system-ui, sans-serif";
      ctx.fillText(displayName, metaX, 162);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`Email: ${displayEmail}`, metaX, 182);
      ctx.fillText(`Mobile: ${displayMobile}   •   Gender: ${displayGender}`, metaX, 198);
      ctx.fillText("Department: MCA (Batch of 2026–2028)", metaX, 214);

      // 7. Event Venue & Schedule Pill
      const pillY = 228;
      const pillH = 30;
      ctx.fillStyle = "#141420";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(38, pillY, width - 76, pillH, 8);
        ctx.fill();
      } else {
        ctx.fillRect(38, pillY, width - 76, pillH);
      }
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "11.5px system-ui, sans-serif";
      ctx.fillText("📅 27 September 2026 (11 AM - 6 PM) [Tentative]   •   📍 My Bar Headquarters, Lucknow", 48, pillY + 19);

      // 8. Pass ID & UTR Box
      const boxY = 270;
      const boxH = 48;
      ctx.fillStyle = "#101018";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(38, boxY, width - 76, boxH, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(225, 29, 72, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillRect(38, boxY, width - 76, boxH);
        ctx.strokeStyle = "rgba(225, 29, 72, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(38, boxY, width - 76, boxH);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9.5px system-ui, sans-serif";
      ctx.fillText("PASS ID CODE", 50, boxY + 17);
      ctx.fillStyle = "#fb7185";
      ctx.font = "bold 15px monospace";
      ctx.fillText(pass.pass_code || "--", 50, boxY + 36);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9.5px system-ui, sans-serif";
      ctx.fillText("UTR / TRANSACTION NO.", width - 240, boxY + 17);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 13.5px monospace";
      ctx.fillText(payment.utr_number || "--", width - 240, boxY + 36);

      // 9. QR Code Section (Guaranteed 100% Vector/Direct Rendering)
      const qrSize = 170;
      const qrX = (width - qrSize) / 2;
      const qrY = 342;

      // Pure White QR Box with Padding
      const qrPad = 12;
      const qrBoxW = qrSize + qrPad * 2;
      const qrBoxH = qrSize + qrPad * 2;
      const qrBoxX = qrX - qrPad;
      const qrBoxY = qrY - qrPad;

      ctx.fillStyle = "#ffffff";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 12);
        ctx.fill();
      } else {
        ctx.fillRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH);
      }

      let qrDrawn = false;

      // Primary: Direct Vector Module Rendering via qrInstance._oQRCode
      // This is 100% synchronous, zero network requests, zero CORS issues, razor-sharp vector output!
      if (qrInstance && qrInstance._oQRCode) {
        try {
          const moduleCount = qrInstance._oQRCode.getModuleCount();
          const cellSize = qrSize / moduleCount;
          ctx.fillStyle = "#000000";
          for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
              if (qrInstance._oQRCode.isDark(row, col)) {
                ctx.fillRect(
                  Math.round(qrX + col * cellSize),
                  Math.round(qrY + row * cellSize),
                  Math.ceil(cellSize),
                  Math.ceil(cellSize)
                );
              }
            }
          }
          qrDrawn = true;
        } catch (qrMatrixErr) {
          console.warn("Direct matrix QR draw error:", qrMatrixErr);
        }
      }

      // Secondary: Draw directly from DOM canvas if available
      if (!qrDrawn && qrContainer) {
        const domCanvas = qrContainer.querySelector("canvas");
        if (domCanvas && domCanvas.width > 0) {
          try {
            ctx.drawImage(domCanvas, qrX, qrY, qrSize, qrSize);
            qrDrawn = true;
          } catch (e) {
            console.warn("DOM canvas draw error:", e);
          }
        }
      }

      // Tertiary: Draw from DOM img if available
      if (!qrDrawn && qrContainer) {
        const domImg = qrContainer.querySelector("img");
        if (domImg && domImg.naturalWidth > 0) {
          try {
            ctx.drawImage(domImg, qrX, qrY, qrSize, qrSize);
            qrDrawn = true;
          } catch (e) {
            console.warn("DOM img draw error:", e);
          }
        }
      }

      // Quaternary: If QRCode was not initialized on page load, create a standalone QRCode instance on the fly
      if (!qrDrawn && typeof QRCode !== "undefined") {
        try {
          const tempDiv = document.createElement("div");
          const tempQr = new QRCode(tempDiv, {
            text: qrPayloadString,
            width: qrSize,
            height: qrSize,
            correctLevel: QRCode.CorrectLevel.M
          });
          if (tempQr && tempQr._oQRCode) {
            const moduleCount = tempQr._oQRCode.getModuleCount();
            const cellSize = qrSize / moduleCount;
            ctx.fillStyle = "#000000";
            for (let row = 0; row < moduleCount; row++) {
              for (let col = 0; col < moduleCount; col++) {
                if (tempQr._oQRCode.isDark(row, col)) {
                  ctx.fillRect(
                    Math.round(qrX + col * cellSize),
                    Math.round(qrY + row * cellSize),
                    Math.ceil(cellSize),
                    Math.ceil(cellSize)
                  );
                }
              }
            }
            qrDrawn = true;
          }
        } catch (flyErr) {
          console.warn("On-the-fly QR generation error:", flyErr);
        }
      }

      // QR Captions
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("Scan at entry gate via Admin Scanner for instant check-in verification.", width / 2, qrY + qrSize + 24);

      const issuedText = document.getElementById("pass-issued-date");
      if (issuedText) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText(issuedText.textContent.trim(), width / 2, qrY + qrSize + 38);
      }

      // 10. Mandatory Acknowledgement Box
      const ackY = 572;
      const ackH = 90;
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(38, ackY, width - 76, ackH, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillRect(38, ackY, width - 76, ackH);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(38, ackY, width - 76, ackH);
      }

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillText("⚖️ MANDATORY ACKNOWLEDGEMENT & EVENT STATUS SUMMARY", 48, ackY + 18);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "9.5px system-ui, sans-serif";
      ctx.fillText("• Unofficial Student-Organized Event: Organized voluntarily by senior students of MCA 2027 batch.", 48, ackY + 36);
      ctx.fillText("  NOT an official event of IET Lucknow and not authorized by any college authority or official college body.", 48, ackY + 50);
      ctx.fillText("• Voluntary Participation: Attendee participates voluntarily with free consent and agrees to all organizer rules.", 48, ackY + 67);

      // 11. Security Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "9.5px system-ui, sans-serif";
      ctx.fillText("⚠️ Strictly Personal & Non-Transferable • Only MCA IET college students allowed • Outsiders strictly prohibited.", width / 2, 692);
      ctx.fillText("Organized voluntarily by senior students of MCA Batch of 2025–2027", width / 2, 706);

      // 12. Instant High-Res PNG Download with Taint Protection
      try {
        const link = document.createElement("a");
        link.download = `MCA_Freshers_2026_Pass_${pass.pass_code}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (taintErr) {
        console.warn("Canvas export SecurityError (taint from external avatar), re-rendering with local avatar:", taintErr);
        if (!skipExternalAvatar) {
          // Retry with clean local avatar fallback
          return await generateDirectCanvasPass({ pass, displayName, displayEmail, displayMobile, displayGender, payment, skipExternalAvatar: true });
        } else {
          throw taintErr;
        }
      }
    }

    // 9. DOWNLOAD BUTTON EVENT LISTENER
    if (downloadPngBtn) {
      downloadPngBtn.addEventListener("click", async () => {
        downloadPngBtn.disabled = true;
        downloadPngBtn.textContent = "Generating Image...";

        try {
          // Guaranteed instant high-resolution pass download with QR code included
          await generateDirectCanvasPass({ pass, displayName, displayEmail, displayMobile, displayGender, payment });
        } catch (err) {
          console.error("Pass generation error:", err);
          alert("Failed to export image. Please use 'Print / PDF' button to save your pass.");
        } finally {
          downloadPngBtn.disabled = false;
          downloadPngBtn.innerHTML = `<span>🖼️ Save as Image</span>`;
        }
      });
    }

  } catch (err) {
    console.error("Pass generation error:", err);
    if (loadingState) loadingState.style.display = "none";
    if (deniedState) deniedState.style.display = "block";
    if (deniedReason) deniedReason.textContent = "An error occurred while loading your pass: " + err.message;
  }
});
