// ── CONFIG ──
const SUPABASE_URL = 'https://owlscdfzljrwocubvcth.supabase.co'
const SUPABASE_KEY = 'sb_publishable_HmWtYoBPGv6aWxAqA6r6og_ZUYc5chn'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── CHARTS ──
let chartStatus, chartPrioridade, chartClientes

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#8899bb',
        font: { family: 'Space Grotesk', size: 11, weight: '500' },
        boxWidth: 10,
        padding: 12
      }
    },
    tooltip: {
      backgroundColor: '#111827',
      borderColor: 'rgba(99,120,160,0.3)',
      borderWidth: 1,
      titleColor: '#f0f4ff',
      bodyColor: '#8899bb',
      padding: 10,
      cornerRadius: 8,
    }
  }
}

function makeStatusChart(labels, values) {
  const ctx = document.getElementById('chart-status')
  if (chartStatus) chartStatus.destroy()
  chartStatus = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#10b981','#f59e0b','#ef4444','#8b5cf6','#6b7fa8'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '68%',
      plugins: { ...chartDefaults.plugins }
    }
  })
}

function makePrioridadeChart(labels, values) {
  const ctx = document.getElementById('chart-prioridade')
  if (chartPrioridade) chartPrioridade.destroy()
  chartPrioridade = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#ef4444','#f59e0b','#3b82f6','#10b981'],
        borderRadius: 5,
        borderWidth: 0
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: '#8899bb', font: { family: 'Space Grotesk', size: 10 } }, grid: { color: 'rgba(99,120,160,0.05)' } },
        y: { ticks: { color: '#8899bb', font: { family: 'Space Grotesk', size: 10 } }, grid: { color: 'rgba(99,120,160,0.08)' }, beginAtZero: true }
      },
      plugins: { ...chartDefaults.plugins, legend: { display: false } }
    }
  })
}

function makeClientesChart(labels, values) {
  const ctx = document.getElementById('chart-clientes')
  if (chartClientes) chartClientes.destroy()
  chartClientes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.length > 10 ? l.slice(0,10)+'…' : l),
      datasets: [{
        data: values,
        backgroundColor: 'rgba(6,182,212,0.25)',
        borderColor: '#06b6d4',
        borderWidth: 1.5,
        borderRadius: 5
      }]
    },
    options: {
      ...chartDefaults,
      indexAxis: 'y',
      scales: {
        x: { ticks: { color: '#8899bb', font: { family: 'Space Grotesk', size: 10 } }, grid: { color: 'rgba(99,120,160,0.08)' }, beginAtZero: true },
        y: { ticks: { color: '#8899bb', font: { family: 'Space Grotesk', size: 10 } }, grid: { display: false } }
      },
      plugins: { ...chartDefaults.plugins, legend: { display: false } }
    }
  })
}

// ── HELPERS ──
function statusBadge(s) {
  const map = {
    'ativo': 'active', 'ativa': 'active', 'active': 'active',
    'pendente': 'pendente', 'pending': 'pendente',
    'erro': 'erro', 'error': 'erro',
    'offline': 'offline',
    'cancelado': 'cancelado', 'cancelled': 'cancelado'
  }
  const k = (s||'').toLowerCase()
  const cls = map[k] || 'cancelado'
  return `<span class="badge badge-${cls}">${s||'—'}</span>`
}

function priBadge(p) {
  const map = { 'critica': 'critica', 'crítica': 'critica', 'alta': 'alta', 'media': 'media', 'média': 'media', 'baixa': 'baixa' }
  const k = (p||'').toLowerCase()
  const cls = map[k] || 'media'
  return `<span class="pri-badge pri-${cls}">${p||'—'}</span>`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
}

