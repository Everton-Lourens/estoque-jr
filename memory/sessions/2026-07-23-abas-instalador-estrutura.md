# Sessão 2026-07-23

## O que foi alterado
- O frontend ganhou duas abas fixas de solicitação: `Instalador` e `Estrutura`.
- A listagem de itens agora filtra por `observacao` do Sheets.
- A troca de aba limpa a seleção anterior para impedir pedidos mistos.

## Conhecimento consolidado
- A observação do item é a fonte de verdade para decidir a aba de exibição.
- `Instalador` continua sendo a aba padrão de abertura.
- Troca de aba deve sempre resetar os itens marcados da aba anterior.

## Próximos passos
- Validar o bootstrap real do Sheets para confirmar que a observação chega exatamente com os textos esperados.
