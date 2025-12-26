// 模拟机训练检查表

const TEMPLATE_PATH = '../../template/meihua/field.docx';
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

// 训练类型切换
document.querySelectorAll('input[name="trainType"]').forEach(radio => {
    radio.addEventListener('change', function() {
        document.getElementById('otherTypeInput').style.display = 
            this.value === 'other' ? 'block' : 'none';
    });
});

// 获取表单数据
function getFormData() {
    const trainType = document.querySelector('input[name="trainType"]:checked').value;
    const completion = document.querySelector('input[name="completion"]:checked').value;
    const hasSuggestion = document.querySelector('input[name="hasSuggestion"]:checked').value;
    
    let trainTypeGround = '□', trainTypeSim = '□', trainTypeOther = '□';
    let otherText = '';
    if (trainType === 'ground') trainTypeGround = '☑';
    else if (trainType === 'sim') trainTypeSim = '☑';
    else {
        trainTypeOther = '☑';
        otherText = document.getElementById('otherType').value;
    }
    
    const completionExcellent = completion === 'excellent' ? '☑' : '□';
    const completionImprove = completion === 'improve' ? '☑' : '□';
    const suggestionYes = hasSuggestion === 'yes' ? '☑' : '□';
    const suggestionNo = hasSuggestion === 'no' ? '☑' : '□';
    
    const trainDate = document.getElementById('trainDate').value;
    const fillDate = document.getElementById('fillDate').value;
    const completionDate = document.getElementById('completionDate').value;
    
    return {
        trainDate: formatDate(trainDate),
        fillDate: formatDate(fillDate),
        trainTypeGround,
        trainTypeSim,
        trainTypeOther,
        otherText,
        trainName: document.getElementById('trainName').value,
        supervisor: document.getElementById('supervisor').value,
        instructor: document.getElementById('instructor').value,
        trainContent: document.getElementById('trainContent').value,
        completionExcellent,
        completionImprove,
        suggestionYes,
        suggestionNo,
        suggestion: document.getElementById('suggestion').value,
        completionStatus: document.getElementById('completionStatus').value,
        completionDate: completionDate ? formatDate(completionDate) : '    年    月    日',
        remarks: document.getElementById('remarks').value
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
        document.querySelector('input[name="trainType"][value="sim"]').checked = true;
        document.querySelector('input[name="completion"][value="excellent"]').checked = true;
        document.querySelector('input[name="hasSuggestion"][value="no"]').checked = true;
        document.getElementById('otherTypeInput').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
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
        a.download = `南货航模拟机训练检查表_${data.supervisor || '未填写'}_${data.trainDate || '未填写'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert('导出失败：' + error.message);
    }
});

// 设置默认日期为今天
document.getElementById('trainDate').valueAsDate = new Date();
document.getElementById('fillDate').valueAsDate = new Date();
