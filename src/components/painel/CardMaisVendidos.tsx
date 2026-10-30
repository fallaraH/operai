"use client";

import { Trophy } from "lucide-react";
import type { MaisVendido } from "@/lib/dominio/metricas";
import type { Negocio } from "@/lib/dominio/tipos";
import { moeda, quantidade } from "@/lib/formatar";
import { iconeDoItem } from "@/lib/icones";
import { CARTAO, TituloSecao } from "../ui/Cartao";
import { Icone } from "../ui/Icone";
import { TOM_RECEITA } from "../ui/tons";
import { useAposMontar } from "../ui/useAposMontar";

export function CardMaisVendidos({ itens }: { itens: MaisVendido[]; negocio: Negocio }) {
  const montado = useAposMontar();
  const maior = Math.max(...itens.map((i) => i.quantidade), 0);

  return (
    <section className={`${CARTAO} p-4`}>
      <TituloSecao Icone={Trophy} titulo="Mais vendidos" subtitulo="Top 5 da semana" />

      {itens.length === 0 ? (
        <p className="mt-4 rounded-lg bg-zinc-50 p-6 text-center text-sm text-zinc-500">As vendas da semana aparecem aqui.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {itens.map((item, i) => {
            const largura = maior > 0 ? Math.max(4, (item.quantidade / maior) * 100) : 0;
            return (
              <li key={item.chave}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="num w-4 shrink-0 text-xs text-zinc-400">{i + 1}</span>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md border ${TOM_RECEITA.badge}`}>
                    <Icone nome={iconeDoItem(item.nome)} className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">{item.nome}</span>
                  <span className="num shrink-0 text-zinc-900">{quantidade(item.quantidade, item.unidade)}</span>
                </div>
                <div className="mt-1.5 ml-[3.25rem] flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${i === 0 ? "bg-gradient-to-r from-emerald-500 to-violet-500" : "bg-emerald-500/60"}`}
                      style={{ width: montado ? `${largura}%` : "0%", transitionDelay: `${i * 70}ms` }}
                    />
                  </div>
                  <span className="num w-20 shrink-0 text-right text-[11px] text-zinc-500">{moeda(item.faturamento)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
