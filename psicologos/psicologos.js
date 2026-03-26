// ── Tema ───────────────────────────────────────────────
(function () {
    const saved = localStorage.getItem('siteTheme') || 'dark';
    document.body.classList.add(saved === 'light' ? 'light-mode' : 'dark-mode');
    const moon = document.getElementById('theme-icon-moon');
    const sun = document.getElementById('theme-icon-sun');
    if (moon) moon.style.display = saved === 'light' ? 'none' : 'block';
    if (sun) sun.style.display = saved === 'light' ? 'block' : 'none';
})();

document.getElementById('theme-toggle-btn').addEventListener('click', function () {
    const isDark = document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', !isDark);
    document.body.classList.toggle('light-mode', isDark);
    localStorage.setItem('siteTheme', isDark ? 'light' : 'dark');
    document.getElementById('theme-icon-moon').style.display = isDark ? 'block' : 'none';
    document.getElementById('theme-icon-sun').style.display = isDark ? 'none' : 'block';
});

// ── Hamburguer ─────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', function () {
    document.getElementById('navMenu').classList.toggle('active');
});

// ── Contagem de resultados ─────────────────────────────
function atualizarContagem() {
    const visiveis = document.querySelectorAll('.psico-card:not(.hidden)').length;
    const countEl = document.getElementById('resultsCount');
    const emptyEl = document.getElementById('emptyState');
    if (countEl) countEl.innerHTML = `Exibindo <strong>${visiveis}</strong> profissional${visiveis !== 1 ? 'is' : ''}`;
    if (emptyEl) emptyEl.style.display = visiveis === 0 ? 'block' : 'none';
}

// ── Filtros ────────────────────────────────────────────
let filtroAtual = 'todos';

function filterPsico(tag, btn) {
    filtroAtual = tag;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const busca = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

    document.querySelectorAll('.psico-card').forEach(card => {
        const tags = card.dataset.tags || '';
        const name = card.dataset.name || '';
        const passaFiltro = tag === 'todos' || tags.includes(tag);
        const passaBusca = busca === '' || name.includes(busca) || tags.includes(busca);
        card.classList.toggle('hidden', !(passaFiltro && passaBusca));
    });

    atualizarContagem();
}

// ── Busca ──────────────────────────────────────────────
function buscarPsico(valor) {
    const busca = valor.toLowerCase().trim();
    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) clearBtn.style.display = busca ? 'block' : 'none';

    document.querySelectorAll('.psico-card').forEach(card => {
        const tags = card.dataset.tags || '';
        const name = card.dataset.name || '';
        const passaFiltro = filtroAtual === 'todos' || tags.includes(filtroAtual);
        const passaBusca = busca === '' || name.includes(busca) || tags.includes(busca);
        card.classList.toggle('hidden', !(passaFiltro && passaBusca));
    });

    atualizarContagem();
}

function limparBusca() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    document.getElementById('searchClear').style.display = 'none';
    buscarPsico('');
}

function limparTudo() {
    limparBusca();
    filtroAtual = 'todos';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn')?.classList.add('active');
    document.querySelectorAll('.psico-card').forEach(card => card.classList.remove('hidden'));
    atualizarContagem();
}

// ── Agendamento ────────────────────────────────────────
let psicoAtual = '';

function abrirAgendamento(nome) {
    psicoAtual = nome;
    document.getElementById('agendTitulo').textContent = '📅 Agendar com ' + nome;
    document.getElementById('agendForm').style.display = 'flex';
    document.getElementById('agendSuccess').style.display = 'none';
    document.getElementById('agendamentoModal').style.display = 'flex';
    // fechar perfil se estiver aberto
    document.getElementById('perfilModal').style.display = 'none';
}
function fecharAgendamento() {
    document.getElementById('agendamentoModal').style.display = 'none';
}
function confirmarAgendamento() {
    document.getElementById('agendForm').style.display = 'none';
    document.getElementById('agendSuccess').style.display = 'block';
}

