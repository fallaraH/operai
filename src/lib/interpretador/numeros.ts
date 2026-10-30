// Números em pt-BR: por extenso → dígitos ("trezentos e vinte" → 320),
// "meio/meia" e leitura do formato brasileiro ("1.420,50").

import { semAcento } from "./texto";

/** `limite`: maior parcela que ainda pode ser somada depois ("vinte" aceita "e cinco"). */
interface InfoNumero {
  v: number;
  limite: number;
}

const SEM_SOMA = -1;

const PALAVRAS: Record<string, InfoNumero> = {
  zero: { v: 0, limite: SEM_SOMA },
  um: { v: 1, limite: SEM_SOMA }, uma: { v: 1, limite: SEM_SOMA },
  dois: { v: 2, limite: SEM_SOMA }, duas: { v: 2, limite: SEM_SOMA },
  tres: { v: 3, limite: SEM_SOMA }, quatro: { v: 4, limite: SEM_SOMA }, cinco: { v: 5, limite: SEM_SOMA },
  seis: { v: 6, limite: SEM_SOMA }, sete: { v: 7, limite: SEM_SOMA }, oito: { v: 8, limite: SEM_SOMA },
  nove: { v: 9, limite: SEM_SOMA }, dez: { v: 10, limite: SEM_SOMA }, onze: { v: 11, limite: SEM_SOMA },
  doze: { v: 12, limite: SEM_SOMA }, treze: { v: 13, limite: SEM_SOMA },
  catorze: { v: 14, limite: SEM_SOMA }, quatorze: { v: 14, limite: SEM_SOMA },
  quinze: { v: 15, limite: SEM_SOMA }, dezesseis: { v: 16, limite: SEM_SOMA }, dezasseis: { v: 16, limite: SEM_SOMA },
  dezessete: { v: 17, limite: SEM_SOMA }, dezassete: { v: 17, limite: SEM_SOMA },
  dezoito: { v: 18, limite: SEM_SOMA }, dezenove: { v: 19, limite: SEM_SOMA }, dezanove: { v: 19, limite: SEM_SOMA },
  vinte: { v: 20, limite: 9 }, trinta: { v: 30, limite: 9 }, quarenta: { v: 40, limite: 9 },
  cinquenta: { v: 50, limite: 9 }, sessenta: { v: 60, limite: 9 }, setenta: { v: 70, limite: 9 },
  oitenta: { v: 80, limite: 9 }, noventa: { v: 90, limite: 9 },
  cem: { v: 100, limite: 99 }, cento: { v: 100, limite: 99 },
  duzentos: { v: 200, limite: 99 }, duzentas: { v: 200, limite: 99 },
  trezentos: { v: 300, limite: 99 }, trezentas: { v: 300, limite: 99 },
  quatrocentos: { v: 400, limite: 99 }, quatrocentas: { v: 400, limite: 99 },
  quinhentos: { v: 500, limite: 99 }, quinhentas: { v: 500, limite: 99 },
  seiscentos: { v: 600, limite: 99 }, seiscentas: { v: 600, limite: 99 },
  setecentos: { v: 700, limite: 99 }, setecentas: { v: 700, limite: 99 },
  oitocentos: { v: 800, limite: 99 }, oitocentas: { v: 800, limite: 99 },
  novecentos: { v: 900, limite: 99 }, novecentas: { v: 900, limite: 99 },
};

const RE_NUMERO = /^(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)$/;

export function ehNumero(tok: string | undefined): tok is string {
  return tok !== undefined && RE_NUMERO.test(tok);
}

/** "1.420,50" → 1420.5; "2,5" → 2.5; "4.50" → 4.5; "1.500" → 1500. */
export function numeroBr(tok: string): number {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(tok)) return Number(tok.replace(/\./g, "").replace(",", "."));
  return Number(tok.replace(",", "."));
}

/**
 * Lê uma sequência por extenso a partir de `i`. Só junta parcelas coerentes:
 * "trinta e cinco" → 35, mas "três e cinquenta" para no 3 (vira "3 e 50", dinheiro).
 */
function lerExtenso(tokens: string[], i: number): { valor: number; fim: number } | null {
  const primeiro = semAcento(tokens[i]);
  const digitoMil = /^\d+$/.test(tokens[i]) && semAcento(tokens[i + 1] ?? "") === "mil";
  if (!PALAVRAS[primeiro] && primeiro !== "mil" && !digitoMil) return null;

  let total = 0;
  let grupo = 0;
  let limite = Infinity;
  let j = i;
  if (digitoMil) {
    grupo = Number(tokens[i]);
    j++;
  }
  while (j < tokens.length) {
    const w = semAcento(tokens[j]);
    if (w === "mil") {
      total += (grupo || 1) * 1000;
      grupo = 0;
      limite = 999;
      j++;
      continue;
    }
    const info = PALAVRAS[w];
    if (info) {
      if (info.v > limite) break;
      grupo += info.v;
      limite = info.limite;
      j++;
      continue;
    }
    if (w === "e" && (grupo > 0 || total > 0)) {
      const proximo = PALAVRAS[semAcento(tokens[j + 1] ?? "")];
      if (proximo && proximo.v <= limite) {
        j++;
        continue;
      }
    }
    break;
  }
  return j > i ? { valor: total + grupo, fim: j } : null;
}

export function numerosPorExtenso(tokens: string[]): string[] {
  const saida: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    const lido = lerExtenso(tokens, i);
    if (lido) {
      saida.push(String(lido.valor));
      i = lido.fim;
    } else {
      saida.push(tokens[i]);
      i++;
    }
  }
  return saida;
}

const UNIDADE_MEIO = "(quilos?|kg|kilos?|litros?|l|metros?|m|duzias?)";

/** "1 quilo e meio" → "1,5 quilo"; "2 e meio" → "2,5"; "meia duzia" → "0,5 duzia". */
export function meiosEDuzias(texto: string): string {
  return texto
    .replace(new RegExp(`\\b(\\d+)\\s+${UNIDADE_MEIO}\\s+e\\s+(meio|meia)\\b`, "g"), "$1,5 $2")
    .replace(/\b(\d+)\s+e\s+(meio|meia)\b/g, "$1,5")
    .replace(new RegExp(`\\b(meio|meia)\\s+${UNIDADE_MEIO}\\b`, "g"), "0,5 $2");
}
