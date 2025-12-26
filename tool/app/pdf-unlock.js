// PDF解锁工具
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileMeta = document.getElementById('fileMeta');
const statusList = document.getElementById('statusList');
const unlockBtn = document.getElementById('unlockBtn');
const result = document.getElementById('result');

let currentFile = null;
let currentArrayBuffer = null;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadPdf(e.target.files[0]); });
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', e => { e.preventDefault(); uploadArea.classList.remove('dragover'); });
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
    if (file) loadPdf(file);
});
unlockBtn.addEventListener('click', unlockPdf);


async function loadPdf(file) {
    currentFile = file;
    result.style.display = 'none';
    
    try {
        currentArrayBuffer = await file.arrayBuffer();
        
        // 使用 pdf.js 检测权限
        const pdfDoc = await pdfjsLib.getDocument({ data: currentArrayBuffer.slice(0) }).promise;
        const permissions = await pdfDoc.getPermissions();
        const pageCount = pdfDoc.numPages;
        
        fileName.textContent = file.name;
        fileMeta.textContent = `${pageCount} 页 | ${formatSize(file.size)}`;
        
        // 显示权限状态
        const permissionLabels = {
            print: '打印',
            copy: '复制文本',
            modify: '修改内容',
            annotate: '添加注释',
            fillForms: '填写表单',
            extractContent: '提取内容',
            assemble: '组装文档'
        };
        
        let hasRestrictions = false;
        let statusHtml = '';
        
        if (permissions === null) {
            // null 表示没有任何限制
            statusHtml = '<div class="status-item"><span class="status-icon unlocked">✓</span>此PDF没有权限限制</div>';
        } else {
            // 检查各项权限
            const checks = [
                { key: 'print', label: '打印' },
                { key: 'copy', label: '复制文本' },
                { key: 'modifyContents', label: '修改内容' },
                { key: 'modifyAnnotations', label: '添加注释' }
            ];
            
            for (const check of checks) {
                const allowed = permissions.includes(check.key);
                if (!allowed) hasRestrictions = true;
                statusHtml += `<div class="status-item">
                    <span class="status-icon ${allowed ? 'unlocked' : 'locked'}">${allowed ? '✓' : '✗'}</span>
                    ${check.label}: ${allowed ? '允许' : '禁止'}
                </div>`;
            }
        }
        
        statusList.innerHTML = statusHtml;
        fileInfo.style.display = 'block';
        unlockBtn.disabled = !hasRestrictions && permissions !== null;
        
        if (!hasRestrictions && permissions === null) {
            unlockBtn.textContent = '无需解锁';
        } else if (!hasRestrictions) {
            unlockBtn.textContent = '无需解锁';
        } else {
            unlockBtn.textContent = '解锁PDF';
        }
        
    } catch (err) {
        if (err.name === 'PasswordException') {
            fileInfo.style.display = 'block';
            fileName.textContent = file.name;
            fileMeta.textContent = formatSize(file.size);
            statusList.innerHTML = '<div class="status-item"><span class="status-icon locked">✗</span>此PDF需要密码才能打开，无法解锁</div>';
            unlockBtn.disabled = true;
            unlockBtn.textContent = '无法解锁';
        } else {
            alert('无法读取PDF: ' + err.message);
        }
    }
}


async function unlockPdf() {
    if (!currentArrayBuffer) return;
    
    unlockBtn.disabled = true;
    unlockBtn.textContent = '处理中...';
    result.style.display = 'none';
    
    try {
        // 用 pdf.js 读取每一页，重新渲染到新 PDF
        const srcDoc = await pdfjsLib.getDocument({ data: currentArrayBuffer.slice(0) }).promise;
        const newPdf = await PDFDocument.create();
        
        for (let i = 1; i <= srcDoc.numPages; i++) {
            const page = await srcDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2 }); // 高清渲染
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            // 转为图片嵌入新PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
            const img = await newPdf.embedJpg(imgBytes);
            
            // 使用原始页面尺寸
            const origViewport = page.getViewport({ scale: 1 });
            const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
            newPage.drawImage(img, {
                x: 0, y: 0,
                width: origViewport.width,
                height: origViewport.height
            });
        }
        
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name.replace('.pdf', '_unlocked.pdf');
        a.click();
        URL.revokeObjectURL(url);
        
        result.className = 'result success';
        result.textContent = '✓ 解锁成功！已下载无限制的PDF文件';
        result.style.display = 'block';
        
    } catch (err) {
        result.className = 'result error';
        result.textContent = '解锁失败: ' + err.message;
        result.style.display = 'block';
    } finally {
        unlockBtn.disabled = false;
        unlockBtn.textContent = '解锁PDF';
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
