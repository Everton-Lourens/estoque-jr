# Envio cross-origin para Apps Script

## Problema
O navegador pode não permitir ler a resposta do POST do web app do Apps Script diretamente no frontend estático.

## Causa
A integração do GitHub Pages com Apps Script costuma exigir cuidado com origem cruzada.

## Solução
Priorizar JSONP para a leitura inicial (`action=bootstrap`), manter `fetch()` como fallback de compatibilidade e usar envio simplificado `no-cors` quando a política do navegador bloquear a resposta do POST.

## Gotcha adicional
O bootstrap pode carregar parcialmente com alertas de diagnóstico; isso não é erro fatal se o frontend conseguir montar o formulário.
