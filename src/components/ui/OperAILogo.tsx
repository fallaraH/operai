interface Props {
  tamanho?: number;
  className?: string;
  /** Versão para fundo escuro: contorno claro e anéis na cor do fundo. */
  escuro?: boolean;
}

/** Vértices do hexágono (raio 11,5 em torno de 16,16), começando no topo, sentido horário. */
const V = [
  [16, 4.5],
  [25.96, 10.25],
  [25.96, 21.75],
  [16, 27.5],
  [6.04, 21.75],
  [6.04, 10.25],
] as const;

/** Vértices ligados ao núcleo: formam o "Y" do cubo isométrico (estoque) visto de cima. */
const LIGADOS = [1, 3, 5];

/**
 * Marca OperAI: rede de nós hexagonal e simétrica. O contorno contínuo em
 * cinza-chumbo e as três conexões em esmeralda desenham um cubo isométrico
 * (o estoque) que também é um grafo (a IA ligando fala, estoque e caixa).
 * Desenho próprio, geométrico, sem fonte de ícones.
 */
export function OperAILogo({ tamanho = 32, className, escuro = false }: Props) {
  const linha = escuro ? "#fafafa" : "#18181b";
  const anel = escuro ? "#09090b" : "#fff";
  const verde = escuro ? "#10b981" : "#059669";
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      role="img"
      aria-label="OperAI"
      className={className}
    >
      <polygon
        points={V.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={linha}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke={verde} strokeWidth="2" strokeLinecap="round">
        {LIGADOS.map((i) => (
          <line key={i} x1="16" y1="16" x2={V[i][0]} y2={V[i][1]} />
        ))}
      </g>
      <g stroke={anel} strokeWidth="1.3">
        {V.map(([x, y], i) =>
          LIGADOS.includes(i) ? (
            <circle key={i} cx={x} cy={y} r="2.5" fill={verde} />
          ) : (
            <circle key={i} cx={x} cy={y} r="1.9" fill={linha} />
          ),
        )}
        <circle cx="16" cy="16" r="2.9" fill={verde} />
      </g>
    </svg>
  );
}

/** Logo + nome + lema, lado a lado, para o cabeçalho. */
export function MarcaOperAI() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem estática da marca */}
      <img src="/operai-logo.jfif" alt="OperAI" width={48} height={48} className="size-11 shrink-0 rounded-xl border border-zinc-200 object-cover sm:size-12" />
      <div className="flex min-w-0 flex-col justify-center">
        <span className="text-2xl leading-none font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
          Oper<span className="text-emerald-600">AI</span>
        </span>
        <span className="mt-1 truncate text-xs leading-tight font-medium text-zinc-500 sm:text-sm">Fale, não digite.</span>
      </div>
    </div>
  );
}
