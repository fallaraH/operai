"use client";

import { CircleCheck, Pencil, RotateCcw, Undo2, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gerarChips } from "@/lib/chips";
import { confeteTelaCheia } from "@/lib/confete";
import { contarAlertas } from "@/lib/dominio/estoque";
import { progressoMeta } from "@/lib/dominio/metricas";
import type { Aba, Nicho, OrigemTransacao, Transacao } from "@/lib/dominio/tipos";
import { moeda } from "@/lib/formatar";
import { novoId } from "@/lib/id";
import { interpretarComando } from "@/lib/interpretador/cliente";
import { interpretacaoEditada, type EdicaoCard } from "@/lib/interpretador/edicao";
import { planejarRegistro, type PlanoRegistro } from "@/lib/interpretador/resolver";
import {
  desfazer,
  obterNegocio,
  obterNegocioAtivoId,
  registrarPlano,
  reiniciarDemo,
  useAgora,
  useEstado,
  type ResultadoComando,
} from "@/lib/store";
import { AbaEstoque } from "./abas/AbaEstoque";
import { AbaHistorico } from "./abas/AbaHistorico";
import { AbaPainel } from "./abas/AbaPainel";
import { Cabecalho } from "./Cabecalho";
import { BannerMeta } from "./comando/BannerMeta";
import { BarraComando } from "./comando/BarraComando";
import { CardEntendi } from "./comando/CardEntendi";
import { ModalCriarNegocio } from "./ModalCriarNegocio";
import { ModalTutorial } from "./ModalTutorial";
import { NavInferior } from "./NavInferior";
import { SplashScreen } from "./SplashScreen";

const EXEMPLO: Record<Nicho, string> = {
  padaria: "Ex: vendi 30 pães e 4 sonhos por 65 reais",
  petshop: "Ex: vendi 2 rações premium por 399,80",
  roupas: "Ex: vendi 3 camisetas a 49,90 cada",
  mercado: "Ex: vendi 6 latinhas e 1 arroz por 59,84",
  personalizado: "Ex: comprei 10 unidades por 50 reais",
};

const DURACAO_BANNER_MS = 4500;

interface Aviso {
  texto: string;
  Icone: LucideIcon;
}

const comChip = (plano: PlanoRegistro, chipId: string): PlanoRegistro => ({ ...plano, transacao: { ...plano.transacao, chipId } });

/** A meta já está batida agora? (lê o estado atual, fora do React) */
function metaBatida(negocioId: string): boolean {
  const n = obterNegocio(negocioId);
  return !!n && progressoMeta(n, Date.now()).batida;
}

/** Splash fixa no topo da árvore (não remonta quando os dados chegam) + interface. */
export function AppOperAI() {
  const estado = useEstado();
  const agora = useAgora();
  return (
    <>
      <InterfaceOperAI />
      <SplashScreen pronto={!!estado && !!agora} />
    </>
  );
}

