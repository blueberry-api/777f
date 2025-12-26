// PDF页面提取合并工具
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';

// 状态管理
const state = {
    pdfFiles: [], // { id, file, name, pageCount, arrayBuffer }
    nextId: 1,
    currentPreviewId: null,
    selectedPages: new Set()
};

// DOM元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const pdfList = document.getElementById('pdfList');
const configSection = document.getElementById('configSection');
const mergeBtn = document.getElementById('mergeBtn');
const clearBtn = document.getElementById('clearBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// 初始化事件
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
mergeBtn.addEventListener('click', mergePDFs);
clearBtn.addEventListener('click', clearAll);

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    fileInput.value = '';
}


async function processFiles(files) {
    for (const file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            state.pdfFiles.push({
                id: state.nextId++,
                file,
                name: file.name,
                pageCount,
                arrayBuffer
            });
        } catch (err) {
            alert(`无法读取文件 ${file.name}: ${err.message}`);
        }
    }
    renderPdfList();
    updateUI();
}

function renderPdfList() {
    pdfList.innerHTML = state.pdfFiles.map(pdf => `
        <div class="pdf-item" draggable="true" data-id="${pdf.id}">
            <span class="drag-handle">⋮⋮</span>
            <div class="pdf-info">
                <div class="pdf-name">${pdf.name}</div>
                <div class="pdf-meta">共 ${pdf.pageCount} 页 | ${formatSize(pdf.file.size)}</div>
            </div>
            <button class="btn-preview" data-id="${pdf.id}">预览</button>
            <input type="text" class="pdf-pages-input" data-id="${pdf.id}" 
                   placeholder="页面范围，如 1-5,8,10-12" title="留空提取全部页面">
            <button class="btn-remove" data-id="${pdf.id}" title="移除">×</button>
        </div>
    `).join('');
    
    // 绑定删除事件
    pdfList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => removePdf(parseInt(btn.dataset.id)));
    });
    
    // 绑定预览事件
    pdfList.querySelectorAll('.btn-preview').forEach(btn => {
        btn.addEventListener('click', () => openPreview(parseInt(btn.dataset.id)));
    });
    
    // 绑定拖拽排序
    initDragSort();
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function removePdf(id) {
    state.pdfFiles = state.pdfFiles.filter(p => p.id !== id);
    renderPdfList();
    updateUI();
}

function clearAll() {
    state.pdfFiles = [];
    renderPdfList();
    updateUI();
}

function updateUI() {
    configSection.style.display = state.pdfFiles.length > 0 ? 'block' : 'none';
    mergeBtn.disabled = state.pdfFiles.length === 0;
}


// 拖拽排序
function initDragSort() {
    const items = pdfList.querySelectorAll('.pdf-item');
    let draggedItem = null;
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
            draggedItem = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (item !== draggedItem) {
                item.classList.add('drag-over');
            }
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            if (item !== draggedItem && draggedItem) {
                const draggedId = parseInt(draggedItem.dataset.id);
                const targetId = parseInt(item.dataset.id);
                reorderPdfs(draggedId, targetId);
            }
        });
    });
}

function reorderPdfs(draggedId, targetId) {
    const draggedIndex = state.pdfFiles.findIndex(p => p.id === draggedId);
    const targetIndex = state.pdfFiles.findIndex(p => p.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = state.pdfFiles.splice(draggedIndex, 1);
        state.pdfFiles.splice(targetIndex, 0, removed);
        renderPdfList();
    }
}

// 解析页面范围
function parsePageRange(rangeStr, maxPage) {
    if (!rangeStr || !rangeStr.trim()) {
        return Array.from({ length: maxPage }, (_, i) => i);
    }
    
    const pages = new Set();
    const parts = rangeStr.split(',');
    
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
            if (isNaN(start) || isNaN(end)) continue;
            for (let i = Math.max(1, start); i <= Math.min(maxPage, end); i++) {
                pages.add(i - 1); // 转为0索引
            }
        } else {
            const page = parseInt(trimmed);
            if (!isNaN(page) && page >= 1 && page <= maxPage) {
                pages.add(page - 1);
            }
        }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
}


// 预览相关
const previewModal = document.getElementById('previewModal');
const previewGrid = document.getElementById('previewGrid');
const previewTitle = document.getElementById('previewTitle');
const selectionInfo = document.getElementById('selectionInfo');
const closeModal = document.getElementById('closeModal');
const selectAllBtn = document.getElementById('selectAllBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const applySelectionBtn = document.getElementById('applySelectionBtn');

closeModal.addEventListener('click', () => previewModal.classList.remove('show'));
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) previewModal.classList.remove('show');
});
selectAllBtn.addEventListener('click', selectAllPages);
clearSelectionBtn.addEventListener('click', clearSelection);
applySelectionBtn.addEventListener('click', applySelection);

