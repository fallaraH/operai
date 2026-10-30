// Valida uma Interpretacao vinda da IA ou da rede antes de usá-la.

import { mensagemConfirmacao } from "./mensagem";
import { UNIDADES_VALIDAS, type Interpretacao, type ItemInterpretado, type TipoMovimentacao } from "./tipos";

const TIPOS: readonly TipoMovimentacao[] = ["entrada", "saida_venda", "saida_perda", "despesa"];

const texto = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const numero = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 1000) / 1000 : null;

function item(bruto: unknown): ItemInterpretado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const i = bruto as Record<string, unknown>;
  const nome = texto(i.nome_canonico, 80);
  if (!nome) return null;
  const quantidade = numero(i.quantidade);
  return {
    nome_canonico: nome,
    marca: texto(i.marca, 40),
    quantidade: quantidade && quantidade > 0 ? quantidade : null,
    unidade_medida: UNIDADES_VALIDAS.find((u) => u === i.unidade_medida) ?? "un",
    valor_unitario_mencionado: numero(i.valor_unitario_mencionado),
    valor_total_mencionado: numero(i.valor_total_mencionado),
    tags_busca: Array.isArray(i.tags_busca)
      ? i.tags_busca.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().slice(0, 30)).slice(0, 8)
      : [],
  };
}

/** Devolve `null` quando o objeto não é uma interpretação utilizável. */
export function sanitizarInterpretacao(
  bruto: unknown,
  textoOriginal: string,
  padrao: { motor: "local" | "ia"; confianca: number } = { motor: "local", confianca: 0.5 },
): Interpretacao | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const tipo = TIPOS.find((t) => t === o.tipo_movimentacao);
  if (!tipo) return null;
  const base = {
    tipo_movimentacao: tipo,
    cliente_ou_fornecedor: texto(o.cliente_ou_fornecedor, 60),
    itens: (Array.isArray(o.itens) ? o.itens.slice(0, 20) : []).map(item).filter((i): i is ItemInterpretado => i !== null),
    valor_total_operacao: numero(o.valor_total_operacao),
    categoria_despesa: tipo === "despesa" ? texto(o.categoria_despesa, 30) : null,
  };
  const observacoes = Array.isArray(o.observacoes)
    ? o.observacoes.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 200)).slice(0, 3)
    : [];
  return {
    ...base,
    mensagem_confirmacao: texto(o.mensagem_confirmacao, 240) ?? mensagemConfirmacao(base),
    confianca: Math.min(1, numero(o.confianca) ?? padrao.confianca),
    motor: o.motor === "ia" || o.motor === "local" ? o.motor : padrao.motor,
    texto_original: textoOriginal.slice(0, 500),
    ...(observacoes.length ? { observacoes } : {}),
  };
}
