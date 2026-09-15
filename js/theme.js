/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Theme Switcher Module (Dark / Light Mode)
 */

(function () {
  const THEME_STORAGE_KEY = "freshers_theme_2026";

  // Determine initial theme
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
    // Default to dark mode for MCA futuristic theme, or follow OS
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  // Apply theme to DOM
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeToggleButtons(theme);
  }

  // Update button icons & labels
  function updateThemeToggleButtons(theme) {
    const buttons = document.querySelectorAll(".theme-toggle-btn");
    buttons.forEach((btn) => {
      if (theme === "dark") {
        btn.innerHTML = `
          <svg class="theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <span class="theme-label">Light</span>
        `;
        btn.setAttribute("title", "Switch to Light Mode");
        btn.setAttribute("aria-label", "Switch to Light Mode");
      } else {
        btn.innerHTML = `
          <svg class="theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span class="theme-label">Dark</span>
        `;
        btn.setAttribute("title", "Switch to Dark Mode");
        btn.setAttribute("aria-label", "Switch to Dark Mode");
      }
    });
  }

  // Toggle theme handler
  window.toggleTheme = function () {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
  };

  // Immediate execution to prevent flash of wrong theme (FOUC)
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute("data-theme", initialTheme);

  // Bind event listeners once DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    updateThemeToggleButtons(initialTheme);
    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", window.toggleTheme);
    });
  });
})();
