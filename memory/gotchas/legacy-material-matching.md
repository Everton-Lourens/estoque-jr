# Armadilha de bootstrap dinâmico sem catálogo fixo

## Problema
Quando a aba `item` ou `funcionario` não retorna dados ativos, o frontend fica sem opções para montar o pedido.

## Causa
O frontend agora depende diretamente do bootstrap do Apps Script. Se a planilha estiver vazia, inativa ou com falha de leitura, os selects e os cards não recebem dados.

## Solução
Garantir que as abas `funcionario` e `item` estejam ativas e corretamente preenchidas. Se o Apps Script cair, o frontend tenta cache local antes de abrir em modo offline sem itens.
