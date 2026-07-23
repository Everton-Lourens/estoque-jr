// JR TELECOM CAMAÇARI
// Site estático com layout legado, integrado ao Google Sheets via Apps Script e ao Telegram.

const CONFIG = window.ALMOXARIFADO_CONFIG || {
  appName: "JR TELECOM CAMAÇARI | Solicitação de Materiais",
  appScriptUrl: "https://script.google.com/macros/s/AKfycbzrJreu7vjL6epONB49peaosFSHm34cDhxwy27-pTCc4-a0d33Cbc_5FWCI6dahLzQUJw/exec",
  defaultStatusPedido: "Aberto",
  defaultStatusItem: "Pendente",
  defaultPriority: "Normal",
};

const BASE_NAME = "CAMAÇARI";
const SECTION_TITLE = "—> PEDIDO DE ESTOQUE <—";
const MESSAGE_TITLE = "🚨 Nova Solicitação 🚨";

// Mantidas no código, como solicitado.
const TELEGRAM_BOT_TOKEN = "8675551330:AAH5G9TcjqoI-rjvCr-QBAlQ4Wsxkolu9hY";
const TELEGRAM_CHAT_ID = [
  { value: "-1003549071393", label: "Camaçari" },
  { value: "-00000000000", label: "Juazeiro" },
];

const MATERIALS = [
  {
    id: "conectores-apc",
    name: "Conectores SC/APC",
    unitLabel: "Unidades",
    type: "select",
    options: [10, 20, 30],
  },
  {
    id: "drop-fibra",
    name: "Drop Fibra",
    unitLabel: "Metros",
    type: "select",
    options: [1000, 2000],
  },
  {
    id: "bucha-parafuso",
    name: "Bucha & Parafuso",
    unitLabel: "Unidades",
    type: "select",
    options: [50, 100],
  },
  {
    id: "fixa-fio",
    name: "Fixa Fio",
    unitLabel: "Unidades",
    type: "select",
    options: [100, 200],
  },
  {
    id: "abracadeira",
    name: "Abraçadeira",
    unitLabel: "Unidades",
    type: "select",
    options: [100, 200],
  },
  {
    id: "esticadores",
    name: "Esticadores",
    unitLabel: "Unidades",
    type: "select",
    options: [50, 100],
  },
  {
    id: "etiqueta-lacre",
    name: "Etiqueta Lacre",
    unitLabel: "Cartela (69 etiquetas)",
    type: "select",
    options: [1, 2],
  },
  {
    id: "espiral",
    name: "Espiral",
    unitLabel: "Metros",
    type: "select",
    options: [1, 2],
  },
  {
    id: "placas-jr",
    name: "Placas JR",
    unitLabel: "Unidades",
    type: "select",
    options: [10, 20, 30],
  },
  {
    id: "fita-isolante",
    name: "Fita Isolante",
    unitLabel: "Unidade",
    type: "select",
    options: [1],
  },
  {
    id: "fita-crepe",
    name: "Fita Crepe",
    unitLabel: "Unidade",
    type: "select",
    options: [1],
  },
  {
    id: "bucha-acabamento",
    name: "Bucha de Acabamento",
    unitLabel: "Unidades",
    type: "select",
    options: [5, 10, 15],
  },
];

const form = document.getElementById("requestForm");
const technicianInput = document.getElementById("technicianName");
const baseSelect = document.getElementById("baseChatId");
const feedbackEl = document.getElementById("feedback");
const materialsListEl = document.getElementById("materialsList");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

const BASE_OPTIONS = TELEGRAM_CHAT_ID.map(({ value, label }) => ({ value, label }));

const state = {
  bootstrap: null,
  funcionarios: [],
  itens: [],
  canSyncSheets: false,
  itemIndex: new Map(),
  funcionarioIndex: new Map(),
  sheetLoadSource: "none",
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  renderBaseOptions();
  renderMaterials();
  bindEvents();
  verificarDia();

  const defaultMessage = "Carregando integração com Google Sheets...";
  showFeedback("info", defaultMessage);

  loadBootstrap()
    .then((data) => {
      applyBootstrap(data, { source: "remote" });
      const issues = Array.isArray(data?.diagnostics?.issues) ? data.diagnostics.issues.filter(Boolean) : [];
      if (issues.length) {
        showFeedback("info", `Google Sheets conectado com alertas: ${issues.join(" • ")}`);
      } else {
        showFeedback("success", "Google Sheets conectado. O pedido será salvo nas planilhas e enviado ao Telegram.");
      }
    })
    .catch((error) => {
      console.error("Bootstrap remoto indisponível; tentando cache local.", error);

      const cached = readCachedBootstrap();
      if (cached) {
        applyBootstrap(cached, { source: "cache" });
        showFeedback("info", "Google Sheets carregado a partir do cache local do navegador.");
        return;
      }

      state.bootstrap = null;
      state.funcionarios = [];
      state.itens = [];
      state.canSyncSheets = false;
      showFeedback("error", "Não foi possível carregar o Google Sheets agora. O formulário ainda pode enviar ao Telegram.");
    });

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      clearSelection();
      showFeedback("info", "Seleção de materiais limpa.");
    });
  }
}

