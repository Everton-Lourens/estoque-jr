# Sessão 2026-07-23

## O que foi alterado
- O frontend antigo passou a carregar bootstrap do Apps Script sem trocar o layout.
- O envio agora tenta salvar o pedido no Google Sheets e também manda a mensagem para o Telegram.
- Foi adicionado fallback de cache/compatibilidade para reduzir falhas de rede.

## Conhecimento consolidado
- O backend continua intocado; o frontend faz apenas consumo de leitura e POST.
- O mapeamento entre nome digitado/itens do layout legado e os IDs do Sheets precisa continuar normalizado.

## Próximos passos
- Conferir em ambiente real se os nomes dos funcionários e dos itens do layout legado batem com os cadastros da planilha.
