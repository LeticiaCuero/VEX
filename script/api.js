const VEX_API_BASE_URL = window.VEX_API_BASE_URL || 'http://localhost:3333';

function getToken() {
    return localStorage.getItem('vex_access_token');
}

function setSession(session, user) {
    localStorage.setItem('vex_access_token', session.accessToken);
    localStorage.setItem('vex_refresh_token', session.refreshToken);
    localStorage.setItem('vex_user_email', user.email || '');
}

function clearSession() {
    localStorage.removeItem('vex_access_token');
    localStorage.removeItem('vex_refresh_token');
    localStorage.removeItem('vex_user_email');
}

function requireSession() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

async function apiFetch(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${VEX_API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearSession();
        window.location.href = 'login.html';
        throw new Error('Sessao expirada.');
    }

    const data = response.status === 204 ? null : await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || 'Nao foi possivel concluir a operacao.');
    }

    return data;
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatDateTime(value) {
    return value ? new Date(value).toLocaleString('pt-BR') : '-';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}
