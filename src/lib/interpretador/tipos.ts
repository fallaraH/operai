// JSON padronizado do motor de linguagem natural (local ou IA). Só tipos.

import type { CategoriaItem, ModoOperacao, Unidade } from "../dominio/tipos";

/**
 * - `entrada`: compra/reposição de mercadoria ou matéria-prima (entra no estoque, sai do caixa).
 * - `saida_venda`: venda (sai do estoque, entra no caixa).
 * - `saida_perda`: perda/descarte (sai do estoque, sem dinheiro).
 * - `despesa`: gasto que não vira estoque (luz, gás, aluguel...).
 */
export type TipoMovimentacao = "entrada" | "saida_venda" | "saida_perda" | "despesa";

export const UNIDADES_VALIDAS: readonly Unidade[] = ["un", "kg", "g", "L", "ml", "m", "pct", "cx", "dz", "par", "rolo"];

export interface ItemInterpretado {
  /** Nome limpo: o nome do estoque quando existe; senão singular, sem gíria. */
  nome_canonico: string;
  marca: string | null;
  /** `null` quando a frase não diz a quantidade. */
  quantidade: number | null;
  unidade_medida: Unidade;
  valor_unitario_mencionado: number | null;
  valor_total_mencionado: number | null;
  /** Palavras-chave minúsculas e sem acento para achar o item no estoque. */
  tags_busca: string[];
}

export interface Interpretacao {
  tipo_movimentacao: TipoMovimentacao;
  cliente_ou_fornecedor: string | null;
  itens: ItemInterpretado[];
  /** Valor dito para a movimentação inteira ("por 320 reais"). */
  valor_total_operacao: number | null;
  /** Só em despesa: Energia, Gás, Aluguel... */
  categoria_despesa: string | null;
  mensagem_confirmacao: string;
  /** 0 a 1: quanto o motor confia na leitura. */
  confianca: number;
  motor: "local" | "ia";
  texto_original: string;
  /** Observações para o comerciante (ex: "registrei só a primeira parte"). */
  observacoes?: string[];
}

/** O que o interpretador sabe do negócio para casar nomes com o estoque. */
export interface ContextoItem {
  nome: string;
  categoria: CategoriaItem;
  unidade: Unidade;
  apelidos?: string[];
}

export interface ContextoNegocio {
  nome?: string;
  ramo?: string;
  modo?: ModoOperacao;
  itens: ContextoItem[];
}
