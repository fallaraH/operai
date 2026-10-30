// Indicadores financeiros do Painel e agrupamentos do Histórico.

import { DIA_MS, JANELA_DIAS, inicioDoDia, inicioJanela } from "./estoque";
import type { Negocio, Transacao, Unidade } from "./tipos";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function noMesAtual(ts: number, agora: number): boolean {
  const a = new Date(agora);
  const d = new Date(ts);
  return d.getFullYear() === a.getFullYear() && d.getMonth() === a.getMonth();
}

/** Dias do mês corrente anteriores à janela detalhada de 7 dias. */
function diasAnterioresNoMes(agora: number): number {
  return Math.max(0, new Date(agora).getDate() - JANELA_DIAS);
}

export function lucroDaTransacao(t: Transacao): number {
  if (t.tipo === "venda") return t.valor - (t.custoEstimado ?? 0);
  if (t.tipo === "despesa" || t.tipo === "perda") return -t.valor;
  // Compra vira estoque; o custo entra no lucro quando o item é vendido.
  return 0;
}

export interface ResumoMes {
  faturamento: number;
  lucro: number;
}

export function resumoMes(negocio: Negocio, agora: number): ResumoMes {
  let faturamento = 0;
  let lucro = 0;
  for (const t of negocio.transacoes) {
    if (t.timestamp > agora || !noMesAtual(t.timestamp, agora)) continue;
    if (t.tipo === "venda") faturamento += t.valor;
    lucro += lucroDaTransacao(t);
  }
  const anteriores = diasAnterioresNoMes(agora);
  if (negocio.mediaDiariaAnterior && anteriores > 0) {
    faturamento += negocio.mediaDiariaAnterior.faturamento * anteriores;
    lucro += negocio.mediaDiariaAnterior.lucro * anteriores;
  }
  return { faturamento, lucro };
}

/** Vendas dos últimos 7 dias (base da Meta Semanal). */
export function vendasDaSemana(negocio: Negocio, agora: number): number {
  const inicio = inicioJanela(agora);
  return negocio.transacoes
    .filter((t) => t.tipo === "venda" && t.timestamp >= inicio && t.timestamp <= agora)
    .reduce((s, t) => s + t.valor, 0);
}

export interface ProgressoMeta {
  atual: number;
  meta: number;
  percentual: number;
  batida: boolean;
}

export function progressoMeta(negocio: Negocio, agora: number): ProgressoMeta {
  const atual = vendasDaSemana(negocio, agora);
  const meta = negocio.metaSemanal;
  const percentual = meta > 0 ? (atual / meta) * 100 : 0;
  return { atual, meta, percentual, batida: meta > 0 && atual >= meta };
}

export interface PontoDiario {
  data: number;
  rotulo: string;
  entradas: number;
  saidas: number;
  hoje: boolean;
}

/** Entradas (vendas) vs. saídas (compras + despesas) dos últimos 7 dias. */
export function serieDiaria(negocio: Negocio, agora: number): PontoDiario[] {
  const hoje = inicioDoDia(agora);
  const pontos: PontoDiario[] = [];
  for (let i = JANELA_DIAS - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    pontos.push({ data: d.getTime(), rotulo: i === 0 ? "Hoje" : DIAS_SEMANA[d.getDay()], entradas: 0, saidas: 0, hoje: i === 0 });
  }
  for (const t of negocio.transacoes) {
    if (t.timestamp > agora) continue;
    const dia = inicioDoDia(t.timestamp);
    const ponto = pontos.find((p) => p.data === dia);
    if (!ponto) continue;
    if (t.tipo === "venda") ponto.entradas += t.valor;
    else if (t.tipo !== "perda") ponto.saidas += t.valor; // perda não é saída de caixa
  }
  return pontos;
}

export interface MaisVendido {
  chave: string;
  nome: string;
  quantidade: number;
  unidade: Unidade;
  faturamento: number;
}

/** Top N itens por quantidade vendida nos últimos 7 dias. */
export function maisVendidos(negocio: Negocio, agora: number, limite = 5): MaisVendido[] {
  const inicio = inicioJanela(agora);
  const mapa = new Map<string, MaisVendido>();
  for (const t of negocio.transacoes) {
    if (t.tipo !== "venda" || t.timestamp < inicio || t.timestamp > agora) continue;
    const somaLinhas = t.itens.reduce((s, l) => s + l.quantidade * (l.valorUnitario ?? 0), 0);
    for (const l of t.itens) {
      const chave = l.itemId ?? l.nome.toLowerCase();
      const atual = mapa.get(chave) ?? { chave, nome: l.nome, quantidade: 0, unidade: l.unidade, faturamento: 0 };
      atual.quantidade += l.quantidade;
      // Sem preço por linha, rateia o total da venda pela quantidade.
      atual.faturamento +=
        somaLinhas > 0
          ? (l.quantidade * (l.valorUnitario ?? 0) * t.valor) / somaLinhas
          : t.valor / t.itens.length;
      mapa.set(chave, atual);
    }
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, limite);
}

export interface GrupoDia {
  data: number;
  rotulo: string;
  transacoes: Transacao[];
  entradas: number;
  saidas: number;
}

export function rotuloDia(data: number, agora: number): string {
  const diff = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / DIA_MS);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const d = new Date(data);
  const diaMes = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const semana = d.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${diaMes}`;
}

/** Transações agrupadas por dia, do mais recente para o mais antigo. */
export function agruparPorDia(negocio: Negocio, agora: number): GrupoDia[] {
  const grupos = new Map<number, GrupoDia>();
  const ordenadas = [...negocio.transacoes].filter((t) => t.timestamp <= agora).sort((a, b) => b.timestamp - a.timestamp);
  for (const t of ordenadas) {
    const dia = inicioDoDia(t.timestamp);
    let g = grupos.get(dia);
    if (!g) {
      g = { data: dia, rotulo: rotuloDia(dia, agora), transacoes: [], entradas: 0, saidas: 0 };
      grupos.set(dia, g);
    }
    g.transacoes.push(t);
    if (t.tipo === "venda") g.entradas += t.valor;
    else if (t.tipo !== "perda") g.saidas += t.valor;
  }
  return [...grupos.values()];
}
