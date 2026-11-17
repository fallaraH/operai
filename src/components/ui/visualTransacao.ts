import { Gavel, HandCoins, NotebookPen, PackageX, Receipt, ShieldAlert, ShoppingBag, TrendingDown, Truck, Wheat, type LucideIcon } from "lucide-react";
import type { Negocio, Transacao } from "@/lib/dominio/tipos";
import { TOM_OPERACAO, TOM_RECEITA } from "./tons";

export interface VisualTransacao {
  rotulo: string;
  Icone: LucideIcon;
  fundo: string;
  sinal: string;
  cor: string;
}

// Valor: entrada em verde, toda saída em vermelho, fiado a receber em âmbar. Ícone:
// esmeralda para receita, violeta para operação (insumo, mercadoria, despesa),
// vermelho para sinistros.
const SAIDA = { sinal: "−", cor: "text-red-700" };
const ALERTA = "border-red-500/20 bg-red-500/10 text-red-600";
const A_RECEBER = "border-amber-500/25 bg-amber-500/10 text-amber-600";
const VISUAL = {
  fiado: { rotulo: "Venda no fiado", Icone: NotebookPen, fundo: A_RECEBER, sinal: "", cor: "text-amber-700" },
  fiadoPago: { rotulo: "Fiado recebido", Icone: HandCoins, fundo: TOM_RECEITA.badge, sinal: "+", cor: "text-emerald-700" },
  venda: { rotulo: "Venda", Icone: ShoppingBag, fundo: TOM_RECEITA.badge, sinal: "+", cor: "text-emerald-700" },
  insumo: { rotulo: "Compra de insumo", Icone: Wheat, fundo: TOM_OPERACAO.badge, ...SAIDA },
  mercadoria: { rotulo: "Compra de mercadoria", Icone: Truck, fundo: TOM_OPERACAO.badge, ...SAIDA },
  despesa: { rotulo: "Despesa", Icone: Receipt, fundo: TOM_OPERACAO.badge, ...SAIDA },
  perda: { rotulo: "Perda", Icone: PackageX, fundo: ALERTA, ...SAIDA },
  sinistro: { rotulo: "Roubo ou furto", Icone: ShieldAlert, fundo: ALERTA, ...SAIDA },
  multa: { rotulo: "Multa", Icone: Gavel, fundo: ALERTA, ...SAIDA },
  prejuizo: { rotulo: "Prejuízo", Icone: TrendingDown, fundo: ALERTA, ...SAIDA },
} satisfies Record<string, VisualTransacao>;

const POR_CATEGORIA: Record<string, VisualTransacao> = {
  Sinistros: VISUAL.sinistro,
  Multas: VISUAL.multa,
  Prejuízos: VISUAL.prejuizo,
};

/** Ícone, rótulo e cor de uma transação; compra separa insumo de mercadoria. */
export function visualDa(t: Transacao, negocio: Negocio): VisualTransacao {
  if (t.tipo === "despesa") return POR_CATEGORIA[t.categoriaDespesa ?? ""] ?? VISUAL.despesa;
  if (t.fiado) return t.fiado.status === "pendente" ? VISUAL.fiado : VISUAL.fiadoPago;
  if (t.tipo !== "compra") return VISUAL[t.tipo];
  const itens = t.itens.map((l) => negocio.itens.find((i) => i.id === l.itemId));
  const soInsumos = itens.length > 0 && itens.every((i) => i?.categoria === "insumo");
  return soInsumos ? VISUAL.insumo : VISUAL.mercadoria;
}
