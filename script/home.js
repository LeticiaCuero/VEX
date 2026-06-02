requireSession();

const vehicleForm = document.querySelector('.register-box form');
const vehicleTypeSelect = document.querySelector('#tipo');
const stayTypeSelect = document.querySelector('#estadia');
const ratePreview = document.querySelector('#rate-preview');
let rateCatalog = [];

function fillSelect(select, values) {
    const placeholder = select.querySelector('option');
    select.innerHTML = '';
    select.appendChild(placeholder);

    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function findRate(vehicleType, stayType) {
    return rateCatalog.find((rate) => rate.vehicle_type === vehicleType && rate.stay_type === stayType);
}

function refreshRatePreview() {
    if (!ratePreview) return;

    const selectedVehicleType = vehicleTypeSelect.value;
    const selectedStayType = stayTypeSelect.value;

    if (!selectedVehicleType || !selectedStayType) {
        ratePreview.textContent = 'Selecione tipo de veiculo e estadia para ver os valores.';
        return;
    }

    const selectedRate = findRate(selectedVehicleType, selectedStayType);

    if (!selectedRate) {
        ratePreview.textContent = 'Nao existe tarifa cadastrada para essa combinacao.';
        return;
    }

    ratePreview.textContent = `Valor inicial: ${formatCurrency(selectedRate.value)} | Adicional por hora: ${formatCurrency(selectedRate.additional || 0)}`;
}

function refreshStayTypeOptions() {
    const selectedVehicleType = vehicleTypeSelect.value;

    if (!selectedVehicleType) {
        fillSelect(stayTypeSelect, []);
        stayTypeSelect.value = '';
        refreshRatePreview();
        return;
    }

    const availableStayTypes = [...new Set(
        rateCatalog
            .filter((rate) => rate.vehicle_type === selectedVehicleType)
            .map((rate) => rate.stay_type)
    )];

    fillSelect(stayTypeSelect, availableStayTypes);
    stayTypeSelect.value = '';
    refreshRatePreview();
}

async function loadRateOptions() {
    rateCatalog = await apiFetch('/api/rates');

    const vehicleTypes = [...new Set(rateCatalog.map((rate) => rate.vehicle_type))];
    fillSelect(vehicleTypeSelect, vehicleTypes);
    fillSelect(stayTypeSelect, []);
    refreshRatePreview();
}

vehicleTypeSelect?.addEventListener('change', refreshStayTypeOptions);
stayTypeSelect?.addEventListener('change', refreshRatePreview);

vehicleForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = vehicleForm.querySelector('button[type="submit"]');
    const formData = new FormData(vehicleForm);

    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
        await apiFetch('/api/vehicles', {
            method: 'POST',
            body: JSON.stringify({
                plate: formData.get('placa'),
                model: formData.get('modelo'),
                brand: formData.get('marca'),
                color: formData.get('cor'),
                ownerCpf: formData.get('cpf'),
                vehicleType: formData.get('tipo'),
                stayType: formData.get('estadia')
            })
        });

        vehicleForm.reset();
        alert('Veiculo registrado com sucesso.');
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Registrar';
    }
});

function renderPendingVehicles(vehicles) {
    const tbody = document.querySelector('#pending-table');
    if (!tbody) return;

    tbody.innerHTML = '';

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
            <td>
                <button type="button" data-exit-id="${vehicle.id}">Finalizar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadPendingVehicles() {
    // Somente veículos em aberto (sem saída)
    const vehicles = await apiFetch('/api/vehicles?status=active');
    renderPendingVehicles(vehicles);
}

function wirePendingTable() {
    const tbody = document.querySelector('#pending-table');
    if (!tbody) return;

    tbody.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-exit-id]');
        if (!button) return;

        button.disabled = true;

        try {
            await apiFetch(`/api/vehicles/${button.dataset.exitId}/exit`, { method: 'PATCH' });
            await loadPendingVehicles();
        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    });
}

loadRateOptions().catch((error) => alert(error.message));
loadPendingVehicles()
    .then(() => wirePendingTable())
    .catch((error) => alert(error.message));

