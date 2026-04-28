# JR TELECOM - CAMAÇARI | Solicitação de Materiais

Aplicação web para solicitar materiais e enviar a solicitação para um grupo do Telegram.

## Estrutura
- `index.html` — interface do formulário
- `style.css` — estilos
- `script.js` — lógica do formulário e envio
- `api/telegram.js` — função serverless do Vercel que envia a mensagem ao Telegram

## Como publicar no Vercel
1. Suba estes arquivos para o GitHub.
2. Conecte o repositório ao Vercel.
3. Configure as variáveis de ambiente no projeto:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Faça o deploy.

## Observações
- A página principal fica em `/`.
- A rota de envio é `/api/telegram`.
- A mensagem é formatada no backend/serverless, incluindo data e hora.
