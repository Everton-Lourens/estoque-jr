# Frontend legado híbrido

## Decisão
O frontend antigo continua sendo a interface pública do funcionário, com o mesmo layout visual, mas agora integra:
- bootstrap do Google Apps Script para ler funcionários e itens
- gravação de pedidos no Google Sheets via `action=createPedido`
- envio paralelo ao Telegram

## Motivo
Preserva a experiência já conhecida pelos funcionários e adiciona persistência analítica sem trocar o layout.

## Detalhe técnico
O nome digitado do técnico é conciliado com o cadastro de funcionários e os materiais legados são conciliados com os itens da planilha por comparação normalizada de rótulos.

## Data
2026-07-23
