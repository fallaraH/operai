// Léxico pt-BR do pequeno comerciante: verbos de cada movimentação, gírias,
// marcas, unidades/embalagens, categorias de despesa e pistas de matéria-prima.
// Chaves sempre minúsculas e sem acento.

import type { Unidade } from "../dominio/tipos";
import { chaveTokens, normalizar, radical } from "./texto";

/**
 * Tipo bruto antes de desambiguar "paguei"/"recebi". `sinistro` (roubo, furto,
 * multa, golpe, prejuízo, quebra de equipamento) tem prioridade sobre todos.
 */
export type TipoBruto = "venda" | "compra" | "perda" | "despesa" | "pagamento" | "recebimento" | "sinistro";

interface Gatilho {
  frase: string[];
  tipo: TipoBruto;
  /** Verbo de ação clara: um segundo verbo forte indica outra movimentação na frase. */
  forte: boolean;
}

function gatilhos(tipo: TipoBruto, forte: boolean, frases: string[]): Gatilho[] {
  return frases.map((f) => ({ frase: normalizar(f).split(" "), tipo, forte }));
}

/** Ordenados do mais longo para o mais curto (frases antes de palavras soltas). */
export const GATILHOS: Gatilho[] = [
  // Sinistros: dinheiro ou mercadoria que sai sem venda. Nunca viram venda/compra.
  ...gatilhos("sinistro", true, [
    "roubaram", "roubou", "roubo", "roubado", "roubada", "roubados", "me roubaram", "fui roubado", "fui roubada",
    "assalto", "assaltaram", "assaltado", "assaltada", "fui assaltado", "fui assaltada",
    "furtaram", "furtou", "furto", "furtado", "furtada", "furtados",
    "levaram do caixa", "sumiu do caixa", "sumiu dinheiro", "sumiu o dinheiro",
    "multa", "multado", "multada", "multaram", "tomei uma multa", "levei uma multa",
    "quebrou a maquina", "quebrou a maquininha", "quebrou o freezer", "quebrou a geladeira", "quebrou o forno",
    "quebrou a balanca", "quebrou o computador", "quebrou a vitrine", "conserto",
    "prejuizo", "prejuizos", "tive prejuizo", "golpe", "cai num golpe", "cai no golpe", "estelionato",
    "nota falsa", "dinheiro falso", "calote", "deu calote", "sem pagar", "nao pagou", "pix errado",
  ]),
  ...gatilhos("perda", true, [
    "perdi", "perdemos", "perdeu", "perderam", "perdido", "perdidos", "perda", "perdas",
    "estragou", "estragaram", "estraguei", "estragado", "estragados", "estragada", "estragadas",
    "venceu", "venceram", "vencido", "vencidos", "vencida", "vencidas",
    "descartei", "descartamos", "descartou", "descartado", "descartados",
    "quebrou", "quebraram", "quebrei", "quebrado", "quebrados", "quebrada", "quebradas",
    "caiu", "caíram", "derrubei", "derrubou", "derrubaram",
    "queimou", "queimaram", "queimei", "queimado", "queimados", "queimada", "queimadas",
    "mofou", "mofaram", "mofado", "mofados", "mofada", "azedou", "azedaram",
    "sumiu", "sumiram", "avaria", "avariado", "avariados", "rasgou", "rasgado", "rasgados", "derreteu", "derreteram",
    "joguei fora", "jogamos fora", "jogou fora", "jogaram fora", "jogar fora",
    "foi pro lixo", "foram pro lixo", "foi para o lixo", "deu ruim",
    "passou da validade", "passaram da validade", "fora da validade",
  ]),
  ...gatilhos("compra", true, [
    "comprei", "compramos", "comprado", "comprados", "comprada", "compradas",
    "repus", "repusemos", "reabasteci", "reabastecemos", "abasteci", "abastecemos", "estoquei",
    "encomendei", "encomendamos", "adquiri", "adquirimos", "peguei", "pegamos",
    "chegou", "chegaram", "fiz uma compra", "fiz 1 compra", "fiz compra", "deu entrada", "dei entrada", "entrada de",
  ]),
  ...gatilhos("compra", false, ["compra", "compras", "reposição", "reposicao"]),
  ...gatilhos("venda", true, [
    "vendi", "vendemos", "vendeu", "venderam", "vendido", "vendidos", "vendida", "vendidas",
    "faturei", "faturamos", "faturou", "fiz uma venda", "fiz 1 venda", "fiz venda",
    "comprou", "compraram", "levou", "levaram", "encomendou", "entreguei", "entregamos",
  ]),
  ...gatilhos("venda", false, ["venda", "vendas", "saiu", "saíram", "sairam", "vende"]),
  ...gatilhos("pagamento", false, ["paguei", "pagamos", "pagou", "pago", "gastei", "gastamos", "gastou", "investi"]),
  ...gatilhos("recebimento", false, ["recebi", "recebemos", "recebeu", "recebido"]),
  ...gatilhos("despesa", false, ["despesa", "despesas", "conta de", "conta", "aluguel", "boleto", "salário", "salario", "imposto", "frete"]),
].sort((a, b) => b.frase.length - a.frase.length);

