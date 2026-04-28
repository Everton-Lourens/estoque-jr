const MATERIALS = {
  'esticadores': { name: 'Esticadores', unit: 'Unidades' },
  'placas-jr': { name: 'Placas JR', unit: 'Unidades' },
  'drop-fibra': { name: 'Drop Fibra', unit: 'Metros' },
  'fixa-fio': { name: 'Fixa Fio', unit: 'Unidades' },
  'fita-crepe': { name: 'Fita Crepe', unit: 'Unidades' },
  'fita-isolante': { name: 'Fita Isolante', unit: 'Unidades' },
  'conectores-apc': { name: 'Conectores APC', unit: 'Unidades' },
  'abracadeira': { name: 'Abraçadeira', unit: 'Unidades' },
  'espiral': { name: 'Espiral', unit: 'Metros' },
  'bucha-parafuso': { name: 'Bucha & Parafuso', unit: 'Unidades' },
  'bucha-acabamento': { name: 'Bucha de Acabamento', unit: 'Unidades' },
  'etiqueta-lacre': { name: 'Etiqueta Lacre', unit: 'Unidades' }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateBR(date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date);
}

function formatTimeBR(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function buildMessage(body) {
  const now = new Date();
  const technicianName = escapeHtml(body.technicianName || '');
  const sector = escapeHtml(body.sector || '-');
  const observations = escapeHtml(body.observations || '-');

  const selectedMaterials = Array.isArray(body.selectedMaterials) ? body.selectedMaterials : [];
  const materialsText = selectedMaterials.length
    ? selectedMaterials.map((item) => {
        const material = MATERIALS[item.id] || { name: escapeHtml(item.id || 'Item'), unit: 'Unidades' };
        const quantity = Math.max(1, parseInt(item.quantity, 10) || 0);
        return `🔹 ${escapeHtml(material.name)}: ${quantity} ${material.unit}`;
      }).join('\n')
    : '🔹 Nenhum material selecionado';

  return [
    '<b>📛 Nova Solicitação de Materiais de Estoque 📛</b>',
    '',
    `<b>👷 Técnico:</b> ${technicianName}`,
    `<b>📅 Data da Solicitação:</b> ${formatDateBR(now)}`,
    `<b>⏰ Horário da Solicitação:</b> ${formatTimeBR(now)}`,
    `<b>📍 Setor / local:</b> ${sector}`,
    '',
    '<b>🧰 Suprimentos Solicitados:</b>',
    '--------------------------------',
    materialsText,
    '',
    `<b>📝 Observações:</b> ${observations}`
  ].join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Variáveis de ambiente do Telegram não configuradas.' });
  }

  const body = req.body || {};
  if (!String(body.technicianName || '').trim()) {
    return res.status(400).json({ error: 'Informe o nome do técnico.' });
  }

  if (!Array.isArray(body.selectedMaterials) || !body.selectedMaterials.length) {
    return res.status(400).json({ error: 'Selecione ao menos um material.' });
  }

  const message = buildMessage(body);

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  const telegramData = await telegramResponse.json();

  if (!telegramResponse.ok || !telegramData.ok) {
    return res.status(500).json({
      error: 'Falha ao enviar mensagem ao Telegram.',
      details: telegramData
    });
  }

  return res.status(200).json({ ok: true, result: telegramData.result });
}
