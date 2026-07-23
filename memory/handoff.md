# Handoff

Estado atual:
- O frontend estático será publicado no GitHub Pages.
- O backend continua sendo o Google Apps Script conectado ao Google Sheets.
- A leitura inicial do site usa bootstrap por JSONP.
- O frontend já renderiza cabeçalho do pedido, itens dinâmicos e prévia do payload.

Pontos de atenção:
- O envio do pedido é feito como POST simplificado para o web app do Apps Script.
- Se o deployment mudar, `config.js` precisa ser atualizado.
- A UX foi otimizada para funcionar sem build step, usando HTML/CSS/JS puro.

Próximo passo provável:
- Ajustar a tela de listagem/edição de pedidos, caso seja necessário acompanhar pedidos já criados.
