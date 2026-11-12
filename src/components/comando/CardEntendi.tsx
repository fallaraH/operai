"use client";

import { ArrowRight, Check, CircleCheck, Factory, Package, Pencil, Undo2, Wallet, Wheat, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type ReactNode } from "react";
import type { MudancaDisponibilidade } from "@/lib/dominio/estoque";
import type { Negocio, Transacao } from "@/lib/dominio/tipos";
import { moeda, quantidade } from "@/lib/formatar";
import type { EdicaoCard } from "@/lib/interpretador/edicao";
import { renomearNoRegistro, type ResultadoComando } from "@/lib/store";
import { visualDa } from "../ui/visualTransacao";
import { TOM_OPERACAO, TOM_RECEITA } from "../ui/tons";
import { FormEdicao } from "./FormEdicao";
import { PerguntaItemNovo } from "./PerguntaItemNovo";

const DURACAO_MS = 10_000;
const MAX_MUDANCAS = 4;
const CATEGORIAS_SINISTRO = ["Sinistros", "Multas", "Prejuízos"];

interface Props {
  resultado: ResultadoComando;
  negocio: Negocio;
  /** Fecha e consolida: este registro não volta a abrir card. */
  aoFechar: () => void;
  aoDesfazer: () => void;
  /** Desfaz este registro e lança de novo com as correções (o card fecha). */
  aoReaplicar: (transacao: Transacao, edicao: EdicaoCard) => void;
  /** Confirmar, ou última pergunta de item novo respondida: o card fecha com este resumo. */
  aoConcluir: (resumo: string) => void;
}

/**
 * Contagem regressiva com um único `setTimeout`: pausar guarda o tempo restante,
 * retomar agenda só o que falta, e qualquer saída de cena limpa o timer.
 */
function useContagem(ativa: boolean, pausada: boolean, aoTerminar: () => void) {
  const restante = useRef(DURACAO_MS);
  const terminar = useRef(aoTerminar);
  useEffect(() => {
    terminar.current = aoTerminar;
  });
  useEffect(() => {
    if (!ativa) {
      restante.current = DURACAO_MS;
      return;
    }
    if (pausada) return;
    const inicio = Date.now();
    const timer = window.setTimeout(() => terminar.current(), restante.current);
    return () => {
      window.clearTimeout(timer);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio));
    };
  }, [ativa, pausada]);
}

function Mudancas({ mudancas, negocio }: { mudancas: MudancaDisponibilidade[]; negocio: Negocio }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {mudancas.slice(0, MAX_MUDANCAS).map((m) => {
        const subiu = m.depois > m.antes;
        return (
          <li key={m.itemId} className="flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate text-zinc-700">{negocio.itens.find((i) => i.id === m.itemId)?.nome ?? m.nome}</span>
            <span className="num text-zinc-400">{quantidade(m.antes, m.unidade)}</span>
            <ArrowRight className="size-3 shrink-0 text-zinc-400" aria-label="para" />
            <span className={`num font-medium ${subiu ? "text-emerald-700" : "text-red-700"}`}>{quantidade(m.depois, m.unidade)}</span>
          </li>
        );
      })}
      {mudancas.length > MAX_MUDANCAS && <li className="text-xs text-zinc-400">e mais {mudancas.length - MAX_MUDANCAS}</li>}
    </ul>
  );
}

