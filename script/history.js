requireSession();

const historyTable = document.querySelector('#history-table');

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
        renderHistory(await apiFetch('/api/vehicles'));
    } catch (error) {
        alert(error.message);
        button.disabled = false;
    }
});

apiFetch('/api/vehicles')
    .then(renderHistory)
    .catch((error) => alert(error.message));
