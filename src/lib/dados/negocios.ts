// Negócios de demonstração: estoque realista + 7 dias de histórico gerados de
// forma determinística a partir do dia atual, com a meta semanal perto de 100%.

import { custoUnitario, indexarItens, inicioDoDia, JANELA_DIAS, arredondar } from "../dominio/estoque";
import { lucroDaTransacao, saldoDaSemana } from "../dominio/metricas";
import type {
  EstadoApp,
  ItemEstoque,
  LinhaTransacao,
  ModoOperacao,
  Negocio,
  Nicho,
  Transacao,
} from "../dominio/tipos";
import { chaveDia, descreverLinhas } from "../formatar";
import { iconeDoRamo, type NomeIcone } from "../icones";

interface ItemSemente extends ItemEstoque {
  /** Média de unidades vendidas por dia no histórico gerado. */
  vendaDiaria?: number;
  /** Faixa de unidades por cliente [mín, máx]. */
  porCliente?: [number, number];
}

interface MovimentoSemente {
  diasAtras: number;
  hora: number;
  tipo: "compra" | "despesa" | "perda";
  descricao?: string;
  categoriaDespesa?: string;
  valor?: number;
  itens?: { itemId: string; quantidade: number; valorUnitario: number }[];
}

interface NegocioSemente {
  id: string;
  nome: string;
  nicho: Nicho;
  ramo: string;
  icone: NomeIcone;
  modo: ModoOperacao;
  abertura: number;
  fechamento: number;
  clientesPorDia: number;
  /**
   * Quanto falta (em R$) para bater a meta com as vendas já feitas. A meta é
   * arredondada para cima em R$ 50, então o que falta fica entre `faltaMeta` e
   * `faltaMeta + 50`: o chip de pitch de cada negócio vale mais que isso e,
   * portanto, sempre cruza os 100%.
   */
  faltaMeta: number;
  itens: ItemSemente[];
  movimentos: MovimentoSemente[];
}

// Ordem de movimento: Dom..Sáb.
const FATOR_DIA = [0.85, 0.85, 0.95, 1, 1, 1.15, 1.3];

/** Suba ao mudar as sementes: negócios de demonstração intocados são refeitos no navegador. */
export const VERSAO_DADOS = 6;

