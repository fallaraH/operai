// Lado do navegador: pergunta à rota /api/parse e, sem rede ou com erro,
// interpreta ali mesmo com o motor local (o app funciona offline).

import type { Negocio } from "../dominio/tipos";
import { contextoDoNegocio } from "./contexto";
import { interpretarLocal } from "./local";
import { sanitizarInterpretacao } from "./sanitizar";
import type { Interpretacao } from "./tipos";

export async function interpretarComando(texto: string, negocio: Negocio): Promise<Interpretacao> {
  const contexto = contextoDoNegocio(negocio);
  try {
    const resposta = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, contexto }),
      signal: AbortSignal.timeout(20_000),
    });
    if (resposta.ok) {
      const dados = (await resposta.json()) as { interpretacao?: unknown };
      const interpretacao = sanitizarInterpretacao(dados.interpretacao, texto);
      if (interpretacao) return interpretacao;
    }
  } catch {
    // Sem rede ou rota fora do ar: segue no navegador.
  }
  return interpretarLocal(texto, contexto);
}
