# Sessão 2026-07-23

## O que foi alterado
Criado o site estático do almoxarifado para GitHub Pages, com layout azul dominante, bootstrap via Apps Script e formulário dinâmico de pedido.

## Conhecimento consolidado
A integração inicial com o Apps Script passou a tentar `fetch()` primeiro no bootstrap e manter JSONP como fallback de compatibilidade; o envio do pedido fica preparado via POST com fallback simplificado. O bootstrap continua com timeout e o backend devolve diagnóstico parcial quando houver abas ausentes.

## Próximos passos
Validar o deployment do Apps Script e, depois, evoluir para edição/listagem de pedidos, se necessário.