function bindEvents() {
  technicianInput?.addEventListener("input", clearFeedback);
  baseSelect?.addEventListener("change", clearFeedback);
  materialsListEl?.addEventListener("change", clearFeedback);
  materialsListEl?.addEventListener("input", clearFeedback);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date = new Date()) {
  return {
    date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function sanitizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizeForMatch(value) {
  return sanitizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " e ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


function isCommunicationError(error) {
  const message = String(error?.message || error || "");
  return /failed to fetch|networkerror|fetch failed|cors|load failed|abort/i.test(message);
}

function escapeFilename(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "solicitacao";
}

function showFeedback(type, message) {
  if (!feedbackEl) return;
  feedbackEl.className = `feedback show ${type}`;
  feedbackEl.textContent = message;
}

function clearFeedback() {
  if (!feedbackEl) return;
  feedbackEl.className = "feedback";
  feedbackEl.textContent = "";
}

function renderBaseOptions() {
  if (!baseSelect) return;
  BASE_OPTIONS.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    baseSelect.appendChild(option);
  });
}

function getSelectedBase() {
  const selected = BASE_OPTIONS.find((option) => option.value === baseSelect.value);
  return selected || null;
}

function formatOptionLabel(material, option) {
  if (material.id === "drop-fibra") {
    return `${option.toLocaleString("pt-BR")} metros`;
  }

  if (material.id === "etiqueta-lacre") {
    return `${option} cartela${option > 1 ? "s" : ""} (69 cada)`;
  }

  if (material.id === "espiral") {
    return `${option} metro${option > 1 ? "s" : ""}`;
  }

  return `${option} ${material.unitLabel.toLowerCase()}`;
}

function createMaterialCard(material) {
  const article = document.createElement("article");
  article.className = "material-item";
  article.dataset.materialId = material.id;

  const helper = material.type === "number"
    ? `Limite: de ${material.min} até ${material.max}`
    : `Opções: ${material.options.map((value) => formatOptionLabel(material, value)).join(", ")}`;

  const control = material.type === "number"
    ? `
      <input
        type="number"
        min="${material.min}"
        max="${material.max}"
        step="${material.step || 1}"
        value=""
        id="${material.id}-qty"
        class="qty-input"
        inputmode="numeric"
        aria-label="Quantidade de ${material.name}"
        placeholder="0"
      />
    `
    : `
      <select id="${material.id}-qty" class="qty-input" aria-label="Quantidade de ${material.name}">
        <option value="">&lt;Selecione&gt;</option>
        ${material.options.map((option) => `<option value="${option}">${formatOptionLabel(material, option)}</option>`).join("")}
      </select>
    `;

  article.innerHTML = `
    <div class="material-top">
      <input type="checkbox" id="${material.id}" class="material-check" aria-label="Selecionar ${material.name}" />
      <div class="material-label">
        <label for="${material.id}" class="material-name">${material.name}</label>
        <div class="material-desc">${helper}</div>
      </div>
    </div>
    <div class="qty-wrap">
      <label for="${material.id}-qty">Quantidade</label>
      ${control}
    </div>
  `;

  const checkbox = article.querySelector(".material-check");
  const qtyWrap = article.querySelector(".qty-wrap");
  const qtyInput = article.querySelector(".qty-input");

  const syncSelection = () => {
    article.classList.toggle("selected", checkbox.checked);
    qtyWrap.style.display = checkbox.checked ? "grid" : "none";

    if (checkbox.checked) {
      if (material.type === "select" && qtyInput.value === "") {
        qtyInput.selectedIndex = 0;
      }
      if (material.type === "number" && qtyInput.value !== "" && Number(qtyInput.value) < material.min) {
        qtyInput.value = material.min;
      }
    }
  };

  checkbox.addEventListener("change", syncSelection);

  if (material.type === "number") {
    qtyInput.addEventListener("input", () => {
      if (qtyInput.value === "") return;
      const value = Number(qtyInput.value);
      if (!Number.isInteger(value) || value < material.min) qtyInput.value = material.min;
      if (value > material.max) qtyInput.value = material.max;
    });
  }

  syncSelection();
  return article;
}

function renderMaterials() {
  if (!materialsListEl) return;
  materialsListEl.innerHTML = "";
  MATERIALS.forEach((material) => {
    materialsListEl.appendChild(createMaterialCard(material));
  });
}

function clearSelection() {
  document.querySelectorAll(".material-item").forEach((item) => {
    const checkbox = item.querySelector(".material-check");
    const qtyInput = item.querySelector(".qty-input");
    const material = MATERIALS.find((entry) => entry.id === item.dataset.materialId);

    checkbox.checked = false;
    if (material?.type === "select") {
      qtyInput.selectedIndex = 0;
    } else {
      qtyInput.value = "";
    }
    item.classList.remove("selected");
    item.querySelector(".qty-wrap").style.display = "none";
  });
}

function formatQuantity(value, material) {
  const formattedValue = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  if (material.id === "etiqueta-lacre") {
    return value === 1 ? "1 cartela (69 etiquetas)" : `${formattedValue} cartelas (138 etiquetas)`;
  }

  if (material.id === "drop-fibra" || material.id === "espiral") {
    return `${formattedValue} ${material.unitLabel}`;
  }

  return `${formattedValue} ${material.unitLabel}`;
}

function getSelectedMaterials() {
  const selected = [];
  document.querySelectorAll(".material-item").forEach((item) => {
    const checkbox = item.querySelector(".material-check");
    const qtyInput = item.querySelector(".qty-input");
    const material = MATERIALS.find((entry) => entry.id === item.dataset.materialId);

    if (!checkbox.checked || !material) return;

    const quantity = qtyInput.value === "" ? null : Number(qtyInput.value);

    if (quantity === null || Number.isNaN(quantity)) return;
    if (!Number.isInteger(quantity) || quantity < 1 || (typeof material.max === "number" && quantity > material.max)) return;
    if (quantity === 0) return;

    selected.push({
      name: material.name,
      quantity,
      unitLabel: material.unitLabel,
      materialId: material.id,
    });
  });

  return selected;
}

function buildTelegramMessage(data, selectedMaterials, generatedAt) {
  const materialsText = selectedMaterials.length
    ? selectedMaterials.map((item) => {
        const material = MATERIALS.find((m) => m.id === item.materialId);
        return `🔹 ${item.name}: ${formatQuantity(item.quantity, material)}`;
      }).join("\n")
    : "🔹 Nenhum material selecionado";

  return [
    SECTION_TITLE,
    MESSAGE_TITLE,
    "",
    `👷 Técnico: ${data.technicianName}`,
    `🏢 Base: ${data.baseName}`,
    `📅 Data: ${generatedAt.date}`,
    `⏰ Horário: ${generatedAt.time}`,
    "",
    "🧰 Suprimentos Solicitados:",
    "------------------------------",
    materialsText,
    "------------------------------",
  ].join("\n");
}

function resolveFuncionarioByName(name) {
  const query = normalizeForMatch(name);
  if (!query) return null;

  const exact = state.funcionarios.find((funcionario) => {
    const nome = normalizeForMatch(funcionario.nome);
    const label = normalizeForMatch(funcionario.label);
    return nome === query || label === query;
  });

  if (exact) return exact;

  const partialMatches = state.funcionarios.filter((funcionario) => {
    const nome = normalizeForMatch(funcionario.nome);
    const label = normalizeForMatch(funcionario.label);
    return nome.includes(query) || label.includes(query) || query.includes(nome);
  });

  return partialMatches.length === 1 ? partialMatches[0] : null;
}

function resolveItemForMaterial(material) {
  const keys = [
    material.id,
    material.name,
    material.name.replace(/\s+/g, " "),
    material.name.replace(/&/g, " e "),
  ]
    .map(normalizeForMatch)
    .filter(Boolean);

  for (const key of keys) {
    if (state.itemIndex.has(key)) {
      return state.itemIndex.get(key);
    }
  }

  const candidates = state.itens.filter((item) => {
    const values = [
      item.id_item,
      item.nome_item,
      item.label,
    ].map(normalizeForMatch);

    return keys.some((key) => values.includes(key) || values.some((value) => value.includes(key) || key.includes(value)));
  });

  return candidates.length === 1 ? candidates[0] : null;
}

function buildSheetPayload(formData, selectedMaterials) {
  const id_funcionario = formData.funcionario?.id_funcionario;
  if (!id_funcionario) {
    throw new Error("Não encontrei o funcionário no Google Sheets. Use exatamente o nome cadastrado.");
  }

  const itens = selectedMaterials.map((selected) => {
    const material = MATERIALS.find((m) => m.id === selected.materialId);
    const sheetItem = material ? resolveItemForMaterial(material) : null;

    if (!sheetItem?.id_item) {
      throw new Error(`Não encontrei o item "${selected.name}" cadastrado no Google Sheets.`);
    }

    return {
      id_item: String(sheetItem.id_item),
      quantidade: Number(selected.quantity),
      status_item: CONFIG.defaultStatusItem,
      observacao: "",
    };
  });

  return {
    id_funcionario: String(id_funcionario),
    data_pedido: todayIso(),
    prioridade: CONFIG.defaultPriority,
    observacao: `Base telegram: ${formData.baseName}`,
    status: CONFIG.defaultStatusPedido,
    itens,
  };
}

function validateForm() {
  const technicianName = sanitizeText(technicianInput.value);
  const baseChatId = sanitizeText(baseSelect.value);

  if (!technicianName) {
    showFeedback("error", "Informe o nome do técnico antes de enviar.");
    technicianInput.focus();
    return false;
  }

  if (!baseChatId) {
    showFeedback("error", "Selecione a base antes de enviar.");
    baseSelect.focus();
    return false;
  }

  const selectedMaterials = getSelectedMaterials();
  if (!selectedMaterials.length) {
    showFeedback("error", "Selecione ao menos um material com quantidade válida.");
    return false;
  }

  return true;
}

function collectFormData() {
  const base = getSelectedBase();
  const technicianName = sanitizeText(technicianInput.value);
  const funcionario = resolveFuncionarioByName(technicianName);

  return {
    technicianName,
    funcionario,
    baseChatId: sanitizeText(baseSelect.value),
    baseName: base ? base.label : BASE_NAME,
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  clearFeedback();

  if (!validateForm()) return;

  const formData = collectFormData();
  const selectedMaterials = getSelectedMaterials();
  const generatedAt = formatDateTime(new Date());
  const telegramMessage = buildTelegramMessage(formData, selectedMaterials, generatedAt);

  let sheetPayload = null;
  try {
    sheetPayload = buildSheetPayload(formData, selectedMaterials);
  } catch (error) {
    console.error(error);
    showFeedback("error", error.message);
    return;
  }

  const tasks = [];
  if (state.canSyncSheets) {
    tasks.push(sendToSheets(sheetPayload));
  }
  tasks.push(sendToTelegram(telegramMessage, formData.baseChatId));

  const results = await Promise.allSettled(tasks);
  const sheetResult = state.canSyncSheets ? results[0] : null;
  const telegramResult = state.canSyncSheets ? results[1] : results[0];

  const sheetOk = !state.canSyncSheets || sheetResult?.status === "fulfilled";
  const telegramOk = telegramResult?.status === "fulfilled";

  if (sheetOk && telegramOk) {
    downloadTXT(telegramMessage);
    showFeedback(
      "success",
      state.canSyncSheets
        ? "Pedido salvo no Google Sheets e enviado ao Telegram com sucesso."
        : "Pedido enviado ao Telegram. O Google Sheets não estava disponível neste momento."
    );
    return;
  }

  if (!sheetOk && telegramOk) {
    const reason = sheetResult?.reason?.message || "Falha ao salvar no Google Sheets.";
    showFeedback("error", `Pedido enviado ao Telegram, mas não foi salvo no Google Sheets. ${reason}`);
    return;
  }

  if (sheetOk && !telegramOk) {
    const reason = telegramResult?.reason?.message || "Falha ao enviar ao Telegram.";
    showFeedback("error", `Pedido salvo no Google Sheets, mas não foi enviado ao Telegram. ${reason}`);
    return;
  }

  const reasons = [sheetResult, telegramResult]
    .filter(Boolean)
    .map((entry) => entry.reason?.message || "Erro desconhecido")
    .join(" | ");

  showFeedback("error", `Não foi possível concluir o pedido. ${reasons}`);
}

function downloadTXT(conteudo) {
  const agora = new Date();
  const dia = pad(agora.getDate());
  const mes = pad(agora.getMonth() + 1);
  const ano = agora.getFullYear();

  const nomeArquivo = `requisicao-estoque-${dia}-${mes}-${ano}.txt`;

  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function sendToTelegram(message, chatId) {
  if (!TELEGRAM_BOT_TOKEN || !chatId || TELEGRAM_BOT_TOKEN.includes("COLOQUE_") || chatId.includes("COLOQUE_")) {
    throw new Error("Configure o token e o chat_id do Telegram no código.");
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      const description = result?.description || `HTTP ${response.status}`;
      throw new Error(`Falha ao enviar ao Telegram: ${description}`);
    }

    return result;
  } catch (error) {
    if (!isCommunicationError(error)) {
      throw error;
    }

    console.warn("Telegram com leitura de resposta falhou; tentando envio simplificado.", error);

    const fallbackResponse = await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return {
      ok: true,
      degraded: true,
      responseType: fallbackResponse?.type || "opaque",
    };
  }
}

function apiUrl(params = {}) {
  if (!CONFIG.appScriptUrl) {
    throw new Error("A URL do Apps Script não foi configurada.");
  }

  const url = new URL(CONFIG.appScriptUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalizedValue = key === "action" && typeof value === "string" ? value.trim() : value;
    url.searchParams.set(key, String(normalizedValue));
    if (key === "action") {
      url.searchParams.set("acao", String(normalizedValue));
    }
  });

  return url.toString();
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return Object.prototype.hasOwnProperty.call(data, "data") ? (data.data ?? {}) : data;
}

async function apiGet(params = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Math.max(5000, Number(timeoutMs) || 30000));

  try {
    const response = await fetch(apiUrl(params), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });

    return await parseJsonResponse(response);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("A requisição demorou demais. Verifique sua conexão e tente novamente.");
    }

    const message = String(error?.message || error || "");
    if (/failed to fetch|networkerror|fetch failed|cors/i.test(message)) {
      throw new Error(`Falha de comunicação com o Apps Script: ${message || "Failed to fetch"}`);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiPost(action, payload = {}, { timeoutMs = 30000 } = {}) {
  const actionName = String(action || "").trim();
  if (!actionName) {
    throw new Error("Ação de envio não informada.");
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Math.max(5000, Number(timeoutMs) || 30000));

  try {
    const response = await fetch(apiUrl({ action: actionName }), {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ ...payload, action: actionName, acao: actionName }),
      signal: controller.signal,
    });

    return await parseJsonResponse(response);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("O salvamento demorou demais. Verifique sua conexão e tente novamente.");
    }

    const message = String(error?.message || error || "");
    if (/failed to fetch|networkerror|fetch failed|cors/i.test(message)) {
      throw new Error(`Falha de comunicação com o Apps Script: ${message || "Failed to fetch"}`);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function loadBootstrap() {
  if (!CONFIG.appScriptUrl) {
    throw new Error("A URL do Apps Script não foi configurada.");
  }

  const bootstrapUrl = buildJsonpUrl("bootstrap");

  return jsonpRequest(bootstrapUrl, { timeoutMs: 12000 })
    .catch((jsonpErr) => {
      console.warn("Bootstrap JSONP falhou, tentando fetch direto:", jsonpErr);

      return apiGet({ action: "bootstrap" }, { timeoutMs: 12000 })
        .catch(async (fetchErr) => {
          try {
            await apiGet({ action: "health" }, { timeoutMs: 6000 });
            throw new Error(
              `O Apps Script respondeu ao health check, mas o bootstrap falhou. Verifique se a publicação do web app está aberta para leitura pública e se a URL em config.js aponta para a implantação ativa. JSONP: ${jsonpErr.message || jsonpErr} | Fetch: ${fetchErr.message || fetchErr}`
            );
          } catch (healthErr) {
            throw new Error(
              `Não foi possível carregar o bootstrap. Verifique o URL do Apps Script, a publicação do web app e a planilha vinculada. JSONP: ${jsonpErr.message || jsonpErr} | Fetch: ${fetchErr.message || fetchErr} | Health: ${healthErr.message || healthErr}`
            );
          }
        });
    });
}

function buildJsonpUrl(action) {
  return apiUrl({ action });
}

function jsonpRequest(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 10000);

  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("callback", callbackName);

    let settled = false;
    let timeoutId = null;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      cleanup();
      fn(value);
    };

    window[callbackName] = (payload) => {
      finish(resolve, unpackApiPayload(payload));
    };

    const script = document.createElement("script");
    script.src = requestUrl.toString();
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";
    script.onerror = () => {
      finish(reject, new Error(`Falha ao carregar JSONP em ${requestUrl.toString()}`));
    };

    timeoutId = window.setTimeout(() => {
      finish(reject, new Error(`Timeout ao carregar JSONP em ${requestUrl.toString()}`));
    }, Math.max(3000, timeoutMs));

    function cleanup() {
      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    document.head.appendChild(script);
  });
}