async function openPreview(pdfId) {
    const pdf = state.pdfFiles.find(p => p.id === pdfId);
    if (!pdf) return;
    
    state.currentPreviewId = pdfId;
    state.selectedPages.clear();
    
    // 读取当前输入框的值，预选已选页面
    const input = document.querySelector(`.pdf-pages-input[data-id="${pdfId}"]`);
    if (input && input.value.trim()) {
        const pages = parsePageRange(input.value, pdf.pageCount);
        pages.forEach(p => state.selectedPages.add(p));
    }
    
    previewTitle.textContent = `预览: ${pdf.name}`;
    previewGrid.innerHTML = '<div style="text-align:center;padding:40px;color:#656d76;">加载中...</div>';
    previewModal.classList.add('show');
    
    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: pdf.arrayBuffer.slice(0) }).promise;
        previewGrid.innerHTML = '';
        
        for (let i = 1; i <= pdf.pageCount; i++) {
            const page = await pdfDoc.getPage(i);
            // 用高分辨率渲染，CSS缩小显示
            const scale = 1.5; // 高清渲染
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            // CSS控制显示尺寸，保持清晰度
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'preview-page' + (state.selectedPages.has(i - 1) ? ' selected' : '');
            pageDiv.dataset.page = i - 1;
            pageDiv.innerHTML = `<div class="preview-page-num">第 ${i} 页</div>`;
            pageDiv.insertBefore(canvas, pageDiv.firstChild);
            pageDiv.addEventListener('click', () => togglePageSelection(pageDiv, i - 1));
            previewGrid.appendChild(pageDiv);
        }
        updateSelectionInfo();
    } catch (err) {
        previewGrid.innerHTML = `<div style="color:#cf222e;padding:20px;">加载失败: ${err.message}</div>`;
    }
}

function togglePageSelection(pageDiv, pageIndex) {
    if (state.selectedPages.has(pageIndex)) {
        state.selectedPages.delete(pageIndex);
        pageDiv.classList.remove('selected');
    } else {
        state.selectedPages.add(pageIndex);
        pageDiv.classList.add('selected');
    }
    updateSelectionInfo();
}

function selectAllPages() {
    const pdf = state.pdfFiles.find(p => p.id === state.currentPreviewId);
    if (!pdf) return;
    for (let i = 0; i < pdf.pageCount; i++) state.selectedPages.add(i);
    previewGrid.querySelectorAll('.preview-page').forEach(p => p.classList.add('selected'));
    updateSelectionInfo();
}

function clearSelection() {
    state.selectedPages.clear();
    previewGrid.querySelectorAll('.preview-page').forEach(p => p.classList.remove('selected'));
    updateSelectionInfo();
}

function updateSelectionInfo() {
    const count = state.selectedPages.size;
    selectionInfo.textContent = count > 0 ? `已选择 ${count} 页` : '点击页面选择/取消';
}

function applySelection() {
    const input = document.querySelector(`.pdf-pages-input[data-id="${state.currentPreviewId}"]`);
    if (!input) return;
    
    const pdf = state.pdfFiles.find(p => p.id === state.currentPreviewId);
    if (!pdf) return;
    
    // 如果全选，清空输入框
    if (state.selectedPages.size === pdf.pageCount) {
        input.value = '';
    } else if (state.selectedPages.size === 0) {
        input.value = '';
    } else {
        // 生成页面范围字符串
        const sorted = Array.from(state.selectedPages).sort((a, b) => a - b);
        input.value = formatPageRange(sorted);
    }
    previewModal.classList.remove('show');
}

function formatPageRange(pages) {
    if (pages.length === 0) return '';
    const result = [];
    let start = pages[0], end = pages[0];
    
    for (let i = 1; i <= pages.length; i++) {
        if (i < pages.length && pages[i] === end + 1) {
            end = pages[i];
        } else {
            result.push(start === end ? String(start + 1) : `${start + 1}-${end + 1}`);
            if (i < pages.length) start = end = pages[i];
        }
    }
    return result.join(',');
}

// 合并PDF
async function mergePDFs() {
    if (state.pdfFiles.length === 0) return;
    
    mergeBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '准备中...';
    
    try {
        const mergedPdf = await PDFDocument.create();
        const totalFiles = state.pdfFiles.length;
        let processedPages = 0;
        
        // 计算总页数
        let totalPages = 0;
        const pageConfigs = [];
        
        for (const pdf of state.pdfFiles) {
            const input = document.querySelector(`.pdf-pages-input[data-id="${pdf.id}"]`);
            const rangeStr = input ? input.value : '';
            const pages = parsePageRange(rangeStr, pdf.pageCount);
            pageConfigs.push({ pdf, pages });
            totalPages += pages.length;
        }
        
        // 逐个处理
        for (let i = 0; i < pageConfigs.length; i++) {
            const { pdf, pages } = pageConfigs[i];
            progressText.textContent = `处理: ${pdf.name} (${i + 1}/${totalFiles})`;
            
            const srcDoc = await PDFDocument.load(pdf.arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(srcDoc, pages);
            
            for (const page of copiedPages) {
                mergedPdf.addPage(page);
                processedPages++;
                progressFill.style.width = `${(processedPages / totalPages) * 100}%`;
            }
        }
        
        progressText.textContent = '生成PDF文件...';
        const pdfBytes = await mergedPdf.save();
        
        // 下载
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merged_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        
        progressText.textContent = `完成！共合并 ${processedPages} 页`;
        progressFill.style.width = '100%';
        
    } catch (err) {
        progressText.textContent = `错误: ${err.message}`;
        console.error(err);
    } finally {
        mergeBtn.disabled = false;
    }
}
