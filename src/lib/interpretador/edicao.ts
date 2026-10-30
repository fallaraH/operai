// Edição inline do card "Entendi assim": o comerciante corrige quantidade,
// preço (venda) ou custo (compra) e o registro é reaplicado do zero.

import type { Transacao } from "../dominio/tipos";
import { mensagemConfirmacao } from "./mensagem";
import type { Interpretacao, TipoMovimentacao } from "./tipos";

export interface EdicaoCard {
  /** Uma por linha da transação, na mesma ordem. */
  quantidades: number[];
  /** Preço unitário de venda (venda) ou custo (compra); `null` = sem preço. */
  precos: (number | null)[];
  /** Só despesa. */
  valor: number | null;
}

const TIPO: Record<Transacao["tipo"], TipoMovimentacao> = {
  venda: "saida_venda",
  compra: "entrada",
  perda: "saida_perda",
  despesa: "despesa",
};

/**
 * Interpretação equivalente à transação com as correções aplicadas. Os itens
 * seguem pelo nome do estoque; os preços viram "valor unitário dito", então o
 * total é recalculado (quantidade × preço) e o resolver refaz estoque e caixa.
 */
export function interpretacaoEditada(base: Interpretacao, t: Transacao, e: EdicaoCard): Interpretacao {
  const despesa = t.tipo === "despesa";
  const itens = despesa
    ? base.itens
    : t.itens.map((l, i) => ({
        nome_canonico: l.nome,
        marca: null,
        quantidade: e.quantidades[i] ?? l.quantidade,
        unidade_medida: l.unidade,
        valor_unitario_mencionado: t.tipo === "perda" ? null : e.precos[i] ?? null,
        valor_total_mencionado: null,
        tags_busca: base.itens[i]?.tags_busca ?? [],
      }));
  const parcial = {
    tipo_movimentacao: TIPO[t.tipo],
    cliente_ou_fornecedor: t.contraparte ?? null,
    itens,
    valor_total_operacao: despesa ? e.valor : null,
    categoria_despesa: despesa ? t.categoriaDespesa ?? base.categoria_despesa : null,
  };
  return { ...base, ...parcial, mensagem_confirmacao: mensagemConfirmacao(parcial), confianca: 1, observacoes: undefined };
}
