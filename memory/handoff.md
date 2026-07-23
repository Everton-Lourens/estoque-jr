# Handoff

Estado atual:
- O frontend público continua com o layout legado, mas agora carrega funcionários e itens a partir do bootstrap do Google Apps Script.
- O nome do técnico saiu de campo de texto e virou um `<select>` alimentado por `funcionario` do Sheets.
- A lista de itens não usa mais catálogo fixo no JS: os cards de checkbox são renderizados a partir de `bootstrap.itens`.
- A configuração operacional foi separada em `config.js`.
- O envio continua integrando Google Sheets e Telegram.

Pontos de atenção:
- Se o bootstrap vier vazio, a tela fica funcional, mas sem funcionários ou itens para selecionar.
- O `id_funcionario` precisa existir no cadastro da planilha; não há mais conciliação por nome digitado.
- O `id_item` de cada card vem diretamente do bootstrap, então o frontend depende da aba `item` estar ativa e preenchida.
- O cache local do bootstrap e do rascunho no `localStorage` continuam sendo usados como fallback.

Próximo passo provável:
- Validar os nomes exibidos dos itens e o comportamento do bootstrap com a planilha real em produção.
- Se necessário, avaliar se o limite de multiplicação em `config.js` deve ser exposto em uma tela administrativa.
