# Servidor local Node para o frontend estático

## Decisão
O frontend passou a ter um `package.json` próprio para servir a pasta `frontend/` localmente com Node usando `serve`.

## Motivo
Permite testar e navegar na interface sem publicar toda alteração no GitHub Pages, preservando o comportamento estático original do projeto.

## Detalhe técnico
O servidor local não altera rotas, HTML ou lógica do browser. Ele apenas expõe a pasta atual, com `index.html` na raiz e subpastas estáticas como `sucess/`.

## Data
2026-07-24
