/** Balão com telefone no estilo do WhatsApp (traço, herda a cor do texto). */
export function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.4z" />
      <path d="M9.2 8.6c.2-.5.6-.6.9-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.1-.1.3 0 .5.6 1.1 1.5 2 2.6 2.6.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.7-.6.9-.6.3-1.4.4-2.2.1-2.2-.8-4-2.6-4.8-4.8-.3-.8-.2-1.6.1-2.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
