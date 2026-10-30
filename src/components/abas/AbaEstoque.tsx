"use client";

import { ChevronDown, CircleCheck, Factory, PackageOpen, ShoppingBag, TriangleAlert, Wheat, CircleX } from "lucide-react";
import { useMemo, useState } from "react";
import { indexarItens, produtosQueUsam, situacaoEstoque, type SituacaoItem } from "@/lib/dominio/estoque";
import type { CategoriaItem, CorSemaforo, Negocio } from "@/lib/dominio/tipos";
import { diasCobertura, moeda, quantidade } from "@/lib/formatar";
import { iconeDoItem } from "@/lib/icones";
import { CARTAO } from "../ui/Cartao";
import { Icone } from "../ui/Icone";
import { TOM_OPERACAO, TOM_RECEITA, tomDaCategoria } from "../ui/tons";
import { useAposMontar } from "../ui/useAposMontar";

type Filtro = "venda" | "insumo";

/** A barra de nível enche até este número de dias de cobertura. */
const DIAS_BARRA_CHEIA = 7;

const ROTULO_CATEGORIA: Record<CategoriaItem, string> = {
  revenda: "Revenda",
  insumo: "Matéria-prima",
  producao_propria: "Produção própria",
};

const ESTILO: Record<CorSemaforo, { barra: string; texto: string; luz: string }> = {
  vermelho: { barra: "bg-red-600", texto: "text-red-700", luz: "bg-red-600" },
  amarelo: { barra: "bg-amber-500", texto: "text-amber-700", luz: "bg-amber-500" },
  verde: { barra: "bg-emerald-600", texto: "text-emerald-700", luz: "bg-emerald-600" },
};

const PESO_COR: Record<CorSemaforo, number> = { vermelho: 0, amarelo: 1, verde: 2 };

/** Mais urgente primeiro: cor, depois menos dias de cobertura (Infinity = sem consumo). */
function porUrgencia(a: SituacaoItem, b: SituacaoItem): number {
  if (PESO_COR[a.cor] !== PESO_COR[b.cor]) return PESO_COR[a.cor] - PESO_COR[b.cor];
  if (a.diasCobertura !== b.diasCobertura) return a.diasCobertura < b.diasCobertura ? -1 : 1;
  return a.item.nome.localeCompare(b.item.nome, "pt-BR");
}

const ehInsumo = (s: SituacaoItem) => s.item.categoria === "insumo";

interface Props {
  negocio: Negocio;
  agora: number;
}

