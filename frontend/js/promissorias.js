let promissorias = [];
let promissoriaEditandoId = null;

document.addEventListener('DOMContentLoaded', () => {
  carregarPromissorias();
});

// =============================
// CARREGAR PROMISSÓRIAS
// =============================
async function carregarPromissorias() {
  try {
    const { data, error } = await supabaseClient
      .from('promissorias_view')
      .select('*');

    if (error) throw error;

    promissorias = data || [];

    preencherFiltroVendedores();
    aplicarFiltros(); // já renderiza com filtros aplicados

  } catch (err) {
    console.error(err);
    alert('Erro ao carregar promissórias');
  }
}


// =============================
// ABRIR PARCELAS
// =============================
async function abrirParcelas(promissoriaId) {
  try {
    const { data, error } = await supabaseClient
      .from('parcelas')
      .select('*')
      .eq('promissoria_id', promissoriaId) // 👈 NOME CORRETO DA COLUNA
      .order('numero_parcela', { ascending: true });

    if (error) throw error;

    renderizarParcelas(data);

    document.getElementById("modalParcelas")
      .classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar parcelas");
  }
}


// =============================
// RENDERIZAR PARCELAS
// =============================
function renderizarParcelas(parcelas) {
    const container = document.getElementById("listaParcelas");
    const hoje = new Date();

    if (!parcelas || parcelas.length === 0) {
        container.innerHTML = `
            <p style="color:#6b7280; padding:10px 0;">
                Nenhuma parcela encontrada
            </p>
        `;
        return;
    }

    container.innerHTML = parcelas.map((p, index) => {

        const vencimento = new Date(p.data_vencimento);
        let diasAtraso = 0;
        let statusFinal = p.status;

        if (p.status !== "paga" && vencimento < hoje) {
            diasAtraso = Math.floor(
                (hoje - vencimento) / (1000 * 60 * 60 * 24)
            );
            statusFinal = "vencida";
        }

        return `
  <div class="parcela-item">
      <div class="parcela-info">
          <div class="parcela-numero">
              Parcela ${index + 1}/${parcelas.length}
          </div>
          <div class="parcela-data">
              Vencimento: ${formatarData(p.data_vencimento)}
          </div>
          ${diasAtraso > 0 
              ? `<div class="atraso">${diasAtraso} dias em atraso</div>`
              : ''}
      </div>

      <div>
          <div style="font-weight:600; margin-bottom:6px;">
              ${formatarMoeda(p.valor)}
          </div>

          <span class="parcela-status status-${statusFinal}">
              ${statusFinal.toUpperCase()}
          </span>

          ${
            statusFinal !== "paga"
              ? `<button class="btn-pagar-parcela" onclick="pagarParcela('${p.id}', '${p.promissoria_id}')">Pagar</button>`
              : ""
          }
      </div>
  </div>
`;
    }).join('');
}

function fecharModal() {
    document.getElementById("modalParcelas").classList.add("hidden");
}

// =============================
// FILTROS
// =============================
const filtroVendedor = document.getElementById("filtroVendedor");
const filtroStatus = document.getElementById("filtroStatus");
const busca = document.getElementById("busca");

function aplicarFiltros() {
  let resultado = promissorias;

  const vendedor = filtroVendedor?.value || "";
  const status = filtroStatus?.value || "";
  const termoBusca = busca?.value?.toLowerCase() || "";

  // Filtro vendedor
  if (vendedor !== "") {
    resultado = resultado.filter(p => p.vendedor === vendedor);
  }

  // Filtro status
  if (status !== "") {
    resultado = resultado.filter(p => p.status === status);
  }

  // Filtro busca
  if (termoBusca !== "") {
    resultado = resultado.filter(p =>
      p.cliente?.toLowerCase().includes(termoBusca) ||
      p.veiculo?.toLowerCase().includes(termoBusca)
    );
  }

  renderizarTabela(resultado);
}

// Eventos
filtroVendedor?.addEventListener("change", aplicarFiltros);
filtroStatus?.addEventListener("change", aplicarFiltros);
busca?.addEventListener("input", aplicarFiltros);

// =============================
// PREENCHER SELECT VENDEDORES
// =============================
function preencherFiltroVendedores() {
  if (!filtroVendedor) return;

  const vendedoresUnicos = [
    ...new Set(
      promissorias
        .map(p => p.vendedor)
        .filter(v => v) // remove null/undefined
    )
  ];

  filtroVendedor.innerHTML =
    '<option value="">Todos os vendedores</option>';

  vendedoresUnicos.forEach(vendedor => {
    const option = document.createElement("option");
    option.value = vendedor;
    option.textContent = vendedor;
    filtroVendedor.appendChild(option);
  });
}

