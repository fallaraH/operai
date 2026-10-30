"use client";

// Estado global reativo do OperAI, persistido em localStorage.
// Store externo + useSyncExternalStore: no servidor o estado é `null` e o app
// mostra a tela de carregamento; no navegador lê o localStorage na hora.

import { useSyncExternalStore } from "react";
import { aplicarTransacao, arredondar, calcularImpacto, type MudancaDisponibilidade } from "./dominio/estoque";
import type { EstadoApp, ItemEstoque, Negocio, Transacao } from "./dominio/tipos";
import {
  criarEstadoInicial,
  criarNegocioPersonalizado,
  gerarNegocioDemo,
  VERSAO_DADOS,
  type NovoNegocioInput,
} from "./dados/negocios";
import { chaveDia } from "./formatar";
import { novoId } from "./id";
import type { PerguntaItemNovo, PlanoRegistro } from "./interpretador/resolver";
import type { Interpretacao } from "./interpretador/tipos";

const CHAVE_STORAGE = "operai:estado:v1";

let estado: EstadoApp | null = null;
const ouvintes = new Set<() => void>();

interface PassoDesfazer {
  negocioId: string;
  transacaoId: string;
  anterior: Negocio;
}
/** Pilha de desfazer (somente em memória, vale para a sessão atual). */
let pilhaDesfazer: PassoDesfazer[] = [];

function estadoValido(valor: unknown): valor is EstadoApp {
  const e = valor as EstadoApp | null;
  return !!e && e.versao === 1 && typeof e.negocios === "object" && Array.isArray(e.ordem) && !!e.negocios[e.negocioAtivoId];
}

/**
 * Em um novo dia (ou com sementes novas), os negócios de demonstração que o
 * usuário não movimentou são regenerados, para o histórico de 7 dias e a meta
 * continuarem "frescos".
 */
function atualizarDia(e: EstadoApp, agora: number): EstadoApp {
  const hoje = chaveDia(agora);
  if (e.diaBase === hoje && e.versaoDados === VERSAO_DADOS) return e;
  const negocios = { ...e.negocios };
  for (const id of e.ordem) {
    const n = negocios[id];
    if (!n?.preConfigurado || n.transacoes.some((t) => t.origem !== "seed")) continue;
    const novo = gerarNegocioDemo(id, agora);
    if (novo) negocios[id] = novo;
  }
  return { ...e, negocios, diaBase: hoje, versaoDados: VERSAO_DADOS };
}

function carregar(): EstadoApp {
  const agora = Date.now();
  try {
    const bruto = localStorage.getItem(CHAVE_STORAGE);
    if (bruto) {
      const salvo: unknown = JSON.parse(bruto);
      if (estadoValido(salvo)) {
        const atualizado = atualizarDia(salvo, agora);
        if (atualizado !== salvo) salvar(atualizado);
        return atualizado;
      }
    }
  } catch {
    // localStorage indisponível ou corrompido: recomeça com a demo.
  }
  const inicial = criarEstadoInicial(agora);
  salvar(inicial);
  return inicial;
}

function salvar(e: EstadoApp) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(e));
  } catch {
    // Sem persistência (modo privado / cota cheia): o app segue em memória.
  }
}

function definir(proximo: EstadoApp) {
  estado = proximo;
  salvar(proximo);
  ouvintes.forEach((o) => o());
}

