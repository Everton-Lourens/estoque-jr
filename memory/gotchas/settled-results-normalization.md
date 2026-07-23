# Armadilha de resultados de envio sem normalização

## Problema
O submit pode quebrar com `Cannot read properties of undefined (reading 'status')` ao avaliar o resultado de envio.

## Causa
O fluxo lê `.status` diretamente de cada item após `Promise.allSettled()` ou de um resultado intermediário que pode não estar preenchido em todos os cenários de configuração.

## Solução
Normalizar cada resultado antes de ler `.status` ou `.reason` e tratar destinos desabilitados na config como sucesso explícito. Se nenhum destino estiver habilitado, interromper o submit com erro claro.
