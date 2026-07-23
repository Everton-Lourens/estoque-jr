# Sessão 2026-07-23

## O que foi alterado
- Ajustado o frontend para enviar `action=createPedido` com capitalização canônica.
- Removida a normalização para minúsculas no helper de POST.

## Conhecimento consolidado
- O fallback `no-cors` continua sendo compatibilidade para leitura de resposta, mas a ação precisa seguir o contrato do Apps Script.
- O payload do pedido deve ser enviado sem reescrever o nome da ação.

## Próximos passos
- Confirmar em publicação real que o POST grava no Google Sheets e não apenas retorna sucesso no navegador.
