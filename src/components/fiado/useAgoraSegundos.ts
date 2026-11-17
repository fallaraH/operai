"use client";

import { useEffect, useState } from "react";

/** Horário que avança a cada segundo, para contagens regressivas visíveis. */
export function useAgoraSegundos(): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return agora;
}
