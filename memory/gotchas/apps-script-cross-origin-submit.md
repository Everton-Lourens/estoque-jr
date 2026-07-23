# Envio cross-origin para Apps Script

## Problema
O navegador pode não permitir ler a resposta do POST do web app do Apps Script diretamente no frontend estático.

## Causa
A integração do GitHub Pages com Apps Script costuma exigir cuidado com origem cruzada.

## Solução
Usar o bootstrap em JSONP e tratar o envio do pedido como POST simplificado, mantendo o payload preparado no frontend.