/** Palavras de verbo/ação removidas antes de ler os itens. */
export const PALAVRAS_GATILHO = new Set(GATILHOS.filter((g) => g.frase.length === 1).map((g) => g.frase[0]));

// ---------- Unidades e embalagens ----------

export const UNIDADES: Record<string, Unidade> = {
  kg: "kg", kgs: "kg", quilo: "kg", quilos: "kg", kilo: "kg", kilos: "kg", quilograma: "kg", quilogramas: "kg",
  g: "g", gr: "g", grs: "g", grama: "g", gramas: "g",
  l: "L", lt: "L", lts: "L", litro: "L", litros: "L",
  ml: "ml", mililitro: "ml", mililitros: "ml",
  m: "m", mt: "m", mts: "m", metro: "m", metros: "m",
  un: "un", und: "un", unid: "un", unidade: "un", unidades: "un", peca: "un", pecas: "un",
  dz: "dz", duzia: "dz", duzias: "dz",
  par: "par", pares: "par",
  rolo: "rolo", rolos: "rolo",
};

/** Embalagem sem tamanho conhecido conta como 1 unidade do item. */
export const EMBALAGENS: Record<string, Unidade> = {
  pacote: "pct", pacotes: "pct", pct: "pct", pcts: "pct", pacotinho: "pct", pacotinhos: "pct",
  saco: "pct", sacos: "pct", saquinho: "pct", saquinhos: "pct", saca: "pct", sacas: "pct",
  caixa: "cx", caixas: "cx", cx: "cx", cxs: "cx", caixinha: "cx", caixinhas: "cx",
  fardo: "cx", fardos: "cx", engradado: "cx", engradados: "cx",
  lata: "un", latas: "un", garrafa: "un", garrafas: "un", pote: "un", potes: "un",
  bandeja: "un", bandejas: "un", vidro: "un", vidros: "un", frasco: "un", frascos: "un",
  galao: "un", galoes: "un", balde: "un", baldes: "un", barra: "un", barras: "un",
  tablete: "un", tabletes: "un", cartela: "un", cartelas: "un", bisnaga: "un", bisnagas: "un",
};

/** Unidades que podem vir depois do preço: "4,20 o quilo", "5 reais cada". */
export const UNIDADES_PRECO = new Set([...Object.keys(UNIDADES), ...Object.keys(EMBALAGENS)]);

// ---------- Dinheiro ----------

export const PALAVRAS_MOEDA = new Set(["reais", "real", "conto", "contos", "pila", "pilas"]);
export const PALAVRAS_CENTAVO = new Set(["centavos", "centavo"]);
/** Antes do número, indicam dinheiro e saem do texto (comparar sem acento). */
export const PREPOSICOES_VALOR = new Set(["por", "a", "total", "totalizando", "valor", "preco"]);
/** Verbos que costumam vir antes de um valor ("paguei 320", "deu 65"). Ficam no texto. */
export const VERBOS_VALOR = new Set([
  "custou", "custaram", "custa", "custam", "paguei", "pagamos", "pagou", "pago", "recebi", "recebemos", "recebeu",
  "cobrei", "cobramos", "cobrou", "deu", "ficou", "ficaram", "foi", "foram", "faturei", "faturamos", "faturou",
  "gastei", "gastamos", "gastou", "investi", "saiu", "sai",
  "levaram", "levou", "roubaram", "furtaram", "perdi", "perdemos",
]);
/** "uma venda de 65", "conta de 380", "multa de 195": nesses casos "de" também introduz valor. */
export const ANTES_DE_VALOR = new Set([
  "venda", "compra", "despesa", "valor", "conta", "total", "gasto", "boleto", "nota", "pedido", "encomenda",
  "multa", "golpe", "prejuizo", "falsa", "falso", "calote", "conserto",
]);
/** Palavras que podem seguir um valor sem que o número seja quantidade (sem acento). */
export const CONTINUA_VALOR = new Set([
  "cada", "no", "na", "nos", "nas", "em", "pelo", "pela", "pra", "pro", "para", "e", "hoje", "ontem", "agora",
  "total", "tudo", "ao", "com", "que", "o", "a", "os", "as", "fiado", "reais", "real",
]);

