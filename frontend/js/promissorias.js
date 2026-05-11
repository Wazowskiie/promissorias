let promissorias = [];
let promissoriaEditandoId = null;

document.addEventListener('DOMContentLoaded', () => {
  carregarPromissorias();
  carregarResumoPagamentos();
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
    aplicarFiltros();

  } catch (err) {
    console.error(err);
    alert('Erro ao carregar promissórias');
  }
}

// =============================
// CALCULAR STATUS VISUAL
// Regras:
//   paga              → verde  "Paga"
//   pendencia_documental = true → amarelo "Pendente" (IPVA, multa, apreensão etc.)
//   data vencida + não paga → vermelho "Vencida"
//   data futura + não paga  → azul    "A vencer"
// =============================
function calcularStatusVisual(p) {
  if (p.status === 'paga') {
    return { classe: 'status-paga', texto: 'Paga' };
  }

  // Pendência documental (IPVA, licenciamento, multa, apreensão etc.)
  if (p.pendencia_documental) {
    return { classe: 'status-pendente', texto: 'Pendente' };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(p.data_vencimento + 'T00:00:00');
  venc.setHours(0, 0, 0, 0);

  if (venc < hoje) {
    return { classe: 'status-vencida', texto: 'Vencida' };
  }

  return { classe: 'status-avencer', texto: 'A vencer' };
}

// =============================
// ABRIR PARCELAS
// =============================
async function abrirParcelas(promissoriaId) {
  try {
    const { data, error } = await supabaseClient
      .from('parcelas')
      .select('*')
      .eq('promissoria_id', promissoriaId)
      .order('numero_parcela', { ascending: true });

    if (error) throw error;

    // Mostrar observações se existirem
    const prom = promissorias.find(p => p.id === promissoriaId);
    const obsEl = document.getElementById('modalParcelasObs');
    const tituloEl = document.getElementById('modalParcelasCliente');
    if (prom) {
      if (tituloEl) tituloEl.textContent = `Parcelas — ${prom.cliente || 'Cliente'}`;
      if (obsEl && prom.observacoes) {
        obsEl.textContent = `Obs: ${prom.observacoes}`;
        obsEl.style.display = 'block';
      } else if (obsEl) {
        obsEl.style.display = 'none';
      }
    }

    renderizarParcelas(data);
    document.getElementById("modalParcelas").classList.remove("hidden");

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
    container.innerHTML = `<p style="color:#6b7280; padding:10px 0;">Nenhuma parcela encontrada</p>`;
    return;
  }

  container.innerHTML = parcelas.map((p, index) => {
    const vencimento = new Date(p.data_vencimento + 'T00:00:00');
    let diasAtraso = 0;
    let statusFinal = p.status;

    if (p.status !== "paga" && vencimento < hoje) {
      diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
      statusFinal = "vencida";
    } else if (p.status !== "paga" && vencimento >= hoje) {
      statusFinal = "avencer";
    }

    return `
      <div class="parcela-item">
        <div class="parcela-info">
          <div class="parcela-numero">${p.numero_parcela === 0 ? 'Alienação/TCP' : `Parcela ${p.numero_parcela}/${parcelas.length - 1}`}</div>
          <div class="parcela-data">Vencimento: ${formatarData(p.data_vencimento)}</div>
          ${diasAtraso > 0 ? `<div class="atraso">${diasAtraso} dias em atraso</div>` : ''}
        </div>
        <div>
          <div style="font-weight:600; margin-bottom:6px;">${formatarMoeda(p.valor)}</div>
          <span class="parcela-status status-${statusFinal}">${
            statusFinal === 'avencer' ? 'A VENCER' :
            statusFinal === 'vencida' ? 'VENCIDA' :
            statusFinal === 'paga' ? 'PAGA' : 'PENDENTE'
          }</span>
          ${statusFinal !== "paga"
            ? `<button class="btn-pagar-parcela" onclick="pagarParcela('${p.id}', '${p.promissoria_id}')">Pagar</button>`
            : ""}
        </div>
      </div>`;
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
  const statusFiltro = filtroStatus?.value || "";
  const termoBusca = busca?.value?.toLowerCase() || "";

  if (vendedor !== "") {
    resultado = resultado.filter(p => p.vendedor === vendedor);
  }

  // Filtro de status usa o status visual, não o do banco
  if (statusFiltro !== "") {
    resultado = resultado.filter(p => {
      const { texto } = calcularStatusVisual(p);
      const map = { 'pendente': 'Pendente', 'vencida': 'Vencida', 'paga': 'Paga', 'avencer': 'A vencer' };
      return texto === map[statusFiltro];
    });
  }

  if (termoBusca !== "") {
    resultado = resultado.filter(p =>
      p.cliente?.toLowerCase().includes(termoBusca) ||
      p.veiculo?.toLowerCase().includes(termoBusca)
    );
  }

  renderizarTabela(resultado);
}

filtroVendedor?.addEventListener("change", aplicarFiltros);
filtroStatus?.addEventListener("change", aplicarFiltros);
busca?.addEventListener("input", aplicarFiltros);

// =============================
// PREENCHER SELECT VENDEDORES
// =============================
function preencherFiltroVendedores() {
  if (!filtroVendedor) return;

  const vendedoresUnicos = [
    ...new Set(promissorias.map(p => p.vendedor).filter(v => v))
  ];

  filtroVendedor.innerHTML = '<option value="">Todos os vendedores</option>';

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
    const { classe: statusClass, texto: statusText } = calcularStatusVisual(p);

    return `
      <tr>
        <td>
          <span class="cliente-link" onclick="abrirParcelas('${p.id}')">
            ${p.cliente || '-'}
          </span>
        </td>
        <td>${p.veiculo || '-'}</td>
        <td>${formatarMoeda(p.valor_total || 0)}</td>
        <td>${formatarMoeda(p.valor_em_aberto)}</td>
        <td>${formatarData(p.data_vencimento)}</td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td class="acoes">
          <button class="btn-edit" onclick="editarPromissoria('${p.id}')">Editar</button>
          <button class="btn-pay" onclick="abrirParcelas('${p.id}')">Pagar</button>
          <button class="btn-consultar" onclick="consultarVeiculo('${p.veiculo}')">Consultar</button>
          <button class="btn-danger" onclick="excluirPromissoria('${p.id}')">Excluir</button>
        </td>
      </tr>`;
  }).join('');
}

// =============================
// UTILITÁRIOS
// =============================
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

// =============================
// EDITAR PROMISSÓRIA
// =============================
function editarPromissoria(id) {
  const promissoria = promissorias.find(p => p.id === id);
  if (!promissoria) return;

  promissoriaEditandoId = id;

  document.getElementById('editCliente').value = promissoria.cliente || '';
  document.getElementById('editVeiculo').value = promissoria.veiculo || '';
  document.getElementById('editValor').value = promissoria.valor_total || 0;
  document.getElementById('vendedor').value = promissoria.vendedor || '';
  document.getElementById('valorPago').value = promissoria.valor_pago || 0;
  document.getElementById('observacoes').value = promissoria.observacoes || '';

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

  if (error) { alert("Erro ao excluir"); return; }

  carregarPromissorias();
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
      const { error } = await supabaseClient
        .from("promissorias")
        .update({ cliente, veiculo, valor_total: valorTotal, vendedor, observacoes, data_vencimento: dataVencimento })
        .eq("id", promissoriaEditandoId);

      if (error) throw error;
      alert("Promissória atualizada com sucesso!");

    } else {
      const { data: novaPromissoria, error } = await supabaseClient
        .from("promissorias")
        .insert([{ cliente, veiculo, valor_total: valorTotal, vendedor, observacoes, data_vencimento: dataVencimento }])
        .select()
        .single();

      if (error) throw error;

      const valorParcelaManual = parseFloat(document.getElementById("valorPago").value);
      const valorAlienacao = parseFloat(document.getElementById("valorAlienacao").value);
      const dataAlienacao = document.getElementById("editDataAlienacao").value;
      const dataPrimeiraParcela = document.getElementById("editPrimeiraParcela").value;
      const parcelas = gerarParcelas(
      novaPromissoria.id,
      valorTotal,
      qtdParcelas,
      dataPrimeiraParcela,
      (valorParcelaManual && valorParcelaManual > 0) ? valorParcelaManual : null,
      (valorAlienacao && valorAlienacao > 0) ? valorAlienacao : null,
      dataAlienacao
      );
      const { error: erroParcelas } = await supabaseClient.from("parcelas").insert(parcelas);
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
  document.getElementById('modalTitulo').textContent = 'Nova promissória';
  document.getElementById('modalEditar').classList.remove('hidden');
}

// =============================
// GERAR PARCELAS
// =============================
function gerarParcelas(promissoriaId, valorTotal, qtdParcelas, primeiraData, valorParcelaManual, valorAlienacao) {
  const valorBase = valorParcelaManual
    ? Number(valorParcelaManual)
    : Math.floor((valorTotal / qtdParcelas) * 100) / 100;

  const parcelas = [];
  let soma = 0;

  // Alienação/TCP como parcela 0
  const valorAli = valorAlienacao ? Number(valorAlienacao) : valorBase;
  parcelas.push({
    promissoria_id: promissoriaId,
    numero_parcela: 0,
    valor: valorAli,
    data_vencimento: primeiraData,
    status: 'pendente'
  });
  soma += valorAli;

  // Parcelas normais começam 1 mês depois
  for (let i = 1; i <= qtdParcelas; i++) {
    let valorParcela = valorBase;

    if (!valorParcelaManual && i === qtdParcelas) {
      valorParcela = Number((valorTotal - soma).toFixed(2));
    }

    soma += valorParcela;

    const data = new Date(primeiraData + 'T00:00:00');
    data.setMonth(data.getMonth() + i);

    parcelas.push({
      promissoria_id: promissoriaId,
      numero_parcela: i,
      valor: valorParcela,
      data_vencimento: data.toISOString().split('T')[0],
      status: 'pendente'
    });
  }

  return parcelas;
}

// =============================
// PAGAR PARCELA
// =============================
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
  const valor = parseFloat(document.getElementById("valorPagamentoParcela").value);
  if (!valor || valor <= 0) { alert("Informe um valor válido."); return; }

  try {
    const { error } = await supabaseClient
      .from("parcelas")
      .update({ valor: valor, status: "paga" })
      .eq("id", parcelaSelecionadaId);

    if (error) throw error;

    alert("Parcela paga com sucesso!");
    fecharPagamentoParcela();

    const promissoriaId = promissorias.find(p => p.id === promissoriaEditandoId)?.id;
    await abrirParcelas(promissoriaId);

  } catch (err) {
    console.error(err);
    alert("Erro ao pagar parcela");
  }
}

