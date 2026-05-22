// JR TELECOM - CAMAÇARI
// Aplicação estática para GitHub Pages com envio ao Telegram.

const COMPANY_NAME = 'JR TELECOM - CAMAÇARI';
const RESPONSIBLE_NAME = 'Everton Lourenço';

// Mantidas no código, como solicitado.
const TELEGRAM_BOT_TOKEN = '8675551330:AAH5G9TcjqoI-rjvCr-QBAlQ4Wsxkolu9hY';
const TELEGRAM_CHAT_ID = '-1003549071393';

const MATERIALS = [
  { id: 'cabo-rede', name: 'Cabo de rede', description: 'Patch de rede para ligações, manutenção e organização.' },
  { id: 'rj45', name: 'Conector RJ45', description: 'Conector de 8 vias para terminação de cabo de rede.' },
  { id: 'roteador', name: 'Roteador', description: 'Equipamento para distribuição de rede e conectividade.' },
  { id: 'fonte', name: 'Fonte', description: 'Fontes e adaptadores para alimentação de equipamentos.' },
  { id: 'patch-cord', name: 'Patch cord', description: 'Cabo pronto para conexões rápidas em racks e pontos.' },
  { id: 'switch', name: 'Switch', description: 'Equipamento de distribuição de portas de rede.' },
  { id: 'bateria', name: 'Bateria', description: 'Baterias para nobreak, rádio ou equipamentos compatíveis.' },
  { id: 'tomada', name: 'Tomada', description: 'Tomadas e pontos elétricos de apoio à instalação.' },
  { id: 'plug', name: 'Plug', description: 'Plugs e conectores para adaptações elétricas ou técnicas.' },
  { id: 'fita-isolante', name: 'Fita isolante', description: 'Fita para isolamento, acabamento e segurança.' },
  { id: 'abracadeira', name: 'Abraçadeira', description: 'Organização de cabos e fixação em instalações.' },
  { id: 'organizacao-cabeamento', name: 'Organização de cabeamento', description: 'Itens e materiais para organização de cabos.' },
  { id: 'outros', name: 'Outros itens técnicos', description: 'Use para materiais não listados na estrutura fixa.' }
];

const form = document.getElementById('requestForm');
const technicianInput = document.getElementById('technicianName');
const sectorInput = document.getElementById('sector');
const internalIdInput = document.getElementById('internalId');
const observationsInput = document.getElementById('observations');
const feedbackEl = document.getElementById('feedback');
const materialsListEl = document.getElementById('materialsList');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTimestampParts(date = new Date()) {
  return {
    date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function escapeFilename(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'solicitacao';
}

function showFeedback(type, message) {
  feedbackEl.className = `feedback show ${type}`;
  feedbackEl.textContent = message;
}

function clearFeedback() {
  feedbackEl.className = 'feedback';
  feedbackEl.textContent = '';
}

function createMaterialCard(material) {
  const article = document.createElement('article');
  article.className = 'material-item';
  article.dataset.materialId = material.id;

  article.innerHTML = `
    <div class="material-top">
      <input type="checkbox" id="${material.id}" class="material-check" aria-label="Selecionar ${material.name}" />
      <div class="material-label">
        <label for="${material.id}" class="material-name">${material.name}</label>
        <div class="material-desc">${material.description}</div>
      </div>
    </div>
    <div class="qty-wrap">
      <label for="${material.id}-qty">Quantidade</label>
      <input
        type="number"
        min="1"
        step="1"
        value="1"
        id="${material.id}-qty"
        class="qty-input"
        inputmode="numeric"
        aria-label="Quantidade de ${material.name}"
      />
    </div>
  `;

  const checkbox = article.querySelector('.material-check');
  const qtyWrap = article.querySelector('.qty-wrap');
  const qtyInput = article.querySelector('.qty-input');

  const syncSelection = () => {
    article.classList.toggle('selected', checkbox.checked);
    qtyWrap.style.display = checkbox.checked ? 'grid' : 'none';
    if (checkbox.checked && (!qtyInput.value || Number(qtyInput.value) < 1)) {
      qtyInput.value = 1;
    }
  };

  checkbox.addEventListener('change', syncSelection);
  qtyInput.addEventListener('input', () => {
    if (qtyInput.value === '' || Number(qtyInput.value) < 1) {
      qtyInput.value = '';
    }
  });

  syncSelection();
  return article;
}

function renderMaterials() {
  materialsListEl.innerHTML = '';
  MATERIALS.forEach((material) => {
    materialsListEl.appendChild(createMaterialCard(material));
  });
}

function getSelectedMaterials() {
  const selected = [];
  document.querySelectorAll('.material-item').forEach((item) => {
    const checkbox = item.querySelector('.material-check');
    const qtyInput = item.querySelector('.qty-input');
    if (checkbox.checked) {
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 0);
      selected.push({
        name: item.querySelector('.material-name').textContent.trim(),
        quantity: qty
      });
    }
  });
  return selected;
}

function buildTxtContent(data, selectedMaterials, generatedAt) {
  const materialsText = selectedMaterials.length
    ? selectedMaterials.map((item) => `- ${item.name}: ${item.quantity}`).join('\n')
    : '- Nenhum material selecionado';

  return [
    'SOLICITAÇÃO DE MATERIAIS',
    '========================================',
    `Empresa: ${COMPANY_NAME}`,
    `Nome do técnico: ${data.technicianName}`,
    `Setor/local: ${data.sector || '-'}`,
    `Identificação complementar: ${data.internalId || '-'}`,
    `Data do envio: ${generatedAt.date}`,
    `Hora do envio: ${generatedAt.time}`,
    '',
    'Materiais solicitados:',
    materialsText,
    '',
    'Observações:',
    data.observations || '-',
    '',
    '========================================',
    'Gerado automaticamente pelo sistema'
  ].join('\n');
}

function buildTelegramMessage(data, selectedMaterials, generatedAt) {
  const materialsText = selectedMaterials.length
    ? selectedMaterials.map((item) => `• ${item.name} x${item.quantity}`).join('\n')
    : '• Nenhum material selecionado';

  return [
    'SOLICITAÇÃO DE MATERIAIS',
    `Empresa: ${COMPANY_NAME}`,
    `Técnico: ${data.technicianName}`,
    `Setor/local: ${data.sector || '-'}`,
    `Identificação complementar: ${data.internalId || '-'}`,
    `Data do envio: ${generatedAt.date}`,
    `Hora do envio: ${generatedAt.time}`,
    '',
    'Materiais solicitados:',
    materialsText,
    '',
    `Observações: ${data.observations || '-'}`,
    '',
    `Responsável: ${RESPONSIBLE_NAME}`
  ].join('\n');
}

function downloadTextFile(content, filename) {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sendToTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN.includes('COLOQUE_') || TELEGRAM_CHAT_ID.includes('COLOQUE_')) {
    throw new Error('Configure o token e o chat_id do Telegram no código.');
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    const description = result?.description || `HTTP ${response.status}`;
    throw new Error(`Falha ao enviar para o Telegram: ${description}`);
  }

  return result;
}

