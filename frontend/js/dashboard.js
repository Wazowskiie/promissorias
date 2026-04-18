let graficoPizza;
let graficoLinha;
let graficoBarras;
let graficoHorizontal;

document.addEventListener('DOMContentLoaded', async () => {
  const promissorias = await buscarPromissorias();

  montarGraficoPizza(promissorias);
  montarGraficoLinha(promissorias);
  montarGraficoValoresEmAberto(promissorias);
  montarGraficoHorizontal(promissorias);
});

/* =========================
   BUSCAR DADOS
========================= */
async function buscarPromissorias() {
  const { data, error } = await supabaseClient
    .from('promissorias_view')
    .select('*');

  if (error) {
    console.error('Erro ao buscar promissórias', error);
    return [];
  }

  return data || [];
}

const filtroMes = document.getElementById('filtroMes');
const filtroAno = document.getElementById('filtroAno');
const btnFiltrar = document.getElementById('btnFiltrar');

function popularAnos() {
  const anoAtual = new Date().getFullYear();
  for (let ano = anoAtual; ano >= anoAtual - 5; ano--) {
    const opt = document.createElement('option');
    opt.value = ano;
    opt.textContent = ano;
    filtroAno.appendChild(opt);
  }
}

btnFiltrar.addEventListener('click', async () => {
  const promissorias = await buscarPromissorias();
  const mes = filtroMes.value;
  const ano = filtroAno.value;

  const filtradas = promissorias.filter(p => {
    if (!p.data_vencimento) return false;
    const d = new Date(p.data_vencimento + 'T00:00:00');
    if (mes !== '' && d.getMonth() != mes) return false;
    if (ano !== '' && d.getFullYear() != ano) return false;
    return true;
  });

  montarGraficoPizza(filtradas);
  montarGraficoLinha(filtradas);
  montarGraficoValoresEmAberto(filtradas);
  montarGraficoHorizontal(filtradas);
});

popularAnos();

/* =========================
   UTILIDADES
========================= */
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
}

function mesAno(dateStr) {
  // Corrige bug de fuso: força leitura como data local
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric'
  });
}

function irParaPromissorias(filtro) {
  const params = new URLSearchParams(filtro).toString();
  window.location.href = `promissorias.html?${params}`;
}

/* =========================
   STATUS VISUAL (igual ao promissorias.js)
========================= */
function calcularStatusVisual(p) {
  if (p.status === 'paga') return 'paga';
  if (p.pendencia_documental) return 'pendente';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(p.data_vencimento + 'T00:00:00');
  venc.setHours(0, 0, 0, 0);

  if (venc < hoje) return 'vencida';
  return 'avencer';
}

/* =========================
   GRÁFICO PIZZA – STATUS
========================= */
function montarGraficoPizza(dados) {
  const ctx = document.getElementById('graficoPizza');
  const contagem = { avencer: 0, vencida: 0, paga: 0, pendente: 0 };

  dados.forEach(p => {
    const status = calcularStatusVisual(p);
    if (contagem[status] !== undefined) contagem[status]++;
  });

  graficoPizza?.destroy();

  graficoPizza = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['A vencer', 'Vencidas', 'Pagas', 'Pendentes'],
      datasets: [{
        data: [contagem.avencer, contagem.vencida, contagem.paga, contagem.pendente],
        backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#facc15']
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/* =========================
   GRÁFICO LINHA – RECEBIDO NO MÊS
========================= */
function montarGraficoLinha(dados) {
  const ctx = document.getElementById('graficoLinha');
  const mapa = {};

  dados.forEach(p => {
    if (p.status === 'paga' && p.data_vencimento) {
      const chave = mesAno(p.data_vencimento);
      mapa[chave] = (mapa[chave] || 0) + Number(p.valor_pago || 0);
    }
  });

  graficoLinha?.destroy();

  graficoLinha = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(mapa),
      datasets: [{
        label: 'Recebido no mês',
        data: Object.values(mapa),
        borderColor: '#CC0000',
        backgroundColor: 'rgba(204, 0, 0, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => formatarMoeda(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: v => formatarMoeda(v)
          }
        }
      }
    }
  });
}

/* =========================
   GRÁFICO BARRAS – TOP 10 EM ABERTO
========================= */
function montarGraficoValoresEmAberto(promissorias) {
  const ctx = document.getElementById('graficoBarras');
  const mapa = {};

  promissorias.forEach(p => {
    if (!p.cliente) return;
    mapa[p.cliente] = (mapa[p.cliente] || 0) + Number(p.valor_em_aberto || 0);
  });

  const top10 = Object.entries(mapa)
    .map(([cliente, valor]) => ({ cliente, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const labels = top10.map(c =>
    c.cliente.length > 18 ? c.cliente.slice(0, 18) + '…' : c.cliente
  );

  if (graficoBarras) graficoBarras.destroy();

  graficoBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Valor em aberto',
        data: top10.map(c => c.valor),
        backgroundColor: '#CC0000',
        borderRadius: 8,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => top10[items[0].dataIndex].cliente,
            label: ctx => formatarMoeda(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: v => formatarMoeda(v) },
          grid: { color: '#e5e7eb' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

/* =========================
   GRÁFICO HORIZONTAL – ATRASO
========================= */
function montarGraficoHorizontal(promissorias) {
  let emDia = 0;
  let atrasadas = 0;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  promissorias.forEach(p => {
    if (p.status === 'paga') return;
    const vencimento = new Date(p.data_vencimento + 'T00:00:00');
    vencimento.setHours(0, 0, 0, 0);
    if (vencimento < hoje) atrasadas++;
    else emDia++;
  });

  const ctx = document.getElementById('graficoHorizontal');
  if (graficoHorizontal) graficoHorizontal.destroy();

  graficoHorizontal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Em dia', 'Atrasadas'],
      datasets: [{
        data: [emDia, atrasadas],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderRadius: 10
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw} promissórias`
          }
        }
      },
      scales: {
        x: { ticks: { precision: 0 } }
      }
    }
  });
}