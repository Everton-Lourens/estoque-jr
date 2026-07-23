# Sessão 2026-07-23

## O que foi alterado
O frontend do almoxarifado passou a priorizar `fetch()` para carregar o bootstrap e enviar pedidos, mantendo JSONP e `no-cors` como fallback de compatibilidade.

## Conhecimento consolidado
A integração com Apps Script funciona melhor quando o frontend tenta primeiro a rota HTTP normal com `action` espelhado em `acao`, e só recua para JSONP ou envio simplificado quando o navegador bloqueia a leitura da resposta.

## Próximos passos
Validar o deployment do Apps Script com `?action=health` e `?action=bootstrap`, depois seguir com a evolução da listagem/edição de pedidos.
