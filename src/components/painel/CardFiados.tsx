"use client";

import { NotebookPen } from "lucide-react";
import { useMemo } from "react";
import { fiadosAReceber } from "@/lib/dominio/metricas";
import type { Negocio } from "@/lib/dominio/tipos";
import { descreverLinhas, moeda } from "@/lib/formatar";
import { AcoesFiado } from "../fiado/AcoesFiado";
import { CARTAO, TituloSecao } from "../ui/Cartao";

interface Props {
  negocio: Negocio;
  aoQuitarFiado: (transacaoId: string) => void;
}

/** Resumo do que está pendurado: total a receber e cada fiado com cobrança e quitação. */
export function CardFiados({ negocio, aoQuitarFiado }: Props) {
  const { total, pendentes } = useMemo(() => fiadosAReceber(negocio), [negocio]);
  if (!pendentes.length) return null;

  return (
    <section className={`${CARTAO} p-4`} aria-label="Fiados a receber">
      <div className="flex items-baseline gap-2">
        <TituloSecao Icone={NotebookPen} titulo="Fiados a Receber" subtitulo={`${pendentes.length} em aberto`} />
        <span className="num text-lg font-semibold text-amber-700">{moeda(total)}</span>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">Fora do faturamento e da meta até o cliente pagar.</p>
      <ul className="mt-3 space-y-3">
        {pendentes.map((t) => (
          <li key={t.id} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
            <div className="flex items-baseline gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                {t.itens.length ? descreverLinhas(t.itens) : t.descricao}
              </p>
              <span className="num shrink-0 text-sm font-semibold text-amber-700">{moeda(t.valor)}</span>
            </div>
            <AcoesFiado negocio={negocio} transacao={t} aoQuitar={aoQuitarFiado} />
          </li>
        ))}
      </ul>
    </section>
  );
}
