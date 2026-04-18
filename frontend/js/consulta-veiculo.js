// ============================================================
// CONSULTA VEICULAR – via Supabase Edge Function (sem CORS)
// ============================================================
const EDGE_FUNCTION_URL = 'https://ljhevlfzcaxyogpwajfp.supabase.co/functions/v1/consulta-veiculo';

// ============================================================
// ABRE MODAL DE CONSULTA
// ============================================================
async function consultarVeiculo(placa) {
  if (!placa || placa === '-') {
    alert('Placa não informada para este veículo.');
    return;
  }

  const modal = document.getElementById('modalConsulta');
  const corpo = document.getElementById('consultaCorpo');

  modal.classList.remove('hidden');
  corpo.innerHTML = `
    <div class="consulta-loading">
      <div class="spinner"></div>
      <p>Consultando placa <strong>${placa}</strong>...</p>
    </div>`;

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placa })
    });

    const dados = await res.json();
    if (dados.error) throw new Error(dados.error);

    renderConsulta(placa, dados.basica, dados.multas);

  } catch (err) {
    corpo.innerHTML = `
      <div class="consulta-erro">
        <p>❌ Erro ao consultar: ${err.message}</p>
      </div>`;
  }
}

// ============================================================
// RENDERIZA RESULTADO NO MODAL
// ============================================================
function renderConsulta(placa, basica, multas) {
  const corpo = document.getElementById('consultaCorpo');
  const d = basica?.dados?.informacoes_veiculo?.dados_veiculo || {};

  // --- situação do veículo ---
  const situacaoOk = basica?.status === 'ok';

  // --- multas ---
  const infracoes = multas?.dados?.registro_debitos_por_infracoes_renainf
    ?.infracoes_renainf?.infracoes || [];
  const temMultas = infracoes.length > 0;

  // --- monta pendências ---
  const pendencias = [];
  if (temMultas) pendencias.push(`🔴 ${infracoes.length} multa(s) pendente(s) no RENAINF`);

  const temPendencia = pendencias.length > 0;

  // --- HTML do modal ---
  corpo.innerHTML = `
    <div class="consulta-resultado">

      <div class="consulta-secao">
        <h4>🚗 Dados do Veículo</h4>
        <div class="consulta-grid">
          ${item('Placa', placa)}
          ${item('Marca/Modelo', d.marca ? `${d.marca} / ${d.modelo}` : '-')}
          ${item('Ano', d.ano_fabricacao ? `${d.ano_fabricacao}/${d.ano_modelo}` : '-')}
          ${item('Cor', d.cor || '-')}
          ${item('Combustível', d.combustivel || '-')}
          ${item('Município', d.municipio ? `${d.municipio}/${d.uf_municipio}` : '-')}
        </div>
      </div>

      <div class="consulta-secao">
        <h4>📋 Situação</h4>
        <div class="consulta-status-lista">
          ${badge(situacaoOk, 'Consulta na base DETRAN')}
          ${badge(!temMultas, `Multas RENAINF`, temMultas ? `${infracoes.length} encontrada(s)` : 'Nenhuma')}
        </div>
      </div>

      ${temMultas ? `
      <div class="consulta-secao">
        <h4>🔴 Multas encontradas</h4>
        ${infracoes.map(inf => `
          <div class="multa-item">
            <p><strong>${inf.dados_infracao?.infracao || '-'}</strong></p>
            <p>Auto: ${inf.dados_infracao?.numero_auto_infracao || '-'} &nbsp;|&nbsp; Valor: R$ ${inf.dados_infracao?.valor_aplicado || '-'}</p>
            <p>Órgão: ${inf.dados_infracao?.orgao_autuador || '-'}</p>
            <p>Data: ${inf.eventos?.data_hora_infracao || '-'}</p>
          </div>`).join('')}
      </div>` : ''}

      ${temPendencia ? `
      <div class="consulta-alerta">
        ⚠️ Este veículo possui pendências. Considere marcar como <strong>Pendente</strong>.
        <button class="btn-marcar-pendente" onclick="marcarPendente('${placa}')">
          Marcar como Pendente
        </button>
      </div>` : `
      <div class="consulta-ok">
        ✅ Nenhuma pendência encontrada nesta consulta.
      </div>`}
    </div>`;
}

function item(label, valor) {
  return `<div class="consulta-item"><span class="ci-label">${label}</span><span class="ci-valor">${valor}</span></div>`;
}

function badge(ok, label, detalhe = '') {
  const icone = ok ? '✅' : '🔴';
  const extra = detalhe ? ` <small>(${detalhe})</small>` : '';
  return `<div class="status-linha">${icone} ${label}${extra}</div>`;
}

// ============================================================
// MARCAR COMO PENDENTE (atualiza no Supabase pela placa)
// ============================================================
async function marcarPendente(placa) {
  const p = promissorias.find(p => p.veiculo === placa);
  if (!p) { alert('Promissória não encontrada para esta placa.'); return; }

  const { error } = await supabaseClient
    .from('promissorias')
    .update({ pendencia_documental: true })
    .eq('id', p.id);

  if (error) { alert('Erro ao marcar pendência.'); return; }

  alert('Marcado como Pendente com sucesso!');
  fecharConsulta();
  await carregarPromissorias();
}

// ============================================================
// FECHAR MODAL
// ============================================================
function fecharConsulta() {
  document.getElementById('modalConsulta').classList.add('hidden');
}