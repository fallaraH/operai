"use client";

import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PontoDiario } from "@/lib/dominio/metricas";
import { moeda } from "@/lib/formatar";
import { CARTAO, TituloSecao } from "../ui/Cartao";

const COR = {
  entradaHoje: "#047857",
  entrada: "#a7f3d0",
  saidaHoje: "#be123c",
  saida: "#fecdd3",
};

interface FormaProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: PontoDiario;
}

/** Barra com cantos arredondados; a de hoje é mais forte e pulsa. */
function formaBarra(corHoje: string, cor: string) {
  return function Forma(props: FormaProps) {
    const hoje = props.payload?.hoje === true;
    return (
      <Rectangle
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        radius={[3, 3, 0, 0]}
        fill={hoje ? corHoje : cor}
        className={hoje ? "animate-pulsar-barra" : undefined}
      />
    );
  };
}

const FormaEntrada = formaBarra(COR.entradaHoje, COR.entrada);
const FormaSaida = formaBarra(COR.saidaHoje, COR.saida);

function TickDia({ x, y, payload, hoje }: { x?: number; y?: number; payload?: { value: string }; hoje: string }) {
  const ehHoje = payload?.value === hoje;
  return (
    <text x={x} y={(y ?? 0) + 14} textAnchor="middle" fontSize={11} fontWeight={ehHoje ? 600 : 400} fill={ehHoje ? "#18181b" : "#71717a"}>
      {payload?.value}
    </text>
  );
}

function compacto(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace(".", ",")}k`;
  return String(v);
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: PontoDiario }[];
}

function DicaDia({ active, payload }: TooltipProps) {
  const ponto = payload?.[0]?.payload;
  if (!active || !ponto) return null;
  const data = new Date(ponto.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-zinc-900 capitalize">{ponto.hoje ? `Hoje, ${data}` : data}</p>
      <p className="flex items-center gap-1.5 text-zinc-600">
        <span className="size-2 rounded-full" style={{ background: COR.entradaHoje }} /> Entrou{" "}
        <strong className="ml-auto pl-3 text-emerald-700 num">{moeda(ponto.entradas)}</strong>
      </p>
      <p className="flex items-center gap-1.5 text-zinc-600">
        <span className="size-2 rounded-full" style={{ background: COR.saidaHoje }} /> Saiu{" "}
        <strong className="ml-auto pl-3 text-rose-700 num">{moeda(ponto.saidas)}</strong>
      </p>
    </div>
  );
}

export function GraficoEntradasSaidas({ serie }: { serie: PontoDiario[] }) {
  const hoje = serie.find((p) => p.hoje);
  const vazio = serie.every((p) => p.entradas === 0 && p.saidas === 0);
  const resumo = serie.map((p) => `${p.rotulo}: entrou ${moeda(p.entradas)}, saiu ${moeda(p.saidas)}`).join("; ");

  return (
    <section className={`${CARTAO} p-4`}>
      <div className="flex items-center gap-2">
        <TituloSecao Icone={BarChart3} titulo="Entradas vs. saídas" subtitulo="7 dias" />
        <ul className="flex gap-3 text-[11px] font-medium text-zinc-500" aria-hidden>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COR.entradaHoje }} /> Entradas
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COR.saidaHoje }} /> Saídas
          </li>
        </ul>
      </div>

      {vazio ? (
        <p className="mt-4 rounded-xl bg-zinc-50 p-6 text-center text-sm text-zinc-500">Sem movimento nos últimos 7 dias.</p>
      ) : (
        <div className="mt-3 h-56 w-full" role="img" aria-label={`Entradas versus saídas por dia. ${resumo}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 4" />
              <XAxis dataKey="rotulo" axisLine={false} tickLine={false} interval={0} tick={<TickDia hoje="Hoje" />} />
              <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11, fill: "#a1a1aa", fontFamily: "var(--font-mono)" }} tickFormatter={compacto} />
              <Tooltip cursor={{ fill: "rgba(24, 24, 27, 0.04)" }} content={<DicaDia />} />
              <Bar dataKey="entradas" name="Entradas" shape={FormaEntrada} maxBarSize={22} />
              <Bar dataKey="saidas" name="Saídas" shape={FormaSaida} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hoje && !vazio && (
        <p className="mt-2 flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <span className="font-semibold text-zinc-900">Hoje</span>
          <span>
            entrou <strong className="text-emerald-700 num">{moeda(hoje.entradas)}</strong>
          </span>
          <span>
            saiu <strong className="text-rose-700 num">{moeda(hoje.saidas)}</strong>
          </span>
        </p>
      )}
    </section>
  );
}