export function AbaEstoque({ negocio, agora }: Props) {
  const situacao = useMemo(() => situacaoEstoque(negocio, agora), [negocio, agora]);
  const temInsumos = situacao.some(ehInsumo);
  const [filtro, setFiltro] = useState<Filtro>("venda");
  const mostrarFiltro = temInsumos || negocio.modo !== "revenda";
  const filtroAtivo: Filtro = mostrarFiltro ? filtro : "venda";

  const visiveis = situacao.filter((s) => ehInsumo(s) === (filtroAtivo === "insumo")).sort(porUrgencia);
  const alertasDo = (f: Filtro) => situacao.filter((s) => ehInsumo(s) === (f === "insumo") && s.cor !== "verde").length;
  const emFalta = situacao.filter((s) => s.cor === "vermelho").length;
  const acabando = situacao.filter((s) => s.cor === "amarelo").length;

  if (situacao.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500">
          <PackageOpen className="size-7" strokeWidth={1.75} />
        </span>
        <h2 className="mt-4 text-base font-semibold text-zinc-900">Seu estoque está vazio</h2>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          {negocio.modo === "revenda"
            ? "Registre uma compra de mercadoria e ela aparece aqui automaticamente."
            : "Registre a compra da sua matéria-prima e cadastre o que você produz com ela."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(emFalta > 0 || acabando > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-zinc-600">
          {emFalta > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-600" /> <span className="num text-zinc-900">{emFalta}</span> esgotado{emFalta > 1 && "s"}
            </span>
          )}
          {acabando > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" /> <span className="num text-zinc-900">{acabando}</span> acabando
            </span>
          )}
        </div>
      )}

      {mostrarFiltro && (
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1" role="tablist" aria-label="Tipo de item">
          {(
            [
              ["venda", "Produtos Finais / Revenda", ShoppingBag, TOM_RECEITA.texto],
              ["insumo", "Matéria-Prima (Insumos)", Wheat, TOM_OPERACAO.texto],
            ] as const
          ).map(([valor, rotulo, IconeFiltro, corIcone]) => {
            const ativo = filtroAtivo === valor;
            const n = alertasDo(valor);
            return (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setFiltro(valor)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[12.5px] leading-tight font-medium transition ${
                  ativo ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <IconeFiltro className={`size-4 shrink-0 ${corIcone}`} strokeWidth={1.75} />
                <span className="text-left">{rotulo}</span>
                {n > 0 && (
                  <span className="num grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-zinc-900 px-1 text-[10px] text-white" aria-label={`${n} alertas`}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-500">
          {filtroAtivo === "insumo" ? "Nenhuma matéria-prima cadastrada ainda." : "Nenhum produto cadastrado ainda."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((s) => (
            <CartaoItem key={s.item.id} s={s} negocio={negocio} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Três luzes: a ativa acende com transição; as outras ficam apagadas. */
function Semaforo({ cor }: { cor: CorSemaforo }) {
  const luzes: { id: CorSemaforo; rotulo: string }[] = [
    { id: "vermelho", rotulo: "esgotado" },
    { id: "amarelo", rotulo: "acabando" },
    { id: "verde", rotulo: "tranquilo" },
  ];
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-1"
      role="img"
      aria-label={`Semáforo: ${luzes.find((l) => l.id === cor)?.rotulo}`}
    >
      {luzes.map((l) => (
        <span
          key={l.id}
          className={`size-2.5 rounded-full transition-colors duration-500 ${l.id === cor ? ESTILO[l.id].luz : "bg-zinc-200"}`}
        />
      ))}
    </span>
  );
}

function Selo({ cor }: { cor: CorSemaforo }) {
  if (cor === "amarelo") {
    return (
      <span className="animate-pulsar-selo flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        <TriangleAlert className="size-3" /> Acabando!
      </span>
    );
  }
  if (cor === "vermelho") {
    return (
      <span className="animate-surgir flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        <CircleX className="size-3" /> Esgotado
      </span>
    );
  }
  return (
    <span className="animate-surgir flex items-center gap-1 text-[11px] font-medium text-emerald-700">
      <CircleCheck className="size-3" /> Tranquilo
    </span>
  );
}

function CartaoItem({ s, negocio }: { s: SituacaoItem; negocio: Negocio }) {
  const { item, cor } = s;
  const tom = tomDaCategoria(item.categoria);
  // Verde = nível saudável, na cor da categoria; vermelho/amarelo seguem o semáforo.
  const estilo = cor === "verde" ? { barra: tom.barra, texto: tom.texto } : ESTILO[cor];
  const montado = useAposMontar();
  const mapa = indexarItens(negocio.itens);
  const usadoEm = ehInsumo(s) ? produtosQueUsam(item.id, negocio.itens) : [];
  const fabricado = item.categoria === "producao_propria";

  const nivel = s.disponivel <= 0 ? 0 : Number.isFinite(s.diasCobertura) ? Math.min(1, s.diasCobertura / DIAS_BARRA_CHEIA) : 1;
  const comConsumo = s.consumoDiario > 0;

  return (
    <li className={`${CARTAO} p-3.5`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg border ${tom.badge}`}>
          <Icone nome={iconeDoItem(item.nome)} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-900">{item.nome}</p>
            <Semaforo cor={cor} />
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            <span className={`mr-1 inline-block rounded border px-1.5 py-px text-[10.5px] font-medium ${tom.etiqueta}`}>
              {ROTULO_CATEGORIA[item.categoria]}
            </span>
            {item.precoVenda !== undefined && (
              <>
                {" · vende a "}
                <span className="num">{moeda(item.precoVenda)}</span>
              </>
            )}
            {" · custo "}
            <span className="num">{moeda(s.custoUnitario)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-sm">
          <span className="num text-lg font-medium text-zinc-900">{quantidade(s.disponivel, item.unidade)}</span>
          <span className="text-zinc-500">{fabricado ? " disponíveis" : " em estoque"}</span>
        </p>
        <Selo cor={cor} />
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${estilo.barra}`}
          style={{ width: montado ? `${nivel * 100}%` : "0%" }}
        />
      </div>
      <p className={`mt-1.5 text-xs font-medium ${estilo.texto}`}>
        {s.disponivel <= 0 ? "Acabou: hora de repor." : comConsumo ? `${diasCobertura(s.diasCobertura)} · ` : "Sem vendas recentes para estimar a duração."}
        {s.disponivel > 0 && comConsumo && (
          <span className="num font-normal text-zinc-500">
            {quantidade(s.disponivel, item.unidade)} ÷ {quantidade(s.consumoDiario, item.unidade)}/dia
          </span>
        )}
      </p>

      {fabricado && item.ficha && (
        <div className="mt-3 rounded-lg border border-violet-500/15 bg-violet-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
            <Factory className={`size-3.5 ${TOM_OPERACAO.texto}`} strokeWidth={1.75} /> Com a matéria-prima atual dá pra produzir
          </p>
          <p className="num mt-0.5 text-xl leading-tight font-medium text-zinc-900">{quantidade(s.disponivel, item.unidade)}</p>
          {s.insumoLimitante && (
            <p className="text-xs text-zinc-600">
              {s.disponivel <= 0 ? "Falta" : "Quem limita:"} <span className="font-medium text-zinc-900">{s.insumoLimitante.nome}</span> (
              <span className="num">{quantidade(s.insumoLimitante.quantidade, s.insumoLimitante.unidade)}</span> no estoque)
            </p>
          )}
          <details className="group mt-2 text-xs text-zinc-700">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-violet-700">
              Ficha técnica <ChevronDown className="size-3.5 transition group-open:rotate-180" />
            </summary>
            <p className="mt-1">
              {item.ficha.ingredientes.map((ing, i) => {
                const insumo = mapa.get(ing.insumoId);
                return (
                  <span key={ing.insumoId} className={s.insumoLimitante?.id === ing.insumoId ? "font-semibold text-red-700" : undefined}>
                    {i > 0 && " + "}
                    <span className="num">{quantidade(ing.quantidade, insumo?.unidade ?? "un")}</span> {insumo?.nome ?? "insumo removido"}
                  </span>
                );
              })}
              {" = "}
              <span className="num font-semibold">{quantidade(item.ficha.rendimento, item.unidade)}</span>
            </p>
          </details>
        </div>
      )}

      {usadoEm.length > 0 && (
        <p className="mt-2.5 text-xs text-zinc-500">
          Usado em: <span className="font-medium text-emerald-700">{usadoEm.map((p) => p.nome).join(", ")}</span>
        </p>
      )}
    </li>
  );
}
