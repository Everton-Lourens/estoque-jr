# `npm start` precisa rodar dentro de `frontend/`

## Problema
O comando local só funciona corretamente quando executado dentro da pasta `frontend/`, onde está o `index.html`.

## Causa
O `package.json` foi criado para servir a pasta atual como raiz estática. Rodar o comando em outro diretório aponta para o lugar errado.

## Solução
Entrar em `frontend/`, executar `npm install` uma vez e depois `npm start`.
