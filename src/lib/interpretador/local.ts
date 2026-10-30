// Interpretador determinístico em pt-BR: funciona sem chave de IA e offline.
// Frase do comerciante → Interpretacao padronizada (tipo, itens, valores, pessoa).

import type { Unidade } from "../dominio/tipos";
import { casarItem, criarIndice, type IndiceItens } from "./casamento";
import {
  ANTES_DE_VALOR, CATEGORIAS_DESPESA, CONTINUA_VALOR, EMBALAGENS, GATILHOS, GIRIAS, INICIO_MOTIVO, ehLancheX,
  LUGARES_FORNECEDOR, MARCAS, NAO_PESSOA, PALAVRA_GIRIA, PALAVRAS_CENTAVO, PALAVRAS_GATILHO, PALAVRAS_MOEDA,
  PREPOSICOES_VALOR, RUIDO, TITULOS_PESSOA, UNIDADES, UNIDADES_PRECO, VERBOS_VALOR,
  type CategoriaDespesa, type TipoBruto,
} from "./lexico";
import { mensagemConfirmacao } from "./mensagem";
import { ehNumero, meiosEDuzias, numeroBr, numerosPorExtenso } from "./numeros";
import { chaveTokens, normalizar, radical, restaurarAcento, semAcento, singularFrase, STOP, tituloPt } from "./texto";
import type { ContextoItem, ContextoNegocio, Interpretacao, ItemInterpretado, TipoMovimentacao } from "./tipos";

interface Valor {
  valor: number;
  unitario: boolean;
}

interface ItemBruto {
  /** Como foi dito, já no singular. */
  nome: string;
  quantidade: number | null;
  unidade: Unidade;
  unidadeDita: boolean;
  marca: string | null;
  valores: Valor[];
  /** "4 sonhos 18": número solto depois do item. */
  valorSolto: number | null;
}

const PONTUACAO = new Set([",", ".", ";", ":", "!", "?", "(", ")"]);
const SEPARADORES = new Set([",", ";", ".", "e", "mais", "+", "&", "tambem"]);
const PARA = new Set(["para", "pra", "pro", "pros", "pras"]);
const PREPOSICAO_LUGAR = new Set(["do", "da", "dos", "das", "no", "na", "nos", "nas", "com", "pelo", "pela"]);
const DE = new Set(["de", "da", "do", "das", "dos"]);
const ARTIGOS = new Set(["o", "a", "os", "as"]);
const PARA_NO_NOME = new Set([
  "por", "e", "com", "no", "na", "nos", "nas", "em", "que", "a", "o", "os", "as", "pra", "para", "pro", "um", "uma",
  "hoje", "ontem", "agora", "mais", "cada", "reais", "real", "de", "da", "do", "dos", "das", "ja", "tambem",
]);
const VERBOS_CLIENTE = new Set(["comprou", "compraram", "levou", "levaram", "pegou", "encomendou", "pediu"]);
const GATILHOS_PAGAMENTO_CONTEXTO = new Set(["paguei", "pagamos", "pagou", "gastei", "gastamos", "conta", "aluguel", "boleto"]);

const n = (tok: string[], k: number) => semAcento(tok[k] ?? "");
const confere = (norm: string[], i: number, frase: string[]) => frase.every((p, k) => norm[i + k] === p);

// ---------- 1. Preparação ----------

