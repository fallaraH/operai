"use client";

import { CircleCheck, PiggyBank, Target, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { maisVendidos, progressoMeta, resumoMes, serieDiaria } from "@/lib/dominio/metricas";
import type { Negocio } from "@/lib/dominio/tipos";
import { moeda } from "@/lib/formatar";
import { CardMaisVendidos } from "../painel/CardMaisVendidos";
import { GraficoEntradasSaidas } from "../painel/GraficoEntradasSaidas";
import { CARTAO, TituloSecao } from "../ui/Cartao";
import { ContadorInteiro, ContadorMoeda } from "../ui/ContadorAnimado";
import { useAposMontar } from "../ui/useAposMontar";

interface Props {
  negocio: Negocio;
  agora: number;
}

export function AbaPainel({ negocio, agora }: Props) {
  const montado = useAposMontar();
  const mes = useMemo(() => resumoMes(negocio, agora), [negocio, agora]);
  const meta = useMemo(() => progressoMeta(negocio, agora), [negocio, agora]);
  const serie = useMemo(() => serieDiaria(negocio, agora), [negocio, agora]);
  const top = useMemo(() => maisVendidos(negocio, agora, 5), [negocio, agora]);
  const nomeMes = new Date(agora).toLocaleDateString("pt-BR", { month: "long" });
  const falta = Math.max(0, meta.meta - meta.atual);

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-3" aria-label="Resumo do mês">
        <CardValor rotulo="Faturamento do mês" valor={mes.faturamento} detalhe={`Vendas em ${nomeMes}`} Icone={TrendingUp} principal />
        <CardValor rotulo="Lucro estimado do mês" valor={mes.lucro} detalhe="Vendas − custos − despesas" Icone={PiggyBank} />
      </section>

      <section className={`${CARTAO} p-4`}>
        <div className="flex items-baseline gap-2">
          <TituloSecao Icone={meta.batida ? CircleCheck : Target} titulo="Meta semanal" subtitulo="Últimos 7 dias" />
          <ContadorInteiro valor={meta.percentual} sufixo="%" className="text-xl font-semibold text-zinc-900" />
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(meta.percentual))}
          aria-label="Progresso da meta semanal"
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width] duration-1000 ease-out"
            style={{ width: montado ? `${Math.min(100, meta.percentual)}%` : "0%" }}
          />
        </div>
        <p className="mt-2.5 flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[13px] text-zinc-500">
          <span className="num whitespace-nowrap">
            <span className="text-zinc-900">{moeda(meta.atual)}</span> / {moeda(meta.meta)}
          </span>
          {meta.batida ? (
            <span className="ml-auto flex items-center gap-1 font-medium whitespace-nowrap text-emerald-700">
              <CircleCheck className="size-3.5" /> Meta da semana batida!
            </span>
          ) : (
            <span className="ml-auto whitespace-nowrap">
              faltam <span className="num text-zinc-900">{moeda(falta)}</span>
            </span>
          )}
        </p>
      </section>

      <GraficoEntradasSaidas serie={serie} />

      <CardMaisVendidos itens={top} negocio={negocio} />

      {negocio.transacoes.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
          Negócio novo em folha. Registre sua primeira venda ou compra pela barra abaixo — o painel se preenche sozinho.
        </p>
      )}
    </div>
  );
}

function CardValor({
  rotulo,
  valor,
  detalhe,
  Icone,
  principal,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
  Icone: typeof TrendingUp;
  principal?: boolean;
}) {
  return (
    <div
      className={`flex min-h-32 flex-col rounded-xl p-4 ${
        principal ? "bg-zinc-900 text-white" : `${CARTAO} text-zinc-900`
      }`}
    >
      <p className={`flex items-start gap-1.5 text-xs font-medium ${principal ? "text-zinc-400" : "text-zinc-500"}`}>
        <Icone className="mt-px size-3.5 shrink-0" /> {rotulo}
      </p>
      <ContadorMoeda
        valor={valor}
        semCentavos
        className={`mt-auto block text-[22px] leading-tight font-medium ${valor < 0 ? "text-red-500" : principal ? "text-white" : "text-zinc-900"}`}
      />
      <p className={`mt-1 text-[11px] leading-tight ${principal ? "text-zinc-500" : "text-zinc-400"}`}>{detalhe}</p>
    </div>
  );
}
