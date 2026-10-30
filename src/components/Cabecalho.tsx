"use client";

import { Check, ChevronDown, CircleHelp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EstadoApp, ModoOperacao } from "@/lib/dominio/tipos";
import { iconeDoNegocio } from "@/lib/icones";
import { excluirNegocio, selecionarNegocio } from "@/lib/store";
import { Icone } from "./ui/Icone";
import { MarcaOperAI } from "./ui/OperAILogo";

export const ROTULO_MODO: Record<ModoOperacao, string> = {
  revenda: "Revenda",
  producao: "Produção própria",
  hibrido: "Híbrido",
};

interface Props {
  estado: EstadoApp;
  aoAbrirTutorial: () => void;
  aoCriarNegocio: () => void;
  aoReiniciar: () => void;
  /** Trocar ou excluir negócio fecha o card pendente (não reabre ao voltar). */
  aoTrocarNegocio: () => void;
}

export function Cabecalho({ estado, aoAbrirTutorial, aoCriarNegocio, aoReiniciar, aoTrocarNegocio }: Props) {
  const [girando, setGirando] = useState(false);

  function reiniciar() {
    setGirando(true);
    aoReiniciar();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <MarcaOperAI />
          <p className="truncate pl-9 text-[11px] text-zinc-500">Fale, não digite.</p>
        </div>
        <button
          type="button"
          onClick={aoAbrirTutorial}
          className="grid size-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          aria-label="Como funciona esta tela"
          title="Como funciona esta tela"
        >
          <CircleHelp className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={reiniciar}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
          title="Restaura os dados iniciais da demonstração"
        >
          <RotateCcw
            className={`size-4 ${girando ? "animate-girar-uma-vez" : ""}`}
            onAnimationEnd={() => setGirando(false)}
          />
          Reiniciar demo
        </button>
      </div>
      <div className="relative mt-3 flex items-stretch gap-2">
        <SeletorNegocio estado={estado} aoCriarNegocio={aoCriarNegocio} aoTrocarNegocio={aoTrocarNegocio} />
        <button
          type="button"
          onClick={aoCriarNegocio}
          className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-zinc-300 bg-white text-[11px] leading-tight font-medium text-zinc-700 transition hover:border-emerald-600 hover:text-emerald-700"
          title="+ Criar Meu Negócio"
        >
          <Plus className="size-4 text-emerald-700" strokeWidth={2.5} />
          Criar Meu Negócio
        </button>
      </div>
    </header>
  );
}

function SeletorNegocio({
  estado,
  aoCriarNegocio,
  aoTrocarNegocio,
}: {
  estado: EstadoApp;
  aoCriarNegocio: () => void;
  aoTrocarNegocio: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const ativo = estado.negocios[estado.negocioAtivoId];

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    // Sem `relative` aqui: a lista abre com a largura toda da linha do cabeçalho.
    <div ref={raiz} className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left shadow-xs transition hover:border-zinc-300"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
          <Icone nome={iconeDoNegocio(ativo)} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-zinc-900">{ativo.nome}</span>
          <span className="block truncate text-xs text-zinc-500">
            {ativo.ramo} · {ROTULO_MODO[ativo.modo]}
          </span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-zinc-400 transition ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="animate-surgir absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">Trocar de negócio</p>
          <ul role="listbox" aria-label="Negócios" className="max-h-[50dvh] overflow-y-auto py-1">
            {estado.ordem.map((id) => {
              const n = estado.negocios[id];
              if (!n) return null;
              const selecionado = id === estado.negocioAtivoId;
              return (
                <li key={id} role="option" aria-selected={selecionado} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selecionado) aoTrocarNegocio();
                      selecionarNegocio(id);
                      setAberto(false);
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-50 ${selecionado ? "bg-zinc-50" : ""}`}
                  >
                    <Icone nome={iconeDoNegocio(n)} className="size-5 shrink-0 text-zinc-700" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-800">{n.nome}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {n.ramo} · {ROTULO_MODO[n.modo]}
                        {!n.preConfigurado && " · criado por você"}
                      </span>
                    </span>
                    {selecionado && <Check className="size-4 text-emerald-700" />}
                  </button>
                  {!n.preConfigurado && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selecionado) aoTrocarNegocio();
                        excluirNegocio(id);
                      }}
                      className="mr-2 rounded-full p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Excluir ${n.nome}`}
                      title="Excluir negócio"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              aoCriarNegocio();
            }}
            className="flex w-full items-center gap-3 border-t border-zinc-100 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-zinc-50"
          >
            <span className="grid size-7 place-items-center rounded-md bg-emerald-600 text-white">
              <Plus className="size-4" strokeWidth={2.5} />
            </span>
            Criar Meu Negócio
          </button>
        </div>
      )}
    </div>
  );
}
