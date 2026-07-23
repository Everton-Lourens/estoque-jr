# Frontend legado híbrido com bootstrap dinâmico

## Decisão
O frontend legado permanece como interface pública, mas passou a seguir esta regra:
- configuração em `config.js`
- funcionários carregados do bootstrap do Apps Script em `<select>`
- itens renderizados dinamicamente a partir de `bootstrap.itens`
- envio final preservando Google Sheets e Telegram

## Motivo
Remove a dependência de listas fixas no código, evita divergência entre o frontend e a planilha e mantém o layout visual já conhecido.

## Detalhe técnico
Não existe mais catálogo hardcoded de materiais no JS do frontend. Cada card de item usa o `id_item` e o rótulo vindos do bootstrap. O técnico é escolhido por `id_funcionario` no cadastro do Sheets.

## Data
2026-07-23
