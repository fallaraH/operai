import { descreverLinhas, moeda } from "../formatar";
import type { Interpretacao } from "./tipos";

type Base = Pick<
  Interpretacao,
  "tipo_movimentacao" | "cliente_ou_fornecedor" | "itens" | "valor_total_operacao" | "categoria_despesa"
>;

/** "Entendi: compra de 50 kg Farinha de Trigo e 20 L Leite Integral por R$ 320,00." */
export function mensagemConfirmacao(i: Base): string {
  const itens = descreverLinhas(
    i.itens.map((it) => ({ nome: it.nome_canonico, quantidade: it.quantidade ?? 1, unidade: it.unidade_medida })),
  );
  const valor = i.valor_total_operacao;
  const preco = valor !== null ? ` por ${moeda(valor)}` : "";
  const quem = i.cliente_ou_fornecedor;
  switch (i.tipo_movimentacao) {
    case "entrada":
      return `Entendi: compra de ${itens || "mercadoria"}${preco}${quem ? ` (${quem})` : ""}.`;
    case "saida_venda":
      return `Entendi: venda de ${itens || "valor avulso"}${preco}${quem ? ` para ${quem}` : ""}.`;
    case "saida_perda":
      return `Entendi: perda de ${itens || "mercadoria"}${valor !== null ? ` (${moeda(valor)})` : ""}.`;
    case "despesa": {
      const oque = i.itens[0]?.nome_canonico ?? i.categoria_despesa ?? "gasto";
      return `Entendi: despesa com ${oque.toLowerCase()}${valor !== null ? ` de ${moeda(valor)}` : ""}.`;
    }
  }
}
