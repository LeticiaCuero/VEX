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
    if (!ratePreview) {
        return;
    }

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

loadRateOptions().catch((error) => alert(error.message));
