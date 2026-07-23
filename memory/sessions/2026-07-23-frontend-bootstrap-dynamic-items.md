# Sessão 2026-07-23

## O que foi alterado
- O frontend passou a carregar funcionários e itens pelo bootstrap do Apps Script.
- O nome do técnico virou seleção em lista, em vez de texto livre.
- Os itens deixaram de ser hardcoded no JS e passaram a vir diretamente da planilha.
- Quando um item traz `estoque_minimo`, a quantidade passa a ser selecionada em vez de digitada, com opções baseadas em múltiplos do mínimo.
- A configuração foi separada em `config.js`.
- Mantive o layout visual legado e preservei o envio para Google Sheets e Telegram.

## Conhecimento consolidado
- O `id_funcionario` deve ser selecionado no cadastro do Sheets.
- O `id_item` dos cards vem do bootstrap e não deve ser substituído por lista fixa no frontend.
- O limite de multiplicação das quantidades por estoque mínimo fica em `config.js` e hoje o padrão é `2`.
- O cache local do bootstrap e do rascunho ajuda quando a API não responde.

## Próximos passos
- Conferir em produção se os rótulos dos itens retornados pelo Sheets estão adequados para exibição no card e na mensagem do Telegram.
