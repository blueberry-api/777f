let scheduleWorkbook = null;  // 排班表工作簿
let rosterNames = [];         // 花名册姓名列表
let statsResult = null;       // 统计结果
let routes = [];              // 航线列表
let selectedSheets = [];      // 选中的工作表

// 读取排班表
document.getElementById('scheduleFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            scheduleWorkbook = XLSX.read(data, {type: 'array'});
            
            const sheetNames = scheduleWorkbook.SheetNames;
            showStatus('scheduleStatus', `已加载: ${file.name}（${sheetNames.length} 个工作表）`, 'success');
            
            // 显示工作表选择器
            displaySheetSelector(sheetNames);
            checkReady();
        } catch (err) {
            showStatus('scheduleStatus', '文件解析失败: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
});

// 显示工作表选择器
function displaySheetSelector(sheetNames) {
    const section = document.getElementById('sheetSection');
    const selector = document.getElementById('sheetSelector');
    
    section.style.display = 'block';
    selectedSheets = [...sheetNames]; // 默认全选
    
    let html = '';
    for (const name of sheetNames) {
        html += `
            <label class="sheet-checkbox checked">
                <input type="checkbox" value="${name}" checked>
                <span>${name}</span>
            </label>
        `;
    }
    selector.innerHTML = html;
    
    // 绑定checkbox事件
    selector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const label = this.parentElement;
            if (this.checked) {
                label.classList.add('checked');
                if (!selectedSheets.includes(this.value)) {
                    selectedSheets.push(this.value);
                }
            } else {
                label.classList.remove('checked');
                selectedSheets = selectedSheets.filter(s => s !== this.value);
            }
            checkReady();
        });
    });
}

// 全选
document.getElementById('selectAllBtn').addEventListener('click', function() {
    const selector = document.getElementById('sheetSelector');
    selector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        cb.parentElement.classList.add('checked');
    });
    selectedSheets = [...scheduleWorkbook.SheetNames];
    checkReady();
});

// 全不选
document.getElementById('selectNoneBtn').addEventListener('click', function() {
    const selector = document.getElementById('sheetSelector');
    selector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.parentElement.classList.remove('checked');
    });
    selectedSheets = [];
    checkReady();
});

// 读取花名册
document.getElementById('rosterFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
            
            rosterNames = [];
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (row && row[1]) {
                    rosterNames.push(String(row[1]).trim());
                }
            }
            
            showStatus('rosterStatus', `已加载: ${file.name}（${rosterNames.length} 人）`, 'success');
            checkReady();
        } catch (err) {
            showStatus('rosterStatus', '文件解析失败: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
});

function showStatus(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'status status-' + type;
}

function checkReady() {
    const ready = scheduleWorkbook && rosterNames.length > 0 && selectedSheets.length > 0;
    document.getElementById('analyzeBtn').disabled = !ready;
}

// 从单元格内容中匹配花名册里的名字
function matchNames(cellContent) {
    if (!cellContent) return [];
    
    const content = String(cellContent);
    const matched = [];
    
    // 用花名册里的名字去匹配
    for (const name of rosterNames) {
        if (content.includes(name)) {
            matched.push(name);
        }
    }
    
    return matched;
}

// 开始统计
document.getElementById('analyzeBtn').addEventListener('click', function() {
    if (!scheduleWorkbook || rosterNames.length === 0 || selectedSheets.length === 0) return;
    
    // 初始化统计结果
    statsResult = {};
    routes = [];
    const unmatchedCells = [];
    
    // 遍历选中的每个工作表
    for (const sheetName of selectedSheets) {
        const sheet = scheduleWorkbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, {header: 1});
        
        // 遍历排班表，从第2行开始（第1行是日期）
        for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
            const row = sheetData[rowIdx];
            if (!row || !row[0]) continue;
            
            const routeName = String(row[0]).trim();
            if (!routeName) continue;
            
            // 记录航线（动态读取A列）
            if (!routes.includes(routeName)) {
                routes.push(routeName);
            }
            
            // 遍历该行的每个单元格（从第2列开始，第1列是航线名）
            for (let colIdx = 1; colIdx < row.length; colIdx++) {
                const cellContent = row[colIdx];
                if (!cellContent) continue;
                
                const matched = matchNames(cellContent);
                
                // 统计每个匹配到的人
                for (const name of matched) {
                    if (!statsResult[name]) {
                        statsResult[name] = {};
                    }
                    if (!statsResult[name][routeName]) {
                        statsResult[name][routeName] = 0;
                    }
                    statsResult[name][routeName]++;
                }
                
                // 检查是否有未匹配的内容
                const content = String(cellContent).trim();
                if (content && matched.length === 0) {
                    unmatchedCells.push(`[${sheetName}] 行${rowIdx + 1} ${routeName}: ${content.substring(0, 50)}`);
                }
            }
        }
    }
    
    // 显示未匹配警告
    if (unmatchedCells.length > 0) {
        document.getElementById('warningSection').style.display = 'block';
        document.getElementById('warningList').innerHTML = unmatchedCells.slice(0, 30).join('<br>') + 
            (unmatchedCells.length > 30 ? `<br>...还有 ${unmatchedCells.length - 30} 条` : '');
    } else {
        document.getElementById('warningSection').style.display = 'none';
    }
    
    // 显示结果
    displayResult();
    document.getElementById('exportBtn').disabled = false;
});

function displayResult() {
    const resultSection = document.getElementById('resultSection');
    const resultHead = document.getElementById('resultHead');
    const resultBody = document.getElementById('resultBody');
    const resultInfo = document.getElementById('resultInfo');
    
    resultSection.style.display = 'block';
    
    const people = Object.keys(statsResult).sort();
    resultInfo.textContent = `共统计 ${people.length} 人，${routes.length} 条航线，已选择 ${selectedSheets.length} 个工作表`;
    
    // 表头
    let headHtml = '<tr><th>加分项</th>';
    for (const route of routes) {
        headHtml += `<th>${route}</th>`;
    }
    headHtml += '</tr>';
    resultHead.innerHTML = headHtml;
    
    // 表体
    let bodyHtml = '';
    for (const name of people) {
        bodyHtml += `<tr><td>${name}</td>`;
        for (const route of routes) {
            const count = statsResult[name][route] || '';
            bodyHtml += `<td>${count}</td>`;
        }
        bodyHtml += '</tr>';
    }
    resultBody.innerHTML = bodyHtml;
}

// 导出Excel
document.getElementById('exportBtn').addEventListener('click', function() {
    if (!statsResult || routes.length === 0) return;
    
    const people = Object.keys(statsResult).sort();
    
    // 构建数据
    const data = [];
    
    // 表头
    const header = ['加分项', ...routes];
    data.push(header);
    
    // 数据行
    for (const name of people) {
        const row = [name];
        for (const route of routes) {
            row.push(statsResult[name][route] || '');
        }
        data.push(row);
    }
    
    // 创建工作簿
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '航线班次统计');
    
    // 下载
    XLSX.writeFile(wb, '航线班次统计.xlsx');
});
