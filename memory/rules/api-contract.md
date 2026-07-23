# Contrato do frontend com a API

## Regra
O frontend deve consumir:
- `action=bootstrap` para renderização inicial
- `action=createPedido` para envio do pedido
- `action=health` para checagem técnica

## Aplicação
A tela estática depende desse contrato para montar selects, campos padrão e preparar o fluxo de gravação.
