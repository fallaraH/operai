// Casa o nome dito ("pãezinhos", "farinha", "refri") com um item do estoque,
// pelo nome e pelos apelidos, tolerando plural, diminutivo e erro de digitação.

import type { CategoriaItem } from "../dominio/tipos";
import { MODIFICADORES } from "./lexico";
import { chaveTokens, distancia, radical } from "./texto";

export interface ItemCasavel {
  nome: string;
  categoria: CategoriaItem;
  apelidos?: string[];
}

export type IndiceItens<T extends ItemCasavel> = { item: T; frases: string[][] }[];

/** Abaixo disso o nome é tratado como item novo. */
export const LIMIAR_CASAMENTO = 0.55;

export function criarIndice<T extends ItemCasavel>(itens: T[]): IndiceItens<T> {
  return itens.map((item) => ({
    item,
    frases: [item.nome, ...(item.apelidos ?? [])].map(chaveTokens).filter((f) => f.length > 0),
  }));
}

function igual(a: string, b: string): boolean {
  if (a === b) return true;
  const menor = Math.min(a.length, b.length);
  if (menor >= 8) return distancia(a, b) <= 2;
  if (menor >= 5) return distancia(a, b) <= 1;
  return false;
}

/** Posição onde `trecho` aparece em sequência dentro de `frase` (-1 se não aparece). */
function posicao(frase: string[], trecho: string[]): number {
  for (let i = 0; i + trecho.length <= frase.length; i++) {
    if (trecho.every((t, k) => igual(frase[i + k], t))) return i;
  }
  return -1;
}

/**
 * Palavras compostas: "anti pulgas" / "anti-pulgas" (o hífen vira espaço) e
 * "antipulgas" são o mesmo termo. Junta duas palavras vizinhas quando a união
 * existe do outro lado, e nenhuma delas sozinha existe.
 */
function unirCompostos(tokens: string[], referencia: string[]): string[] {
  const saida: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const proximo = tokens[i + 1];
    if (proximo !== undefined) {
      const junto = radical(tokens[i] + proximo);
      const separadosExistem = referencia.some((r) => igual(r, tokens[i]) || igual(r, proximo));
      if (!separadosExistem && referencia.some((r) => igual(r, junto))) {
        saida.push(junto);
        i++;
        continue;
      }
    }
    saida.push(tokens[i]);
  }
  return saida;
}

function pontuar(ditoBruto: string[], fraseBruta: string[], todas: string[][]): number {
  const dito = unirCompostos(ditoBruto, fraseBruta);
  const frase = unirCompostos(fraseBruta, dito);
  if (dito.length === frase.length && dito.every((t, i) => igual(t, frase[i]))) return 1;

  // Nome do estoque dentro do que foi dito: "pão amanhecido" ⊃ "pão".
  const pos = posicao(dito, frase);
  if (pos >= 0) {
    const sobras = dito.filter((_, i) => i < pos || i >= pos + frase.length);
    // Palavra que muda o produto ("queijo muçarela" não é "queijo" meia cura).
    // Se a sobra é outro nome do mesmo item ("latinha de cerveja"), não muda.
    const mudaProduto = sobras.some(
      (t) => t.length > 2 && !/^\d/.test(t) && !MODIFICADORES.has(t) && !todas.some((f) => f.some((p) => igual(p, t))),
    );
    return mudaProduto ? 0.5 : Math.min(0.99, 0.9 + 0.02 * Math.min(frase.length, 4));
  }

  // O que foi dito é parte do nome: "farinha" ⊂ "farinha de trigo".
  if (posicao(frase, dito) >= 0) return 0.85 * Math.pow(dito.length / frase.length, 0.25);

  const comuns = dito.filter((t) => frase.some((f) => igual(t, f))).length;
  if (!comuns) return 0;
  return (0.75 * comuns) / Math.max(dito.length, frase.length) + (igual(dito[0], frase[0]) ? 0.1 : 0);
}

export interface Casamento<T> {
  item: T;
  pontos: number;
  /** Outro item ficou quase empatado (ex: "ração" num pet shop com várias rações). */
  ambiguo: boolean;
}

export function casarItem<T extends ItemCasavel>(
  nome: string,
  indice: IndiceItens<T>,
  preferir?: CategoriaItem[],
): Casamento<T> | null {
  const dito = chaveTokens(nome);
  if (!dito.length) return null;
  const notas = indice
    .map(({ item, frases }) => {
      let pontos = Math.max(0, ...frases.map((f) => pontuar(dito, f, frases)));
      if (preferir && !preferir.includes(item.categoria)) pontos *= 0.9;
      return { item, pontos };
    })
    .sort((a, b) => b.pontos - a.pontos);
  const [melhor, segundo] = notas;
  if (!melhor || melhor.pontos < LIMIAR_CASAMENTO) return null;
  const ambiguo = !!segundo && segundo.pontos >= LIMIAR_CASAMENTO && melhor.pontos - segundo.pontos < 0.05;
  return { item: melhor.item, pontos: melhor.pontos, ambiguo };
}