// ---------- Pessoas (cliente / fornecedor) ----------

export const TITULOS_PESSOA = new Set([
  "dona", "seu", "sr", "sra", "senhor", "senhora", "tia", "tio", "dr", "dra", "doutor", "doutora",
  "vizinho", "vizinha", "cliente", "professor", "professora", "moco", "moca", "menino", "menina",
]);
export const LUGARES_FORNECEDOR = new Set([
  "fornecedor", "fornecedora", "distribuidora", "distribuidor", "atacadao", "atacado", "atacadista", "mercado",
  "supermercado", "feira", "ceasa", "moinho", "granja", "frigorifico", "acougue", "sacolao", "loja", "fabrica",
  "representante", "deposito", "armazem", "cooperativa", "fazenda", "sitio", "chacara", "laticinio", "industria",
  "importadora", "assai", "makro", "carrefour", "tenda", "roldao", "spani", "sams", "fort", "padaria", "confeitaria",
]);
/** Depois de "para/pra", não são nomes de cliente. */
export const NAO_PESSOA = new Set([
  "festa", "entrega", "viagem", "casa", "ele", "ela", "eles", "elas", "mim", "voce", "vc", "levar", "consumo",
  "hoje", "amanha", "semana", "encomenda", "evento", "aniversario", "casamento", "escola", "viagem", "fora",
  "comer", "vender", "revender", "fazer", "loja", "estoque", "mesa", "balcao", "delivery", "ifood",
]);

// ---------- Ruído (sai antes de ler os itens) ----------

export const RUIDO: string[][] = [
  "acabei de", "acabou de", "agora pouco", "agorinha", "por favor", "a gente", "de manha", "de manhã", "de tarde",
  "de noite", "à tarde", "a tarde", "à noite", "a noite", "à vista", "a vista", "no pix", "via pix", "pelo pix",
  "no cartao", "no cartão", "no debito", "no débito", "no credito", "no crédito", "em dinheiro", "no dinheiro",
  "em especie", "em espécie", "no fiado", "fiado", "no total", "ao todo", "mais ou menos", "cerca de",
  "aproximadamente", "uma venda", "1 venda", "uma compra", "1 compra", "uma perda", "1 perda", "no chao", "no chão",
  "hoje cedo", "lá no", "aqui no", "bom dia", "boa tarde", "boa noite", "tudo bem", "obrigado", "obrigada", "valeu",
  "o cliente", "a cliente", "1 cliente", "cliente", "tomei", "levei", "sofri", "tive", "fui", "pela", "pelo",
  "eu", "nos", "nós", "hoje", "ontem", "agora", "aqui", "ai", "aí", "la", "lá", "ne", "né", "tipo", "entao", "então",
  "olha", "registra", "registrar", "anota", "anotar", "lanca", "lança", "lancar", "lançar", "coloca", "colocar",
  "bota", "botar", "pf", "pfv", "ok", "beleza", "show", "opa", "oi", "ola", "olá", "mano", "cara", "vei", "véi",
  "po", "pô", "uai", "so", "só", "tudo", "total", "fiz", "teve", "tive", "tivemos", "foi", "foram", "ficou", "deu",
  "que", "isso", "esse", "essa", "esses", "essas", "uns", "umas", "quase", "cedo", "tarde", "pix", "cartao", "cartão",
  "dinheiro", "pago", "pagos", "pagamento", "valor", "preco", "preço", "reais", "real",
].map((f) => normalizar(f).split(" ")).sort((a, b) => b.length - a.length);

/** Em perdas, o que vem depois é o motivo ("que caíram no chão"). */
export const INICIO_MOTIVO = new Set(["que", "porque", "pois", "devido", "motivo"]);

// ---------- Nomes: gírias e marcas ----------

interface Canonico {
  nome: string;
  marca?: string;
}

