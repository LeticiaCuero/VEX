(() => {
    const queue = [];
    let active = false;

    function showNext() {
        if (active || !queue.length) return;
        active = true;
        const { message, success, resolve } = queue.shift();
        const dialog = document.createElement('dialog');
        dialog.className = 'app-popup';
        dialog.setAttribute('aria-labelledby', 'app-popup-title');
        dialog.setAttribute('aria-describedby', 'app-popup-message');
        dialog.innerHTML = `
            <div class="app-popup-heading"><h2 id="app-popup-title"></h2></div>
            <p id="app-popup-message"></p>
            <div class="app-popup-actions"><button type="button" autofocus>OK</button></div>
        `;
        dialog.querySelector('h2').textContent = success ? 'Sucesso' : 'Aviso';
        dialog.querySelector('p').textContent = String(message);
        document.body.appendChild(dialog);
        dialog.querySelector('button').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        });
        dialog.addEventListener('close', () => {
            dialog.remove();
            active = false;
            resolve();
            showNext();
        }, { once: true });
        dialog.showModal();
    }

    window.showPopup = (message, { success = false } = {}) => new Promise(resolve => {
        queue.push({ message, success, resolve });
        showNext();
    });
})();