function preparar(texto: string): string[] {
  let t = ` ${texto.normalize("NFC").toLowerCase()} `;
  t = t
    .replace(/[“”"'`´]/g, " ")
    .replace(/dúzia/g, "duzia")
    .replace(/r\s?\$\s*/g, " r$ ")
    .replace(/(\d)(kgs?|grs?|g|lts?|l|ml|mts?|m|und|unid|un|dz|x)(?=[\s,.;:!?]|$)/g, "$1 $2")
    .replace(/(^|\s)x(\d)/g, "$1x $2")
    // Hífen nunca separa itens: "anti-pulgas" vira "anti pulgas" e o casamento
    // com o estoque reconhece a forma colada ("antipulgas").
    .replace(/-/g, " ")
    .replace(/(?<!\d),|,(?!\d)/g, " , ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " . ")
    .replace(/[;:!?()]/g, " $& ");
  const tokens = numerosPorExtenso(t.split(/\s+/).filter(Boolean));
  return meiosEDuzias(tokens.join(" ")).split(/\s+/).filter(Boolean);
}

// ---------- 2. Valores em dinheiro ----------

function continuaValor(tok: string[], k: number, aposVerbo: boolean): boolean {
  const w = n(tok, k);
  if (!w || PONTUACAO.has(w) || w.startsWith("§")) return true;
  if (CONTINUA_VALOR.has(w)) return true;
  return aposVerbo && DE.has(w);
}

/** "cada", "cada um", "o quilo", "por kg": devolve onde o sufixo termina. */
function sufixoUnitario(tok: string[], k: number): number | null {
  const w = n(tok, k);
  if (w === "cada") return ["um", "uma", "1"].includes(n(tok, k + 1)) ? k + 2 : k + 1;
  if ((w === "o" || w === "a" || w === "por") && UNIDADES_PRECO.has(n(tok, k + 1))) return k + 2;
  return null;
}

function lerValor(tok: string[], i: number): { valor: number; fim: number; moeda: boolean } | null {
  if (!ehNumero(tok[i])) return null;
  let valor = numeroBr(tok[i]);
  let j = i + 1;
  let moeda = false;
  if (PALAVRAS_MOEDA.has(n(tok, j))) {
    moeda = true;
    j++;
  } else if (PALAVRAS_CENTAVO.has(n(tok, j))) {
    return { valor: valor / 100, fim: j + 1, moeda: true };
  }
  // "3 e 50" / "3 reais e 50 centavos"
  if (n(tok, j) === "e" && /^\d{1,2}$/.test(tok[j + 1] ?? "")) {
    if (PALAVRAS_CENTAVO.has(n(tok, j + 2))) {
      valor += Number(tok[j + 1]) / 100;
      j += 3;
      moeda = true;
    } else if (/^\d{2}$/.test(tok[j + 1]) && continuaValor(tok, j + 2, false) && n(tok, j + 2) !== "e") {
      valor += Number(tok[j + 1]) / 100;
      j += 2;
    }
  }
  return { valor, fim: j, moeda };
}

function extrairValores(tok: string[]): { tokens: string[]; valores: Valor[] } {
  const saida: string[] = [];
  const valores: Valor[] = [];
  const pagamento = tok.some((t) => GATILHOS_PAGAMENTO_CONTEXTO.has(semAcento(t)));

  for (let i = 0; i < tok.length; i++) {
    const prev = n(tok, i - 1);
    let lido: { valor: number; fim: number } | null = null;

    if (n(tok, i) === "r$") {
      lido = lerValor(tok, i + 1);
      if (!lido) continue; // "R$" solto
    } else if (ehNumero(tok[i])) {
      const v = lerValor(tok, i);
      if (v) {
        const aposVerbo = VERBOS_VALOR.has(prev);
        const prep =
          PREPOSICOES_VALOR.has(prev) ||
          aposVerbo ||
          (prev === "de" && (ANTES_DE_VALOR.has(n(tok, i - 2)) || pagamento));
        const proximo = n(tok, v.fim);
        const centavosNoFim = /,\d{2}$/.test(tok[i]) && !UNIDADES_PRECO.has(proximo);
        if (
          v.moeda ||
          (prep && continuaValor(tok, v.fim, aposVerbo || pagamento)) ||
          sufixoUnitario(tok, v.fim) !== null ||
          centavosNoFim
        ) {
          lido = v;
        }
      }
    }
    if (!lido) {
      saida.push(tok[i]);
      continue;
    }

    const fimSufixo = sufixoUnitario(tok, lido.fim);
    const unitario = fimSufixo !== null || prev === "a";
    // Preposições antes do valor saem ("por", "no valor de"); verbos ("paguei", "deu")
    // ficam para achar o tipo.
    let tirouPalavraDeValor = false;
    while (saida.length) {
      const ultimo = semAcento(saida[saida.length - 1]);
      const anterior = semAcento(saida[saida.length - 2] ?? "");
      const deValor = ultimo === "de" && (ANTES_DE_VALOR.has(anterior) || pagamento);
      const artigoAntes = tirouPalavraDeValor && ["no", "o", "ao", "pelo"].includes(ultimo);
      if (!PREPOSICOES_VALOR.has(ultimo) && !deValor && !artigoAntes) break;
      tirouPalavraDeValor = ["valor", "preco", "total"].includes(ultimo);
      saida.pop();
    }
    saida.push(`§${valores.length}`);
    valores.push({ valor: Math.round(lido.valor * 100) / 100, unitario });
    i = (fimSufixo ?? lido.fim) - 1;
  }
  return { tokens: saida, valores };
}

// ---------- 3. Tipo da movimentação ----------

interface Deteccao {
  bruto: TipoBruto | null;
  forte: boolean;
  /** Onde começa uma segunda movimentação (ex: "vendi ... e comprei ..."). */
  corte: number | null;
}

function base(t: TipoBruto): string {
  return t === "pagamento" || t === "despesa" ? "despesa" : t === "recebimento" ? "venda" : t;
}

function detectarTipo(tok: string[]): Deteccao {
  const norm = tok.map(semAcento);
  const achados: { tipo: TipoBruto; forte: boolean; pos: number }[] = [];
  for (let i = 0; i < norm.length; i++) {
    const g = GATILHOS.find((gat) => confere(norm, i, gat.frase));
    if (g) {
      achados.push({ tipo: g.tipo, forte: g.forte, pos: i });
      i += g.frase.length - 1;
    }
  }
  const [primeiro] = achados;
  if (!primeiro) return { bruto: null, forte: false, corte: null };
  // Sinistro em qualquer ponto da frase manda: "roubaram a loja e levaram 200 reais"
  // não é venda (levaram) nem duas movimentações.
  if (achados.some((a) => a.tipo === "sinistro")) return { bruto: "sinistro", forte: true, corte: null };
  let bruto = primeiro.tipo;
  // "a cliente fez uma compra de 65" é venda.
  if (bruto === "compra" && !primeiro.forte && norm.includes("cliente")) bruto = "venda";
  const outro = achados.find((a) => a.pos > primeiro.pos && a.forte && base(a.tipo) !== base(bruto));
  return { bruto, forte: primeiro.forte, corte: outro ? outro.pos : null };
}

// ---------- 4. Cliente / fornecedor ----------

function fimDoNome(tok: string[], k: number, max: number): number {
  let j = k;
  while (j < tok.length && j - k < max) {
    const w = n(tok, j);
    const palavra = /^[a-z]+$/.test(w);
    if (DE.has(w) && j > k && /^[a-z]+$/.test(n(tok, j + 1)) && !PARA_NO_NOME.has(n(tok, j + 1))) {
      j++;
      continue;
    }
    if (!palavra || PARA_NO_NOME.has(w) || PALAVRAS_GATILHO.has(w) || UNIDADES[w] || EMBALAGENS[w]) break;
    j++;
  }
  return j;
}

function extrairPessoa(tok: string[], tipo: TipoBruto | null): { tokens: string[]; nome: string | null } {
  const recortar = (ini: number, fim: number, nomeIni: number) => ({
    tokens: [...tok.slice(0, ini), ...tok.slice(fim)],
    nome: tituloPt(tok.slice(nomeIni, fim).join(" ")),
  });

  if (tipo === "compra" || tipo === "pagamento" || tipo === "recebimento") {
    for (let i = 0; i < tok.length; i++) {
      const w = n(tok, i);
      if (w === "fornecedor" || w === "fornecedora") {
        const fim = fimDoNome(tok, i + 1, 3);
        return recortar(i, fim, i);
      }
      if (!PREPOSICAO_LUGAR.has(w)) continue;
      let k = i + 1;
      if (w === "com" && ARTIGOS.has(n(tok, k))) k++;
      if (LUGARES_FORNECEDOR.has(n(tok, k)) || TITULOS_PESSOA.has(n(tok, k))) {
        const fim = fimDoNome(tok, k + 1, 3);
        return recortar(i, fim, k);
      }
    }
  }

  if (tipo === "venda" || tipo === "recebimento" || tipo === null) {
    for (let i = 0; i < tok.length; i++) {
      const w = n(tok, i);
      if (!PARA.has(w) && w !== "cliente") continue;
      let k = i + 1;
      if (ARTIGOS.has(n(tok, k))) k++;
      const titulo = TITULOS_PESSOA.has(n(tok, k));
      const inicioNome = titulo ? k + 1 : k;
      if (NAO_PESSOA.has(n(tok, inicioNome)) || !/^[a-z]+$/.test(n(tok, inicioNome))) continue;
      const fim = fimDoNome(tok, inicioNome, 3);
      if (fim === inicioNome) continue;
      return recortar(i, fim, titulo ? k : inicioNome);
    }
    // "a dona Maria comprou 3 bolos"
    const verbo = tok.findIndex((t) => VERBOS_CLIENTE.has(semAcento(t)));
    if (verbo > 0) {
      let ini = verbo;
      while (ini > 0 && verbo - ini < 3 && /^[a-z]+$/.test(n(tok, ini - 1)) && !PARA_NO_NOME.has(n(tok, ini - 1)) && !PALAVRAS_GATILHO.has(n(tok, ini - 1))) {
        ini--;
      }
      if (ini < verbo) return recortar(ini, verbo, ini);
    }
  }
  return { tokens: tok, nome: null };
}

// ---------- 5. Limpeza ----------

function limpar(tok: string[], perda: boolean): string[] {
  const norm = tok.map(semAcento);
  const saida: string[] = [];
  for (let i = 0; i < tok.length; ) {
    // Em perdas, o motivo ("que caíram no chão") vai até o próximo item.
    if (perda && INICIO_MOTIVO.has(norm[i])) {
      let j = i + 1;
      while (j < tok.length && !(SEPARADORES.has(norm[j]) && (ehNumero(tok[j + 1]) || norm[j] !== "e"))) j++;
      i = j;
      continue;
    }
    const gatilho = GATILHOS.find((g) => confere(norm, i, g.frase));
    if (gatilho) {
      i += gatilho.frase.length;
      continue;
    }
    const ruido = RUIDO.find((f) => confere(norm, i, f));
    if (ruido) {
      i += ruido.length;
      continue;
    }
    saida.push(tok[i]);
    i++;
  }
  return saida;
}

// ---------- 6. Itens ----------

/** Nomes do estoque com separador dentro ("Queijo e Goiabada") não podem ser quebrados. */
function dividir(tok: string[], protegidos: string[][]): string[][] {
  const norm = tok.map(semAcento);
  const juntos: string[] = [];
  for (let i = 0; i < tok.length; ) {
    const p = protegidos.find((f) => confere(norm, i, f));
    if (p) {
      juntos.push(tok.slice(i, i + p.length).join("_"));
      i += p.length;
    } else {
      juntos.push(tok[i]);
      i++;
    }
  }
  const pedacos: string[][] = [[]];
  for (const t of juntos) {
    if (SEPARADORES.has(semAcento(t))) {
      if (pedacos[pedacos.length - 1].length) pedacos.push([]);
      continue;
    }
    pedacos[pedacos.length - 1].push(t.replace(/_/g, " "));
  }
  return pedacos.filter((p) => p.length).map((p) => p.flatMap((t) => t.split(" ")));
}

function aparar(tok: string[]): string[] {
  const t = tok.filter((w) => !PONTUACAO.has(w));
  const vazio = (w: string) => STOP.has(semAcento(w));
  while (t.length && vazio(t[0])) t.shift();
  while (t.length && vazio(t[t.length - 1])) t.pop();
  return t;
}

function extrairMarca(tok: string[]): { tokens: string[]; marca: string | null; produto: string | null } {
  const norm = tok.map(semAcento);
  for (let i = 0; i < tok.length; i++) {
    if ((norm[i] === "marca") && /^[a-z]+$/.test(norm[i + 1] ?? "")) {
      const ini = DE.has(norm[i - 1] ?? "") ? i - 1 : i;
      return { tokens: [...tok.slice(0, ini), ...tok.slice(i + 2)], marca: tituloPt(tok[i + 1]), produto: null };
    }
    const m = MARCAS.find((mc) => confere(norm, i, mc.frase));
    if (m) {
      const ini = DE.has(norm[i - 1] ?? "") ? i - 1 : i;
      return { tokens: [...tok.slice(0, ini), ...tok.slice(i + m.frase.length)], marca: m.marca, produto: m.produto ?? null };
    }
  }
  return { tokens: tok, marca: null, produto: null };
}

const unidadeDe = (w: string): Unidade | null => UNIDADES[w] ?? null;
const embalagemDe = (w: string): Unidade | null => EMBALAGENS[w] ?? null;

function lerPedaco(tokens: string[], valores: Valor[]): ItemBruto | null {
  const { tokens: semMarca, marca, produto } = extrairMarca(tokens);
  let t = semMarca;
  let quantidade: number | null = null;
  let unidade: Unidade = "un";
  let unidadeDita = false;

  // "3 x pão" / "pão x 3" (mas "3 x salada" é o lanche X-Salada)
  if (ehNumero(t[0]) && n(t, 1) === "x" && !ehLancheX(t[2])) t = [t[0], ...t.slice(2)];
  if (t.length >= 3 && n(t, t.length - 2) === "x" && ehNumero(t[t.length - 1])) {
    quantidade = numeroBr(t[t.length - 1]);
    t = t.slice(0, -2);
  }

  if (quantidade === null && ehNumero(t[0])) {
    quantidade = numeroBr(t[0]);
    let k = 1;
    const u = unidadeDe(n(t, 1));
    const emb = embalagemDe(n(t, 1));
    if (u) {
      unidade = u;
      unidadeDita = true;
      k = 2;
    } else if (emb) {
      unidade = emb;
      unidadeDita = true;
      k = 2;
      // "2 sacos de 25 kg", "1 fardo com 6 garrafas"
      if ((n(t, 2) === "de" || n(t, 2) === "com") && ehNumero(t[3])) {
        const interna = unidadeDe(n(t, 4)) ?? (embalagemDe(n(t, 4)) ? "un" : null);
        if (interna) {
          quantidade *= numeroBr(t[3]);
          unidade = interna;
          k = 5;
        }
      }
    }
    while (DE.has(n(t, k))) k++;
    t = t.slice(k);
  } else if (quantidade === null && unidadeDe(n(t, 0))) {
    // "quilo de farinha"
    quantidade = 1;
    unidade = unidadeDe(n(t, 0))!;
    unidadeDita = true;
    let k = 1;
    while (DE.has(n(t, k))) k++;
    t = t.slice(k);
  }

  let valorSolto: number | null = null;
  const ult = t.length - 1;
  if (quantidade === null && ult >= 1) {
    const u = unidadeDe(n(t, ult)) ?? embalagemDe(n(t, ult));
    if (u && ehNumero(t[ult - 1])) {
      // "farinha 50 kg"
      quantidade = numeroBr(t[ult - 1]);
      unidade = u;
      unidadeDita = true;
      t = t.slice(0, ult - 1);
    } else if (ehNumero(t[ult])) {
      // "pão francês 30"
      quantidade = numeroBr(t[ult]);
      t = t.slice(0, ult);
    }
  } else if (quantidade !== null && ult >= 1 && ehNumero(t[ult]) && !unidadeDe(n(t, ult - 1))) {
    valorSolto = numeroBr(t[ult]);
    t = t.slice(0, ult);
  }

  // Embalagem com tamanho no meio do nome: "1 saco de farinha de 25 kg", "2 caixas de leite com 12"
  if (quantidade !== null && (unidade === "pct" || unidade === "cx")) {
    for (let i = 0; i < t.length - 1; i++) {
      if ((n(t, i) === "de" || n(t, i) === "com") && ehNumero(t[i + 1])) {
        const interna = unidadeDe(n(t, i + 2)) ?? (embalagemDe(n(t, i + 2)) ? "un" : null);
        const fim = interna ? i + 3 : i + 2;
        if (interna || n(t, i) === "com") {
          quantidade *= numeroBr(t[i + 1]);
          unidade = interna ?? "un";
          t = [...t.slice(0, i), ...t.slice(fim)];
          break;
        }
      }
    }
  }

  // Tamanho do produto fica no nome: "rações premium de 15 kg" → "ração premium 15 kg"
  const nomeTokens = aparar(t).filter((w, i, arr) => !(DE.has(semAcento(w)) && ehNumero(arr[i + 1])));
  let nome = singularFrase(nomeTokens.join(" "));
  if (!nome && produto) nome = produto.toLowerCase();
  if (!nome) return null;
  return { nome, quantidade, unidade, unidadeDita, marca, valores, valorSolto };
}

// ---------- 7. Nome canônico e tags ----------

function canonicoNovo(nome: string): string {
  const giria = GIRIAS.get(chaveTokens(nome).join(" "));
  if (giria) return giria.nome;
  const palavras = nome.split(" ").map((p) => {
    const sem = semAcento(p);
    return PALAVRA_GIRIA[sem] ?? (p === sem ? restaurarAcento(p) : p);
  });
  return tituloPt(palavras.join(" "));
}

function tagsBusca(canonico: string, dito: string, marca: string | null): string[] {
  const tags = new Set<string>();
  const adicionar = (frase: string) => {
    const palavras = normalizar(frase).split(" ").filter((w) => w.length > 1 && !STOP.has(w) && !/^\d/.test(w));
    for (const w of palavras) {
      tags.add(w);
      tags.add(radical(w));
    }
    if (palavras.length > 1) {
      tags.add(palavras.join(" "));
      // Variante colada para termos que aparecem com e sem hífen ("anti pulgas" → "antipulgas").
      if (palavras.length <= 3) tags.add(palavras.join(""));
    }
  };
  adicionar(canonico);
  adicionar(dito);
  if (marca) tags.add(normalizar(marca));
  return [...tags].slice(0, 8);
}

// ---------- 8. Montagem ----------

function categoriaDespesa(norm: string[]): CategoriaDespesa | null {
  for (const c of CATEGORIAS_DESPESA) {
    for (let i = 0; i < norm.length; i++) {
      if (c.chaves.some((ch) => confere(norm, i, ch))) return c;
    }
  }
  return null;
}

const TIPO_FINAL: Record<string, TipoMovimentacao> = {
  venda: "saida_venda",
  compra: "entrada",
  perda: "saida_perda",
  despesa: "despesa",
};

export function interpretarLocal(texto: string, contexto?: ContextoNegocio | null): Interpretacao {
  const original = texto.trim().slice(0, 500);
  const observacoes: string[] = [];

  const { tokens: comMarcadores, valores } = extrairValores(preparar(original));
  const deteccao = detectarTipo(comMarcadores);
  let trabalho = comMarcadores;
  if (deteccao.corte !== null) {
    trabalho = trabalho.slice(0, deteccao.corte);
    observacoes.push("Registrei só a primeira movimentação da frase. Mande a outra em seguida.");
  }
  const normTudo = trabalho.map(semAcento);
  const despesaCat = categoriaDespesa(normTudo);

  const pessoa = extrairPessoa(trabalho, deteccao.bruto);
  const saidaSemVenda = deteccao.bruto === "perda" || deteccao.bruto === "sinistro";
  const limpos = limpar(pessoa.tokens, saidaSemVenda);

  // Itens e valores
  const itensCtx: ContextoItem[] = contexto?.itens ?? [];
  const indice: IndiceItens<ContextoItem> = criarIndice(itensCtx);
  const protegidos = itensCtx
    .flatMap((i) => [i.nome, ...(i.apelidos ?? [])])
    .map((f) => normalizar(f).split(" "))
    .filter((f) => f.length > 1 && f.some((w) => SEPARADORES.has(w)));

  const brutos: ItemBruto[] = [];
  const soltos: Valor[] = [];
  const restoDespesa: string[] = [];
  for (const pedaco of dividir(limpos, protegidos)) {
    const marcadores = pedaco.filter((t) => t.startsWith("§")).map((t) => valores[Number(t.slice(1))]);
    const palavras = pedaco.filter((t) => !t.startsWith("§"));
    restoDespesa.push(...palavras);
    const item = palavras.length ? lerPedaco(palavras, marcadores) : null;
    if (item) brutos.push(item);
    else soltos.push(...marcadores);
  }

  // Um único total no fim de uma lista vale para a movimentação inteira.
  let totalOperacao: number | null = null;
  const totaisDe = (i: ItemBruto) => i.valores.filter((v) => !v.unitario);
  const ultimo = brutos[brutos.length - 1];
  const anterioresSemValor = brutos.slice(0, -1).every((i) => i.valores.length === 0 && i.valorSolto === null);
  if (brutos.length > 1 && anterioresSemValor) {
    if (totaisDe(ultimo).length === 1) {
      totalOperacao = totaisDe(ultimo)[0].valor;
      ultimo.valores = ultimo.valores.filter((v) => v.unitario);
    } else if (ultimo.valorSolto !== null && totaisDe(ultimo).length === 0) {
      totalOperacao = ultimo.valorSolto;
      ultimo.valorSolto = null;
    }
  }
  const unitarioSolto = soltos.find((v) => v.unitario)?.valor ?? null;
  const totalSolto = soltos.filter((v) => !v.unitario).reduce<number | null>((s, v) => (s ?? 0) + v.valor, null);
  if (totalSolto !== null) totalOperacao = (totalOperacao ?? 0) + totalSolto;

  let casados = 0;
  let ambiguos = 0;
  const explicito = deteccao.bruto !== null;
  const lidos = brutos.map((b) => ({ b, casamento: indice.length ? casarItem(b.nome, indice) : null }));
  // Palavra solta que não é item do estoque nem tem quantidade é ruído: "bom dia" sem
  // verbo; "a loja" em "roubaram a loja"; "troco" em "perdi 50 reais de troco".
  const ehItem = ({ b, casamento }: (typeof lidos)[number]) =>
    !!casamento || b.quantidade !== null || (!saidaSemVenda && (b.valores.length > 0 || b.valorSolto !== null));
  const relevantes = explicito && !saidaSemVenda ? lidos : lidos.filter(ehItem);
  // O valor dito junto de uma palavra descartada continua valendo para a movimentação.
  const valorDescartado = lidos
    .filter((l) => !relevantes.includes(l))
    .reduce((s, { b }) => s + totaisDe(b).reduce((t, v) => t + v.valor, 0) + (b.valorSolto ?? 0), 0);
  if (valorDescartado > 0) totalOperacao = (totalOperacao ?? 0) + valorDescartado;
  const itens: ItemInterpretado[] = relevantes.map(({ b, casamento }) => {
    if (casamento) casados++;
    if (casamento?.ambiguo) ambiguos++;
    const nomeCanonico = casamento ? casamento.item.nome : canonicoNovo(b.nome);
    const unidade = casamento && !b.unidadeDita ? casamento.item.unidade : b.unidade;
    const total = totaisDe(b).pop()?.valor ?? b.valorSolto;
    const unitario = b.valores.find((v) => v.unitario)?.valor ?? (total === null ? unitarioSolto : null);
    return {
      nome_canonico: nomeCanonico,
      marca: b.marca,
      quantidade: b.quantidade,
      unidade_medida: unidade,
      valor_unitario_mencionado: unitario,
      valor_total_mencionado: total ?? null,
      tags_busca: tagsBusca(nomeCanonico, b.nome, b.marca),
    };
  });

  if (totalOperacao === null && itens.length) {
    // Soma quando todo item tem valor (total dito ou preço × quantidade).
    const totais = itens.map((i) =>
      i.valor_total_mencionado ??
      (i.valor_unitario_mencionado !== null && i.quantidade !== null ? i.valor_unitario_mencionado * i.quantidade : null),
    );
    if (totais.every((t) => t !== null)) totalOperacao = totais.reduce<number>((s, t) => s + (t ?? 0), 0);
  }
  if (totalOperacao !== null) totalOperacao = Math.round(totalOperacao * 100) / 100;

  // Tipo final
  let tipo: TipoMovimentacao;
  const temItens = itens.length > 0;
  const todosInsumo =
    temItens && itens.every((i) => itensCtx.find((c) => c.nome === i.nome_canonico)?.categoria === "insumo");
  switch (deteccao.bruto) {
    case "pagamento":
      tipo = despesaCat || !temItens ? "despesa" : "entrada";
      break;
    case "recebimento":
      tipo = temItens && itens.some((i) => i.quantidade !== null) ? "entrada" : "saida_venda";
      break;
    case null:
      tipo = despesaCat && !temItens ? "despesa" : todosInsumo ? "entrada" : "saida_venda";
      break;
    case "sinistro":
      // Mercadoria levada/quebrada é perda de estoque; dinheiro levado, multa ou golpe é despesa.
      tipo = temItens ? "saida_perda" : "despesa";
      break;
    default:
      tipo = TIPO_FINAL[deteccao.bruto];
  }
  // Compra de gás, sacolas... que não estão no estoque é despesa.
  if (tipo === "entrada" && despesaCat && temItens && casados === 0) tipo = "despesa";
  // "Perdi 50 reais": perda sem mercadoria é saída de dinheiro.
  if (tipo === "saida_perda" && !temItens && totalOperacao !== null) tipo = "despesa";

  let categoria: string | null = null;
  let itensFinais = itens;
  if (tipo === "despesa") {
    categoria = despesaCat?.categoria ?? (saidaSemVenda ? "Prejuízos" : "Outros");
    const resto = aparar(restoDespesa.filter((w) => !ehNumero(w)));
    const descricao =
      despesaCat?.rotulo ?? (saidaSemVenda ? "Prejuízo" : resto.length ? tituloPt(resto.join(" ")) : "Despesa");
    itensFinais = [
      {
        nome_canonico: descricao,
        marca: null,
        quantidade: 1,
        unidade_medida: "un",
        valor_unitario_mencionado: null,
        valor_total_mencionado: totalOperacao,
        tags_busca: tagsBusca(descricao, resto.join(" "), null),
      },
    ];
  }

  // Confiança: verbo claro, itens reconhecidos no estoque e valor dito.
  let confianca = 0.25;
  if (explicito) confianca += 0.3;
  if (tipo === "despesa") confianca += despesaCat ? 0.25 : 0.05;
  else if (temItens) confianca += (0.25 * casados) / itens.length;
  if (totalOperacao !== null || itens.some((i) => i.valor_unitario_mencionado !== null)) confianca += 0.15;
  if (ambiguos) confianca -= 0.15;
  if (!temItens && totalOperacao === null) confianca = Math.min(confianca, 0.2);
  confianca = Math.max(0, Math.min(1, Math.round(confianca * 100) / 100));

  const resultado = {
    tipo_movimentacao: tipo,
    cliente_ou_fornecedor: pessoa.nome,
    itens: itensFinais,
    valor_total_operacao: totalOperacao,
    categoria_despesa: categoria,
  };
  return {
    ...resultado,
    mensagem_confirmacao: mensagemConfirmacao(resultado),
    confianca,
    motor: "local",
    texto_original: original,
    ...(observacoes.length ? { observacoes } : {}),
  };
}
