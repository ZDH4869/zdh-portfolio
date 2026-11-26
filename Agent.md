# 张德海能力展示卡维护指南

[项目说明](README.md) · [一键启动部署提示词](一键启动部署提示词.md)

## 页面与内容

- 页面是静态站点，入口为 `index.html`，所有运行时资源使用相对路径，兼容本地文件和项目级 GitHub Pages 子路径。
- 顶栏展示「张德海能力展示卡」。分类按钮顺序为 AI coding、AI 工作流、产品 PPT。保留大图、作品说明、播放控制和原图弹窗在页面中的顺序。
- 展项顺序和文案在 `portfolio.js` 的 `slides` 中维护。改动静态展项需同时检查响应式图片、原图和导出清单。首屏 XAJ 的源和描述还在 `index.html` 中。
- 静态图停留 2.5 秒，动图停留 4 秒，从画面就绪后计时。自动播放、手动翻页、触屏滑动和减少动效偏好共用这一组展项。
- 页面展示原始 PPT 和可公开的产品资料，保留原图。新加生成示意图或实验数据时在图内写清性质和指标口径。

## HydroLab 素材

同一工作区下 `水利水文计算/-` 的 `README.md` 标明当前使用的演示 GIF。把该文件原样同步到 `assets/original/hydrolab.gif`，生成同内容的 `assets/hydrolab-animation.webp` 和第一帧 `assets/hydrolab-poster.webp`。保持完整动图的顺序和总时长。核对预览、减少动效模式和展开原图三个入口。

## 构建和发布

- 本地直接打开 `index.html`。导出使用 `node scripts/export-static.mjs`，默认目标是仓库同级 `upload`。
- `upload` 保留 `index.html`、`portfolio.css`、`portfolio.js` 以及清单中的图片。开发测试、Markdown、仓库元数据、临时文件和工具脚本留在源仓库。
- 静态导出只按清单复制，遇到目标目录的额外条目会报出路径并停止。按工作区约定处理已存在的文件。
- GitHub Pages 使用 `.github/workflows/pages.yml`。工作流按需手动触发，复用同一个静态导出脚本。发布前核对分支和目标仓库。

## 验证顺序

1. 用 `node --check portfolio.js` 检查脚本语法。
2. 在 Chromium 验证首图、跨分类轮播、时间间隔、暂停、桌面键盘、手机滑动和原图查看。
3. 使用 320 像素和常见手机宽度检查标题、标签和控件。只更换展示小图时也检查原图仍能打开。
4. 导出并用相同的浏览器测试检查 `upload`。验证目录只含静态清单。