const GIRIAS_BRUTAS: [string[], string][] = [
  [["refri", "refris", "refrigerante"], "Refrigerante"],
  [["guarana"], "Refrigerante de Guaraná"],
  [["breja", "cerva", "ceva", "gelada", "loira", "loirinha", "cerveja"], "Cerveja"],
  [["latinha"], "Cerveja Lata"],
  [["latao"], "Cerveja Latão"],
  [["pinga", "cana", "branquinha", "caninha", "cachaca"], "Cachaça"],
  [["paozinho", "pao de sal", "cacetinho", "carioquinha", "pao frances", "frances", "pao careca"], "Pão Francês"],
  [["pao de queijo"], "Pão de Queijo"],
  [["x burguer", "xburguer", "x burger", "xburger", "xis", "xis burguer"], "X-Burguer"],
  [["x salada", "xsalada"], "X-Salada"],
  [["x bacon", "xbacon"], "X-Bacon"],
  [["x tudo", "xtudo"], "X-Tudo"],
  [["x egg", "xegg"], "X-Egg"],
  [["dog", "dogao", "cachorro quente", "hot dog", "hotdog"], "Cachorro-Quente"],
  [["mussarela", "mucarela", "muzzarela", "mozarela", "mussarella", "mozzarella", "queijo mussarela", "queijo mucarela"], "Queijo Muçarela"],
  [["quentinha", "marmitex", "marmita"], "Marmita"],
  [["pf", "prato feito"], "Prato Feito"],
  [["esfirra", "esfiha"], "Esfiha"],
  [["bolacha", "biscoito"], "Biscoito"],
  [["cafezinho", "cafe expresso", "expresso"], "Café"],
  [["aguinha", "agua mineral", "agua"], "Água Mineral"],
  [["salgadinho", "salgado"], "Salgado"],
  [["kibe", "quibe"], "Quibe"],
  [["sacole", "geladinho", "chup chup", "dindin", "flau"], "Geladinho"],
  [["ovo", "ovos"], "Ovos"],
  [["trigo"], "Farinha de Trigo"],
  [["refeicao"], "Refeição"],
];

/** Troca de palavra isolada em nomes novos ("queijo mussarela" → "queijo muçarela"). */
export const PALAVRA_GIRIA: Record<string, string> = {
  refri: "refrigerante", mussarela: "muçarela", mucarela: "muçarela", mozarela: "muçarela", muzzarela: "muçarela",
  breja: "cerveja", cerva: "cerveja", bolacha: "biscoito", esfirra: "esfiha", kibe: "quibe",
};

const MARCAS_BRUTAS: [string[], string, string?][] = [
  [["coca", "coca cola", "coquinha"], "Coca-Cola", "Refrigerante"],
  [["pepsi"], "Pepsi", "Refrigerante"],
  [["fanta"], "Fanta", "Refrigerante"],
  [["sprite"], "Sprite", "Refrigerante"],
  [["guarana antarctica"], "Antarctica", "Refrigerante de Guaraná"],
  [["brahma"], "Brahma", "Cerveja"],
  [["skol"], "Skol", "Cerveja"],
  [["heineken"], "Heineken", "Cerveja"],
  [["itaipava"], "Itaipava", "Cerveja"],
  [["budweiser"], "Budweiser", "Cerveja"],
  [["amstel"], "Amstel", "Cerveja"],
  [["stella artois", "stella"], "Stella Artois", "Cerveja"],
  [["corona"], "Corona", "Cerveja"],
  [["pilao"], "Pilão", "Café"],
  [["tres coracoes", "3 coracoes"], "3 Corações", "Café"],
  [["melitta"], "Melitta", "Café"],
  [["nescau"], "Nescau", "Achocolatado"],
  [["toddy"], "Toddy", "Achocolatado"],
  [["ninho"], "Ninho", "Leite em Pó"],
  [["nestle"], "Nestlé"],
  [["italac"], "Italac", "Leite"],
  [["piracanjuba"], "Piracanjuba", "Leite"],
  [["parmalat"], "Parmalat", "Leite"],
  [["dona benta"], "Dona Benta", "Farinha de Trigo"],
  [["camil"], "Camil"],
  [["tio joao"], "Tio João", "Arroz"],
  [["kicaldo"], "Kicaldo", "Feijão"],
  [["soya"], "Soya", "Óleo de Soja"],
  [["liza"], "Liza", "Óleo"],
  [["qualy"], "Qualy", "Margarina"],
  [["doriana"], "Doriana", "Margarina"],
  [["sadia"], "Sadia"],
  [["perdigao"], "Perdigão"],
  [["seara"], "Seara"],
  [["omo"], "Omo", "Sabão em Pó"],
  [["ype"], "Ypê"],
  [["bombril"], "Bombril", "Esponja de Aço"],
  [["pedigree"], "Pedigree", "Ração para Cães"],
  [["whiskas"], "Whiskas", "Ração para Gatos"],
  [["golden"], "Golden", "Ração"],
  [["premier"], "Premier", "Ração"],
  [["royal canin"], "Royal Canin", "Ração"],
  [["friskies"], "Friskies", "Ração para Gatos"],
  [["purina"], "Purina", "Ração"],
  [["hering"], "Hering"],
  [["havaianas", "havaiana"], "Havaianas", "Chinelo"],
  [["nike"], "Nike"],
  [["adidas"], "Adidas"],
  [["olympikus"], "Olympikus"],
  [["fleischmann"], "Fleischmann", "Fermento Biológico"],
  [["uniao"], "União", "Açúcar"],
  [["tirolez"], "Tirolez"],
  [["polenghi"], "Polenghi"],
  [["vigor"], "Vigor"],
  [["danone"], "Danone", "Iogurte"],
  [["elma chips"], "Elma Chips", "Salgadinho"],
  [["bauducco"], "Bauducco"],
  [["lacta"], "Lacta", "Chocolate"],
  [["kibon"], "Kibon", "Sorvete"],
  [["red bull"], "Red Bull", "Energético"],
  [["monster"], "Monster", "Energético"],
  [["del valle"], "Del Valle", "Suco"],
  [["colgate"], "Colgate", "Creme Dental"],
  [["miojo"], "Nissin", "Macarrão Instantâneo"],
  [["castrol"], "Castrol", "Óleo de Motor"],
  [["pirelli"], "Pirelli", "Pneu"],
];

