// =============================
// CLIENTES.JS
// =============================

let todosClientes = [];

const CORES = ['av-blue', 'av-purple', 'av-teal', 'av-coral'];
const CORES_CSS = {
  'av-blue':   { bg: '#eff6ff', color: '#1e40af' },
  'av-purple': { bg: '#f5f3ff', color: '#6d28d9' },
  'av-teal':   { bg: '#f0fdf4', color: '#065f46' },
  'av-coral':  { bg: '#fff7ed', color: '#9a3412' },
};

document.addEventListener('DOMContentLoaded', () => {
  carregarClientes();
});

// =============================
// CARREGAR DADOS
// =============================
async function carregarClientes() {
  try {
    const { data: promissorias, error: erroProm } = await supabaseClient
      .from('promissorias_view')
      .select('*');
    if (erroProm) throw erroProm;

    const { data: parcelas, error: erroParcelas } = await supabaseClient
      .from('parcelas')
      .select('*');
    if (erroParcelas) throw erroParcelas;

    todosClientes = agruparPorCliente(promissorias || [], parcelas || []);
    preencherFiltroVendedores();
    atualizarStats();
    aplicarFiltrosClientes();

  } catch (err) {
    console.error(err);
    document.getElementById('listaClientes').innerHTML =
      '<p style="color:#6b7280;padding:1rem;">Erro ao carregar clientes.</p>';
  }
}

