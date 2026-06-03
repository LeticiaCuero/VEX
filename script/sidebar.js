async function loadSiteSidebar() {
    const sidebarSlot = document.querySelector('[data-site-sidebar]');

    if (!sidebarSlot) {
        return;
    }

    const response = await fetch('../view/sidebar.html');

    if (!response.ok) {
        throw new Error('Não foi possível carregar a barra lateral.');
    }

    sidebarSlot.innerHTML = await response.text();
    setActiveSidebarLink(sidebarSlot);
    setupLogoutModal(sidebarSlot);
}

function setActiveSidebarLink(sidebarSlot) {
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';

    sidebarSlot.querySelectorAll('.navegation a').forEach((link) => {
        const targetPage = link.getAttribute('href');

        if (targetPage === currentPage) {
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

function setupLogoutModal(sidebarSlot) {
    const logoutButton = sidebarSlot.querySelector('.btn-logout');
    const modal = sidebarSlot.querySelector('.logout-modal');
    const cancelButtons = sidebarSlot.querySelectorAll('[data-logout-cancel]');
    const cancelButton = sidebarSlot.querySelector('.logout-modal__cancel');
    const confirmButton = sidebarSlot.querySelector('[data-logout-confirm]');

    if (!logoutButton || !modal) {
        return;
    }

    function openModal(event) {
        event.preventDefault();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        cancelButton?.focus();
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        logoutButton.focus();
    }

    logoutButton.addEventListener('click', openModal);

    cancelButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    confirmButton?.addEventListener('click', () => {
        if (typeof clearSession === 'function') {
            clearSession();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });
}

loadSiteSidebar().catch(() => {});
