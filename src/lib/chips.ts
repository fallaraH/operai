// Chips de pitch: frases prontas que mudam com o negócio e com o histórico.
// Clicar num chip preenche a barra e executa na hora, como se tivesse sido falado.

import { situacaoEstoque } from "./dominio/estoque";
import { maisVendidos, progressoMeta } from "./dominio/metricas";
import type { ItemEstoque, Negocio, Unidade } from "./dominio/tipos";
import { chaveDia } from "./formatar";

export type TipoChip = "compra" | "repor" | "venda" | "meta" | "fiado" | "perda" | "despesa" | "novo";

export interface Chip {
  id: string;
  tipo: TipoChip;
  rotulo: string;
  /** Frase enviada ao interpretador, exatamente como o comerciante falaria. */
  texto: string;
}

type ChipBase = Chip & { quandoMeta?: "aberta" | "batida"; /** Quanto o chip de meta soma ao saldo. */ valor?: number };

// ---------- Roteiros dos 4 negócios de demonstração ----------
// Cada venda de meta vale mais do que falta na semente (ver `faltaMeta`), então
// cruza os 100% logo no primeiro clique.

const ROTEIROS: Record<string, ChipBase[]> = {
  padaria: [
    { id: "compra-lote", tipo: "compra", rotulo: "Comprar matéria-prima", texto: "Comprei 50kg de farinha e 20L de leite por 320 reais no Pix" },
    { id: "meta", tipo: "meta", rotulo: "Bater a meta da semana", texto: "Vendi 40 pães franceses e 4 bolos de chocolate por 185 reais", quandoMeta: "aberta", valor: 185 },
    { id: "fiado", tipo: "fiado", rotulo: "Venda no fiado", texto: "Vendi 20 pães franceses e 2 bolos por 85 reais fiado pro João" },
    { id: "perda", tipo: "perda", rotulo: "Perda de pães", texto: "Perdi 12 pães amanhecidos" },
    { id: "despesa", tipo: "despesa", rotulo: "Conta de luz", texto: "Paguei a conta de luz de 380 reais" },
    { id: "novo-venda", tipo: "novo", rotulo: "Produto novo (venda)", texto: "Vendi 5 coxinhas por 25 reais" },
    { id: "novo-compra", tipo: "novo", rotulo: "Produto novo (compra)", texto: "Comprei 10 kg de queijo muçarela por 450 reais no atacadão" },
  ],
  petshop: [
    { id: "compra", tipo: "compra", rotulo: "Chegou areia Pipicat", texto: "Chegaram 10 pacotes de areia Pipicat por 102 reais" },
    { id: "meta", tipo: "meta", rotulo: "Bater a meta da semana", texto: "Vendi 2 sacos de ração Golden e 3 biscoitos Pedigree no Pix", quandoMeta: "aberta", valor: 414.5 },
    { id: "fiado", tipo: "fiado", rotulo: "Venda no fiado", texto: "Vendi 1 antipulgas Bravecto fiado para a Mariana" },
    { id: "novo-venda", tipo: "novo", rotulo: "Produto novo (venda)", texto: "Vendi 2 coleiras por 59,80 reais" },
    { id: "novo-compra", tipo: "novo", rotulo: "Produto novo (compra)", texto: "Comprei 12 comedouros por 180 reais" },
    { id: "perda", tipo: "perda", rotulo: "Areia rasgada", texto: "Perdi 2 pacotes de areia Pipicat que rasgaram" },
    { id: "despesa", tipo: "despesa", rotulo: "Internet", texto: "Paguei 110 reais de internet" },
  ],
  roupas: [
    { id: "compra", tipo: "compra", rotulo: "Chegou Conjunto Viver", texto: "Chegaram 15 unidades do Conjunto Viver Verde Menta por 1.575 reais" },
    { id: "meta", tipo: "meta", rotulo: "Bater a meta da semana", texto: "Vendi 2 Conjunto Total Confort Preto no Pix", quandoMeta: "aberta", valor: 418 },
    { id: "fiado", tipo: "fiado", rotulo: "Venda no fiado", texto: "Vendi 1 Conjunto Dalla Gold Azul Marinho fiado para a Camila" },
    { id: "novo-venda", tipo: "novo", rotulo: "Produto novo (venda)", texto: "Vendi 2 bolsas por 180 reais" },
    { id: "perda", tipo: "perda", rotulo: "Peça com defeito", texto: "Perdi 1 Vestido Flow Estampado Azul que veio com defeito" },
    { id: "despesa", tipo: "despesa", rotulo: "Anúncio", texto: "Paguei 150 reais de anúncio" },
  ],
  mercado: [
    { id: "compra", tipo: "compra", rotulo: "Repor leite", texto: "Comprei 48 caixas de leite por 206,40 reais" },
    { id: "meta", tipo: "meta", rotulo: "Bater a meta da semana", texto: "Vendi 12 latinhas de cerveja e 2 arroz por 119,70 reais", quandoMeta: "aberta", valor: 119.7 },
    { id: "fiado", tipo: "fiado", rotulo: "Venda no fiado", texto: "Vendi 2 arroz e 1 café por 82,70 reais, marca na conta do Seu Zé" },
    { id: "novo-venda", tipo: "novo", rotulo: "Produto novo (venda)", texto: "Vendi 3 pacotes de pipoca por 12 reais" },
    { id: "novo-compra", tipo: "novo", rotulo: "Produto novo (compra)", texto: "Comprei 20 pacotes de bala por 40 reais" },
    { id: "perda", tipo: "perda", rotulo: "Leite vencido", texto: "Perdi 4 caixas de leite vencidas" },
    { id: "despesa", tipo: "despesa", rotulo: "Conta de luz", texto: "Paguei 460 reais de luz" },
  ],
};

