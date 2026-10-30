import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OperAI — Seu financeiro no piloto automático",
    short_name: "OperAI",
    description: "Fale, não digite. Vendas, compras e estoque do seu negócio em linguagem natural.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
