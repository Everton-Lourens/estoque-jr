# Sessão 2026-07-24

## O que foi alterado
- A classificação de itens entre `Instalador` e `Estrutura` ficou mais robusta.
- O frontend agora lê múltiplos campos possíveis do bootstrap para decidir a aba do item, reduzindo a chance de falha quando o Sheets ou o Apps Script enviam o rótulo em colunas diferentes.
- A regra de fallback para `Instalador` foi mantida para qualquer valor não reconhecido.

## Conhecimento consolidado
- A separação de abas não deve depender só de `observacao`; o bootstrap pode trazer o rótulo em campos equivalentes.
- `Instalador` continua sendo o fallback seguro para valores vazios ou ambíguos.
- A seleção anterior deve continuar sendo limpa ao trocar de aba.

## Próximos passos
- Validar no navegador com o bootstrap real do Google Sheets se os 12 itens de instalador e o item de estrutura aparecem em abas separadas.
