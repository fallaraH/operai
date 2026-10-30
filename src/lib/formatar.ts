import type { LinhaTransacao, Unidade } from "./dominio/tipos";

const moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCurtaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const numeroFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function moeda(valor: number): string {
  return moedaFmt.format(valor);
}

export function moedaCurta(valor: number): string {
  return moedaCurtaFmt.format(valor);
}

export function numero(valor: number): string {
  return numeroFmt.format(valor);
}

export const NOME_UNIDADE: Record<Unidade, string> = {
  un: "un",
  kg: "kg",
  g: "g",
  L: "L",
  ml: "ml",
  m: "m",
  pct: "pct",
  cx: "cx",
  dz: "dz",
  par: "par",
  rolo: "rolo",
};

/** "12 un", "2,5 kg", "3 pares". */
export function quantidade(valor: number, unidade: Unidade): string {
  const n = numero(valor);
  if (unidade === "par") return `${n} ${valor === 1 ? "par" : "pares"}`;
  if (unidade === "rolo") return `${n} ${valor === 1 ? "rolo" : "rolos"}`;
  return `${n} ${NOME_UNIDADE[unidade]}`;
}

/** "30× Pão Francês, 4× Sonho e 2 kg Ração a Granel". */
export function descreverLinhas(linhas: Pick<LinhaTransacao, "nome" | "quantidade" | "unidade">[]): string {
  const partes = linhas.map((l) =>
    l.unidade === "un" ? `${numero(l.quantidade)}× ${l.nome}` : `${quantidade(l.quantidade, l.unidade)} ${l.nome}`,
  );
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

export function hora(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Dia local no formato AAAA-MM-DD. */
export function chaveDia(ts: number): string {
  const d = new Date(ts);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function diasCobertura(dias: number): string {
  if (!Number.isFinite(dias)) return "sem consumo recente";
  if (dias < 1) return "acaba hoje";
  const n = Math.floor(dias * 10) / 10; // trunca: "2,96" nunca vira "3,0" (verde)
  return `dura ${numeroFmt.format(n)} ${n === 1 ? "dia" : "dias"}`;
}
