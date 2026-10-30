const themeButton = document.querySelector('.theme-toggle');
let darkTheme = false;
try { darkTheme = localStorage.getItem('theme') === 'dark'; } catch {}
function applyLandingTheme() {
    document.documentElement.dataset.theme = darkTheme ? 'dark' : 'light';
    themeButton.setAttribute('aria-label', darkTheme ? 'Ativar tema claro' : 'Ativar tema escuro');
    themeButton.querySelector('img').src = darkTheme ? 'img/sun.svg' : 'img/moon.svg';
}
applyLandingTheme();
themeButton.addEventListener('click', () => {
    darkTheme = !darkTheme;
    applyLandingTheme();
    try { localStorage.setItem('theme', darkTheme ? 'dark' : 'light'); } catch {}
});
