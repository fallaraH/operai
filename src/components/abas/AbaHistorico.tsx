"use client";

import { History, Mic, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { agruparPorDia } from "@/lib/dominio/metricas";
import type { Negocio, Transacao } from "@/lib/dominio/tipos";
import { hora, moeda } from "@/lib/formatar";
import { visualDa } from "../ui/visualTransacao";

/** Quanto tempo um registro novo continua em destaque. */
const DESTAQUE_MS = 12_000;

interface Props {
  negocio: Negocio;
  agora: number;
}

export function AbaHistorico({ negocio, agora }: Props) {
  const grupos = useMemo(() => agruparPorDia(negocio, agora), [negocio, agora]);

  if (grupos.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500">
          <History className="size-7" strokeWidth={1.75} />
        </span>
        <h2 className="mt-4 text-base font-semibold text-zinc-900">Nada registrado ainda</h2>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">Suas vendas, compras e despesas aparecem aqui, organizadas por dia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <section key={g.data}>
          <header className="flex items-baseline gap-2 px-0.5 py-1">
            <h2 className="flex-1 text-[13px] font-semibold text-zinc-900">{g.rotulo}</h2>
            <span className="num text-xs text-emerald-700">+{moeda(g.entradas)}</span>
            {g.saidas > 0 && <span className="num text-xs text-red-700">−{moeda(g.saidas)}</span>}
          </header>
          <ul className="mt-1.5 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
            {g.transacoes.map((t) => (
              <LinhaHistorico key={t.id} t={t} negocio={negocio} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Cada linha monta uma vez; se o registro acabou de acontecer, entra animada e
 * fica destacada por alguns segundos (vale também ao abrir a aba logo depois).
 */
function LinhaHistorico({ t, negocio }: { t: Transacao; negocio: Negocio }) {
  const visual = visualDa(t, negocio);
  const [novo, setNovo] = useState(() => Date.now() - t.timestamp < DESTAQUE_MS);

  useEffect(() => {
    if (!novo) return;
    const restante = Math.max(0, DESTAQUE_MS - (Date.now() - t.timestamp));
    const timer = window.setTimeout(() => setNovo(false), restante);
    return () => window.clearTimeout(timer);
  }, [novo, t.timestamp]);

  return (
    <li className={`flex items-center gap-3 px-3.5 py-3 ${novo ? "animate-novo" : ""}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg border ${visual.fundo}`}>
        <visual.Icone className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug font-medium text-zinc-800">{t.descricao}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
          {novo && <span className="animate-surgir rounded bg-emerald-600 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white">NOVO</span>}
          <span className="truncate">
            {visual.rotulo} · {hora(t.timestamp)}
            {t.contraparte && ` · ${t.contraparte}`}
          </span>
          {t.origem === "voz" && (
            <span className="flex shrink-0 items-center gap-0.5" title="Registrado por voz">
              · <Mic className="size-3" aria-label="por voz" />
            </span>
          )}
          {t.origem === "chip" && (
            <span className="flex shrink-0 items-center gap-0.5" title="Teste rápido">
              · <Zap className="size-3" aria-label="teste rápido" />
            </span>
          )}
        </p>
      </div>
      <span className={`num shrink-0 text-sm ${visual.cor}`}>
        {visual.sinal}
        {moeda(t.valor)}
      </span>
    </li>
  );
}