function validateForm() {
  const technicianName = sanitizeText(technicianInput.value);
  if (!technicianName) {
    showFeedback('error', 'Informe o nome do técnico antes de enviar.');
    technicianInput.focus();
    return false;
  }

  const selectedMaterials = getSelectedMaterials();
  if (!selectedMaterials.length) {
    showFeedback('error', 'Selecione ao menos um material para continuar.');
    return false;
  }

  for (const item of selectedMaterials) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      showFeedback('error', `A quantidade do item "${item.name}" precisa ser maior que zero.`);
      return false;
    }
  }

  return true;
}

function collectFormData() {
  return {
    technicianName: sanitizeText(technicianInput.value),
    sector: sanitizeText(sectorInput.value),
    internalId: sanitizeText(internalIdInput.value),
    observations: sanitizeText(observationsInput.value)
  };
}

function clearSelection() {
  document.querySelectorAll('.material-item').forEach((item) => {
    const checkbox = item.querySelector('.material-check');
    const qtyInput = item.querySelector('.qty-input');
    checkbox.checked = false;
    qtyInput.value = 1;
    item.classList.remove('selected');
    item.querySelector('.qty-wrap').style.display = 'none';
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFeedback();

  if (!validateForm()) return;

  const data = collectFormData();
  const selectedMaterials = getSelectedMaterials();
  const generatedAt = getTimestampParts(new Date());

  const txtContent = buildTxtContent(data, selectedMaterials, generatedAt);
  const fileName = `pedido_${escapeFilename(data.technicianName)}_${generatedAt.date.replace(/\//g, '-')}.txt`;
  const telegramMessage = buildTelegramMessage(data, selectedMaterials, generatedAt);

  downloadTextFile(txtContent, fileName);

  try {
    await sendToTelegram(telegramMessage);
    showFeedback('success', 'Pedido enviado ao Telegram e arquivo .txt gerado com sucesso.');
  } catch (error) {
    console.error(error);
    showFeedback('error', `${error.message} O arquivo .txt foi gerado mesmo assim.`);
  }
});

clearSelectionBtn.addEventListener('click', () => {
  clearSelection();
  showFeedback('info', 'Seleção de materiais limpa.');
});

renderMaterials();

if (!technicianInput.value) {
  technicianInput.focus();
}