/** Gíria → nome canônico, indexado pelos radicais da frase. */
export const GIRIAS = new Map<string, Canonico>(
  GIRIAS_BRUTAS.flatMap(([variantes, nome]) => variantes.map((v) => [chaveTokens(v).join(" "), { nome }] as const)),
);

/** "x salada", "x burguer": o "x" é parte do nome, não "vezes". */
export function ehLancheX(palavra: string | undefined): boolean {
  return !!palavra && GIRIAS.has(chaveTokens(`x ${palavra}`).join(" "));
}

export interface Marca {
  frase: string[];
  marca: string;
  produto?: string;
}

/** Marcas (frases normalizadas), mais longas primeiro. */
export const MARCAS: Marca[] = MARCAS_BRUTAS.flatMap(([variantes, marca, produto]) =>
  variantes.map((v) => ({ frase: normalizar(v).split(" "), marca, produto })),
).sort((a, b) => b.frase.length - a.frase.length);

// ---------- Classificação de itens novos ----------

const PISTAS_INSUMO = [
  "farinha", "trigo", "fuba", "polvilho", "amido", "maizena", "acucar", "sal", "fermento", "leite", "manteiga",
  "margarina", "oleo", "azeite", "ovo", "queijo", "mucarela", "mussarela", "presunto", "requeijao", "creme", "nata",
  "chocolate", "cacau", "achocolatado", "coco", "granulado", "confeito", "condensado", "morango", "banana", "fruta",
  "polpa", "carne", "frango", "peito", "coxa", "file", "linguica", "calabresa", "bacon", "salsicha", "hamburguer",
  "alface", "tomate", "cebola", "alho", "batata", "cenoura", "pimentao", "milho", "ervilha", "azeitona", "oregano",
  "tempero", "molho", "ketchup", "mostarda", "maionese", "arroz", "feijao", "macarrao", "massa", "tecido", "linha",
  "botao", "ziper", "elastico", "renda", "tinta", "verniz", "cola", "resina", "madeira", "mdf", "parafuso", "prego",
  "essencia", "pavio", "cera", "parafina", "gelo", "acai",
].map(radical);

/** O nome sugere matéria-prima (em negócios que produzem). */
export function ehInsumoProvavel(nome: string): boolean {
  const tokens = chaveTokens(nome);
  return tokens.some((t) => PISTAS_INSUMO.includes(t));
}

// ---------- Despesas ----------

export interface CategoriaDespesa {
  categoria: string;
  rotulo: string;
  chaves: string[][];
}

function categoria(categoria: string, rotulo: string, chaves: string[]): CategoriaDespesa {
  return { categoria, rotulo, chaves: chaves.map((c) => normalizar(c).split(" ")) };
}

