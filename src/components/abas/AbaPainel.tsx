"use client";

import { Check, CircleCheck, Pencil, PiggyBank, Target, TrendingUp, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { maisVendidos, progressoMeta, resumoMes, serieDiaria } from "@/lib/dominio/metricas";
import type { Negocio } from "@/lib/dominio/tipos";
import { moeda } from "@/lib/formatar";
import { numeroBr } from "@/lib/interpretador/numeros";
import { definirMetaSemanal } from "@/lib/store";
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
  const serie = useMemo(() => serieDiaria(negocio, agora), [negocio, agora]);
  const top = useMemo(() => maisVendidos(negocio, agora, 5), [negocio, agora]);
  const nomeMes = new Date(agora).toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-3" aria-label="Resumo do mês">
        <CardValor rotulo="Faturamento do mês" valor={mes.faturamento} detalhe={`Vendas em ${nomeMes}`} Icone={TrendingUp} principal />
        <CardValor rotulo="Lucro estimado do mês" valor={mes.lucro} detalhe="Vendas − custos − despesas" Icone={PiggyBank} />
      </section>

      <CardMeta negocio={negocio} agora={agora} montado={montado} />

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

/** Meta semanal sobre o saldo líquido (vendas − saídas), editável no próprio card. */
function CardMeta({ negocio, agora, montado }: { negocio: Negocio; agora: number; montado: boolean }) {
  const meta = useMemo(() => progressoMeta(negocio, agora), [negocio, agora]);
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState("");
  const [invalido, setInvalido] = useState(false);
  const falta = Math.max(0, meta.meta - meta.atual);
  // Saldo negativo: a barra trava em 0%, mas o valor real continua à mostra.
  const barra = Math.min(100, Math.max(0, meta.percentual));

  function abrir() {
    setCampo(String(meta.meta).replace(".", ","));
    setInvalido(false);
    setEditando(true);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    const valor = numeroBr(campo.trim());
    if (!Number.isFinite(valor) || valor <= 0) {
      setInvalido(true);
      return;
    }
    definirMetaSemanal(negocio.id, valor);
    setEditando(false);
  }

  return (
    <section className={`${CARTAO} p-4`}>
      <div className="flex items-baseline gap-2">
        <TituloSecao Icone={meta.batida ? CircleCheck : Target} titulo="Meta semanal" subtitulo="Saldo líquido · 7 dias" />
        <ContadorInteiro valor={barra} sufixo="%" className="text-xl font-semibold text-zinc-900" />
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(barra)}
        aria-label="Progresso da meta semanal"
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-1000 ease-out"
          style={{ width: montado ? `${barra}%` : "0%" }}
        />
      </div>

      {editando ? (
        <form onSubmit={salvar} className="animate-surgir mt-2.5 flex items-center gap-1.5" aria-label="Editar meta semanal">
          <span className={`flex flex-1 items-center rounded-md border bg-white focus-within:ring-2 focus-within:ring-emerald-100 ${invalido ? "border-red-400" : "border-zinc-300 focus-within:border-emerald-600"}`}>
            <span className="pl-2.5 text-sm text-zinc-500">R$</span>
            <input
              autoFocus
              value={campo}
              onChange={(e) => {
                setCampo(e.target.value.replace(/[^\d.,]/g, ""));
                setInvalido(false);
              }}
              onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
              inputMode="decimal"
              aria-label="Nova meta semanal em reais"
              aria-invalid={invalido}
              className="num w-full min-w-0 bg-transparent px-2 py-1.5 text-base outline-none"
            />
          </span>
          <button type="submit" className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
            <Check className="size-4" /> Salvar
          </button>
          <button type="button" onClick={() => setEditando(false)} className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="Cancelar">
            <X className="size-4" />
          </button>
        </form>
      ) : (
        <p className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[13px] text-zinc-500">
          <span className="num flex items-center whitespace-nowrap">
            <span className={meta.atual < 0 ? "text-red-700" : "text-zinc-900"}>{moeda(meta.atual)}</span>
            &nbsp;/ {moeda(meta.meta)}
            <button
              type="button"
              onClick={abrir}
              className="ml-1 rounded p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-700"
              aria-label="Editar meta semanal"
              title="Editar meta semanal"
            >
              <Pencil className="size-3.5" />
            </button>
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
      )}
      <p className="mt-1 text-[11px] text-zinc-400" title="Saídas incluem compras, despesas, prejuízos e perdas">
        Vendas <span className="num text-emerald-700">{moeda(meta.entradas)}</span> − saídas <span className="num text-red-700">{moeda(meta.saidas)}</span>
      </p>
    </section>
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