const PADARIA: NegocioSemente = {
  id: "padaria",
  nome: "Padaria Artesanal",
  nicho: "padaria",
  ramo: "Padaria",
  icone: "pao",
 
  modo: "hibrido",
  abertura: 6,
  fechamento: 20,
  clientesPorDia: 70,
  faltaMeta: 100, // chip: 40 pães + 4 bolos por R$ 185
  itens: [
    // Insumos (matéria-prima)
    { id: "farinha", nome: "Farinha de Trigo", categoria: "insumo", unidade: "kg", quantidade: 22, custoUnitario: 4.6, apelidos: ["farinha"] },
    { id: "leite", nome: "Leite Integral", categoria: "insumo", unidade: "L", quantidade: 16, custoUnitario: 5.2, apelidos: ["leite"] },
    { id: "ovos", nome: "Ovos", categoria: "insumo", unidade: "un", quantidade: 120, custoUnitario: 0.75, apelidos: ["ovo", "ovos", "dúzia de ovos"] },
    { id: "acucar", nome: "Açúcar Refinado", categoria: "insumo", unidade: "kg", quantidade: 9, custoUnitario: 4.9, apelidos: ["açúcar", "acucar"] },
    { id: "manteiga", nome: "Manteiga", categoria: "insumo", unidade: "kg", quantidade: 0.7, custoUnitario: 42, apelidos: ["manteiga"] },
    { id: "fermento", nome: "Fermento Biológico", categoria: "insumo", unidade: "kg", quantidade: 1.5, custoUnitario: 28, apelidos: ["fermento"] },
    { id: "polvilho", nome: "Polvilho Azedo", categoria: "insumo", unidade: "kg", quantidade: 6, custoUnitario: 9.5, apelidos: ["polvilho"] },
    { id: "queijo", nome: "Queijo Meia Cura", categoria: "insumo", unidade: "kg", quantidade: 2.8, custoUnitario: 48, apelidos: ["queijo"] },
    { id: "chocolate", nome: "Chocolate em Pó", categoria: "insumo", unidade: "kg", quantidade: 2, custoUnitario: 32, apelidos: ["chocolate", "achocolatado"] },
    // Produção própria (ficha técnica)
    {
      id: "pao-frances", nome: "Pão Francês", categoria: "producao_propria", unidade: "un", quantidade: 0, custoUnitario: 0, precoVenda: 0.9,
      apelidos: ["pão", "pães", "pãozinho", "pãezinhos", "cacetinho", "pão de sal"],
      ficha: { rendimento: 20, ingredientes: [{ insumoId: "farinha", quantidade: 1 }, { insumoId: "leite", quantidade: 0.2 }, { insumoId: "fermento", quantidade: 0.02 }, { insumoId: "acucar", quantidade: 0.02 }] },
      vendaDiaria: 160, porCliente: [4, 12],
    },
    {
      id: "sonho", nome: "Sonho", categoria: "producao_propria", unidade: "un", quantidade: 0, custoUnitario: 0, precoVenda: 4.5,
      apelidos: ["sonho", "sonhos"],
      // Farinha e leite limitam o sonho: a compra deles aumenta pães E doces.
      ficha: { rendimento: 25, ingredientes: [{ insumoId: "farinha", quantidade: 1 }, { insumoId: "leite", quantidade: 0.5 }, { insumoId: "ovos", quantidade: 4 }, { insumoId: "acucar", quantidade: 0.3 }] },
      vendaDiaria: 30, porCliente: [1, 4],
    },
    {
      id: "pao-de-queijo", nome: "Pão de Queijo", categoria: "producao_propria", unidade: "un", quantidade: 0, custoUnitario: 0, precoVenda: 2.5,
      apelidos: ["pão de queijo", "pães de queijo"],
      ficha: { rendimento: 30, ingredientes: [{ insumoId: "polvilho", quantidade: 1 }, { insumoId: "queijo", quantidade: 0.5 }, { insumoId: "ovos", quantidade: 3 }, { insumoId: "leite", quantidade: 0.3 }] },
      vendaDiaria: 40, porCliente: [2, 6],
    },
    {
      id: "bolo-chocolate", nome: "Bolo de Chocolate", categoria: "producao_propria", unidade: "un", quantidade: 0, custoUnitario: 0, precoVenda: 38,
      apelidos: ["bolo", "bolos", "bolo de chocolate"],
      ficha: { rendimento: 1, ingredientes: [{ insumoId: "farinha", quantidade: 0.4 }, { insumoId: "leite", quantidade: 0.3 }, { insumoId: "ovos", quantidade: 4 }, { insumoId: "acucar", quantidade: 0.3 }, { insumoId: "chocolate", quantidade: 0.15 }, { insumoId: "manteiga", quantidade: 0.1 }] },
      vendaDiaria: 3, porCliente: [1, 1],
    },
    // Revenda
    { id: "refrigerante", nome: "Refrigerante 2L", categoria: "revenda", unidade: "un", quantidade: 24, custoUnitario: 7.2, precoVenda: 12, apelidos: ["refri", "refrigerante", "coca"], vendaDiaria: 5, porCliente: [1, 2] },
    { id: "suco", nome: "Suco de Caixinha 1L", categoria: "revenda", unidade: "un", quantidade: 18, custoUnitario: 4.5, precoVenda: 8, apelidos: ["suco"], vendaDiaria: 3, porCliente: [1, 2] },
    { id: "agua", nome: "Água Mineral 500ml", categoria: "revenda", unidade: "un", quantidade: 0, custoUnitario: 1.2, precoVenda: 3.5, apelidos: ["água", "agua", "aguinha"], vendaDiaria: 8, porCliente: [1, 2] },
  ],
  movimentos: [
    { diasAtras: 6, hora: 7.2, tipo: "compra", itens: [{ itemId: "farinha", quantidade: 25, valorUnitario: 4.6 }, { itemId: "leite", quantidade: 10, valorUnitario: 5.2 }] },
    { diasAtras: 5, hora: 10.5, tipo: "despesa", descricao: "Gás de cozinha (botijão P45)", categoriaDespesa: "Gás", valor: 420 },
    { diasAtras: 4, hora: 14.1, tipo: "compra", itens: [{ itemId: "ovos", quantidade: 120, valorUnitario: 0.75 }, { itemId: "acucar", quantidade: 5, valorUnitario: 4.9 }, { itemId: "manteiga", quantidade: 2, valorUnitario: 42 }] },
    { diasAtras: 3, hora: 16.4, tipo: "despesa", descricao: "Conta de luz", categoriaDespesa: "Energia", valor: 380 },
    { diasAtras: 2, hora: 9.3, tipo: "compra", itens: [{ itemId: "refrigerante", quantidade: 12, valorUnitario: 7.2 }, { itemId: "suco", quantidade: 12, valorUnitario: 4.5 }] },
    { diasAtras: 1, hora: 15.2, tipo: "despesa", descricao: "Sacos de papel e embalagens", categoriaDespesa: "Embalagens", valor: 65 },
    { diasAtras: 2, hora: 20.4, tipo: "perda", descricao: "Perda: 18× Pão Francês amanhecido descartado", valor: 5.6, itens: [{ itemId: "pao-frances", quantidade: 18, valorUnitario: 0.31 }] },
  ],
};