/** Sinistros primeiro: "multa da prefeitura" é multa, não taxa. */
export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  categoria("Sinistros", "Roubo ou furto", [
    "roubaram", "roubou", "roubo", "roubado", "roubada", "assalto", "assaltaram", "assaltado", "assaltada",
    "furtaram", "furtou", "furto", "furtado", "furtada", "levaram do caixa", "sumiu do caixa", "sumiu dinheiro",
  ]),
  categoria("Multas", "Multa", ["multa", "multado", "multada", "multaram"]),
  categoria("Prejuízos", "Prejuízo", [
    "prejuizo", "prejuizos", "golpe", "estelionato", "nota falsa", "dinheiro falso", "calote", "sem pagar",
    "nao pagou", "pix errado", "perdi", "perdemos", "perda", "troco",
  ]),
  categoria("Energia", "Conta de luz", ["luz", "energia", "eletricidade", "enel", "cemig", "copel", "celesc", "coelba", "cpfl", "light"]),
  categoria("Água", "Conta de água", ["conta de agua", "agua e esgoto", "sabesp", "copasa", "cedae", "embasa", "sanepar"]),
  categoria("Gás", "Gás de cozinha", ["gas", "botijao", "p13", "p45", "gas de cozinha"]),
  categoria("Aluguel", "Aluguel", ["aluguel", "condominio"]),
  categoria("Internet", "Internet e telefone", ["internet", "wifi", "telefone", "celular", "recarga"]),
  categoria("Pessoal", "Pagamento de funcionário", ["salario", "funcionario", "funcionaria", "diaria", "diarista", "ajudante", "freelancer", "folha"]),
  categoria("Frete", "Frete e entregas", ["frete", "motoboy", "carreto", "transportadora", "correios", "entregador"]),
  categoria("Impostos", "Impostos e taxas", ["imposto", "impostos", "simples nacional", "iptu", "alvara", "taxa da prefeitura", "guia do mei"]),
  categoria("Contador", "Contador", ["contador", "contadora", "contabilidade"]),
  categoria("Manutenção", "Manutenção", [
    "manutencao", "conserto", "reparo", "tecnico", "eletricista", "encanador", "pedreiro",
    "quebrou a maquina", "quebrou a maquininha", "quebrou o freezer", "quebrou a geladeira", "quebrou o forno",
    "quebrou a balanca", "quebrou o computador", "quebrou a vitrine",
  ]),
  categoria("Embalagens", "Embalagens", ["embalagem", "embalagens", "sacola", "sacolas", "sacolinha", "sacolinhas", "saquinho de papel", "sacos de papel", "saco de papel", "guardanapo", "guardanapos", "descartavel", "descartaveis", "copo descartavel", "copos descartaveis", "papel toalha"]),
  categoria("Limpeza", "Material de limpeza", ["limpeza", "detergente", "desinfetante", "agua sanitaria", "esponja", "sabao"]),
  categoria("Transporte", "Combustível e transporte", ["gasolina", "combustivel", "etanol", "diesel", "uber", "estacionamento", "pedagio"]),
  categoria("Marketing", "Marketing", ["anuncio", "propaganda", "marketing", "instagram", "facebook", "panfleto", "panfletos", "impulsionamento"]),
  categoria("Taxas", "Taxas de cartão e apps", ["maquininha", "taxa do cartao", "tarifa", "taxa do banco", "taxa do ifood"]),
];

// ---------- Ignoráveis ao comparar nomes ----------

/** Variações que não mudam o produto ("pão amanhecido" ainda é Pão Francês). */
export const MODIFICADORES = new Set(
  [
    "amanhecido", "quente", "quentinho", "gelado", "grande", "pequeno", "medio", "media", "mini", "fresco",
    "fresquinho", "novo", "nova", "inteiro", "inteira", "fatiado", "fatiada", "cru", "crua", "assado", "assada",
    "frito", "frita", "natural", "tradicional", "simples", "comum", "sortido", "sortida", "artesanal", "caseiro",
    "caseira", "especial", "extra", "unidade", "tamanho", "preto", "preta", "branco", "branca", "azul", "vermelho",
    "vermelha", "verde", "amarelo", "amarela", "rosa", "cinza", "marrom", "bege", "colorido", "colorida",
    "estampado", "estampada", "liso", "lisa", "p", "m", "g", "gg", "pp", "xg", "estragado", "estragada", "vencido",
    "vencida", "mofado", "mofada", "queimado", "queimada", "quebrado", "quebrada", "amassado", "amassada", "velho",
    "velha", "dia", "ruim", "bom", "boa", "avulso", "avulsa", "solto", "solta", "embalado", "embalada", "aberto",
    "aberta", "cheio", "cheia", "kg", "un", "ml", "l",
  ].map(radical),
);
