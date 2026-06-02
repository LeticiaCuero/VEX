requireSession();

const taxForm = document.querySelector('.tax-form');
const configTable = document.querySelector('#config-table');
let editingId = null;

function renderRates(rates) {
    configTable.innerHTML = '';

    rates.forEach((rate) => {
        const row = document.createElement('tr');
        row.dataset.rate = JSON.stringify(rate);
        row.innerHTML = `
            <td>${escapeHtml(rate.vehicle_type)}</td>
            <td>${escapeHtml(rate.stay_type)}</td>
            <td>${formatCurrency(rate.value)}</td>
            <td>${formatCurrency(rate.additional || 0)}</td>
            <td>
                <button type="button" class="is-secondary" data-edit-id="${rate.id}">Editar</button>
                <button type="button" data-delete-id="${rate.id}">Excluir</button>
            </td>
        `;
        configTable.appendChild(row);
    });
}

async function loadRates() {
    renderRates(await apiFetch('/api/rates'));
}

taxForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = taxForm.querySelector('button[type="submit"]');
    const formData = new FormData(taxForm);

    const payload = {
        vehicleType: formData.get('vehicle-type'),
        stayType: formData.get('stay-type'),
        value: formData.get('value'),
        additional: formData.get('additional-hour')
    };

    button.disabled = true;
    button.textContent = editingId ? 'Atualizando...' : 'Salvando...';

    try {
        await apiFetch(editingId ? `/api/rates/${editingId}` : '/api/rates', {
            method: editingId ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });

        editingId = null;
        taxForm.reset();
        await loadRates();
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar';
    }
});

configTable?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-id]');
    const deleteButton = event.target.closest('[data-delete-id]');

    if (editButton) {
        const tr = editButton.closest('tr');
        const rate = JSON.parse(tr.dataset.rate);

        editingId = rate.id;
        taxForm.elements['vehicle-type'].value = rate.vehicle_type;
        taxForm.elements['stay-type'].value = rate.stay_type;
        taxForm.elements.value.value = rate.value;
        taxForm.elements['additional-hour'].value = rate.additional || 0;

        taxForm.querySelector('button[type="submit"]').textContent = 'Atualizar';
        return;
    }

    if (deleteButton) {
        const id = deleteButton.dataset.deleteId;
        if (!id) return;

        if (!confirm('Excluir esta configuracao?')) return;

        try {
            await apiFetch(`/api/rates/${id}`, { method: 'DELETE' });
            await loadRates();
        } catch (error) {
            alert(error.message);
        }
    }
});

loadRates().catch((error) => alert(error.message));

