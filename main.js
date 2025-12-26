const modules = {
    tool: { title: '工具', url: 'tool/index.html' },
    docs: { title: '文档', url: 'docs/index.html' }
};

// 回车登录
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('passwordInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            startLoading();
        }
    });
});

// 点击登录按钮
function startLoading() {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn.classList.contains('loading')) return;
    
    loginBtn.classList.add('loading');
    setTimeout(() => {
        enterApp();
    }, 500);
}

function enterApp() {
    const welcome = document.getElementById('welcomePage');
    const main = document.getElementById('mainApp');
    
    welcome.classList.add('hidden');
    main.classList.add('visible');
    
    setTimeout(() => {
        welcome.style.display = 'none';
        new coreui.Sidebar(document.getElementById('sidebar'));
    }, 500);
}

function loadModule(name, event) {
    if (event) event.preventDefault();
    const m = modules[name];
    if (!m) return;
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.module === name);
    });
    document.getElementById('headerTitle').textContent = m.title;
    document.getElementById('contentFrame').src = m.url;
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const instance = coreui.Sidebar.getInstance(sidebar) || new coreui.Sidebar(sidebar);
    instance.toggle();
}
