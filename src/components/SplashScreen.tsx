"use client";

import { useEffect, useState } from "react";

/** Tempo que a barra leva para ir de 0% a 100%. */
const DURACAO_BARRA_MS = 1800;
/** Igual ao `duration-700` do fade-out. */
const FADE_MS = 700;
const VERDE_NEON = "#22c55e";
const MASCARA = "radial-gradient(ellipse at center, #000 70%, transparent 96%)";

interface Props {
  /** Dados do localStorage já carregados: a interface pode aparecer. */
  pronto: boolean;
}

/**
 * Abertura de tela cheia a cada carregamento: a arte de abertura com uma barra
 * de 0% a 100% (~1,8 s). Só depois de bater 100% (e com os dados prontos) faz
 * o fade-out e revela o app já montado por baixo.
 */
export function SplashScreen({ pronto }: Props) {
  const [progresso, setProgresso] = useState(0);
  const [removida, setRemovida] = useState(false);
  const completo = progresso >= 100;
  const saindo = pronto && completo;

  useEffect(() => {
    // Intervalo (e não rAF): segue contando mesmo com a aba em segundo plano.
    const inicio = Date.now();
    const timer = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - inicio) / DURACAO_BARRA_MS) * 100);
      setProgresso(p);
      if (p >= 100) window.clearInterval(timer);
    }, 30);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!saindo) return;
    const t = window.setTimeout(() => setRemovida(true), FADE_MS);
    return () => window.clearTimeout(t);
  }, [saindo]);

  if (removida) return null;
  const inteiro = Math.floor(progresso);

  return (
    <div
      role="status"
      aria-label="Abrindo o OperAI"
      aria-busy={!saindo}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141414] px-6 transition-opacity duration-700 ease-out ${
        saindo ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Zoom na arte central: o recorte (overflow-hidden + scale) tira a margem escura da foto
          (a arte ocupa ~13%-90% da altura; acima de 1,2x a engrenagem e o subtítulo seriam cortados). */}
      <div
        className="animate-entrar-logo relative flex aspect-[16/10] w-[92vw] max-w-[380px] items-center justify-center overflow-hidden sm:max-w-[540px] md:max-w-[640px]"
        // Bordas esmaecidas: o fundo da foto (#191718) é um pouco mais claro que o #141414 da tela.
        style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- arte estática de abertura */}
        <img
          src="/operai-loading.jfif"
          alt="OperAI: seu financeiro no piloto automático"
          className="h-full w-full scale-[1.2] object-cover mix-blend-lighten"
        />
      </div>

      <div className="mt-4 flex w-full flex-col items-center sm:mt-6">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={inteiro}
          className="h-3.5 w-[80vw] max-w-[320px] overflow-hidden rounded-full border border-zinc-700/70 bg-zinc-800/90 p-0.5 sm:h-4 sm:max-w-[420px]"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#22c55e] to-lime-400 shadow-[0_0_16px_#22c55e]"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-base font-bold tabular-nums sm:text-lg" style={{ color: VERDE_NEON }}>
          {inteiro}%
        </p>
      </div>
    </div>
  );
}