// =============================
// RENDERIZAR TABELA
// =============================
function renderizarTabela(dados = promissorias) {
    const tbody = document.getElementById('tableBody');
    
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma promissória encontrada</td></tr>';
        return;
    }
  
    tbody.innerHTML = dados.map(p => {
        const valorAberto = p.valor_em_aberto;
        const statusClass = `status-${p.status}`;
        const statusText = {
            'pendente': 'Pendente',
            'vencida': 'Vencida',
            'paga': 'Paga'
        }[p.status] || p.status;
        
        return `
            <tr>
                <td>
                    <span class="cliente-link" onclick="abrirParcelas('${p.id}')">
                        ${p.cliente || '-'}
                    </span>
                </td>
                <td>${p.veiculo || '-'}</td>
                <td>${formatarMoeda(p.valor_total || 0)}</td>
                <td>${formatarMoeda(valorAberto)}</td>
                <td>${formatarData(p.data_vencimento)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="acoes">
  <button class="btn-edit" onclick="editarPromissoria('${p.id}')">Editar</button>
  <button class="btn-pay" onclick="abrirParcelas('${p.id}')">Pagar</button>
  <button class="btn-danger" onclick="excluirPromissoria('${p.id}')">Excluir</button>
</td>
            </tr>
        `;
    }).join('');
}
// =============================
// UTILITÁRIOS
// =============================
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor) || 0);
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

// =============================
// ATUALIZAR PARCELA
// =============================
async function atualizarParcela(id, novoValor) {
    await supabaseClient
      .from('parcelas')
      .update({ valor: parseFloat(novoValor) })
      .eq('id', id);
}

function editarPromissoria(id) {
    const promissoria = promissorias.find(p => p.id === id);
    if (!promissoria) return;

    promissoriaEditandoId = id;

    // salva id que está sendo editado
    promissoriaEditandoId = id;

    // preenche campos corretos
    document.getElementById('editCliente').value = promissoria.cliente || '';
    document.getElementById('editVeiculo').value = promissoria.veiculo || '';
    document.getElementById('editValor').value = promissoria.valor_total || 0;
    document.getElementById('vendedor').value = promissoria.vendedor || '';
    document.getElementById('valorPago').value = promissoria.valor_pago || 0;
    document.getElementById('observacoes').value = promissoria.observacoes || '';

    // abre modal correto
    document.getElementById('modalEditar').classList.remove('hidden');
}

function fecharEditar() {
  document.getElementById("modalEditar").classList.add("hidden");
}

// =============================
// EXCLUIR PROMISSÓRIA
// =============================
async function excluirPromissoria(id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  const { error } = await supabaseClient
    .from('promissorias')
    .delete()
    .eq('id', id);

  if (error) {
    alert("Erro ao excluir");
    return;
  }

  carregarPromissorias();
}

function pagarPromissoria(id) {
  alert("Pagamento da promissória: " + id);
}


// =============================
// SALVAR EDIÇÃO / CRIAÇÃO
// =============================
async function salvarEdicao() {

  const cliente = document.getElementById("editCliente").value.trim();
  const veiculo = document.getElementById("editVeiculo").value.trim();
  const valorTotal = parseFloat(document.getElementById("editValor").value);
  const vendedor = document.getElementById("vendedor").value.trim();
  const observacoes = document.getElementById("observacoes").value.trim();
  const dataVencimento = document.getElementById("editDataVencimento").value;
  const qtdParcelas = parseInt(document.getElementById("editQtdParcelas").value);

  if (!cliente || !valorTotal || !dataVencimento || !qtdParcelas) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  try {

    if (promissoriaEditandoId) {

      // 🔵 EDITAR
      const { error } = await supabaseClient
        .from("promissorias")
        .update({
          cliente,
          veiculo,
          valor_total: valorTotal,
          vendedor,
          observacoes,
          data_vencimento: dataVencimento
        })
        .eq("id", promissoriaEditandoId);

      if (error) throw error;

      alert("Promissória atualizada com sucesso!");

    } else {

      // 🟢 CRIAR PROMISSÓRIA
      const { data: novaPromissoria, error } = await supabaseClient
        .from("promissorias")
        .insert([{
          cliente,
          veiculo,
          valor_total: valorTotal,
          vendedor,
          observacoes,
          data_vencimento: dataVencimento
        }])
        .select()
        .single();

      if (error) throw error;

      // 🔥 GERAR PARCELAS
      const parcelas = gerarParcelas(
        novaPromissoria.id,
        valorTotal,
        qtdParcelas,
        dataVencimento
      );

      const { error: erroParcelas } = await supabaseClient
        .from("parcelas")
        .insert(parcelas);

      if (erroParcelas) throw erroParcelas;

      alert("Promissória criada com parcelas!");
    }

    document.getElementById("modalEditar").classList.add("hidden");
    promissoriaEditandoId = null;

    await carregarPromissorias();

  } catch (err) {
    console.error("Erro real:", err);
    alert("Erro ao salvar promissória");
  }
}
function abrirModalNova() {
  promissoriaEditandoId = null;

  document.getElementById('editCliente').value = '';
  document.getElementById('editVeiculo').value = '';
  document.getElementById('editValor').value = '';
  document.getElementById('vendedor').value = '';
  document.getElementById('valorPago').value = '';
  document.getElementById('observacoes').value = '';

  document.querySelector('#modalEditar h3').textContent = 'Nova Promissória';

  document.getElementById('modalEditar').classList.remove('hidden');
}


