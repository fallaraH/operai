// Fiado com cobrança pelo WhatsApp, 100% no navegador: o link oficial `wa.me`
// abre o app (celular) ou o WhatsApp Web (computador) com a mensagem pronta.

import type { Negocio, Transacao } from "./dominio/tipos";
import { moeda, quantidade } from "./formatar";

/** A cobrança automática (simulada) acontece 3 dias depois da venda. */
export const PRAZO_FIADO_MS = 3 * 24 * 60 * 60 * 1000;

/** Só os dígitos, sem o +55 (até DDD + 9 dígitos). */
export function digitosTelefone(texto: string): string {
  let d = texto.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

/** Máscara progressiva: "11987" → "(11) 987", "11987654321" → "(11) 98765-4321". */
export function mascararTelefone(texto: string): string {
  const d = digitosTelefone(texto);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 5) return `(${ddd}) ${resto}`;
  const corte = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Celular com DDD (10 ou 11 dígitos; DDD não começa com 0). */
export function telefoneValido(texto: string): boolean {
  const d = digitosTelefone(texto);
  return (d.length === 10 || d.length === 11) && !d.startsWith("0");
}

/** Link oficial do WhatsApp com a mensagem já escrita (DDI +55). */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/55${digitosTelefone(telefone)}?text=${encodeURIComponent(mensagem)}`;
}

export const vencimentoDo = (t: Transacao): number => t.timestamp + PRAZO_FIADO_MS;

const dataBr = (ts: number) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function listaItens(t: Transacao): string {
  if (!t.itens.length) return `• ${t.descricao}`;
  return t.itens.map((l) => `• ${quantidade(l.quantidade, l.unidade)} ${l.nome}`).join("\n");
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/).find((p) => !/^(seu|dona|dna|sr|sra|dr|dra)\.?$/i.test(p)) ?? nome;

/** Mensagem enviada logo após a venda: comprovante + vencimento em 3 dias. */
export function mensagemCobranca(negocio: Negocio, t: Transacao, cliente: string): string {
  const quem = cliente.trim() ? primeiroNome(cliente) : "tudo bem";
  return [
    `Olá, ${quem}! Aqui é da ${negocio.nome}.`,
    "",
    `Segue o comprovante da sua compra no fiado de ${dataBr(t.timestamp)}:`,
    listaItens(t),
    "",
    `*Total: ${moeda(t.valor)}*`,
    `Vencimento: ${dataBr(vencimentoDo(t))} (em 3 dias).`,
    "",
    "Pode pagar no Pix ou direto no balcão. Obrigado pela preferência!",
  ].join("\n");
}

/** Lembrete da dívida, para os botões "Cobrar no WhatsApp". */
export function mensagemLembrete(negocio: Negocio, t: Transacao, agora: number): string {
  const cliente = t.contraparte?.trim();
  const vencido = agora >= vencimentoDo(t);
  return [
    `Olá${cliente ? `, ${primeiroNome(cliente)}` : ""}! Aqui é da ${negocio.nome}.`,
    "",
    `Passando para lembrar do fiado de ${dataBr(t.timestamp)}:`,
    listaItens(t),
    "",
    `*Valor em aberto: ${moeda(t.valor)}*`,
    vencido ? `O vencimento foi em ${dataBr(vencimentoDo(t))}.` : `Vence em ${dataBr(vencimentoDo(t))}.`,
    "",
    "Pode acertar no Pix ou no balcão. Obrigado!",
  ].join("\n");
}

/** "2d 23h 59m 12s" até a próxima cobrança; `null` quando já venceu. */
export function tempoAteCobranca(t: Transacao, agora: number): string | null {
  const resta = vencimentoDo(t) - agora;
  if (resta <= 0) return null;
  const s = Math.floor(resta / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(seg).padStart(2, "0")}s`;
}
