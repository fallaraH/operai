"use client";

import { Phone } from "lucide-react";
import { mascararTelefone } from "@/lib/fiado";

interface Props {
  valor: string;
  aoMudar: (mascarado: string) => void;
  invalido?: boolean;
  autoFocus?: boolean;
}

/** Celular brasileiro com máscara automática "(XX) 9XXXX-XXXX"; o +55 fica implícito. */
export function CampoTelefone({ valor, aoMudar, invalido, autoFocus }: Props) {
  return (
    <span
      className={`flex items-center rounded-md border bg-white transition focus-within:ring-2 focus-within:ring-emerald-100 ${
        invalido ? "border-red-400" : "border-zinc-300 focus-within:border-emerald-600"
      }`}
    >
      <Phone className="ml-2.5 size-3.5 shrink-0 text-zinc-400" aria-hidden />
      <span className="pl-1.5 text-sm text-zinc-500">+55</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        placeholder="(11) 98765-4321"
        value={valor}
        onChange={(e) => aoMudar(mascararTelefone(e.target.value))}
        aria-label="Celular do cliente com DDD"
        aria-invalid={invalido}
        className="num w-full min-w-0 bg-transparent px-2 py-1.5 text-base outline-none"
      />
    </span>
  );
}