function unpackApiPayload(response) {
  if (response && typeof response === "object" && response.ok && response.data) {
    return response.data;
  }
  if (response && typeof response === "object" && response.data) {
    return response.data;
  }
  return response || {};
}

function normalizeBootstrap(data, source = "remote") {
  const normalized = data && typeof data === "object" ? data : {};
  const defaults = normalized.defaults || {};

  return {
    app: normalized.app || {},
    lists: normalized.lists || {},
    funcionarios: Array.isArray(normalized.funcionarios) ? normalized.funcionarios : [],
    itens: Array.isArray(normalized.itens) ? normalized.itens : [],
    defaults: {
      dateToday: defaults.dateToday || todayIso(),
      pedidoStatus: defaults.pedidoStatus || CONFIG.defaultStatusPedido,
      itemStatus: defaults.itemStatus || CONFIG.defaultStatusItem,
      priority: defaults.priority || CONFIG.defaultPriority,
    },
    diagnostics: normalized.diagnostics || {},
    source,
  };
}

function buildItemIndex(itens = []) {
  const index = new Map();

  itens.forEach((item) => {
    const variants = [
      item.id_item,
      item.nome_item,
      item.label,
      `${item.nome_item || ""} ${item.unidade || ""}`,
    ];

    variants.forEach((variant) => {
      const key = normalizeForMatch(variant);
      if (key && !index.has(key)) {
        index.set(key, item);
      }
    });
  });

  return index;
}