function fmtRelative(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h/24)}d atrás`
}

// ── TOAST ──
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✗', info: '●' }
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// ── CLOCK ──
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR')
}
setInterval(updateClock, 1000)
updateClock()

// ── LOAD DATA ──
async function loadAll() {
  const btn = document.getElementById('refresh-btn')
  btn.classList.add('loading')
  document.getElementById('refresh-icon').textContent = '⟳'

  try {
    const [clientesRes, operacoesRes, alertasRes] = await Promise.all([
      db.from('clientes').select('*'),
      db.from('operacoes').select('*, clientes(nome)').order('ultima_atualizacao', { ascending: false }).limit(50),
      db.from('alertas').select('*, operacoes(id, tipo)').order('enviado_em', { ascending: false }).limit(100)
    ])

    if (clientesRes.error) throw clientesRes.error
    if (operacoesRes.error) throw operacoesRes.error
    if (alertasRes.error) throw alertasRes.error

    const clientes = clientesRes.data || []
    const operacoes = operacoesRes.data || []
    const alertas = alertasRes.data || []

    renderKPIs(clientes, operacoes, alertas)
    renderTable(operacoes)
    renderAlerts(alertas)
    renderCharts(operacoes, alertas, clientes)
    renderMiniMetrics(operacoes, alertas)

    document.getElementById('last-update').textContent =
      'Última atualização: ' + new Date().toLocaleTimeString('pt-BR')

    toast('Dashboard atualizado', 'success')

  } catch (err) {
    console.error(err)
    toast('Erro ao carregar dados: ' + err.message, 'error')
    document.getElementById('conn-status').textContent = 'Erro'
  }

  btn.classList.remove('loading')
  document.getElementById('refresh-icon').textContent = '↻'
}

// ── KPIs ──
function renderKPIs(clientes, operacoes, alertas) {
  document.getElementById('kpi-clientes').textContent = clientes.length

  const ativas = operacoes.filter(o => ['ativo','ativa','active'].includes((o.status||'').toLowerCase())).length
  document.getElementById('kpi-ativas').textContent = ativas

  const offline = operacoes.filter(o => (o.status||'').toLowerCase() === 'offline').length
  document.getElementById('kpi-offline').textContent = offline

  const criticos = alertas.filter(a => {
    const op = operacoes.find(o => o.id === a.operacao_id)
    return op && ['critica','crítica'].includes((op.prioridade||'').toLowerCase())
  }).length
  document.getElementById('kpi-alertas').textContent = criticos

  document.getElementById('badge-alertas').textContent = alertas.length
}

// ── TABLE ──
function renderTable(operacoes) {
  const tbody = document.getElementById('ops-tbody')
  document.getElementById('ops-count').textContent = operacoes.length + ' registros'

  if (!operacoes.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">◈</div><div>Nenhuma operação encontrada</div><small>Insira dados na tabela <code>operacoes</code></small></div></td></tr>`
    return
  }

  tbody.innerHTML = operacoes.slice(0, 20).map(op => `
    <tr>
      <td class="td-mono">#${String(op.id).slice(0,8)}</td>
      <td class="td-primary">${op.clientes?.nome || `Cliente ${op.cliente_id}`}</td>
      <td>${op.tipo || '—'}</td>
      <td>${statusBadge(op.status)}</td>
      <td>${priBadge(op.prioridade)}</td>
      <td class="td-mono">${fmtDate(op.ultima_atualizacao)}</td>
    </tr>
  `).join('')
}

// ── ALERTS ──
function renderAlerts(alertas) {
  const feed = document.getElementById('alerts-feed')
  document.getElementById('alertas-count').textContent = alertas.length + ' alertas'

  if (!alertas.length) {
    feed.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><div>Nenhum alerta encontrado</div><small>Insira dados na tabela <code>alertas</code></small></div>`
    return
  }

  feed.innerHTML = alertas.slice(0, 12).map((a, i) => {
    const dotClass = i === 0 ? 'alert-dot-red' : i < 3 ? 'alert-dot-amber' : 'alert-dot-blue'
    return `
      <div class="alert-item">
        <div class="alert-dot ${dotClass}"></div>
        <div class="alert-msg">
          <strong>${a.canal || 'Sistema'}</strong> — ${a.mensagem || 'Alerta gerado'}
        </div>
        <div class="alert-time">${fmtRelative(a.enviado_em)}</div>
      </div>
    `
  }).join('')
}

// ── CHARTS ──
function renderCharts(operacoes, alertas, clientes) {
  // Status chart
  const statusMap = {}
  operacoes.forEach(o => {
    const s = o.status || 'indefinido'
    statusMap[s] = (statusMap[s] || 0) + 1
  })
  makeStatusChart(Object.keys(statusMap), Object.values(statusMap))

  // Priority chart
  const priMap = { 'Crítica': 0, 'Alta': 0, 'Média': 0, 'Baixa': 0 }
  operacoes.forEach(o => {
    const p = (o.prioridade || '').toLowerCase()
    if (p === 'critica' || p === 'crítica') priMap['Crítica']++
    else if (p === 'alta') priMap['Alta']++
    else if (p === 'media' || p === 'média') priMap['Média']++
    else if (p === 'baixa') priMap['Baixa']++
  })
  makePrioridadeChart(Object.keys(priMap), Object.values(priMap))

  // Clients chart
  const clientMap = {}
  operacoes.forEach(o => {
    const nome = o.clientes?.nome || `#${o.cliente_id}`
    clientMap[nome] = (clientMap[nome] || 0) + 1
  })
  const sorted = Object.entries(clientMap).sort((a,b) => b[1]-a[1]).slice(0,6)
  makeClientesChart(sorted.map(e=>e[0]), sorted.map(e=>e[1]))
}

// ── MINI METRICS ──
function renderMiniMetrics(operacoes, alertas) {
  document.getElementById('mm-total').textContent = operacoes.length
  document.getElementById('mm-pendente').textContent =
    operacoes.filter(o => (o.status||'').toLowerCase() === 'pendente').length
  document.getElementById('mm-erro').textContent =
    operacoes.filter(o => ['erro','error'].includes((o.status||'').toLowerCase())).length
  document.getElementById('mm-critica').textContent =
    operacoes.filter(o => ['critica','crítica'].includes((o.prioridade||'').toLowerCase())).length
  document.getElementById('mm-enviados').textContent =
    alertas.filter(a => a.enviado_em).length
}

// ── REALTIME ──
function setupRealtime() {
  db.channel('ops_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'operacoes' }, payload => {
      toast('Operação atualizada em tempo real', 'info')
      loadAll()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, payload => {
      toast('Novo alerta recebido!', 'error')
      loadAll()
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        document.getElementById('conn-status').textContent = 'Realtime ativo'
      }
    })
}

// ── INIT ──
loadAll()
setupRealtime()
setInterval(loadAll, 60000)