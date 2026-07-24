(() => {
  const CONFIG = window.ALMOXARIFADO_CONFIG || {};

  const STORAGE_KEYS = {
    bootstrap: "almoxarifado:lastBootstrap",
    draft: "almoxarifado:draft",
    result: "almoxarifado:result",
  };

  const RESULT_PAGE_PATH = "sucess/index.html";

  const DEFAULT_BASES = [
    { value: "-1003549071393", label: "Camaçari" },
    { value: "-00000000000", label: "Juazeiro" },
  ];

  const state = {
    bootstrap: null,
    funcionarios: [],
    itens: [],
    lists: {},
    itemIndex: new Map(),
    funcionarioIndex: new Map(),
    ready: false,
    canSyncSheets: false,
    sheetLoadSource: "none",
    activeTab: "instalador",
  };

  const refs = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    captureRefs();
    bindEvents();
    renderBaseOptions();
    verificarDia();
    setLoadingOverlay(true, "Carregando dados...");
    setStatus("Carregando dados...", "info");

    loadBootstrap()
      .then((data) => {
        applyBootstrap(data, { source: "remote" });
        const issues = Array.isArray(data?.diagnostics?.issues)
          ? data.diagnostics.issues.filter(Boolean)
          : [];

        if (issues.length) {
          setStatus(`Google Sheets conectado com alertas: ${issues.join(" • ")}`, "info");
        } else {
          setStatus("Dados carregados com sucesso.", "success");
        }
      })
      .catch((error) => {
        console.error("Bootstrap remoto indisponível; tentando cache local.", error);

        const cached = readCachedBootstrap();
        if (cached) {
          applyBootstrap(cached, { source: "cache" });
          setStatus("Google Sheets indisponível agora. O formulário foi aberto com os dados salvos no navegador.", "info");
          return;
        }

        const offline = buildOfflineBootstrap(error);
        applyBootstrap(offline, { source: "offline" });
        setStatus("Google Sheets indisponível. O formulário abriu em modo local, sem itens carregados.", "info");
      })
      .finally(() => {
        setLoadingOverlay(false);
      });
  }

  function captureRefs() {
    [
      "requestForm",
      "id_funcionario",
      "baseChatId",
      "feedback",
      "materialsList",
      "clearSelectionBtn",
      "status-dia",
      "loadingOverlay",
      "loadingOverlayText",
    ].forEach((id) => {
      refs[id] = document.getElementById(id);
    });

    refs.technicianSelect = refs.id_funcionario;
    refs.requestForm = document.getElementById("requestForm");
    refs.baseChatId = document.getElementById("baseChatId");
    refs.feedback = document.getElementById("feedback");
    refs.materialsList = document.getElementById("materialsList");
    refs.clearSelectionBtn = document.getElementById("clearSelectionBtn");
    refs.statusDia = document.getElementById("status-dia");
    refs.loadingOverlay = document.getElementById("loadingOverlay");
    refs.loadingOverlayText = document.getElementById("loadingOverlayText");
    refs.materialTabButtons = Array.from(document.querySelectorAll("[data-material-tab]"));
    refs.saveButton = refs.requestForm ? refs.requestForm.querySelector('button[type="submit"]') : null;
    refs.resetButton = null;
  }

  function bindEvents() {
    refs.requestForm?.addEventListener("submit", handleSubmit);
    refs.clearSelectionBtn?.addEventListener("click", () => {
      clearSelection();
      persistDraft();
      setStatus("Seleção de itens limpa.", "info");
    });

    refs.technicianSelect?.addEventListener("change", () => {
      syncSummary();
      persistDraft();
    });

    refs.baseChatId?.addEventListener("change", () => {
      persistDraft();
    });

    refs.materialsList?.addEventListener("input", handleItemChange);
    refs.materialsList?.addEventListener("change", handleItemChange);

    refs.materialTabButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = String(button.dataset.materialTab || "").trim();
        if (!tab || tab === state.activeTab) return;
        setActiveMaterialTab(tab, { clearSelection: true });
      });
    });
  }

  function renderBaseOptions() {
    if (!refs.baseChatId) return;

    const bases = Array.isArray(CONFIG.telegramBases) && CONFIG.telegramBases.length
      ? CONFIG.telegramBases
      : DEFAULT_BASES;

    refs.baseChatId.innerHTML = "";
    refs.baseChatId.add(new Option("Selecione...", ""));

    bases.forEach((base) => {
      const value = String(base?.value ?? "").trim();
      const label = String(base?.label ?? "").trim();
      if (!value || !label) return;
      refs.baseChatId.add(new Option(label, value));
    });

    if (CONFIG.telegramBases?.length) {
      const defaultBase = CONFIG.telegramBases.find((base) => String(base.label || "").trim() === String(CONFIG.baseName || "").trim())
        || CONFIG.telegramBases[0];
      if (defaultBase?.value) refs.baseChatId.value = defaultBase.value;
    } else if (bases[0]?.value) {
      refs.baseChatId.value = bases[0].value;
    }
  }

  function loadBootstrap() {
    if (!CONFIG.appScriptUrl) {
      throw new Error("appScriptUrl ausente em config.js");
    }

    const bootstrapUrl = buildJsonpUrl("bootstrap");

    return jsonpRequest(bootstrapUrl, { timeoutMs: 12000 }).catch((jsonpErr) => {
      console.warn("Bootstrap JSONP falhou, tentando fetch direto:", jsonpErr);

      return apiGet({ action: "bootstrap" }, { timeoutMs: 12000 }).catch(async (fetchErr) => {
        try {
          await apiGet({ action: "health" }, { timeoutMs: 6000 });
          throw new Error(
            `O Apps Script respondeu ao health check, mas o bootstrap falhou. JSONP: ${jsonpErr.message || jsonpErr} | Fetch: ${fetchErr.message || fetchErr}`
          );
        } catch (healthErr) {
          throw new Error(
            `Não foi possível carregar o bootstrap. JSONP: ${jsonpErr.message || jsonpErr} | Fetch: ${fetchErr.message || fetchErr} | Health: ${healthErr.message || healthErr}`
          );
        }
      });
    });
  }

  function applyBootstrap(data, { source = "remote" } = {}) {
    const normalized = normalizeBootstrap(data, source);
    state.bootstrap = normalized;
    state.funcionarios = normalized.funcionarios;
    state.itens = normalized.itens;
    state.lists = normalized.lists;
    state.itemIndex = buildItemIndex(state.itens);
    state.funcionarioIndex = buildFuncionarioIndex(state.funcionarios);
    state.ready = true;
    state.canSyncSheets = Boolean(CONFIG.appScriptUrl) && source !== "offline" && state.funcionarios.length > 0 && state.itens.length > 0;
    state.sheetLoadSource = source;

    cacheBootstrap({ ...normalized, source });
    renderBootstrap(normalized, source);
    restoreDraft();
    syncSummary();
    renderPayloadPreview();
  }

  function normalizeBootstrap(data, source = "remote") {
    const normalized = data && typeof data === "object" ? data : {};
    const defaults = normalized.defaults || {};
    const lists = normalized.lists || {};

    return {
      app: normalized.app || {},
      lists,
      funcionarios: Array.isArray(normalized.funcionarios) ? normalized.funcionarios : [],
      itens: Array.isArray(normalized.itens) ? normalized.itens : [],
      defaults: {
        dateToday: defaults.dateToday || todayIso(),
        pedidoStatus: defaults.pedidoStatus || CONFIG.defaultStatusPedido || "Aberto",
        itemStatus: defaults.itemStatus || CONFIG.defaultStatusItem || "Pendente",
        priority: defaults.priority || CONFIG.defaultPriority || "Normal",
      },
      diagnostics: normalized.diagnostics || {},
      source,
    };
  }

  function buildOfflineBootstrap(error) {
    const message = error && error.message ? error.message : "Falha de comunicação";

    return {
      app: {
        name: CONFIG.appName || "JR TELECOM CAMAÇARI | Solicitação de Materiais",
        version: "local-seed",
      },
      lists: {
        prioridade: [CONFIG.defaultPriority || "Normal", "Alta", "Média", "Baixa"],
        status_pedido: [CONFIG.defaultStatusPedido || "Aberto", "Aprovado", "Separado", "Entregue", "Cancelado"],
        status_item: [CONFIG.defaultStatusItem || "Pendente", "Separado", "Entregue", "Cancelado"],
      },
      funcionarios: [],
      itens: [],
      defaults: {
        dateToday: todayIso(),
        pedidoStatus: CONFIG.defaultStatusPedido || "Aberto",
        itemStatus: CONFIG.defaultStatusItem || "Pendente",
        priority: CONFIG.defaultPriority || "Normal",
      },
      diagnostics: { issues: [message] },
      source: "offline",
    };
  }

  function renderBootstrap(data, source = "remote") {
    document.title = CONFIG.pageTitle || data.app?.name || "JR TELECOM CAMAÇARI | Solicitação de Materiais";

    if (refs.technicianSelect) {
      refs.technicianSelect.innerHTML = "";
      refs.technicianSelect.add(new Option(state.funcionarios.length ? "Selecione um funcionário..." : "Nenhum funcionário carregado", ""));
      state.funcionarios.forEach((funcionario) => {
        const label = funcionario.label || funcionario.nome || `Funcionário ${funcionario.id_funcionario}`;
        refs.technicianSelect.add(new Option(label, String(funcionario.id_funcionario)));
      });
    }

    state.activeTab = getActiveMaterialTab();
    fillPriorityOptions(data);
    updateMaterialTabButtons();
    renderMaterials();
    setDefaultDate(data.defaults?.dateToday || todayIso());
    updateSummaryLabels();
    updateStatusText(data, source);
    updateItemCounters();
    setEmptyStateVisibility();
  }

  function fillPriorityOptions(data) {
    const prioritySelect = document.getElementById("prioridade");
    if (!prioritySelect) return;

    const fallback = [CONFIG.defaultPriority || "Normal", "Alta", "Média", "Baixa"];
    const raw = Array.isArray(data.lists?.prioridade) && data.lists.prioridade.length ? data.lists.prioridade : fallback;

    const options = raw
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    prioritySelect.innerHTML = "";
    options.forEach((value) => prioritySelect.add(new Option(value, value)));

    const preferred = options.includes(CONFIG.defaultPriority) ? CONFIG.defaultPriority : options[0] || (CONFIG.defaultPriority || "Normal");
    prioritySelect.value = preferred;
  }

  function updateStatusText(data, source) {
    const totalFuncionarios = state.funcionarios.length;
    const totalItens = state.itens.length;
    if (!refs.feedback) return;

    const sourceText = source === "remote"
      ? "dados carregados do Google Sheets"
      : source === "cache"
        ? "dados carregados do cache local"
        : "modo local sem integração";

    if (state.canSyncSheets) {
      setStatus(`Funcionários: ${totalFuncionarios} • Itens: ${totalItens} • ${sourceText}.`, "success");
    } else {
      setStatus(`Funcionários: ${totalFuncionarios} • Itens: ${totalItens} • ${sourceText}.`, "info");
    }
  }

  function renderMaterials() {
    if (!refs.materialsList) return;

    refs.materialsList.innerHTML = "";

    const items = getItemsForActiveTab();
    if (!items.length) {
      setEmptyStateVisibility();
      return;
    }

    items.forEach((item) => {
      refs.materialsList.appendChild(createMaterialCard(item));
    });

    setEmptyStateVisibility();
  }

  function createMaterialCard(item) {
    const article = document.createElement("article");
    article.className = "material-item";
    article.dataset.itemId = String(item.id_item || "");

    const itemId = String(item.id_item || "").trim();
    const domId = `item-${itemId.replace(/[^a-zA-Z0-9-_]+/g, "_") || Math.random().toString(36).slice(2)}`;
    const name = item.label || item.nome_item || `Item ${itemId}`;
    const estoqueMinimo = getStockMinimumValue(item);
    const descParts = [];
    if (item.nome_item && item.nome_item !== name) descParts.push(item.nome_item);
    if (item.unidade) descParts.push(`Unidade: ${item.unidade}`);
    if (estoqueMinimo !== null) {
      descParts.push(`Estoque mínimo: ${estoqueMinimo}`);
    }

    const tabLabel = getMaterialTabLabel(getMaterialTabKey(item));
    descParts.unshift(`Aba: ${tabLabel}`);

    if (!descParts.length) descParts.push("Carregado do Google Sheets.");

    article.innerHTML = `
      <div class="material-top">
        <input type="checkbox" id="${domId}" class="material-check" aria-label="Selecionar ${escapeHtml(name)}" data-role="select-item" />
        <div class="material-label">
          <label for="${domId}" class="material-name">${escapeHtml(name)}</label>
          <div class="material-desc">${escapeHtml(descParts.join(" • "))}</div>
        </div>
      </div>
      <div class="qty-wrap">
        <label for="${domId}-qty">Quantidade</label>
        ${buildQuantityControlHtml({ item, domId })}
      </div>
    `;

    const checkbox = article.querySelector(".material-check");
    const qtyWrap = article.querySelector(".qty-wrap");
    const qtyControl = article.querySelector(".qty-input");

    const syncSelection = () => {
      const selected = Boolean(checkbox?.checked);
      article.classList.toggle("selected", selected);
      qtyWrap.style.display = selected ? "grid" : "none";
      if (selected) {
        setCardQuantityValue(article, item, parsePositiveInteger(qtyControl?.value));
      }
    };

    checkbox.addEventListener("change", syncSelection);

    if (qtyControl?.tagName === "INPUT") {
      qtyControl.addEventListener("input", () => {
        if (qtyControl.value === "") return;
        const value = Number(qtyControl.value);
        if (!Number.isInteger(value) || value < 1) qtyControl.value = "1";
      });
    }

    syncSelection();
    return article;
  }

  function getMaterialTabSourceValue(item) {
    const candidates = [
      item?.observacao,
      item?.observation,
      item?.obs,
      item?.observacoes,
      item?.aba,
      item?.categoria,
      item?.tipo_item,
      item?.tipo,
      item?.grupo,
      item?.setor,
    ];

    return candidates.find((value) => String(value ?? "").trim()) ?? "";
  }

  function getMaterialTabKey(item) {
    const normalized = normalizeForMatch(getMaterialTabSourceValue(item));

    if (normalized.includes("estrutura") || normalized.includes("estrut")) return "estrutura";
    if (normalized.includes("instalador") || normalized.includes("instal")) return "instalador";

    return "instalador";
  }

  function getMaterialTabLabel(tab) {
    return tab === "estrutura" ? "Estrutura" : "Instalador";
  }

  function getItemsForActiveTab() {
    const activeTab = getActiveMaterialTab();
    return state.itens.filter((item) => getMaterialTabKey(item) === activeTab);
  }

  function getActiveMaterialTab() {
    return state.activeTab === "estrutura" ? "estrutura" : "instalador";
  }

  function updateMaterialTabButtons() {
    const activeTab = getActiveMaterialTab();

    refs.materialTabButtons?.forEach((button) => {
      const tab = String(button.dataset.materialTab || "").trim();
      const isActive = tab === activeTab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  }

  function setActiveMaterialTab(tab, { clearSelection: shouldClearSelection = true } = {}) {
    const normalizedTab = tab === "estrutura" ? "estrutura" : "instalador";
    const previousTab = getActiveMaterialTab();

    if (previousTab === normalizedTab) return;

    if (shouldClearSelection) {
      clearSelection({ silent: true });
    }

    state.activeTab = normalizedTab;
    updateMaterialTabButtons();
    renderMaterials();
    syncSummary();
    updateItemCounters();
    renderPayloadPreview();
    persistDraft();
    setStatus(`Aba ${getMaterialTabLabel(normalizedTab)} selecionada. As escolhas anteriores foram limpas.`, "info");
  }

  function parsePositiveInteger(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const integer = Math.trunc(parsed);
    return integer > 0 ? integer : null;
  }

  function getStockMinimumValue(item) {
    return parsePositiveInteger(item?.estoque_minimo);
  }

  function getStockMultiplierLimit() {
    return parsePositiveInteger(CONFIG.stockMinimumMultiplierLimit) || 2;
  }

  function buildQuantityOptions(minimum, multiplierLimit = getStockMultiplierLimit()) {
    if (!Number.isInteger(minimum) || minimum <= 0) return [];
    const limit = Math.max(1, Number(multiplierLimit) || 1);
    return Array.from({ length: limit }, (_, index) => minimum * (index + 1));
  }

  function buildQuantityControlHtml({ item, domId }) {
    const minimum = getStockMinimumValue(item);

    if (minimum === null) {
      return `
        <input
          id="${domId}-qty"
          class="qty-input qty-number"
          type="number"
          min="1"
          step="1"
          value="1"
          inputmode="numeric"
          aria-label="Quantidade de ${escapeHtml(item.label || item.nome_item || `Item ${item.id_item || ""}`)}"
        />
      `;
    }

    const options = buildQuantityOptions(minimum);
    const optionsHtml = options.map((value) => `<option value="${value}">${value}</option>`).join("");

    return `
      <select
        id="${domId}-qty"
        class="qty-input qty-select"
        aria-label="Quantidade de ${escapeHtml(item.label || item.nome_item || `Item ${item.id_item || ""}`)}"
      >
        ${optionsHtml}
      </select>
    `;
  }

  function setCardQuantityValue(card, item, preferredQuantity = null) {
    const qtyControl = card.querySelector(".qty-input");
    if (!qtyControl) return;

    const minimum = getStockMinimumValue(item);
    const preferred = parsePositiveInteger(preferredQuantity);

    if (minimum === null) {
      qtyControl.value = String(preferred || 1);
      return;
    }

    const options = buildQuantityOptions(minimum);
    const target = options.includes(preferred) ? preferred : options[0];
    qtyControl.value = String(target || minimum);
  }

  function getItemForCard(card) {
    if (!card) return null;
    return state.itemIndex.get(normalizeForMatch(card.dataset.itemId || "")) || null;
  }

  function isQuantityAllowedForItem(item, quantity) {
    const parsed = parsePositiveInteger(quantity);
    if (!parsed) return false;

    const minimum = getStockMinimumValue(item);
    if (minimum === null) return parsed > 0;

    return buildQuantityOptions(minimum).includes(parsed);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setDefaultDate(value) {
    const dateInput = document.getElementById("data_pedido");
    if (!dateInput) return;
    dateInput.value = value || todayIso();
  }

  function buildItemIndex(itens = []) {
    const index = new Map();
    itens.forEach((item) => {
      const variants = [
        item.id_item,
        item.nome_item,
        item.label,
      ];

      variants.forEach((variant) => {
        const key = normalizeForMatch(variant);
        if (key) index.set(key, item);
      });
    });
    return index;
  }

  function buildFuncionarioIndex(funcionarios = []) {
    const index = new Map();
    funcionarios.forEach((funcionario) => {
      const variants = [funcionario.id_funcionario, funcionario.nome, funcionario.label];
      variants.forEach((variant) => {
        const key = normalizeForMatch(variant);
        if (key) index.set(key, funcionario);
      });
    });
    return index;
  }

  function normalizeForMatch(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " e ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function renderPayloadPreview(payload = buildPayload()) {
    const preview = document.getElementById("payloadPreview");
    if (!preview) return;
    preview.textContent = JSON.stringify(payload, null, 2);
  }

  function updateSummaryLabels() {
    const funcionarioLabel = document.getElementById("summaryFuncionario");
    const prioridadeLabel = document.getElementById("summaryPrioridade");
    const itensLabel = document.getElementById("summaryItens");
    const quantidadeLabel = document.getElementById("summaryQuantidade");

    if (funcionarioLabel) funcionarioLabel.textContent = "--";
    if (prioridadeLabel) prioridadeLabel.textContent = CONFIG.defaultPriority || "Normal";
    if (itensLabel) itensLabel.textContent = "0";
    if (quantidadeLabel) quantidadeLabel.textContent = "0";
  }

  function syncSummary() {
    const payload = buildPayload();
    const funcionario = state.funcionarios.find((f) => String(f.id_funcionario) === String(payload.id_funcionario));
    const totalQuantidade = payload.itens.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);

    const funcionarioLabel = document.getElementById("summaryFuncionario");
    const prioridadeLabel = document.getElementById("summaryPrioridade");
    const itensLabel = document.getElementById("summaryItens");
    const quantidadeLabel = document.getElementById("summaryQuantidade");
    const countLabel = document.getElementById("statItensSelecionados");

    if (funcionarioLabel) funcionarioLabel.textContent = funcionario?.label || funcionario?.nome || "--";
    if (prioridadeLabel) prioridadeLabel.textContent = payload.prioridade || CONFIG.defaultPriority || "Normal";
    if (itensLabel) itensLabel.textContent = String(payload.itens.length);
    if (quantidadeLabel) quantidadeLabel.textContent = String(totalQuantidade);
    if (countLabel) countLabel.textContent = String(payload.itens.length);

    renderPayloadPreview(payload);
  }

  function updateItemCounters() {
    const statFuncionarios = document.getElementById("statFuncionarios");
    const statItens = document.getElementById("statItens");
    const statItensSelecionados = document.getElementById("statItensSelecionados");

    if (statFuncionarios) statFuncionarios.textContent = String(state.funcionarios.length);
    if (statItens) statItens.textContent = String(state.itens.length);
    if (statItensSelecionados) statItensSelecionados.textContent = String(buildPayload().itens.length);
  }

  function setEmptyStateVisibility() {
    const empty = document.getElementById("itemsEmpty");
    if (!empty) return;

    const activeTab = getActiveMaterialTab();
    const activeLabel = getMaterialTabLabel(activeTab);
    const visibleItems = getItemsForActiveTab();
    const hasRows = Boolean(refs.materialsList && refs.materialsList.querySelector(".material-item"));

    empty.style.display = hasRows ? "none" : "block";
    empty.textContent = visibleItems.length
      ? `Nenhum item selecionado ainda na aba ${activeLabel}. Marque os itens acima para montar o pedido.`
      : `Nenhum item da aba ${activeLabel} foi carregado do Google Sheets nesta sessão.`;
  }

  function clearSelection({ silent = false } = {}) {
    refs.materialsList?.querySelectorAll(".material-item").forEach((card) => {
      const checkbox = card.querySelector(".material-check");
      const item = getItemForCard(card);
      if (checkbox) checkbox.checked = false;
      setCardQuantityValue(card, item);
      card.classList.remove("selected");
      const qtyWrap = card.querySelector(".qty-wrap");
      if (qtyWrap) qtyWrap.style.display = "none";
    });

    if (!silent) {
      syncSummary();
      updateItemCounters();
      renderPayloadPreview();
    }
  }

  function buildPayload() {
    const id_funcionario = refs.technicianSelect?.value || "";
    const data_pedido = document.getElementById("data_pedido")?.value || todayIso();
    const prioridade = document.getElementById("prioridade")?.value || CONFIG.defaultPriority || "Normal";
    const observacao = document.getElementById("observacao")?.value.trim() || "";

    const itens = Array.from(refs.materialsList?.querySelectorAll(".material-item") || [])
      .map((card) => {
        const checkbox = card.querySelector(".material-check");
        const qtyInput = card.querySelector(".qty-input");
        const itemId = String(card.dataset.itemId || "").trim();
        const quantidade = Number(qtyInput?.value || 0);

        if (!checkbox?.checked) return null;
        if (!itemId || !Number.isInteger(quantidade) || quantidade <= 0) return null;

        const item = state.itemIndex.get(normalizeForMatch(itemId)) || null;
        if (!item || !isQuantityAllowedForItem(item, quantidade)) return null;

        return {
          id_item: itemId,
          quantidade,
          status_item: CONFIG.defaultStatusItem || "Pendente",
          observacao: "",
          label: item?.label || item?.nome_item || itemId,
          unidade: item?.unidade || "",
        };
      })
      .filter(Boolean);

    return {
      id_funcionario,
      data_pedido,
      prioridade,
      observacao,
      status: CONFIG.defaultStatusPedido || "Aberto",
      itens,
    };
  }

  function getSelectedItemsForMessage() {
    return buildPayload().itens;
  }

  function validateForm() {
    const payload = buildPayload();

    if (!payload.id_funcionario) {
      setStatus("Selecione um funcionário antes de enviar.", "error");
      refs.technicianSelect?.focus();
      return false;
    }

    if (!payload.data_pedido) {
      setStatus("Informe a data do pedido.", "error");
      return false;
    }

    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      setStatus("Marque ao menos um item com quantidade válida.", "error");
      return false;
    }

    const invalidCard = Array.from(refs.materialsList?.querySelectorAll(".material-item") || []).find((card) => {
      const checkbox = card.querySelector(".material-check");
      const qtyInput = card.querySelector(".qty-input");
      const item = getItemForCard(card);
      return Boolean(checkbox?.checked) && !isQuantityAllowedForItem(item, qtyInput?.value);
    });

    if (invalidCard) {
      setStatus("Corrija a quantidade dos itens selecionados.", "error");
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearFeedback();

    if (!validateForm()) return;

    const currentShape = resolveShapeForCurrentSelection();
    const selectedItems = getSelectedItemsForMessage();
    const generatedAt = formatDateTime(new Date());
    const telegramMessage = buildTelegramMessage(currentShape, selectedItems, generatedAt);
    const shareText = buildSuccessShareText({ currentShape, selectedItems, generatedAt });
    let sheetPayload;

    setLoadingOverlay(true, "Enviando pedido...");

    try {
      sheetPayload = buildPayloadForSheets(selectedItems, currentShape);

      if (!state.canSyncSheets) {
        if (!CONFIG.sendTelegram) {
          throw new Error("Nenhum destino de envio está habilitado nesta sessão.");
        }

        const telegramResult = normalizeSettledResult(
          await Promise.resolve()
            .then(() => sendToTelegram(telegramMessage, currentShape.baseChatId))
            .then(
              (value) => ({ status: "fulfilled", value }),
              (reason) => ({ status: "rejected", reason })
            )
        );

        const telegramOk = telegramResult.status === "fulfilled";
        if (telegramOk) {
          const successPayload = {
            mode: "success",
            title: "Pedido enviado com sucesso",
            fileName: `requisicao-estoque-${generatedAt.date.replace(/\//g, "-")}.txt`,
            fileText: shareText,
            currentShape,
            selectedItems,
            generatedAt,
            sheetPayload,
            summary: {
              funcionario: currentShape.technicianName,
              base: currentShape.baseName,
              totalItens: selectedItems.length,
              totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
            },
            autoDownloaded: false,
          };

          storeResultPayload(successPayload);
          persistDraft(true);
          window.location.replace(buildResultPageUrl("success"));
          return;
        }

        const reportText = buildSupportReport(telegramResult.reason, {
          stage: "enviar ao Telegram",
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          stack: telegramResult.reason?.stack,
        });

        const errorPayload = {
          mode: "error",
          title: "Ocorreu um erro ao enviar o pedido",
          fileName: `erro-pedido-${generatedAt.date.replace(/\//g, "-")}.txt`,
          fileText: reportText,
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          errorMessage: String(telegramResult.reason?.message || telegramResult.reason || "Falha ao enviar ao Telegram."),
          errorStack: String(telegramResult.reason?.stack || "stack não disponível"),
          summary: {
            funcionario: currentShape.technicianName,
            base: currentShape.baseName,
            totalItens: selectedItems.length,
            totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
          },
          autoDownloaded: false,
        };

        storeResultPayload(errorPayload);
        persistDraft();
        window.location.assign(buildResultPageUrl("error"));
        return;
      }

      const settledResults = await Promise.allSettled([
        CONFIG.sendGoogleSheets ? sendToSheets(sheetPayload) : Promise.resolve(null),
        CONFIG.sendTelegram ? sendToTelegram(telegramMessage, currentShape.baseChatId) : Promise.resolve(null),
      ]);

      const sheetResult = normalizeSettledResult(settledResults[0]);
      const telegramResult = normalizeSettledResult(settledResults[1]);

      const sheetOk = !CONFIG.sendGoogleSheets || sheetResult.status === "fulfilled";
      const telegramOk = !CONFIG.sendTelegram || telegramResult.status === "fulfilled";

      if (sheetOk && telegramOk) {
        const successPayload = {
          mode: "success",
          title: "Pedido enviado com sucesso",
          fileName: `requisicao-estoque-${generatedAt.date.replace(/\//g, "-")}.txt`,
          fileText: shareText,
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          summary: {
            funcionario: currentShape.technicianName,
            base: currentShape.baseName,
            totalItens: selectedItems.length,
            totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
          },
          autoDownloaded: false,
        };

        storeResultPayload(successPayload);
        persistDraft(true);
        window.location.replace(buildResultPageUrl("success"));
        return;
      }

      if (!sheetOk && telegramOk) {
        const reportText = buildSupportReport(sheetResult.reason, {
          stage: "salvar pedido",
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          stack: sheetResult.reason?.stack,
          telegramResult,
        });

        const errorPayload = {
          mode: "error",
          title: "Ocorreu um erro ao enviar o pedido",
          fileName: `erro-pedido-${generatedAt.date.replace(/\//g, "-")}.txt`,
          fileText: reportText,
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          errorMessage: String(sheetResult.reason?.message || sheetResult.reason || "Falha ao gravar nas planilhas."),
          errorStack: String(sheetResult.reason?.stack || "stack não disponível"),
          summary: {
            funcionario: currentShape.technicianName,
            base: currentShape.baseName,
            totalItens: selectedItems.length,
            totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
          },
          autoDownloaded: false,
        };

        storeResultPayload(errorPayload);
        persistDraft();
        window.location.assign(buildResultPageUrl("error"));
        return;
      }

      if (sheetOk && !telegramOk) {
        const reportText = buildSupportReport(telegramResult.reason, {
          stage: "enviar ao Telegram",
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          stack: telegramResult.reason?.stack,
          sheetResult,
        });

        const errorPayload = {
          mode: "error",
          title: "Ocorreu um erro ao enviar o pedido",
          fileName: `erro-pedido-${generatedAt.date.replace(/\//g, "-")}.txt`,
          fileText: reportText,
          currentShape,
          selectedItems,
          generatedAt,
          sheetPayload,
          errorMessage: String(telegramResult.reason?.message || telegramResult.reason || "Falha ao enviar ao Telegram."),
          errorStack: String(telegramResult.reason?.stack || "stack não disponível"),
          summary: {
            funcionario: currentShape.technicianName,
            base: currentShape.baseName,
            totalItens: selectedItems.length,
            totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
          },
          autoDownloaded: false,
        };

        storeResultPayload(errorPayload);
        persistDraft();
        window.location.assign(buildResultPageUrl("error"));
        return;
      }

      const reasons = [sheetResult, telegramResult]
        .filter(Boolean)
        .map((entry) => entry.reason?.message || "Erro desconhecido")
        .join(" | ");

      const reportText = buildSupportReport(new Error(reasons), {
        stage: "salvar pedido",
        currentShape,
        selectedItems,
        generatedAt,
        sheetPayload,
        stack: [sheetResult, telegramResult]
          .filter(Boolean)
          .map((entry) => entry.reason?.stack || "stack não disponível")
          .join("\n\n"),
        sheetResult,
        telegramResult,
      });

      const errorPayload = {
        mode: "error",
        title: "Ocorreu um erro ao enviar o pedido",
        fileName: `erro-pedido-${generatedAt.date.replace(/\//g, "-")}.txt`,
        fileText: reportText,
        currentShape,
        selectedItems,
        generatedAt,
        sheetPayload,
        errorMessage: `Não foi possível concluir o pedido. ${reasons}`,
        errorStack: "stack não disponível",
        summary: {
          funcionario: currentShape.technicianName,
          base: currentShape.baseName,
          totalItens: selectedItems.length,
          totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
        },
        autoDownloaded: false,
      };

      storeResultPayload(errorPayload);
      persistDraft();
      window.location.assign(buildResultPageUrl("error"));
    } catch (error) {
      console.error(error);

      const reportText = buildSupportReport(error, {
        stage: "enviar pedido",
        currentShape,
        selectedItems,
        generatedAt,
        sheetPayload,
        stack: error?.stack,
      });

      const errorPayload = {
        mode: "error",
        title: "Ocorreu um erro ao enviar o pedido",
        fileName: `erro-pedido-${generatedAt.date.replace(/\//g, "-")}.txt`,
        fileText: reportText,
        currentShape,
        selectedItems,
        generatedAt,
        sheetPayload,
        errorMessage: String(error?.message || error || "Erro desconhecido"),
        errorStack: String(error?.stack || "stack não disponível"),
        summary: {
          funcionario: currentShape.technicianName,
          base: currentShape.baseName,
          totalItens: selectedItems.length,
          totalQuantidade: selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
        },
        autoDownloaded: false,
      };

      storeResultPayload(errorPayload);
      persistDraft();
      window.location.assign(buildResultPageUrl("error"));
    } finally {
      setLoadingOverlay(false);
    }
  }

  function resolveShapeForCurrentSelection() {

    const technicianSelect = refs.technicianSelect;
    const baseSelect = refs.baseChatId;
    const tecnicoId = technicianSelect?.value || "";
    const funcionario = state.funcionarioIndex.get(normalizeForMatch(tecnicoId)) || null;
    const base = getSelectedBase();

    return {
      technicianName: funcionario?.label || funcionario?.nome || technicianSelect?.selectedOptions?.[0]?.textContent || "",
      funcionario,
      baseChatId: baseSelect?.value || "",
      baseName: base?.label || CONFIG.baseName || "CAMAÇARI",
    };
  }

  function getSelectedBase() {
    const baseSelect = refs.baseChatId;
    if (!baseSelect) return null;
    const selected = Array.from(baseSelect.options).find((option) => option.value === baseSelect.value);
    if (!selected) return null;
    return {
      value: selected.value,
      label: selected.textContent,
    };
  }

  function buildPayloadForSheets(selectedItems, currentShape) {
    const id_funcionario = currentShape.funcionario?.id_funcionario || refs.technicianSelect?.value;
    if (!id_funcionario) {
      throw new Error("Selecione um funcionário cadastrado no Google Sheets.");
    }

    const itens = selectedItems.map((selected) => ({
      id_item: String(selected.id_item),
      quantidade: Number(selected.quantidade),
      status_item: CONFIG.defaultStatusItem || "Pendente",
      observacao: "",
    }));

    if (!itens.length) {
      throw new Error("Selecione ao menos um item válido.");
    }

    return {
      id_funcionario: String(id_funcionario),
      data_pedido: document.getElementById("data_pedido")?.value || todayIso(),
      prioridade: document.getElementById("prioridade")?.value || CONFIG.defaultPriority || "Normal",
      observacao: document.getElementById("observacao")?.value.trim() || `Base telegram: ${currentShape.baseName}`,
      status: CONFIG.defaultStatusPedido || "Aberto",
      itens,
    };
  }

  function buildTelegramMessage(data, selectedItems, generatedAt) {
    const itemsText = selectedItems.length
      ? selectedItems.map((item) => {
          const unit = item.unidade ? ` ${item.unidade}` : "";
          return `🔹 ${item.label || item.id_item}: ${item.quantidade}${unit}`;
        }).join("\n")
      : "🔹 Nenhum item selecionado";

    return [
      "—> PEDIDO DE ESTOQUE <—",
      "🚨 Nova Solicitação 🚨",
      "",
      `👷 Funcionário: ${data.technicianName}`,
      `🏢 Base: ${data.baseName}`,
      `📅 Data: ${generatedAt.date}`,
      `⏰ Horário: ${generatedAt.time}`,
      "",
      "🧰 Itens solicitados:",
      "------------------------------",
      itemsText,
      "------------------------------",
      "",
      `Observação: ${document.getElementById("observacao")?.value.trim() || "Sem observação"}`,
    ].join("\n");
  }

  function formatDateTime(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return {
      date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    };
  }

  function downloadTXT(content) {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const name = `requisicao-estoque-${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}.txt`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function sendToTelegram(message, chatId) {
    const token = CONFIG.telegramBotToken;

    if (!token || token.includes("COLOQUE_")) {
      throw new Error("Configure o token do Telegram em config.js.");
    }

    if (!chatId) {
      throw new Error("Selecione uma base válida.");
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = { chat_id: chatId, text: message };

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
      throw new Error(`Falha de comunicação com o Telegram: ${error.message || error}`);
    }
  }

  async function sendToSheets(payload) {
    if (!state.canSyncSheets) {
      throw new Error("Google Sheets indisponível nesta sessão.");
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

  function apiUrl(params = {}) {
    if (!CONFIG.appScriptUrl) {
      throw new Error("appScriptUrl ausente em config.js");
    }

    const url = new URL(CONFIG.appScriptUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  }

  function buildJsonpUrl(action) {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(apiUrl({ action }));
    url.searchParams.set("callback", callbackName);
    return { url: url.toString(), callbackName };
  }

  function jsonpRequest(request, { timeoutMs = 12000 } = {}) {
    const requestInfo = typeof request === "string" ? { url: request, callbackName: null } : request;
    const requestUrl = new URL(requestInfo.url || request);
    const callbackName = requestInfo.callbackName || `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    requestUrl.searchParams.set("callback", callbackName);

    return new Promise((resolve, reject) => {
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

  function cacheBootstrap(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.bootstrap, JSON.stringify(data));
    } catch (error) {
      console.warn("Não foi possível salvar o bootstrap em cache:", error);
    }
  }

  function readCachedBootstrap() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.bootstrap);
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

  function persistDraft(clear = false) {
    try {
      if (clear) {
        localStorage.removeItem(STORAGE_KEYS.draft);
        return;
      }

      localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(buildPayload()));
    } catch (error) {
      console.warn("Não foi possível salvar o rascunho:", error);
    }
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.draft);
      if (!saved) return;

      const draft = JSON.parse(saved);
      if (draft?.id_funcionario && refs.technicianSelect) {
        refs.technicianSelect.value = String(draft.id_funcionario);
      }
      if (draft?.data_pedido) {
        const dateInput = document.getElementById("data_pedido");
        if (dateInput) dateInput.value = draft.data_pedido;
      }
      if (draft?.prioridade) {
        const prioritySelect = document.getElementById("prioridade");
        if (prioritySelect) prioritySelect.value = draft.prioridade;
      }
      if (draft?.observacao) {
        const obsInput = document.getElementById("observacao");
        if (obsInput) obsInput.value = draft.observacao;
      }

      if (Array.isArray(draft.itens) && draft.itens.length) {
        refs.materialsList?.querySelectorAll(".material-item").forEach((card) => {
          const itemId = String(card.dataset.itemId || "");
          const selected = draft.itens.find((item) => String(item.id_item) === itemId);
          const checkbox = card.querySelector(".material-check");
          if (!checkbox) return;

          checkbox.checked = Boolean(selected);
          setCardQuantityValue(card, getItemForCard(card), selected ? selected.quantidade : null);

          const qtyWrap = card.querySelector(".qty-wrap");
          if (qtyWrap) qtyWrap.style.display = checkbox.checked ? "grid" : "none";
          card.classList.toggle("selected", checkbox.checked);
        });
      }

      setStatus("Rascunho recuperado do navegador.", "success");
    } catch (error) {
      console.warn("Não foi possível recuperar o rascunho:", error);
    }
  }

  function handleItemChange(event) {
    if (!event.target.closest(".material-item")) return;
    syncSummary();
    persistDraft();
  }

  function clearFeedback() {
    if (!refs.feedback) return;
    refs.feedback.className = "feedback";
    refs.feedback.textContent = "";
  }

  function setLoadingOverlay(visible, message = "Carregando Dados") {
    if (refs.loadingOverlay) {
      refs.loadingOverlay.hidden = !visible;
    }
    if (refs.loadingOverlayText && message) {
      refs.loadingOverlayText.textContent = message;
    }

    document.body.classList.toggle("loading-locked", Boolean(visible));
    refs.requestForm?.setAttribute("aria-busy", visible ? "true" : "false");

    refs.requestForm?.querySelectorAll("input, select, textarea, button").forEach((element) => {
      if ("disabled" in element) {
        element.disabled = Boolean(visible);
      }
    });
  }

  function setStatus(message, type = "info") {
    if (!refs.feedback) return;
    refs.feedback.className = `feedback show ${type}`;
    refs.feedback.textContent = message;
  }

  function normalizeWhatsAppNumber(value) {
    const digits = String(value || "").replace(/\D+/g, "");
    if (digits.length === 11) return digits;
    return "";
  }

  function buildResultPageUrl(mode = "success") {
    const url = new URL(RESULT_PAGE_PATH, window.location.href);
    url.searchParams.set("mode", mode);
    return url.toString();
  }

  function storeResultPayload(payload) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.result, JSON.stringify(payload));
    } catch (error) {
      console.warn("Não foi possível salvar o resultado da requisição:", error);
    }
  }

  function readResultPayload() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.result);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Não foi possível ler o resultado da requisição:", error);
      return null;
    }
  }

  function createTextDownload(content, filename) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function normalizeSettledResult(entry) {
    if (entry && typeof entry === "object" && "status" in entry) {
      return entry;
    }

    return { status: "fulfilled", value: null };
  }

  function buildSupportReport(error, context = {}) {
    const lines = [
      "RELATÓRIO DE ERRO - ALMOXARIFADO",
      `Data/Hora: ${new Date().toLocaleString("pt-BR")}`,
      `Mensagem: ${String(error?.message || error || "Erro desconhecido")}`,
      `Etapa: ${context.stage || "não informada"}`,
      "",
      "DETALHES TÉCNICOS",
      `Stack: ${String(error?.stack || context.stack || "stack não disponível")}`,
      "",
      "DADOS DA TENTATIVA",
      JSON.stringify({
        funcionario: context.currentShape?.technicianName || "",
        base: context.currentShape?.baseName || "",
        totalItens: Array.isArray(context.selectedItems) ? context.selectedItems.length : 0,
        totalQuantidade: Array.isArray(context.selectedItems)
          ? context.selectedItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0)
          : 0,
        payload: context.sheetPayload || null,
      }, null, 2),
    ];

    return lines.join("\n");
  }

  function buildSuccessShareText(context = {}) {
    const lines = [
      "REQUISIÇÃO DE MATERIAIS ENVIADA COM SUCESSO",
      `Funcionário: ${context.currentShape?.technicianName || ""}`,
      `Base: ${context.currentShape?.baseName || ""}`,
      `Data: ${context.generatedAt?.date || ""}`,
      `Hora: ${context.generatedAt?.time || ""}`,
      "",
      "Itens:",
      ...(Array.isArray(context.selectedItems)
        ? context.selectedItems.map((item) => `- ${item.label || item.id_item}: ${item.quantidade}${item.unidade ? ` ${item.unidade}` : ""}`)
        : []),
    ];

    return lines.join("\n");
  }

  function getDefaultSupportNumber() {
    return normalizeWhatsAppNumber(CONFIG.supportWhatsAppNumber || "71981768164");
  }

  function getSuccessForwardNumber() {
    return normalizeWhatsAppNumber(CONFIG.successWhatsAppNumber || "");
  }

  function isCommunicationError(error) {
    const message = String(error?.message || error || "");
    return /failed to fetch|networkerror|fetch failed|cors|load failed|abort/i.test(message);
  }

  function todayIso() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function verificarDia() {
    try {
      if (!refs.statusDia) return;

      const hoje = new Date().getDay();
      const diasPermitidos = [2, 4, 6];
      const nomesDias = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ];

      refs.statusDia.textContent = nomesDias[hoje];

      if (diasPermitidos.includes(hoje)) {
        refs.statusDia.classList.add("ok");
        refs.statusDia.classList.remove("erro");
      } else {
        refs.statusDia.classList.add("erro");
        refs.statusDia.classList.remove("ok");
      }
    } catch (error) {
      console.error(error);
      setStatus(error.message, "error");
    }
  }
})();