function buildFuncionarioIndex(funcionarios = []) {
  const index = new Map();

  funcionarios.forEach((funcionario) => {
    const variants = [
      funcionario.id_funcionario,
      funcionario.nome,
      funcionario.label,
    ];

    variants.forEach((variant) => {
      const key = normalizeForMatch(variant);
      if (key && !index.has(key)) {
        index.set(key, funcionario);
      }
    });
  });

  return index;
}

function cacheBootstrap(data) {
  if (!data || data.source !== "remote") {
    return;
  }

  try {
    localStorage.setItem("almoxarifado:lastBootstrap", JSON.stringify(data));
  } catch (error) {
    console.warn("Não foi possível salvar o bootstrap em cache:", error);
  }
}

function readCachedBootstrap() {
  try {
    const saved = localStorage.getItem("almoxarifado:lastBootstrap");
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.source === "offline") return null;

    return normalizeBootstrap(parsed, "cache");
  } catch (error) {
    console.warn("Cache de bootstrap inválido:", error);
    return null;
  }
}

function applyBootstrap(data, { source = "remote" } = {}) {
  const normalized = normalizeBootstrap(data, source);
  state.bootstrap = normalized;
  state.funcionarios = normalized.funcionarios;
  state.itens = normalized.itens;
  state.itemIndex = buildItemIndex(state.itens);
  state.funcionarioIndex = buildFuncionarioIndex(state.funcionarios);
  state.canSyncSheets = Boolean(CONFIG.appScriptUrl) && source !== "offline" && state.funcionarios.length > 0 && state.itens.length > 0;
  state.sheetLoadSource = source;

  cacheBootstrap({ ...normalized, source });
  renderBootstrap(normalized, source);
}

