requireSession();

const dashboardBox = document.querySelector('.dashboard-box');

function renderDashboard(stats) {
    dashboardBox.insertAdjacentHTML('beforeend', `
        <div class="dashboard-grid">
            <article class="metric-card">
                <span>Veiculos ativos</span>
                <strong>${stats.activeVehicles}</strong>
            </article>
            <article class="metric-card">
                <span>Entradas hoje</span>
                <strong>${stats.entriesToday}</strong>
            </article>
            <article class="metric-card">
                <span>Saidas hoje</span>
                <strong>${stats.exitsToday}</strong>
            </article>
            <article class="metric-card">
                <span>Receita hoje</span>
                <strong>${formatCurrency(stats.revenueToday)}</strong>
            </article>
        </div>
        <div class="dashboard-list">
            <h2>Ativos por tipo</h2>
            <ul>
                ${Object.entries(stats.activeByType).map(([type, total]) => `<li><span>${escapeHtml(type)}</span><strong>${total}</strong></li>`).join('') || '<li><span>Nenhum veiculo ativo</span><strong>0</strong></li>'}
            </ul>
        </div>
    `);
}

apiFetch('/api/dashboard')
    .then(renderDashboard)
    .catch((error) => alert(error.message));
