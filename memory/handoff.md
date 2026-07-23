# Handoff

Estado atual:
- O frontend antigo é a interface principal para o funcionário.
- O layout legado foi preservado.
- A lógica agora lê bootstrap do Google Apps Script, tenta gravar o pedido em Google Sheets e continua enviando ao Telegram.
- O backend não foi alterado.

Pontos de atenção:
- O salvamento em planilha depende de o nome do técnico existir no cadastro de funcionários do Sheets.
- Os materiais do layout legado precisam continuar compatíveis com os itens cadastrados na planilha para que o `id_item` seja resolvido corretamente.
- Se o Apps Script não responder, o formulário ainda pode funcionar em modo Telegram-only, mas sem persistência nas planilhas.

Próximo passo provável:
- Validar os nomes dos itens legados contra o cadastro real da planilha e ajustar apenas o que estiver fora de sincronia.