// ── Perfil Completo ────────────────────────────────────
const perfisDados = {
    ana: {
        iniciais: 'AM',
        gradiente: 'linear-gradient(135deg, #5b6ef5, #8b5cf6)',
        nome: 'Dra. Ana Martins',
        crp: 'CRP 06/123456',
        rating: '★★★★★ 4.9',
        avaliacoes: '124 avaliações',
        bio: 'Psicóloga especializada em neuropsicologia e TDAH, com foco em adolescentes e adultos jovens. Acredita que compreender o funcionamento do cérebro é o primeiro passo para transformar a relação da pessoa com seus próprios desafios. Utiliza a TCC integrada a técnicas de mindfulness para desenvolver habilidades de atenção, planejamento e regulação emocional.',
        formacao: [
            { icon: 'fa-graduation-cap', texto: 'Graduação em Psicologia — USP (2015)' },
            { icon: 'fa-award', texto: 'Especialização em Neuropsicologia — USP (2017)' },
            { icon: 'fa-certificate', texto: 'Certificação em TCC — FMUSP (2019)' },
            { icon: 'fa-book', texto: 'Curso avançado em TDAH — ABDA (2021)' },
        ],
        depoimentos: [
            { texto: '"A Dra. Ana mudou minha vida. Com 17 anos, eu não conseguia estudar por mais de 10 minutos. Hoje passo horas focado e entrei na faculdade que queria."', autor: '— Gabriel T., 18 anos' },
            { texto: '"Profissional incrível. Me ajudou a entender o meu TDAH sem me rotular. O processo foi leve e transformador."', autor: '— Fernanda L., 22 anos' },
        ]
    },
    rafael: {
        iniciais: 'RS',
        gradiente: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
        nome: 'Dr. Rafael Silva',
        crp: 'CRP 06/234567',
        rating: '★★★★★ 4.8',
        avaliacoes: '89 avaliações',
        bio: 'Psicólogo clínico e pesquisador com Mestrado em Neurociências pela UNICAMP. Especialista em avaliação cognitiva e diagnóstico de TDAH em crianças, com ampla experiência na elaboração de laudos para uso escolar e médico. Acredita em uma abordagem humanista que inclui a família no processo terapêutico.',
        formacao: [
            { icon: 'fa-graduation-cap', texto: 'Graduação em Psicologia — UNICAMP (2011)' },
            { icon: 'fa-award', texto: 'Mestrado em Neurociências — UNICAMP (2014)' },
            { icon: 'fa-certificate', texto: 'Especialização em Psicologia Infantil — CRP-SP (2016)' },
            { icon: 'fa-book', texto: 'Formação em Avaliação Neuropsicológica — IBNEURO (2018)' },
        ],
        depoimentos: [
            { texto: '"O Dr. Rafael elaborou o laudo do meu filho de forma muito cuidadosa. A escola finalmente entendeu as necessidades dele."', autor: '— Silvia R., mãe do Pedro, 8 anos' },
            { texto: '"Muito competente e humano. Explicou cada resultado da avaliação com clareza e sem jargão difícil."', autor: '— Carlos M., pai da Júlia, 10 anos' },
        ]
    },
    larissa: {
        iniciais: 'LO',
        gradiente: 'linear-gradient(135deg, #f59e0b, #ef4444)',
        nome: 'Dra. Larissa Oliveira',
        crp: 'CRP 06/345678',
        rating: '★★★★★ 5.0',
        avaliacoes: '62 avaliações',
        bio: 'Psicóloga especializada em TCC com foco em crianças e adolescentes com TDAH. Reconhecida pelos pacientes pela abordagem calorosa e prática, Larissa combina técnicas cognitivo-comportamentais com estratégias lúdicas para tornar o processo terapêutico acessível e divertido. Oferece suporte ativo para as famílias ao longo de todo o tratamento.',
        formacao: [
            { icon: 'fa-graduation-cap', texto: 'Graduação em Psicologia — PUC-SP (2017)' },
            { icon: 'fa-award', texto: 'Especialização em TCC — CETCC-SP (2019)' },
            { icon: 'fa-certificate', texto: 'Formação em TCC Infantojuvenil — IBTeC (2021)' },
            { icon: 'fa-book', texto: 'Curso de Regulação Emocional em TDAH — ABDA (2022)' },
        ],
        depoimentos: [
            { texto: '"A Dra. Larissa tem uma energia incrível com crianças. Minha filha mal queria ir ao psicólogo — hoje ela pede para ir."', autor: '— Ana Paula C., mãe da Sofia, 7 anos' },
            { texto: '"Acompanho meu filho há 1 ano com a Larissa. A evolução foi enorme em foco, controle emocional e autoestima."', autor: '— Marcos D., pai do Felipe, 11 anos' },
        ]
    },
    marcos: {
        iniciais: 'MC',
        gradiente: 'linear-gradient(135deg, #10b981, #3b82f6)',
        nome: 'Dr. Marcos Costa',
        crp: 'CRP 06/456789',
        rating: '★★★★☆ 4.7',
        avaliacoes: '201 avaliações',
        bio: 'Psicólogo clínico com foco em TDAH em adolescentes e adultos, ansiedade e dificuldades de produtividade. Utiliza a Terapia de Aceitação e Compromisso (ACT) combinada a estratégias práticas de gestão do tempo e organização. Especialista em ajudar profissionais e estudantes universitários a funcionarem melhor sem se punirem pelos próprios déficits.',
        formacao: [
            { icon: 'fa-graduation-cap', texto: 'Graduação em Psicologia — UNIFESP (2013)' },
            { icon: 'fa-award', texto: 'Especialização em Psicologia Clínica — UNIFESP (2015)' },
            { icon: 'fa-certificate', texto: 'Formação em ACT — IBACT (2017)' },
            { icon: 'fa-book', texto: 'Aperfeiçoamento em TDAH em Adultos — CFP (2020)' },
        ],
        depoimentos: [
            { texto: '"Finalmente um psicólogo que entende o TDAH do adulto de verdade. Sem julgamentos, cheio de ferramentas práticas."', autor: '— André S., 31 anos' },
            { texto: '"O Dr. Marcos me ajudou a parar de lutar contra meu próprio cérebro e começar a trabalhar a favor dele."', autor: '— Camila P., 25 anos' },
        ]
    },
    camila: {
        iniciais: 'CF',
        gradiente: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        nome: 'Dra. Camila Ferreira',
        crp: 'CRP 06/567890',
        rating: '★★★★★ 4.9',
        avaliacoes: '77 avaliações',
        bio: 'Psicóloga infantil com quase uma década de experiência no atendimento a crianças de 4 a 12 anos com TDAH, dificuldades de aprendizagem e desafios comportamentais. Utiliza a ludoterapia — o brincar como instrumento terapêutico — aliada à TCC infantil. Realiza sessões de orientação para pais e contato frequente com escolas para garantir uma abordagem integrada.',
        formacao: [
            { icon: 'fa-graduation-cap', texto: 'Graduação em Psicologia — UNESP (2014)' },
            { icon: 'fa-award', texto: 'Especialização em Psicologia Infantil — UNESP (2016)' },
            { icon: 'fa-certificate', texto: 'Formação em Ludoterapia — ILP (2018)' },
            { icon: 'fa-book', texto: 'Curso de Neurociências do Desenvolvimento — UNIFESP (2022)' },
        ],
        depoimentos: [
            { texto: '"Meu filho autista com TDAH evoluiu muito com a Dra. Camila. Ela tem um dom especial para se conectar com crianças."', autor: '— Renata B., mãe do Davi, 6 anos' },
            { texto: '"Profissional dedicada e muito competente. Mantém contato com a escola e isso fez toda a diferença."', autor: '— Juliana K., mãe da Marina, 9 anos' },
        ]
    },
    bruno: {
        iniciais: 'BR',
        gradiente: 'linear-gradient(135deg, #ef4444, #f97316)',
        nome: 'Dr. Bruno Rocha',
        crp: 'CRP 06/678901',
        rating: '★★★★★ 4.8',
        avaliacoes: '155 avaliações',
        bio: 'Neuropsicólogo com Doutorado pela USP e 15 anos de experiência clínica e acadêmica. Referência em avaliação neuropsicológica completa, reabilitação cognitiva e elaboração de laudos periciais para processos judiciais e vestibulares. Atua também com pesquisa clínica em parceria com o Hospital das Clínicas da USP. Atende adolescentes e adultos com foco em otimização do desempenho cognitivo.',
        formacao: [
            { icon: 'fa-graduation-cap', texto: 'Graduação em Psicologia — USP (2008)' },
            { icon: 'fa-award', texto: 'Mestrado em Neuropsicologia — USP (2011)' },
            { icon: 'fa-award', texto: 'Doutorado em Neuropsicologia — USP (2015)' },
            { icon: 'fa-certificate', texto: 'Formação em EMDR — EMDR Brasil (2019)' },
            { icon: 'fa-book', texto: 'Pesquisador colaborador — HC-FMUSP' },
        ],
        depoimentos: [
            { texto: '"O Dr. Bruno preparou um laudo detalhado que garantiu minha adaptação na faculdade. Muito profissional e preciso."', autor: '— Vinícius A., 19 anos' },
            { texto: '"Depois de anos sem diagnóstico, finalmente entendi meu funcionamento. A reabilitação cognitiva com ele foi transformadora."', autor: '— Beatriz N., 35 anos' },
        ]
    },
};

