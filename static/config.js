// 公网发布配置：部署到静态托管（如 GitHub Pages）时填写。
// apiBase：本机排座服务的公网地址（内网穿透/隧道），留空表示同源（本地部署）。
// token：与服务端环境变量 SEAT_API_TOKEN 一致时填写；未启用令牌留空。
// role：guest=游客（仅座位查询）；ops=运营（排座+短信+座位图）。
window.SEAT_CONFIG = {
  apiBase: "https://examines-underwear-care-diameter.trycloudflare.com",
  token: "test-seat-20260805",
  role: "guest",
};
