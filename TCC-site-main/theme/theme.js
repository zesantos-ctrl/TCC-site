function toggleTheme() {
    const body = document.body;
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSun = document.getElementById('theme-icon-sun');

    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('siteTheme', 'dark');
        themeIconMoon.style.display = 'block';
        themeIconSun.style.display = 'none';
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('siteTheme', 'light');
        themeIconMoon.style.display = 'none';
        themeIconSun.style.display = 'block';
    }
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('siteTheme');
    const body = document.body;
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSun = document.getElementById('theme-icon-sun');

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIconMoon.style.display = 'none';
        themeIconSun.style.display = 'block';
    } else {
        body.classList.add('dark-mode');
        themeIconMoon.style.display = 'block';
        themeIconSun.style.display = 'none';
    }
}

// Aplica o tema assim que a página carregar
document.addEventListener('DOMContentLoaded', applySavedTheme);
