const loginForm = document.querySelector('#login-form');
const passwordInput = document.querySelector('#password');
const passwordToggle = document.querySelector('.password-toggle');

passwordToggle?.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    passwordToggle.setAttribute('aria-label', showPassword ? 'Ocultar senha' : 'Mostrar senha');
});

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
            body: JSON.stringify({ username: formData.get('email'), password: formData.get('password') })
        });
        setSession(data.session, data.user);
        window.location.href = 'home.html';
    } catch (error) {
        showPopup(error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Acessar<span class="icon-arrow" aria-hidden="true"></span>';
    }
});



const recoveryModal = document.querySelector('#recovery-modal');
const recoveryMessage = document.querySelector('.recovery-message');
document.querySelector('.forgot-password').addEventListener('click', () => {
    recoveryMessage.textContent = '';
    recoveryModal.showModal();
});
recoveryModal.querySelector('.modal-close').addEventListener('click', () => recoveryModal.close());
recoveryModal.addEventListener('click', event => {
    if (event.target !== recoveryModal) return;
    const rect = recoveryModal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) recoveryModal.close();
});
document.querySelector('#recovery-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    const email = new FormData(event.currentTarget).get('email');
    button.disabled = true;
    try {
        const result = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
        recoveryMessage.textContent = result.message;
    } catch (error) {
        recoveryMessage.textContent = error.message;
    } finally { button.disabled = false; }
});
try { document.documentElement.dataset.theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch {}
