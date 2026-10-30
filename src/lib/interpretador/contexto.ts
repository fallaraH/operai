// O que o interpretador precisa saber do negócio, ida (navegador) e volta (rota).

import type { CategoriaItem, ModoOperacao, Negocio } from "../dominio/tipos";
import { UNIDADES_VALIDAS, type ContextoItem, type ContextoNegocio } from "./tipos";

export function contextoDoNegocio(n: Negocio): ContextoNegocio {
  return {
    nome: n.nome,
    ramo: n.ramo,
    modo: n.modo,
    itens: n.itens.map((i) => ({
      nome: i.nome,
      categoria: i.categoria,
      unidade: i.unidade,
      ...(i.apelidos?.length ? { apelidos: i.apelidos.slice(0, 8) } : {}),
    })),
  };
}

const CATEGORIAS: readonly CategoriaItem[] = ["revenda", "insumo", "producao_propria"];
const MODOS: readonly ModoOperacao[] = ["revenda", "producao", "hibrido"];

const curto = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** Valida o contexto que chega do navegador; descarta o que não tiver forma de item. */
export function lerContexto(bruto: unknown): ContextoNegocio | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const itens: ContextoItem[] = [];
  for (const b of Array.isArray(o.itens) ? o.itens.slice(0, 300) : []) {
    if (!b || typeof b !== "object") continue;
    const i = b as Record<string, unknown>;
    const nome = curto(i.nome);
    const categoria = CATEGORIAS.find((c) => c === i.categoria);
    const unidade = UNIDADES_VALIDAS.find((u) => u === i.unidade);
    if (!nome || !categoria || !unidade) continue;
    const apelidos = Array.isArray(i.apelidos)
      ? i.apelidos.map((a) => curto(a, 40)).filter((a): a is string => !!a).slice(0, 8)
      : [];
    itens.push({ nome, categoria, unidade, ...(apelidos.length ? { apelidos } : {}) });
  }
  return {
    nome: curto(o.nome),
    ramo: curto(o.ramo, 40),
    modo: MODOS.find((m) => m === o.modo),
    itens,
  };
}
