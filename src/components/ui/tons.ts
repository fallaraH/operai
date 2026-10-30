import type { CategoriaItem } from "@/lib/dominio/tipos";

/**
 * Dois tons da marca: esmeralda para o que gera receita (venda, produto final,
 * revenda) e violeta para o que sustenta a operação (matéria-prima, gestão,
 * serviços). Classes literais para o Tailwind enxergar.
 */
export interface Tom {
  /** Contêiner do ícone: fundo suave, borda delicada e ícone vibrante. */
  badge: string;
  /** Barras de nível e progresso. */
  barra: string;
  /** Texto e ícones soltos. */
  texto: string;
  /** Etiqueta de categoria (pílula pequena). */
  etiqueta: string;
}

export const TOM_RECEITA: Tom = {
  badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  barra: "bg-emerald-500",
  texto: "text-emerald-600",
  etiqueta: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
};

export const TOM_OPERACAO: Tom = {
  badge: "border-violet-500/20 bg-violet-500/10 text-violet-600",
  barra: "bg-violet-500",
  texto: "text-violet-600",
  etiqueta: "border-violet-500/20 bg-violet-500/10 text-violet-700",
};

export const tomDaCategoria = (c: CategoriaItem): Tom => (c === "insumo" ? TOM_OPERACAO : TOM_RECEITA);
