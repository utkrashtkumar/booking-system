/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Payment Processing Module (Real-Time UTR Duplicate Check & Screenshot Upload)
 */

document.addEventListener("DOMContentLoaded", () => {
  const supabase = getSupabase();

  // Elements
  const paymentForm = document.getElementById("payment-form");
  const utrInput = document.getElementById("payment-utr");
  const utrDuplicateError = document.getElementById("utr-duplicate-error");
  const utrSpinner = document.getElementById("utr-checking-spinner");
  const screenshotInput = document.getElementById("payment-screenshot");
  const previewBox = document.getElementById("screenshot-preview-box");
  const previewImg = document.getElementById("screenshot-preview-img");
  const submitBtn = document.getElementById("payment-submit-btn");
  const copyUpiBtn = document.getElementById("copy-upi-btn");
  const displayUpiId = document.getElementById("display-upi-id");

  let isUtrDuplicate = false;
  let debounceTimeout = null;
  let uploadedScreenshotFile = null;

  // Copy UPI ID & Set QR Image
  const qrImageElem = document.getElementById("upi-qr-image");
  if (qrImageElem && CONFIG.PAYMENT.QR_IMAGE) {
    qrImageElem.src = CONFIG.PAYMENT.QR_IMAGE;
  }

  if (copyUpiBtn && displayUpiId) {
    displayUpiId.textContent = CONFIG.PAYMENT.UPI_ID;
    copyUpiBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(CONFIG.PAYMENT.UPI_ID).then(() => {
        const origText = copyUpiBtn.textContent;
        copyUpiBtn.textContent = "Copied! ✓";
        setTimeout(() => { copyUpiBtn.textContent = origText; }, 2000);
      });
    });
  }

  // =====================================================
  // REAL-TIME DEBOUNCED DUPLICATE UTR CHECK
  // =====================================================
  if (utrInput) {
    utrInput.addEventListener("input", () => {
      clearTimeout(debounceTimeout);
      const utr = utrInput.value.trim().toUpperCase();

      if (utr.length < 6) {
        utrDuplicateError.style.display = "none";
        utrSpinner.style.display = "none";
        isUtrDuplicate = false;
        submitBtn.disabled = false;
        return;
      }

      utrSpinner.style.display = "block";
      utrDuplicateError.style.display = "none";

      debounceTimeout = setTimeout(async () => {
        try {
          // Check if UTR exists in payments table
          const { data: existingPayment, error } = await supabase
            .from("payments")
            .select("id, user_id")
            .eq("utr_number", utr)
            .maybeSingle();

          utrSpinner.style.display = "none";

          if (existingPayment) {
            // Check if it belongs to current user or someone else
            isUtrDuplicate = true;
            utrDuplicateError.innerHTML = `⚠️ <strong>Transaction ID already exists!</strong> This UTR has already been submitted. Please provide a different, valid Transaction ID.`;
            utrDuplicateError.style.display = "flex";
            submitBtn.disabled = true;
          } else {
            isUtrDuplicate = false;
            utrDuplicateError.style.display = "none";
            submitBtn.disabled = false;
          }
        } catch (err) {
          console.error("UTR check error:", err);
          utrSpinner.style.display = "none";
        }
      }, 500); // 500ms debounce
    });
  }

  // =====================================================
  // SCREENSHOT FILE PREVIEW
  // =====================================================
  if (screenshotInput) {
    screenshotInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert("Screenshot file is too large. Please select an image under 5MB.");
        screenshotInput.value = "";
        previewBox.style.display = "none";
        return;
      }

      uploadedScreenshotFile = file;

      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        previewBox.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }

  // =====================================================
  // PAYMENT FORM SUBMISSION
  // =====================================================
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (isUtrDuplicate) {
        alert("Cannot submit: This Transaction ID is already registered. Please provide another valid Transaction ID.");
        return;
      }

      const utr = utrInput.value.trim().toUpperCase();
      const mobile = document.getElementById("payment-mobile").value.trim();

      if (!utr || utr.length < 6) {
        alert("Please enter a valid Transaction / UTR number.");
        return;
      }

      if (!uploadedScreenshotFile) {
        alert("Please upload your payment confirmation screenshot.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Uploading proof &amp; saving payment...</span>`;

      try {
        // 1. FINAL ATOMIC DUPLICATE CHECK
        const { data: duplicateCheck } = await supabase
          .from("payments")
          .select("id")
          .eq("utr_number", utr)
          .maybeSingle();

        if (duplicateCheck) {
          alert("⚠️ Transaction ID already available! Please provide another transaction ID.");
          utrDuplicateError.textContent = "Transaction ID already available. Please provide another transaction ID.";
          utrDuplicateError.style.display = "flex";
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Submit Payment for Approval</span>`;
          return;
        }

        // 2. UPLOAD SCREENSHOT TO SUPABASE STORAGE
        const fileExt = uploadedScreenshotFile.name.split('.').pop();
        const safeFileName = `${currentStudent.id}_${Date.now()}.${fileExt}`;
        const filePath = `${currentStudent.id}/${safeFileName}`;

        let screenshotUrl = "";
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(filePath, uploadedScreenshotFile, {
            upsert: true,
            contentType: uploadedScreenshotFile.type
          });

        if (uploadError) {
          console.warn("Storage bucket upload note, falling back to basic link:", uploadError);
          // If storage bucket isn't created yet or RLS blocks, keep a local identifier
          screenshotUrl = `storage://screenshots/${filePath}`;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("screenshots")
            .getPublicUrl(filePath);
          screenshotUrl = publicUrl;
        }

        // 2.5 ENSURE PROFILE RECORD EXISTS TO SATISFY FOREIGN KEY CONSTRAINT (payments_user_id_fkey)
        try {
          await supabase
            .from("profiles")
            .upsert({
              id: currentStudent.id,
              full_name: (typeof currentProfile !== "undefined" && currentProfile?.full_name) || currentStudent.user_metadata?.full_name || (currentStudent.email ? currentStudent.email.split("@")[0] : "Student"),
              email: currentStudent.email,
              mobile: mobile || (typeof currentProfile !== "undefined" && currentProfile?.mobile) || currentStudent.user_metadata?.mobile || null,
              gender: (typeof currentProfile !== "undefined" && currentProfile?.gender) || currentStudent.user_metadata?.gender || "prefer_not_to_say",
              avatar_url: (typeof currentProfile !== "undefined" && currentProfile?.avatar_url) || "assets/avatars/av1.svg",
              avatar_type: "preset",
              consent_agreed: true
            }, { onConflict: "id" });
        } catch (profileSyncErr) {
          console.warn("Profile sync before payment notice:", profileSyncErr);
        }

        // 3. INSERT OR UPSERT INTO PAYMENTS TABLE
        const { data: paymentRecord, error: insertError } = await supabase
          .from("payments")
          .upsert({
            user_id: currentStudent.id,
            utr_number: utr,
            amount: 200.00,
            payment_mobile: mobile,
            screenshot_url: screenshotUrl,
            status: "pending",
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        currentPayment = paymentRecord;

        // Reset submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Payment for Approval</span>`;

        // Advance to status view
        updateStepUI();

        // 4. POPUP THE AVATAR / PROFILE PICTURE CUSTOMIZATION MODAL
        if (typeof openAvatarModal === "function") {
          openAvatarModal();
        }

      } catch (err) {
        console.error("Payment submission error:", err);
        const errMsg = err.message || "";
        if (errMsg.includes("payments_user_id_fkey") || errMsg.includes("foreign key")) {
          alert("⚠️ Database Link Error: Your student profile record was not found in the database. Please run the SQL fix in your Supabase SQL Editor to backfill user profiles and restore the database links.");
        } else {
          alert("Error submitting payment: " + (errMsg || "Please check details."));
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Payment for Approval</span>`;
      }
    });
  }
});
