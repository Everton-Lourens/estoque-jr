# Site estático do Almoxarifado

Pacote para publicar no **GitHub Pages** e consumir o **Google Apps Script** como backend da planilha.

## Estrutura
- `index.html`
- `styles.css`
- `config.js`
- `app.js`
- `memory/` com notas duráveis do projeto

## Como usar
1. Publique esta pasta no GitHub Pages.
2. Confirme o `appScriptUrl` em `config.js`.
3. Abra o site e aguarde o bootstrap carregar funcionários, itens e listas.
4. Monte o pedido e envie.

## Integração
- Leitura inicial: `action=bootstrap` com JSONP como caminho principal e `fetch()` como fallback de compatibilidade.
- Se o Apps Script não responder, o frontend usa o último bootstrap salvo no navegador; se não houver cache, abre em modo local com listas base para manter a tela funcional.
- Envio do pedido: `action=createPedido` por `fetch()` com JSON, com fallback simplificado `no-cors` quando o navegador bloquear a leitura da resposta.
- O bootstrap continua suportando resposta parcial com `diagnostics.issues`.
- O frontend prepara o payload com cabeçalho + itens e também tenta manter a navegação funcional quando a política de origem cruzada limita a leitura da resposta.

## Observação
Este pacote foi pensado para a arquitetura em que o Google Sheets é o banco de dados e o Apps Script faz a camada de API.
