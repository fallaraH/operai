// Interpretacao (local ou IA) → registro pronto para o negócio: casa os itens com
// o estoque, converte unidades, divide o valor entre os itens e prepara o
// cadastro de itens novos (com as perguntas do card "Entendi assim").

import { arredondar, custoUnitario, disponibilidade, indexarItens, inicioJanela } from "../dominio/estoque";
import type {
  ItemEstoque, LinhaTransacao, Negocio, OrigemTransacao, TipoTransacao, Transacao, Unidade,
} from "../dominio/tipos";
import { descreverLinhas, quantidade as textoQuantidade } from "../formatar";
import { casarItem, criarIndice } from "./casamento";
import { ehInsumoProvavel } from "./lexico";
import { normalizar } from "./texto";
import type { Interpretacao, ItemInterpretado, TipoMovimentacao } from "./tipos";

export interface PerguntaItemNovo {
  itemId: string;
  nome: string;
  unidade: Unidade;
  quantidade: number;
  origem: "compra" | "venda";
  categoriaSugerida: "revenda" | "insumo";
  /** Custo (compra) ou preço (venda) por unidade que veio na frase. */
  valorUnitario: number | null;
}

export interface PlanoRegistro {
  transacao: Omit<Transacao, "id" | "timestamp">;
  novosItens: ItemEstoque[];
  perguntas: PerguntaItemNovo[];
  avisos: string[];
}

export type ResultadoPlano = { ok: true; plano: PlanoRegistro } | { ok: false; motivo: string };

const TIPO: Record<TipoMovimentacao, TipoTransacao> = {
  entrada: "compra",
  saida_venda: "venda",
  saida_perda: "perda",
  despesa: "despesa",
};

const DISCRETAS = new Set<Unidade>(["un", "dz", "par", "pct", "cx", "rolo"]);
const FATOR: Record<string, number> = { "g>kg": 0.001, "kg>g": 1000, "ml>L": 0.001, "L>ml": 1000, "dz>un": 12, "un>dz": 1 / 12 };

function arredondarQuantidade(q: number, u: Unidade): number {
  return DISCRETAS.has(u) ? Math.max(1, Math.round(q)) : Math.round(q * 1000) / 1000;
}

/** Quantidade dita → unidade do item ("500 g" → 0,5 kg; "30 kg" de ração de 15 kg → 2 un). */
function converter(qtd: number, de: Unidade, item: ItemEstoque): { qtd: number; ok: boolean } {
  const para = item.unidade;
  if (de === para) return { qtd, ok: true };
  const fator = FATOR[`${de}>${para}`];
  if (fator) return { qtd: qtd * fator, ok: true };
  if ((de === "pct" || de === "cx") && para === "un") return { qtd, ok: true };
  if (de === "un") return { qtd, ok: true }; // unidade não dita: vale a do item
  if (para === "un") {
    const m = item.nome.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b/i);
    if (m) {
      const tamanho = Number(m[1].replace(",", "."));
      const unidadeNome = (m[2].toLowerCase() === "l" ? "L" : m[2].toLowerCase()) as Unidade;
      const fatorNome = de === unidadeNome ? 1 : FATOR[`${de}>${unidadeNome}`];
      if (fatorNome && tamanho > 0) return { qtd: (qtd * fatorNome) / tamanho, ok: true };
    }
  }
  return { qtd, ok: false };
}

interface Linha {
  dito: ItemInterpretado;
  item: ItemEstoque | null;
  novo: boolean;
  /** Na unidade do item (ou na dita, se o item é novo). */
  quantidade: number | null;
  unidade: Unidade;
  /** Valor da linha em reais. */
  total: number | null;
  /** Preço (venda) ou custo (compra/perda) de referência por unidade. */
  referencia: number | null;
}

/** Divide o total da movimentação entre as linhas sem valor próprio. */
function distribuir(total: number, linhas: Linha[], avisos: string[]) {
  const livres = linhas.filter((l) => l.total === null);
  if (!livres.length) return;
  const fixos = linhas.reduce((s, l) => s + (l.total ?? 0), 0);
  const resto = total - fixos;
  if (resto <= 0.009) {
    livres.forEach((l) => (l.total = 0));
    return;
  }
  const peso = (l: Linha) => (l.referencia ?? 0) * (l.quantidade ?? 1);
  const comRef = livres.filter((l) => peso(l) > 0);
  const semRef = livres.filter((l) => peso(l) <= 0);
  const somaRef = comRef.reduce((s, l) => s + peso(l), 0);
  const porQuantidade = (grupo: Linha[], valor: number) => {
    const q = grupo.reduce((s, l) => s + (l.quantidade ?? 1), 0);
    grupo.forEach((l) => (l.total = (valor * (l.quantidade ?? 1)) / q));
  };
  if (!semRef.length) comRef.forEach((l) => (l.total = (resto * peso(l)) / somaRef));
  else if (!comRef.length) porQuantidade(semRef, resto);
  else if (resto > somaRef) {
    comRef.forEach((l) => (l.total = peso(l)));
    porQuantidade(semRef, resto - somaRef);
  } else {
    comRef.forEach((l) => (l.total = (resto * peso(l)) / somaRef));
    semRef.forEach((l) => (l.total = 0));
    avisos.push("Não deu para separar o valor dos itens novos; confira o preço deles.");
  }
  // Centavos: o arredondamento fecha no último item.
  livres.forEach((l) => (l.total = arredondar(l.total ?? 0, 2)));
  const diferenca = arredondar(total - linhas.reduce((s, l) => s + (l.total ?? 0), 0), 2);
  livres[livres.length - 1].total = arredondar((livres[livres.length - 1].total ?? 0) + diferenca, 2);
}

