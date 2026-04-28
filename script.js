const MATERIALS = [
  { id: 'esticadores', name: 'Esticadores', unit: 'Unidades', description: 'Esticadores usados em instalações e fixação.' },
  { id: 'placas-jr', name: 'Placas JR', unit: 'Unidades', description: 'Placas de identificação JR.' },
  { id: 'drop-fibra', name: 'Drop Fibra', unit: 'Metros', description: 'Cabo drop de fibra óptica.' },
  { id: 'fixa-fio', name: 'Fixa Fio', unit: 'Unidades', description: 'Fixa fio para organização e acabamento.' },
  { id: 'fita-crepe', name: 'Fita Crepe', unit: 'Unidades', description: 'Fita crepe para marcação e proteção.' },
  { id: 'fita-isolante', name: 'Fita Isolante', unit: 'Unidades', description: 'Isolamento e acabamento elétrico.' },
  { id: 'conectores-apc', name: 'Conectores APC', unit: 'Unidades', description: 'Conectores APC para terminação de fibra.' },
  { id: 'abracadeira', name: 'Abraçadeira', unit: 'Unidades', description: 'Abraçadeira para fixação de cabos.' },
  { id: 'espiral', name: 'Espiral', unit: 'Metros', description: 'Espiral para proteção e organização.' },
  { id: 'bucha-parafuso', name: 'Bucha & Parafuso', unit: 'Unidades', description: 'Kit de bucha e parafuso.' },
  { id: 'bucha-acabamento', name: 'Bucha de Acabamento', unit: 'Unidades', description: 'Bucha para acabamento de instalação.' },
  { id: 'etiqueta-lacre', name: 'Etiqueta Lacre', unit: 'Unidades', description: 'Etiqueta lacre para identificação.' }
];

// Rota do backend/serverless no Vercel.
const API_ENDPOINT = '/api/telegram';

const form = document.getElementById('requestForm');
const technicianInput = document.getElementById('technicianName');
const sectorInput = document.getElementById('sector');
const observationsInput = document.getElementById('observations');
const feedbackEl = document.getElementById('feedback');
const materialsListEl = document.getElementById('materialsList');
const searchInput = document.getElementById('materialSearch');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

const selectionState = new Map();
let currentFilter = '';

function sanitizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function showFeedback(type, message) {
  feedbackEl.className = `feedback show ${type}`;
  feedbackEl.textContent = message;
}

function clearFeedback() {
  feedbackEl.className = 'feedback';
  feedbackEl.textContent = '';
}

function syncState(materialId, checked, quantity) {
  if (!checked) {
    selectionState.delete(materialId);
    return;
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  selectionState.set(materialId, qty);
}

function createMaterialCard(material) {
  const article = document.createElement('article');
  article.className = 'material-item';
  article.dataset.materialId = material.id;
  article.dataset.search = `${material.name} ${material.description} ${material.unit}`.toLowerCase();

  const isSelected = selectionState.has(material.id);
  const selectedQty = selectionState.get(material.id) ?? 1;

  article.innerHTML = `
    <div class="material-top">
      <input type="checkbox" id="${material.id}" class="material-check" aria-label="Selecionar ${material.name}" ${isSelected ? 'checked' : ''} />
      <div class="material-label">
        <label for="${material.id}" class="material-name">${material.name}</label>
        <div class="material-desc">${material.description}</div>
      </div>
    </div>
    <div class="qty-wrap">
      <label for="${material.id}-qty">Quantidade</label>
      <div class="qty-row">
        <input
          type="number"
          min="1"
          step="1"
          value="${selectedQty}"
          id="${material.id}-qty"
          class="qty-input"
          inputmode="numeric"
          aria-label="Quantidade de ${material.name}"
        />
        <span class="unit-pill">${material.unit}</span>
      </div>
    </div>
  `;

  const checkbox = article.querySelector('.material-check');
  const qtyWrap = article.querySelector('.qty-wrap');
  const qtyInput = article.querySelector('.qty-input');

  const syncSelection = () => {
    const checked = checkbox.checked;
    article.classList.toggle('selected', checked);
    qtyWrap.style.display = checked ? 'grid' : 'none';
    syncState(material.id, checked, qtyInput.value);
    if (checked && (!qtyInput.value || Number(qtyInput.value) < 1)) {
      qtyInput.value = 1;
      syncState(material.id, true, 1);
    }
  };

  checkbox.addEventListener('change', syncSelection);
  qtyInput.addEventListener('input', () => {
    if (qtyInput.value === '' || Number(qtyInput.value) < 1) {
      qtyInput.value = '';
      if (checkbox.checked) selectionState.delete(material.id);
      return;
    }
    if (checkbox.checked) syncState(material.id, true, qtyInput.value);
  });

  syncSelection();
  return article;
}

function renderMaterials(filter = currentFilter) {
  currentFilter = filter;
  materialsListEl.innerHTML = '';
  const term = filter.trim().toLowerCase();

  const filtered = MATERIALS.filter((material) =>
    `${material.name} ${material.description} ${material.unit}`.toLowerCase().includes(term)
  );

  if (!filtered.length) {
    materialsListEl.innerHTML = '<p class="material-desc">Nenhum material encontrado para essa busca.</p>';
    return;
  }

  filtered.forEach((material) => {
    materialsListEl.appendChild(createMaterialCard(material));
  });
}

function getSelectedMaterials() {
  return [...selectionState.entries()].map(([id, quantity]) => ({ id, quantity }));
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
      const material = MATERIALS.find((m) => m.id === item.id);
      showFeedback('error', `A quantidade de "${material?.name || item.id}" precisa ser maior que zero.`);
      return false;
    }
  }

  return true;
}

function collectPayload() {
  return {
    technicianName: sanitizeText(technicianInput.value),
    sector: sanitizeText(sectorInput.value),
    observations: sanitizeText(observationsInput.value),
    selectedMaterials: getSelectedMaterials()
  };
}

function clearSelection() {
  selectionState.clear();
  renderMaterials(currentFilter);
  showFeedback('info', 'Seleção de materiais limpa.');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFeedback();

  if (!validateForm()) return;

  const payload = collectPayload();

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao enviar a solicitação.');
    }

    showFeedback('success', 'Solicitação enviada com sucesso para o Telegram.');
    form.reset();
    selectionState.clear();
    renderMaterials(currentFilter);
    technicianInput.focus();
  } catch (error) {
    console.error(error);
    showFeedback('error', error.message || 'Não foi possível enviar a solicitação.');
  }
});

searchInput.addEventListener('input', (event) => {
  renderMaterials(event.target.value);
});

clearSelectionBtn.addEventListener('click', clearSelection);

renderMaterials();
technicianInput.focus();
