const resetForm = document.querySelector('#reset-form');
const resetMessage = document.querySelector('#reset-message');
const params = new URLSearchParams(window.location.hash.slice(1));
let accessToken = params.get('access_token');
let refreshToken = params.get('refresh_token');
const validLink = params.get('type') === 'recovery' && accessToken && refreshToken;
// Remove os tokens da barra de endereço e do histórico imediatamente.
window.history.replaceState(null, '', window.location.pathname);
try { document.documentElement.dataset.theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch {}
if (!validLink) {
    resetForm.hidden = true;
    resetMessage.textContent = 'Link inválido ou expirado. Volte ao login e solicite uma nova recuperação.';
}
resetForm.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(resetForm);
    const password = fields.get('password');
    if (password !== fields.get('confirmation')) {
        resetMessage.textContent = 'As senhas não coincidem.';
        return;
    }
    const button = resetForm.querySelector('button');
    button.disabled = true;
    button.textContent = 'Salvando...';
    resetForm.setAttribute('aria-busy', 'true');
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, refreshToken, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Não foi possível alterar a senha.');
        accessToken = refreshToken = null;
        resetForm.reset();
        resetForm.hidden = true;
        ['vex_access_token','vex_refresh_token','vex_user_email'].forEach(key => sessionStorage.removeItem(key));
        resetMessage.textContent = result.message;
    } catch (error) {
        resetMessage.textContent = error.message || 'Verifique sua conexão e tente novamente.';
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar senha';
        resetForm.setAttribute('aria-busy', 'false');
    }
});
