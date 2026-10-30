/** Id curto e único o bastante para dados locais ("t-lx3k9a-1f2e3d4c"). */
export function novoId(prefixo: string): string {
  const aleatorio =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefixo}-${Date.now().toString(36)}-${aleatorio}`;
}
