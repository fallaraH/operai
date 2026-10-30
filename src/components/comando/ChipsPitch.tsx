"use client";

import { PackagePlus, Receipt, ShoppingBag, Sparkles, Target, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Chip, TipoChip } from "@/lib/chips";

const VISUAL: Record<TipoChip, { Icone: LucideIcon; cor: string }> = {
  compra: { Icone: PackagePlus, cor: "text-zinc-500" },
  repor: { Icone: TriangleAlert, cor: "text-amber-600" },
  venda: { Icone: ShoppingBag, cor: "text-emerald-700" },
  meta: { Icone: Target, cor: "text-emerald-300" },
  perda: { Icone: Trash2, cor: "text-red-600" },
  despesa: { Icone: Receipt, cor: "text-zinc-500" },
  novo: { Icone: Sparkles, cor: "text-emerald-700" },
};

interface Props {
  chips: Chip[];
  desabilitado: boolean;
  aoEscolher: (chip: Chip) => void;
}

/** Fileira rolável de testes rápidos: um toque preenche a barra e executa. */
export function ChipsPitch({ chips, desabilitado, aoEscolher }: Props) {
  if (!chips.length) return null;
  return (
    <ul className="sem-barra -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-2" aria-label="Testes rápidos">
      {chips.map((chip) => {
        const { Icone, cor } = VISUAL[chip.tipo];
        const meta = chip.tipo === "meta";
        return (
          <li key={chip.id} className="shrink-0">
            <button
              type="button"
              disabled={desabilitado}
              onClick={() => aoEscolher(chip)}
              title={chip.texto}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition active:scale-[0.98] disabled:opacity-50 ${
                meta ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              <Icone className={`size-3.5 ${cor}`} strokeWidth={2} aria-hidden />
              {chip.rotulo}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
