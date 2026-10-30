"use client";

import { History, LayoutDashboard, Package, type LucideIcon } from "lucide-react";
import type { Aba } from "@/lib/dominio/tipos";

const ABAS: { id: Aba; rotulo: string; Icone: LucideIcon }[] = [
  { id: "painel", rotulo: "Painel", Icone: LayoutDashboard },
  { id: "estoque", rotulo: "Estoque", Icone: Package },
  { id: "historico", rotulo: "Histórico", Icone: History },
];

interface Props {
  aba: Aba;
  aoTrocar: (aba: Aba) => void;
  alertasEstoque: number;
}

export function NavInferior({ aba, aoTrocar, alertasEstoque }: Props) {
  return (
    <nav
      aria-label="Navegação principal"
      className="border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-3">
        {ABAS.map(({ id, rotulo, Icone }) => {
          const ativa = id === aba;
          const badge = id === "estoque" && alertasEstoque > 0 ? alertasEstoque : 0;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => aoTrocar(id)}
                aria-current={ativa ? "page" : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium transition ${
                  ativa ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <span className={`absolute top-0 h-0.5 w-10 rounded-full transition ${ativa ? "bg-emerald-600" : "bg-transparent"}`} />
                <span className="relative">
                  <Icone className="size-[22px]" strokeWidth={ativa ? 2 : 1.75} />
                  {badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center num rounded-full bg-red-600 px-1 text-[10px] text-white ring-2 ring-white"
                      aria-label={`${badge} ${badge === 1 ? "alerta" : "alertas"} de estoque`}
                    >
                      {badge}
                    </span>
                  )}
                </span>
                {rotulo}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
