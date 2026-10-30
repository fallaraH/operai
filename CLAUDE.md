# CLAUDE.md — Diretrizes de Arquitetura e Produto: OperAI

## 1. Visão do Produto
- **Nome:** OperAI
- **Headline:** "Seu financeiro no piloto automático" | **Subtítulo:** "Fale, não digite."
- **Objetivo:** Web App (PWA responsivo mobile-first) para pequenos comerciantes registrarem vendas, compras de insumos/mercadorias e despesas em linguagem natural (voz, texto ou foto de nota/caderno), sem burocracia.
- **Idioma:** 100% Português do Brasil (pt-BR).

## 2. Stack Técnica Obrigatória
- **Framework:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Canvas-Confetti.
- **Voz (Speech-to-Text REAL):** Web Speech API nativa do navegador (`window.SpeechRecognition` / `window.webkitSpeechRecognition`) configurada para `pt-BR`, com transcrição em tempo real no input.
- **Visão Computacional (Leitura de Notas/Cadernos):**
  1. Motor OCR Real no Cliente (`tesseract.js`) aliado à rota `/api/vision` e ao parser heurístico em português para extrair itens, quantidades e valores de fotos reais tiradas na hora.
  2. Botão "Usar foto de exemplo" (SVG inline estilizado por nicho) como fallback instantâneo para demonstração.
- **Persistência:** Estado global reativo persistido em `localStorage`.

## 3. Regra Crítica: Universalidade e Lógica de Produção (Insumos vs. Revenda)
O OperAI atende QUALQUER tipo de negócio, operando com 3 categorias de itens no estoque:
1. **`revenda`**: Comprado pronto e vendido pronto (ex: Ração, Refrigerante, Camiseta).
2. **`insumo` (Matéria-Prima)**: Comprado em lote no início da semana/mês (ex: Farinha kg, Leite L, Ovos un, Tecido m).
3. **`producao_propria` (Produto Final)**: Produzido a partir de insumos (ex: Pão Francês, Bolo, Doce).

### Lógica de Padaria / Manufatura:
- Cada item de `producao_propria` possui uma **Ficha Técnica Simplificada** vinculada aos `insumos` (ex: 1kg de Farinha + 0.2L de Leite = +20 Pães Franceses disponíveis).
- **Compra de matéria-prima** (ex: *"Comprei 50kg de farinha e 20 litros de leite por 320 reais"*):
  1. Registra **Saída/Despesa** de R$ 320,00 na aba financeira.
  2. Soma +50kg de Farinha e +20L de Leite no Estoque de Insumos.
  3. **Aumenta automaticamente a disponibilidade de produtos finais** (ex: aumenta a quantidade de Pães e Doces disponíveis para venda).
- **Venda de produto final** (ex: *"Vendi 30 pães e 4 sonhos por 65 reais"*):
  1. Registra **Entrada/Venda** de R$ 65,00 e calcula o lucro descontando o custo proporcional dos insumos.
  2. Abate a disponibilidade dos produtos finais e desconta proporcionalmente os insumos.

## 4. Cadastro Dinâmico de Produtos Novos (Custo vs. Venda)
- Se o comerciante registrar uma **Compra** de item inédito (informou custo): pergunta inline no card de revisão qual será o preço de venda e quantos já tinha no estoque.
- Se registrar uma **Venda** de item inédito pela 1ª vez (informou venda): pergunta inline qual o custo aproximado e quantos restam no estoque para calcular lucro e semáforo.

## 5. Estrutura de Telas (3 Abas + Barra Fixa)
- **Cabeçalho:** Seletor de Negócio (Padaria, Pet Shop, Loja de Roupas, Mercado + botão **"+ Criar Meu Negócio"** para qualquer ramo), botão `?` (tutorial da aba) e botão **"Reiniciar demo"**.
- **Aba 1 - Painel:**
  1. Cards principais com contadores animados: **Faturamento do Mês** e **Lucro Estimado do Mês**.
  2. **Meta Semanal** com barra de progresso (`valor atual / meta` e `%`). Ao atingir >= 100%, dispara confete e *"Meta da semana batida! 🎉"*.
  3. Gráfico `recharts` de barras agrupadas **"Entradas vs. Saídas"** (7 dias, hoje destacado).
  4. Card **"Mais Vendidos"** (Top 5 da semana em barras horizontais).
- **Aba 2 - Estoque:** Filtro "Produtos de Venda" vs "Matéria-Prima (Insumos)". Semáforo animado (Vermelho = 0, Amarelo <= 3 dias com selo pulsante "Acabando!", Verde > 3 dias).
- **Aba 3 - Histórico:** Agrupado por dia (Hoje, Ontem...), ícones de tipo, horário e valor colorido.

## 6. O "Efeito Pitch" e Salvaguardas de Apresentação
1. **Chips de Teste Rápido Contextuais:** Acima da barra de texto, exibir uma fileira rolável de chips clicáveis que mudam conforme o negócio selecionado e o histórico recente (incluindo compra de matéria-prima na Padaria, venda que bate a meta semanal de 100% para disparar confete, e venda de item novo). Clicar no chip preenche e envia na hora.
2. **Card Flutuante Zero-Clique ("Entendi assim"):** Aplicado automaticamente ao enviar comando, com barra regressiva de 10s, toast "Anotado! 🧡", destaque de impacto (`Estoque de Insumos -> Disponibilidade de Produtos Finais -> Caixa`), botão **Desfazer** (reverte 100% do estado em 1 clique) e botão **Editar inline**.
3. **Botão "Reiniciar demo":** No topo da tela, restaura instantaneamente os dados iniciais entre um avaliador e outro com feedback visual limpo.