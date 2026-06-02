const loginForm = document.querySelector('.form-login form');
const forgotPasswordButton = document.querySelector('.btn-password');

loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector('button[type="submit"]');
    const formData = new FormData(loginForm);

    button.disabled = true;
    button.textContent = 'Entrando...';

    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });

        setSession(data.session, data.user);

        const params = new URLSearchParams(window.location.search);
        if (params.get('next') === 'subscribe') {
            await apiFetch('/api/subscriptions', {
                method: 'POST',
                body: JSON.stringify({ planSlug: params.get('plan') || 'basic' })
            });
        }

        window.location.href = 'home.html';
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
    }
});

forgotPasswordButton?.addEventListener('click', async () => {
    const usernameInput = document.querySelector('#username');
    const email = usernameInput.value.trim() || prompt('Informe o e-mail da conta:');

    if (!email) {
        return;
    }

    forgotPasswordButton.disabled = true;
    forgotPasswordButton.textContent = 'Enviando...';

    try {
        await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        alert('Enviamos as instrucoes de recuperacao para o e-mail informado.');
    } catch (error) {
        alert(error.message);
    } finally {
        forgotPasswordButton.disabled = false;
        forgotPasswordButton.textContent = 'Esqueci minha senha';
    }
});
