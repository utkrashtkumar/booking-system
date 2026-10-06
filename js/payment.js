/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Payment Processing Module (Real-Time UTR Duplicate Check & Screenshot Upload)
 */

document.addEventListener("DOMContentLoaded", () => {
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
        if (utrDuplicateError) utrDuplicateError.style.display = "none";
        if (utrSpinner) utrSpinner.style.display = "none";
        isUtrDuplicate = false;
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      if (utrSpinner) utrSpinner.style.display = "block";
      if (utrDuplicateError) utrDuplicateError.style.display = "none";

      debounceTimeout = setTimeout(async () => {
        try {
          const res = await API.checkUtr(utr);
          if (utrSpinner) utrSpinner.style.display = "none";

          if (res.exists) {
            isUtrDuplicate = true;
            if (utrDuplicateError) {
              utrDuplicateError.innerHTML = `⚠️ <strong>Transaction ID already exists!</strong> This UTR has already been submitted. Please provide a different, valid Transaction ID.`;
              utrDuplicateError.style.display = "flex";
            }
            if (submitBtn) submitBtn.disabled = true;
          } else {
            isUtrDuplicate = false;
            if (utrDuplicateError) utrDuplicateError.style.display = "none";
            if (submitBtn) submitBtn.disabled = false;
          }
        } catch (err) {
          console.error("UTR check error:", err);
          if (utrSpinner) utrSpinner.style.display = "none";
        }
      }, 450);
    });
  }

  // =====================================================
  // SCREENSHOT FILE PREVIEW
  // =====================================================
  if (screenshotInput) {
    screenshotInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 8 * 1024 * 1024) {
        alert("Screenshot file is too large. Please select an image under 8MB.");
        screenshotInput.value = "";
        if (previewBox) previewBox.style.display = "none";
        return;
      }

      uploadedScreenshotFile = file;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (previewImg) previewImg.src = event.target.result;
        if (previewBox) previewBox.style.display = "block";
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
      const mobile = document.getElementById("payment-mobile") ? document.getElementById("payment-mobile").value.trim() : "";

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
        // Atomic duplicate check
        const checkRes = await API.checkUtr(utr);
        if (checkRes.exists) {
          alert("⚠️ Transaction ID already available! Please provide another transaction ID.");
          if (utrDuplicateError) {
            utrDuplicateError.textContent = "Transaction ID already available. Please provide another transaction ID.";
            utrDuplicateError.style.display = "flex";
          }
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Submit Payment for Approval</span>`;
          return;
        }

        // Submit via API
        const result = await API.submitPayment({
          utrNumber: utr,
          paymentMobile: mobile,
          screenshotFile: uploadedScreenshotFile
        });

        currentPayment = result.payment;

        // Reset submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Payment for Approval</span>`;

        // Advance to status view
        if (typeof updateStepUI === "function") {
          updateStepUI();
        }

        // Popup the avatar / profile picture customization modal
        if (typeof openAvatarModal === "function") {
          openAvatarModal();
        }

      } catch (err) {
        console.error("Payment submission error:", err);
        alert("Error submitting payment: " + (err.message || "Please check details."));
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Payment for Approval</span>`;
      }
    });
  }
});
