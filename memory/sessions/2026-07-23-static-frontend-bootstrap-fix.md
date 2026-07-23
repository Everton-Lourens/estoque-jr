# Sessão 2026-07-23

## O que foi alterado
O frontend do almoxarifado passou a usar um bootstrap local seedado com dados da estrutura da planilha quando o Apps Script não responde, evitando a tela vazia e mantendo o formulário funcional. A mensagem de fallback também foi suavizada para não parecer erro fatal.

## Conhecimento consolidado
A integração com Apps Script continua tentando JSONP primeiro para `action=bootstrap` e `fetch()` como fallback de compatibilidade. Quando o Web App fica indisponível, o frontend pode iniciar com dados base locais derivados do template da planilha, preservando o uso do formulário.

## Próximos passos
Validar o deployment do Apps Script com `?action=health` e `?action=bootstrap`, depois seguir com a evolução da listagem/edição de pedidos, se necessário.