// =============================
// GERAR PARCELAS
// =============================
function gerarParcelas(promissoriaId, valorTotal, qtdParcelas, primeiraData) {

  const valorBase = Math.floor((valorTotal / qtdParcelas) * 100) / 100;
  const parcelas = [];
  let soma = 0;

  for (let i = 1; i <= qtdParcelas; i++) {

    let valorParcela = valorBase;

    // Última parcela recebe o ajuste para não dar diferença de centavos
    if (i === qtdParcelas) {
      valorParcela = Number((valorTotal - soma).toFixed(2));
    }

    soma += valorParcela;

    const data = new Date(primeiraData);
    data.setMonth(data.getMonth() + (i - 1));

    parcelas.push({
      promissoria_id: promissoriaId, // 🔥 SEM ACENTO
      numero_parcela: i,
      valor: valorParcela,
      data_vencimento: data.toISOString().split('T')[0],
      status: 'pendente'
    });
  }

  return parcelas;
}

let parcelaSelecionadaId = null;

function abrirPagamentoParcela(id, valor) {
  parcelaSelecionadaId = id;

  document.getElementById("valorPagamentoParcela").value = valor;
  document.getElementById("modalPagamentoParcela").classList.remove("hidden");
}

function fecharPagamentoParcela() {
  parcelaSelecionadaId = null;
  document.getElementById("modalPagamentoParcela").classList.add("hidden");
}

async function confirmarPagamentoParcela() {

  const valor = parseFloat(
    document.getElementById("valorPagamentoParcela").value
  );

  if (!valor || valor <= 0) {
    alert("Informe um valor válido.");
    return;
  }

  try {

    const { error } = await supabaseClient
      .from("parcelas")
      .update({
        valor: valor,
        status: "paga"
      })
      .eq("id", parcelaSelecionadaId);

    if (error) throw error;

    alert("Parcela paga com sucesso!");

    fecharPagamentoParcela();

    // recarrega parcelas
    const promissoriaId = promissorias.find(p => p.id === promissoriaEditandoId)?.id;
    await abrirParcelas(promissoriaId);

  } catch (err) {
    console.error(err);
    alert("Erro ao pagar parcela");
  }
}

async function pagarParcela(parcelaId, promissoriaId) {

  if (!parcelaId || !promissoriaId) {
    alert("ID inválido");
    console.log("Recebido:", parcelaId, promissoriaId);
    return;
  }

  try {

    // 1️⃣ Atualiza parcela
    const { error: erroParcela } = await supabaseClient
      .from('parcelas')
      .update({ status: 'paga' })
      .eq('id', parcelaId);

    if (erroParcela) throw erroParcela;

    // 2️⃣ Busca todas parcelas da promissória
    const { data: parcelas, error: erroBusca } = await supabaseClient
      .from('parcelas')
      .select('*')
      .eq('promissoria_id', promissoriaId);

    if (erroBusca) throw erroBusca;

    // 3️⃣ Soma valores pagos
    const totalPago = parcelas
      .filter(p => p.status === 'paga')
      .reduce((acc, p) => acc + Number(p.valor), 0);

    // 4️⃣ Busca valor total da promissória
    const { data: promissoria, error: erroPromissoria } = await supabaseClient
      .from('promissorias')
      .select('valor_total')
      .eq('id', promissoriaId)
      .single();

    if (erroPromissoria) throw erroPromissoria;

    const novoStatus =
      totalPago >= promissoria.valor_total ? 'paga' : 'pendente';

    // 5️⃣ Atualiza promissória
    const { error: erroUpdate } = await supabaseClient
  .from('promissorias')
  .update({
    valor_pago: totalPago
  })
  .eq('id', promissoriaId);

    if (erroUpdate) throw erroUpdate;

    alert("Parcela paga com sucesso!");

    await carregarPromissorias();
    await abrirParcelas(promissoriaId);

  } catch (err) {
    console.error("Erro ao pagar parcela:", err);
    alert("Erro ao processar pagamento");
  }
}

ocument.addEventListener("DOMContentLoaded", () => {
  carregarResumoPagamentos();
});

async function carregarResumoPagamentos() {

  const { data, error } = await supabaseClient
    .from("pagamentos")
    .select("*");

  if (error) {
    console.error("Erro ao carregar pagamentos:", error);
    return;
  }

  let totalEmDia = 0;
  let totalAtrasado = 0;

  data.forEach(pagamento => {

    if (pagamento.tipo === "em_dia") {
      totalEmDia += Number(pagamento.valor);
    }

    if (pagamento.tipo === "atrasado") {
      totalAtrasado += Number(pagamento.valor);
    }

  });

  document.getElementById("pagamentosEmDia").textContent =
    formatarMoeda(totalEmDia);

  document.getElementById("pagamentosAtrasados").textContent =
    formatarMoeda(totalAtrasado);
}


// utilitário moeda
function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor) || 0);
}