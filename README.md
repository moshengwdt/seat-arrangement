# 排座页面 · GitHub Pages 部署

本目录即 GitHub 仓库根目录（index.html 在根，资源在 static/）。

## 步骤

1. 在 GitHub 新建一个空仓库（如 `seat-web`，Public 或 Private 均可）；
2. 本机执行（把仓库地址换成你的）：
   ```bash
   git remote add origin https://github.com/<你的用户名>/seat-web.git
   git branch -M main
   git push -u origin main
   ```
3. 仓库 Settings → Pages → Source 选 `main` 分支（根目录）→ Save；
4. 页面地址：`https://<你的用户名>.github.io/seat-web/`（可选绑定自定义域名）。

## 连接本机服务

1. 本机启动：`python server.py --port 8000`（建议同时设置 `SEAT_API_TOKEN` 访问令牌）；
2. 内网穿透暴露 8000（免费：cloudflared / cpolar），得到公网地址；
3. 编辑 `static/config.js`：
   ```js
   window.SEAT_CONFIG = {
     apiBase: "https://你的穿透地址",   // 内网穿透地址
     token: "你的令牌",                 // 与服务端 SEAT_API_TOKEN 一致
   };
   ```
4. 推送 `static/config.js` 修改，刷新页面即可用。
