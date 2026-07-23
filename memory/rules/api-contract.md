# Contrato do frontend com a API

## Regra
O frontend deve consumir:
- `action=bootstrap` para renderização inicial
- `action=createPedido` para envio do pedido
- `action=health` para checagem técnica

## Regra adicional
O backend deve aceitar `acao` como alias de `action`, porque o frontend espelha os dois parâmetros para aumentar a compatibilidade com deploys do Apps Script.

## Regra adicional
O bootstrap deve ser tratado como operação resiliente: se vier com `diagnostics.issues`, o frontend continua funcional e apenas sinaliza o alerta.

## Aplicação
A tela estática depende desse contrato para montar selects, campos padrão e preparar o fluxo de gravação.
