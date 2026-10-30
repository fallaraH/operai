"use client";

import { ArrowUp, LoaderCircle, Mic, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Chip } from "@/lib/chips";
import type { OrigemTransacao } from "@/lib/dominio/tipos";
import { ChipsPitch } from "./ChipsPitch";
import { MENSAGEM_SEM_SUPORTE, useVoz } from "./useVoz";

interface Props {
  exemplo: string;
  chips: Chip[];
  processando: boolean;
  erro: string | null;
  /** Devolve `true` quando registrou (o campo é limpo). */
  aoEnviar: (texto: string, origem: OrigemTransacao, chipId?: string) => Promise<boolean>;
  aoEditar: () => void;
}

/** Ondas sonoras pulsantes enquanto o microfone escuta. */
function Ondas() {
  return (
    <span className="flex h-5 items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="animate-onda h-full w-[3px] origin-center rounded-full bg-white"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

export function BarraComando({ exemplo, chips, processando, erro, aoEnviar, aoEditar }: Props) {
  const [texto, setTexto] = useState("");

  const voz = useVoz({
    aoTranscrever: setTexto,
    aoFinalizar: async (falado) => {
      if (await aoEnviar(falado, "voz")) setTexto("");
    },
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const limpo = texto.trim();
    if (!limpo || processando || voz.ouvindo) return;
    if (await aoEnviar(limpo, "texto")) setTexto("");
  }

  async function usarChip(chip: Chip) {
    if (processando || voz.ouvindo) return;
    aoEditar();
    voz.limparErro();
    setTexto(chip.texto); // aparece na barra enquanto executa
    if (await aoEnviar(chip.texto, "chip", chip.id)) setTexto("");
  }

  function alternarMicrofone() {
    if (voz.ouvindo) voz.parar();
    else {
      aoEditar();
      setTexto("");
      voz.iniciar();
    }
  }

  const aviso = erro ?? voz.erro;

  return (
    <form onSubmit={enviar} className="border-t border-zinc-200 bg-white/95 px-3 pt-2.5 pb-2 backdrop-blur">
      {aviso && (
        <p role="alert" className="animate-surgir mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-900">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
          {aviso}
        </p>
      )}
      <ChipsPitch chips={chips} desabilitado={processando || voz.ouvindo} aoEscolher={usarChip} />
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white py-1 pr-1 pl-1 shadow-xs transition focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100 ${
          voz.ouvindo ? "border-emerald-600 ring-2 ring-emerald-100" : "border-zinc-300"
        }`}
      >
        <button
          type="button"
          onClick={alternarMicrofone}
          disabled={processando}
          aria-pressed={voz.ouvindo}
          aria-label={voz.ouvindo ? "Parar de ouvir e registrar" : "Falar o comando"}
          title={voz.suportado ? "Falar o comando" : MENSAGEM_SEM_SUPORTE}
          className={`relative grid size-10 shrink-0 place-items-center rounded-md transition disabled:opacity-50 ${
            voz.ouvindo ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          } ${voz.suportado ? "" : "opacity-60"}`}
        >
          {voz.ouvindo && <span className="absolute -inset-0.5 animate-ping rounded-md border-2 border-emerald-500/50" aria-hidden />}
          <span className="relative">{voz.ouvindo ? <Ondas /> : <Mic className="size-5" strokeWidth={2} />}</span>
        </button>
        <label htmlFor="comando" className="sr-only">
          O que aconteceu no seu negócio?
        </label>
        <input
          id="comando"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (aviso) {
              aoEditar();
              voz.limparErro();
            }
          }}
          placeholder={voz.ouvindo ? "Ouvindo… pode falar" : exemplo}
          autoComplete="off"
          enterKeyHint="send"
          maxLength={500}
          readOnly={processando || voz.ouvindo}
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-zinc-900 outline-none placeholder:text-[14px] placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={!texto.trim() || processando || voz.ouvindo}
          aria-label={processando ? "Entendendo…" : "Registrar"}
          className="grid size-10 shrink-0 place-items-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          {processando ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" strokeWidth={2.25} />}
        </button>
      </div>
    </form>
  );
}
