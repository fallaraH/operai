"use client";

import {
  BarChart3,
  CalendarDays,
  Factory,
  Filter,
  Mic,
  Package,
  Target,
  TrafficCone,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Aba } from "@/lib/dominio/tipos";
import { Modal } from "./ui/Modal";

const CONTEUDO: Record<Aba, { titulo: string; subtitulo: string; passos: { Icone: LucideIcon; titulo: string; texto: string }[] }> = {
  painel: {
    titulo: "Painel",
    subtitulo: "A saúde do seu negócio em 5 segundos.",
    passos: [
      { Icone: Wallet, titulo: "Faturamento e lucro do mês", texto: "Tudo o que você vendeu no mês e quanto sobrou depois de descontar o custo dos produtos e as despesas." },
      { Icone: Target, titulo: "Meta semanal", texto: "A barra mostra quanto falta para bater a meta dos últimos 7 dias. Bateu 100%? Tem comemoração na tela." },
      { Icone: BarChart3, titulo: "Entradas vs. saídas", texto: "Compare dia a dia o dinheiro que entrou (vendas) com o que saiu (compras e despesas)." },
      { Icone: Mic, titulo: "Fale, não digite", texto: "Toque no microfone da barra de baixo e diga algo como \"Vendi 30 pães e 4 sonhos por 65 reais\". Prefere digitar? Escreva, ou toque num chip de teste rápido. O OperAI anota e atualiza estoque e caixa na hora; errou? Desfazer ou Editar." },
    ],
  },
  estoque: {
    titulo: "Estoque",
    subtitulo: "Saiba o que está acabando antes de faltar.",
    passos: [
      { Icone: Filter, titulo: "Produtos de venda × Matéria-prima", texto: "Use o filtro para alternar entre o que você vende e os insumos que você usa para produzir." },
      { Icone: TrafficCone, titulo: "Semáforo", texto: "Vermelho = acabou. Amarelo = dura até 3 dias (\"Acabando!\"). Verde = tranquilo por mais de 3 dias." },
      { Icone: Factory, titulo: "Ficha técnica", texto: "Produtos feitos por você mostram a receita. Ex: 1 kg de farinha + 0,2 L de leite = 20 pães. Comprou farinha? A quantidade de pães disponíveis sobe na hora." },
      { Icone: Package, titulo: "Baixa automática", texto: "Ao vender um pão, o OperAI desconta a farinha e o leite proporcionalmente. Sem planilha." },
    ],
  },
  historico: {
    titulo: "Histórico",
    subtitulo: "Tudo o que você registrou, dia a dia.",
    passos: [
      { Icone: CalendarDays, titulo: "Agrupado por dia", texto: "Hoje, Ontem e os dias anteriores, com o total que entrou e saiu em cada um." },
      { Icone: Wallet, titulo: "Cores do dinheiro", texto: "Verde é dinheiro entrando (vendas). Vermelho é dinheiro saindo (compras e despesas)." },
      { Icone: Undo2, titulo: "Errou? Desfaça", texto: "Logo depois de anotar, o botão Desfazer volta tudo como era em um clique." },
    ],
  },
};

interface Props {
  aba: Aba;
  aberto: boolean;
  aoFechar: () => void;
}

export function ModalTutorial({ aba, aberto, aoFechar }: Props) {
  const c = CONTEUDO[aba];
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Como funciona: ${c.titulo}`}
      subtitulo={c.subtitulo}
      rodape={
        <button
          type="button"
          onClick={aoFechar}
          className="w-full rounded-lg bg-emerald-600 py-3 text-[15px] font-semibold text-white transition hover:bg-emerald-700"
        >
          Entendi!
        </button>
      }
    >
      <ol className="space-y-3">
        {c.passos.map(({ Icone, titulo, texto }, i) => (
          <li key={titulo} className="flex gap-3 rounded-lg border border-zinc-200 p-3">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-50 text-zinc-700">
              <Icone className="size-[18px]" strokeWidth={1.75} />
              <span className="num absolute -top-1.5 -left-1.5 grid size-4.5 place-items-center rounded-full bg-zinc-900 text-[10px] text-white">
                {i + 1}
              </span>
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900">{titulo}</span>
              <span className="block text-[13px] leading-snug text-zinc-600">{texto}</span>
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
