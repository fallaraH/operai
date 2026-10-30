// Escolha de ícone (por nome) para itens e negócios. O desenho vetorial fica em
// components/ui/Icone.tsx; aqui só decidimos qual, sem React.

import { chaveTokens, radical } from "./interpretador/texto";
import type { Negocio } from "./dominio/tipos";

export type NomeIcone =
  | "pao" | "bolo" | "doce" | "salgado" | "pizza" | "lanche" | "carne" | "embutido" | "ovo" | "laticinio"
  | "cafe" | "bebida" | "cerveja" | "vinho" | "destilado" | "agua" | "grao" | "fruta" | "verdura" | "legume"
  | "peixe" | "biscoito" | "pipoca" | "sorvete" | "roupa" | "calcado" | "acessorio" | "costura" | "pet" | "racao"
  | "limpeza" | "remedio" | "flor" | "livro" | "eletronico" | "auto" | "ferramenta" | "tesoura" | "utensilios"
  | "mercado" | "loja" | "pacote";

const ITENS: [string[], NomeIcone][] = [
  [["pao", "baguete", "bisnaga", "croissant"], "pao"],
  [["bolo", "torta", "cupcake"], "bolo"],
  [["sonho", "rosquinha", "donut", "brigadeiro", "bombom", "chocolate", "bala", "doce", "pudim"], "doce"],
  [["coxinha", "frango", "coxa", "asa", "pastel", "esfiha", "salgado", "quibe", "empada"], "salgado"],
  [["pizza"], "pizza"],
  [["burguer", "burger", "hamburguer", "lanche", "sanduiche", "cachorro", "dog", "misto"], "lanche"],
  [["carne", "file", "bife", "picanha", "moida"], "carne"],
  [["bacon", "presunto", "linguica", "calabresa", "salsicha", "salame"], "embutido"],
  [["ovo"], "ovo"],
  [["leite", "iogurte", "queijo", "mucarela", "manteiga", "requeijao", "creme", "nata"], "laticinio"],
  [["cafe", "cha"], "cafe"],
  [["refrigerante", "refri", "suco", "energetico", "guarana"], "bebida"],
  [["cerveja", "chopp", "latinha"], "cerveja"],
  [["vinho"], "vinho"],
  [["cachaca", "whisky", "vodka", "gin"], "destilado"],
  [["agua"], "agua"],
  [["farinha", "trigo", "fuba", "polvilho", "arroz", "feijao", "macarrao", "massa", "fermento", "acucar", "sal", "grao"], "grao"],
  [["banana", "morango", "maca", "laranja", "limao", "uva", "fruta", "acai", "polpa"], "fruta"],
  [["alface", "verdura", "couve", "salada"], "verdura"],
  [["tomate", "batata", "cebola", "alho", "cenoura", "milho"], "legume"],
  [["peixe", "atum", "sardinha", "camarao"], "peixe"],
  [["biscoito", "bolacha", "cookie"], "biscoito"],
  [["pipoca", "salgadinho"], "pipoca"],
  [["sorvete", "picole", "geladinho"], "sorvete"],
  [["camiseta", "camisa", "blusa", "calca", "jeans", "vestido", "saia", "bermuda", "short", "meia", "roupa"], "roupa"],
  [["tenis", "sapato", "chinelo", "sandalia", "bota"], "calcado"],
  [["bone", "chapeu", "bolsa", "ecobag", "sacola", "scrunchie", "xuxinha", "bijuteria"], "acessorio"],
  [["tecido", "linha", "costura", "alca", "elastico", "botao", "ziper"], "costura"],
  [["racao", "petisco", "bifinho"], "racao"],
  [["areia", "coleira", "comedouro", "mordedor", "brinquedo", "pet", "antipulga"], "pet"],
  [["sabao", "detergente", "shampoo", "sabonete", "limpeza", "desinfetante", "papel"], "limpeza"],
  [["remedio", "comprimido", "vitamina", "dipirona", "protetor"], "remedio"],
  [["flor", "buque", "planta"], "flor"],
  [["caderno", "livro", "caneta", "lapis"], "livro"],
  [["celular", "fone", "carregador", "cabo"], "eletronico"],
  [["pneu", "oleo", "motor", "troca"], "auto"],
];

const RAMOS: [RegExp, NomeIcone][] = [
  [/padaria|panific/i, "pao"],
  [/pet|ra[cç][aã]o|veterin/i, "pet"],
  [/roupa|moda|boutique|brech[oó]/i, "roupa"],
  [/mercad|mercearia|emp[oó]rio|quitanda|hortifr/i, "mercado"],
  [/hamb[uú]rg|burger|lanch/i, "lanche"],
  [/pizz/i, "pizza"],
  [/oficina|mec[aâ]nic|auto|moto/i, "ferramenta"],
  [/confeit|doce|brigadeir|bolo/i, "bolo"],
  [/farm[aá]c|drogaria/i, "remedio"],
  [/a[cç]a[ií]|sorvet|gelat/i, "sorvete"],
  [/caf[eé]|cafeteria/i, "cafe"],
  [/restaurante|marmit|comida|cozinha/i, "utensilios"],
  [/bar\b|boteco|cervej/i, "cerveja"],
  [/sal[aã]o|beleza|cabel|barbear|est[eé]tica|manicure/i, "tesoura"],
  [/flor/i, "flor"],
  [/papelaria|livr/i, "livro"],
  [/celular|eletr[oô]n|inform[aá]t/i, "eletronico"],
  [/costur|ateli[eê]|artesan/i, "costura"],
  [/a[cç]ougue|carne/i, "carne"],
];

const ITENS_RADICAIS = ITENS.map(([chaves, icone]) => [chaves.map(radical), icone] as const);

export function iconeDoItem(nome: string): NomeIcone {
  const tokens = chaveTokens(nome);
  for (const [chaves, icone] of ITENS_RADICAIS) {
    if (tokens.some((t) => chaves.some((c) => t === c || t.startsWith(c)))) return icone;
  }
  return "pacote";
}

export function iconeDoRamo(texto: string): NomeIcone {
  return RAMOS.find(([re]) => re.test(texto))?.[1] ?? "loja";
}

export function iconeDoNegocio(n: Pick<Negocio, "icone" | "ramo" | "nome">): NomeIcone {
  return n.icone ?? iconeDoRamo(`${n.ramo} ${n.nome}`);
}

/** Opções do seletor de ícone em "Criar Meu Negócio". */
export const ICONES_NEGOCIO: NomeIcone[] = [
  "loja", "lanche", "ferramenta", "bolo", "remedio", "sorvete", "tesoura", "pizza", "utensilios", "cafe", "costura", "eletronico",
];
