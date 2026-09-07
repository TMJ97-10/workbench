# 个人工作台

手机电脑通用的个人工作台（PWA）：待办日程、笔记、灵感库、AI 助手入口、记账理财、学习打卡、天气热榜、股票记录。

## 使用

- 在线版：通过 GitHub Pages 访问
- 本地版：双击 `index.html`，或运行 `node server.js` 后访问 `http://localhost:7100/`

## 数据同步

数据保存在本机浏览器；在「设置」中配置 GitHub Token 后，自动同步到你的私有仓库 `workbench-data`，手机电脑数据互通。

## 技术

纯静态 HTML/CSS/JS，无构建、无外部依赖；PWA 支持离线打开、可安装到主屏幕。