// =============================
// AGRUPAR PROMISSÓRIAS POR CLIENTE
// =============================
function agruparPorCliente(promissorias, parcelas) {
  const mapa = {};

  promissorias.forEach(p => {
    const nome = p.cliente || 'Sem nome';
    if (!mapa[nome]) {
      mapa[nome] = {
        nome,
        vendedor: p.vendedor || '',
        promissorias: [],
        cor: CORES[Object.keys(mapa).length % CORES.length],
      };
    }
    mapa[nome].promissorias.push(p);
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  Object.values(mapa).forEach(cliente => {
    let totalAberto = 0;
    let totalParcelas = 0;
    let parcelasPagas = 0;
    let parcelasVencidas = 0;
    let parcelasAVencer = 0;
    let ultimoPagamento = null;
    let veiculos = new Set();

    cliente.promissorias.forEach(prom => {
      totalAberto += Number(prom.valor_em_aberto || 0);
      if (prom.veiculo) veiculos.add(prom.veiculo);

      const parcelasDoCliente = parcelas.filter(p => p.promissoria_id === prom.id);
      parcelasDoCliente.forEach(parc => {
        if (parc.numero_parcela === 0) return; // ignora alienação nas contagens
        totalParcelas++;
        if (parc.status === 'paga') {
          parcelasPagas++;
          const dt = new Date(parc.data_vencimento + 'T00:00:00');
          if (!ultimoPagamento || dt > ultimoPagamento) ultimoPagamento = dt;
        } else {
          const venc = new Date(parc.data_vencimento + 'T00:00:00');
          if (venc < hoje) parcelasVencidas++;
          else parcelasAVencer++;
        }
      });
    });

    cliente.totalAberto = totalAberto;
    cliente.totalParcelas = totalParcelas;
    cliente.parcelasPagas = parcelasPagas;
    cliente.parcelasVencidas = parcelasVencidas;
    cliente.parcelasAVencer = parcelasAVencer;
    cliente.ultimoPagamento = ultimoPagamento;
    cliente.veiculos = [...veiculos];

    // Risco
    if (parcelasVencidas >= 3) cliente.risco = 'inadimplente';
    else if (parcelasVencidas >= 1) cliente.risco = 'atencao';
    else cliente.risco = 'emdia';
  });

  return Object.values(mapa);
}

// =============================
// STATS
// =============================
function atualizarStats() {
  const total = todosClientes.length;
  const inadimplentes = todosClientes.filter(c => c.risco === 'inadimplente').length;
  const atencao = todosClientes.filter(c => c.risco === 'atencao').length;
  const totalAberto = todosClientes.reduce((acc, c) => acc + c.totalAberto, 0);

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statInadimplentes').textContent = inadimplentes;
  document.getElementById('statAtencao').textContent = atencao;
  document.getElementById('statAberto').textContent = formatarMoeda(totalAberto);
}

// =============================
// FILTROS
// =============================
function preencherFiltroVendedores() {
  const sel = document.getElementById('filtroVendedorCliente');
  const vendedores = [...new Set(todosClientes.map(c => c.vendedor).filter(v => v))];
  vendedores.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

function aplicarFiltrosClientes() {
  const busca = document.getElementById('buscaCliente').value.toLowerCase();
  const status = document.getElementById('filtroStatusCliente').value;
  const vendedor = document.getElementById('filtroVendedorCliente').value;
  const ordem = document.getElementById('filtroOrdem').value;

  let resultado = todosClientes.filter(c => {
    const matchBusca = !busca ||
      c.nome.toLowerCase().includes(busca) ||
      c.veiculos.some(v => v.toLowerCase().includes(busca));
    const matchStatus = !status || c.risco === status;
    const matchVendedor = !vendedor || c.vendedor === vendedor;
    return matchBusca && matchStatus && matchVendedor;
  });

  // Ordenação
  if (ordem === 'divida') resultado.sort((a, b) => b.totalAberto - a.totalAberto);
  else if (ordem === 'vencidas') resultado.sort((a, b) => b.parcelasVencidas - a.parcelasVencidas);
  else resultado.sort((a, b) => a.nome.localeCompare(b.nome));

  document.getElementById('labelContagem').textContent =
    `${resultado.length} cliente${resultado.length !== 1 ? 's' : ''} encontrado${resultado.length !== 1 ? 's' : ''}`;

  renderizarClientes(resultado);
}

// =============================
// RENDERIZAR LISTA
// =============================
function renderizarClientes(clientes) {
  const container = document.getElementById('listaClientes');

  if (!clientes.length) {
    container.innerHTML = '<p style="color:#6b7280;padding:1rem;">Nenhum cliente encontrado.</p>';
    return;
  }

  container.innerHTML = clientes.map(c => {
    const iniciais = c.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
    const cor = CORES_CSS[c.cor] || CORES_CSS['av-blue'];
    const progPct = c.totalParcelas > 0 ? Math.round((c.parcelasPagas / c.totalParcelas) * 100) : 0;
    const corBarra = c.risco === 'inadimplente' ? '#dc2626' : c.risco === 'atencao' ? '#d97706' : '#16a34a';
    const dotCor = c.risco === 'inadimplente' ? 'risk-red' : c.risco === 'atencao' ? 'risk-yellow' : 'risk-green';
    const veiculo = c.veiculos.length ? c.veiculos.join(', ') : '';
    const qtdProm = c.promissorias.length;
    const ultPag = c.ultimoPagamento ? `Último pag: ${formatarData(c.ultimoPagamento.toISOString().split('T')[0])}` : 'Sem pagamentos';

    const badges = [];
    if (c.parcelasVencidas > 0) badges.push(`<span class="badge badge-red">${c.parcelasVencidas} vencida${c.parcelasVencidas > 1 ? 's' : ''}</span>`);
    if (c.parcelasAVencer > 0) badges.push(`<span class="badge badge-blue">${c.parcelasAVencer} a vencer</span>`);
    if (c.parcelasVencidas === 0 && c.parcelasAVencer === 0) badges.push(`<span class="badge badge-green">Em dia</span>`);

    return `
      <div class="cliente-card" onclick="abrirModalCliente('${encodeURIComponent(c.nome)}')">
        <div class="card-top">
          <div class="avatar" style="background:${cor.bg};color:${cor.color}">
            ${iniciais}
            <span class="risk-dot ${dotCor}"></span>
          </div>
          <div class="cliente-info">
            <div class="cliente-nome">${c.nome}</div>
            <div class="cliente-sub">
              ${qtdProm} promissória${qtdProm > 1 ? 's' : ''}
              ${c.vendedor ? `<span class="dot-sep"></span> ${c.vendedor}` : ''}
              ${veiculo ? `<span class="dot-sep"></span> ${veiculo}` : ''}
            </div>
          </div>
          <div class="cliente-direita">
            <div class="cliente-valor">${formatarMoeda(c.totalAberto)}</div>
            <div class="badges">${badges.join('')}</div>
          </div>
          <svg class="chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="card-bottom">
          <div class="progress-wrap">
            <div class="progress-info">
              <span>Progresso — ${c.parcelasPagas} de ${c.totalParcelas} parcelas</span>
              <span>${progPct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${progPct}%;background:${corBarra}"></div>
            </div>
          </div>
          <div class="last-pay">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${ultPag}
          </div>
        </div>
      </div>`;
  }).join('');
}

// =============================
// MODAL CLIENTE
// =============================
function abrirModalCliente(nomeEncoded) {
  const nome = decodeURIComponent(nomeEncoded);
  const cliente = todosClientes.find(c => c.nome === nome);
  if (!cliente) return;

  document.getElementById('modalClienteNome').textContent = nome;
  document.getElementById('modalClienteSub').textContent =
    `${cliente.promissorias.length} promissória${cliente.promissorias.length > 1 ? 's' : ''} · ${formatarMoeda(cliente.totalAberto)} em aberto`;

  const body = document.getElementById('modalClienteBody');

  if (!cliente.promissorias.length) {
    body.innerHTML = '<div class="empty-modal">Nenhuma promissória encontrada.</div>';
  } else {
    body.innerHTML = cliente.promissorias.map(p => {
      const statusBadge = p.status === 'paga'
        ? '<span class="badge badge-green">Paga</span>'
        : '<span class="badge badge-blue">Em aberto</span>';

      return `
        <div class="prom-card">
          <div class="prom-card-header">
            <span class="prom-veiculo">${p.veiculo || 'Sem veículo'}</span>
            ${statusBadge}
          </div>
          <div class="prom-info">
            <span>Total: ${formatarMoeda(p.valor_total || 0)}</span>
            <span>Em aberto: ${formatarMoeda(p.valor_em_aberto || 0)}</span>
            <span>Vendedor: ${p.vendedor || '—'}</span>
          </div>
          ${p.observacoes ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">Obs: ${p.observacoes}</div>` : ''}
          <button class="btn-ver-parcelas" onclick="window.location.href='promissorias.html'">
            Ver parcelas
          </button>
        </div>`;
    }).join('');
  }

  document.getElementById('modalCliente').classList.remove('hidden');
}

function fecharModalCliente() {
  document.getElementById('modalCliente').classList.add('hidden');
}

// =============================
// UTILITÁRIOS
// =============================
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

function formatarData(data) {
  if (!data) return '—';
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}