function renderBootstrap(data, source = "remote") {
  const brandCopy = document.querySelector(".brand-copy p:last-of-type");
  if (brandCopy) {
    brandCopy.textContent =
      source === "remote"
        ? `Selecione somente os materiais necessários. ${state.funcionarios.length} funcionários e ${state.itens.length} itens carregados do Google Sheets.`
        : source === "cache"
          ? `Selecione somente os materiais necessários. Dados carregados do cache local do navegador.`
          : `Selecione somente os materiais necessários.`;
  }
}

function verificarDia() {
  try {
    const status = document.getElementById("status-dia");
    if (!status) return;

    const hoje = new Date().getDay(); // 0 = domingo, 1 = segunda, 2 = terça...
    const diasPermitidos = [2, 4, 6]; // terça, quinta, sábado

    const nomesDias = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];

    status.textContent = nomesDias[hoje];

    if (diasPermitidos.includes(hoje)) {
      status.classList.add("ok");
      status.classList.remove("erro");
    } else {
      status.classList.add("erro");
      status.classList.remove("ok");
    }
  } catch (error) {
    console.error(error);
    showFeedback("error", error.message);
  }
}

function validateFields() {
  let valido = true;
  const itens = document.querySelectorAll(".material-item");

  itens.forEach((item) => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    const select = item.querySelector("select");
    const titulo = item.querySelector(".material-name");

    titulo.classList.remove("erro");
    select.classList.remove("borda-erro");

    if (checkbox.checked && (!select.value || select.value === "")) {
      titulo.classList.add("erro");
      select.classList.add("borda-erro");
      valido = false;
    }
  });

  return valido;
}

