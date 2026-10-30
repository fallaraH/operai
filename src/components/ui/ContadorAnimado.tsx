"use client";

import { useEffect, useRef, useState } from "react";
import { moeda, moedaCurta } from "@/lib/formatar";

/**
 * Valor que "corre" do número atual até o alvo (ease-out). Quando o alvo muda
 * (ex: uma venda nova), continua de onde estava em vez de recomeçar do zero.
 */
export function useValorAnimado(alvo: number, duracaoMs = 1100): number {
  const [valor, setValor] = useState(0);
  const atual = useRef(0);

  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duracao = reduzir ? 0 : duracaoMs;
    const de = atual.current;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const p = duracao > 0 ? Math.min(1, (agora - inicio) / duracao) : 1;
      const suave = 1 - Math.pow(1 - p, 3);
      atual.current = p >= 1 ? alvo : de + (alvo - de) * suave;
      setValor(atual.current);
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracaoMs]);

  return valor;
}

interface Props {
  valor: number;
  className?: string;
}

/**
 * Valor em reais com contagem animada. `semCentavos` cabe em cards estreitos.
 * Leitores de tela recebem o valor final, com centavos.
 */
export function ContadorMoeda({ valor, className, semCentavos }: Props & { semCentavos?: boolean }) {
  const animado = useValorAnimado(valor);
  return (
    <span className={`whitespace-nowrap num ${className ?? ""}`}>
      <span aria-hidden>{semCentavos ? moedaCurta(animado) : moeda(animado)}</span>
      <span className="sr-only">{moeda(valor)}</span>
    </span>
  );
}

/** Número inteiro com contagem animada (ex: percentual da meta). */
export function ContadorInteiro({ valor, sufixo = "", className }: Props & { sufixo?: string }) {
  const animado = useValorAnimado(valor, 900);
  return (
    <span className={`num ${className ?? ""}`}>
      <span aria-hidden>
        {Math.floor(animado)}
        {sufixo}
      </span>
      <span className="sr-only">
        {Math.floor(valor)}
        {sufixo}
      </span>
    </span>
  );
}
