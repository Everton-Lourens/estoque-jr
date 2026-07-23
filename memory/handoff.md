# Handoff

Estado atual:
- O frontend estático será publicado no GitHub Pages.
- O backend continua sendo o Google Apps Script conectado ao Google Sheets.
- A leitura inicial do site tenta JSONP primeiro para `action=bootstrap` e cai para `fetch()` como fallback de compatibilidade.
- Se o Apps Script não responder, o frontend agora abre com um bootstrap local seedado a partir da estrutura da planilha, em vez de cair em uma tela vazia.
- O envio do pedido tenta `fetch()` com JSON para `action=createPedido` primeiro e cai para um envio simplificado `no-cors` quando necessário; a ação agora é enviada com a capitalização canônica esperada pelo Apps Script.
- O frontend já renderiza cabeçalho do pedido, itens dinâmicos e prévia do payload.

Pontos de atenção:
- O `config.js` precisa ficar sincronizado com a URL publicada do Web App.
- Se o bootstrap remoto falhar por CORS, publicação restrita ou indisponibilidade do Web App, o fallback local mantém a tela funcional com dados base.
- O envio simplificado do pedido pode não expor a resposta do servidor no navegador; ele serve como rota de compatibilidade.
- A UX foi otimizada para funcionar sem build step, usando HTML/CSS/JS puro.

Próximo passo provável:
- Ajustar a tela de listagem/edição de pedidos, caso seja necessário acompanhar pedidos já criados.
