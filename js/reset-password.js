/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Password Reset Controller (reset-password.js - Local SQLite / Express)
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const alertBox = document.getElementById("reset-alert");
  const requestContainer = document.getElementById("step-request-container");
  const updateContainer = document.getElementById("step-update-container");
  const requestForm = document.getElementById("request-reset-form");
  const requestSuccessBox = document.getElementById("request-success-box");
  const sentEmailDisplay = document.getElementById("sent-email-display");
  const updateForm = document.getElementById("update-password-form");
  const updateSuccessBox = document.getElementById("update-success-box");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");

  const newPassInput = document.getElementById("new-password");
  const confirmNewPassInput = document.getElementById("confirm-new-password");
  const matchError = document.getElementById("new-password-match-error");

  let resetEmailTarget = "";

  function showAlert(msg, type = "error") {
    if (!alertBox) return;
    alertBox.style.display = "block";
    alertBox.textContent = msg;
    if (type === "error") {
      alertBox.style.background = "rgba(239, 68, 68, 0.15)";
      alertBox.style.border = "1px solid var(--error)";
      alertBox.style.color = "var(--error)";
    } else if (type === "success") {
      alertBox.style.background = "rgba(16, 185, 129, 0.15)";
      alertBox.style.border = "1px solid var(--success)";
      alertBox.style.color = "var(--success)";
    } else {
      alertBox.style.background = "rgba(245, 158, 11, 0.15)";
      alertBox.style.border = "1px solid var(--warning)";
      alertBox.style.color = "var(--warning)";
    }
  }

  function clearAlert() {
    if (!alertBox) return;
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }

  function activateUpdateMode() {
    if (requestContainer) requestContainer.style.display = "none";
    if (updateContainer) updateContainer.style.display = "block";
    if (pageTitle) pageTitle.textContent = "Set New Password";
    if (pageSubtitle) pageSubtitle.textContent = "Create a secure new password for your account";
  }

  // Real-time password match listener
  if (newPassInput && confirmNewPassInput && matchError) {
    function checkMatch() {
      if (confirmNewPassInput.value && newPassInput.value !== confirmNewPassInput.value) {
        matchError.textContent = "⚠️ Passwords do not match.";
        matchError.style.display = "flex";
      } else {
        matchError.style.display = "none";
      }
    }
    newPassInput.addEventListener("input", checkMatch);
    confirmNewPassInput.addEventListener("input", checkMatch);
  }

  // Detect query param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("email")) {
    resetEmailTarget = urlParams.get("email");
    activateUpdateMode();
  }

  // Handle Request Form Submission
  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById("reset-email").value.trim().toLowerCase();
      const submitBtn = document.getElementById("send-reset-btn");

      if (!email || !email.includes("@")) {
        showAlert("Please enter a valid email address.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verifying account...</span>`;

      try {
        const check = await API.checkRegistration(email, "");
        if (!check.emailExists && email !== CONFIG.ADMIN_EMAIL.toLowerCase()) {
          showAlert("No registered account found with this email address.", "error");
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Send Password Reset Link</span>`;
          return;
        }

        resetEmailTarget = email;
        activateUpdateMode();
        showAlert("Please enter your new password below.", "success");

      } catch (err) {
        console.error("Reset error:", err);
        showAlert(err.message || "Could not process request. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Send Password Reset Link</span>`;
      }
    });
  }

  // Handle Set New Password Submission
  if (updateForm) {
    updateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();
      if (matchError) matchError.style.display = "none";

      const newPassword = newPassInput.value;
      const confirmPassword = confirmNewPassInput.value;
      const submitBtn = document.getElementById("update-password-btn");

      if (newPassword.length < 6) {
        showAlert("Password must be at least 6 characters long.", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        if (matchError) {
          matchError.textContent = "⚠️ Passwords do not match.";
          matchError.style.display = "flex";
        }
        showAlert("Passwords do not match. Please re-enter.", "error");
        return;
      }

      if (!resetEmailTarget) {
        showAlert("Please enter your registered email address first.", "error");
        requestContainer.style.display = "block";
        updateContainer.style.display = "none";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Updating password...</span>`;

      try {
        await API.resetPassword(resetEmailTarget, newPassword);

        updateForm.style.display = "none";
        if (updateSuccessBox) updateSuccessBox.style.display = "block";
        showAlert("✅ Password updated successfully! Redirecting to login...", "success");

        setTimeout(() => {
          window.location.href = "auth.html?mode=login";
        }, 2000);

      } catch (err) {
        console.error("Update password error:", err);
        showAlert(err.message || "Failed to update password. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Update Password &amp; Continue</span>`;
      }
    });
  }
});
