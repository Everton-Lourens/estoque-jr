# Bootstrap remoto indisponível

## Problema
Quando o Web App do Apps Script não responde, o frontend pode ficar sem funcionários e itens, deixando o formulário pouco útil.

## Causa
O deploy pode estar restrito, o URL pode estar desatualizado, o navegador pode bloquear a leitura por CORS, ou a publicação pode não estar acessível no momento.

## Solução
O frontend deve manter um bootstrap local seedado com dados mínimos da estrutura da planilha e usar esse fallback quando JSONP, `fetch()` e health check falharem.

## Efeito prático
A tela continua funcional mesmo sem o backend disponível, com selects e campos básicos já preenchidos para o fluxo de montagem do pedido.
