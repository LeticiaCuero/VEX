requireSession();

const kpiGrid = document.querySelector('#kpi-grid');
const dailyChart = document.querySelector('#daily-chart');
const revenueChart = document.querySelector('#revenue-chart');
const hourChart = document.querySelector('#hour-chart');
const typeChart = document.querySelector('#type-chart');
const peakDayLabel = document.querySelector('#peak-day-label');
const peakHourLabel = document.querySelector('#peak-hour-label');
const revenueTotal = document.querySelector('#revenue-total');

function getMax(items, field) {
    return Math.max(...items.map((item) => Number(item[field]) || 0), 1);
}

function renderKpis(stats) {
    const kpis = [
        { label: 'Veiculos ativos', value: stats.activeVehicles },
        { label: 'Entradas hoje', value: stats.entriesToday },
        { label: 'Saidas hoje', value: stats.exitsToday },
        { label: 'Faturamento hoje', value: formatCurrency(stats.revenueToday) }
    ];

    kpiGrid.innerHTML = kpis.map((kpi) => `
        <article class="kpi-card">
            <span>${escapeHtml(kpi.label)}</span>
            <strong>${escapeHtml(kpi.value)}</strong>
        </article>
    `).join('');
}

function renderDailyChart(days) {
    const maxEntries = getMax(days, 'entries');

    dailyChart.innerHTML = days.map((day) => `
        <div class="column-item">
            <div class="column-track">
                <span style="height: ${Math.max((day.entries / maxEntries) * 100, day.entries ? 8 : 0)}%"></span>
            </div>
            <strong>${day.entries}</strong>
            <small>${escapeHtml(day.label)}</small>
        </div>
    `).join('');
}

function renderRevenueChart(days) {
    const maxRevenue = getMax(days, 'revenue');

    revenueChart.innerHTML = days.map((day) => `
        <div class="revenue-row">
            <span>${escapeHtml(day.label)}</span>
            <div class="revenue-track">
                <strong style="width: ${Math.max((day.revenue / maxRevenue) * 100, day.revenue ? 8 : 0)}%"></strong>
            </div>
            <em>${formatCurrency(day.revenue)}</em>
        </div>
    `).join('');
}

function renderHourChart(hours) {
    const compactHours = hours.filter((item) => item.total > 0);
    const visibleHours = compactHours.length ? compactHours : hours.filter((item) => item.hour % 3 === 0);
    const maxTotal = getMax(visibleHours, 'total');

    hourChart.innerHTML = visibleHours.map((hour) => `
        <div class="hour-item">
            <div class="hour-track">
                <span style="height: ${Math.max((hour.total / maxTotal) * 100, hour.total ? 10 : 0)}%; --bar-width: ${Math.max((hour.total / maxTotal) * 100, hour.total ? 8 : 0)}%"></span>
            </div>
            <small>${escapeHtml(hour.label)}</small>
            <strong>${hour.total}</strong>
        </div>
    `).join('');
}

function renderTypeChart(types) {
    const entries = Object.entries(types);
    const maxTotal = Math.max(...entries.map(([, total]) => Number(total) || 0), 1);

    if (!entries.length) {
        typeChart.innerHTML = '<p class="empty-chart">Nenhum veiculo registrado.</p>';
        return;
    }

    typeChart.innerHTML = entries.map(([type, total]) => `
        <div class="type-row">
            <span>${escapeHtml(type)}</span>
            <div class="type-track">
                <strong style="width: ${Math.max((total / maxTotal) * 100, 8)}%"></strong>
            </div>
            <em>${total}</em>
        </div>
    `).join('');
}

function renderDashboard(stats) {
    renderKpis(stats);
    renderDailyChart(stats.dailyPerformance || []);
    renderRevenueChart(stats.dailyPerformance || []);
    renderHourChart(stats.hourlyEntries || []);
    renderTypeChart(stats.vehicleTypeTotals || {});

    if (peakDayLabel) {
        peakDayLabel.textContent = `${stats.peakDay?.label || '-'} · ${stats.peakDay?.total || 0}`;
    }

    if (peakHourLabel) {
        peakHourLabel.textContent = `${stats.peakHour?.label || '-'} · ${stats.peakHour?.total || 0}`;
    }

    if (revenueTotal) {
        revenueTotal.textContent = formatCurrency(stats.totalRevenue || 0);
    }
}

apiFetch('/api/dashboard')
    .then(renderDashboard)
    .catch((error) => alert(error.message));