// ---------- Negócios criados pelo usuário: roteiro por ramo ----------

const ROTEIRO_RAMO: [RegExp, [compra: string, venda: string, despesa: string]][] = [
  [/hamb[uú]rg|burger|lanch/i, ["Comprei 5 kg de carne moída por 175 reais", "Vendi 10 x-burguer por 250 reais", "Paguei 120 reais no gás"]],
  [/oficina|mec[aâ]nic|auto/i, ["Comprei 10 litros de óleo de motor por 280 reais", "Vendi 2 trocas de óleo por 360 reais", "Paguei 240 reais de luz"]],
  [/confeit|doce|brigadeir|bolo/i, ["Comprei 10 kg de açúcar por 55 reais", "Vendi 20 brigadeiros por 60 reais", "Paguei 90 reais de embalagens"]],
  [/farm[aá]c|drogaria/i, ["Comprei 20 caixas de dipirona por 160 reais", "Vendi 2 protetores solares por 79,80 reais", "Paguei 300 reais de aluguel"]],
  [/pizz/i, ["Comprei 20 kg de farinha por 90 reais", "Vendi 8 pizzas por 360 reais", "Paguei 120 reais no gás"]],
  [/a[cç]a[ií]|sorvet/i, ["Comprei 10 kg de açaí por 180 reais", "Vendi 12 copos de açaí por 144 reais", "Paguei 200 reais de energia"]],
  [/sal[aã]o|beleza|cabel/i, ["Comprei 5 shampoos por 150 reais", "Vendi 2 escovas progressivas por 300 reais", "Paguei 800 reais de aluguel"]],
];
const ROTEIRO_PADRAO: [string, string, string] = [
  "Comprei 10 unidades de produto por 100 reais",
  "Vendi 3 unidades de produto por 45 reais",
  "Paguei a conta de luz de 200 reais",
];

function roteiroPersonalizado(n: Negocio): ChipBase[] {
  const [compra, venda, despesa] = ROTEIRO_RAMO.find(([re]) => re.test(`${n.ramo} ${n.nome}`))?.[1] ?? ROTEIRO_PADRAO;
  return [
    { id: "compra", tipo: "compra", rotulo: "Primeira compra", texto: compra },
    { id: "novo-venda", tipo: "novo", rotulo: "Venda de produto novo", texto: venda },
    { id: "fiado", tipo: "fiado", rotulo: "Venda no fiado", texto: `${venda} fiado pro João` },
    { id: "despesa", tipo: "despesa", rotulo: "Despesa", texto: despesa },
  ];
}

// ---------- Chips que nascem do histórico ----------

/** "Ração Premium Cães 15kg" → "ração premium cães"; usa o menor apelido quando há. */
function nomeFalado(item: ItemEstoque): string {
  if (item.nomeCurto) return item.nomeCurto;
  const semMedida = item.nome.replace(/\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)\b/gi, "").trim().toLowerCase();
  const apelido = [...(item.apelidos ?? [])].sort((a, b) => a.length - b.length).find((a) => a.length > 2);
  return apelido && apelido.length < semMedida.length ? apelido : semMedida;
}

const UNIDADE_FALADA: Partial<Record<Unidade, string>> = { un: "unidades", kg: "kg", g: "g", L: "litros", ml: "ml", m: "metros", pct: "pacotes", cx: "caixas", dz: "dúzias", par: "pares", rolo: "rolos" };

function frase(verbo: string, qtd: number, item: ItemEstoque): string {
  return `${verbo} ${qtd} ${UNIDADE_FALADA[item.unidade] ?? "unidades"} de ${nomeFalado(item)}`;
}

/** 28.8 → "28,80"; 320 → "320". */
const dinheiro = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2)).replace(".", ",");
};

/** Quantidade de venda que rende um valor redondo o bastante para a demonstração (≥ R$ 10). */
function qtdVenda(item: ItemEstoque): number {
  let qtd = item.unidade === "un" ? 3 : 2;
  while ((item.precoVenda ?? 0) * qtd < 10 && qtd < 60) qtd *= 2;
  return qtd;
}

