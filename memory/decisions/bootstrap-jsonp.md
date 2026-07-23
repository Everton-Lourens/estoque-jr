# Bootstrap híbrido com fetch e JSONP fallback

## Decisão
A carga inicial do site estático deve priorizar `fetch()` em `action=bootstrap` e manter JSONP como fallback de compatibilidade.

## Motivo
Alguns ambientes permitem a leitura direta via `fetch()` e outros ainda precisam do fallback JSONP para atravessar limitações de origem cruzada.

## Complemento
A chamada de bootstrap deve ter timeout e o payload pode trazer `diagnostics.issues` sem quebrar a tela.

## Data
2026-07-23
