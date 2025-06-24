// Formulário de Contato - Captura Simples
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contatoForm');
    const status = document.getElementById('mensagemStatus');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const mensagem = document.getElementById('mensagem').value.trim();

        if (nome === '' || email === '' || mensagem === '') {
            status.textContent = 'Por favor, preencha todos os campos.';
            status.style.color = 'red';
        } else {
            status.textContent = 'Mensagem enviada com sucesso! Obrigado!';
            status.style.color = 'green';

            // Aqui você pode futuramente enviar para um servidor
            form.reset();
        }
    });
});
