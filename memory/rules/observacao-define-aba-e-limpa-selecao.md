# Regra: observação define a aba de itens

## Regra
A observação do item no bootstrap determina em qual aba ele aparece no frontend.

## Aplicação
- Se a observação, aba, categoria ou tipo do item contiver `Instalador`, o item deve aparecer na aba `Instalador`.
- Se a observação, aba, categoria ou tipo do item contiver `Estrutura`, o item deve aparecer na aba `Estrutura`.
- A aba `Instalador` deve abrir como padrão.

## Regra
A troca de aba precisa limpar a seleção anterior.

## Aplicação
- Ao sair de `Instalador` para `Estrutura`, os itens selecionados da primeira aba devem ser desmarcados.
- Ao voltar para `Instalador`, os itens da aba anterior também devem permanecer desmarcados.
- O controle visual deve funcionar como abas exclusivas; nunca pode existir seleção simultânea entre elas.
