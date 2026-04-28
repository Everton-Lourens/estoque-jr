# JR TELECOM - CAMAÇARI | Solicitação de Materiais

Este pacote contém:
- interface HTML/CSS/JS para o formulário;
- lista de materiais conforme o modelo solicitado;
- envio da mensagem para o Telegram via backend;
- data e hora geradas somente no backend.

## Importante
GitHub Pages hospeda apenas arquivos estáticos. Para enviar ao Telegram sem expor o token no navegador, é necessário hospedar a rota `/api/telegram` em um backend compatível com Vercel.

## Como usar
1. Crie o bot no Telegram com o BotFather.
2. Copie o token e o chat_id para as variáveis de ambiente.
3. Faça o deploy do projeto em Vercel.
4. Se o frontend estiver em outro domínio, altere `API_ENDPOINT` em `script.js` para a URL completa do seu backend.

## Arquivos principais
- `index.html`
- `style.css`
- `script.js`
- `api/telegram.js`
