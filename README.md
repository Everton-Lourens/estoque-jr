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
- Leitura inicial: `action=bootstrap` via JSONP.
- Envio do pedido: `action=createPedido` por POST.
- O frontend já prepara o payload com cabeçalho + itens.

## Observação
Este pacote foi pensado para a arquitetura em que o Google Sheets é o banco de dados e o Apps Script faz a camada de API.
