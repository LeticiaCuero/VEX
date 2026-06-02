const contactForm = document.querySelector('.contact-card .form');
const planCta = document.querySelector('.plan-cta');

contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);

    button.disabled = true;
    button.textContent = 'Enviando...';

    try {
        await apiFetch('/api/contacts', {
            method: 'POST',
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                message: formData.get('message')
            })
        });

        contactForm.reset();
        alert('Mensagem enviada com sucesso.');
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Enviar';
    }
});

async function loadFeaturedPlan() {
    const plans = await apiFetch('/api/plans');
    const plan = plans.find((item) => item.slug === 'basic') || plans[0];

    if (!plan) {
        return;
    }

    document.querySelector('.title-plan').textContent = plan.name;
    document.querySelector('.price').innerHTML = `${formatCurrency(plan.price)} <span class="mounth">/MES</span>`;
    planCta.dataset.planSlug = plan.slug;
}

planCta?.addEventListener('click', async () => {
    const planSlug = planCta.dataset.planSlug || 'basic';

    if (!getToken()) {
        window.location.href = `view/login.html?next=subscribe&plan=${encodeURIComponent(planSlug)}`;
        return;
    }

    planCta.disabled = true;
    planCta.textContent = 'Assinando...';

    try {
        await apiFetch('/api/subscriptions', {
            method: 'POST',
            body: JSON.stringify({ planSlug })
        });
        alert('Plano assinado com sucesso.');
        window.location.href = 'view/home.html';
    } catch (error) {
        alert(error.message);
    } finally {
        planCta.disabled = false;
        planCta.textContent = 'Assinar';
    }
});

loadFeaturedPlan().catch(() => {
    // Mantem o plano estatico se a API ainda nao estiver disponivel.
});