/** Quanto do valor das vendas da semana é custo (para estimar o lucro da venda avulsa). */
function razaoCusto(negocio: Negocio, agora: number): number {
  const inicio = inicioJanela(agora);
  let valor = 0;
  let custo = 0;
  for (const t of negocio.transacoes) {
    if (t.tipo !== "venda" || t.timestamp < inicio || t.custoEstimado === undefined) continue;
    valor += t.valor;
    custo += t.custoEstimado;
  }
  return valor > 0 ? Math.min(1, custo / valor) : 0;
}

function acharItem(dito: ItemInterpretado, negocio: Negocio, tipo: TipoTransacao) {
  const alvo = normalizar(dito.nome_canonico);
  const exato = negocio.itens.find((i) => normalizar(i.nome) === alvo);
  if (exato) return exato;
  const preferir =
    tipo === "compra" ? (["insumo", "revenda"] as const) : tipo === "venda" ? (["revenda", "producao_propria"] as const) : undefined;
  return casarItem(dito.nome_canonico, criarIndice(negocio.itens), preferir ? [...preferir] : undefined)?.item ?? null;
}

function planejarDespesa(interp: Interpretacao, origem: OrigemTransacao): ResultadoPlano {
  const valor = interp.valor_total_operacao ?? interp.itens[0]?.valor_total_mencionado ?? null;
  if (valor === null || valor <= 0) {
    return { ok: false, motivo: "Qual foi o valor da despesa? Ex: “Paguei a conta de luz, 380 reais”." };
  }
  return {
    ok: true,
    plano: {
      transacao: {
        tipo: "despesa",
        descricao: interp.itens[0]?.nome_canonico || interp.categoria_despesa || "Despesa",
        valor: arredondar(valor, 2),
        itens: [],
        categoriaDespesa: interp.categoria_despesa ?? "Outros",
        contraparte: interp.cliente_ou_fornecedor ?? undefined,
        origem,
      },
      novosItens: [],
      perguntas: [],
      avisos: [],
    },
  };
}