/** Reposição do item mais urgente e venda do mais vendido, com os valores reais do estoque. */
function chipsDoHistorico(n: Negocio, agora: number): ChipBase[] {
  const chips: ChipBase[] = [];
  const situacao = situacaoEstoque(n, agora);

  const urgente = situacao
    .filter((s) => s.cor !== "verde" && s.item.categoria !== "producao_propria" && s.custoUnitario > 0)
    .sort((a, b) => (a.cor === b.cor ? 0 : a.cor === "vermelho" ? -1 : 1))[0];
  if (urgente) {
    // Peça cara repõe em lote pequeno (6 conjuntos), mercadoria barata em lote grande.
    const qtd = urgente.custoUnitario >= 50 ? 6 : urgente.item.unidade === "un" ? 24 : 20;
    chips.push({
      id: `repor-${urgente.item.id}`,
      tipo: "repor",
      rotulo: `Repor ${nomeFalado(urgente.item)}`,
      texto: `${frase("Comprei", qtd, urgente.item)} por ${dinheiro(urgente.custoUnitario * qtd)} reais`,
    });
  }

  const vendaveis = situacao.filter((s) => (s.item.precoVenda ?? 0) > 0 && s.disponivel >= 3);
  const campeao = maisVendidos(n, agora, 5).find((m) => vendaveis.some((s) => s.item.id === m.chave));
  const alvo = vendaveis.find((s) => s.item.id === campeao?.chave) ?? vendaveis[0];
  if (alvo) {
    const qtd = Math.min(qtdVenda(alvo.item), Math.floor(alvo.disponivel));
    chips.push({
      id: `vender-${alvo.item.id}-${chaveDia(agora)}`,
      tipo: "venda",
      rotulo: `Vender ${nomeFalado(alvo.item)}`,
      texto: `${frase("Vendi", qtd, alvo.item)} por ${dinheiro((alvo.item.precoVenda ?? 0) * qtd)} reais`,
    });
  }
  return chips;
}

/**
 * A meta é sobre o saldo líquido: depois de compras e despesas, a venda fixa do
 * roteiro pode não bastar. Aí o chip vira uma venda do mais vendido que cobre o
 * que falta com folga (e cabe no estoque), para o confete continuar garantido.
 */
function vendaQueBateMeta(n: Negocio, agora: number, falta: number): string | null {
  const ranking = maisVendidos(n, agora, 5).map((m) => m.chave);
  const posicao = (id: string) => (ranking.includes(id) ? ranking.indexOf(id) : ranking.length);
  const candidatos = situacaoEstoque(n, agora)
    .filter((s) => (s.item.precoVenda ?? 0) > 0)
    .sort((a, b) => posicao(a.item.id) - posicao(b.item.id));
  const opcoes = candidatos
    .map((s) => {
      const preco = s.item.precoVenda ?? 0;
      return { s, preco, qtd: Math.ceil((falta + Math.max(20, falta * 0.05)) / preco) };
    })
    .filter((o) => o.qtd <= Math.floor(o.s.disponivel));
  // Uma venda crível na fala ("vendi 23 bolos"), não "vendi 972 pães": até 30 unidades, senão a menor quantidade.
  const escolha = opcoes.find((o) => o.qtd <= 30) ?? [...opcoes].sort((a, b) => a.qtd - b.qtd)[0];
  return escolha ? `${frase("Vendi", escolha.qtd, escolha.s.item)} por ${dinheiro(escolha.preco * escolha.qtd)} reais` : null;
}

/**
 * Chips do negócio atual, na ordem de exibição. O chip de meta só aparece
 * enquanto a meta está aberta; batida, ele dá lugar a vendas pelo histórico.
 */
export function gerarChips(negocio: Negocio, agora: number): Chip[] {
  const roteiro = (negocio.preConfigurado && ROTEIROS[negocio.id]) || roteiroPersonalizado(negocio);
  const meta = progressoMeta(negocio, agora);
  const falta = meta.meta - meta.atual;
  const base = roteiro
    .filter((c) => !c.quandoMeta || (c.quandoMeta === "batida") === meta.batida)
    .map((c) => {
      if (c.tipo !== "meta" || c.valor === undefined || c.valor > falta) return c;
      const texto = vendaQueBateMeta(negocio, agora, falta);
      return texto ? { ...c, texto } : c;
    });
  const vistos = new Set(base.map((c) => c.texto));
  const doHistorico = chipsDoHistorico(negocio, agora).filter((c) => !vistos.has(c.texto));
  // Compra, meta e fiado na frente; os do histórico logo depois.
  return [...base.slice(0, 3), ...doHistorico, ...base.slice(3)].map(({ id, tipo, rotulo, texto }) => ({ id, tipo, rotulo, texto }));
}