async function pagarParcela(parcelaId, promissoriaId) {
  if (!parcelaId || !promissoriaId) { alert("ID inválido"); return; }

  try {
    const { error: erroParcela } = await supabaseClient
      .from('parcelas')
      .update({ status: 'paga' })
      .eq('id', parcelaId);

    if (erroParcela) throw erroParcela;

    const { data: parcelas, error: erroBusca } = await supabaseClient
      .from('parcelas')
      .select('*')
      .eq('promissoria_id', promissoriaId);

    if (erroBusca) throw erroBusca;

    const totalPago = parcelas
      .filter(p => p.status === 'paga')
      .reduce((acc, p) => acc + Number(p.valor), 0);

    const { error: erroUpdate } = await supabaseClient
      .from('promissorias')
      .update({ valor_pago: totalPago })
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

// =============================
// RESUMO PAGAMENTOS
// =============================
async function carregarResumoPagamentos() {
  const { data, error } = await supabaseClient.from("pagamentos").select("*");

  if (error) { console.error("Erro ao carregar pagamentos:", error); return; }

  let totalEmDia = 0;
  let totalAtrasado = 0;

  data.forEach(pagamento => {
    if (pagamento.tipo === "em_dia") totalEmDia += Number(pagamento.valor);
    if (pagamento.tipo === "atrasado") totalAtrasado += Number(pagamento.valor);
  });

  const elEmDia = document.getElementById("pagamentosEmDia");
  const elAtrasado = document.getElementById("pagamentosAtrasados");

  if (elEmDia) elEmDia.textContent = formatarMoeda(totalEmDia);
  if (elAtrasado) elAtrasado.textContent = formatarMoeda(totalAtrasado);
}