const PET_SHOP: NegocioSemente = {
  id: "petshop",
  nome: "Inu Pet Club",
  nicho: "petshop",
  ramo: "Pet Shop",
  icone: "pet",
  modo: "revenda",
  abertura: 9,
  fechamento: 19,
  clientesPorDia: 16,
  faltaMeta: 200, // chip: 2 sacos de ração Golden + 3 biscoitos Pedigree = R$ 414,50
  // "saco" e "unidade" ficam como un; "pacote" como pct (o interpretador já lê saco como pacote).
  itens: [
    { id: "golden-caes", nome: "Ração Golden Formula Cães Adultos Frango 15kg", nomeCurto: "ração Golden", categoria: "revenda", unidade: "un", quantidade: 12, custoUnitario: 118, precoVenda: 169.9, apelidos: ["racao","golden","caes","cachorro","15kg","frango"], vendaDiaria: 1.2, porCliente: [1,2] },
    { id: "premier-gatos", nome: "Ração Premier Gatos Castrados Salmão 7,5kg", nomeCurto: "ração Premier", categoria: "revenda", unidade: "un", quantidade: 4, custoUnitario: 139, precoVenda: 198, apelidos: ["racao","premier","gatos","castrados","salmao"], vendaDiaria: 0.8, porCliente: [1,1] },
    { id: "bravecto", nome: "Antipulgas Bravecto Cães 10 a 20kg", nomeCurto: "antipulgas Bravecto", categoria: "revenda", unidade: "un", quantidade: 6, custoUnitario: 152, precoVenda: 215, apelidos: ["antipulgas","anti-pulgas","bravecto","remedio","comprimido"], vendaDiaria: 0.5, porCliente: [1,1] },
    { id: "pedigree-biscrok", nome: "Biscoito Pedigree Biscrok Multi 1kg", nomeCurto: "biscoito Pedigree", categoria: "revenda", unidade: "pct", quantidade: 14, custoUnitario: 14.5, precoVenda: 24.9, apelidos: ["biscoito","petisco","pedigree","biscrok"], vendaDiaria: 2.5, porCliente: [1,3] },
    { id: "pipicat", nome: "Areia Higiênica Pipicat Classic 4kg", nomeCurto: "areia Pipicat", categoria: "revenda", unidade: "pct", quantidade: 5, custoUnitario: 10.2, precoVenda: 18.5, apelidos: ["areia","pipicat","gato","higienica"], vendaDiaria: 2.5, porCliente: [1,2] },
    { id: "super-secao", nome: "Tapete Higiênico Super Secão 30 un.", nomeCurto: "tapete Super Secão", categoria: "revenda", unidade: "pct", quantidade: 9, custoUnitario: 48, precoVenda: 74.9, apelidos: ["tapete","higienico","super secao","fralda"], vendaDiaria: 1.2, porCliente: [1,1] },
    { id: "whiskas-sache", nome: "Sachê Whiskas Carne ao Molho 85g", nomeCurto: "sachê Whiskas", categoria: "revenda", unidade: "un", quantidade: 0, custoUnitario: 1.95, precoVenda: 3.5, apelidos: ["sache","whiskas","gato","carne"], vendaDiaria: 6, porCliente: [1,4] },
  ],
  movimentos: [
    { diasAtras: 5, hora: 9.4, tipo: "compra", itens: [{ itemId: "golden-caes", quantidade: 10, valorUnitario: 118 }] },
    { diasAtras: 4, hora: 11.2, tipo: "despesa", descricao: "Conta de água", categoriaDespesa: "Água", valor: 95 },
    { diasAtras: 3, hora: 10.1, tipo: "compra", itens: [{ itemId: "pipicat", quantidade: 20, valorUnitario: 10.2 }, { itemId: "pedigree-biscrok", quantidade: 12, valorUnitario: 14.5 }] },
    { diasAtras: 1, hora: 17.5, tipo: "despesa", descricao: "Internet e telefone", categoriaDespesa: "Internet", valor: 110 },
    { diasAtras: 2, hora: 16.2, tipo: "perda", descricao: "Perda: 3× Sachê Whiskas vencido", valor: 5.85, itens: [{ itemId: "whiskas-sache", quantidade: 3, valorUnitario: 1.95 }] },
  ],
};