function validateForm() {
  const technicianName = sanitizeText(technicianInput.value);
  const baseChatId = sanitizeText(baseSelect.value);

  if (!technicianName) {
    showFeedback("error", "Informe o nome do técnico antes de enviar.");
    technicianInput.focus();
    return false;
  }

  if (!baseChatId) {
    showFeedback("error", "Selecione a base antes de enviar.");
    baseSelect.focus();
    return false;
  }

  if (!validateFields()) {
    showFeedback("error", "Preencha a quantidade dos itens selecionados!");
    return false;
  }

  const selectedMaterials = getSelectedMaterials();
  if (!selectedMaterials.length) {
    showFeedback("error", "Selecione ao menos um material com quantidade válida.");
    return false;
  }

  return true;
}

function resolveShapeForCurrentSelection() {
  const technicianName = sanitizeText(technicianInput.value);
  return {
    technicianName,
    baseChatId: sanitizeText(baseSelect.value),
    baseName: getSelectedBase()?.label || BASE_NAME,
    funcionario: resolveFuncionarioByName(technicianName),
  };
}

async function sendToSheets(payload) {
  if (!state.canSyncSheets) {
    throw new Error("Google Sheets indisponível nesta sessão. Abra o site novamente após carregar o bootstrap.");
  }

  try {
    return await apiPost("createPedido", payload, { timeoutMs: 15000 });
  } catch (error) {
    if (!isCommunicationError(error)) {
      throw error;
    }

    console.warn("POST com fetch falhou, tentando envio simplificado:", error);
  }

  try {
    const endpoint = apiUrl({ action: "createPedido" });
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify({ ...payload, action: "createPedido", acao: "createPedido" }),
    });

    return { ok: true, degraded: true };
  } catch (error) {
    throw new Error(`Falha ao enviar para o Google Sheets: ${error?.message || error}`);
  }
}

