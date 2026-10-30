// Utilidades de texto em pt-BR: acentos, tokens, plural → singular e títulos.

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Minúsculas, sem acento e sem pontuação (mantém "2,5" e "1.420"). */
export function normalizar(s: string): string {
  return semAcento(s.toLowerCase())
    .replace(/[^a-z0-9,.\s]/g, " ")
    .replace(/(?<!\d)[,.]|[,.](?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras que não ajudam a identificar um produto. */
export const STOP = new Set([
  "de", "da", "do", "das", "dos", "e", "com", "em", "no", "na", "nos", "nas",
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "para", "pra", "pro", "pros", "pras",
]);

/**
 * Radical para comparação: sem acento, sem diminutivo "-zinho" e no singular.
 * Precisa só ser igual para singular e plural ("franceses" e "frances" → "france").
 */
export function radical(palavra: string): string {
  let w = semAcento(palavra.toLowerCase());
  if (w.length <= 3) return w;
  w = w.replace(/(a|o)ezinh[oa]s?$/, "ao").replace(/zinh[oa]s?$/, "");
  if (w.length <= 3) return w;
  if (/(oes|aes|aos)$/.test(w)) return w.slice(0, -3) + "ao";
  if (w.length > 4 && w.endsWith("eis")) return w.slice(0, -3) + "el";
  if (w.length > 4 && /(ais|ois)$/.test(w)) return w.slice(0, -2) + "l";
  if (w.endsWith("ns")) return w.slice(0, -2) + "m";
  if (w.endsWith("eses")) return w.slice(0, -3);
  if (/[aeiou][rz]es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** Tokens de comparação de uma frase (sem palavras vazias). */
export function chaveTokens(frase: string): string[] {
  return normalizar(frase)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map(radical);
}

const INVARIAVEIS = new Set(["lapis", "tenis", "onibus", "pires", "virus", "gas", "mes", "pais", "atlas", "oculos", "cais", "bonus", "simples", "mais", "menos", "bis"]);

/** Singular de uma palavra para exibir (mantém acentos). */
export function singularPalavra(p: string): string {
  const base = semAcento(p.toLowerCase());
  if (p.length <= 3 || INVARIAVEIS.has(base) || /\d/.test(p)) return p;
  if (/[aã]ezinh[oa]s$/.test(p)) return p.replace(/[aã]ezinh([oa])s$/, "ãozinh$1");
  if (/[õo]ezinh[oa]s$/.test(p)) return p.replace(/[õo]ezinh([oa])s$/, "ãozinh$1");
  if (/[õã]es$/.test(p)) return p.slice(0, -3) + "ão";
  if (p.endsWith("ãos")) return p.slice(0, -1);
  if (/[ée]is$/.test(p) && p.length > 4) return p.slice(0, -3) + "el";
  if (/[óo]is$/.test(p) && p.length > 4) return p.slice(0, -3) + "ol";
  if (/ais$/.test(p) && p.length > 4) return p.slice(0, -2) + "l";
  if (p.endsWith("ns")) return p.slice(0, -2) + "m";
  if (p.endsWith("eses")) return p.slice(0, -4) + "ês";
  if (/[aeiouáéíóú][rz]es$/.test(p)) return p.slice(0, -2);
  if (/[áéíóúê]s$/.test(p)) return p; // francês, gás: já singular
  if (p.endsWith("s")) return p.slice(0, -1);
  return p;
}

/**
 * Singular de uma frase de produto: só o núcleo e seus adjetivos, antes do
 * primeiro "de" ("pães de queijo" → "pão de queijo"; "rações premium" → "ração premium").
 */
export function singularFrase(frase: string): string {
  const palavras = frase.split(/\s+/).filter(Boolean);
  let antesDoDe = true;
  return palavras
    .map((p) => {
      if (/^(de|da|do|das|dos|com)$/.test(p)) antesDoDe = false;
      return antesDoDe ? singularPalavra(p) : p;
    })
    .join(" ");
}

/** Acentos de palavras comuns digitadas sem acento (só para exibir nomes novos). */
const ACENTOS: Record<string, string> = {
  pao: "pão", paes: "pães", frances: "francês", acucar: "açúcar", cafe: "café", racao: "ração",
  agua: "água", feijao: "feijão", limao: "limão", mamao: "mamão", melao: "melão", acai: "açaí",
  file: "filé", oleo: "óleo", sabao: "sabão", algodao: "algodão", calca: "calça", cha: "chá",
  maca: "maçã", pessego: "pêssego", mucarela: "muçarela", oregano: "orégano", pure: "purê",
  picole: "picolé", pasteis: "pastéis", linguica: "linguiça", fuba: "fubá",
  guarana: "guaraná", cachaca: "cachaça", tenis: "tênis", higienico: "higiênico", gas: "gás",
  botijao: "botijão", lampada: "lâmpada", oculos: "óculos", sanduiche: "sanduíche",
  requeijao: "requeijão", camarao: "camarão", pe: "pé", po: "pó", acougue: "açougue",
  cafes: "cafés", racoes: "rações", eletrico: "elétrico",
};

export function restaurarAcento(p: string): string {
  return ACENTOS[p] ?? p;
}

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "em", "a", "o", "para", "sem"]);
const UNIDADES_TEXTO = new Set(["kg", "g", "ml", "l", "m", "un"]);

/** "pão de queijo" → "Pão de Queijo"; "x-burguer" → "X-Burguer"; "2l" → "2L". */
export function tituloPt(frase: string): string {
  return frase
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (i > 0 && MINUSCULAS.has(w)) return w;
      if (UNIDADES_TEXTO.has(w)) return w === "l" ? "L" : w;
      if (/^\d+(?:[.,]\d+)?l$/.test(w)) return w.slice(0, -1) + "L";
      if (/\d/.test(w)) return w;
      return w
        .split("-")
        .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join("-");
    })
    .join(" ");
}

/** Distância de edição com transposição (Damerau restrita). */
export function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}
