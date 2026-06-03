requireSession();

const historyTable = document.querySelector('#history-table');
const historySearch = document.querySelector('#history-search');
let historyVehicles = [];

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
        formatDateTime(vehicle.exit_at)
    ].join(' ').toLowerCase();

    return searchableText.includes(term);
}

function applyHistorySearch() {
    const term = historySearch.value.trim().toLowerCase();
    renderHistory(historyVehicles.filter((vehicle) => vehicleMatchesSearch(vehicle, term)));
}

function renderHistory(vehicles) {
    historyTable.innerHTML = '';

    vehicles.forEach((vehicle) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(vehicle.plate)}</td>
            <td>${escapeHtml(vehicle.model)}</td>
            <td>${escapeHtml(vehicle.brand)}</td>
            <td>${escapeHtml(vehicle.color)}</td>
            <td>${escapeHtml(vehicle.owner_cpf)}</td>
            <td>${escapeHtml(vehicle.vehicle_type)}</td>
            <td>${formatDateTime(vehicle.entry_at)}</td>
            <td>${vehicle.exit_at ? formatDateTime(vehicle.exit_at) : `<button type="button" data-exit-id="${vehicle.id}">Registrar saida</button>`}</td>
        `;
        historyTable.appendChild(row);
    });
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