const LOJA_ROUPAS: NegocioSemente = {
  id: "roupas",
  nome: "DallaStore",
  nicho: "roupas",
  ramo: "Moda Feminina",
  icone: "roupa",
  modo: "revenda",
  abertura: 9,
  fechamento: 21,
  clientesPorDia: 5,
  faltaMeta: 150, // chip: 2 Conjunto Total Confort Preto = R$ 418,00
  itens: [
    { id: "total-confort-preto", nome: "Conjunto Total Confort - Preto", nomeCurto: "Conjunto Total Confort Preto", categoria: "revenda", unidade: "un", quantidade: 14, custoUnitario: 95, precoVenda: 209, apelidos: ["conjunto","total confort","preto","viscolycra"], vendaDiaria: 1, porCliente: [1,2] },
    { id: "mega-confort-marinho", nome: "Conjunto Mega Confort - Azul Marinho", nomeCurto: "Conjunto Mega Confort Azul Marinho", categoria: "revenda", unidade: "un", quantidade: 9, custoUnitario: 105, precoVenda: 229, apelidos: ["conjunto","mega confort","azul marinho","azul"], vendaDiaria: 0.8, porCliente: [1,2] },
    { id: "viver-menta", nome: "Conjunto Viver - Verde Menta", nomeCurto: "Conjunto Viver Verde Menta", categoria: "revenda", unidade: "un", quantidade: 2, custoUnitario: 105, precoVenda: 229, apelidos: ["conjunto","viver","verde menta","verde"], vendaDiaria: 0.7, porCliente: [1,1] },
    { id: "florence-salsa", nome: "Conjunto Florence - Verde Salsa", nomeCurto: "Conjunto Florence Verde Salsa", categoria: "revenda", unidade: "un", quantidade: 6, custoUnitario: 132, precoVenda: 289, apelidos: ["conjunto","florence","verde salsa"], vendaDiaria: 0.5, porCliente: [1,1] },
    { id: "dalla-gold-marinho", nome: "Conjunto Dalla Gold - Azul Marinho", nomeCurto: "Conjunto Dalla Gold Azul Marinho", categoria: "revenda", unidade: "un", quantidade: 5, custoUnitario: 138, precoVenda: 299, apelidos: ["conjunto","dalla gold","gold","azul marinho"], vendaDiaria: 0.4, porCliente: [1,1] },
    { id: "unique-bege", nome: "Conjunto Unique - Bege", nomeCurto: "Conjunto Unique Bege", categoria: "revenda", unidade: "un", quantidade: 7, custoUnitario: 132, precoVenda: 289, apelidos: ["conjunto","unique","bege","alfaiataria"], vendaDiaria: 0.5, porCliente: [1,1] },
    { id: "vestido-flow", nome: "Vestido Flow - Estampado Azul", nomeCurto: "Vestido Flow Estampado Azul", categoria: "revenda", unidade: "un", quantidade: 8, custoUnitario: 118, precoVenda: 259, apelidos: ["vestido","flow","estampado","azul"], vendaDiaria: 0.6, porCliente: [1,1] },
    { id: "macaquinho-santil", nome: "Macaquinho Santil - Estampado Verde", nomeCurto: "Macaquinho Santil Estampado Verde", categoria: "revenda", unidade: "un", quantidade: 0, custoUnitario: 118, precoVenda: 259, apelidos: ["macaquinho","santil","estampado","verde"], vendaDiaria: 0.6, porCliente: [1,1] },
  ],
  movimentos: [
    { diasAtras: 6, hora: 10.2, tipo: "compra", itens: [{ itemId: "total-confort-preto", quantidade: 20, valorUnitario: 95 }, { itemId: "mega-confort-marinho", quantidade: 10, valorUnitario: 105 }] },
    { diasAtras: 4, hora: 15.3, tipo: "compra", itens: [{ itemId: "viver-menta", quantidade: 8, valorUnitario: 105 }, { itemId: "vestido-flow", quantidade: 10, valorUnitario: 118 }] },
    { diasAtras: 3, hora: 12.1, tipo: "despesa", descricao: "Anúncio no Instagram", categoriaDespesa: "Marketing", valor: 150 },
    { diasAtras: 1, hora: 18.2, tipo: "despesa", descricao: "Conta de luz", categoriaDespesa: "Energia", valor: 210 },
    { diasAtras: 3, hora: 17.1, tipo: "perda", descricao: "Perda: 1× Vestido Flow com defeito de costura", valor: 118, itens: [{ itemId: "vestido-flow", quantidade: 1, valorUnitario: 118 }] },
  ],
};

