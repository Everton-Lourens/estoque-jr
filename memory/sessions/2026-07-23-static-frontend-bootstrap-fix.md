# Sessão 2026-07-23

## O que foi alterado
O frontend do almoxarifado passou a priorizar JSONP para carregar o bootstrap e mantém `fetch()` como fallback de compatibilidade; o envio de pedidos continua com `fetch()` e `no-cors` como suporte secundário.

## Conhecimento consolidado
A integração com Apps Script funciona melhor quando o frontend tenta primeiro a rota compatível com `<script>` para o bootstrap e só recua para `fetch()` quando necessário. O backend continua aceitando `action` e `acao`.

## Próximos passos
Validar o deployment do Apps Script com `?action=health` e `?action=bootstrap`, depois seguir com a evolução da listagem/edição de pedidos.
