"use client";

import { useEffect, useState } from "react";

/** Tempo que a barra leva para ir de 0% a 100%. */
const DURACAO_BARRA_MS = 1800;
/** Igual ao `duration-700` do fade-out. */
const FADE_MS = 700;
const VERDE_NEON = "#22c55e";
const MASCARA = "radial-gradient(ellipse closest-side at center, #000 62%, transparent 100%)";

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
      {/* eslint-disable-next-line @next/next/no-img-element -- arte estática de abertura */}
      <img
        src="/operai-loading.jfif"
        alt="OperAI: seu financeiro no piloto automático"
        className="animate-entrar-logo mx-auto h-auto w-full max-w-[280px] object-contain sm:max-w-[340px]"
        // Bordas esmaecidas: a foto se mescla ao fundo sem mostrar a moldura retangular.
        style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
      />

      <div className="mt-6 flex w-full flex-col items-center">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={inteiro}
          className="h-2.5 w-64 overflow-hidden rounded-full border border-zinc-700/60 bg-zinc-800 sm:w-72"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#22c55e] shadow-[0_0_12px_#22c55e]"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-sm font-semibold tabular-nums" style={{ color: VERDE_NEON }}>
          {inteiro}%
        </p>
      </div>
    </div>
  );
}
