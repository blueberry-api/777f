# 开发规范

纯前端离线工具集，聚合日常工作常用工具。无需后端服务，双击 `index.html` 即可使用。

## 使用方法

1. 双击 `index.html` 在浏览器中打开
2. 侧边栏选择模块：工具、文档
3. 点击工具进入使用

## 目录结构

```
├── index.html              # 主入口（CoreUI侧边栏布局）
├── assets/                 # 静态资源
│   └── bg.webp             # 背景图
├── libs/                   # 第三方库
│   ├── coreui.min.css      # CoreUI样式
│   ├── coreui.bundle.min.js
│   ├── simplebar.min.css   # 滚动条美化
│   ├── simplebar.min.js
│   ├── pdf-lib.min.js      # PDF处理
│   ├── xlsx.full.min.js    # Excel处理
│   ├── docxtemplater.min.js # Word模板处理
│   ├── pizzip.min.js       # ZIP处理
│   ├── marked.min.js       # Markdown渲染
│   └── ...
├── tool/                   # 工具模块
│   ├── index.html          # 工具列表页
│   ├── tools-data.js       # 工具配置
│   ├── tools-render.js     # 渲染逻辑
│   └── app/                # 具体工具页面
│       ├── word-template-filler/  # Word模板填充器
│       ├── pdf-unlock.html
│       └── ...
├── docs/                   # 文档模块
│   ├── index.html          # 文档列表
│   ├── docs-data.js        # 文档配置
│   ├── viewer.html         # Markdown渲染页
│   └── md/                 # Markdown文档
│       ├── word-template-filler.md
│       ├── weekly-report.md
│       └── ...
└── template/               # 文档模板
```

## 路径引用

- `tool/app/*.html` 引用 libs：`../../libs/xxx`
- `tool/app/*.html` 引用 template：`../../template/xxx`
- `tool/app/*.html` 返回首页链接：`../../index.html`

## 新增工具

1. 在 `tool/app/` 下创建 `xxx.html` 和 `xxx.js`
2. 在 `tool/tools-data.js` 的对应分类中添加配置：
   ```javascript
   { name: '工具名', desc: '描述', url: 'app/xxx.html' }
   ```

## 新增文档

1. 在 `docs/md/` 下创建 `xxx.md`
2. 在 `docs/docs-data.js` 中添加配置：
   ```javascript
   { file: 'xxx', title: '文档标题' }
   ```

## 新增侧边栏模块

1. 在根目录创建模块文件夹和 `index.html`
2. 在 `index.html` 的 `modules` 对象中添加：
   ```javascript
   moduleName: { title: '显示名', url: 'path/index.html' }
   ```
3. 在侧边栏 `<ul>` 中添加导航项

## 代码风格

- 不使用 emoji 图标
- 统一浅色主题
- 中文界面

## 浏览器兼容

推荐 Chromium 内核浏览器（Chrome/Edge）。
