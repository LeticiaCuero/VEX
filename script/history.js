requireSession();

const historyTable = document.querySelector('#history-table');
const historySearch = document.querySelector('#history-search');
let historyVehicles = [];

function formatElapsedMinutes(minutes) {
    if (minutes === null || minutes === undefined) {
        return '-';
    }

    const totalMinutes = Math.max(Number(minutes) || 0, 0);
    const hours = Math.floor(totalMinutes / 60);
    const restMinutes = totalMinutes % 60;

    if (!hours) {
        return `${restMinutes} min`;
    }

    return `${hours}h ${String(restMinutes).padStart(2, '0')}min`;
}

function renderBillingCell(vehicle, field, formatter = formatCurrency) {
    if (!vehicle.exit_at) {
        return '-';
    }

    return formatter(vehicle[field]);
}

function vehicleMatchesSearch(vehicle, term) {
    if (!term) {
        return true;
    }

    const searchableText = [
        vehicle.plate,
        vehicle.model,
        vehicle.brand,
        vehicle.color,
        vehicle.owner_cpf,
        vehicle.vehicle_type,
        vehicle.stay_type,
        formatDateTime(vehicle.entry_at),
        formatDateTime(vehicle.exit_at),
        formatElapsedMinutes(vehicle.billing_initial_minutes),
        formatElapsedMinutes(vehicle.billing_additional_start_minutes),
        formatElapsedMinutes(vehicle.billing_exceeded_minutes),
        formatCurrency(vehicle.billing_initial),
        formatCurrency(vehicle.billing_additional),
        formatCurrency(vehicle.billing_additional_total),
        formatCurrency(vehicle.billing_total)
    ].join(' ').toLowerCase();

    return searchableText.includes(term);
}

function renderBillingDetails(vehicle) {
    if (!vehicle.exit_at) {
        return `
            <div class="billing-details is-open">
                <span>Aguardando saida</span>
                <strong>-</strong>
            </div>
        `;
    }

    return `
        <div class="billing-details">
            <span>Inicial ${renderBillingCell(vehicle, 'billing_initial')}</span>
            <span>Adicional/h ${renderBillingCell(vehicle, 'billing_additional')}</span>
            <span>${renderBillingCell(vehicle, 'billing_additional_hours', (value) => String(value ?? 0))}h adicionais</span>
            <span>Total adicional ${renderBillingCell(vehicle, 'billing_additional_total')}</span>
            <strong>${renderBillingCell(vehicle, 'billing_total')}</strong>
        </div>
    `;
}

function renderHistory(vehicles) {
    historyTable.innerHTML = '';

    if (!vehicles.length) {
        historyTable.innerHTML = `
            <tr>
                <td class="empty-history" colspan="3">Nenhum registro encontrado.</td>
            </tr>
        `;
        return;
    }

    vehicles.forEach((vehicle) => {
        const row = document.createElement('tr');
        row.className = 'history-main-row';
        row.innerHTML = `
            <td>
                <div class="vehicle-cell">
                    <strong>${escapeHtml(vehicle.plate)}</strong>
                    <span>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} &middot; ${escapeHtml(vehicle.color)}</span>
                    <small>${escapeHtml(vehicle.vehicle_type)} &middot; ${escapeHtml(vehicle.stay_type)}</small>
                </div>
            </td>
            <td>
                <div class="owner-cell">
                    <span>CPF</span>
                    <strong>${escapeHtml(vehicle.owner_cpf)}</strong>
                </div>
            </td>
            <td>
                ${vehicle.exit_at
                    ? '<span class="status-badge is-closed">Finalizada</span>'
                    : `<button type="button" data-exit-id="${vehicle.id}">Registrar saida</button>`}
            </td>
        `;

        const detailRow = document.createElement('tr');
        detailRow.className = 'history-detail-row';
        detailRow.innerHTML = `
            <td colspan="3">
                <div class="history-detail-grid">
                    <div class="period-cell">
                        <span>Entrada: ${formatDateTime(vehicle.entry_at)}</span>
                        <span>Saida: ${vehicle.exit_at ? formatDateTime(vehicle.exit_at) : '-'}</span>
                        <small>Tempo ${renderBillingCell(vehicle, 'billing_elapsed_minutes', formatElapsedMinutes)} &middot; inicial ${renderBillingCell(vehicle, 'billing_initial_minutes', formatElapsedMinutes)} &middot; adicional apos ${renderBillingCell(vehicle, 'billing_additional_start_minutes', formatElapsedMinutes)} &middot; excedente ${renderBillingCell(vehicle, 'billing_exceeded_minutes', formatElapsedMinutes)}</small>
                    </div>
                    ${renderBillingDetails(vehicle)}
                </div>
            </td>
        `;

        historyTable.appendChild(row);
        historyTable.appendChild(detailRow);
    });
}

function applyHistorySearch() {
    const term = historySearch.value.trim().toLowerCase();
    renderHistory(historyVehicles.filter((vehicle) => vehicleMatchesSearch(vehicle, term)));
}

historyTable?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-exit-id]');

    if (!button) return;

    button.disabled = true;

    try {
        await apiFetch(`/api/vehicles/${button.dataset.exitId}/exit`, { method: 'PATCH' });
        historyVehicles = await apiFetch('/api/vehicles');
        applyHistorySearch();
    } catch (error) {
        alert(error.message);
        button.disabled = false;
    }
});

historySearch?.addEventListener('input', applyHistorySearch);

apiFetch('/api/vehicles')
    .then((vehicles) => {
        historyVehicles = vehicles;
        applyHistorySearch();
    })
    .catch((error) => alert(error.message));