function Passo({ Icone, titulo, tom, children }: { Icone: LucideIcon; titulo: string; tom: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 border-t border-zinc-100 py-2 first:border-t-0">
      <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${tom}`}>
        <Icone className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{titulo}</p>
        {children}
      </div>
    </li>
  );
}

function linhaValor(t: Transacao, valorUnitario: number | undefined, qtd: number): string {
  if (t.tipo === "perda" || !valorUnitario) return "";
  return moeda(valorUnitario * qtd);
}

/** Troca o nome (ou a descrição) no lugar: Enter salva, Esc cancela. */
function RenomearInline({ inicial, rotulo, aoSalvar, aoCancelar }: { inicial: string; rotulo: string; aoSalvar: (nome: string) => void; aoCancelar: () => void }) {
  const [nome, setNome] = useState(inicial);
  const vazio = !nome.trim();
  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!vazio) aoSalvar(nome.trim());
  }
  return (
    <form onSubmit={salvar} className="flex min-w-0 flex-1 items-center gap-1" aria-label={rotulo}>
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && aoCancelar()}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={rotulo}
        aria-invalid={vazio}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
      <button type="submit" disabled={vazio} className="rounded-md bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-700 disabled:opacity-40" aria-label="Salvar nome">
        <Check className="size-4" />
      </button>
      <button type="button" onClick={aoCancelar} className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="Cancelar">
        <X className="size-4" />
      </button>
    </form>
  );
}

function BotaoLapis({ rotulo, aoClicar }: { rotulo: string; aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="shrink-0 rounded p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-700"
      aria-label={rotulo}
      title={rotulo}
    >
      <Pencil className="size-3.5" />
    </button>
  );
}

/** Índice usado para renomear a descrição da despesa (que não tem linhas). */
const DESCRICAO = -1;

/** Card zero-clique: o comando já foi aplicado; mostra o impacto e permite confirmar, desfazer ou editar. */
export function CardEntendi({ resultado, negocio, aoFechar, aoDesfazer, aoReaplicar, aoConcluir }: Props) {
  const [transacao, setTransacao] = useState(resultado.transacao);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [pausado, setPausado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [renomeando, setRenomeando] = useState<number | null>(null);
  const pendentes = resultado.perguntas.filter((p) => !(p.itemId in respostas));
  const contando = pendentes.length === 0 && !editando && renomeando === null;

  function renomear(indice: number, nome: string) {
    const r = indice === DESCRICAO ? { descricao: nome } : { linhas: { [indice]: nome } };
    const t = renomearNoRegistro(resultado.negocioId, transacao.id, r);
    if (t) setTransacao(t);
    setRenomeando(null);
  }
  useContagem(contando, pausado, aoFechar);

  const visual = visualDa(transacao, negocio);
  const interp = resultado.interpretacao;
  const insumos = resultado.impacto.filter((m) => m.categoria === "insumo");
  const finais = resultado.impacto.filter((m) => m.categoria === "producao_propria");
  const revenda = resultado.impacto.filter((m) => m.categoria === "revenda");
  const caixa =
    transacao.tipo === "venda"
      ? { texto: `+${moeda(transacao.valor)} no caixa`, cor: "text-emerald-700" }
      : transacao.tipo === "perda"
        ? { texto: `Prejuízo de ${moeda(transacao.valor)} (caixa sem movimento)`, cor: "text-red-700" }
        : { texto: `−${moeda(transacao.valor)} do caixa`, cor: "text-red-700" };
  const custoPendente = pendentes.some((p) => p.origem === "venda");
  const lucro = transacao.tipo === "venda" && transacao.custoEstimado !== undefined ? transacao.valor - transacao.custoEstimado : null;
  const rotuloTipo =
    transacao.tipo === "despesa" && transacao.categoriaDespesa && !CATEGORIAS_SINISTRO.includes(transacao.categoriaDespesa)
      ? `Despesa · ${transacao.categoriaDespesa}`
      : visual.rotulo;

  const sairDoFoco = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false);
  };

  return (
    <section
      aria-label="Entendi assim"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={sairDoFoco}
      className="animate-subir overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_12px_32px_-16px_rgba(24,24,27,0.35)]"
    >
      <p className="sr-only" aria-live="polite">
        {interp.mensagem_confirmacao}
      </p>
      <header className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
        <CircleCheck className="size-4 text-emerald-600" strokeWidth={2} aria-hidden />
        <h2 className="flex-1 text-sm font-semibold text-zinc-900">Entendi assim</h2>
        <span
          className="rounded border border-zinc-200 px-1.5 py-px text-[10px] font-medium tracking-wide text-zinc-500 uppercase"
          title={interp.motor === "ia" ? "Interpretado pela IA" : "Interpretado no próprio app, sem IA"}
        >
          {interp.motor === "ia" ? "IA" : "Local"}
        </span>
        <button type="button" onClick={aoFechar} className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </header>

      <div className="max-h-[min(46dvh,440px)] overflow-y-auto px-4 pt-2.5 pb-3">
        <p className="line-clamp-2 text-xs text-zinc-500">“{interp.texto_original}”</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${visual.fundo}`}>
            <visual.Icone className="size-3.5" strokeWidth={1.75} />
            {rotuloTipo}
          </span>
          {transacao.contraparte && (
            <span className="rounded-md border border-zinc-200 px-2 py-0.5 text-zinc-600">
              {transacao.tipo === "compra" ? "Fornecedor" : "Cliente"}: <span className="font-medium text-zinc-900">{transacao.contraparte}</span>
            </span>
          )}
        </div>

        <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {transacao.itens.length ? (
            transacao.itens.map((l, i) => (
              <li key={`${l.itemId}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="num shrink-0 text-zinc-900">{quantidade(l.quantidade, l.unidade)}</span>
                {renomeando === i ? (
                  <RenomearInline inicial={l.nome} rotulo={`Nome de ${l.nome}`} aoSalvar={(nome) => renomear(i, nome)} aoCancelar={() => setRenomeando(null)} />
                ) : (
                  <>
                    <span className="min-w-0 truncate text-zinc-800">{l.nome}</span>
                    {l.itemId && resultado.novosItens.includes(l.itemId) && (
                      <span className="shrink-0 rounded bg-emerald-600 px-1 py-px text-[9px] font-semibold tracking-wide text-white">NOVO</span>
                    )}
                    <BotaoLapis rotulo={`Corrigir o nome de ${l.nome}`} aoClicar={() => setRenomeando(i)} />
                    <span className="num ml-auto shrink-0 text-xs text-zinc-500">{linhaValor(transacao, l.valorUnitario, l.quantidade)}</span>
                  </>
                )}
              </li>
            ))
          ) : (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700">
              {renomeando === DESCRICAO ? (
                <RenomearInline inicial={transacao.descricao} rotulo="Descrição da operação" aoSalvar={(nome) => renomear(DESCRICAO, nome)} aoCancelar={() => setRenomeando(null)} />
              ) : (
                <>
                  <span className="min-w-0 truncate">{transacao.descricao}</span>
                  <BotaoLapis rotulo="Corrigir a descrição" aoClicar={() => setRenomeando(DESCRICAO)} />
                </>
              )}
            </li>
          )}
          <li className="flex items-center justify-between bg-zinc-50 px-3 py-2 text-sm">
            <span className="font-medium text-zinc-700">Total</span>
            <span className={`num font-medium ${visual.cor}`}>
              {visual.sinal}
              {moeda(transacao.valor)}
            </span>
          </li>
        </ul>

        {editando && (
          <FormEdicao transacao={transacao} aoAplicar={(e) => aoReaplicar(transacao, e)} aoCancelar={() => setEditando(false)} />
        )}

        <ol className="mt-2" aria-label="Impacto">
          {insumos.length > 0 && (
            <Passo Icone={Wheat} titulo="Estoque de insumos" tom={TOM_OPERACAO.badge}>
              <Mudancas mudancas={insumos} negocio={negocio} />
            </Passo>
          )}
          {finais.length > 0 && (
            <Passo Icone={Factory} titulo="Produtos finais disponíveis" tom={TOM_RECEITA.badge}>
              <Mudancas mudancas={finais} negocio={negocio} />
            </Passo>
          )}
          {revenda.length > 0 && (
            <Passo Icone={Package} titulo="Estoque de revenda" tom={TOM_RECEITA.badge}>
              <Mudancas mudancas={revenda} negocio={negocio} />
            </Passo>
          )}
          <Passo Icone={Wallet} titulo="Caixa" tom="border-zinc-200 bg-zinc-50 text-zinc-600">
            <p className={`num mt-0.5 text-sm font-medium ${caixa.cor}`}>{caixa.texto}</p>
            {lucro !== null && (
              <p className="text-xs text-zinc-500">
                {custoPendente ? (
                  "Lucro: responda o custo abaixo"
                ) : (
                  <>
                    Lucro estimado: <span className="num text-zinc-900">{moeda(lucro)}</span>
                  </>
                )}
              </p>
            )}
          </Passo>
        </ol>

        {[...resultado.avisos, ...(interp.observacoes ?? [])].map((a) => (
          <p key={a} className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {a}
          </p>
        ))}

        {resultado.perguntas.length > 0 && (
          <div className="mt-3 space-y-2">
            {resultado.perguntas.map((p) =>
              p.itemId in respostas ? (
                <p key={p.itemId} className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  <CircleCheck className="size-3.5 shrink-0" /> {respostas[p.itemId]}
                </p>
              ) : (
                <PerguntaItemNovo
                  key={p.itemId}
                  pergunta={p}
                  negocioId={resultado.negocioId}
                  transacaoId={transacao.id}
                  aoResponder={(t, resumo) => {
                    if (t) setTransacao(t);
                    const faltam = pendentes.filter((x) => x.itemId !== p.itemId).length;
                    // Respondeu a última: consolida e fecha (não reabre a contagem).
                    if (faltam === 0) aoConcluir(resumo);
                    else setRespostas((r) => ({ ...r, [p.itemId]: resumo }));
                  }}
                />
              ),
            )}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-1 border-t border-zinc-100 px-2 py-1.5">
        <button
          type="button"
          onClick={aoDesfazer}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          <Undo2 className="size-4" strokeWidth={1.75} /> Desfazer
        </button>
        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          aria-expanded={editando}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
            editando ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <Pencil className="size-4" strokeWidth={1.75} /> Editar
        </button>
        <span className="min-w-0 flex-1 truncate px-1 text-right text-[11px] text-zinc-400">
          {editando ? "Editando" : renomeando !== null ? "Renomeando" : pendentes.length ? "Responda ou confirme" : pausado ? "Pausado" : "Fecha em 10 s"}
        </span>
        <button
          type="button"
          onClick={() => aoConcluir("Registro confirmado")}
          disabled={editando || renomeando !== null}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-40"
        >
          <Check className="size-4" strokeWidth={2.25} /> Confirmar
        </button>
      </footer>
      {contando && (
        <div className="h-0.5 bg-zinc-100" aria-hidden>
          <div className="barra-contagem animate-contagem h-full origin-left bg-emerald-600" style={{ animationPlayState: pausado ? "paused" : "running" }} />
        </div>
      )}
    </section>
  );
}
