// 工具数据配置
// 添加新工具只需在对应分类的 items 数组中添加即可

const tools = [
    {
        category: 'test',
        categoryName: '测试',
        items: [
            { name: 'Word模板填充器（测试）', desc: '通用文档模板填充工具，上传配置和模板，自动生成表单并导出，具体使用方法请仔细阅读文档！', url: 'app/word-template-filler/index.html' },
            { name: '休假录入助手（测试）', desc: 'Python脚本，自动化填写飞行门户非生产任务录入表单，支持批量录入休假信息', url: 'app/leave-entry-helper/index.html' }
        ]
    },
    {
        category: 'training',
        categoryName: '训练',
        items: [
            { name: '姓名匹配员工号', desc: '从混杂文本中识别姓名，并匹配对应员工号，支持一键复制', url: 'app/crew-match-name-id.html' },
            { name: '提取员工号', desc: '从混杂文本中提取6位数字员工号，自动去重排序，支持一键复制', url: 'app/crew-extract-id.html' },
            { name: '空勤登记证背景申报表', desc: '填写空勤登记证背景申报表，导出为Word文档', url: 'app/aircrew-cert-form.html' },
            { name: '模拟机训练检查表', desc: '填写模拟机训练检查表，导出为Word文档', url: 'app/sim-training-check.html' },
            { name: '美华模拟机视频检查表', desc: '填写美华模拟机视频检查表，导出为Word文档', url: 'app/meihua-video-form.html' },
            { name: 'PDF与图片互转', desc: 'PDF转JPG/PNG图片，或将多张图片合并为PDF', url: 'app/pdf-image-convert.html' },
            { name: 'PDF页面提取合并', desc: '从多个PDF中提取指定页面，合并为新文件', url: 'app/pdf-extract-merge.html' }
        ]
    },
    {
        category: 'operation',
        categoryName: '运行',
        items: [
            { name: '航线班次统计', desc: '根据排班表统计每人各航线班次', url: 'app/crew-flight-stats.html' }
        ]
    },
    {
        category: 'safety',
        categoryName: '安全',
        items: []
    },
    {
        category: 'tech',
        categoryName: '技术',
        items: [
            { name: 'PDF解锁', desc: '移除PDF的权限限制，解除打印、复制、编辑限制，适用于技术室', url: 'app/pdf-unlock.html' }
        ]
    },
    {
        category: 'general',
        categoryName: '综合',
        items: [
            { name: '酒店账单核对', desc: '对比酒店账单与入住登记表，核对用', url: 'app/hotel-bill-check.html' },
            { name: '账单甘特图', desc: '将酒店账单转换为甘特图，与飞行任务日程对比审核', url: 'app/bill-gantt.html' }
        ]
    },
    {
        category: 'branch',
        categoryName: '分部',
        items: []
    }
];
