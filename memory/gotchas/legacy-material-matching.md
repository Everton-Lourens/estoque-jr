# Armadilha de compatibilidade entre layout legado e planilha

## Problema
O frontend antigo trabalha com nomes de materiais fixos no layout, mas o Apps Script grava pedidos com `id_item` e `id_funcionario`.

## Causa
Se o nome do material legado não encontrar correspondência no cadastro do Google Sheets, o pedido não consegue ser salvo nas planilhas.

## Solução
Manter os nomes do layout alinhados ao cadastro de itens da planilha e usar comparação normalizada de texto para resolver os IDs antes do envio.
