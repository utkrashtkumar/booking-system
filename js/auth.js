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
  const authAlert = document.getElementById("auth-alert");
  const mobileError = document.getElementById("mobile-duplicate-error");
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
      signupForm.style.display = "block";
      loginForm.style.display = "none";
    } else {
      tabBtnLogin.style.background = "var(--primary)";
      tabBtnLogin.style.color = "#ffffff";
      tabBtnSignup.style.background = "transparent";
      tabBtnSignup.style.color = "var(--text-muted)";
      loginForm.style.display = "block";
      signupForm.style.display = "none";
    }
  }

  tabBtnLogin.addEventListener("click", () => switchTab("login"));
  tabBtnSignup.addEventListener("click", () => switchTab("signup"));
  document.getElementById("switch-to-signup").addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("signup");
  });
  document.getElementById("switch-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("login");
  });

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
  // SIGN UP HANDLER
  // ==========================================
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();
    mobileError.style.display = "none";
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
    submitBtn.innerHTML = `<span>Checking details &amp; creating account...</span>`;

    try {
      // 1. DUPLICATE MOBILE CHECK: Query 'profiles' table
      const { data: existingMobile, error: mobileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("mobile", mobile)
        .maybeSingle();

      if (existingMobile) {
        mobileError.textContent = "⚠️ This mobile number is already registered! Please switch to Login.";
        mobileError.style.display = "flex";
        showAlert("This mobile number is already registered. Please login to access your pass.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
        return;
      }

      // 2. SUPABASE AUTH SIGNUP (Handles duplicate email automatically)
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
        // Friendly duplicate email message
        if (authError.message.toLowerCase().includes("already registered") || 
            authError.message.toLowerCase().includes("user already exists")) {
          showAlert("⚠️ An account with this email already exists. Please login instead.", "error");
        } else {
          showAlert(authError.message, "error");
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account &amp; Verify Email</span>`;
        return;
      }

      // 3. Insert or update user profile record in profiles table
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

      // 4. SHOW VERIFICATION EMAIL MODAL POPUP
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
