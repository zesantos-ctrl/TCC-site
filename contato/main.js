/* ====================================================
   CONTATO — contato.js
   ==================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ── Elementos ──────────────────────────────────
    const form = document.getElementById('contatoForm');
    const nome = document.getElementById('ctNome');
    const email = document.getElementById('ctEmail');
    const assunto = document.getElementById('ctAssunto');
    const mensagem = document.getElementById('ctMensagem');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitBtn');
    const submitLbl = document.getElementById('submitLabel');
    const status = document.getElementById('formStatus');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    // ── Menu mobile ────────────────────────────────
    hamburger?.addEventListener('click', () => {
        navMenu?.classList.toggle('active');
    });

    // ── Tema ───────────────────────────────────────
    // (theme.js cuida disso, mas garantimos a classe inicial)
    const savedTheme = localStorage.getItem('siteTheme') || 'dark';
    document.body.classList.add(savedTheme === 'light' ? 'light-mode' : 'dark-mode');
    const moonIcon = document.getElementById('theme-icon-moon');
    const sunIcon = document.getElementById('theme-icon-sun');
    if (moonIcon) moonIcon.style.display = savedTheme === 'light' ? 'none' : 'block';
    if (sunIcon) sunIcon.style.display = savedTheme === 'light' ? 'block' : 'none';

    const themeBtn = document.getElementById('theme-toggle-btn');
    themeBtn?.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', !isDark);
        document.body.classList.toggle('light-mode', isDark);
        localStorage.setItem('siteTheme', isDark ? 'light' : 'dark');
        if (moonIcon) moonIcon.style.display = isDark ? 'block' : 'none';
        if (sunIcon) sunIcon.style.display = isDark ? 'none' : 'block';
    });

    // ── Contador de caracteres ──────────────────────
    mensagem?.addEventListener('input', () => {
        const len = mensagem.value.length;
        if (charCount) {
            charCount.textContent = len;
            charCount.style.color = len > 480 ? '#dc2626' : len > 400 ? '#d97706' : '';
        }
        if (mensagem.value.length > 500) mensagem.value = mensagem.value.slice(0, 500);
    });

    // ── Validação por campo ─────────────────────────
    function validateField(el, errId, rule, msg) {
        const errEl = document.getElementById(errId);
        if (!rule(el.value)) {
            el.classList.add('invalid');
            if (errEl) errEl.textContent = msg;
            return false;
        }
        el.classList.remove('invalid');
        if (errEl) errEl.textContent = '';
        return true;
    }

    function clearStatus() {
        status.className = 'form-status';
        status.textContent = '';
    }

    // Limpa erro ao digitar
    [nome, email, assunto, mensagem].forEach(el => {
        el?.addEventListener('input', () => {
            el.classList.remove('invalid');
            const id = 'err' + el.id.replace('ct', '');
            const errEl = document.getElementById(id);
            if (errEl) errEl.textContent = '';
            clearStatus();
        });
    });

    // ── Submit ──────────────────────────────────────
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearStatus();

        // Validação
        const isNome = validateField(nome, 'errNome', v => v.trim().length >= 2, 'Nome deve ter ao menos 2 caracteres.');
        const isEmail = validateField(email, 'errEmail', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'E-mail inválido.');
        const isAssunto = validateField(assunto, 'errAssunto', v => v !== '', 'Selecione um assunto.');
        const isMensagem = validateField(mensagem, 'errMensagem', v => v.trim().length >= 10, 'Mensagem deve ter ao menos 10 caracteres.');

        if (!isNome || !isEmail || !isAssunto || !isMensagem) return;

        // Estado de envio
        submitBtn.disabled = true;
        submitBtn.classList.add('sending');
        submitLbl.textContent = 'Enviando…';

        try {
            const data = new FormData();
            data.append('name', nome.value.trim());
            data.append('email', email.value.trim());
            data.append('assunto', assunto.value);
            data.append('message', mensagem.value.trim());

            const res = await fetch('https://formsubmit.co/ajax/jvitinhosa@email.com', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: data,
            });

            if (res.ok) {
                status.className = 'form-status success';
                status.textContent = '✅ Mensagem enviada com sucesso! Responderemos em breve.';
                form.reset();
                if (charCount) charCount.textContent = '0';
            } else {
                throw new Error('Resposta não ok');
            }
        } catch {
            status.className = 'form-status error';
            status.textContent = '❌ Falha ao enviar. Tente novamente ou use nosso e-mail direto.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('sending');
            submitLbl.textContent = 'Enviar mensagem';
        }
    });

});