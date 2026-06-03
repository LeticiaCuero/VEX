requireSession();

const vehicleForm = document.querySelector('.register-box form');
const vehicleTypeSelect = document.querySelector('#tipo');
const stayTypeSelect = document.querySelector('#estadia');
const ratePreview = document.querySelector('#rate-preview');
const exitModal = document.querySelector('.exit-modal');
const exitSummary = document.querySelector('#exit-summary');
const exitConfirmButton = document.querySelector('[data-exit-confirm]');
let rateCatalog = [];
let pendingVehicles = [];
let selectedExitVehicle = null;

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

function normalizeStayType(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function parseStayMinutes(stayType) {
    const normalized = normalizeStayType(stayType);
    const numberMatch = normalized.match(/(\d+(?:[,.]\d+)?)/);
    const amount = numberMatch ? Number(numberMatch[1].replace(',', '.')) : 0;

    if (normalized.includes('diaria') || normalized.includes('dia')) {
        return 24 * 60;
    }

    if (normalized.includes('mensal') || normalized.includes('mes')) {
        return 30 * 24 * 60;
    }

    if (amount && /(min|minuto|minutos)/.test(normalized)) {
        return Math.round(amount);
    }

    if (amount && /(h|hora|horas)/.test(normalized)) {
        return Math.round(amount * 60);
    }

    return 60;
}

function resolveAdditionalValue(rate, initialValue, initialMinutes) {
    const additionalValue = Number(rate.additional || 0);

    if (additionalValue > 0) {
        return additionalValue;
    }

    return initialMinutes < 24 * 60 ? initialValue : 0;
}

function calculateExitAmount(vehicle) {
    const rate = findRate(vehicle.vehicle_type, vehicle.stay_type);
    const entryDate = new Date(vehicle.entry_at);
    const exitDate = new Date();
    const elapsedMs = Math.max(exitDate - entryDate, 0);
    const elapsedMinutes = Math.max(Math.round(elapsedMs / (1000 * 60)), 0);
    const initialMinutes = parseStayMinutes(vehicle.stay_type);
    const additionalStartMinutes = Math.max(initialMinutes, 60);
    const exceededMinutes = Math.max(elapsedMinutes - additionalStartMinutes, 0);
    const chargedAdditionalHours = Math.ceil(exceededMinutes / 60);

    if (!rate) {
        return {
            rate: null,
            elapsedMinutes,
            initialMinutes,
            additionalStartMinutes,
            exceededMinutes,
            chargedAdditionalHours,
            initialValue: 0,
            additionalValue: 0,
            additionalTotal: 0,
            total: 0
        };
    }

    const initialValue = Number(rate.value || 0);
    const additionalValue = resolveAdditionalValue(rate, initialValue, initialMinutes);

    const additionalTotal = chargedAdditionalHours * additionalValue;

    return {
        rate,
        elapsedMinutes,
        initialMinutes,
        additionalStartMinutes,
        exceededMinutes,
        chargedAdditionalHours,
        initialValue,
        additionalValue,
        additionalTotal,
        total: initialValue + additionalTotal
    };
}

function formatElapsedMinutes(minutes) {
    const totalMinutes = Math.max(Math.round(Number(minutes) || 0), 0);
    const wholeHours = Math.floor(totalMinutes / 60);
    const restMinutes = totalMinutes % 60;

    if (!wholeHours) {
        return `${restMinutes} min`;
    }

    return `${wholeHours}h ${String(restMinutes).padStart(2, '0')}min`;
}

function refreshRatePreview() {
    if (!ratePreview) return;

    const selectedVehicleType = vehicleTypeSelect.value;
    const selectedStayType = stayTypeSelect.value;

    if (!selectedVehicleType || !selectedStayType) {
        ratePreview.textContent = 'Selecione veiculo e estadia para ver os valores.';
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
        const allStayTypes = [...new Set(rateCatalog.map((rate) => rate.stay_type))];
        fillSelect(stayTypeSelect, allStayTypes);
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
    const stayTypes = [...new Set(rateCatalog.map((rate) => rate.stay_type))];
    fillSelect(vehicleTypeSelect, vehicleTypes);
    fillSelect(stayTypeSelect, stayTypes);
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
        refreshStayTypeOptions();
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
    pendingVehicles = vehicles;

    vehicles.forEach((vehicle) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(vehicle.plate)}</td>
            <td>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.color)}</td>
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

function openExitModal(vehicle) {
    selectedExitVehicle = vehicle;
    const calculation = calculateExitAmount(vehicle);

    exitSummary.innerHTML = `
        <dl>
            <div><dt>Placa</dt><dd>${escapeHtml(vehicle.plate)}</dd></div>
            <div><dt>Veículo</dt><dd>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</dd></div>
            <div><dt>Estadia</dt><dd>${escapeHtml(vehicle.stay_type)}</dd></div>
            <div><dt>Entrada</dt><dd>${formatDateTime(vehicle.entry_at)}</dd></div>
            <div><dt>Tempo</dt><dd>${formatElapsedMinutes(calculation.elapsedMinutes)}</dd></div>
            <div><dt>Periodo inicial</dt><dd>${formatElapsedMinutes(calculation.initialMinutes)}</dd></div>
            <div><dt>Adicional apos</dt><dd>${formatElapsedMinutes(calculation.additionalStartMinutes)}</dd></div>
            <div><dt>Tempo excedente</dt><dd>${formatElapsedMinutes(calculation.exceededMinutes)}</dd></div>
            <div><dt>Valor inicial</dt><dd>${formatCurrency(calculation.initialValue)}</dd></div>
            <div><dt>Adicional por hora</dt><dd>${formatCurrency(calculation.additionalValue)}</dd></div>
            <div><dt>Horas adicionais cobradas</dt><dd>${calculation.chargedAdditionalHours}</dd></div>
            <div><dt>Total adicional</dt><dd>${formatCurrency(calculation.additionalTotal)}</dd></div>
            <div><dt>Valor total</dt><dd><strong>${formatCurrency(calculation.total)}</strong></dd></div>
        </dl>
    `;

    exitConfirmButton.disabled = !calculation.rate;
    exitConfirmButton.textContent = calculation.rate ? 'Confirmar saída' : 'Tarifa não encontrada';
    exitModal.classList.add('is-open');
    exitModal.setAttribute('aria-hidden', 'false');
    exitConfirmButton.focus();
}

function closeExitModal() {
    selectedExitVehicle = null;
    exitModal.classList.remove('is-open');
    exitModal.setAttribute('aria-hidden', 'true');
}

async function loadPendingVehicles() {
    const vehicles = await apiFetch('/api/vehicles?status=active');
    renderPendingVehicles(vehicles.filter((vehicle) => !vehicle.exit_at));
}

function wirePendingTable() {
    const tbody = document.querySelector('#pending-table');
    if (!tbody) return;

    tbody.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-exit-id]');
        if (!button) return;

        const vehicle = pendingVehicles.find((item) => item.id === button.dataset.exitId);

        if (vehicle) {
            openExitModal(vehicle);
        }
    });
}

document.querySelectorAll('[data-exit-cancel]').forEach((button) => {
    button.addEventListener('click', closeExitModal);
});

exitConfirmButton?.addEventListener('click', async () => {
    if (!selectedExitVehicle) return;

    exitConfirmButton.disabled = true;
    exitConfirmButton.textContent = 'Finalizando...';

    try {
        await apiFetch(`/api/vehicles/${selectedExitVehicle.id}/exit`, { method: 'PATCH' });
        closeExitModal();
        await loadPendingVehicles();
    } catch (error) {
        alert(error.message);
        exitConfirmButton.disabled = false;
        exitConfirmButton.textContent = 'Confirmar saída';
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && exitModal?.classList.contains('is-open')) {
        closeExitModal();
    }
});

loadRateOptions().catch((error) => alert(error.message));
loadPendingVehicles()
    .then(() => wirePendingTable())
    .catch((error) => alert(error.message));
