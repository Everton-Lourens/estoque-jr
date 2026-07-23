# Sessão 2026-07-23

## O que foi alterado
- O formulário recebeu overlay bloqueante para carregamento inicial e envio.
- O submit agora redireciona para `frontend/sucess/index.html` em modo de sucesso ou erro e volta a enviar para Sheets + Telegram em paralelo.
- Foi criada a página `frontend/sucess/` com `index.html`, `style.css` e `script.js`.
- Em sucesso, o arquivo TXT é baixado automaticamente e a cópia pode ser enviada via WhatsApp/compartilhamento.
- Em erro, o relatório técnico é baixado automaticamente e o suporte padrão recebe o número `71981768164`.

## Conhecimento consolidado
- Sucesso limpa o rascunho salvo para não restaurar o pedido ao voltar.
- Erro preserva o rascunho para permitir nova tentativa sem perda dos itens selecionados.
- O número de WhatsApp precisa ter 11 dígitos após a normalização.
- O resultado do submit é trafegado por `sessionStorage` entre a tela principal e a tela de resultado.

## Próximos passos
- Conferir em produção se o redirecionamento relativo para `sucess/` funciona no ambiente de publicação.
- Validar o comportamento do navegador ao baixar o TXT automaticamente e ao abrir o WhatsApp.
