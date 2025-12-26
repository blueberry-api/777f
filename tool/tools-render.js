// 工具页面渲染逻辑

let currentCategory = 'all';
let searchKeyword = '';

// 渲染工具列表
function renderTools() {
    const container = document.getElementById('toolSections');
    let html = '';
    
    // 按分类筛选
    let filteredTools = currentCategory === 'all' 
        ? tools 
        : tools.filter(t => t.category === currentCategory);
    
    // 搜索筛选
    if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filteredTools = filteredTools.map(section => ({
            ...section,
            items: section.items.filter(item => 
                item.name.toLowerCase().includes(keyword) || 
                item.desc.toLowerCase().includes(keyword)
            )
        })).filter(section => section.items.length > 0);
    }
    
    if (filteredTools.length === 0 || filteredTools.every(s => s.items.length === 0)) {
        html = '<div class="no-result">没有找到匹配的工具</div>';
    } else {
        filteredTools.forEach(section => {
            if (section.items.length === 0) return;
            
            html += `<div class="tool-section">
                <div class="tool-list">
                    <div class="tool-section-header">
                        <span>${section.categoryName}</span>
                        <span class="count">${section.items.length} 个工具</span>
                    </div>
                    ${section.items.map(item => `
                        <a href="${item.url}" target="_blank" class="tool-item">
                            <span class="tool-name">${highlightKeyword(item.name)}</span>
                            <span class="tool-desc">${highlightKeyword(item.desc)}</span>
                        </a>
                    `).join('')}
                </div>
            </div>`;
        });
    }
    
    container.innerHTML = html;
}

// 高亮搜索关键词
function highlightKeyword(text) {
    if (!searchKeyword) return text;
    const regex = new RegExp(`(${searchKeyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// 标签切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        renderTools();
    });
});

// 搜索功能
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value.trim();
    renderTools();
});

// 初始化
renderTools();
