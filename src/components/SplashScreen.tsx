"use client";

import { useEffect, useState } from "react";

/** Tempo mínimo de abertura, mesmo que o localStorage carregue antes. */
const DURACAO_MINIMA_MS = 1800;
/** Igual ao `duration-700` do fade-out. */
const FADE_MS = 700;

interface Props {
  /** Dados do localStorage já carregados: a interface pode aparecer. */
  pronto: boolean;
}

/**
 * Abertura de tela cheia exibida a cada carregamento: mostra a arte de abertura
 * por ao menos ~1,8 s (ou até os dados chegarem) e sai com fade-out, revelando o
 * app já montado por baixo.
 */
export function SplashScreen({ pronto }: Props) {
  const [minimoPassou, setMinimoPassou] = useState(false);
  const [removida, setRemovida] = useState(false);
  const saindo = pronto && minimoPassou;

  useEffect(() => {
    const t = window.setTimeout(() => setMinimoPassou(true), DURACAO_MINIMA_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!saindo) return;
    const t = window.setTimeout(() => setRemovida(true), FADE_MS);
    return () => window.clearTimeout(t);
  }, [saindo]);

  if (removida) return null;

  return (
    <div
      role="status"
      aria-label="Abrindo o OperAI"
      aria-busy={!saindo}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#141414] transition-opacity duration-700 ease-out ${
        saindo ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arte estática de abertura */}
      <img
        src="/operai-loading.jfif"
        alt="OperAI: seu financeiro no piloto automático"
        className="animate-entrar-logo max-h-full w-full max-w-2xl object-contain"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex justify-center">
        <div className="relative h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
          <div className="animate-carregar absolute inset-y-0 w-2/5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153/0.8)]" />
        </div>
      </div>
    </div>
  );
}
