"use client";

import { BellRing, Check, CircleAlert, UserRound } from "lucide-react";
import { useState } from "react";
import type { Negocio, Transacao } from "@/lib/dominio/tipos";
import { linkWhatsApp, mascararTelefone, mensagemLembrete, telefoneValido, tempoAteCobranca, vencimentoDo } from "@/lib/fiado";
import { registrarCobranca } from "@/lib/store";
import { IconeWhatsApp } from "../ui/IconeWhatsApp";
import { CampoTelefone } from "./CampoTelefone";
import { useAgoraSegundos } from "./useAgoraSegundos";

interface Props {
  negocio: Negocio;
  transacao: Transacao;
  aoQuitar: (transacaoId: string) => void;
}

const dataCurta = (ts: number) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Aviso regressivo da próxima cobrança + "Cobrar no WhatsApp" e "Marcar como Pago". */
export function AcoesFiado({ negocio, transacao: t, aoQuitar }: Props) {
  // Relógio próprio: só este bloco redesenha a cada segundo.
  const agora = useAgoraSegundos();
  const telefoneSalvo = t.fiado?.telefone ?? "";
  const [pedindoTelefone, setPedindoTelefone] = useState(false);
  const [telefone, setTelefone] = useState(() => mascararTelefone(telefoneSalvo));
  const [tentou, setTentou] = useState(false);
  const falta = tempoAteCobranca(t, agora);
  const valido = telefoneValido(telefone);
  const link = valido ? linkWhatsApp(telefone, mensagemLembrete(negocio, t, agora)) : undefined;

  return (
    <div className="mt-2 space-y-2">
      {falta ? (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
            <BellRing className="animate-pulsar-selo size-3.5 shrink-0" aria-hidden />
            Próxima cobrança automática no WhatsApp em: 3 dias (72h)
          </p>
          <p className="num mt-0.5 text-sm font-semibold text-amber-900" aria-live="off">
            {falta}
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-700">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden /> Venceu em {dataCurta(vencimentoDo(t))}: hora de cobrar
        </p>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-600">
        <span className="flex items-center gap-1 font-medium text-zinc-800">
          <UserRound className="size-3.5 text-zinc-400" aria-hidden /> {t.contraparte || "Cliente sem nome"}
        </span>
        <span className="num text-zinc-500">{telefoneSalvo ? mascararTelefone(telefoneSalvo) : "sem celular"}</span>
      </p>

      {pedindoTelefone && (
        <CampoTelefone valor={telefone} aoMudar={setTelefone} invalido={tentou && !valido} autoFocus />
      )}

      <div className="flex flex-wrap gap-2">
        {link && (telefoneSalvo || pedindoTelefone) ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (!telefoneSalvo) registrarCobranca(negocio.id, t.id, { cliente: t.contraparte ?? "", telefone: telefone });
              setPedindoTelefone(false);
            }}
            className="flex flex-1 basis-40 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
          >
            <IconeWhatsApp className="size-4" /> Cobrar no WhatsApp
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTentou(pedindoTelefone);
              setPedindoTelefone(true);
            }}
            className="flex flex-1 basis-40 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
          >
            <IconeWhatsApp className="size-4" /> Cobrar no WhatsApp
          </button>
        )}
        <button
          type="button"
          onClick={() => aoQuitar(t.id)}
          className="flex flex-1 basis-36 items-center justify-center gap-1.5 rounded-md border border-emerald-600/30 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          <Check className="size-4" strokeWidth={2.25} /> Marcar como Pago
        </button>
      </div>
      {pedindoTelefone && !valido && <p className="text-[11px] text-zinc-500">Digite o celular com DDD para abrir a conversa.</p>}
    </div>
  );
}
