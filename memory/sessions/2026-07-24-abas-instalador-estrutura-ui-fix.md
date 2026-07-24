# Sessão 2026-07-24

## O que foi alterado
- As abas `Instalador` e `Estrutura` foram reestilizadas para parecerem um controle segmentado claro e consistente.
- A interação de troca de aba foi reforçada para limpar seleção, atualizar resumo e contador, e evitar qualquer pedido misto.
- O fallback da observação continua apontando para `Instalador`.

## Conhecimento consolidado
- A observação do item continua sendo a única fonte de verdade para decidir em qual aba ele aparece.
- `Instalador` deve continuar sendo a aba padrão de abertura.
- A troca entre abas precisa apagar a seleção anterior e nunca preservar itens marcados da outra categoria.

## Próximos passos
- Validar no navegador mobile se o controle de abas ficou legível e tocável.
- Confirmar no bootstrap real que todas as observações chegam como `Instalador` ou `Estrutura`.
