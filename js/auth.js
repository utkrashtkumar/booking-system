/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Authentication Module (Signup, Login, Duplicate Checks - Local SQLite / Express)
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const tabBtnLogin = document.getElementById("tab-btn-login");
  const tabBtnSignup = document.getElementById("tab-btn-signup");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const signupClosedContainer = document.getElementById("signup-closed-container");
  const closedSwitchLoginBtn = document.getElementById("closed-switch-login-btn");
  const authAlert = document.getElementById("auth-alert");
  const mobileError = document.getElementById("mobile-duplicate-error");
  const emailDuplicateError = document.getElementById("email-duplicate-error");
  const emailVerifyModal = document.getElementById("email-verify-modal");
  const verifyModalEmail = document.getElementById("verify-modal-email");
  const modalToLoginBtn = document.getElementById("modal-to-login-btn");
  const modalResendEmailBtn = document.getElementById("modal-resend-email-btn");
  let lastSignedUpEmail = "";

  // Helper to show alert message
  function showAlert(message, type = "error") {
    if (!authAlert) return;
    authAlert.style.display = "block";
    authAlert.textContent = message;
    if (type === "error") {
      authAlert.style.background = "rgba(239, 68, 68, 0.15)";
      authAlert.style.border = "1px solid var(--error)";
      authAlert.style.color = "var(--error)";
    } else if (type === "success") {
      authAlert.style.background = "rgba(16, 185, 129, 0.15)";
      authAlert.style.border = "1px solid var(--success)";
      authAlert.style.color = "var(--success)";
    } else {
      authAlert.style.background = "rgba(245, 158, 11, 0.15)";
      authAlert.style.border = "1px solid var(--warning)";
      authAlert.style.color = "var(--warning)";
    }
  }

  function clearAlert() {
    if (!authAlert) return;
    authAlert.style.display = "none";
    authAlert.textContent = "";
  }

  // Switch tabs
  function switchTab(mode) {
    clearAlert();
    if (mobileError) mobileError.style.display = "none";
    if (emailDuplicateError) emailDuplicateError.style.display = "none";

    if (mode === "signup") {
      if (tabBtnSignup) {
        tabBtnSignup.style.background = "var(--primary)";
        tabBtnSignup.style.color = "#ffffff";
      }
      if (tabBtnLogin) {
        tabBtnLogin.style.background = "transparent";
        tabBtnLogin.style.color = "var(--text-muted)";
      }

      // If registration is closed, show registration closed notice view
      if (CONFIG.REGISTRATION_OPEN === false) {
        if (signupClosedContainer) signupClosedContainer.style.display = "block";
        if (signupForm) signupForm.style.display = "none";
        if (loginForm) loginForm.style.display = "none";
      } else {
        if (signupClosedContainer) signupClosedContainer.style.display = "none";
        if (signupForm) signupForm.style.display = "block";
        if (loginForm) loginForm.style.display = "none";
      }
    } else {
      if (tabBtnLogin) {
        tabBtnLogin.style.background = "var(--primary)";
        tabBtnLogin.style.color = "#ffffff";
      }
      if (tabBtnSignup) {
        tabBtnSignup.style.background = "transparent";
        tabBtnSignup.style.color = "var(--text-muted)";
      }
      if (loginForm) loginForm.style.display = "block";
      if (signupForm) signupForm.style.display = "none";
      if (signupClosedContainer) signupClosedContainer.style.display = "none";
    }
  }

  if (tabBtnLogin) tabBtnLogin.addEventListener("click", () => switchTab("login"));
  if (tabBtnSignup) tabBtnSignup.addEventListener("click", () => switchTab("signup"));

  const switchToSignup = document.getElementById("switch-to-signup");
  if (switchToSignup) {
    switchToSignup.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("signup");
    });
  }

  const switchToLogin = document.getElementById("switch-to-login");
  if (switchToLogin) {
    switchToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("login");
    });
  }

  if (closedSwitchLoginBtn) {
    closedSwitchLoginBtn.addEventListener("click", () => switchTab("login"));
  }

  // Real-time Confirm Password match listener
  const signupPassInput = document.getElementById("signup-password");
  const signupConfirmInput = document.getElementById("signup-confirm-password");
  const passwordMatchError = document.getElementById("password-match-error");

  if (signupConfirmInput && signupPassInput && passwordMatchError) {
    function checkPasswordMatch() {
      if (signupConfirmInput.value && signupPassInput.value !== signupConfirmInput.value) {
        passwordMatchError.textContent = "⚠️ Passwords do not match.";
        passwordMatchError.style.display = "flex";
      } else {
        passwordMatchError.style.display = "none";
      }
    }
    signupConfirmInput.addEventListener("input", checkPasswordMatch);
    signupPassInput.addEventListener("input", checkPasswordMatch);
  }

  // Check URL query param for default tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mode") === "signup") {
    switchTab("signup");
  } else {
    switchTab("login");
  }

  // Check if already authenticated
  try {
    const { session, user } = await API.getSession();
    if (session && user) {
      if (user.email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }
      return;
    }
  } catch (e) {
    console.log("No active session found.");
  }

  // ==========================================
  // DUPLICATE REGISTRATION VERIFICATION (Email & Mobile)
  // ==========================================
  async function checkRegistration(emailToCheck, mobileToCheck) {
    try {
      const data = await API.checkRegistration(emailToCheck, mobileToCheck);
      return {
        emailExists: Boolean(data.emailExists),
        mobileExists: Boolean(data.mobileExists)
      };
    } catch (e) {
      console.warn("Registration check notice:", e);
      return { emailExists: false, mobileExists: false };
    }
  }

  // Real-time input listeners for immediate duplicate detection
  const signupEmailInput = document.getElementById("signup-email");
  const signupMobileInput = document.getElementById("signup-mobile");
  let emailDebounce = null;
  let mobileDebounce = null;

  if (signupEmailInput && emailDuplicateError) {
    signupEmailInput.addEventListener("input", () => {
      clearTimeout(emailDebounce);
      emailDuplicateError.style.display = "none";
      const em = signupEmailInput.value.trim().toLowerCase();
      if (!em || !em.includes("@") || !em.includes(".")) return;

      emailDebounce = setTimeout(async () => {
        const { emailExists } = await checkRegistration(em, "");
        if (emailExists) {
          emailDuplicateError.innerHTML = `⚠️ This email is already registered! <a href="#" class="inline-to-login" style="color: var(--cyan); text-decoration: underline; font-weight: 700; margin-left: 4px;">Click to Login →</a>`;
          emailDuplicateError.style.display = "flex";
          emailDuplicateError.querySelector(".inline-to-login")?.addEventListener("click", (evt) => {
            evt.preventDefault();
            switchTab("login");
            const loginEmail = document.getElementById("login-email");
            if (loginEmail) loginEmail.value = em;
          });
        } else {
          emailDuplicateError.style.display = "none";
        }
      }, 400);
    });
  }

  if (signupMobileInput && mobileError) {
    signupMobileInput.addEventListener("input", () => {
      clearTimeout(mobileDebounce);
      mobileError.style.display = "none";
      const mob = signupMobileInput.value.trim();
      if (mob.length !== 10) return;

      mobileDebounce = setTimeout(async () => {
        const { mobileExists } = await checkRegistration("", mob);
        if (mobileExists) {
          mobileError.innerHTML = `⚠️ This mobile number is already registered! <a href="#" class="inline-to-login" style="color: var(--cyan); text-decoration: underline; font-weight: 700; margin-left: 4px;">Click to Login →</a>`;
          mobileError.style.display = "flex";
          mobileError.querySelector(".inline-to-login")?.addEventListener("click", (evt) => {
            evt.preventDefault();
            switchTab("login");
          });
        } else {
          mobileError.style.display = "none";
        }
      }, 400);
    });
  }

  // ==========================================
  // SIGN UP HANDLER
  // ==========================================
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();

      // Guard: Prevent signup if registrations are closed
      if (CONFIG.REGISTRATION_OPEN === false) {
        showAlert("🚫 Registrations are officially closed now. Only registered users are able to login.", "error");
        switchTab("login");
        return;
      }

      if (emailDuplicateError) emailDuplicateError.style.display = "none";
      if (mobileError) mobileError.style.display = "none";
      if (passwordMatchError) passwordMatchError.style.display = "none";

      const name = document.getElementById("signup-name").value.trim();
      const email = document.getElementById("signup-email").value.trim().toLowerCase();
      const mobile = document.getElementById("signup-mobile").value.trim();
      const gender = document.getElementById("signup-gender").value;
      const password = document.getElementById("signup-password").value;
      const confirmPassword = document.getElementById("signup-confirm-password").value;
      const submitBtn = document.getElementById("signup-submit-btn");

      if (!name || name.length < 2) {
        showAlert("Please enter your full name as on your college ID.");
        return;
      }

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        if (mobileError) {
          mobileError.textContent = "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
          mobileError.style.display = "flex";
        }
        return;
      }

      if (!gender) {
        showAlert("Please select your gender.");
        return;
      }

      if (password.length < 6) {
        showAlert("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        if (passwordMatchError) {
          passwordMatchError.textContent = "⚠️ Passwords do not match. Please re-enter.";
          passwordMatchError.style.display = "flex";
        }
        showAlert("Passwords do not match. Please verify your password fields.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Creating account...</span>`;

      try {
        const result = await API.signup({
          name,
          email,
          mobile,
          gender,
          password
        });

        lastSignedUpEmail = email;

        showAlert("✅ Account created successfully! Redirecting to dashboard...", "success");

        setTimeout(() => {
          if (result.user.email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
            window.location.href = "admin.html";
          } else {
            window.location.href = "dashboard.html";
          }
        }, 800);

      } catch (err) {
        console.error("Signup error:", err);
        showAlert(err.message || "An unexpected error occurred. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Proceed</span>`;
      }
    });
  }

  // Modal actions (fallback compatibility)
  if (modalToLoginBtn) {
    modalToLoginBtn.addEventListener("click", () => {
      if (emailVerifyModal) emailVerifyModal.classList.remove("active");
      switchTab("login");
    });
  }

  // ==========================================
  // LOGIN HANDLER
  // ==========================================
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value;
      const submitBtn = document.getElementById("login-submit-btn");

      if (!email || !password) {
        showAlert("Please enter both email and password.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Logging in...</span>`;

      try {
        const result = await API.login({ email, password });

        showAlert("✅ Login successful! Redirecting...", "success");

        setTimeout(() => {
          if (result.user.email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
            window.location.href = "admin.html";
          } else {
            window.location.href = "dashboard.html";
          }
        }, 500);

      } catch (err) {
        console.error("Login error:", err);
        showAlert(err.message || "Invalid email or password. Please check your credentials.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Login to Dashboard</span>`;
      }
    });
  }
});
