// Modelo de dados do OperAI. Arquivo só de tipos (sem valores em runtime).

import type { NomeIcone } from "../icones";

/**
 * - `revenda`: comprado pronto e vendido pronto (ex: ração, refrigerante).
 * - `insumo`: matéria-prima comprada em lote (ex: farinha kg, leite L).
 * - `producao_propria`: produto final feito a partir de insumos (ex: pão francês).
 *   A disponibilidade NÃO é armazenada: é derivada dos insumos pela ficha técnica.
 */
export type CategoriaItem = "revenda" | "insumo" | "producao_propria";

export type Unidade = "un" | "kg" | "g" | "L" | "ml" | "m" | "pct" | "cx" | "dz" | "par" | "rolo";

export type ModoOperacao = "revenda" | "producao" | "hibrido";

export type Nicho = "padaria" | "petshop" | "roupas" | "mercado" | "personalizado";

export interface IngredienteFicha {
  insumoId: string;
  /** Quantidade do insumo (na unidade do insumo) consumida por lote. */
  quantidade: number;
}

/**
 * Ficha Técnica Simplificada: um lote consome `ingredientes` e rende `rendimento`
 * unidades do produto final. Ex: 1 kg farinha + 0,2 L leite => 20 pães.
 */
export interface FichaTecnica {
  rendimento: number;
  ingredientes: IngredienteFicha[];
}

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: CategoriaItem;
  unidade: Unidade;
  /** Estoque físico. Ignorado em `producao_propria` (derivado da ficha). */
  quantidade: number;
  /** Custo por unidade. Em `producao_propria` é calculado pela ficha. */
  custoUnitario: number;
  /** Preço de venda por unidade (revenda e producao_propria). */
  precoVenda?: number;
  /** Ficha técnica (apenas `producao_propria`). */
  ficha?: FichaTecnica;
  /** Média de consumo/venda por dia usada quando ainda não há histórico. */
  consumoDiarioEstimado?: number;
  /** Outros nomes que o comerciante usa ("pãozinho", "cacetinho"...). */
  apelidos?: string[];
}

/**
 * `perda`: item estragado, vencido ou descartado. Baixa o estoque como uma venda,
 * mas sem entrada de dinheiro: `valor` é o custo perdido e pesa só no lucro.
 */
export type TipoTransacao = "venda" | "compra" | "despesa" | "perda";

export type OrigemTransacao = "seed" | "texto" | "voz" | "foto" | "chip";

export interface LinhaTransacao {
  /** Ausente quando o item ainda não está cadastrado no estoque. */
  itemId?: string;
  nome: string;
  quantidade: number;
  unidade: Unidade;
  valorUnitario?: number;
}

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  /** Epoch em ms. */
  timestamp: number;
  descricao: string;
  /** Valor total (sempre positivo; o tipo define se entra ou sai). */
  valor: number;
  itens: LinhaTransacao[];
  /** Venda: custo dos itens vendidos no momento da venda (para o lucro). */
  custoEstimado?: number;
  /** Categoria livre para despesas (energia, gás, aluguel...). */
  categoriaDespesa?: string;
  /** Cliente (venda) ou fornecedor (compra) citado no comando. */
  contraparte?: string;
  /** Chip de teste rápido que originou o registro (some da fileira enquanto o registro existir). */
  chipId?: string;
  origem: OrigemTransacao;
}

export interface Negocio {
  id: string;
  nome: string;
  nicho: Nicho;
  /** Ramo informado pelo usuário (ex: "Hamburgueria"). */
  ramo: string;
  /** Ícone vetorial do negócio; sem ele, sai do ramo. */
  icone?: NomeIcone;
  modo: ModoOperacao;
  metaSemanal: number;
  itens: ItemEstoque[];
  transacoes: Transacao[];
  /**
   * Média diária usada para estimar os dias do mês anteriores ao histórico
   * detalhado de 7 dias (somente negócios de demonstração).
   */
  mediaDiariaAnterior?: { faturamento: number; lucro: number };
  preConfigurado: boolean;
}

export type Aba = "painel" | "estoque" | "historico";

export interface EstadoApp {
  versao: 1;
  negocioAtivoId: string;
  /** Ordem de exibição no seletor. */
  ordem: string[];
  negocios: Record<string, Negocio>;
  /** Dia local (AAAA-MM-DD) em que os dados de demonstração foram gerados. */
  diaBase: string;
  /** Versão das sementes de demonstração; mudou, os negócios intocados são refeitos. */
  versaoDados?: number;
}

export type CorSemaforo = "vermelho" | "amarelo" | "verde";
