// 美华模拟机视频检查表

const TEMPLATE_PATH = '../../template/meihua/video.docx';
let templateData = null;

// 页面加载时自动加载模板
async function loadTemplate() {
    try {
        const resp = await fetch(TEMPLATE_PATH);
        if (!resp.ok) throw new Error('模板文件不存在: ' + resp.status);
        const blob = await resp.blob();
        templateData = await blob.arrayBuffer();
        console.log('模板加载成功，大小:', templateData.byteLength);
    } catch (e) {
        console.error('加载模板失败:', e);
        document.getElementById('manualUpload').style.display = 'inline';
    }
}
loadTemplate();

// 手动上传模板
document.getElementById('templateFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        templateData = await file.arrayBuffer();
        document.getElementById('manualUpload').style.display = 'none';
    }
});

// 获取表单数据
function getFormData() {
    const checkMethod = document.querySelector('input[name="checkMethod"]:checked').value;
    const checkType = document.querySelector('input[name="checkType"]:checked').value;
    
    const methodFile = checkMethod === 'file' ? '☑' : '□';
    const methodField = checkMethod === 'field' ? '☑' : '□';
    const methodVideo = checkMethod === 'video' ? '☑' : '□';
    
    const typeSingle = checkType === 'single' ? '☑' : '□';
    const typeJoint = checkType === 'joint' ? '☑' : '□';
    const typeCross = checkType === 'cross' ? '☑' : '□';
    
    const checkDate = document.getElementById('checkDate').value;
    
    return {
        checkDate: formatDate(checkDate),
        instructor: document.getElementById('instructor').value,
        student1: document.getElementById('student1').value,
        student2: document.getElementById('student2').value,
        methodFile,
        methodField,
        methodVideo,
        typeSingle,
        typeJoint,
        typeCross,
        item_2_1: document.getElementById('item_2_1').value,
        item_2_3: document.getElementById('item_2_3').value,
        item_2_11: document.getElementById('item_2_11').value,
        item_11_4: document.getElementById('item_11_4').value,
        item_13_9: document.getElementById('item_13_9').value,
        item_14_1: document.getElementById('item_14_1').value,
        item_14_4: document.getElementById('item_14_4').value,
        item_14_5: document.getElementById('item_14_5').value,
        item_14_8: document.getElementById('item_14_8').value,
        item_21_1: document.getElementById('item_21_1').value,
        item_21_2: document.getElementById('item_21_2').value,
        item_21_3: document.getElementById('item_21_3').value,
        item_21_4: document.getElementById('item_21_4').value,
        item_21_5: document.getElementById('item_21_5').value,
        item_21_6: document.getElementById('item_21_6').value,
        item_51_1: document.getElementById('item_51_1').value,
        item_51_2: document.getElementById('item_51_2').value,
        item_51_3: document.getElementById('item_51_3').value,
        judgment: document.getElementById('judgment').value,
        inspector: document.getElementById('inspector').value
    };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 清空表单
document.getElementById('clearBtn').addEventListener('click', function() {
    if (confirm('确定要清空所有填写内容吗？')) {
        document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
            el.value = '';
        });
        document.querySelectorAll('.item-result').forEach(el => { el.value = '无'; });
        document.querySelector('input[name="checkMethod"][value="video"]').checked = true;
        document.querySelector('input[name="checkType"][value="single"]').checked = true;
    }
});

// 导出Word
document.getElementById('exportBtn').addEventListener('click', async function() {
    if (!templateData) {
        alert('请先导入模板文件');
        return;
    }
    
    const data = getFormData();
    
    try {
        const zip = new PizZip(templateData);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
        });
        
        doc.render(data);
        
        const blob = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `美华模拟机视频检查表_${data.inspector || '未填写'}_${data.checkDate || '未填写'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert('导出失败：' + error.message);
    }
});

// 设置默认日期为今天
document.getElementById('checkDate').valueAsDate = new Date();
