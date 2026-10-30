// Confete em tela cheia (canvas-confetti) para a meta semanal batida.

const CORES = ["#f97316", "#fbbf24", "#10b981", "#ffffff", "#f43f5e"];

export async function confeteTelaCheia(): Promise<void> {
  const { default: confete } = await import("canvas-confetti");
  const base = { disableForReducedMotion: true, zIndex: 90, colors: CORES, ticks: 220 };
  // Estouro central e, em seguida, chuva pelas duas laterais por ~2,5 s.
  confete({ ...base, particleCount: 140, spread: 100, startVelocity: 55, origin: { x: 0.5, y: 0.55 } });
  const fim = Date.now() + 2500;
  const lateral = () => {
    confete({ ...base, particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.7 } });
    confete({ ...base, particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.7 } });
    if (Date.now() < fim) requestAnimationFrame(lateral);
  };
  requestAnimationFrame(lateral);
}
