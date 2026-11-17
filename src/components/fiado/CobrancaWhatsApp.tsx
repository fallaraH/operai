"use client";

import { CalendarClock, ChevronDown, CircleCheck, LoaderCircle, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Negocio, Transacao } from "@/lib/dominio/tipos";
import { linkWhatsApp, mensagemCobranca, telefoneValido } from "@/lib/fiado";
import { IconeWhatsApp } from "../ui/IconeWhatsApp";
import { CampoTelefone } from "./CampoTelefone";

/** Quanto dura cada fase da simulação de agendamento. */
const FASE_MS = 1100;

interface Props {
  negocio: Negocio;
  transacao: Transacao;
  cliente: string;
  telefone: string;
  aoMudarCliente: (v: string) => void;
  aoMudarTelefone: (v: string) => void;
  /** Link já aberto pelo navegador: consolidar e fechar. */
  aoEnviar: () => void;
  /** Simulação terminou: salvar como agendada e fechar. */
  aoAgendar: () => void;
}

/** Bloco do card "Entendi assim" para venda no fiado: contato, mensagem e disparo. */
export function CobrancaWhatsApp({ negocio, transacao, cliente, telefone, aoMudarCliente, aoMudarTelefone, aoEnviar, aoAgendar }: Props) {
  const [mensagemEditada, setMensagemEditada] = useState<string | null>(null);
  const [mensagemAberta, setMensagemAberta] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [agendamento, setAgendamento] = useState<"parado" | "enviando" | "agendado">("parado");
  const mensagem = mensagemEditada ?? mensagemCobranca(negocio, transacao, cliente);
  const valido = telefoneValido(telefone);
  const terminar = useRef(aoAgendar);
  useEffect(() => {
    terminar.current = aoAgendar;
  });

  // Simulação do disparo em segundo plano: "enviando" → "agendado" → fecha.
  useEffect(() => {
    if (agendamento === "parado") return;
    const t = window.setTimeout(() => (agendamento === "enviando" ? setAgendamento("agendado") : terminar.current()), FASE_MS);
    return () => window.clearTimeout(t);
  }, [agendamento]);

  function enviar(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (!valido) {
      setTentou(true);
      return;
    }
    // Abre pelo próprio clique (permitido pelo navegador): o card fecha em seguida
    // e o link some da tela antes de o navegador segui-lo.
    window.open(linkWhatsApp(telefone, mensagem), "_blank", "noopener,noreferrer");
    aoEnviar();
  }

  function agendar() {
    setTentou(true);
    if (valido) setAgendamento("enviando");
  }

  if (agendamento !== "parado") {
    const pronto = agendamento === "agendado";
    return (
      <div className="animate-surgir mt-3 rounded-lg border border-emerald-600/25 bg-emerald-500/5 p-3" role="status">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          {pronto ? (
            <CircleCheck className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-emerald-600" />
          )}
          {pronto ? (
            <span>
              Comprovante agendado no sistema para <span className="num font-semibold">{telefone}</span>
            </span>
          ) : (
            "Agendando a cobrança automática…"
          )}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-emerald-500/15">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] ease-linear"
            style={{ width: pronto ? "100%" : "55%", transitionDuration: `${FASE_MS}ms` }}
          />
        </div>
      </div>
    );
  }

  return (
    <section className="mt-3 rounded-lg border border-[#25D366]/40 bg-[#25D366]/5 p-3" aria-label="Cobrança via WhatsApp">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
        <IconeWhatsApp className="size-4 text-[#128C7E]" /> Cobrança via WhatsApp
      </p>
      <p className="text-[11px] text-zinc-500">Venda no fiado: fica em “A receber” até o cliente pagar.</p>

      <div className="mt-2 space-y-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-zinc-600">Nome do cliente</span>
          <span className="flex items-center rounded-md border border-zinc-300 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <UserRound className="ml-2.5 size-3.5 shrink-0 text-zinc-400" aria-hidden />
            <input
              value={cliente}
              onChange={(e) => aoMudarCliente(e.target.value)}
              placeholder="Ex: João"
              className="w-full min-w-0 bg-transparent px-2 py-1.5 text-base outline-none"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-zinc-600">Celular (WhatsApp)</span>
          <CampoTelefone valor={telefone} aoMudar={aoMudarTelefone} invalido={tentou && !valido} />
          {tentou && !valido && <span className="mt-1 block text-[11px] text-red-600">Informe o celular com DDD.</span>}
        </label>

        <div className="rounded-md border border-zinc-200 bg-white">
          <button
            type="button"
            onClick={() => setMensagemAberta((v) => !v)}
            aria-expanded={mensagemAberta}
            className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-zinc-600"
          >
            Mensagem de cobrança {mensagemEditada !== null && "(editada)"}
            <ChevronDown className={`size-3.5 transition ${mensagemAberta ? "rotate-180" : ""}`} />
          </button>
          {mensagemAberta ? (
            <textarea
              value={mensagem}
              onChange={(e) => setMensagemEditada(e.target.value)}
              rows={9}
              aria-label="Mensagem de cobrança"
              className="block w-full resize-y border-t border-zinc-100 px-2.5 py-2 text-[13px] leading-snug text-zinc-800 outline-none"
            />
          ) : (
            <p className="line-clamp-2 border-t border-zinc-100 px-2.5 py-1.5 text-xs text-zinc-500">{mensagem.replace(/\s*\n+\s*/g, " ")}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <a
          href={valido ? linkWhatsApp(telefone, mensagem) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={enviar}
          className="flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1ebe5b]"
        >
          <IconeWhatsApp className="size-5" /> Enviar Agora no WhatsApp (Real)
        </a>
        <button
          type="button"
          onClick={agendar}
          className="flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          <CalendarClock className="size-4" /> Apenas Agendar Cobrança (Simular)
        </button>
      </div>
    </section>
  );
}
