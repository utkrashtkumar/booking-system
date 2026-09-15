/**
 * 🎉 MCA Freshers 2026 - Party Celebration & Welcome Overlay
 * Organised by MCA Batch 2025–2027 for MCA Batch 2026–2028
 * Features: High-density multi-wave canvas confetti cannons, animated disco welcome pop-up,
 * auto-entry grand finale celebration, and replay triggers.
 */

(function () {
  'use strict';

  const DURATION_MS = 4500; // 4.5 seconds celebration pop-up
  let dismissTimeout = null;
  let progressAnimationId = null;
  let startTime = null;
  let confettiIntervals = [];

  const PARTY_COLORS = [
    '#ec4899', // Neon Pink
    '#8b5cf6', // Electric Purple
    '#06b6d4', // Cyan
    '#f59e0b', // Amber Gold
    '#10b981', // Emerald
    '#f43f5e', // Rose
    '#38bdf8', // Sky Blue
    '#fbbf24'  // Bright Gold
  ];

  /**
   * Pleasant ascending celebration chime using Web Audio API (zero external sound files)
   */
  function playCelebrationChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.45);
      });
    } catch (e) {
      // Audio autoplay policy or unavailable; fail silently
    }
  }

  /**
   * Clear any pending confetti scheduled intervals
   */
  function clearConfettiTimers() {
    confettiIntervals.forEach(id => clearTimeout(id));
    confettiIntervals = [];
  }

  /**
   * Launch continuous high-quantity multi-stage confetti cannons across screen
   */
  function launchConfettiCelebration() {
    if (typeof confetti !== 'function') return;

    clearConfettiTimers();

    // Wave 1: Explosive dual corner cannons (320 particles)
    confetti({
      particleCount: 160,
      angle: 60,
      spread: 85,
      origin: { x: 0.02, y: 0.8 },
      colors: PARTY_COLORS,
      startVelocity: 55,
      ticks: 220
    });

    confetti({
      particleCount: 160,
      angle: 120,
      spread: 85,
      origin: { x: 0.98, y: 0.8 },
      colors: PARTY_COLORS,
      startVelocity: 55,
      ticks: 220
    });

    // Wave 2 (+320ms): Dual low-angle party poppers (240 particles)
    const t1 = setTimeout(() => {
      confetti({
        particleCount: 120,
        angle: 70,
        spread: 75,
        origin: { x: 0.15, y: 0.92 },
        colors: PARTY_COLORS,
        startVelocity: 60
      });
      confetti({
        particleCount: 120,
        angle: 110,
        spread: 75,
        origin: { x: 0.85, y: 0.92 },
        colors: PARTY_COLORS,
        startVelocity: 60
      });
    }, 320);
    confettiIntervals.push(t1);

    // Wave 3 (+750ms): Central golden & cyan shower (160 particles)
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 160,
        spread: 120,
        origin: { x: 0.5, y: 0.18 },
        shapes: ['circle', 'square'],
        colors: ['#f59e0b', '#fbbf24', '#ec4899', '#06b6d4', '#8b5cf6', '#ffffff'],
        scalar: 1.15,
        ticks: 250
      });
    }, 750);
    confettiIntervals.push(t2);

    // Wave 4 (+1500ms): Crossfire celebration cannons (200 particles)
    const t3 = setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 50,
        spread: 90,
        origin: { x: 0.05, y: 0.6 },
        colors: PARTY_COLORS,
        startVelocity: 52
      });
      confetti({
        particleCount: 100,
        angle: 130,
        spread: 90,
        origin: { x: 0.95, y: 0.6 },
        colors: PARTY_COLORS,
        startVelocity: 52
      });
    }, 1500);
    confettiIntervals.push(t3);

    // Wave 5 (+2400ms): High-altitude 360-degree fireworks burst (140 particles)
    const t4 = setTimeout(() => {
      confetti({
        particleCount: 140,
        spread: 360,
        origin: { x: 0.5, y: 0.35 },
        colors: PARTY_COLORS,
        gravity: 0.9,
        startVelocity: 42,
        ticks: 220
      });
    }, 2400);
    confettiIntervals.push(t4);

    // Wave 6 (+3400ms): Pre-entry booster cannons (200 particles)
    const t5 = setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 65,
        spread: 70,
        origin: { x: 0.1, y: 0.85 },
        colors: PARTY_COLORS,
        startVelocity: 55
      });
      confetti({
        particleCount: 100,
        angle: 115,
        spread: 70,
        origin: { x: 0.9, y: 0.85 },
        colors: PARTY_COLORS,
        startVelocity: 55
      });
    }, 3400);
    confettiIntervals.push(t5);
  }

  /**
   * High-energy Grand Finale burst triggered on auto-entering or clicking enter portal
   */
  function launchAutoEntryGrandFinale() {
    if (typeof confetti !== 'function') return;

    // Stage A: Triple explosive cannons from bottom (550+ particles!)
    confetti({
      particleCount: 190,
      angle: 60,
      spread: 95,
      origin: { x: 0.08, y: 0.95 },
      colors: PARTY_COLORS,
      startVelocity: 68,
      ticks: 260
    });

    confetti({
      particleCount: 230,
      angle: 90,
      spread: 120,
      origin: { x: 0.5, y: 0.95 },
      colors: PARTY_COLORS,
      startVelocity: 72,
      ticks: 280
    });

    confetti({
      particleCount: 190,
      angle: 120,
      spread: 95,
      origin: { x: 0.92, y: 0.95 },
      colors: PARTY_COLORS,
      startVelocity: 68,
      ticks: 260
    });

    // Stage B (+380ms): Lateral streamer cascades (220 particles)
    setTimeout(() => {
      confetti({
        particleCount: 110,
        spread: 100,
        origin: { x: 0.28, y: 0.35 },
        colors: ['#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6'],
        startVelocity: 48,
        ticks: 240
      });
      confetti({
        particleCount: 110,
        spread: 100,
        origin: { x: 0.72, y: 0.35 },
        colors: ['#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6'],
        startVelocity: 48,
        ticks: 240
      });
    }, 380);

    // Stage C (+750ms): Gentle glittering stars floating down
    setTimeout(() => {
      confetti({
        particleCount: 140,
        spread: 130,
        origin: { x: 0.5, y: 0.2 },
        shapes: ['circle', 'square'],
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#ddd6fe', '#ec4899'],
        gravity: 0.7,
        ticks: 280
      });
    }, 750);
  }

  /**
   * Dismiss the Welcome Celebration Overlay and trigger the Auto-Entering Grand Finale
   */
  function dismissPartyOverlay(triggerGrandFinale = true) {
    const overlay = document.getElementById('party-welcome-overlay');
    if (!overlay) return;

    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
    if (progressAnimationId) {
      cancelAnimationFrame(progressAnimationId);
      progressAnimationId = null;
    }

    clearConfettiTimers();

    if (triggerGrandFinale) {
      launchAutoEntryGrandFinale();
    }

    overlay.classList.add('party-overlay-hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  /**
   * Start the 4.5 second visual progress bar countdown with auto-entry finale
   */
  function startDismissTimer() {
    const progressBar = document.getElementById('party-timer-progress');
    if (!progressBar) return;

    startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.max(0, 1 - (elapsed / DURATION_MS));

      progressBar.style.transform = `scaleX(${progress})`;

      if (elapsed < DURATION_MS) {
        progressAnimationId = requestAnimationFrame(step);
      } else {
        // Countdown reached: AUTO-ENTER WITH FULL CELEBRATION GRAND FINALE!
        dismissPartyOverlay(true);
      }
    }

    progressAnimationId = requestAnimationFrame(step);
  }

  /**
   * Trigger / Replay the Celebration Pop-up
   */
  window.triggerPartyCelebration = function () {
    const overlay = document.getElementById('party-welcome-overlay');
    if (!overlay) return;

    // Reset progress bar
    const progressBar = document.getElementById('party-timer-progress');
    if (progressBar) {
      progressBar.style.transform = 'scaleX(1)';
    }

    overlay.classList.remove('party-overlay-hidden');
    overlay.removeAttribute('aria-hidden');

    playCelebrationChime();
    launchConfettiCelebration();
    startDismissTimer();
  };

  /**
   * Initialize Overlay Event Listeners and Auto-Launch
   */
  function initPartyExperience() {
    const overlay = document.getElementById('party-welcome-overlay');
    if (!overlay) return;

    // Close button (Dismiss without blocking)
    const closeBtn = document.getElementById('party-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissPartyOverlay(false);
      });
    }

    // Enter Portal button (Triggers massive grand finale!)
    const enterBtn = document.getElementById('party-enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissPartyOverlay(true);
      });
    }

    // Dismiss on background backdrop click (with celebration)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dismissPartyOverlay(true);
      }
    });

    // Dismiss on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('party-overlay-hidden')) {
        dismissPartyOverlay(false);
      }
    });

    // Launch welcome celebration on initial visit
    // Small delay to allow initial DOM paint
    setTimeout(() => {
      playCelebrationChime();
      launchConfettiCelebration();
      startDismissTimer();
    }, 300);
  }

  // Bind to DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPartyExperience);
  } else {
    initPartyExperience();
  }
})();
