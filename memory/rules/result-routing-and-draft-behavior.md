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
Ao ocorrer erro de envio, o frontend deve redirecionar para `frontend/sucess/index.html?mode=error`.

### Aplicação
- O `draft` deve ser preservado.
- A tela de erro deve permitir reenviar o relatório ao suporte sem perder a tentativa original.
