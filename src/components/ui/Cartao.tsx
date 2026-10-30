import type { LucideIcon } from "lucide-react";

/** Cartão padrão: branco, borda fina e nítida, sombra mínima. */
export const CARTAO = "rounded-xl border border-zinc-200/80 bg-white shadow-xs";

/** Título de seção: ícone neutro + nome; nada de ladrilho colorido. */
export function TituloSecao({ Icone, titulo, subtitulo }: { Icone: LucideIcon; titulo: string; subtitulo?: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Icone className="size-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
      <h2 className="text-[14px] font-semibold text-zinc-900">{titulo}</h2>
      {subtitulo && <span className="truncate text-xs text-zinc-400">{subtitulo}</span>}
    </div>
  );
}
