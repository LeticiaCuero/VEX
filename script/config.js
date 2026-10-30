requireSession();

const taxForm = document.querySelector('.tax-form');
const configTable = document.querySelector('#config-table');
const tariffModal = document.querySelector('.tariff-modal');
const tariffModalTitle = document.querySelector('#tariff-modal-title');
let editingId = null;
const stayTypeSelect = taxForm.elements['stay-type'];
const minutesField = taxForm.querySelector('[data-minutes-field]');
const minutesInput = taxForm.elements['stay-minutes'];
const tariffError = taxForm.querySelector('[data-tariff-error]');
const deleteModal = document.querySelector('.delete-tariff-modal');
const deleteConfirm = deleteModal.querySelector('[data-confirm-delete]');
const deleteError = deleteModal.querySelector('[data-delete-error]');
let pendingDeleteId = null;
let deleting = false;

function closeDeleteModal() {
    if (deleting) return;
    deleteModal.close();
    pendingDeleteId = null;
}
deleteModal.querySelectorAll('[data-cancel-delete]').forEach(button => {
    button.addEventListener('click', closeDeleteModal);
});
deleteModal.addEventListener('cancel', event => {
    if (deleting) event.preventDefault();
});
deleteModal.addEventListener('click', event => {
    if (event.target !== deleteModal) return;
    const bounds = deleteModal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closeDeleteModal();
});
deleteConfirm.addEventListener('click', async () => {
    if (!pendingDeleteId || deleting) return;
    deleting = true;
    deleteModal.setAttribute('aria-busy', 'true');
    deleteModal.querySelectorAll('button').forEach(button => { button.disabled = true; });
    deleteConfirm.textContent = 'Excluindo...';
    deleteError.hidden = true;
    try {
        await apiFetch(`/api/rates/${pendingDeleteId}`, { method: 'DELETE' });
        deleting = false;
        closeDeleteModal();
        await loadRates();
    } catch (error) {
        if (deleteModal.open) {
            deleteError.textContent = error.message;
            deleteError.hidden = false;
        } else {
            showPopup(error.message);
        }
    } finally {
        deleting = false;
        deleteModal.setAttribute('aria-busy', 'false');
        deleteModal.querySelectorAll('button').forEach(button => { button.disabled = false; });
        deleteConfirm.textContent = 'Excluir';
    }
});

function updateMinutesField() {
    const enabled = stayTypeSelect.value === 'minute';
    minutesField.hidden = !enabled;
    minutesInput.disabled = !enabled;
    minutesInput.required = enabled;
}
stayTypeSelect.addEventListener('change', updateMinutesField);

function openTariffModal(editing = false) {
    tariffModalTitle.textContent = editing ? 'Editar tarifa' : 'Nova tarifa';
    if (!editing) {
        editingId = null;
        taxForm.reset();
        taxForm.querySelector('button[type="submit"]').textContent = 'Salvar';
    }
    updateMinutesField();
    tariffError.hidden = true;
    tariffError.textContent = '';
    tariffModal.showModal();
}

function closeTariffModal() {
    tariffModal.close();
}

document.querySelector('[data-open-tariff]')?.addEventListener('click', () => openTariffModal(false));
document.querySelector('[data-close-tariff]')?.addEventListener('click', closeTariffModal);
tariffModal?.addEventListener('click', (event) => {
    if (event.target !== tariffModal) return;
    const bounds = tariffModal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closeTariffModal();
});

function renderRates(rates) {
    configTable.innerHTML = '';

    if (!rates.length) {
        configTable.innerHTML = '<p class="empty-rates">Nenhuma tarifa cadastrada.</p>';
        return;
    }

    rates.forEach((rate) => {
        const card = document.createElement('article');
        card.className = 'rate-card';
        card.dataset.rate = JSON.stringify(rate);
        card.innerHTML = `
            <div class="rate-main">
                <strong>${escapeHtml(rate.vehicle_type)}</strong>
                <span>${escapeHtml(rate.stay_type)}</span>
            </div>
            <div class="rate-values">
                <div>
                    <span>Inicial</span>
                    <strong>${formatCurrency(rate.value)}</strong>
                </div>
                <div>
                    <span>Adicional/h</span>
                    <strong>${formatCurrency(rate.additional || 0)}</strong>
                </div>
            </div>
            <div class="rate-actions">
                <button type="button" class="is-secondary" data-edit-id="${rate.id}">Editar</button>
                <button type="button" data-delete-id="${rate.id}">Excluir</button>
            </div>
        `;
        configTable.appendChild(card);
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
        sqlStayType: formData.get('stay-type'),
        stayMinutes: formData.get('stay-minutes'),
        value: formData.get('value'),
        additional: formData.get('additional-hour')
    };

    button.disabled = true;
    tariffError.hidden = true;
    taxForm.setAttribute('aria-busy', 'true');
    button.textContent = editingId ? 'Atualizando...' : 'Salvando...';

    try {
        await apiFetch(editingId ? `/api/rates/${editingId}` : '/api/rates', {
            method: editingId ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });

        editingId = null;
        taxForm.reset();
        await loadRates();
        closeTariffModal();
    } catch (error) {
        tariffError.textContent = error.message;
        tariffError.hidden = false;
    } finally {
        button.disabled = false;
        taxForm.setAttribute('aria-busy', 'false');
        button.textContent = 'Salvar';
    }
});

configTable?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-id]');
    const deleteButton = event.target.closest('[data-delete-id]');

    if (editButton) {
        const card = editButton.closest('.rate-card');
        const rate = JSON.parse(card.dataset.rate);

        editingId = rate.id;
        taxForm.elements['vehicle-type'].value = rate.vehicle_type;
        taxForm.elements['stay-type'].value = rate.sql_stay_type;
        minutesInput.value = rate.stay_minutes ?? '';
        taxForm.elements.value.value = rate.value;
        taxForm.elements['additional-hour'].value = rate.additional ?? '';

        taxForm.querySelector('button[type="submit"]').textContent = 'Atualizar';
        openTariffModal(true);
        return;
    }

    if (deleteButton) {
        const id = deleteButton.dataset.deleteId;
        if (!id) return;

        const rate = JSON.parse(deleteButton.closest('.rate-card').dataset.rate);
        pendingDeleteId = id;
        deleteModal.querySelector('[data-delete-summary]').textContent = `${rate.vehicle_type} \u2014 ${rate.stay_type}`;
        deleteError.hidden = true;
        deleteError.textContent = '';
        deleteModal.showModal();
    }
});

loadRates().catch((error) => showPopup(error.message));



