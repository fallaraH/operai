// POST /api/parse — motor híbrido de linguagem natural.
// O interpretador local responde sempre; com chave de IA configurada, a IA é
// consultada só quando o local não tem certeza. Falhou a IA, vale o local.

import { lerContexto } from "@/lib/interpretador/contexto";
import { iaDisponivel, interpretarComIA } from "@/lib/interpretador/ia";
import { interpretarLocal } from "@/lib/interpretador/local";

/** Confiança do local a partir da qual a IA nem é chamada. */
const CONFIANCA_LOCAL = 0.75;

export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    const bruto = await request.text();
    if (bruto.length > 64_000) return Response.json({ ok: false, erro: "Pedido grande demais." }, { status: 413 });
    const lido: unknown = JSON.parse(bruto);
    if (!lido || typeof lido !== "object") throw new Error("corpo");
    corpo = lido as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, erro: "Envie JSON com o campo 'texto'." }, { status: 400 });
  }

  const texto = typeof corpo.texto === "string" ? corpo.texto.trim().slice(0, 500) : "";
  if (!texto) return Response.json({ ok: false, erro: "Envie JSON com o campo 'texto'." }, { status: 400 });
  const contexto = lerContexto(corpo.contexto);
  const motor = corpo.motor === "local" || corpo.motor === "ia" ? corpo.motor : "auto";

  const local = interpretarLocal(texto, contexto);
  const ia = iaDisponivel();
  if (motor === "local" || !ia || (motor === "auto" && local.confianca >= CONFIANCA_LOCAL)) {
    return Response.json({ ok: true, interpretacao: local, ia_disponivel: ia });
  }

  const resposta = await interpretarComIA(texto, contexto);
  if (resposta.ok) return Response.json({ ok: true, interpretacao: resposta.interpretacao, ia_disponivel: true });
  return Response.json({ ok: true, interpretacao: local, ia_disponivel: true, aviso_ia: resposta.erro });
}