function collectPayloadForSheets(selectedMaterials, currentShape) {
  const id_funcionario = currentShape.funcionario?.id_funcionario;
  if (!id_funcionario) {
    throw new Error("Não encontrei o funcionário no Google Sheets. Use exatamente o nome cadastrado.");
  }

  const itens = selectedMaterials.map((selected) => {
    const material = MATERIALS.find((m) => m.id === selected.materialId);
    const sheetItem = material ? resolveItemForMaterial(material) : null;

    if (!sheetItem?.id_item) {
      throw new Error(`Não encontrei o item "${selected.name}" cadastrado no Google Sheets.`);
    }

    return {
      id_item: String(sheetItem.id_item),
      quantidade: Number(selected.quantity),
      status_item: CONFIG.defaultStatusItem,
      observacao: "",
    };
  });

  return {
    id_funcionario: String(id_funcionario),
    data_pedido: todayIso(),
    prioridade: CONFIG.defaultPriority,
    observacao: `Base telegram: ${currentShape.baseName}`,
    status: CONFIG.defaultStatusPedido,
    itens,
  };
}

function renderPreviewText(currentShape, selectedMaterials, sheetPayload) {
  const lines = [
    `Técnico: ${currentShape.technicianName}`,
    `Base: ${currentShape.baseName}`,
    `Status: ${CONFIG.defaultStatusPedido}`,
    `Itens: ${selectedMaterials.length}`,
    `Payload Sheets: ${sheetPayload.itens.length}`,
  ];
  return lines.join(" | ");
}

