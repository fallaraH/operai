"use client";

import { Factory, Layers, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ICONES_NEGOCIO, iconeDoRamo, type NomeIcone } from "@/lib/icones";
import type { ModoOperacao } from "@/lib/dominio/tipos";
import { moedaCurta } from "@/lib/formatar";
import { criarNegocio } from "@/lib/store";
import { Icone as IconeVetor } from "./ui/Icone";
import { Modal } from "./ui/Modal";

const SUGESTOES_RAMO = ["Hamburgueria", "Oficina", "Confeitaria", "Farmácia", "Açaí", "Salão de Beleza", "Pizzaria", "Hortifrúti"];
const METAS_RAPIDAS = [1000, 2500, 5000, 10000];

const MODOS: { valor: ModoOperacao; titulo: string; descricao: string; exemplo: string; Icone: typeof Store }[] = [
  { valor: "revenda", titulo: "Revenda", descricao: "Compro pronto e revendo pronto.", exemplo: "Farmácia, loja, bazar", Icone: Store },
  { valor: "producao", titulo: "Produção Própria / Manufatura", descricao: "Compro matéria-prima e fabrico o que vendo.", exemplo: "Confeitaria, hamburgueria", Icone: Factory },
  { valor: "hibrido", titulo: "Híbrido", descricao: "Fabrico uma parte e revendo outra.", exemplo: "Padaria que vende refrigerante", Icone: Layers },
];

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (nome: string) => void;
}

export function ModalCriarNegocio({ aberto, aoFechar, aoCriar }: Props) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Criar Meu Negócio"
      subtitulo="Qualquer ramo: o OperAI se adapta ao seu jeito de trabalhar."
    >
      {/* Remonta a cada abertura para começar com o formulário limpo. */}
      {aberto && <Formulario aoFechar={aoFechar} aoCriar={aoCriar} />}
    </Modal>
  );
}

function Formulario({ aoFechar, aoCriar }: Omit<Props, "aberto">) {
  const [nome, setNome] = useState("");
  const [ramo, setRamo] = useState("");
  const [meta, setMeta] = useState("2500");
  const [modo, setModo] = useState<ModoOperacao>("hibrido");
  const [iconeEscolhido, setIconeEscolhido] = useState<NomeIcone | null>(null);
  const [tentou, setTentou] = useState(false);

  const icone = iconeEscolhido ?? iconeDoRamo(`${ramo} ${nome}`);
  const metaNumero = Number(meta.replace(/\./g, "").replace(",", "."));
  const erroNome = nome.trim().length < 2 ? "Dê um nome para o seu negócio." : null;
  const erroMeta = !(metaNumero > 0) ? "Informe uma meta semanal maior que zero." : null;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (erroNome || erroMeta) return;
    criarNegocio({ nome, ramo, metaSemanal: metaNumero, modo, icone });
    aoCriar(nome.trim());
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <div className="flex items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Nome do negócio</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Burguer do Zé"
            autoComplete="organization"
            className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-invalid={tentou && !!erroNome}
          />
        </label>
        <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800" aria-label="Ícone do negócio">
          <IconeVetor nome={icone} className="size-5" />
        </span>
      </div>
      {tentou && erroNome && <p className="-mt-3 text-sm text-red-600">{erroNome}</p>}

      <div>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Ramo de atividade</span>
          <input
            value={ramo}
            onChange={(e) => setRamo(e.target.value)}
            placeholder="Ex: Hamburgueria, Oficina, Farmácia..."
            className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <div className="sem-barra -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
          {SUGESTOES_RAMO.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRamo(s)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium transition ${
                ramo === s ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              <IconeVetor nome={iconeDoRamo(s)} className="size-3.5" /> {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">Ícone</span>
        <div className="flex flex-wrap gap-1.5">
          {ICONES_NEGOCIO.map((nomeIcone) => (
            <button
              key={nomeIcone}
              type="button"
              onClick={() => setIconeEscolhido(nomeIcone)}
              aria-pressed={icone === nomeIcone}
              aria-label={`Ícone ${nomeIcone}`}
              className={`grid size-9 place-items-center rounded-md border transition ${
                icone === nomeIcone ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              <IconeVetor nome={nomeIcone} className="size-[18px]" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Meta de vendas por semana</span>
          <div className="flex items-center rounded-lg border border-zinc-300 transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <span className="pl-3.5 text-[15px] font-semibold text-zinc-500">R$</span>
            <input
              value={meta}
              onChange={(e) => setMeta(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              className="w-full rounded-xl px-2 py-2.5 text-[15px] outline-none"
              aria-invalid={tentou && !!erroMeta}
            />
          </div>
        </label>
        <div className="mt-2 flex gap-2">
          {METAS_RAPIDAS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeta(String(m))}
              className={`flex-1 num rounded-md border py-1.5 text-[13px] transition ${
                metaNumero === m ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {moedaCurta(m)}
            </button>
          ))}
        </div>
        {tentou && erroMeta && <p className="mt-1.5 text-sm text-red-600">{erroMeta}</p>}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-zinc-700">Como você opera?</legend>
        <div className="space-y-2">
          {MODOS.map(({ valor, titulo, descricao, exemplo, Icone }) => {
            const ativo = modo === valor;
            return (
              <label
                key={valor}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  ativo ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600" : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <input type="radio" name="modo" value={valor} checked={ativo} onChange={() => setModo(valor)} className="sr-only" />
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${ativo ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                  <Icone className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-900">{titulo}</span>
                  <span className="block text-[13px] text-zinc-600">{descricao}</span>
                  <span className="block text-xs text-zinc-400">Ex: {exemplo}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-600 py-3 text-[15px] font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
      >
        Criar negócio
      </button>
    </form>
  );
}