const MINIMERCADO: NegocioSemente = {
  id: "mercado",
  nome: "Minimercado Bom Preço",
  nicho: "mercado",
  ramo: "Minimercado",
  icone: "mercado",
 
  modo: "revenda",
  abertura: 7,
  fechamento: 21,
  clientesPorDia: 48,
  faltaMeta: 40, // chip: 12 latinhas + 2 arroz por R$ 119,70
  itens: [
    { id: "arroz", nome: "Arroz Tipo 1 5kg", categoria: "revenda", unidade: "un", quantidade: 26, custoUnitario: 22, precoVenda: 29.9, apelidos: ["arroz"], vendaDiaria: 4, porCliente: [1, 2] },
    { id: "feijao", nome: "Feijão Carioca 1kg", categoria: "revenda", unidade: "un", quantidade: 8, custoUnitario: 6.5, precoVenda: 9.49, apelidos: ["feijão", "feijao"], vendaDiaria: 5, porCliente: [1, 2] },
    { id: "oleo", nome: "Óleo de Soja 900ml", categoria: "revenda", unidade: "un", quantidade: 30, custoUnitario: 6.2, precoVenda: 8.99, apelidos: ["óleo", "oleo"], vendaDiaria: 4, porCliente: [1, 2] },
    { id: "leite-caixa", nome: "Leite Integral 1L", categoria: "revenda", unidade: "un", quantidade: 60, custoUnitario: 4.3, precoVenda: 6.29, apelidos: ["leite", "caixa de leite"], vendaDiaria: 14, porCliente: [1, 4] },
    { id: "refrigerante", nome: "Refrigerante 2L", categoria: "revenda", unidade: "un", quantidade: 22, custoUnitario: 7, precoVenda: 10.99, apelidos: ["refri", "refrigerante", "coca"], vendaDiaria: 8, porCliente: [1, 2] },
    { id: "cerveja", nome: "Cerveja Lata 350ml", categoria: "revenda", unidade: "un", quantidade: 96, custoUnitario: 3.1, precoVenda: 4.99, apelidos: ["cerveja", "latinha", "cervejas"], vendaDiaria: 24, porCliente: [2, 12] },
    { id: "pao-forma", nome: "Pão de Forma", categoria: "revenda", unidade: "un", quantidade: 0, custoUnitario: 6.8, precoVenda: 9.99, apelidos: ["pão de forma"], vendaDiaria: 4, porCliente: [1, 1] },
    { id: "cafe", nome: "Café em Pó 500g", categoria: "revenda", unidade: "un", quantidade: 14, custoUnitario: 16, precoVenda: 22.9, apelidos: ["café", "cafe"], vendaDiaria: 2.5, porCliente: [1, 2] },
    { id: "papel", nome: "Papel Higiênico 12 rolos", categoria: "revenda", unidade: "un", quantidade: 10, custoUnitario: 14, precoVenda: 21.9, apelidos: ["papel higiênico", "papel"], vendaDiaria: 1.5, porCliente: [1, 1] },
    { id: "detergente", nome: "Detergente 500ml", categoria: "revenda", unidade: "un", quantidade: 40, custoUnitario: 1.9, precoVenda: 2.99, apelidos: ["detergente"], vendaDiaria: 5, porCliente: [1, 3] },
  ],
  movimentos: [
    { diasAtras: 6, hora: 8.1, tipo: "compra", itens: [{ itemId: "cerveja", quantidade: 96, valorUnitario: 3.1 }, { itemId: "refrigerante", quantidade: 24, valorUnitario: 7 }] },
    { diasAtras: 5, hora: 9.2, tipo: "compra", itens: [{ itemId: "arroz", quantidade: 20, valorUnitario: 22 }, { itemId: "feijao", quantidade: 30, valorUnitario: 6.5 }] },
    { diasAtras: 3, hora: 13.4, tipo: "despesa", descricao: "Manutenção da geladeira", categoriaDespesa: "Manutenção", valor: 180 },
    { diasAtras: 2, hora: 8.3, tipo: "compra", itens: [{ itemId: "leite-caixa", quantidade: 48, valorUnitario: 4.3 }] },
    { diasAtras: 1, hora: 19.1, tipo: "despesa", descricao: "Conta de luz", categoriaDespesa: "Energia", valor: 460 },
    { diasAtras: 2, hora: 20.2, tipo: "perda", descricao: "Perda: 4× Leite Integral vencido", valor: 17.2, itens: [{ itemId: "leite-caixa", quantidade: 4, valorUnitario: 4.3 }] },
  ],
};

