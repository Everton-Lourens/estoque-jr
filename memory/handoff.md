# Handoff

Estado atual:
- O frontend público continua com o layout legado, mas agora carrega funcionários e itens a partir do bootstrap do Google Apps Script.
- O nome do técnico saiu de campo de texto e virou um `<select>` alimentado por `funcionario` do Sheets.
- A lista de itens não usa mais catálogo fixo no JS: os cards de checkbox são renderizados a partir de `bootstrap.itens`.
- Os itens agora são separados em duas abas fixas, `Instalador` e `Estrutura`, com base no valor da observação vindo do Sheets.
- A interface das abas foi reforçada como controle segmentado: `Instalador` abre por padrão e a troca de aba limpa a seleção anterior sem permitir pedido misto.
- A configuração operacional foi separada em `config.js`.
- Existe agora um `package.json` no frontend para servir a mesma pasta estática localmente com Node, sem alterar o comportamento do GitHub Pages.
- O submit agora bloqueia a interface com overlay escuro, envia para Google Sheets e Telegram em paralelo quando as flags de config estão ativas e leva o usuário para `frontend/sucess/index.html` em modo de sucesso ou erro.
- Em sucesso, o `draft` é limpo antes do redirecionamento; em erro, o rascunho fica preservado para nova tentativa.
- A página `frontend/sucess/` é responsável por baixar automaticamente o TXT e por enviar a cópia para WhatsApp/compartilhamento.

Pontos de atenção:
- Ao rodar localmente via Node, o servidor deve ser iniciado dentro da pasta `frontend/`, onde está o `index.html`.
- Se o bootstrap vier vazio, a tela fica funcional, mas sem funcionários ou itens para selecionar.
- O `id_funcionario` precisa existir no cadastro da planilha; não há mais conciliação por nome digitado.
- O `id_item` de cada card vem diretamente do bootstrap, então o frontend depende da aba `item` estar ativa e preenchida.
- Ao trocar entre `Instalador` e `Estrutura`, as seleções anteriores são limpas para impedir pedidos mistos na mesma submissão.
- A renderização das abas depende da normalização da observação e de campos equivalentes (`observacao`, `aba`, `categoria`, `tipo_item`, `tipo`, `grupo`, `setor`); textos fora de `Instalador`/`Estrutura` caem no fluxo padrão `Instalador`.
- O cache local do bootstrap e do rascunho no `localStorage` continuam sendo usados como fallback.
- O número de suporte padrão para erro fica em `config.js` e deve permanecer em formato de 11 dígitos.

Próximo passo provável:
- Validar o fluxo real de redirecionamento para `sucess/`, o download automático do TXT e o envio para WhatsApp no navegador de destino.
- Se necessário, avaliar se o limite de multiplicação em `config.js` deve ser exposto em uma tela administrativa.

- Os resultados do `Promise.allSettled` são normalizados antes de ler `status`, para evitar `undefined.status` em variações de configuração ou ambiente.
