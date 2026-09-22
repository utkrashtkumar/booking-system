/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Authentication Module (Signup, Login, Duplicate Checks, Email Verification Popup)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = getSupabase();

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
    authAlert.style.display = "none";
    authAlert.textContent = "";
  }

  // Switch tabs
  function switchTab(mode) {
    clearAlert();
    if (mobileError) mobileError.style.display = "none";

    if (mode === "signup") {
      tabBtnSignup.style.background = "var(--primary)";
      tabBtnSignup.style.color = "#ffffff";
      tabBtnLogin.style.background = "transparent";
      tabBtnLogin.style.color = "var(--text-muted)";

      // If registration is closed, show registration closed notice view
      if (CONFIG.REGISTRATION_OPEN === false) {
        if (signupClosedContainer) signupClosedContainer.style.display = "block";
        signupForm.style.display = "none";
        loginForm.style.display = "none";
      } else {
        if (signupClosedContainer) signupClosedContainer.style.display = "none";
        signupForm.style.display = "block";
        loginForm.style.display = "none";
      }
    } else {
      tabBtnLogin.style.background = "var(--primary)";
      tabBtnLogin.style.color = "#ffffff";
      tabBtnSignup.style.background = "transparent";
      tabBtnSignup.style.color = "var(--text-muted)";
      loginForm.style.display = "block";
      signupForm.style.display = "none";
      if (signupClosedContainer) signupClosedContainer.style.display = "none";
    }
  }

  tabBtnLogin.addEventListener("click", () => switchTab("login"));
  tabBtnSignup.addEventListener("click", () => switchTab("signup"));
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

  // Password visibility is handled directly by window.togglePasswordVisibility(btn, inputId)

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
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      if (session.user.email_confirmed_at) {
        if (session.user.email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
          window.location.href = "admin.html";
        } else {
          window.location.href = "dashboard.html";
        }
        return;
      }
    }
  }

  // ==========================================
  // DUPLICATE REGISTRATION VERIFICATION (Email & Mobile)
  // ==========================================
  async function checkRegistration(emailToCheck, mobileToCheck) {
    let emailFound = false;
    let mobileFound = false;

    // 1. Check via RPC check_user_exists (checks both auth.users & public.profiles)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("check_user_exists", {
        lookup_email: emailToCheck ? emailToCheck.trim().toLowerCase() : "",
        lookup_mobile: mobileToCheck ? mobileToCheck.trim() : ""
      });

      if (!rpcErr && rpcData) {
        return {
          emailExists: Boolean(rpcData.email_exists),
          mobileExists: Boolean(rpcData.mobile_exists)
        };
      }
    } catch (e) {
      console.warn("RPC check_user_exists note:", e);
    }

    // 2. Direct profiles table fallback
    try {
      if (emailToCheck && emailToCheck.trim()) {
        const { data: eData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", emailToCheck.trim().toLowerCase())
          .maybeSingle();
        if (eData) emailFound = true;
      }

      if (mobileToCheck && mobileToCheck.trim()) {
        const { data: mData } = await supabase
          .from("profiles")
          .select("id")
          .eq("mobile", mobileToCheck.trim())
          .maybeSingle();
        if (mData) mobileFound = true;
      }
    } catch (e) {
      console.warn("Profiles duplicate check fallback note:", e);
    }

    return {
      emailExists: emailFound,
      mobileExists: mobileFound
    };
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
      }, 500);
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
      }, 500);
    });
  }

  // ==========================================
  // SIGN UP HANDLER
  // ==========================================
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

    // Client-side validations
    if (!name || name.length < 2) {
      showAlert("Please enter your full name as on your college ID.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      mobileError.textContent = "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
      mobileError.style.display = "flex";
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

    // Confirm password equality check
    if (password !== confirmPassword) {
      if (passwordMatchError) {
        passwordMatchError.textContent = "⚠️ Passwords do not match. Please re-enter.";
        passwordMatchError.style.display = "flex";
      }
      showAlert("Passwords do not match. Please verify your password fields.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Checking account availability...</span>`;

    try {
      // 1. PRE-SIGNUP DUPLICATE CHECK (Email & Mobile)
      const { emailExists, mobileExists } = await checkRegistration(email, mobile);

      if (emailExists) {
        if (emailDuplicateError) {
          emailDuplicateError.innerHTML = `⚠️ This email is already registered! <a href="#" class="inline-to-login" style="color: var(--cyan); text-decoration: underline; font-weight: 700; margin-left: 4px;">Click to Login →</a>`;
          emailDuplicateError.style.display = "flex";
          emailDuplicateError.querySelector(".inline-to-login")?.addEventListener("click", (evt) => {
            evt.preventDefault();
            switchTab("login");
            const loginEmail = document.getElementById("login-email");
            if (loginEmail) loginEmail.value = email;
          });
        }
        showAlert("⚠️ An account with this email already exists. Please switch to Login.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
        return;
      }

      if (mobileExists) {
        if (mobileError) {
          mobileError.innerHTML = `⚠️ This mobile number is already registered! <a href="#" class="inline-to-login" style="color: var(--cyan); text-decoration: underline; font-weight: 700; margin-left: 4px;">Click to Login →</a>`;
          mobileError.style.display = "flex";
          mobileError.querySelector(".inline-to-login")?.addEventListener("click", (evt) => {
            evt.preventDefault();
            switchTab("login");
          });
        }
        showAlert("⚠️ This mobile number is already registered. Please login to access your pass.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
        return;
      }

      // 2. SUPABASE AUTH SIGNUP
      submitBtn.innerHTML = `<span>Creating account &amp; sending link...</span>`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            mobile: mobile,
            gender: gender
          }
        }
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("already in use")) {
          showAlert("⚠️ An account with this email already exists. Please login instead.", "error");
          if (emailDuplicateError) {
            emailDuplicateError.innerHTML = `⚠️ This email is already registered! <a href="#" class="inline-to-login" style="color: var(--cyan); text-decoration: underline; font-weight: 700; margin-left: 4px;">Click to Login →</a>`;
            emailDuplicateError.style.display = "flex";
            emailDuplicateError.querySelector(".inline-to-login")?.addEventListener("click", (evt) => {
              evt.preventDefault();
              switchTab("login");
              const loginEmail = document.getElementById("login-email");
              if (loginEmail) loginEmail.value = email;
            });
          }
        } else if (msg.includes("database error saving new user")) {
          showAlert("⚠️ Database trigger error: Please run fix-database-error.sql in your Supabase SQL Editor to resolve.", "error");
        } else {
          showAlert(authError.message, "error");
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
        return;
      }

      // 3. CRITICAL: Detect Supabase silent duplicate email (identities array is empty)
      if (authData && authData.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        showAlert("⚠️ An account with this email address already exists! Please switch to Login.", "error");
        if (emailDuplicateError) {
          emailDuplicateError.innerHTML = `⚠️ This email is already registered! <a href="#" class="inline-to-login" style="color: var(--cyan); text-decoration: underline; font-weight: 700; margin-left: 4px;">Click to Login →</a>`;
          emailDuplicateError.style.display = "flex";
          emailDuplicateError.querySelector(".inline-to-login")?.addEventListener("click", (evt) => {
            evt.preventDefault();
            switchTab("login");
            const loginEmail = document.getElementById("login-email");
            if (loginEmail) loginEmail.value = email;
          });
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
        return;
      }

      // 4. Insert or update user profile record in profiles table
      if (authData && authData.user) {
        lastSignedUpEmail = email;
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          full_name: name,
          email: email,
          mobile: mobile,
          gender: gender,
          consent_agreed: false
        });

        if (profileError) {
          console.warn("Profile table upsert note:", profileError.message);
        }
      }

      // 5. SHOW VERIFICATION EMAIL MODAL POPUP
      verifyModalEmail.textContent = email;
      emailVerifyModal.classList.add("active");

      signupForm.reset();
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;

    } catch (err) {
      console.error("Signup error:", err);
      showAlert("An unexpected error occurred. Please try again.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
    }
  });

  // Modal actions
  modalToLoginBtn.addEventListener("click", () => {
    emailVerifyModal.classList.remove("active");
    switchTab("login");
    showAlert("Please enter your password after confirming your email.", "warning");
  });

  modalResendEmailBtn.addEventListener("click", async () => {
    if (!lastSignedUpEmail) {
      alert("No email address found to resend.");
      return;
    }
    modalResendEmailBtn.disabled = true;
    modalResendEmailBtn.textContent = "Resending...";
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: lastSignedUpEmail
      });
      if (error) {
        alert("Could not resend email: " + error.message);
      } else {
        alert("✅ Verification email resent successfully! Please check your inbox and spam folder.");
      }
    } catch (e) {
      alert("Error resending email: " + e.message);
    } finally {
      modalResendEmailBtn.disabled = false;
      modalResendEmailBtn.textContent = "Resend Link";
    }
  });

  // ==========================================
  // LOGIN HANDLER
  // ==========================================
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          showAlert("⚠️ Please verify your email first! Check your inbox or spam folder for the confirmation link.", "warning");
          lastSignedUpEmail = email;
          verifyModalEmail.textContent = email;
          emailVerifyModal.classList.add("active");
        } else {
          showAlert("Invalid email or password. Please check your credentials.", "error");
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Login to Dashboard</span>`;
        return;
      }

      // Check if email confirmed
      if (data.user && !data.user.email_confirmed_at) {
        showAlert("⚠️ Your email address is not verified yet. Please check your inbox and click the verification link.", "warning");
        await supabase.auth.signOut();
        lastSignedUpEmail = email;
        verifyModalEmail.textContent = email;
        emailVerifyModal.classList.add("active");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Login to Dashboard</span>`;
        return;
      }

      showAlert("✅ Login successful! Redirecting...", "success");

      // Redirect based on role
      setTimeout(() => {
        if (data.user.email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
          window.location.href = "admin.html";
        } else {
          window.location.href = "dashboard.html";
        }
      }, 500);

    } catch (err) {
      console.error("Login error:", err);
      showAlert("An error occurred during login. Please try again.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Login to Dashboard</span>`;
    }
  });

  // Forgot password link navigates directly to reset-password.html
});
