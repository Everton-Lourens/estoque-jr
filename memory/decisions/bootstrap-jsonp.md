# Bootstrap compatível com JSONP primeiro

## Decisão
A carga inicial do site estático deve priorizar JSONP para o `action=bootstrap` e manter `fetch()` como fallback de compatibilidade.

## Motivo
Em GitHub Pages, o carregamento por `<script>` tende a ser mais resiliente com Apps Script publicado como web app, enquanto `fetch()` continua útil como rota secundária quando o navegador ou a política de origem cruzada permitem.

## Complemento
A chamada de bootstrap deve ter timeout e o payload pode trazer `diagnostics.issues` sem quebrar a tela.

## Data
2026-07-23