function abrirPerfil(id) {
    const d = perfisDados[id];
    if (!d) return;

    document.getElementById('perfilTitulo').textContent = '👤 ' + d.nome;

    const formacaoHTML = d.formacao.map(f =>
        `<li><i class="fas ${f.icon}"></i>${f.texto}</li>`
    ).join('');

    const depHTML = d.depoimentos.map(dep =>
        `<div class="perfil-dep">${dep.texto}<div class="perfil-dep-autor">${dep.autor}</div></div>`
    ).join('');

    document.getElementById('perfilBody').innerHTML = `
        <div class="perfil-hero">
            <div class="perfil-avatar-lg" style="background: ${d.gradiente}">${d.iniciais}</div>
            <div>
                <h2>${d.nome}</h2>
                <p class="perfil-crp">${d.crp}</p>
                <div class="psico-rating">
                    <span class="stars">${d.rating}</span>
                    <span><em>(${d.avaliacoes})</em></span>
                </div>
            </div>
        </div>
        <p class="perfil-bio">${d.bio}</p>
        <p class="perfil-section-title"><i class="fas fa-graduation-cap"></i> Formação Acadêmica</p>
        <ul class="perfil-formacao-list">${formacaoHTML}</ul>
        <p class="perfil-section-title"><i class="fas fa-quote-left"></i> O que pacientes dizem</p>
        <div class="perfil-depoimentos">${depHTML}</div>
        <button class="btn-agendar-perfil" onclick="abrirAgendamento('${d.nome}')">
            <i class="fas fa-calendar-plus"></i> Agendar com ${d.nome.split(' ').slice(0, 2).join(' ')}
        </button>
    `;

    document.getElementById('perfilModal').style.display = 'flex';
}
function fecharPerfil() {
    document.getElementById('perfilModal').style.display = 'none';
}

// ── FAQ ────────────────────────────────────────────────
function toggleFaq(btn) {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');

    // fechar todos
    document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-question').forEach(b => b.classList.remove('open'));

    if (!isOpen) {
        answer.classList.add('open');
        btn.classList.add('open');
    }
}

// ── Fechar modais clicando fora ────────────────────────
window.addEventListener('click', function (e) {
    if (e.target === document.getElementById('agendamentoModal')) fecharAgendamento();
    if (e.target === document.getElementById('perfilModal')) fecharPerfil();
});

// ── Placeholders de Nav ────────────────────────────────
function openModal(id) { }
function logoutUser() { }

// ── Init ───────────────────────────────────────────────
atualizarContagem();