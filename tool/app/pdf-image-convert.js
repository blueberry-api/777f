// PDF与图片互转工具
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';

// 状态
const state = {
    pdfFile: null,
    pdfArrayBuffer: null,
    pdfPageCount: 0,
    images: [], // { id, file, name, dataUrl }
    nextImgId: 1,
    convertedImages: [] // { fileName, dataUrl } 用于打包下载
};

// Tab切换
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ========== PDF转图片 ==========
const pdfUploadArea = document.getElementById('pdfUploadArea');
const pdfInput = document.getElementById('pdfInput');
const pdfInfo = document.getElementById('pdfInfo');
const pdfOptions = document.getElementById('pdfOptions');
const convertPdfBtn = document.getElementById('convertPdfBtn');
const pdfProgress = document.getElementById('pdfProgress');
const pdfProgressFill = document.getElementById('pdfProgressFill');
const pdfProgressText = document.getElementById('pdfProgressText');
const pdfPreviewGrid = document.getElementById('pdfPreviewGrid');

const downloadAllBtn = document.getElementById('downloadAllBtn');

pdfUploadArea.addEventListener('click', () => pdfInput.click());
pdfInput.addEventListener('change', handlePdfSelect);
pdfUploadArea.addEventListener('dragover', e => { e.preventDefault(); pdfUploadArea.classList.add('dragover'); });
pdfUploadArea.addEventListener('dragleave', e => { e.preventDefault(); pdfUploadArea.classList.remove('dragover'); });
pdfUploadArea.addEventListener('drop', handlePdfDrop);
convertPdfBtn.addEventListener('click', convertPdfToImages);
downloadAllBtn.addEventListener('click', downloadAllAsZip);

function handlePdfDrop(e) {
    e.preventDefault();
    pdfUploadArea.classList.remove('dragover');
    const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
    if (file) loadPdf(file);
}

function handlePdfSelect(e) {
    if (e.target.files[0]) loadPdf(e.target.files[0]);
}


async function loadPdf(file) {
    try {
        state.pdfFile = file;
        state.pdfArrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) }).promise;
        state.pdfPageCount = pdfDoc.numPages;
        
        pdfInfo.style.display = 'block';
        pdfInfo.textContent = `已加载: ${file.name} (${state.pdfPageCount} 页, ${formatSize(file.size)})`;
        pdfOptions.style.display = 'block';
        pdfPreviewGrid.innerHTML = '';
    } catch (err) {
        alert('无法读取PDF: ' + err.message);
    }
}

async function convertPdfToImages() {
    if (!state.pdfArrayBuffer) return;
    
    const format = document.getElementById('imgFormat').value;
    const quality = parseFloat(document.getElementById('imgQuality').value);
    const scale = parseFloat(document.getElementById('imgScale').value);
    
    convertPdfBtn.disabled = true;
    downloadAllBtn.style.display = 'none';
    pdfProgress.style.display = 'block';
    pdfPreviewGrid.innerHTML = '';
    state.convertedImages = [];
    
    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) }).promise;
        
        for (let i = 1; i <= state.pdfPageCount; i++) {
            pdfProgressText.textContent = `转换第 ${i}/${state.pdfPageCount} 页...`;
            pdfProgressFill.style.width = `${(i / state.pdfPageCount) * 100}%`;
            
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            const dataUrl = canvas.toDataURL(`image/${format}`, quality);
            const fileName = `${state.pdfFile.name.replace('.pdf', '')}_page${i}.${format === 'jpeg' ? 'jpg' : 'png'}`;
            
            // 保存用于打包下载
            state.convertedImages.push({ fileName, dataUrl });
            
            // 添加预览
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.innerHTML = `
                <img src="${dataUrl}" alt="Page ${i}">
                <div class="preview-item-info">
                    <span>第 ${i} 页</span>
                    <a href="${dataUrl}" download="${fileName}">下载</a>
                </div>
            `;
            pdfPreviewGrid.appendChild(item);
        }
        
        pdfProgressText.textContent = `完成！共转换 ${state.pdfPageCount} 页`;
        downloadAllBtn.style.display = 'inline-block';
    } catch (err) {
        pdfProgressText.textContent = '转换失败: ' + err.message;
    } finally {
        convertPdfBtn.disabled = false;
    }
}

async function downloadAllAsZip() {
    if (state.convertedImages.length === 0) return;
    
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = '打包中...';
    
    try {
        const zip = new JSZip();
        
        for (const img of state.convertedImages) {
            // 从 dataUrl 提取 base64 数据
            const base64Data = img.dataUrl.split(',')[1];
            zip.file(img.fileName, base64Data, { base64: true });
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.pdfFile.name.replace('.pdf', '')}_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert('打包失败: ' + err.message);
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = '打包下载全部';
    }
}


// ========== 图片转PDF ==========
const imgUploadArea = document.getElementById('imgUploadArea');
const imgInput = document.getElementById('imgInput');
const imageList = document.getElementById('imageList');
const imgOptions = document.getElementById('imgOptions');
const convertImgBtn = document.getElementById('convertImgBtn');
const clearImgBtn = document.getElementById('clearImgBtn');
const imgProgress = document.getElementById('imgProgress');
const imgProgressFill = document.getElementById('imgProgressFill');
const imgProgressText = document.getElementById('imgProgressText');

