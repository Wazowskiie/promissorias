// Estado da aplicação
let promissorias = [];
let veiculos = new Set();
let promissoriaPagamentoId = null;

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  carregarPromissorias();
});

// Setup de Event Listeners
function setupEventListeners() {
  const searchCliente = document.getElementById('searchCliente');
  const filterStatus = document.getElementById('filterStatus');
  const filterVeiculo = document.getElementById('filterVeiculo');
  const form = document.getElementById('promissoriaForm');

  if (searchCliente) {
    searchCliente.addEventListener('input', filtrarPromissorias);
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', filtrarPromissorias);
  }

  if (filterVeiculo) {
    filterVeiculo.addEventListener('change', filtrarPromissorias);
  }

  if (form) {
    form.addEventListener('submit', salvarPromissoria);
  }
}



// Atualizar select de veículos
function atualizarSelectVeiculos() {
    const select = document.getElementById('filterVeiculo');
    select.innerHTML = '<option value="">Todos os veículos</option>';
    
    Array.from(veiculos).sort().forEach(veiculo => {
        const option = document.createElement('option');
        option.value = veiculo;
        option.textContent = veiculo;
        select.appendChild(option);
    });
}

// Atualizar dashboard
function atualizarDashboard() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let total = promissorias.length;
    let pendentes = 0;
    let vencidas = 0;
    let pagas = 0;

    let valorEmAberto = 0;
    let recebidoMes = 0;

    let clientesComSaldo = new Set();

    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    promissorias.forEach(p => {
        // status agora vem do banco
        if (p.status === 'paga') {
            pagas++;

            if (p.data_pagamento) {
                const pagamento = new Date(p.data_pagamento);
                if (
                    pagamento.getMonth() === mesAtual &&
                    pagamento.getFullYear() === anoAtual
                ) {
                    recebidoMes += Number(p.valor_total);
                }
            }
        }

        if (p.status === 'vencida') vencidas++;
        if (p.status === 'pendente') pendentes++;

        // valor já vem pronto
        valorEmAberto += Number(p.valor_em_aberto);

        if (p.valor_em_aberto > 0) {
            clientesComSaldo.add(p.cliente);
        }
    });

    document.getElementById('total').textContent = total;
    document.getElementById('pendentes').textContent = pendentes;
    document.getElementById('vencidas').textContent = vencidas;
    document.getElementById('pagas').textContent = pagas;
    document.getElementById('valorAberto').textContent = formatarMoeda(valorEmAberto);

    document.getElementById('saldoTotal').textContent = formatarMoeda(valorEmAberto);
    document.getElementById('promissoriasAtivas').textContent = clientesComSaldo.size;
    document.getElementById('recebidoMes').textContent = formatarMoeda(recebidoMes);
    document.getElementById('emAtraso').textContent = vencidas;
}



// Modal
function openModal() {
    document.getElementById('modal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Nova Promissória';
    document.getElementById('promissoriaForm').reset();
    document.getElementById('promissoriaId').value = '';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Editar promissória
function editarPromissoria(id) {
    const promissoria = promissorias.find(p => p.id === id);
    if (!promissoria) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Promissória';
    document.getElementById('promissoriaId').value = id;
    document.getElementById('cliente').value = promissoria.cliente || '';
    document.getElementById('veiculo').value = promissoria.veiculo || '';
    document.getElementById('valorTotal').value = promissoria.valor_total || 0;
    document.getElementById('valorPago').value = promissoria.valor_pago || 0;
    document.getElementById('dataVencimento').value = promissoria.data_vencimento || ''
    document.getElementById('observacoes').value = promissoria.observacoes || '';
    
    document.getElementById('modal').style.display = 'block';
}

// Registrar pagamento
function pagarPromissoria(id) {
    const p = promissorias.find(p => p.id === id);
    if (!p) return;

    promissoriaPagamentoId = id;

    const valorAberto = (p.valor_total || 0) - (p.valor_pago || 0);

    document.getElementById('pgCliente').textContent = p.cliente;
    document.getElementById('pgValorAberto').textContent = formatarMoeda(valorAberto);
    document.getElementById('pgValorPago').value = '';

    document.getElementById('pagamentoModal').style.display = 'block';
}



// Exportar CSV
function exportarCSV() {
    if (promissorias.length === 0) {
        alert('Não há promissórias para exportar.');
        return;
    }
    
    const headers = ['Cliente', 'Veículo', 'Valor Total', 'Valor Pago', 'Valor em Aberto', 'Data Vencimento', 'Status', 'Observações', 'Criada em'];
    
    const rows = promissorias.map(p => {
        const valorAberto = p.valor_em_aberto;
        return [
            p.cliente || '',
            p.veiculo || '',
            p.valor_total || 0,
            p.valor_pago || 0,
            valorAberto,
            p.data_vencimento || '',
            p.status || '',
            (p.observacoes || '').replace(/"/g, '""'),
            p.criada_em || ''
        ];
    });
    
    let csv = headers.join(',') + '\n';
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `promissorias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Modal Interações
function openInteracoesModal() {
    document.getElementById('interacoesModal').style.display = 'block';
    carregarInteracoes();
}

function closeInteracoesModal() {
    document.getElementById('interacoesModal').style.display = 'none';
}

async function carregarInteracoes() {
    // Simulação - você pode implementar uma tabela de interações no Supabase
    const interacoesList = document.getElementById('interacoesList');
    
    // Criar interações baseadas nas promissórias criadas/atualizadas
    const interacoes = promissorias.map(p => ({
        cliente: p.cliente,
        descricao: `Promissória ${p.status} - ${formatarMoeda(p.valor_total)}`,
        data: p.criada_em
    })).slice(0, 20);
    
    if (interacoes.length === 0) {
        interacoesList.innerHTML = '<p class="empty-state">Nenhuma interação registrada</p>';
        return;
    }
    
    interacoesList.innerHTML = interacoes.map(i => `
        <div class="interacao-item">
            <div class="interacao-header">
                <span class="interacao-cliente">${i.cliente}</span>
                <span class="interacao-data">${formatarDataHora(i.data)}</span>
            </div>
            <div class="interacao-descricao">${i.descricao}</div>
        </div>
    `).join('');
}

function fecharPagamentoModal() {
    document.getElementById('pagamentoModal').style.display = 'none';
}





// Utilidades
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarDataHora(data) {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR');
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    const interacoesModal = document.getElementById('interacoesModal');
    
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === interacoesModal) {
        closeInteracoesModal();
    }
}

function showSection(section) {
  const sections = [
    'dashboard',
    'promissorias',
    'pagamentos',
    'relatorios'
  ];

  sections.forEach(s => {
    const el = document.getElementById(`${s}-section`);
    if (el) el.style.display = 'none';
  });

  const active = document.getElementById(`${section}-section`);
  if (active) active.style.display = 'block';

  // botão ativo
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}


  