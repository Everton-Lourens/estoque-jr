# Regra: quantidade por estoque mínimo

## Regra
Quando um item vier com `estoque_minimo` válido no bootstrap, o frontend deve exibir a quantidade como seleção pronta, usando múltiplos do mínimo em vez de campo numérico livre.

## Aplicação
As opções devem ser geradas a partir de `1x` até o limite configurado em `config.js`. O padrão atual é `2`, então o card oferece o mínimo e o dobro.
