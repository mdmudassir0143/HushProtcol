import confetti from "canvas-confetti";

/** Brand-aligned colors for claim celebration. */
const COLORS = ["#0a0a0a", "#00a676", "#e8b54a", "#f7f6f3", "#2F6FED"];

/**
 * Fire a short confetti celebration when a Twitter username is claimed.
 * No-ops on the server / when reduced motion is preferred.
 */
export function celebrateUsernameClaim() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const defaults = {
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 200,
  };

  // Dual side cannons
  void confetti({
    ...defaults,
    particleCount: 70,
    spread: 58,
    startVelocity: 42,
    origin: {x: 0.12, y: 0.72},
    angle: 60,
  });
  void confetti({
    ...defaults,
    particleCount: 70,
    spread: 58,
    startVelocity: 42,
    origin: {x: 0.88, y: 0.72},
    angle: 120,
  });

  // Center burst a beat later
  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 90,
      spread: 100,
      startVelocity: 36,
      scalar: 0.95,
      origin: {x: 0.5, y: 0.45},
    });
  }, 160);

  // Soft trailing sparkle
  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 40,
      spread: 70,
      startVelocity: 22,
      gravity: 1.1,
      ticks: 180,
      origin: {x: 0.5, y: 0.35},
    });
  }, 420);
}