export function planejarRegistro(
  interp: Interpretacao,
  negocio: Negocio,
  origem: OrigemTransacao,
  novoId: (prefixo: string) => string,
  agora = Date.now(),
): ResultadoPlano {
  const tipo = TIPO[interp.tipo_movimentacao];
  if (tipo === "despesa") return planejarDespesa(interp, origem);

  const avisos: string[] = [];
  const mapa = indexarItens(negocio.itens);
  const linhas: Linha[] = interp.itens.map((dito) => {
    const ditoTotal =
      dito.valor_total_mencionado ??
      (dito.valor_unitario_mencionado !== null && dito.quantidade !== null
        ? dito.valor_unitario_mencionado * dito.quantidade
        : null);
    const item = acharItem(dito, negocio, tipo);
    if (item) {
      let quantidade: number | null = null;
      if (dito.quantidade !== null) {
        const c = converter(dito.quantidade, dito.unidade_medida, item);
        quantidade = c.qtd;
        if (!c.ok) avisos.push(`Unidade diferente para ${item.nome}: considerei ${textoQuantidade(c.qtd, item.unidade)}.`);
      }
      const referencia = tipo === "venda" ? item.precoVenda ?? null : custoUnitario(item, mapa) || null;
      return { dito, item, novo: false, quantidade, unidade: item.unidade, total: ditoTotal, referencia };
    }
    // Dúzia de item novo vira unidade ("2 dúzias de coxinha" → 24 un).
    const emDuzia = dito.unidade_medida === "dz";
    return {
      dito,
      item: null,
      novo: tipo !== "perda",
      quantidade: dito.quantidade !== null && emDuzia ? dito.quantidade * 12 : dito.quantidade,
      unidade: emDuzia ? "un" : dito.unidade_medida,
      total: ditoTotal,
      referencia: dito.valor_unitario_mencionado !== null && emDuzia ? dito.valor_unitario_mencionado / 12 : dito.valor_unitario_mencionado,
    };
  });

  const totalDito = interp.valor_total_operacao;
  if (!linhas.length) {
    if (tipo === "perda") return { ok: false, motivo: "Diga o que foi perdido, ex: “Perdi 6 sonhos que caíram no chão”." };
    if (totalDito === null || totalDito <= 0) {
      const verbo = tipo === "venda" ? "vendido" : "comprado";
      return { ok: false, motivo: `Não entendi o que foi ${verbo} nem o valor. Tente: “Vendi 30 pães por 27 reais”.` };
    }
  }

  if (tipo !== "perda") {
    if (totalDito !== null) distribuir(totalDito, linhas, avisos);
    for (const l of linhas) {
      if (l.total === null && l.referencia !== null) l.total = l.referencia * (l.quantidade ?? 1);
    }
  }
  for (const l of linhas) {
    if (l.quantidade !== null) continue;
    if (l.total && l.referencia) l.quantidade = arredondarQuantidade(l.total / l.referencia, l.unidade);
    else {
      l.quantidade = 1;
      avisos.push(`Quantidade de ${l.item?.nome ?? l.dito.nome_canonico} não informada: considerei 1.`);
    }
  }

  // Itens novos e perguntas do card
  const novosItens: ItemEstoque[] = [];
  const perguntas: PerguntaItemNovo[] = [];
  const idPorLinha = new Map<Linha, string>();
  for (const l of linhas) {
    if (!l.novo || (tipo !== "compra" && tipo !== "venda")) continue;
    const nome = l.dito.nome_canonico;
    const categoria = tipo === "compra" && negocio.modo !== "revenda" && ehInsumoProvavel(nome) ? "insumo" : "revenda";
    const unitario = l.total && l.quantidade ? l.total / l.quantidade : null;
    const id = novoId("item");
    idPorLinha.set(l, id);
    novosItens.push({
      id,
      nome,
      categoria,
      unidade: l.unidade,
      quantidade: 0,
      custoUnitario: tipo === "compra" && unitario ? arredondar(unitario, 4) : 0,
      precoVenda: tipo === "venda" && unitario ? arredondar(unitario, 2) : undefined,
      apelidos: [...new Set([nome.toLowerCase(), ...l.dito.tags_busca.filter((t) => t.length > 2)])].slice(0, 5),
    });
    perguntas.push({
      itemId: id,
      nome,
      unidade: l.unidade,
      quantidade: l.quantidade ?? 1,
      origem: tipo,
      categoriaSugerida: categoria,
      valorUnitario: unitario ? arredondar(unitario, 2) : null,
    });
  }

  // Venda ou perda maior que o estoque: registra, mas avisa.
  if (tipo === "venda" || tipo === "perda") {
    for (const l of linhas) {
      if (!l.item || l.quantidade === null) continue;
      const disp = disponibilidade(l.item, mapa);
      if (l.quantidade > disp + 1e-9) avisos.push(`Só havia ${textoQuantidade(disp, l.item.unidade)} de ${l.item.nome} no estoque.`);
    }
  }

  const itensTransacao: LinhaTransacao[] = linhas.map((l) => ({
    itemId: l.item?.id ?? idPorLinha.get(l),
    nome: l.item?.nome ?? l.dito.nome_canonico,
    quantidade: arredondar(l.quantidade ?? 1),
    unidade: l.unidade,
    valorUnitario:
      tipo !== "perda" && l.total && l.quantidade ? arredondar(l.total / l.quantidade, 4) : undefined,
  }));

  const somaLinhas = linhas.reduce((s, l) => s + (l.total ?? 0), 0);
  const valor =
    tipo === "perda"
      ? totalDito ?? (linhas.every((l) => l.total !== null) ? somaLinhas : 0)
      : totalDito ?? somaLinhas;
  const prefixo = tipo === "venda" ? "Venda" : tipo === "compra" ? "Compra" : "Perda";

  return {
    ok: true,
    plano: {
      transacao: {
        tipo,
        descricao: itensTransacao.length ? `${prefixo}: ${descreverLinhas(itensTransacao)}` : `${prefixo} avulsa`,
        valor: arredondar(valor, 2),
        itens: itensTransacao,
        // Venda sem itens: custo estimado pela margem média da semana.
        ...(tipo === "venda" && !itensTransacao.length
          ? { custoEstimado: arredondar(valor * razaoCusto(negocio, agora), 2) }
          : {}),
        contraparte: interp.cliente_ou_fornecedor ?? undefined,
        origem,
      },
      novosItens,
      perguntas,
      avisos,
    },
  };
}
