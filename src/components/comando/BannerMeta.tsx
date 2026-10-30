"use client";

import { Trophy } from "lucide-react";

/** Faixa de celebração sobre a tela toda; não bloqueia toques. */
export function BannerMeta() {
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[13%] z-[80] flex justify-center px-4">
      <div className="animate-subir flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-white shadow-lg">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-600">
          <Trophy className="size-5" strokeWidth={2} />
        </span>
        <div>
          <p className="text-lg leading-tight font-semibold">Meta da semana batida!</p>
          <p className="text-xs text-zinc-400">As vendas dos últimos 7 dias passaram da meta.</p>
        </div>
      </div>
    </div>
  );
}
