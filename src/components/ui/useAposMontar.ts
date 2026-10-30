"use client";

import { useEffect, useState } from "react";

/**
 * `false` no primeiro quadro e `true` logo depois. Serve para animar larguras
 * (barras) de 0 até o valor final quando o componente aparece.
 */
export function useAposMontar(): boolean {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setPronto(true));
    return () => cancelAnimationFrame(quadro);
  }, []);
  return pronto;
}
