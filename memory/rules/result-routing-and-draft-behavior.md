# Regra
## Roteamento de resultado e rascunho

### Regra
Toda submissão deve exibir um overlay bloqueante enquanto carrega ou envia dados.

### Aplicação
- `Carregando Dados` aparece durante o bootstrap inicial.
- `Enviando Pedido` aparece durante a tentativa de salvar.

### Regra
Ao salvar com sucesso, o frontend deve redirecionar para `frontend/sucess/index.html?mode=success`.

### Aplicação
- O `draft` salvo em `localStorage` deve ser limpo antes do redirecionamento.
- O retorno do usuário para a página principal não deve restaurar itens já enviados.

### Regra
A submissão bem-sucedida deve enviar os dados para Google Sheets e Telegram em paralelo.

### Aplicação
- O fluxo usa `Promise.allSettled([sendToSheets(...), sendToTelegram(...)])` quando os destinos estão habilitados na config.
- Resultados de `Promise.allSettled` devem ser normalizados antes de ler `.status` ou `.reason`.
- Falha em qualquer destino habilitado deve ser tratada como erro de envio.
- Destinos desabilitados na config contam como sucesso por definição e não devem bloquear o submit.

### Regra
Ao ocorrer erro de envio, o frontend deve redirecionar para `frontend/sucess/index.html?mode=error`.

### Aplicação
- O `draft` deve ser preservado.
- A tela de erro deve permitir reenviar o relatório ao suporte sem perder a tentativa original.
