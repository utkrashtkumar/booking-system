/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Password Reset Controller (reset-password.js)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = getSupabase();

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

  function showAlert(msg, type = "error") {
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
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }

  function activateUpdateMode() {
    requestContainer.style.display = "none";
    updateContainer.style.display = "block";
    pageTitle.textContent = "Set New Password";
    pageSubtitle.textContent = "Create a secure new password for your account";
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

  // 1. Detect if page was loaded via recovery link
  const hash = window.location.hash;
  const isRecoveryHash = hash && (hash.includes("type=recovery") || hash.includes("access_token"));
  const urlParams = new URLSearchParams(window.location.search);
  const isRecoveryQuery = urlParams.get("type") === "recovery";

  if (isRecoveryHash || isRecoveryQuery) {
    activateUpdateMode();
  }

  // Listen for Supabase PASSWORD_RECOVERY auth event
  if (supabase) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        activateUpdateMode();
      }
    });
  }

  // 2. Handle Request Reset Link Submission
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
      submitBtn.innerHTML = `<span>Sending recovery link...</span>`;

      try {
        if (!supabase) throw new Error("Supabase client is not initialized.");

        // Construct exact redirect URL back to this page
        const redirectUrl = window.location.origin + window.location.pathname;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (error) {
          throw error;
        }

        // Show confirmation screen
        requestForm.style.display = "none";
        sentEmailDisplay.textContent = email;
        requestSuccessBox.style.display = "block";
        showAlert("Password recovery link sent successfully!", "success");

      } catch (err) {
        console.error("Reset error:", err);
        showAlert(err.message || "Could not send reset link. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Send Password Reset Link</span>`;
      }
    });
  }

  // 3. Handle Set New Password Submission
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

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Updating password...</span>`;

      try {
        if (!supabase) throw new Error("Supabase client is not initialized.");

        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        // Hide form and show success state
        updateForm.style.display = "none";
        updateSuccessBox.style.display = "block";
        showAlert("✅ Password updated successfully! Redirecting to login...", "success");

        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = "auth.html?mode=login";
        }, 3000);

      } catch (err) {
        console.error("Update password error:", err);
        showAlert(err.message || "Failed to update password. Link may have expired.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Update Password &amp; Continue</span>`;
      }
    });
  }
});