function atual(): EstadoApp {
  if (!estado) estado = carregar();
  return estado;
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  // Mantém abas do navegador sincronizadas.
  const aoMudarStorage = (ev: StorageEvent) => {
    if (ev.key !== CHAVE_STORAGE) return;
    estado = null;
    pilhaDesfazer = [];
    // Registros vindos de outra aba são "agora": sem isso ficariam no futuro do relógio.
    tocarRelogio();
    ouvinte();
  };
  window.addEventListener("storage", aoMudarStorage);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

/** Estado global; `null` durante a renderização no servidor. */
export function useEstado(): EstadoApp | null {
  return useSyncExternalStore(inscrever, atual, () => null);
}

/** Negócio selecionado no cabeçalho. */
export function useNegocioAtivo(): Negocio | null {
  const e = useEstado();
  return e ? e.negocios[e.negocioAtivoId] : null;
}

// ---------- Relógio (para "hoje", janela de 7 dias etc.) ----------

let agoraCache = 0;
function inscreverRelogio(ouvinte: () => void) {
  const id = window.setInterval(() => {
    agoraCache = Date.now();
    ouvinte();
  }, 30_000);
  return () => window.clearInterval(id);
}
function lerRelogio() {
  if (!agoraCache) agoraCache = Date.now();
  return agoraCache;
}
/** Horário atual atualizado a cada 30 s. */
export function useAgora(): number {
  return useSyncExternalStore(inscreverRelogio, lerRelogio, () => 0);
}
function tocarRelogio() {
  agoraCache = Date.now();
}

// ---------- Ações ----------

function atualizarNegocio(id: string, fn: (n: Negocio) => Negocio) {
  const e = atual();
  const n = e.negocios[id];
  if (!n) return;
  definir({ ...e, negocios: { ...e.negocios, [id]: fn(n) } });
}

export function selecionarNegocio(id: string) {
  const e = atual();
  if (!e.negocios[id] || e.negocioAtivoId === id) return;
  pilhaDesfazer = [];
  definir({ ...e, negocioAtivoId: id });
}

export function criarNegocio(input: NovoNegocioInput): string {
  const e = atual();
  const id = novoId("negocio");
  const negocio = criarNegocioPersonalizado(input, id);
  pilhaDesfazer = [];
  definir({ ...e, negocios: { ...e.negocios, [id]: negocio }, ordem: [...e.ordem, id], negocioAtivoId: id });
  return id;
}

export function excluirNegocio(id: string) {
  const e = atual();
  const n = e.negocios[id];
  if (!n || n.preConfigurado) return;
  const negocios = { ...e.negocios };
  delete negocios[id];
  const ordem = e.ordem.filter((o) => o !== id);
  pilhaDesfazer = pilhaDesfazer.filter((p) => p.negocioId !== id);
  definir({ ...e, negocios, ordem, negocioAtivoId: e.negocioAtivoId === id ? ordem[0] : e.negocioAtivoId });
}

export function definirMetaSemanal(negocioId: string, meta: number) {
  atualizarNegocio(negocioId, (n) => ({ ...n, metaSemanal: Math.max(0, Math.round(meta)) }));
}

/** Cadastra (ou substitui, se o id já existir) um item no estoque. */
export function salvarItem(negocioId: string, item: Omit<ItemEstoque, "id"> & { id?: string }): string {
  const id = item.id ?? novoId("item");
  atualizarNegocio(negocioId, (n) => {
    const novo: ItemEstoque = { ...item, id };
    const existe = n.itens.some((i) => i.id === id);
    return { ...n, itens: existe ? n.itens.map((i) => (i.id === id ? novo : i)) : [...n.itens, novo] };
  });
  return id;
}

export type NovaTransacao = Omit<Transacao, "id" | "timestamp"> & { timestamp?: number };

export interface ResultadoRegistro {
  transacao: Transacao;
  /** Efeito em cadeia: insumos -> disponibilidade de produtos finais. */
  impacto: MudancaDisponibilidade[];
}

/** Cria os itens novos e aplica a transação num passo só (desfeito junto). */
function aplicarComDesfazer(
  negocioId: string,
  nova: NovaTransacao,
  novosItens: ItemEstoque[] = [],
): ResultadoRegistro | null {
  const e = atual();
  const antes = e.negocios[negocioId];
  if (!antes) return null;
  tocarRelogio();
  const comNovos = novosItens.length ? { ...antes, itens: [...antes.itens, ...novosItens] } : antes;
  const transacao: Transacao = { ...nova, id: novoId("t"), timestamp: nova.timestamp ?? Date.now() };
  const depois = aplicarTransacao(comNovos, transacao);
  pilhaDesfazer.push({ negocioId, transacaoId: transacao.id, anterior: antes });
  definir({ ...e, negocios: { ...e.negocios, [negocioId]: depois } });
  return { transacao: depois.transacoes[depois.transacoes.length - 1], impacto: calcularImpacto(antes, depois) };
}

/**
 * Registra venda/compra/despesa no negócio, atualizando estoque, disponibilidade
 * derivada e financeiro de uma só vez. Pode ser revertido com `desfazer()`.
 */
export function registrarTransacao(negocioId: string, nova: NovaTransacao): ResultadoRegistro | null {
  return aplicarComDesfazer(negocioId, nova);
}

export interface ResultadoComando extends ResultadoRegistro {
  negocioId: string;
  interpretacao: Interpretacao;
  perguntas: PerguntaItemNovo[];
  novosItens: string[];
  avisos: string[];
}

/** Registra o que o interpretador entendeu (com os itens novos que ele cadastrou). */
export function registrarPlano(negocioId: string, plano: PlanoRegistro, interpretacao: Interpretacao): ResultadoComando | null {
  const r = aplicarComDesfazer(negocioId, plano.transacao, plano.novosItens);
  if (!r) return null;
  return {
    ...r,
    negocioId,
    interpretacao,
    perguntas: plano.perguntas,
    novosItens: plano.novosItens.map((i) => i.id),
    avisos: plano.avisos,
  };
}

export interface RespostaItemNovo {
  categoria: "revenda" | "insumo";
  precoVenda?: number;
  custoUnitario?: number;
  /** Compra: unidades que já existiam antes desta compra. */
  estoqueAnterior?: number;
  /** Venda: unidades que ainda restam. */
  estoqueRestante?: number;
}

/**
 * Completa o cadastro de um item novo com as respostas do card e corrige a
 * transação (custo da venda para o lucro real; valor da compra se faltou).
 * O desfazer continua voltando ao estado de antes do comando.
 */
export function completarItemNovo(
  negocioId: string,
  transacaoId: string,
  itemId: string,
  r: RespostaItemNovo,
): Transacao | null {
  const e = atual();
  const n = e.negocios[negocioId];
  const t = n?.transacoes.find((x) => x.id === transacaoId);
  const item = n?.itens.find((i) => i.id === itemId);
  if (!n || !t || !item) return null;
  const linha = t.itens.find((l) => l.itemId === itemId);
  const qtd = linha?.quantidade ?? 0;

  const atualizado: ItemEstoque = { ...item, categoria: r.categoria };
  if (r.custoUnitario !== undefined) atualizado.custoUnitario = Math.max(0, r.custoUnitario);
  if (r.categoria === "revenda" && r.precoVenda !== undefined) atualizado.precoVenda = Math.max(0, r.precoVenda);
  if (r.categoria === "insumo") delete atualizado.precoVenda;
  if (r.estoqueAnterior !== undefined) atualizado.quantidade = arredondar(item.quantidade + Math.max(0, r.estoqueAnterior));
  if (r.estoqueRestante !== undefined) atualizado.quantidade = Math.max(0, r.estoqueRestante);

  let transacao = t;
  const semValorNaFrase = linha !== undefined && !linha.valorUnitario;
  const trocarLinha = (valorUnitario: number) =>
    t.itens.map((l) => (l.itemId === itemId ? { ...l, valorUnitario } : l));
  if (t.tipo === "venda") {
    const precoNovo = semValorNaFrase && atualizado.precoVenda ? atualizado.precoVenda : 0;
    transacao = {
      ...t,
      valor: arredondar(t.valor + precoNovo * qtd, 2),
      itens: precoNovo ? trocarLinha(precoNovo) : t.itens,
      // O item entrou na venda com custo zero; agora o lucro fica real.
      custoEstimado: arredondar((t.custoEstimado ?? 0) + (atualizado.custoUnitario - item.custoUnitario) * qtd, 2),
    };
  } else if (t.tipo === "compra" && semValorNaFrase && atualizado.custoUnitario > 0) {
    transacao = { ...t, valor: arredondar(t.valor + atualizado.custoUnitario * qtd, 2), itens: trocarLinha(atualizado.custoUnitario) };
  }

  definir({
    ...e,
    negocios: {
      ...e.negocios,
      [negocioId]: {
        ...n,
        itens: n.itens.map((i) => (i.id === itemId ? atualizado : i)),
        transacoes: n.transacoes.map((x) => (x.id === transacaoId ? transacao : x)),
      },
    },
  });
  return transacao;
}

/** Negócio atual fora do React (para ações assíncronas conferirem o estado). */
export function obterNegocio(id: string): Negocio | null {
  return atual().negocios[id] ?? null;
}

export function obterNegocioAtivoId(): string {
  return atual().negocioAtivoId;
}

/** Reverte 100% do estado do negócio para antes da transação. */
export function desfazer(transacaoId?: string): boolean {
  const idx = transacaoId
    ? pilhaDesfazer.findIndex((p) => p.transacaoId === transacaoId)
    : pilhaDesfazer.length - 1;
  if (idx < 0) return false;
  const passo = pilhaDesfazer[idx];
  // Desfazer um passo antigo também desfaz os posteriores do mesmo negócio.
  pilhaDesfazer = pilhaDesfazer.slice(0, idx);
  const e = atual();
  if (!e.negocios[passo.negocioId]) return false;
  definir({ ...e, negocios: { ...e.negocios, [passo.negocioId]: passo.anterior } });
  return true;
}

export function podeDesfazer(): boolean {
  return pilhaDesfazer.length > 0;
}

/**
 * Reset de estande: volta tudo ao estado inicial (4 negócios de demonstração,
 * criados pelo usuário removidos, Padaria selecionada).
 */
export function reiniciarDemo() {
  const inicial = criarEstadoInicial(Date.now());
  tocarRelogio();
  pilhaDesfazer = [];
  definir(inicial);
}
