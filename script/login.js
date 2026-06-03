const loginForm = document.querySelector('.form-login form');

loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector('button[type="submit"]');
    const formData = new FormData(loginForm);

    button.disabled = true;
    button.textContent = 'Entrando...';
    clearSession();

    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });

        setSession(data.session, data.user);
        window.location.href = 'home.html';
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
    }
});