imgUploadArea.addEventListener('click', () => imgInput.click());
imgInput.addEventListener('change', handleImgSelect);
imgUploadArea.addEventListener('dragover', e => { e.preventDefault(); imgUploadArea.classList.add('dragover'); });
imgUploadArea.addEventListener('dragleave', e => { e.preventDefault(); imgUploadArea.classList.remove('dragover'); });
imgUploadArea.addEventListener('drop', handleImgDrop);
convertImgBtn.addEventListener('click', convertImagesToPdf);
clearImgBtn.addEventListener('click', clearImages);

function handleImgDrop(e) {
    e.preventDefault();
    imgUploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processImages(files);
}

function handleImgSelect(e) {
    processImages(Array.from(e.target.files));
    imgInput.value = '';
}

async function processImages(files) {
    for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        state.images.push({
            id: state.nextImgId++,
            file,
            name: file.name,
            dataUrl
        });
    }
    renderImageList();
    imgOptions.style.display = state.images.length > 0 ? 'block' : 'none';
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderImageList() {
    imageList.innerHTML = state.images.map(img => `
        <div class="image-item" draggable="true" data-id="${img.id}">
            <span class="drag-handle">⋮⋮</span>
            <img src="${img.dataUrl}" alt="${img.name}">
            <div class="image-item-info">
                <div class="image-item-name">${img.name}</div>
                <div class="image-item-size">${formatSize(img.file.size)}</div>
            </div>
            <button class="btn-remove" data-id="${img.id}">×</button>
        </div>
    `).join('');
    
    imageList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            state.images = state.images.filter(i => i.id !== parseInt(btn.dataset.id));
            renderImageList();
            imgOptions.style.display = state.images.length > 0 ? 'block' : 'none';
        });
    });
    
    initImageDragSort();
}

function clearImages() {
    state.images = [];
    renderImageList();
    imgOptions.style.display = 'none';
}


function initImageDragSort() {
    const items = imageList.querySelectorAll('.image-item');
    let draggedItem = null;
    
    items.forEach(item => {
        item.addEventListener('dragstart', () => { draggedItem = item; item.style.opacity = '0.5'; });
        item.addEventListener('dragend', () => { item.style.opacity = '1'; draggedItem = null; });
        item.addEventListener('dragover', e => { e.preventDefault(); if (item !== draggedItem) item.style.borderColor = '#0969da'; });
        item.addEventListener('dragleave', () => { item.style.borderColor = '#d0d7de'; });
        item.addEventListener('drop', e => {
            e.preventDefault();
            item.style.borderColor = '#d0d7de';
            if (item !== draggedItem && draggedItem) {
                const draggedId = parseInt(draggedItem.dataset.id);
                const targetId = parseInt(item.dataset.id);
                const draggedIdx = state.images.findIndex(i => i.id === draggedId);
                const targetIdx = state.images.findIndex(i => i.id === targetId);
                if (draggedIdx !== -1 && targetIdx !== -1) {
                    const [removed] = state.images.splice(draggedIdx, 1);
                    state.images.splice(targetIdx, 0, removed);
                    renderImageList();
                }
            }
        });
    });
}

async function convertImagesToPdf() {
    if (state.images.length === 0) return;
    
    const pageSize = document.getElementById('pageSize').value;
    const imgPosition = document.getElementById('imgPosition').value;
    
    convertImgBtn.disabled = true;
    imgProgress.style.display = 'block';
    
    try {
        const pdfDoc = await PDFDocument.create();
        
        for (let i = 0; i < state.images.length; i++) {
            imgProgressText.textContent = `处理第 ${i + 1}/${state.images.length} 张图片...`;
            imgProgressFill.style.width = `${((i + 1) / state.images.length) * 100}%`;
            
            const img = state.images[i];
            const imgBytes = await fetch(img.dataUrl).then(r => r.arrayBuffer());
            
            let embeddedImg;
            if (img.file.type === 'image/png') {
                embeddedImg = await pdfDoc.embedPng(imgBytes);
            } else {
                embeddedImg = await pdfDoc.embedJpg(imgBytes);
            }
            
            const imgWidth = embeddedImg.width;
            const imgHeight = embeddedImg.height;
            
            let pageWidth, pageHeight;
            if (pageSize === 'fit') {
                pageWidth = imgWidth;
                pageHeight = imgHeight;
            } else if (pageSize === 'a4') {
                pageWidth = 595.28;
                pageHeight = 841.89;
            } else {
                pageWidth = 612;
                pageHeight = 792;
            }
            
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            
            let drawWidth, drawHeight, drawX, drawY;
            if (pageSize === 'fit' || imgPosition === 'fill') {
                drawWidth = pageWidth;
                drawHeight = pageHeight;
                drawX = 0;
                drawY = 0;
            } else {
                const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight) * 0.9;
                drawWidth = imgWidth * scale;
                drawHeight = imgHeight * scale;
                drawX = (pageWidth - drawWidth) / 2;
                drawY = (pageHeight - drawHeight) / 2;
            }
            
            page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
        }
        
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `images_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        
        imgProgressText.textContent = `完成！已生成包含 ${state.images.length} 页的PDF`;
    } catch (err) {
        imgProgressText.textContent = '生成失败: ' + err.message;
        console.error(err);
    } finally {
        convertImgBtn.disabled = false;
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