async function handleSubmit(event) {
  event.preventDefault();
  clearFeedback();

  if (!validateForm()) return;

  const currentShape = resolveShapeForCurrentSelection();
  const selectedMaterials = getSelectedMaterials();
  const generatedAt = formatDateTime(new Date());
  const telegramMessage = buildTelegramMessage(currentShape, selectedMaterials, generatedAt);

  let sheetPayload;
  try {
    sheetPayload = collectPayloadForSheets(selectedMaterials, currentShape);
  } catch (error) {
    console.error(error);
    showFeedback("error", error.message);
    return;
  }

  if (!state.canSyncSheets) {
    try {
      await sendToTelegram(telegramMessage, currentShape.baseChatId);
      downloadTXT(telegramMessage);
      showFeedback("info", "Pedido enviado ao Telegram. O Google Sheets não estava disponível nesta sessão.");
      return;
    } catch (error) {
      console.error(error);
      showFeedback("error", error.message);
      return;
    }
  }

  const [sheetResult, telegramResult] = await Promise.allSettled([
    sendToSheets(sheetPayload),
    sendToTelegram(telegramMessage, currentShape.baseChatId),
  ]);

  const sheetOk = sheetResult.status === "fulfilled";
  const telegramOk = telegramResult.status === "fulfilled";

  if (sheetOk && telegramOk) {
    downloadTXT(telegramMessage);
    showFeedback(
      "success",
      `Pedido salvo no Google Sheets e enviado ao Telegram com sucesso. ${renderPreviewText(currentShape, selectedMaterials, sheetPayload)}`
    );
    return;
  }

  if (!sheetOk && telegramOk) {
    showFeedback(
      "error",
      `Pedido enviado ao Telegram, mas não foi salvo no Google Sheets. ${sheetResult.reason?.message || "Falha ao gravar nas planilhas."}`
    );
    return;
  }

  if (sheetOk && !telegramOk) {
    showFeedback(
      "error",
      `Pedido salvo no Google Sheets, mas não foi enviado ao Telegram. ${telegramResult.reason?.message || "Falha ao enviar ao Telegram."}`
    );
    return;
  }

  const reasons = [sheetResult, telegramResult]
    .filter(Boolean)
    .map((entry) => entry.reason?.message || "Erro desconhecido")
    .join(" | ");

  showFeedback("error", `Não foi possível concluir o pedido. ${reasons}`);
}

function resolveItemForMaterial(material) {
  const keys = [
    material.id,
    material.name,
    material.name.replace(/\s+/g, " "),
    material.name.replace(/&/g, " e "),
  ]
    .map(normalizeForMatch)
    .filter(Boolean);

  for (const key of keys) {
    if (state.itemIndex.has(key)) {
      return state.itemIndex.get(key);
    }
  }

  const candidates = state.itens.filter((item) => {
    const values = [
      item.id_item,
      item.nome_item,
      item.label,
    ].map(normalizeForMatch);

    return keys.some((key) => values.includes(key) || values.some((value) => value.includes(key) || key.includes(value)));
  });

  return candidates.length === 1 ? candidates[0] : null;
}

function resolveFuncionarioByName(name) {
  const query = normalizeForMatch(name);
  if (!query) return null;

  const exact = state.funcionarios.find((funcionario) => {
    const nome = normalizeForMatch(funcionario.nome);
    const label = normalizeForMatch(funcionario.label);
    return nome === query || label === query;
  });

  if (exact) return exact;

  const partialMatches = state.funcionarios.filter((funcionario) => {
    const nome = normalizeForMatch(funcionario.nome);
    const label = normalizeForMatch(funcionario.label);
    return nome.includes(query) || label.includes(query) || query.includes(nome);
  });

  return partialMatches.length === 1 ? partialMatches[0] : null;
}

function clearAndResetStateMessages() {
  if (feedbackEl) {
    feedbackEl.className = "feedback";
    feedbackEl.textContent = "";
  }
}

function clearSelection() {
  document.querySelectorAll(".material-item").forEach((item) => {
    const checkbox = item.querySelector(".material-check");
    const qtyInput = item.querySelector(".qty-input");
    const material = MATERIALS.find((entry) => entry.id === item.dataset.materialId);

    checkbox.checked = false;
    if (material?.type === "select") {
      qtyInput.selectedIndex = 0;
    } else {
      qtyInput.value = "";
    }
    item.classList.remove("selected");
    item.querySelector(".qty-wrap").style.display = "none";
  });
}

function downloadTXT(conteudo) {
  const agora = new Date();
  const dia = pad(agora.getDate());
  const mes = pad(agora.getMonth() + 1);
  const ano = agora.getFullYear();

  const nomeArquivo = `requisicao-estoque-${dia}-${mes}-${ano}.txt`;

  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
