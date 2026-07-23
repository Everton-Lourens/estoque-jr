(() => {
  const CONFIG = window.ALMOXARIFADO_CONFIG || {};
  const state = {
    bootstrap: null,
    funcionarios: [],
    itens: [],
    lists: {},
    items: [],
    ready: false,
  };

  const refs = {};
  const templates = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    captureRefs();
    bindEvents();
    setStatus("Carregando dados iniciais do Apps Script...");
    loadBootstrap()
      .then((data) => {
        state.bootstrap = data;
        state.funcionarios = Array.isArray(data.funcionarios) ? data.funcionarios : [];
        state.itens = Array.isArray(data.itens) ? data.itens : [];
        state.lists = data.lists || {};
        state.ready = true;

        renderBootstrap(data);
        restoreDraft();
        syncSummary();
        setStatus("Dados carregados. Monte o pedido e envie quando estiver pronto.", "success");
      })
      .catch((err) => {
        console.error(err);
        setStatus(
          "Não foi possível carregar o bootstrap. Verifique o URL do Apps Script e a publicação do web app.",
          "error"
        );
      });
  }

  function captureRefs() {
    const ids = [
      "appPill","statFuncionarios","statItens","statItensSelecionados","dbStatus","dbDescription",
      "defaultDate","pedidoForm","id_funcionario","data_pedido","prioridade","observacao","itemsList",
      "itemsEmpty","summaryItens","summaryQuantidade","summaryFuncionario","summaryPrioridade",
      "saveBtn","resetBtn","statusBox","payloadPreview","addItemBtn","pedidoStatusBadge"
    ];
    ids.forEach((id) => refs[id] = document.getElementById(id));
    templates.itemRow = document.getElementById("itemRowTemplate");
  }

  function bindEvents() {
    refs.addItemBtn.addEventListener("click", () => addItemRow());
    refs.resetBtn.addEventListener("click", resetForm);
    refs.saveBtn.addEventListener("click", submitPedido);

    refs.id_funcionario.addEventListener("change", () => {
      syncSummary();
      persistDraft();
    });
    refs.data_pedido.addEventListener("change", persistDraft);
    refs.prioridade.addEventListener("change", () => {
      syncSummary();
      persistDraft();
    });
    refs.observacao.addEventListener("input", persistDraft);

    refs.itemsList.addEventListener("input", handleItemInput);
    refs.itemsList.addEventListener("change", handleItemInput);
    refs.itemsList.addEventListener("click", handleItemClick);
  }

  function loadBootstrap() {
    if (!CONFIG.appScriptUrl) {
      return Promise.reject(new Error("appScriptUrl ausente em config.js"));
    }

    return jsonpRequest(`${CONFIG.appScriptUrl}${CONFIG.apiPaths.bootstrap}&callback=bootstrapCallback`);
  }

  function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      window[callbackName] = (payload) => {
        cleanup();
        resolve(unpackApiPayload(payload));
      };

      const script = document.createElement("script");
      script.src = url.replace("bootstrapCallback", callbackName);
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error("Falha ao carregar JSONP"));
      };

      function cleanup() {
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
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

  function renderBootstrap(data) {
    refs.appPill.textContent = data.app?.name || CONFIG.appName;
    refs.dbStatus.textContent = "Conectado";
    refs.dbDescription.textContent = "Funcionários, itens e listas carregados do Google Sheets via Apps Script.";
    refs.defaultDate.textContent = data.defaults?.dateToday || todayIso();
    refs.pedidoStatusBadge.textContent = data.defaults?.pedidoStatus || CONFIG.defaultStatusPedido;

    refs.statFuncionarios.textContent = String(state.funcionarios.length);
    refs.statItens.textContent = String(state.itens.length);

    fillPriorityOptions(data);
    fillFuncionarioOptions();
    clearAndSeedItems();
    updateSummaryLabels();
    renderPayloadPreview();
  }

  function fillPriorityOptions(data) {
    const options = buildOptionsFromList(data.lists?.prioridade, [CONFIG.defaultPriority, "Alta", "Média", "Baixa"]);
    refs.prioridade.innerHTML = "";
    options.forEach(({ value, label }) => refs.prioridade.add(new Option(label, value)));
    refs.prioridade.value = CONFIG.defaultPriority;
  }

  function fillFuncionarioOptions() {
    refs.id_funcionario.innerHTML = "";
    refs.id_funcionario.add(new Option("Selecione um funcionário...", ""));
    state.funcionarios.forEach((funcionario) => {
      const label = funcionario.label || funcionario.nome || `Funcionário ${funcionario.id_funcionario}`;
      refs.id_funcionario.add(new Option(label, String(funcionario.id_funcionario)));
    });
  }

  function clearAndSeedItems() {
    refs.itemsList.innerHTML = "";
    state.items = [];
    addItemRow();
    syncItemsCounter();
  }

  function addItemRow(prefill = {}) {
    const fragment = templates.itemRow.content.cloneNode(true);
    const article = fragment.querySelector(".item-row");
    const itemSelect = fragment.querySelector('[data-field="id_item"]');
    const qtyInput = fragment.querySelector('[data-field="quantidade"]');
    const statusSelect = fragment.querySelector('[data-field="status_item"]');
    const obsInput = fragment.querySelector('[data-field="observacao"]');

    itemSelect.innerHTML = "";
    itemSelect.add(new Option("Selecione...", ""));
    state.itens.forEach((item) => {
      const label = item.label || item.nome_item || `Item ${item.id_item}`;
      itemSelect.add(new Option(label, String(item.id_item)));
    });

    const statusItems = buildOptionsFromList(state.lists?.status_item, [CONFIG.defaultStatusItem, "Pendente", "Separado", "Entregue"]);
    statusSelect.innerHTML = "";
    statusItems.forEach(({ value, label }) => statusSelect.add(new Option(label, value)));
    statusSelect.value = prefill.status_item || CONFIG.defaultStatusItem;

    itemSelect.value = prefill.id_item || "";
    qtyInput.value = prefill.quantidade || 1;
    obsInput.value = prefill.observacao || "";

    refs.itemsList.appendChild(fragment);
    setEmptyStateVisibility();
    syncItemsCounter();
    persistDraft();
    renderPayloadPreview();
  }

  function handleItemClick(event) {
    const button = event.target.closest("[data-action='remove']");
    if (!button) return;
    const row = button.closest(".item-row");
    if (row) row.remove();

    if (!refs.itemsList.querySelector(".item-row")) {
      addItemRow();
    }

    setEmptyStateVisibility();
    syncItemsCounter();
    persistDraft();
    renderPayloadPreview();
  }

  function handleItemInput(event) {
    if (!event.target.closest(".item-row")) return;
    syncSummary();
    persistDraft();
    renderPayloadPreview();
  }

  function resetForm() {
    refs.pedidoForm.reset();
    refs.prioridade.value = CONFIG.defaultPriority;
    clearAndSeedItems();
    setStatus("Formulário limpo. Monte um novo pedido.");
    syncSummary();
    persistDraft(true);
    renderPayloadPreview();
  }

  function submitPedido() {
    const payload = buildPayload();
    const validation = validatePayload(payload);
    if (!validation.ok) {
      setStatus(validation.message, "error");
      return;
    }

    const endpoint = `${CONFIG.appScriptUrl}${CONFIG.apiPaths.createPedido}`;
    setStatus("Enviando pedido para o Google Sheets...", "loading");

    localStorage.setItem("almoxarifado:lastPayload", JSON.stringify(payload));

    fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: JSON.stringify(payload)
    })
      .then(() => {
        setStatus(
          "Pedido enviado para o Apps Script. Como a integração usa envio cross-origin simplificado, a confirmação visual vem do lado do navegador.",
          "success"
        );
      })
      .catch((err) => {
        console.error(err);
        setStatus("Falha ao enviar o pedido. Verifique a URL do Apps Script e as permissões de publicação.", "error");
      });
  }

  function buildPayload() {
    const itens = Array.from(refs.itemsList.querySelectorAll(".item-row")).map((row) => {
      const id_item = row.querySelector('[data-field="id_item"]').value;
      const quantidade = row.querySelector('[data-field="quantidade"]').value;
      const status_item = row.querySelector('[data-field="status_item"]').value;
      const observacao = row.querySelector('[data-field="observacao"]').value.trim();

      return {
        id_item,
        quantidade: Number(quantidade || 0),
        status_item,
        observacao,
      };
    }).filter((item) => item.id_item || item.quantidade || item.observacao);

    return {
      id_funcionario: refs.id_funcionario.value,
      data_pedido: refs.data_pedido.value || todayIso(),
      prioridade: refs.prioridade.value || CONFIG.defaultPriority,
      observacao: refs.observacao.value.trim(),
      status: CONFIG.defaultStatusPedido,
      itens,
    };
  }

  function validatePayload(payload) {
    if (!payload.id_funcionario) {
      return { ok: false, message: "Selecione um funcionário." };
    }
    if (!payload.data_pedido) {
      return { ok: false, message: "Informe a data do pedido." };
    }
    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      return { ok: false, message: "Adicione pelo menos um item." };
    }

    const invalidIndex = payload.itens.findIndex((item) => !item.id_item || !item.quantidade || item.quantidade <= 0);
    if (invalidIndex >= 0) {
      return { ok: false, message: `Corrija os dados do item ${invalidIndex + 1}.` };
    }

    return { ok: true };
  }

  function syncSummary() {
    const payload = buildPayload();
    const funcionario = state.funcionarios.find((f) => String(f.id_funcionario) === String(payload.id_funcionario));
    const totalQuantidade = payload.itens.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);

    refs.summaryItens.textContent = String(payload.itens.length);
    refs.summaryQuantidade.textContent = String(totalQuantidade);
    refs.summaryFuncionario.textContent = funcionario?.label || funcionario?.nome || "—";
    refs.summaryPrioridade.textContent = payload.prioridade || CONFIG.defaultPriority;
    refs.statItensSelecionados.textContent = String(payload.itens.length);

    renderPayloadPreview(payload);
  }

  function updateSummaryLabels() {
    refs.summaryFuncionario.textContent = "—";
    refs.summaryPrioridade.textContent = CONFIG.defaultPriority;
  }

  function renderPayloadPreview(payload = buildPayload()) {
    refs.payloadPreview.textContent = JSON.stringify(payload, null, 2);
  }

  function buildOptionsFromList(list, fallback = []) {
    const normalized = Array.isArray(list) && list.length ? list : fallback;
    return normalized
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .map((value) => ({ value, label: value }));
  }

  function setStatus(message, type = "info") {
    refs.statusBox.textContent = message;

    const palette = {
      info: "rgba(47, 129, 255, 0.08)",
      success: "rgba(29, 209, 161, 0.12)",
      error: "rgba(255, 107, 107, 0.12)",
      loading: "rgba(255, 209, 102, 0.12)",
    };

    refs.statusBox.style.background = palette[type] || palette.info;
    refs.statusBox.style.borderColor =
      type === "success" ? "rgba(29, 209, 161, 0.2)" :
      type === "error" ? "rgba(255, 107, 107, 0.22)" :
      type === "loading" ? "rgba(255, 209, 102, 0.22)" :
      "rgba(103, 166, 255, 0.18)";
  }

  function setEmptyStateVisibility() {
    const hasRows = Boolean(refs.itemsList.querySelector(".item-row"));
    refs.itemsEmpty.style.display = hasRows ? "none" : "block";
  }

  function syncItemsCounter() {
    refs.statItensSelecionados.textContent = String(refs.itemsList.querySelectorAll(".item-row").length);
  }

  function persistDraft(clear = false) {
    const key = "almoxarifado:draft";
    if (clear) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(buildPayload()));
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem("almoxarifado:draft");
      if (!saved) return;

      const draft = JSON.parse(saved);
      if (draft?.id_funcionario) refs.id_funcionario.value = String(draft.id_funcionario);
      if (draft?.data_pedido) refs.data_pedido.value = draft.data_pedido;
      if (draft?.prioridade) refs.prioridade.value = draft.prioridade;
      if (draft?.observacao) refs.observacao.value = draft.observacao;

      refs.itemsList.innerHTML = "";
      if (Array.isArray(draft.itens) && draft.itens.length) {
        draft.itens.forEach((item) => addItemRow(item));
      } else {
        addItemRow();
      }

      syncSummary();
      setStatus("Rascunho recuperado do navegador.", "success");
    } catch (err) {
      console.warn(err);
    }
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }
})();
