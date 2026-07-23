(() => {
  const CONFIG = window.ALMOXARIFADO_CONFIG || {};
  const STORAGE_KEYS = {
    result: "almoxarifado:result",
  };

  const refs = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    captureRefs();
    const result = readResultPayload();
    const mode = getMode(result);
    document.body.classList.toggle("mode-error", mode === "error");
    document.title = mode === "error" ? "Erro na requisição" : "Requisição enviada com sucesso";

    renderResult(mode, result);
    autoDownload(mode, result);

    refs.primaryAction?.addEventListener("click", () => handlePrimaryAction(mode, result));
  }

  function captureRefs() {
    refs.resultEyebrow = document.getElementById("resultEyebrow");
    refs.resultTitle = document.getElementById("resultTitle");
    refs.resultMessage = document.getElementById("resultMessage");
    refs.resultBanner = document.getElementById("resultBanner");
    refs.resultSummary = document.getElementById("resultSummary");
    refs.primaryAction = document.getElementById("primaryAction");
    refs.resultFootnote = document.getElementById("resultFootnote");
  }

  function getMode(result) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = String(params.get("mode") || "").trim().toLowerCase();
    if (fromUrl === "error" || fromUrl === "success") return fromUrl;
    if (result?.mode === "error" || result?.mode === "success") return result.mode;
    return "success";
  }

  function readResultPayload() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.result);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Não foi possível ler o resultado salvo:", error);
      return null;
    }
  }

  function saveResultPayload(payload) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.result, JSON.stringify(payload));
    } catch (error) {
      console.warn("Não foi possível atualizar o resultado salvo:", error);
    }
  }

  function normalizeWhatsAppNumber(value) {
    const digits = String(value || "").replace(/\D+/g, "");
    return digits.length === 11 ? digits : "";
  }

  function renderResult(mode, result) {
    const isError = mode === "error";
    const summary = result?.summary || {};
    const title = isError ? "Ocorreu um erro" : "Enviado com sucesso";
    const message = isError
      ? "A requisição não foi concluída. O arquivo de diagnóstico foi baixado automaticamente para facilitar o suporte."
      : "A requisição foi registrada com sucesso. O arquivo de confirmação será baixado automaticamente.";

    if (refs.resultEyebrow) {
      refs.resultEyebrow.textContent = isError ? "Erro no envio" : "Sucesso";
    }
    if (refs.resultTitle) {
      refs.resultTitle.textContent = title;
    }
    if (refs.resultMessage) {
      refs.resultMessage.textContent = message;
    }
    if (refs.primaryAction) {
      refs.primaryAction.textContent = isError ? "Enviar Erro ao Suporte" : "Enviar Requisição";
    }
    if (refs.resultFootnote) {
      refs.resultFootnote.textContent = isError
        ? "Você pode voltar para a página anterior para ajustar os dados e tentar novamente."
        : "O botão envia uma cópia pelo WhatsApp quando houver número configurado; sem número, o navegador abre a opção de compartilhamento.";
    }

    renderSummary(summary, mode, result);
  }

  function renderSummary(summary, mode, result) {
    if (!refs.resultSummary) return;

    const totalItens = Number(summary.totalItens ?? 0) || 0;
    const totalQuantidade = Number(summary.totalQuantidade ?? 0) || 0;
    const base = summary.base || result?.currentShape?.baseName || "—";
    const funcionario = summary.funcionario || result?.currentShape?.technicianName || "—";
    const data = result?.generatedAt?.date || "—";
    const hora = result?.generatedAt?.time || "—";

    const rows = [
      ["Funcionário", funcionario],
      ["Base", base],
      ["Itens", String(totalItens)],
      ["Quantidade total", String(totalQuantidade)],
      ["Data", data],
      ["Hora", hora],
    ];

    if (mode === "error") {
      rows.unshift(["Mensagem", result?.errorMessage || "Erro não identificado"]);
    }

    refs.resultSummary.innerHTML = rows.map(([label, value]) => `
      <div class="result-item">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(String(value || "—"))}</dd>
      </div>
    `).join("");
  }

  function autoDownload(mode, result) {
    if (!result || result.autoDownloaded) return;
    const content = String(result.fileText || "").trim();
    if (!content) return;

    const filename = String(result.fileName || buildFallbackFileName(mode));
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    result.autoDownloaded = true;
    saveResultPayload(result);
  }

  function buildFallbackFileName(mode) {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const suffix = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    return mode === "error" ? `erro-pedido-${suffix}.txt` : `requisicao-estoque-${suffix}.txt`;
  }

  async function handlePrimaryAction(mode, result) {
    const text = String(result?.fileText || "").trim();
    if (!text) {
      setInlineMessage("Não há conteúdo disponível para enviar.", true);
      return;
    }

    if (mode === "error") {
      const supportNumber = normalizeWhatsAppNumber(CONFIG.supportWhatsAppNumber || "71981768164");
      if (supportNumber) {
        openWhatsApp(supportNumber, text);
        return;
      }

      await shareOrCopy(text, "Relatório de erro");
      return;
    }

    const successNumber = normalizeWhatsAppNumber(CONFIG.successWhatsAppNumber || "");
    if (successNumber) {
      openWhatsApp(successNumber, text);
      return;
    }

    await shareOrCopy(text, "Requisição de materiais");
  }

  function openWhatsApp(number, text) {
    const url = `https://wa.me/55${number}?text=${encodeURIComponent(text)}`;
    window.location.href = url;
  }

  async function shareOrCopy(text, title) {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        setInlineMessage("Compartilhamento aberto com sucesso.", false);
        return;
      }
    } catch (error) {
      console.warn("Falha no compartilhamento nativo:", error);
    }

    try {
      await navigator.clipboard.writeText(text);
      setInlineMessage("Texto copiado para a área de transferência.", false);
    } catch (error) {
      console.warn("Falha ao copiar texto:", error);
      setInlineMessage("Não foi possível compartilhar automaticamente.", true);
    }
  }

  function setInlineMessage(message, isError = false) {
    if (!refs.resultFootnote) return;
    refs.resultFootnote.textContent = message;
    refs.resultFootnote.style.color = isError ? "#ffb5b5" : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
