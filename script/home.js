requireSession();

const vehicleForm = document.querySelector('.register-box form');
const vehicleTypeSelect = document.querySelector('#tipo');
const stayTypeSelect = document.querySelector('#estadia');

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

async function loadRateOptions() {
    const rates = await apiFetch('/api/rates');
    fillSelect(vehicleTypeSelect, [...new Set(rates.map((rate) => rate.vehicle_type))]);
    fillSelect(stayTypeSelect, [...new Set(rates.map((rate) => rate.stay_type))]);
}

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
