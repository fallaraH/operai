"use client";

import { useEffect, useState } from "react";
import { OperAILogo } from "./ui/OperAILogo";

/** Tempo mínimo de abertura, mesmo que o localStorage carregue antes. */
const DURACAO_MINIMA_MS = 2000;
/** Igual ao `duration-700` do fade-out. */
const FADE_MS = 700;

interface Props {
  /** Dados do localStorage já carregados: a interface pode aparecer. */
  pronto: boolean;
}

/**
 * Abertura de tela cheia exibida a cada carregamento: fica ao menos 2 s (ou até
 * os dados chegarem) e sai com fade-out, revelando o app já montado por baixo.
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center transition-opacity duration-700 ease-out ${
        saindo ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Brilhos difusos esmeralda/violeta em baixa opacidade. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 size-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 size-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(16_185_129/0.08),transparent_60%)]" />
      </div>

      <div className="animate-entrar-logo relative">
        <div aria-hidden className="absolute inset-0 -m-6 animate-pulse rounded-full bg-emerald-500/10 blur-2xl" />
        <OperAILogo tamanho={112} escuro className="relative" />
      </div>

      <h1 className="animate-subir relative mt-7 text-4xl font-semibold tracking-tight text-white [animation-delay:150ms] [animation-fill-mode:both]">
        Oper<span className="text-emerald-400">AI</span>
      </h1>
      <p className="animate-subir relative mt-2 max-w-xs text-[15px] leading-snug text-zinc-400 [animation-delay:300ms] [animation-fill-mode:both]">
        OperAI: Fale, não digite. O seu operador inteligente.
      </p>

      <div aria-hidden className="relative mt-10 h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
        <div className="animate-carregar absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-emerald-400 to-violet-400" />
      </div>
    </div>
  );
}