function InterfaceOperAI() {
  const estado = useEstado();
  const agora = useAgora();
  const [aba, setAba] = useState<Aba>("painel");
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const [criarAberto, setCriarAberto] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [resultado, setResultado] = useState<ResultadoComando | null>(null);
  /** Transações cujo card já foi fechado/salvo: nunca reabrem, mesmo se o estado re-renderizar. */
  const [consolidadas, setConsolidadas] = useState<ReadonlySet<string>>(() => new Set());
  const [processando, setProcessando] = useState(false);
  const [erroComando, setErroComando] = useState<string | null>(null);
  const [celebrando, setCelebrando] = useState(false);
  /** Muda no reset de estande para limpar o campo e parar o microfone. */
  const [rodadaReset, setRodadaReset] = useState(0);
  const timerAviso = useRef<number | undefined>(undefined);
  const timerBanner = useRef<number | undefined>(undefined);

  const negocio = estado ? estado.negocios[estado.negocioAtivoId] : null;
  const alertas = useMemo(() => (negocio && agora ? contarAlertas(negocio, agora) : 0), [negocio, agora]);
  // Chip usado some enquanto seu registro existir: Desfazer (ou Reiniciar) o devolve.
  const chips = useMemo(() => {
    if (!negocio || !agora) return [];
    const usados = new Set(negocio.transacoes.map((t) => t.chipId));
    return gerarChips(negocio, agora).filter((c) => !usados.has(c.id));
  }, [negocio, agora]);

  const avisar = useCallback((texto: string, Icone: LucideIcon = CircleCheck) => {
    setAviso({ texto, Icone });
    window.clearTimeout(timerAviso.current);
    timerAviso.current = window.setTimeout(() => setAviso(null), 2600);
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(timerAviso.current);
      window.clearTimeout(timerBanner.current);
    },
    [],
  );

  const fecharTutorial = useCallback(() => setTutorialAberto(false), []);
  const fecharCriar = useCallback(() => setCriarAberto(false), []);

  /** Fecha o card e marca a transação como consolidada. */
  function consolidarCartao() {
    if (resultado) {
      const id = resultado.transacao.id;
      setConsolidadas((s) => new Set(s).add(id));
    }
    setResultado(null);
  }

  function trocarAba(nova: Aba) {
    setAba(nova);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Meta passou de aberta para batida por causa deste registro: confete e banner. */
  function celebrarSeCruzou(negocioId: string, estavaBatida: boolean) {
    if (estavaBatida || !metaBatida(negocioId)) return;
    void confeteTelaCheia();
    setCelebrando(true);
    window.clearTimeout(timerBanner.current);
    timerBanner.current = window.setTimeout(() => setCelebrando(false), DURACAO_BANNER_MS);
  }

  /** Frase (voz, texto ou chip) → interpretação → registro aplicado na hora. */
  async function enviarComando(texto: string, origem: OrigemTransacao, chipId?: string): Promise<boolean> {
    const negocioId = obterNegocioAtivoId();
    const inicial = obterNegocio(negocioId);
    if (!inicial) return false;
    setProcessando(true);
    setErroComando(null);
    try {
      const interpretacao = await interpretarComando(texto, inicial);
      // O estado pode ter mudado enquanto a rota respondia.
      const alvo = obterNegocio(negocioId);
      if (!alvo || obterNegocioAtivoId() !== negocioId) return false;
      const plano = planejarRegistro(interpretacao, alvo, origem, novoId);
      if (!plano.ok) {
        setErroComando(plano.motivo);
        return false;
      }
      const estavaBatida = metaBatida(negocioId);
      const r = registrarPlano(negocioId, chipId ? comChip(plano.plano, chipId) : plano.plano, interpretacao);
      if (!r) return false;
      setResultado(r);
      avisar("Anotado!");
      celebrarSeCruzou(negocioId, estavaBatida);
      return true;
    } finally {
      setProcessando(false);
    }
  }

  function desfazerRegistro(transacaoId: string) {
    desfazer(transacaoId);
    setResultado(null);
    avisar("Desfeito. Tudo voltou como era", Undo2);
  }

  /** Editar: desfaz o registro e lança de novo com quantidade/preço corrigidos. */
  function reaplicar(res: ResultadoComando, transacao: Transacao, edicao: EdicaoCard) {
    const negocioId = res.negocioId;
    const estavaBatida = metaBatida(negocioId);
    if (!desfazer(transacao.id)) {
      setErroComando("Não consegui editar este registro. Desfaça e lance de novo.");
      return;
    }
    const alvo = obterNegocio(negocioId);
    const interpretacao = interpretacaoEditada(res.interpretacao, transacao, edicao);
    const plano = alvo && planejarRegistro(interpretacao, alvo, transacao.origem, novoId);
    if (!plano?.ok) {
      setResultado(null);
      setErroComando(plano && !plano.ok ? plano.motivo : "Não consegui reaplicar a edição.");
      return;
    }
    const novo = registrarPlano(negocioId, transacao.chipId ? comChip(plano.plano, transacao.chipId) : plano.plano, interpretacao);
    if (!novo) return;
    // Edição salva = registro consolidado: o card fecha e não reabre.
    setConsolidadas((s) => new Set(s).add(transacao.id).add(novo.transacao.id));
    setResultado(null);
    avisar(`Registro corrigido · total ${moeda(novo.transacao.valor)}`, Pencil);
    celebrarSeCruzou(negocioId, estavaBatida);
  }

  /** Reset de estande: tudo como no primeiro minuto, para o próximo avaliador. */
  function reiniciar() {
    reiniciarDemo();
    setResultado(null);
    setErroComando(null);
    setCelebrando(false);
    setAba("painel");
    setRodadaReset((r) => r + 1);
    window.scrollTo({ top: 0 });
    avisar("Demo reiniciada. Dados iniciais restaurados", RotateCcw);
  }

  if (!estado || !negocio || !agora) return null;
  const cartao =
    resultado && resultado.negocioId === negocio.id && !consolidadas.has(resultado.transacao.id) ? resultado : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col border-x border-zinc-200/80 bg-zinc-50">
      <Cabecalho
        estado={estado}
        aoAbrirTutorial={() => setTutorialAberto(true)}
        aoCriarNegocio={() => setCriarAberto(true)}
        aoReiniciar={reiniciar}
        aoTrocarNegocio={consolidarCartao}
      />

      <main key={`${negocio.id}-${aba}`} className="animate-surgir flex-1 px-4 pt-4 pb-52">
        {aba === "painel" && <AbaPainel negocio={negocio} agora={agora} />}
        {aba === "estoque" && <AbaEstoque negocio={negocio} agora={agora} />}
        {aba === "historico" && <AbaHistorico negocio={negocio} agora={agora} />}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md">
        {cartao && (
          <div className="px-3 pb-2">
            <CardEntendi
              key={cartao.transacao.id}
              resultado={cartao}
              negocio={negocio}
              aoFechar={consolidarCartao}
              aoDesfazer={() => desfazerRegistro(cartao.transacao.id)}
              aoReaplicar={(t, edicao) => reaplicar(cartao, t, edicao)}
              aoConcluir={(resumo) => {
                consolidarCartao();
                avisar(resumo);
              }}
            />
          </div>
        )}
        <BarraComando
          key={rodadaReset}
          exemplo={EXEMPLO[negocio.nicho]}
          chips={chips}
          processando={processando}
          erro={erroComando}
          aoEnviar={enviarComando}
          aoEditar={() => setErroComando(null)}
        />
        <NavInferior aba={aba} aoTrocar={trocarAba} alertasEstoque={alertas} />
      </div>

      <ModalTutorial aba={aba} aberto={tutorialAberto} aoFechar={fecharTutorial} />
      <ModalCriarNegocio
        aberto={criarAberto}
        aoFechar={fecharCriar}
        aoCriar={(nome) => {
          consolidarCartao();
          setAba("painel");
          avisar(`${nome} criado`);
        }}
      />

      {celebrando && <BannerMeta />}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center px-4"
      >
        {aviso && (
          <p className="animate-surgir flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-lg">
            <aviso.Icone className="size-4 text-emerald-400" strokeWidth={2} aria-hidden />
            {aviso.texto}
          </p>
        )}
      </div>
    </div>
  );
}