export const SEMENTES: NegocioSemente[] = [PADARIA, PET_SHOP, LOJA_ROUPAS, MINIMERCADO];

/** PRNG determinístico (mulberry32) para o histórico ser igual a cada reinício. */
function criarAleatorio(semente: string) {
  let h = 1779033703;
  for (let i = 0; i < semente.length; i++) h = Math.imul(h ^ semente.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    proximo,
    entre: (min: number, max: number) => min + proximo() * (max - min),
    inteiro: (min: number, max: number) => Math.floor(min + proximo() * (max - min + 1)),
  };
}

function limparItem(semente: ItemSemente): ItemEstoque {
  const item: ItemSemente = { ...semente, consumoDiarioEstimado: semente.vendaDiaria };
  delete item.vendaDiaria;
  delete item.porCliente;
  return item;
}

function gerarNegocio(semente: NegocioSemente, agora: number): Negocio {
  const itens = semente.itens.map(limparItem);
  const mapa = indexarItens(itens);
  const transacoes: Transacao[] = [];
  const hoje = inicioDoDia(agora);

  for (let diasAtras = JANELA_DIAS - 1; diasAtras >= 0; diasAtras--) {
    const dataDia = new Date(hoje);
    dataDia.setDate(dataDia.getDate() - diasAtras);
    const inicio = dataDia.getTime();
    const rnd = criarAleatorio(`${semente.id}:${chaveDia(inicio)}`);
    const fator = FATOR_DIA[dataDia.getDay()];

    // Clientes do dia, cada um num horário dentro do expediente.
    const nClientes = Math.max(1, Math.round(semente.clientesPorDia * fator * rnd.entre(0.9, 1.1)));
    const clientes: { ts: number; linhas: Map<string, number> }[] = [];
    for (let c = 0; c < nClientes; c++) {
      const horaCliente = rnd.entre(semente.abertura, semente.fechamento);
      clientes.push({ ts: inicio + Math.round(horaCliente * 3_600_000), linhas: new Map() });
    }

    // Distribui o volume vendido de cada item entre os clientes.
    for (const s of semente.itens) {
      if (!s.vendaDiaria) continue;
      const alvo = s.vendaDiaria * fator * rnd.entre(0.85, 1.15);
      let restante = Math.floor(alvo) + (rnd.proximo() < alvo % 1 ? 1 : 0);
      const [min, max] = s.porCliente ?? [1, 1];
      while (restante > 0) {
        const qtd = Math.min(restante, rnd.inteiro(min, max));
        const cliente = clientes[rnd.inteiro(0, clientes.length - 1)];
        cliente.linhas.set(s.id, (cliente.linhas.get(s.id) ?? 0) + qtd);
        restante -= qtd;
      }
    }

    clientes.forEach((cliente, idx) => {
      if (cliente.linhas.size === 0 || cliente.ts > agora) return;
      const linhas: LinhaTransacao[] = [...cliente.linhas].map(([itemId, quantidade]) => {
        const item = mapa.get(itemId)!;
        return { itemId, nome: item.nome, quantidade, unidade: item.unidade, valorUnitario: item.precoVenda };
      });
      const valor = linhas.reduce((s, l) => s + l.quantidade * (l.valorUnitario ?? 0), 0);
      const custo = linhas.reduce((s, l) => s + l.quantidade * custoUnitario(mapa.get(l.itemId!)!, mapa), 0);
      transacoes.push({
        id: `${semente.id}-${chaveDia(inicio)}-v${idx}`,
        tipo: "venda",
        timestamp: cliente.ts,
        descricao: `Venda: ${descreverLinhas(linhas)}`,
        valor: arredondar(valor, 2),
        custoEstimado: arredondar(custo, 2),
        itens: linhas,
        origem: "seed",
      });
    });
  }

  semente.movimentos.forEach((m, idx) => {
    const data = new Date(hoje);
    data.setDate(data.getDate() - m.diasAtras);
    const timestamp = data.getTime() + Math.round(m.hora * 3_600_000);
    if (timestamp > agora) return;
    const linhas: LinhaTransacao[] = (m.itens ?? []).map((l) => {
      const item = mapa.get(l.itemId)!;
      return { itemId: l.itemId, nome: item.nome, quantidade: l.quantidade, unidade: item.unidade, valorUnitario: l.valorUnitario };
    });
    const valor = m.valor ?? linhas.reduce((s, l) => s + l.quantidade * (l.valorUnitario ?? 0), 0);
    transacoes.push({
      id: `${semente.id}-m${idx}`,
      tipo: m.tipo,
      timestamp,
      descricao: m.descricao ?? `Compra: ${descreverLinhas(linhas)}`,
      valor: arredondar(valor, 2),
      itens: linhas,
      categoriaDespesa: m.categoriaDespesa,
      origem: "seed",
    });
  });

  transacoes.sort((a, b) => a.timestamp - b.timestamp);

  // Meta semanal (sobre o saldo líquido) em múltiplo de R$ 50, deixando o histórico a poucos reais dela.
  const { liquido } = saldoDaSemana(transacoes, agora);
  const metaSemanal = Math.ceil((liquido + semente.faltaMeta) / 50) * 50;

  // Média dos dias completos, para estimar o começo do mês.
  const diasCompletos = transacoes.filter((t) => t.timestamp < hoje);
  const faturamentoCompleto = diasCompletos.filter((t) => t.tipo === "venda").reduce((s, t) => s + t.valor, 0);
  const lucroCompleto = diasCompletos.reduce((s, t) => s + lucroDaTransacao(t), 0);
  const nDias = JANELA_DIAS - 1;

  return {
    id: semente.id,
    nome: semente.nome,
    nicho: semente.nicho,
    ramo: semente.ramo,
    icone: semente.icone,
    modo: semente.modo,
    metaSemanal,
    itens,
    transacoes,
    mediaDiariaAnterior: { faturamento: arredondar(faturamentoCompleto / nDias, 2), lucro: arredondar(lucroCompleto / nDias, 2) },
    preConfigurado: true,
  };
}

