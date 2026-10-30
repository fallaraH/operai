"use client";

import { useState, type FormEvent } from "react";
import type { Transacao } from "@/lib/dominio/tipos";
import { moeda, NOME_UNIDADE, quantidade } from "@/lib/formatar";
import { numeroBr } from "@/lib/interpretador/numeros";
import type { PerguntaItemNovo as Pergunta } from "@/lib/interpretador/resolver";
import { completarItemNovo, type RespostaItemNovo } from "@/lib/store";

interface Props {
  pergunta: Pergunta;
  negocioId: string;
  transacaoId: string;
  aoResponder: (transacao: Transacao | null, resumo: string) => void;
}

/** "4,50" / "1.234,56" / "4.5" → número; vazio ou inválido → undefined. */
function lerCampo(valor: string): number | undefined {
  const limpo = valor.trim().replace(/^r\$\s*/i, "");
  if (!limpo) return undefined;
  const n = numeroBr(limpo);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  prefixo,
  sufixo,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  prefixo?: string;
  sufixo?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{rotulo}</span>
      <span className="flex items-center rounded-md border border-zinc-300 bg-white transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
        {prefixo && <span className="pl-2.5 text-sm text-zinc-500">{prefixo}</span>}
        <input
          value={valor}
          onChange={(e) => aoMudar(e.target.value.replace(/[^\d.,]/g, ""))}
          inputMode="decimal"
          placeholder={placeholder}
          className="w-full min-w-0 rounded-md bg-transparent px-2 py-1.5 text-base outline-none"
        />
        {sufixo && <span className="pr-2.5 text-xs text-zinc-500">{sufixo}</span>}
      </span>
    </label>
  );
}

/** Perguntas rápidas do card para item que não existia no estoque. */
export function PerguntaItemNovo({ pergunta, negocioId, transacaoId, aoResponder }: Props) {
  const compra = pergunta.origem === "compra";
  const un = NOME_UNIDADE[pergunta.unidade];
  const [categoria, setCategoria] = useState(pergunta.categoriaSugerida);
  const [preco, setPreco] = useState("");
  const [custo, setCusto] = useState("");
  const [estoque, setEstoque] = useState("");
  const faltaValor = pergunta.valorUnitario === null;

  function salvar(e: FormEvent) {
    e.preventDefault();
    const r: RespostaItemNovo = { categoria };
    if (compra) {
      if (categoria === "revenda") r.precoVenda = lerCampo(preco);
      r.estoqueAnterior = lerCampo(estoque);
      if (faltaValor) r.custoUnitario = lerCampo(custo);
    } else {
      r.custoUnitario = lerCampo(custo);
      r.estoqueRestante = lerCampo(estoque);
      if (faltaValor) r.precoVenda = lerCampo(preco);
    }
    const t = completarItemNovo(negocioId, transacaoId, pergunta.itemId, r);
    let resumo = `${pergunta.nome}: cadastro completo`;
    if (t && !compra && r.custoUnitario !== undefined) resumo += ` · lucro desta venda ${moeda(t.valor - (t.custoEstimado ?? 0))}`;
    else if (compra && categoria === "insumo") resumo += " como matéria-prima";
    else if (compra && r.precoVenda !== undefined) resumo += ` · vende a ${moeda(r.precoVenda)}/${un}`;
    aoResponder(t, resumo);
  }

  return (
    <form onSubmit={salvar} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-[13px] leading-snug text-zinc-700">
        <span className="mr-1.5 rounded bg-emerald-600 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white">NOVO</span>
        {compra ? (
          <>
            <strong className="font-semibold text-zinc-900">{pergunta.nome}</strong> entrou no estoque (<span className="num">{quantidade(pergunta.quantidade, pergunta.unidade)}</span>
            {pergunta.valorUnitario !== null && ` a ${moeda(pergunta.valorUnitario)}/${un}`}).
          </>
        ) : (
          <>
            Primeira venda de <strong className="text-zinc-900">{pergunta.nome}</strong>! Responda para calcular o lucro real.
          </>
        )}
      </p>

      {compra && (
        <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-white p-1 text-[12.5px] font-medium" role="radiogroup" aria-label="Uso do item">
          {(
            [
              ["insumo", "É matéria-prima"],
              ["revenda", "Vou revender"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={categoria === valor}
              onClick={() => setCategoria(valor)}
              className={`rounded py-1.5 transition ${categoria === valor ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {compra ? (
          <>
            {categoria === "revenda" && (
              <Campo rotulo={`Preço de venda (por ${un})`} prefixo="R$" valor={preco} aoMudar={setPreco} placeholder="0,00" />
            )}
            <Campo rotulo="Já tinha antes desta compra?" sufixo={un} valor={estoque} aoMudar={setEstoque} placeholder="0" />
            {faltaValor && <Campo rotulo={`Quanto pagou por ${un}?`} prefixo="R$" valor={custo} aoMudar={setCusto} placeholder="0,00" />}
          </>
        ) : (
          <>
            <Campo rotulo={`Custo aproximado (por ${un})`} prefixo="R$" valor={custo} aoMudar={setCusto} placeholder="0,00" />
            <Campo rotulo="Quantos ainda restam?" sufixo={un} valor={estoque} aoMudar={setEstoque} placeholder="0" />
            {faltaValor && <Campo rotulo={`Preço de venda (por ${un})`} prefixo="R$" valor={preco} aoMudar={setPreco} placeholder="0,00" />}
          </>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
          Salvar
        </button>
        <button
          type="button"
          onClick={() => aoResponder(null, `${pergunta.nome} ficou sem ${compra ? "preço de venda" : "custo"} por enquanto`)}
          className="rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-800"
        >
          Depois
        </button>
      </div>
    </form>
  );
}
