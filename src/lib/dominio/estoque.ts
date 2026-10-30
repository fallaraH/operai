// Regras de estoque: ficha técnica, disponibilidade derivada, aplicação de
// transações e semáforo. Funções puras (sem React, sem localStorage).

import type {
  CorSemaforo,
  ItemEstoque,
  Negocio,
  Transacao,
} from "./tipos";

export const DIA_MS = 24 * 60 * 60 * 1000;
export const JANELA_DIAS = 7;
/** Até quantos dias de cobertura o item fica amarelo ("Acabando!"). */
export const LIMITE_AMARELO_DIAS = 3;

type MapaItens = Map<string, ItemEstoque>;

export function indexarItens(itens: ItemEstoque[]): MapaItens {
  return new Map(itens.map((i) => [i.id, i]));
}

export function arredondar(valor: number, casas = 3): number {
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

/**
 * Quantas unidades de um produto de produção própria os insumos atuais
 * permitem produzir. O insumo mais escasso define o limite.
 */
export function capacidadeProducao(item: ItemEstoque, mapa: MapaItens): number {
  const ficha = item.ficha;
  if (!ficha || ficha.ingredientes.length === 0 || ficha.rendimento <= 0) return 0;
  let lotes = Infinity;
  for (const ing of ficha.ingredientes) {
    const insumo = mapa.get(ing.insumoId);
    if (!insumo || ing.quantidade <= 0) return 0;
    lotes = Math.min(lotes, insumo.quantidade / ing.quantidade);
  }
  // Tolerância para não perder uma unidade por erro de ponto flutuante.
  return Math.max(0, Math.floor(lotes * ficha.rendimento + 1e-9));
}

/** Quantidade disponível para venda/uso, já considerando a ficha técnica. */
export function disponibilidade(item: ItemEstoque, mapa: MapaItens): number {
  if (item.categoria === "producao_propria") return capacidadeProducao(item, mapa);
  return Math.max(0, item.quantidade);
}

/** Custo de uma unidade. Produção própria soma os insumos da ficha. */
export function custoUnitario(item: ItemEstoque, mapa: MapaItens): number {
  if (item.categoria !== "producao_propria" || !item.ficha) return item.custoUnitario;
  const custoLote = item.ficha.ingredientes.reduce((soma, ing) => {
    const insumo = mapa.get(ing.insumoId);
    return soma + (insumo ? insumo.custoUnitario * ing.quantidade : 0);
  }, 0);
  return item.ficha.rendimento > 0 ? custoLote / item.ficha.rendimento : 0;
}

/** Produtos finais cuja ficha usa o insumo. */
export function produtosQueUsam(insumoId: string, itens: ItemEstoque[]): ItemEstoque[] {
  return itens.filter(
    (i) => i.categoria === "producao_propria" && i.ficha?.ingredientes.some((g) => g.insumoId === insumoId),
  );
}

/**
 * Aplica uma transação ao negócio e devolve um novo negócio (imutável):
 * - compra: soma ao estoque físico (insumos e revenda). Como a disponibilidade
 *   de produção própria é derivada, ela sobe automaticamente.
 * - venda: abate revenda; em produção própria desconta os insumos na proporção
 *   da ficha. Calcula `custoEstimado` para o lucro.
 * - despesa: só financeiro.
 */
export function aplicarTransacao(negocio: Negocio, transacao: Transacao): Negocio {
  const itens = negocio.itens.map((i) => ({ ...i }));
  const mapa = indexarItens(itens);
  let custoVenda = 0;

  for (const linha of transacao.itens) {
    const item = linha.itemId ? mapa.get(linha.itemId) : undefined;
    if (!item) continue;

    if (transacao.tipo === "compra") {
      if (item.categoria === "producao_propria") continue;
      item.quantidade = arredondar(item.quantidade + linha.quantidade);
      if (linha.valorUnitario !== undefined && linha.valorUnitario > 0) {
        item.custoUnitario = arredondar(linha.valorUnitario, 4);
      }
    } else if (transacao.tipo === "venda" || transacao.tipo === "perda") {
      custoVenda += custoUnitario(item, mapa) * linha.quantidade;
      if (item.categoria === "producao_propria" && item.ficha) {
        const lotes = linha.quantidade / item.ficha.rendimento;
        for (const ing of item.ficha.ingredientes) {
          const insumo = mapa.get(ing.insumoId);
          if (insumo) insumo.quantidade = Math.max(0, arredondar(insumo.quantidade - ing.quantidade * lotes));
        }
      } else {
        item.quantidade = Math.max(0, arredondar(item.quantidade - linha.quantidade));
      }
    }
  }

  let registrada: Transacao = transacao;
  if (transacao.tipo === "venda" && transacao.custoEstimado === undefined) {
    registrada = { ...transacao, custoEstimado: arredondar(custoVenda, 2) };
  } else if (transacao.tipo === "perda") {
    // Sem valor informado, a perda vale o custo dos itens descartados.
    const custo = arredondar(custoVenda, 2);
    registrada = { ...transacao, valor: transacao.valor > 0 ? transacao.valor : custo, custoEstimado: custo };
  }

  return { ...negocio, itens, transacoes: [...negocio.transacoes, registrada] };
}

export interface MudancaDisponibilidade {
  itemId: string;
  nome: string;
  categoria: ItemEstoque["categoria"];
  unidade: ItemEstoque["unidade"];
  antes: number;
  depois: number;
}

/** Diferença de disponibilidade item a item entre dois estados do negócio. */
export function calcularImpacto(antes: Negocio, depois: Negocio): MudancaDisponibilidade[] {
  const mapaAntes = indexarItens(antes.itens);
  const mapaDepois = indexarItens(depois.itens);
  const mudancas: MudancaDisponibilidade[] = [];
  for (const item of depois.itens) {
    const anterior = mapaAntes.get(item.id);
    const a = anterior ? disponibilidade(anterior, mapaAntes) : 0;
    const d = disponibilidade(item, mapaDepois);
    if (Math.abs(a - d) > 1e-9) {
      mudancas.push({ itemId: item.id, nome: item.nome, categoria: item.categoria, unidade: item.unidade, antes: a, depois: d });
    }
  }
  return mudancas;
}

export function inicioDoDia(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Início da janela móvel de 7 dias (hoje + 6 anteriores). */
export function inicioJanela(agora: number): number {
  const d = new Date(inicioDoDia(agora));
  d.setDate(d.getDate() - (JANELA_DIAS - 1));
  return d.getTime();
}

/** Unidades vendidas por item na janela de 7 dias. */
export function vendidosNaJanela(negocio: Negocio, agora: number): Map<string, number> {
  const inicio = inicioJanela(agora);
  const total = new Map<string, number>();
  for (const t of negocio.transacoes) {
    if (t.tipo !== "venda" || t.timestamp < inicio || t.timestamp > agora) continue;
    for (const l of t.itens) {
      if (l.itemId) total.set(l.itemId, (total.get(l.itemId) ?? 0) + l.quantidade);
    }
  }
  return total;
}

/**
 * Consumo médio diário. Produtos usam o histórico de vendas; insumos somam o
 * que os produtos da ficha consomem. Sem histórico, cai na estimativa do item.
 */
export function consumoDiario(
  item: ItemEstoque,
  negocio: Negocio,
  agora: number,
  vendidos: Map<string, number> = vendidosNaJanela(negocio, agora),
): number {
  if (item.categoria === "insumo") {
    const produtos = produtosQueUsam(item.id, negocio.itens);
    const derivado = produtos.reduce((soma, p) => {
      const ing = p.ficha!.ingredientes.find((g) => g.insumoId === item.id)!;
      return soma + (consumoDiario(p, negocio, agora, vendidos) / p.ficha!.rendimento) * ing.quantidade;
    }, 0);
    return derivado > 0 ? derivado : item.consumoDiarioEstimado ?? 0;
  }
  const vendido = vendidos.get(item.id) ?? 0;
  return vendido > 0 ? vendido / JANELA_DIAS : item.consumoDiarioEstimado ?? 0;
}

export interface SituacaoItem {
  item: ItemEstoque;
  disponivel: number;
  consumoDiario: number;
  /** Dias até acabar; Infinity se não há consumo. */
  diasCobertura: number;
  cor: CorSemaforo;
  custoUnitario: number;
  /** Insumo que limita a produção (apenas produção própria). */
  insumoLimitante?: ItemEstoque;
}

export function corSemaforo(disponivel: number, diasCobertura: number): CorSemaforo {
  if (disponivel <= 0) return "vermelho";
  if (diasCobertura <= LIMITE_AMARELO_DIAS) return "amarelo";
  return "verde";
}

function insumoLimitante(item: ItemEstoque, mapa: MapaItens): ItemEstoque | undefined {
  let pior: ItemEstoque | undefined;
  let menor = Infinity;
  for (const ing of item.ficha?.ingredientes ?? []) {
    const insumo = mapa.get(ing.insumoId);
    if (!insumo) continue;
    const lotes = insumo.quantidade / ing.quantidade;
    if (lotes < menor) {
      menor = lotes;
      pior = insumo;
    }
  }
  return pior;
}

/** Situação de todos os itens do negócio (disponibilidade, cobertura, semáforo). */
export function situacaoEstoque(negocio: Negocio, agora: number): SituacaoItem[] {
  const mapa = indexarItens(negocio.itens);
  const vendidos = vendidosNaJanela(negocio, agora);
  return negocio.itens.map((item) => {
    const disponivel = disponibilidade(item, mapa);
    const consumo = consumoDiario(item, negocio, agora, vendidos);
    const diasCobertura = consumo > 0 ? disponivel / consumo : Infinity;
    return {
      item,
      disponivel,
      consumoDiario: consumo,
      diasCobertura,
      cor: corSemaforo(disponivel, diasCobertura),
      custoUnitario: custoUnitario(item, mapa),
      insumoLimitante: item.categoria === "producao_propria" ? insumoLimitante(item, mapa) : undefined,
    };
  });
}

/** Quantidade de itens em vermelho ou amarelo (badge da aba Estoque). */
export function contarAlertas(negocio: Negocio, agora: number): number {
  return situacaoEstoque(negocio, agora).filter((s) => s.cor !== "verde").length;
}