export function gerarNegociosDemo(agora: number): Negocio[] {
  return SEMENTES.map((s) => gerarNegocio(s, agora));
}

export function gerarNegocioDemo(id: string, agora: number): Negocio | undefined {
  const semente = SEMENTES.find((s) => s.id === id);
  return semente ? gerarNegocio(semente, agora) : undefined;
}

export function criarEstadoInicial(agora: number): EstadoApp {
  const negocios = gerarNegociosDemo(agora);
  return {
    versao: 1,
    negocioAtivoId: negocios[0].id,
    ordem: negocios.map((n) => n.id),
    negocios: Object.fromEntries(negocios.map((n) => [n.id, n])),
    diaBase: chaveDia(agora),
    versaoDados: VERSAO_DADOS,
  };
}

// ---------- Negócio criado pelo usuário ----------

export interface NovoNegocioInput {
  nome: string;
  ramo: string;
  metaSemanal: number;
  modo: ModoOperacao;
  icone?: NomeIcone;
}

export function criarNegocioPersonalizado(input: NovoNegocioInput, id: string): Negocio {
  return {
    id,
    nome: input.nome.trim(),
    nicho: "personalizado",
    ramo: input.ramo.trim() || "Meu negócio",
    icone: input.icone ?? iconeDoRamo(`${input.ramo} ${input.nome}`),
    modo: input.modo,
    metaSemanal: Math.max(0, Math.round(input.metaSemanal)),
    itens: [],
    transacoes: [],
    preConfigurado: false,
  };
}
