async function loadSiteSidebar() {
    const sidebarSlot = document.querySelector('[data-site-sidebar]');
    if (!sidebarSlot) return;

    const response = await fetch('../view/sidebar.html');
    if (!response.ok) throw new Error('Não foi possível carregar o cabeçalho.');
    sidebarSlot.innerHTML = await response.text();

    const pages = {
        'home.html': 'Cadastro',
        'history.html': 'Histórico',
        'dashboard.html': 'Dashboard',
        'config.html': 'Tarifa'
    };
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    const title = sidebarSlot.querySelector('[data-page-title]');
    if (title) title.textContent = pages[currentPage] || 'VEX';

    sidebarSlot.querySelectorAll('.header-menu-nav a').forEach((link) => {
        if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });

    setupHeaderMenu(sidebarSlot);
    setupTheme(sidebarSlot);
}

function setupHeaderMenu(root) {
    const menuButton = root.querySelector('.hamburger');
    const menu = root.querySelector('.header-menu-nav');
    const overlay = root.querySelector('.menu-overlay');
    const logoutButton = root.querySelector('.menu-logout');

    function setMenu(open) {
        menu.hidden = !open;
        overlay.hidden = !open;
        menuButton.setAttribute('aria-expanded', String(open));
        if (open) menu.querySelector('a, button')?.focus();
    }

    menuButton?.addEventListener('click', () => setMenu(menu.hidden));
    overlay?.addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) {
            setMenu(false);
            menuButton.focus();
        }
    });

    logoutButton?.addEventListener('click', () => {
        setMenu(false);
        const dialog = document.createElement('dialog');
        dialog.className = 'app-popup';
        dialog.setAttribute('aria-label', 'Confirmar saída');
        dialog.setAttribute('aria-describedby', 'logout-description');
        dialog.innerHTML = `
            <p id="logout-description">Tem certeza que deseja sair da conta?</p>
            <div class="app-popup-actions logout-confirm-actions">
                <button class="logout-cancel" type="button" autofocus>Cancelar</button>
                <button type="button" data-confirm-logout>Sair</button>
            </div>
        `;
        document.body.appendChild(dialog);
        dialog.querySelector('.logout-cancel').addEventListener('click', () => dialog.close());
        dialog.querySelector('[data-confirm-logout]').addEventListener('click', () => {
            if (typeof clearSession === 'function') clearSession();
            window.location.href = 'login.html';
        });
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        });
        dialog.addEventListener('close', () => {
            dialog.remove();
            menuButton.focus();
        }, { once: true });
        dialog.showModal();
    });
}

function setupTheme(root) {
    const button = root.querySelector('.theme-toggle');
    let dark = false;
    try { dark = localStorage.getItem('theme') === 'dark'; } catch {}

    function applyTheme() {
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        button?.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
    }

    applyTheme();
    button?.addEventListener('click', () => {
        dark = !dark;
        applyTheme();
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
    });
}

loadSiteSidebar().catch(() => {});


