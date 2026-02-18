
// ===============================
// CARREGAR RELATÓRIO
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  iniciarFlatpickr();
  carregarRelatorio();
});

async function carregarRelatorio() {
  try {

    const periodo = document.getElementById("periodo").value;
    const vendedor = document.getElementById("filtroVendedorRelatorio").value;

    let query = supabaseClient
      .from("promissorias_view")
      .select("*");

    // ========================
    // FILTRO POR PERÍODO
    // ========================
    if (periodo) {

      const datas = periodo.split(" to ");

      if (datas.length === 2) {
        const dataInicio = converterData(datas[0]);
        const dataFim = converterData(datas[1]);

        query = query
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim);
      }
    }

    // ========================
    // FILTRO POR VENDEDOR
    // ========================
    if (vendedor) {
      query = query.eq("vendedor", vendedor);
    }

    const { data, error } = await query;

    if (error) throw error;

    atualizarResumo(data);
    montarRankingVendedores(data);
    montarClientesDevedores(data);
    preencherVendedores(data);

  } catch (err) {
    console.error("Erro ao carregar relatório:", err);
  }
}

// ===============================
// FLATPICKR
// ===============================
  function iniciarFlatpickr() {
  flatpickr("#periodo", {
    mode: "range",
    dateFormat: "d/m/Y",
    static: true
  });
}


// ===============================
// RESUMO
// ===============================
function atualizarResumo(lista) {

  let totalVendido = 0;
  let totalRecebido = 0;
  let totalAberto = 0;

  lista.forEach(p => {
    totalVendido += Number(p.valor_total || 0);
    totalRecebido += Number(p.valor_pago || 0);
    totalAberto += Number(p.valor_em_aberto || 0);
  });

  document.getElementById("totalVendido").textContent =
    formatarMoeda(totalVendido);

  document.getElementById("totalRecebido").textContent =
    formatarMoeda(totalRecebido);

  document.getElementById("totalAberto").textContent =
    formatarMoeda(totalAberto);
}


// ===============================
// RANKING VENDEDORES
// ===============================
function montarRankingVendedores(lista) {

  const ranking = {};

  lista.forEach(p => {

    if (!ranking[p.vendedor]) {
      ranking[p.vendedor] = { vendido: 0, recebido: 0 };
    }

    ranking[p.vendedor].vendido += Number(p.valor_total || 0);
    ranking[p.vendedor].recebido += Number(p.valor_pago || 0);
  });

  const tbody = document.getElementById("rankingVendedores");
  tbody.innerHTML = "";

  Object.entries(ranking)
    .sort((a, b) => b[1].vendido - a[1].vendido)
    .forEach(([nome, dados]) => {

      tbody.innerHTML += `
        <tr>
          <td>${nome}</td>
          <td>${formatarMoeda(dados.vendido)}</td>
          <td>${formatarMoeda(dados.recebido)}</td>
        </tr>
      `;
    });
}


// ===============================
// CLIENTES DEVEDORES
// ===============================
function montarClientesDevedores(lista) {

  const tbody = document.getElementById("clientesDevedores");
  tbody.innerHTML = "";

  lista
    .sort((a, b) => b.valor_em_aberto - a.valor_em_aberto)
    .slice(0, 10)
    .forEach(p => {

      tbody.innerHTML += `
        <tr>
          <td>${p.cliente}</td>
          <td class="vermelho">${formatarMoeda(p.valor_em_aberto)}</td>
        </tr>
      `;
    });
}


// ===============================
// EXPORTAR CSV
// ===============================
function exportarCSV() {

  const linhas = [];
  linhas.push(["Cliente", "Em Aberto"]);

  const linhasTabela =
    document.querySelectorAll("#clientesDevedores tr");

  linhasTabela.forEach(tr => {

    const colunas = tr.querySelectorAll("td");

    linhas.push([
      colunas[0].innerText,
      colunas[1].innerText
    ]);
  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    linhas.map(e => e.join(";")).join("\n");

  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "relatorio.csv");

  document.body.appendChild(link);
  link.click();
}


// ===============================
// UTILITÁRIOS
// ===============================
function converterData(dataBR) {

  const partes = dataBR.split("/");
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

function formatarMoeda(valor) {

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor) || 0);
}


// ===============================
// PREENCHER FILTRO DE VENDEDORES
// ===============================
function preencherVendedores(lista) {

  const select = document.getElementById("filtroVendedorRelatorio");

  select.innerHTML = '<option value="">Todos os vendedores</option>';

  const vendedores = [...new Set(lista.map(p => p.vendedor))];

  vendedores.forEach(v => {
    if (!v) return;

    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });
}