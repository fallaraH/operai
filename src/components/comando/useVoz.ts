"use client";

// Reconhecimento de voz real do navegador (Web Speech API) em pt-BR, com
// transcrição parcial em tempo real. Nada sai do app além do que o próprio
// navegador envia ao seu serviço de voz.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface EventoResultado {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Reconhecimento {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Construtor = new () => Reconhecimento;

function construtor(): Construtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Construtor; webkitSpeechRecognition?: Construtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SEM_ASSINATURA = () => () => {};

const MENSAGEM_ERRO: Record<string, string> = {
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo, ou use um chip.",
  "not-allowed": "O navegador bloqueou o microfone. Permita o acesso no cadeado da barra de endereço.",
  "service-not-allowed": "O navegador bloqueou o microfone. Permita o acesso no cadeado da barra de endereço.",
  "audio-capture": "Não encontrei um microfone neste aparelho.",
  network: "O serviço de voz do navegador está sem conexão. Digite o comando ou toque em um chip.",
  "language-not-supported": "Este navegador não entende português por voz. Digite o comando.",
};

export const MENSAGEM_SEM_SUPORTE = "Este navegador não tem reconhecimento de voz. Use o Chrome ou o Edge, ou digite o comando.";

interface Opcoes {
  /** Texto parcial/final a cada pedaço reconhecido (vai direto para o campo). */
  aoTranscrever: (texto: string) => void;
  /** Fim da fala com texto: a barra envia o comando sem precisar de clique. */
  aoFinalizar: (texto: string) => void;
}

export function useVoz({ aoTranscrever, aoFinalizar }: Opcoes) {
  const suportado = useSyncExternalStore(SEM_ASSINATURA, () => construtor() !== null, () => false);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const transcricao = useRef("");
  const descartar = useRef(false);
  const callbacks = useRef({ aoTranscrever, aoFinalizar });

  useEffect(() => {
    callbacks.current = { aoTranscrever, aoFinalizar };
  });

  useEffect(() => {
    // Religa na montagem: o Strict Mode monta, desmonta e monta de novo.
    descartar.current = false;
    return () => {
      // Desmontou (ex.: Reiniciar demo): não pode enviar nada depois.
      descartar.current = true;
      reconhecimento.current?.abort();
    };
  }, []);

  const iniciar = useCallback(() => {
    const Ctor = construtor();
    if (!Ctor) {
      setErro(MENSAGEM_SEM_SUPORTE);
      return;
    }
    if (reconhecimento.current) return;
    setErro(null);
    transcricao.current = "";
    const r = new Ctor();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let texto = "";
      for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript;
      transcricao.current = texto.trim();
      callbacks.current.aoTranscrever(transcricao.current);
    };
    r.onerror = (e) => {
      if (e.error === "aborted") return;
      setErro(MENSAGEM_ERRO[e.error] ?? "Não consegui usar o microfone agora. Digite o comando ou use um chip.");
    };
    r.onend = () => {
      reconhecimento.current = null;
      setOuvindo(false);
      const texto = transcricao.current;
      transcricao.current = "";
      if (texto && !descartar.current) callbacks.current.aoFinalizar(texto);
    };
    reconhecimento.current = r;
    try {
      r.start();
      setOuvindo(true);
    } catch {
      reconhecimento.current = null;
      setErro("Não consegui ligar o microfone. Tente de novo.");
    }
  }, []);

  /** Encerra a escuta; o `onend` envia o que já foi reconhecido. */
  const parar = useCallback(() => reconhecimento.current?.stop(), []);
  const limparErro = useCallback(() => setErro(null), []);

  return { suportado, ouvindo, erro, iniciar, parar, limparErro };
}
