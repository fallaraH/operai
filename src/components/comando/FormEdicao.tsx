"use client";

import { useState, type FormEvent } from "react";
import type { Transacao } from "@/lib/dominio/tipos";
import { moeda, NOME_UNIDADE } from "@/lib/formatar";
import type { EdicaoCard } from "@/lib/interpretador/edicao";
import { numeroBr } from "@/lib/interpretador/numeros";

interface Props {
  transacao: Transacao;
  aoAplicar: (edicao: EdicaoCard) => void;
  aoCancelar: () => void;
}

const paraCampo = (n: number | undefined | null) => (n === undefined || n === null ? "" : String(Math.round(n * 10000) / 10000).replace(".", ","));

function lerNumero(v: string): number | null {
  const limpo = v.trim();
  if (!limpo) return null;
  const n = numeroBr(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function Campo({ rotulo, valor, aoMudar, prefixo, sufixo, invalido }: { rotulo: string; valor: string; aoMudar: (v: string) => void; prefixo?: string; sufixo?: string; invalido?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-zinc-600">{rotulo}</span>
      <span
        className={`flex items-center rounded-md border bg-white transition focus-within:ring-2 focus-within:ring-emerald-100 ${
          invalido ? "border-red-400" : "border-zinc-300 focus-within:border-emerald-600"
        }`}
      >
        {prefixo && <span className="pl-2.5 text-sm text-zinc-500">{prefixo}</span>}
        <input
          value={valor}
          onChange={(e) => aoMudar(e.target.value.replace(/[^\d.,]/g, ""))}
          inputMode="decimal"
          aria-invalid={invalido}
          className="w-full min-w-0 rounded-md bg-transparent px-2 py-1.5 text-base outline-none"
        />
        {sufixo && <span className="pr-2.5 text-xs text-zinc-500">{sufixo}</span>}
      </span>
    </label>
  );
}

/** Corrige quantidade, preço de venda / custo (ou o valor da despesa) e reaplica. */
export function FormEdicao({ transacao: t, aoAplicar, aoCancelar }: Props) {
  const despesa = t.tipo === "despesa";
  const comPreco = t.tipo === "venda" || t.tipo === "compra";
  const rotuloPreco = t.tipo === "venda" ? "Preço de venda" : "Custo";
  const [quantidades, setQuantidades] = useState(() => t.itens.map((l) => paraCampo(l.quantidade)));
  const [precos, setPrecos] = useState(() => t.itens.map((l) => paraCampo(l.valorUnitario)));
  const [valor, setValor] = useState(() => paraCampo(t.valor));
  const [tentou, setTentou] = useState(false);

  const qtds = quantidades.map(lerNumero);
  const prcs = precos.map(lerNumero);
  const valorNum = lerNumero(valor);
  const invalida = despesa ? !valorNum : qtds.some((q) => !q);
  const total = qtds.reduce<number>((s, q, i) => s + (q ?? 0) * (prcs[i] ?? 0), 0);

  function aplicar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (invalida) return;
    aoAplicar({ quantidades: qtds.map((q) => q ?? 0), precos: prcs, valor: valorNum });
  }

  return (
    <form onSubmit={aplicar} className="animate-surgir mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3" aria-label="Editar registro">
      <p className="text-xs font-semibold text-zinc-900">Editar e reaplicar</p>
      <p className="text-[11px] text-zinc-500">Desfaz este registro e lança de novo já corrigido.</p>

      {despesa ? (
        <div className="mt-2">
          <Campo rotulo="Valor da despesa" prefixo="R$" valor={valor} aoMudar={setValor} invalido={tentou && !valorNum} />
        </div>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {t.itens.map((l, i) => (
            <li key={`${l.nome}-${i}`}>
              <p className="mb-1 truncate text-xs font-semibold text-zinc-700">{l.nome}</p>
              <div className={`grid gap-2 ${comPreco ? "grid-cols-2" : "grid-cols-1"}`}>
                <Campo
                  rotulo="Quantidade"
                  sufixo={NOME_UNIDADE[l.unidade]}
                  valor={quantidades[i]}
                  aoMudar={(v) => setQuantidades((q) => q.map((x, k) => (k === i ? v : x)))}
                  invalido={tentou && !qtds[i]}
                />
                {comPreco && (
                  <Campo
                    rotulo={`${rotuloPreco} (por ${NOME_UNIDADE[l.unidade]})`}
                    prefixo="R$"
                    valor={precos[i]}
                    aoMudar={(v) => setPrecos((p) => p.map((x, k) => (k === i ? v : x)))}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {comPreco && (
        <p className="mt-2.5 flex justify-between rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700">
          <span>Novo total</span>
          <span className="num">{moeda(total)}</span>
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
          Aplicar mudanças
        </button>
        <button type="button" onClick={aoCancelar} className="rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-800">
          Cancelar
        </button>
      </div>
    </form>
  );
}
