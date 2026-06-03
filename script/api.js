function resolveApiBaseUrl() {
    const configuredBaseUrl = typeof window.VEX_API_BASE_URL === 'string' ? window.VEX_API_BASE_URL.trim() : '';

    if (configuredBaseUrl) {
        try {
            const parsedUrl = new URL(configuredBaseUrl, window.location.href);

            if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
                return parsedUrl.origin;
            }
        } catch (_error) {
            return configuredBaseUrl;
        }
    }

    return '';
}

const VEX_API_BASE_URL = resolveApiBaseUrl();

function getToken() {
    return sessionStorage.getItem('vex_access_token');
}

function getRefreshToken() {
    return sessionStorage.getItem('vex_refresh_token');
}

function setSession(session, user) {
    sessionStorage.setItem('vex_access_token', session.accessToken);
    sessionStorage.setItem('vex_refresh_token', session.refreshToken);
    sessionStorage.setItem('vex_user_email', user.email || '');
}

function clearSession() {
    sessionStorage.removeItem('vex_access_token');
    sessionStorage.removeItem('vex_refresh_token');
    sessionStorage.removeItem('vex_user_email');
}

function requireSession() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

async function refreshSession() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        return false;
    }

    const response = await fetch(`${VEX_API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
        return false;
    }

    const data = await response.json();
    setSession(data.session, data.user);
    return true;
}

async function apiFetch(path, options = {}, retrying = false) {
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
        const canRefresh = !retrying && !path.startsWith('/api/auth/') && await refreshSession();

        if (canRefresh) {
            return apiFetch(path, options, true);
        }

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
