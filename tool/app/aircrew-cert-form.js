// 空勤登记证背景申报表

const TEMPLATE_PATH = '../../template/kqdjz-sample/document.docx';
let templateData = null;

// 循环表格子字段配置
const loopFields = {
    otherMainRelations: [
        { name: 'relationName' },
        { name: 'relationShip' },
        { name: 'relationAge' },
        { name: 'relationPoliticalStatus' },
        { name: 'relationOccupation' },
        { name: 'relationWorkUnit' }
    ]
};

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

// 日期格式化
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
}

// 添加循环表格行
function addLoopRow() {
    const tbody = document.querySelector('#table_otherMainRelations tbody');
    const tr = document.createElement('tr');
    
    loopFields.otherMainRelations.forEach(() => {
        const td = document.createElement('td');
        td.innerHTML = '<input type="text">';
        tr.appendChild(td);
    });
    
    const actionTd = document.createElement('td');
    actionTd.innerHTML = '<button type="button" class="btn btn-sm btn-danger" onclick="this.closest(\'tr\').remove()">删除</button>';
    tr.appendChild(actionTd);
    
    tbody.appendChild(tr);
}

// 初始化一行
addLoopRow();

// 收集表单数据
function collectFormData() {
    const data = {};
    
    // 文本和textarea字段
    const textFields = [
        'docName', 'docCompany', 'name', 'gender', 'nation', 'formerName',
        'birthYearMonth', 'nativePlace', 'idCardNumber', 'educationLevel',
        'maritalStatus', 'politicalStatus', 'politicalStatusJoinTime',
        'religiousBelief', 'householdRegisterAddress', 'currentResidence',
        'illegalCrimeRecord', 'joinOrganizationSituation', 'entryPosition', 'personalPhone',
        'personalResumemiddle', 'personalResumehigh', 'personalResumecollege', 'personalResumenow',
        'spouseName', 'spouseNation', 'spouseIdCardNumber', 'spousePoliticalStatus',
        'spousePhone', 'spouseCompanyAndPosition', 'spouseCurrentResidence',
        'fatherName', 'fatherNation', 'fatherIdCardNumber', 'fatherPoliticalStatus',
        'fatherPhone', 'fatherCompanyAndPosition', 'fatherCurrentResidence',
        'motherName', 'motherNation', 'motherIdCardNumber', 'motherPoliticalStatus',
        'motherPhone', 'motherCompanyAndPosition', 'motherCurrentResidence',
        'fostererName', 'fostererNation', 'fostererIdCardNumber', 'fostererPoliticalStatus',
        'fostererPhone', 'fostererCompanyAndPosition', 'fostererCurrentResidence'
    ];
    
    textFields.forEach(field => {
        const el = document.getElementById(field);
        data[field] = el ? el.value : '';
    });
    
    // 日期字段
    const dateVal = document.getElementById('dayTime')?.value || '';
    data.dayTime = formatDate(dateVal);
    
    // 循环表格数据
    const tbody = document.querySelector('#table_otherMainRelations tbody');
    const rows = tbody?.querySelectorAll('tr') || [];
    data.otherMainRelations = Array.from(rows).map(row => {
        const rowData = {};
        const inputs = row.querySelectorAll('input');
        loopFields.otherMainRelations.forEach((sf, i) => {
            rowData[sf.name] = inputs[i]?.value || '';
        });
        return rowData;
    });
    
    return data;
}

// 导出Word
document.getElementById('exportBtn').addEventListener('click', async function() {
    if (!templateData) {
        alert('请先导入模板文件');
        return;
    }
    
    const data = collectFormData();
    console.log('导出数据:', data);
    
    try {
        const zip = new PizZip(templateData);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ''
        });
        
        doc.render(data);
        
        const blob = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = data.name || '未填写';
        a.download = `空勤登记证背景申报表_${name}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert('导出失败：' + error.message);
    }
});

// 清空表单
document.getElementById('clearBtn').addEventListener('click', function() {
    if (confirm('确定要清空所有填写内容吗？')) {
        document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
            // 保留默认值
            if (el.id === 'educationLevel') {
                el.value = '大学本科';
            } else {
                el.value = '';
            }
        });
        // 重置循环表格
        const tbody = document.querySelector('#table_otherMainRelations tbody');
        if (tbody) {
            tbody.innerHTML = '';
            addLoopRow();
        }
        // 重置日期为今天
        document.getElementById('dayTime').valueAsDate = new Date();
    }
});

// 设置默认日期为今天
document.getElementById('dayTime').valueAsDate = new Date();
