let graficoPizza;
let graficoLinha;
let graficoBarras;
let graficoHorizontal;

document.addEventListener('DOMContentLoaded', async () => {
  const promissorias = await buscarPromissorias();

  montarGraficoPizza(promissorias);
  montarGraficoLinha(promissorias);
  montarGraficoBarras(promissorias);
  montarGraficoHorizontal(promissorias);
  montarGraficoValoresEmAberto(promissorias);
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
    const d = new Date(p.data_vencimento);
    if (mes !== '' && d.getMonth() != mes) return false;
    if (ano !== '' && d.getFullYear() != ano) return false;
    return true;
  });

  montarGraficoPizza(filtradas);
  montarGraficoLinha(filtradas);
  montarGraficoBarras(filtradas);
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

function mesAno(date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric'
  });
}

function irParaPromissorias(filtro) {
  const params = new URLSearchParams(filtro).toString();
  window.location.href = `promissorias.html?${params}`;
}

/* =========================
   GRÁFICO PIZZA – STATUS
========================= */
function montarGraficoPizza(dados) {
  const ctx = document.getElementById('graficoPizza');

  const contagem = { pendente: 0, vencida: 0, paga: 0 };

  
  dados.forEach(p => {
    if (contagem[p.status] !== undefined) contagem[p.status]++;
  });

  graficoPizza?.destroy();

  graficoPizza = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Pendentes', 'Vencidas', 'Pagas'],
      datasets: [{
        data: Object.values(contagem),
        backgroundColor: ['#facc15', '#ef4444', '#22c55e']
      }]
    },
   options: {
  onClick: (evt, elements) => {
    if (!elements.length) return;
    const index = elements[0].index;
    const status = ['pendente', 'vencida', 'paga'][index];
    irParaPromissorias({ status });
  },
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
    if (p.status === 'paga' && p.data_pagamento) {
      const chave = mesAno(p.data_pagamento);
      mapa[chave] = (mapa[chave] || 0) + Number(p.valor_total || 0);
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
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.15)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
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
function montarGraficoBarras(dados) {
  const ctx = document.getElementById('graficoBarras');

  const mapa = {};

  dados.forEach(p => {
    if (!p.cliente) return;
    mapa[p.cliente] = (mapa[p.cliente] || 0) + Number(p.valor_em_aberto || 0);
  });

  const top10 = Object.entries(mapa)
    .map(([cliente, valor]) => ({ cliente, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  graficoBarras?.destroy();

  graficoBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(i => i.cliente),
      datasets: [{
        data: top10.map(i => i.valor),
        backgroundColor: '#f97316',
        borderRadius: 8,
        barThickness: 20
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
            label: ctx => formatarMoeda(ctx.raw)
          }
        }
      },
      scales: {
        x: {
          ticks: {
            callback: v => formatarMoeda(v)
          }
        },
        y: {
          ticks: {
            autoSkip: false,
            font: { size: 11 }
          }
        }
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

    const vencimento = new Date(p.data_vencimento);
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
      indexAxis: 'y', // 🔥 ISSO DEIXA DEITADO
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
        x: {
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function montarGraficoValoresEmAberto(promissorias) {
  const ctx = document.getElementById('graficoBarras');

  // 🔹 Soma valor em aberto por cliente
  const mapa = {};
  promissorias.forEach(p => {
    if (!p.cliente) return;
    mapa[p.cliente] = (mapa[p.cliente] || 0) + Number(p.valor_em_aberto || 0);
  });

  // 🔹 Top 5
  const top5 = Object.entries(mapa)
    .map(([cliente, valor]) => ({ cliente, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const labels = top5.map(c =>
    c.cliente.length > 18
      ? c.cliente.slice(0, 18) + '…'
      : c.cliente
  );

  const valores = top5.map(c => c.valor);

  if (graficoBarras) graficoBarras.destroy();

  graficoBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Valor em aberto',
        data: valores,
        backgroundColor: '#f97316',
        borderRadius: 10,
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
            title: (items) => top5[items[0].dataIndex].cliente,
            label: (ctx) => formatarMoeda(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: value => formatarMoeda(value)
          },
          grid: { color: '#e5e7eb' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}