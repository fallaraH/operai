"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  rodape?: ReactNode;
}

/** Folha inferior no celular, diálogo centralizado no desktop. */
export function Modal({ aberto, aoFechar, titulo, subtitulo, children, rodape }: Props) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    painel.current?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflow;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-surgir absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]" onClick={aoFechar} aria-hidden />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="animate-subir relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-xl bg-white shadow-sm outline-none sm:rounded-xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-zinc-200 sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 px-5 pt-3 pb-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="text-lg font-bold text-zinc-900">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-zinc-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="-mr-1 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {rodape && <footer className="border-t border-zinc-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{rodape}</footer>}
      </div>
    </div>
  );
}
