"use strict";

// ---------- 元素 ----------
const seatForm = document.getElementById("seat-form");
const smsForm = document.getElementById("sms-form");
const errorBox = document.getElementById("error");
const smsErrorBox = document.getElementById("sms-error");
const submitBtn = document.getElementById("submit-btn");
const smsSubmitBtn = document.getElementById("sms-submit-btn");
const seatProgress = document.getElementById("progress");
const seatProgressBar = document.getElementById("progress-bar");
const seatProgressStage = document.getElementById("progress-stage");
const seatSummary = document.getElementById("summary");
const summaryMeta = document.getElementById("summary-meta");
const summaryTable = document.getElementById("summary-table");
const downloadBtn = document.getElementById("download-btn");
const smsReadyHint = document.getElementById("sms-ready-hint");
const smsProgress = document.getElementById("sms-progress");
const smsProgressBar = document.getElementById("sms-progress-bar");
const smsProgressStage = document.getElementById("sms-progress-stage");
const smsSummary = document.getElementById("sms-summary");
const smsMeta = document.getElementById("sms-meta");
const smsDownloadBtn = document.getElementById("sms-download-btn");
const smsDetailDownloadBtn = document.getElementById("sms-detail-download-btn");
const smsManifestDownloadBtn = document.getElementById("sms-manifest-download-btn");
const smsMode = document.getElementById("sms-mode");
const smsPreviewBtn = document.getElementById("sms-preview-btn");
const smsSendBtn = document.getElementById("sms-send-btn");
const smsSendResult = document.getElementById("sms-send-result");
const smsSendMeta = document.getElementById("sms-send-meta");
const smsSendError = document.getElementById("sms-send-error");

const seatQueryForm = document.getElementById("seatquery-form");
const sqErrorBox = document.getElementById("sq-error");
const sqSubmitBtn = document.getElementById("sq-submit-btn");
const sqResult = document.getElementById("sq-result");
const sqStatus = document.getElementById("sq-status");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalOk = document.getElementById("modal-ok");
const modalCancel = document.getElementById("modal-cancel");
const modalConfirm = document.getElementById("modal-confirm");

const originInfo = document.getElementById("origin-info");
if (originInfo) originInfo.textContent = "页面来源：" + location.origin;

// 对客公开模式：仅保留座位查询，隐藏管理模块
const GUEST_MODE = !!(window.SEAT_CONFIG && window.SEAT_CONFIG.guestMode);

// ---------- 视图路由：平台首页 / 排座 / 座位图 / 座位查询 ----------
const viewHome = document.getElementById("view-home");
const viewSeat = document.getElementById("view-seat");
const viewSeatmap = document.getElementById("view-seatmap");
const viewSeatquery = document.getElementById("view-seatquery");
const goSeatBtn = document.getElementById("go-seat");
const goSeatmapBtn = document.getElementById("go-seatmap");
const goSeatQueryBtn = document.getElementById("go-seatquery");
const seatmapStatus = document.getElementById("seatmap-status");
const seatmapRoot = document.getElementById("seatmap-root");
const seatmapControls = document.getElementById("seatmap-controls");
const smProgressEl = document.getElementById("sm-progress");
const smProgressBar = document.getElementById("sm-progress-bar");
const smProgressStage = document.getElementById("sm-progress-stage");

function routeView() {
  const h = (location.hash || "#/home").replace(/^#\/?/, "#/");
  if (GUEST_MODE) {
    if (viewHome) viewHome.classList.add("hidden");
    if (viewSeat) viewSeat.classList.add("hidden");
    if (viewSeatmap) viewSeatmap.classList.add("hidden");
    if (viewSeatquery) viewSeatquery.classList.remove("hidden");
    document.title = "座位查询 · 观光列车智能运营中台";
    if (h === "#/seatquery") loadSeatQuery();
    if (h !== "#/seatquery") location.hash = "#/seatquery";
    return;
  }
  const showSeat = h === "#/seat";
  const showSeatmap = h === "#/seatmap";
  const showSeatquery = h === "#/seatquery";
  if (viewHome) viewHome.classList.toggle("hidden", showSeat || showSeatmap || showSeatquery);
  if (viewSeat) viewSeat.classList.toggle("hidden", !showSeat);
  if (viewSeatmap) viewSeatmap.classList.toggle("hidden", !showSeatmap);
  if (viewSeatquery) viewSeatquery.classList.toggle("hidden", !showSeatquery);
  document.title = showSeat ? "智能排座 · 观光列车智能运营中台"
    : showSeatmap ? "列车运营情况 · 观光列车智能运营中台"
    : showSeatquery ? "座位查询 · 观光列车智能运营中台"
    : "观光列车智能运营中台";
  if (showSeatmap) loadSeatMap();
  if (showSeatquery) loadSeatQuery();
}
if (goSeatBtn) {
  goSeatBtn.addEventListener("click", () => { location.hash = "#/seat"; });
}
if (goSeatmapBtn) {
  goSeatmapBtn.addEventListener("click", () => { location.hash = "#/seatmap"; });
}
if (goSeatQueryBtn) {
  goSeatQueryBtn.addEventListener("click", () => { location.hash = "#/seatquery"; });
}
if (GUEST_MODE) {
  if (goSeatBtn) goSeatBtn.classList.add("hidden");
  if (goSeatmapBtn) goSeatmapBtn.classList.add("hidden");
  const backLink = document.getElementById("sq-back-link");
  if (backLink) backLink.classList.add("hidden");
}
window.addEventListener("hashchange", routeView);
routeView();

// ---------- 公网发布配置 ----------
const API_BASE = (window.SEAT_CONFIG && window.SEAT_CONFIG.apiBase) || "";
const TOKEN = (window.SEAT_CONFIG && window.SEAT_CONFIG.token) || "";

function apiUrl(path) {
  let url = API_BASE + path;
  if (TOKEN) url += (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(TOKEN);
  return url;
}

// ---------- 时刻表 ----------
let SCHEDULE = null;
fetch(apiUrl("/api/schedule"))
  .then((r) => r.json())
  .then((d) => { if (d.ok) { SCHEDULE = d; populateTrains(); } })
  .catch(() => {});

const trainBtn = document.getElementById("train-select-btn");
const trainLabel = document.getElementById("train-select-label");
const trainValue = document.getElementById("train-value");
const trainPopup = document.createElement("div");
trainPopup.className = "train-popup hidden";
document.body.appendChild(trainPopup);
let TRAIN_LIST = [];

function renderTrainOptions() {
  if (!trainPopup) return;
  const current = (trainValue.value || "").trim();
  trainPopup.innerHTML = "";
  for (const t of TRAIN_LIST) {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "train-option" + (t.id === current ? " selected" : "");
    opt.dataset.value = t.id;
    opt.textContent = t.name;
    trainPopup.appendChild(opt);
  }
}

function populateTrains() {
  TRAIN_LIST = (SCHEDULE && SCHEDULE.trains) || [
    { id: "wuyishan", name: "武夷山国家公园主题观光列车" },
    { id: "shangrao", name: "大美上饶主题观光列车" },
  ];
  renderTrainOptions();
}

function openTrainDropdown() {
  if (!trainBtn) return;
  renderTrainOptions();
  const r = trainBtn.getBoundingClientRect();
  trainPopup.classList.remove("hidden");
  const pw = trainPopup.offsetWidth || 280;
  const ph = trainPopup.offsetHeight || 200;
  const gap = 12;
  const maxLeft = Math.max(gap, window.innerWidth - pw - gap);
  trainPopup.style.left = Math.max(gap, Math.min(r.left, maxLeft)) + "px";
  let top = r.bottom + 8;
  if (top + ph > window.innerHeight - gap) {
    top = Math.max(gap, r.top - ph - 8);
  }
  trainPopup.style.top = top + "px";
  trainBtn.setAttribute("aria-expanded", "true");
}

function closeTrainDropdown() {
  trainPopup.classList.add("hidden");
  if (trainBtn) trainBtn.setAttribute("aria-expanded", "false");
}

if (trainBtn) {
  trainBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (trainPopup.classList.contains("hidden")) openTrainDropdown(); else closeTrainDropdown();
  });
}
trainPopup.addEventListener("click", (e) => {
  const opt = e.target.closest(".train-option");
  if (!opt) return;
  trainValue.value = opt.dataset.value;
  trainLabel.textContent = opt.textContent;
  closeTrainDropdown();
});
document.addEventListener("click", (e) => {
  if (!trainPopup.contains(e.target) && e.target !== trainBtn && !e.target.closest(".train-wrap")) {
    closeTrainDropdown();
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTrainDropdown(); });
window.addEventListener("resize", closeTrainDropdown);

populateTrains();

// ---------- 弹窗（提示 / 人工确认） ----------
let confirmAction = null;

function showModal(title, msg, mode = "ok") {
  modalTitle.textContent = title;
  modalMessage.textContent = msg;
  modalOk.classList.toggle("hidden", mode !== "ok");
  modalCancel.classList.toggle("hidden", mode !== "confirm");
  modalConfirm.classList.toggle("hidden", mode !== "confirm");
  modal.classList.remove("hidden");
}

function showConfirm(title, msg, fn) {
  confirmAction = fn;
  showModal(title, msg, "confirm");
}

modalOk.addEventListener("click", () => modal.classList.add("hidden"));
modalCancel.addEventListener("click", () => { modal.classList.add("hidden"); confirmAction = null; });
modalConfirm.addEventListener("click", () => {
  const fn = confirmAction;
  modal.classList.add("hidden");
  confirmAction = null;
  if (fn) fn();
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) { modal.classList.add("hidden"); confirmAction = null; }
});

// ---------- 工具 ----------
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function showError(box, msg) {
  box.textContent = msg || "操作失败，请稍后重试";
  box.classList.remove("hidden");
}
function clearError(box) { box.classList.add("hidden"); }

function setProgress(bar, stageEl, pct, stage) {
  bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  stageEl.textContent = stage || "处理中…";
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function enableLink(link, url) {
  link.href = url;
  link.classList.remove("disabled");
  link.setAttribute("aria-disabled", "false");
}
function disableLink(link) {
  link.removeAttribute("href");
  link.classList.add("disabled");
  link.setAttribute("aria-disabled", "true");
}

async function pollJob(job, onProgress) {
  while (true) {
    await sleep(700);
    const r = await fetch(apiUrl(`/api/job/${job}`));
    const st = await r.json();
    if (!st.ok) {
      showError(errorBox, st.error || "查询任务失败");
      return null;
    }
    if (onProgress) onProgress(st);
    if (st.status === "done") return st.summary || {};
    if (st.status === "error") {
      if (st.error_type === "date") showModal("日期校验", st.error || "日期无效");
      else if (st.error_type === "oversold") showModal("超售提醒", st.error || "该日存在超售");
      else if (st.error_type === "train") showModal("请选择列车", st.error || "请选择列车");
      else showError(errorBox, st.error || "任务失败");
      return null;
    }
  }
}

// ---------- 日期预校验 ----------
function dateValidation() {
  const date = seatForm.date.value;
  const train = seatForm.train.value;
  if (!date || !SCHEDULE) return null;
  const routes = SCHEDULE.dates[date] || [];
  if (routes.length === 0) return { msg: `${date} 两列车均未开行，请检查游玩日期。` };
  if (!train) return { msg: "请先选择列车。" };
  if (!routes.some((r) => r.startsWith(train))) {
    const name = (SCHEDULE.trains.find((t) => t.id === train) || {}).name || train;
    return { msg: `${date} ${name}列车不开行，请检查日期或选择其它列车。` };
  }
  return null;
}

seatForm.date.addEventListener("change", () => {
  const v = dateValidation();
  if (v) showModal("日期校验", v.msg);
});

// ---------- ① 排座 ----------
seatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError(errorBox);
  const v = dateValidation();
  if (v) { showModal("日期校验", v.msg); return; }
  const file = seatForm.file.files[0];
  const orders = seatForm.orders.files[0];
  const trainId = seatForm.train.value;
  const trainName = (TRAIN_LIST.find((t) => t.id === trainId) || {}).name || trainId;
  const msg =
    `确认开始排座？\n` +
    `· 游客信息表：${file ? file.name : "（未选择）"}\n` +
    `· 订单数据表：${orders ? orders.name : "（未提供，将回退游客表信息）"}\n` +
    `· 列车：${trainName}\n· 游玩日期：${seatForm.date.value}`;
  showConfirm("人工确认", msg, () => runSeat());
});

async function runSeat() {
  clearError(errorBox);
  seatSummary.classList.add("hidden");
  seatProgress.classList.remove("hidden");
  setProgress(seatProgressBar, seatProgressStage, 0, "提交中…");
  disableLink(downloadBtn);
  smsReadyHint.classList.add("hidden");

  const fd = new FormData(seatForm);
  submitBtn.disabled = true;
  submitBtn.textContent = "排座中…";
  try {
    const resp = await fetch(apiUrl("/api/seat"), { method: "POST", body: fd });
    const data = await resp.json();
    if (!data.ok) {
      if (data.error_type === "date") showModal("日期校验", data.error || "日期无效");
      else if (data.error_type === "oversold") showModal("超售提醒", data.error || "该日存在超售");
      else if (data.error_type === "train") showModal("请选择列车", data.error || "请选择列车");
      else showError(errorBox, data.error || "排座失败");
      seatProgress.classList.add("hidden");
      return;
    }
    const summary = await pollJob(data.job, (st) =>
      setProgress(seatProgressBar, seatProgressStage, st.pct, st.stage));
    if (summary) renderSeatSummary(summary);
    else seatProgress.classList.add("hidden");
  } catch (err) {
    showError(errorBox, "网络错误：" + err.message);
    seatProgress.classList.add("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "开始排座";
  }
}

function renderSeatSummary(s) {
  const seg = s.segments || [];
  summaryMeta.innerHTML =
    `<div><span class="k">列车</span><span class="v">${escapeHtml(s.train)}</span></div>` +
    `<div><span class="k">游玩日期</span><span class="v">${escapeHtml(s.date)}</span></div>` +
    `<div><span class="k">有效票</span><span class="v">${s.total_valid}（剔除取消 ${s.cancelled}）</span></div>` +
    `<div><span class="k">有座</span><span class="v">${s.seated_tickets} 人次 / ${s.seated_people} 人</span></div>` +
    `<div><span class="k">无座</span><span class="v">${s.nouse_tickets} 人次 / ${s.nouse_people} 人</span></div>`;
  summaryTable.innerHTML =
    "<thead><tr><th>段</th><th>站间段</th><th>有座</th><th>无座</th><th>合计</th></tr></thead><tbody>" +
    seg.map((x) =>
      `<tr><td>${x.no}</td><td>${escapeHtml(x.pair)}</td><td>${x.seated}</td><td>${x.nouse}</td><td>${x.total}</td></tr>`
    ).join("") + "</tbody>";
  enableLink(downloadBtn, apiUrl(s.download));
  seatProgress.classList.add("hidden");
  seatSummary.classList.remove("hidden");
  smsReadyHint.classList.remove("hidden");
}

// ---------- ② 短信梳理 ----------
smsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError(smsErrorBox);
  const msg = "确认生成短信清单？\n· 基于最近一次排座结果生成 短信内容/明细/发送清单。";
  showConfirm("人工确认", msg, () => runSms());
});

async function runSms() {
  clearError(smsErrorBox);
  smsSummary.classList.add("hidden");
  smsProgress.classList.remove("hidden");
  setProgress(smsProgressBar, smsProgressStage, 0, "提交中…");
  for (const b of [smsDownloadBtn, smsDetailDownloadBtn, smsManifestDownloadBtn]) disableLink(b);

  const fd = new FormData();
  smsSubmitBtn.disabled = true;
  smsSubmitBtn.textContent = "生成中…";
  try {
    const resp = await fetch(apiUrl("/api/sms"), { method: "POST", body: fd });
    const data = await resp.json();
    if (!data.ok) {
      showError(smsErrorBox, data.error || "生成失败");
      smsProgress.classList.add("hidden");
      return;
    }
    const summary = await pollJob(data.job, (st) =>
      setProgress(smsProgressBar, smsProgressStage, st.pct, st.stage));
    if (summary) renderSmsSummary(summary);
    else smsProgress.classList.add("hidden");
  } catch (err) {
    showError(smsErrorBox, "网络错误：" + err.message);
    smsProgress.classList.add("hidden");
  } finally {
    smsSubmitBtn.disabled = false;
    smsSubmitBtn.textContent = "生成短信清单";
  }
}

function renderSmsSummary(s) {
  smsMeta.innerHTML =
    `<div><span class="k">短信条数</span><span class="v">${s.sms_count}</span></div>` +
    `<div><span class="k">缺手机号订单</span><span class="v">${s.sms_orders_without_phone}</span></div>`;
  if (s.sms_download) enableLink(smsDownloadBtn, apiUrl(s.sms_download));
  if (s.sms_detail_download) enableLink(smsDetailDownloadBtn, apiUrl(s.sms_detail_download));
  if (s.sms_manifest_download) enableLink(smsManifestDownloadBtn, apiUrl(s.sms_manifest_download));
  smsProgress.classList.add("hidden");
  smsSummary.classList.remove("hidden");
}

// ---------- 阿里云短信发送 ----------
async function pollSendJob(job) {
  while (true) {
    await sleep(700);
    const r = await fetch(apiUrl(`/api/job/${job}`));
    const st = await r.json();
    if (!st.ok) {
      showError(smsSendError, st.error || "查询任务失败");
      return null;
    }
    setProgress(smsProgressBar, smsProgressStage, st.pct, st.stage);
    if (st.status === "done") return st.summary || {};
    if (st.status === "error") {
      showError(smsSendError, st.error || "发送任务失败");
      return null;
    }
  }
}

async function sendSmsRequest(dryRun) {
  clearError(smsSendError);
  smsSendResult.classList.add("hidden");
  smsSendMeta.innerHTML = "";
  smsProgress.classList.remove("hidden");
  setProgress(smsProgressBar, smsProgressStage, 0, dryRun ? "开始预览…" : "开始发送…");
  const btn = dryRun ? smsPreviewBtn : smsSendBtn;
  btn.disabled = true;
  btn.textContent = dryRun ? "预览中…" : "发送中…";
  try {
    const resp = await fetch(apiUrl("/api/sms/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: smsMode.value, dry_run: dryRun }),
    });
    const data = await resp.json();
    if (!data.ok) {
      if (data.error_type === "sms_config") {
        showModal("短信配置未就绪", data.error || "请先在服务器配置阿里云短信参数");
      } else {
        showError(smsSendError, data.error || "请求失败");
      }
      smsProgress.classList.add("hidden");
      return;
    }
    const summary = await pollSendJob(data.job);
    if (summary) renderSmsSendResult(summary, dryRun);
    else smsProgress.classList.add("hidden");
  } catch (err) {
    showError(smsSendError, "网络错误：" + err.message);
    smsProgress.classList.add("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = dryRun ? "预览短信" : "发送短信";
  }
}

function renderSmsSendResult(s, dryRun) {
  const modeLabel = s.mode === "order" ? "每单一单" : "每人一条";
  const items = [
    ["模式", dryRun ? "预览（未实际发送）" : modeLabel],
    ["总条数", s.total],
    ["成功", s.sent],
    ["失败", s.failed],
    ["跳过", s.skipped],
    ["缺手机号订单", s.no_phone],
  ];
  smsSendMeta.innerHTML = items
    .map(([k, v]) => `<div><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`)
    .join("");
  if (!dryRun && s.failed > 0) {
    smsSendError.textContent = "部分短信发送失败，可在服务器端查看 sms_send.db 后重试";
    smsSendError.classList.remove("hidden");
  }
  smsProgress.classList.add("hidden");
  smsSendResult.classList.remove("hidden");
}

if (smsPreviewBtn) {
  smsPreviewBtn.addEventListener("click", () => sendSmsRequest(true));
}
if (smsSendBtn) {
  smsSendBtn.addEventListener("click", () => {
    showConfirm("发送短信", "确认调用阿里云短信接口发送？正式发送将产生短信费用。", () => sendSmsRequest(false));
  });
}

// ---------- 动态毛玻璃光效（跟随鼠标） ----------
const sheen = document.getElementById("liquid-sheen");
if (sheen) {
  document.addEventListener("pointermove", (e) => {
    sheen.style.background =
      `radial-gradient(480px circle at ${e.clientX}px ${e.clientY}px, var(--sheen-color), transparent 65%)`;
  });
}

// ---------- 明暗主题切换 ----------
const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("seat-theme", next); } catch (e) { /* ignore */ }
  });
}

// ---------- 列车运营情况（座位图） ----------
let seatmapLoading = false;
let seatmapRecords = [];
let seatmapLayouts = [];

async function loadSeatMap() {
  if (!seatmapRoot || seatmapLoading) return;
  seatmapLoading = true;
  if (seatmapStatus) seatmapStatus.textContent = "加载中…";
  if (seatmapRoot) seatmapRoot.innerHTML = "";
  try {
    const [layoutsResp, recordsResp] = await Promise.all([
      fetch(apiUrl("/api/layouts")),
      fetch(apiUrl("/api/records")),
    ]);
    seatmapLayouts = (layoutsResp.ok ? (await layoutsResp.json()).layouts : []) || [];
    seatmapRecords = (recordsResp.ok ? (await recordsResp.json()).records : []) || [];
    if (!seatmapLayouts.length) {
      showSeatmapMessage("暂无可用列车布局。");
      return;
    }
    renderSeatmapControls();
  } catch (err) {
    showSeatmapMessage("座位图加载失败：" + err.message);
  } finally {
    seatmapLoading = false;
  }
}

function renderSeatmapControls() {
  if (!seatmapControls) return;
  if (!seatmapRecords.length) {
    seatmapControls.classList.add("hidden");
    seatmapControls.innerHTML = "";
    showSeatmapMessage("暂无已生成的排座记录。请先在「智能排座」完成排座。");
    return;
  }
  const bases = [...new Set(seatmapRecords.map((r) => String(r.route).replace(/\d+$/, "")))];
  seatmapControls.classList.remove("hidden");
  seatmapControls.innerHTML =
    `<label class="sm-field"><span>列车</span><div class="train-wrap sm-train-wrap">` +
      `<button type="button" class="glass-select" id="sm-train-btn" aria-haspopup="listbox" aria-expanded="false">` +
      `<span id="sm-train-label">请选择列车</span></button>` +
      `<input type="hidden" id="sm-train-value" value="" /></div></label>` +
    `<label class="sm-field"><span>开行日期</span><div class="date-wrap sm-date-wrap">` +
      `<input type="date" id="sm-date-input" />` +
      `<button type="button" class="date-cal-btn" id="sm-date-cal-btn" aria-label="选择日期">` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      `<rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>` +
      `</button></div></label>` +
    `<button type="button" class="btn sm-generate" id="sm-generate">生成座位图</button>` +
    `<p class="sm-hint">选择后点击生成；结果已按日期与车辆自动存档，乘务当天可直接查看。</p>`;
  const trainBtn = document.getElementById("sm-train-btn");
  const trainLabel = document.getElementById("sm-train-label");
  const trainValue = document.getElementById("sm-train-value");
  const dateInput = document.getElementById("sm-date-input");
  const dateCalBtn = document.getElementById("sm-date-cal-btn");
  const genBtn = document.getElementById("sm-generate");
  const datePicker = initGlassDatePicker(dateInput, dateCalBtn);
  const refreshDates = () => {
    const base = trainValue.value;
    const dates = [...new Set(
      seatmapRecords.filter((r) => String(r.route).replace(/\d+$/, "") === base).map((r) => r.date)
    )].sort().reverse();
    datePicker.setAllowed(dates);
    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    dateInput.value = dates.includes(today) ? today : dates[0];
  };
  const generate = () => {
    const base = trainValue.value;
    const date = dateInput.value;
    const rec = seatmapRecords.find((r) => r.date === date && String(r.route).replace(/\d+$/, "") === base);
    if (!rec) {
      showSeatmapMessage(`${date} 该车暂无排座结果，请先在「智能排座」完成排座。`);
      return;
    }
    showSeatmapSelection(date, rec.route);
  };
  genBtn.addEventListener("click", generate);
  initGlassDropdown({
    btn: trainBtn,
    label: trainLabel,
    value: trainValue,
    options: bases.map((b) => {
      const l = (seatmapLayouts.find((x) => x.id === b) || {}).label || b;
      return { value: b, label: l };
    }),
    onPick: () => refreshDates(),
  });
  refreshDates();
  if (seatmapStatus) seatmapStatus.textContent = "请选择列车与开行日期，点击「生成座位图」查看结果。";
}

function seatmapRouteMeta(route) {
  const rec = seatmapRecords.find((r) => r.route === route);
  if (rec) return { label: rec.label || route, train: rec.train || "" };
  const base = String(route).replace(/\d+$/, "");
  const l = (seatmapLayouts.find((x) => x.id === base) || {}).label;
  return { label: l || route, train: "" };
}

async function showSeatmapSelection(date, route) {
  if (!date || !route) return;
  smSetProgress(true, 5, "准备生成…");
  if (seatmapStatus) seatmapStatus.textContent = "正在生成座位图…";
  if (seatmapRoot) seatmapRoot.innerHTML = "";
  try {
    const base = String(route).replace(/\d+$/, "");
    if (!seatmapLayouts.some((l) => l.id === base)) {
      smSetProgress(false);
      showSeatmapMessage(`「${seatmapRouteMeta(route).label || route}」的座位布局尚未配置，请先提供布局文件。`);
      return;
    }
    const record = seatmapRecords.find((r) => r.date === date && r.route === route) || null;
    let data = null;
    let summary = record ? (record.summary || {}) : { date: date };
    if (record && record.data_url) {
      smSetProgress(true, 35, "读取排座记录…");
      const dr = await fetch(apiUrl(record.data_url));
      if (dr.ok) {
        data = await dr.json();
      } else {
        showSeatmapMessage(`读取排座记录失败（HTTP ${dr.status}）`);
      }
    } else {
      showSeatmapMessage("该日期暂无排座记录，请先在「智能排座」完成排座。");
    }
    smSetProgress(true, 65, "加载列车布局…");
    const layoutResp = await fetch(apiUrl("/api/layout?train=" + encodeURIComponent(base)));
    if (!layoutResp.ok) {
      smSetProgress(false);
      showSeatmapMessage("布局加载失败，请稍后重试。");
      return;
    }
    const layout = await layoutResp.json();
    smSetProgress(true, 85, "渲染座位图…");
    renderSeatMap(layout, data, summary, seatmapLayouts, base);
    smSetProgress(false, 100, "完成");
  } catch (err) {
    smSetProgress(true, 100, "生成失败");
    showSeatmapMessage("生成失败：" + (err && err.message ? err.message : String(err)));
  }
}

function showSeatmapMessage(msg) {
  if (seatmapStatus) seatmapStatus.textContent = msg;
  if (seatmapRoot) seatmapRoot.innerHTML = "";
}

function smSetProgress(show, pct, stage) {
  if (smProgressEl) smProgressEl.classList.toggle("hidden", !show);
  if (smProgressBar) smProgressBar.style.width = (pct || 0) + "%";
  if (smProgressStage) smProgressStage.textContent = stage || "";
}

window.addEventListener("error", (e) => {
  if (seatmapStatus) seatmapStatus.textContent = "发生错误：" + (e && e.message ? e.message : "未知错误");
});

function initGlassDropdown(opts) {
  const popup = document.createElement("div");
  popup.className = "train-popup hidden";
  document.body.appendChild(popup);
  const render = () => {
    const cur = (opts.value.value || "").trim();
    popup.innerHTML = "";
    for (const o of opts.options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "train-option" + (o.value === cur ? " selected" : "");
      b.dataset.value = o.value;
      b.textContent = o.label;
      popup.appendChild(b);
    }
  };
  const open = () => {
    render();
    const r = opts.btn.getBoundingClientRect();
    popup.classList.remove("hidden");
    const pw = popup.offsetWidth || 280;
    const ph = popup.offsetHeight || 200;
    const gap = 12;
    const maxLeft = Math.max(gap, window.innerWidth - pw - gap);
    popup.style.left = Math.max(gap, Math.min(r.left, maxLeft)) + "px";
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - gap) top = Math.max(gap, r.top - ph - 8);
    popup.style.top = top + "px";
    opts.btn.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    popup.classList.add("hidden");
    opts.btn.setAttribute("aria-expanded", "false");
  };
  opts.btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (popup.classList.contains("hidden")) open(); else close();
  });
  popup.addEventListener("click", (e) => {
    const o = e.target.closest(".train-option");
    if (!o) return;
    opts.value.value = o.dataset.value;
    opts.label.textContent = o.textContent;
    close();
    if (opts.onPick) opts.onPick(o.dataset.value, o.textContent);
  });
  document.addEventListener("click", (e) => {
    if (!popup.contains(e.target) && e.target !== opts.btn && !e.target.closest(".train-wrap")) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", close);
}

function buildOccupancy(data, segNo) {
  const occ = {};
  for (const o of (data.orders || [])) {
    for (const m of (o.members || [])) {
      const seat = String(m.seat || "");
      if (!seat || seat === "无座") continue;
      const segs = Array.isArray(m.segs) && m.segs.length ? m.segs : null;
      if (segs && !segs.includes(segNo)) continue;
      const idno = String(m.idno || "");
      occ[seat] = {
        name: String(m.name || ""),
        id: idno.length >= 4 ? idno.slice(-4) : idno,
      };
    }
  }
  return occ;
}

function seatNoInRow(row) {
  for (const v of row) {
    const m = /^(\d+)[A-H]$/.exec(v);
    if (m) return Number(m[1]);
  }
  return null;
}

function renderSeatRow(row, occ, car, vipMode) {
  let html = `<div class="seat-row">`;
  for (let ci = 0; ci < row.length; ci++) {
    const v = row[ci];
    if (v === "多功能区") { html += `<div class="cell-multi-sep"></div>`; break; }
    if (v === "") { html += `<div class="cell cell-empty"></div>`; continue; }
    if (v === "桌" || v === "过道") {
      if (vipMode) { html += `<div class="cell cell-empty"></div>`; }
      else if (v === "桌") { html += `<div class="cell cell-table">桌</div>`; }
      else { html += `<div class="cell cell-aisle"></div>`; }
      continue;
    }
    if (/^\d+[A-H]$/.test(v)) {
      const code = seatCodeFor(car, v);
      const info = occ[code];
      if (info) {
        const tip = `${info.name} · ${info.id}`;
        html += `<div class="cell cell-seat occupied" data-tip="${escapeHtml(tip)}">${escapeHtml(v)}</div>`;
      } else {
        html += `<div class="cell cell-seat">${escapeHtml(v)}</div>`;
      }
      continue;
    }
    html += `<div class="cell cell-empty"></div>`;
  }
  html += `</div>`;
  return html;
}

function renderSeatBlock(rows, rowIndexes, car, occ) {
  const tables = Array.isArray(car.tables) ? car.tables : [];
  const covered = new Set();
  const html = [`<div class="seat-block">`];
  const first = rowIndexes[0];
  for (const t of tables) {
    if (t.r < first || t.r + t.rs > first + rowIndexes.length) continue;
    if (t.c < 0 || t.c + t.cs > 5) continue;
    for (let rr = t.r; rr < t.r + t.rs; rr++) {
      for (let cc = t.c; cc < t.c + t.cs; cc++) covered.add(rr + ":" + cc);
    }
    html.push(
      `<div class="cell cell-table table-block" style="grid-row: ${t.r - first + 1} / span ${t.rs}; grid-column: ${t.c + 1} / span ${t.cs}">桌</div>`
    );
  }
  for (let i = 0; i < rowIndexes.length; i++) {
    const ri = rowIndexes[i];
    const row = rows[ri];
    for (let ci = 0; ci < row.length; ci++) {
      if (covered.has(ri + ":" + ci)) continue;
      const v = row[ci];
      const pos = `grid-row: ${i + 1}; grid-column: ${ci + 1};`;
      if (v === "" || v == null) {
        html.push(`<div class="cell cell-empty" style="${pos}"></div>`);
        continue;
      }
      if (v === "过道") {
        html.push(`<div class="cell cell-aisle" style="${pos}"></div>`);
        continue;
      }
      if (v === "桌") {
        html.push(`<div class="cell cell-table" style="${pos}">桌</div>`);
        continue;
      }
      if (/^\d+[A-H]$/.test(v)) {
        const code = seatCodeFor(car, v);
        const info = occ[code];
        if (info) {
          const tip = `${info.name} · ${info.id}`;
          html.push(`<div class="cell cell-seat occupied" data-tip="${escapeHtml(tip)}" style="${pos}">${escapeHtml(v)}</div>`);
        } else {
          html.push(`<div class="cell cell-seat" style="${pos}">${escapeHtml(v)}</div>`);
        }
        continue;
      }
      html.push(`<div class="cell cell-empty" style="${pos}"></div>`);
    }
  }
  html.push(`</div>`);
  return html.join("");
}

function seatCodeFor(car, v) {
  const s = (car.seats || []).find((x) => x.label === v);
  return s ? s.code : `${car.no}车-${v}`;
}

function renderCarGrid(car, occ) {
  const rows = car.grid || [];
  const blocks = [];
  let cur = null;
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    if (row.includes("多功能区")) {
      if (cur) { blocks.push(cur); cur = null; }
      blocks.push({ type: "multi" });
      continue;
    }
    const no = seatNoInRow(row);
    if (no !== null) {
      if (!cur || cur.no !== no) {
        if (cur) blocks.push(cur);
        cur = { type: "rows", no: no, rows: [ri] };
      } else {
        cur.rows.push(ri);
      }
    } else if (cur) {
      cur.rows.push(ri);
    }
  }
  if (cur) blocks.push(cur);

  const vip = car.type === "vip";
  let html = `<div class="car-grid">`;
  let prevRows = false;
  for (const b of blocks) {
    if (b.type === "multi") {
      html += `<div class="cell-multi-sep"></div>`;
      prevRows = false;
      continue;
    }
    if (vip) {
      const seats = [];
      for (const ri of b.rows) {
        for (const v of rows[ri]) {
          if (/^\d+[A-H]$/.test(v)) seats.push(v);
        }
      }
      seats.sort();
      let inner = `<div class="vip-seats">`;
      for (const s of seats) {
        const code = seatCodeFor(car, s);
        const info = occ[code];
        if (info) {
          const tip = `${info.name} · ${info.id}`;
          inner += `<div class="cell cell-seat occupied" data-tip="${escapeHtml(tip)}">${escapeHtml(s)}</div>`;
        } else {
          inner += `<div class="cell cell-seat">${escapeHtml(s)}</div>`;
        }
      }
      inner += `</div>`;
      html += `<div class="seat-row vip-row">` +
        `<div class="cell cell-room" title="包厢${b.no}">包厢${b.no}</div>` +
        `<div class="vip-room">${inner}</div></div>`;
    } else {
      if (prevRows) html += `<div class="row-sep"></div>`;
      html += renderSeatBlock(rows, b.rows, car, occ);
    }
    prevRows = true;
  }
  html += `</div>`;
  return html;
}

function renderCars(layout, occ) {
  return (layout.cars || []).map((car) =>
    `<div class="car-block${car.type === "vip" ? " vip" : ""}">` +
      `<div class="car-head"><span class="car-name">${escapeHtml(car.name)}</span>` +
      `<span class="car-type">${car.type === "vip" ? "VIP 包厢" : "普通车厢"}</span></div>` +
      renderCarGrid(car, occ) +
    `</div>`).join("");
}

function renderNouse(data, segNo) {
  const list = [];
  for (const o of (data.orders || [])) {
    for (const m of (o.members || [])) {
      if (String(m.seat || "") !== "无座") continue;
      const segs = Array.isArray(m.segs) && m.segs.length ? m.segs : null;
      if (segs && !segs.includes(segNo)) continue;
      const idno = String(m.idno || "");
      list.push(`${escapeHtml(m.name || "")} · ${escapeHtml(idno.length >= 4 ? idno.slice(-4) : idno)}`);
    }
  }
  const box = document.getElementById("nouse-box");
  if (!box) return;
  box.innerHTML = list.length
    ? `<h3>无座乘客</h3><p class="nouse-list">${list.join("、")}</p>`
    : "";
}

function renderSeatMap(layout, data, summary, layouts, activeTrain) {
  const hasData = !!data && Array.isArray(data.orders);
  if (seatmapStatus) {
    seatmapStatus.textContent = hasData
      ? `${layout.label || ""} · ${data.date || summary.date || ""}`
      : `${layout.label || ""} · ${summary.date || ""} 暂无排座记录（空座位图）`;
  }
  let html = `<div class="seatmap-meta">` +
    `<div><span class="k">列车</span><span class="v">${escapeHtml(layout.label || "")}</span></div>` +
    `<div><span class="k">游玩日期</span><span class="v">${escapeHtml(data.date || summary.date || "—")}</span></div>` +
    (hasData
      ? `<div><span class="k">有座</span><span class="v">${summary.seated_tickets != null ? summary.seated_tickets : ""} 人次 / ${summary.seated_people != null ? summary.seated_people : ""} 人</span></div>` +
        `<div><span class="k">无座</span><span class="v">${summary.nouse_people != null ? summary.nouse_people : 0} 人</span></div>`
      : `<div><span class="k">状态</span><span class="v">暂无排座结果，当前展示空座位图</span></div>`) +
    `</div>`;
  let segLabels = [];
  if (hasData) {
    const segs = (Array.isArray(data.segments) && data.segments.length)
      ? data.segments : (Array.isArray(summary.segments) ? summary.segments : []);
    segLabels = segs.map((s, i) =>
      (typeof s === "string" && s) ? s : (s && s.pair ? s.pair : `段${i + 1}`));
    html += `<label class="sm-field seg-pick"><span>站间段</span><div class="train-wrap sm-seg-wrap">` +
      `<button type="button" class="glass-select" id="seg-select-btn" aria-haspopup="listbox" aria-expanded="false">` +
      `<span id="seg-select-label">段1 ${escapeHtml(segLabels[0] || "")}</span></button>` +
      `<input type="hidden" id="seg-select-value" value="0" /></div></label>`;
  }
  html += `<div class="seatmap-legend">` +
    `<span class="lg"><i class="swatch occupied"></i>已占座</span>` +
    `<span class="lg"><i class="swatch free"></i>空座</span>` +
    `<span class="lg"><i class="swatch table"></i>桌</span>` +
    `<span class="lg"><i class="swatch aisle"></i>过道</span>` +
    `</div>`;
  html += `<div class="train-layout" id="train-layout"></div>`;
  html += `<div class="nouse-box" id="nouse-box"></div>`;
  seatmapRoot.innerHTML = html;

  if (hasData) {
    const show = (idx) => {
      const occ = buildOccupancy(data, idx + 1);
      document.getElementById("train-layout").innerHTML = renderCars(layout, occ);
      renderNouse(data, idx + 1);
    };
    const segBtn = document.getElementById("seg-select-btn");
    if (segBtn) {
      initGlassDropdown({
        btn: segBtn,
        label: document.getElementById("seg-select-label"),
        value: document.getElementById("seg-select-value"),
        options: segLabels.map((s, i) => ({ value: String(i), label: `段${i + 1} ${s}` })),
        onPick: (v) => show(Number(v)),
      });
    }
    show(0);
  } else {
    document.getElementById("train-layout").innerHTML = renderCars(layout, {});
    const box = document.getElementById("nouse-box");
    if (box) box.innerHTML = "";
  }
}

// ---------- 玻璃日期选择器（替换原生日历弹窗） ----------
function initGlassDatePicker(input, calBtn) {
  if (!input) return;
  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
  const popup = document.createElement("div");
  popup.className = "date-popup hidden";
  document.body.appendChild(popup);
  let view = null;
  let allowed = null;

  function setAllowed(dates) {
    allowed = dates ? new Set(dates) : null;
  }

  function todayIso() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }

  function render() {
    const y = view.y, m = view.m;
    const startDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    let html =
      `<div class="date-popup-head">` +
      `<button type="button" class="date-nav" data-nav="-1">‹</button>` +
      `<span class="date-title">${y} 年 ${m + 1} 月</span>` +
      `<button type="button" class="date-nav" data-nav="1">›</button></div>` +
      `<div class="date-week">${WEEK.map((w) => `<span>${w}</span>`).join("")}</div>` +
      `<div class="date-grid">`;
    for (let i = 0; i < startDow; i++) html += `<span class="date-cell empty"></span>`;
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const disabled = allowed && !allowed.has(iso);
      const cls = ["date-cell", disabled ? "disabled" : "", iso === input.value ? "selected" : "", iso === todayIso() ? "today" : ""]
        .filter(Boolean).join(" ");
      html += `<button type="button" class="${cls}" data-date="${iso}"${disabled ? " disabled" : ""}>${d}</button>`;
    }
    html += `</div>`;
    popup.innerHTML = html;
  }

  function open() {
    const now = input.value ? new Date(input.value + "T00:00:00") : new Date();
    view = { y: now.getFullYear(), m: now.getMonth() };
    render();
    const r = input.getBoundingClientRect();
    popup.classList.remove("hidden");
    const pw = popup.offsetWidth || 300;
    const ph = popup.offsetHeight || 260;
    const gap = 12;
    const maxLeft = Math.max(gap, window.innerWidth - pw - gap);
    popup.style.left = Math.max(gap, Math.min(r.left, maxLeft)) + "px";
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - gap) {
      top = Math.max(gap, r.top - ph - 8);
    }
    popup.style.top = top + "px";
  }
  function close() { popup.classList.add("hidden"); }

  popup.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      view.m += Number(nav.dataset.nav);
      if (view.m < 0) { view.m = 11; view.y--; }
      if (view.m > 11) { view.m = 0; view.y++; }
      render();
      return;
    }
    const cell = e.target.closest("[data-date]");
    if (cell) {
      input.value = cell.dataset.date;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      close();
    }
  });

  input.addEventListener("click", open);
  input.addEventListener("focus", open);
  const btn = calBtn || document.getElementById("date-cal-btn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (popup.classList.contains("hidden")) open(); else close();
    });
  }
  document.addEventListener("click", (e) => {
    if (!popup.contains(e.target) && e.target !== input && !e.target.closest(".date-cal-btn")) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", close);
  return { setAllowed: setAllowed };
}

// ---------- 座位查询模块 ----------
let seatQueryLoaded = false;
let sqRecords = [];
let sqLayouts = [];

async function loadSeatQuery() {
  if (!seatQueryForm || seatQueryLoaded) return;
  seatQueryLoaded = true;
  if (sqStatus) sqStatus.textContent = "加载中…";
  try {
    let options = [];
    if (GUEST_MODE) {
      const resp = await fetch(apiUrl("/api/query/options"));
      const d = resp.ok ? await resp.json() : null;
      options = (d && d.ok && Array.isArray(d.trains)) ? d.trains : [];
      sqLayouts = [];
      sqRecords = [];
      if (!options.length) {
        if (sqStatus) sqStatus.textContent = "暂无可查询的排座记录。";
        return;
      }
    } else {
      const [layoutsResp, recordsResp] = await Promise.all([
        fetch(apiUrl("/api/layouts")),
        fetch(apiUrl("/api/records")),
      ]);
      sqLayouts = (layoutsResp.ok ? (await layoutsResp.json()).layouts : []) || [];
      sqRecords = (recordsResp.ok ? (await recordsResp.json()).records : []) || [];
      if (!sqRecords.length) {
        if (sqStatus) sqStatus.textContent = "暂无已生成的排座记录，请先在「智能排座」完成排座后再查询。";
        return;
      }
      const bases = [...new Set(sqRecords.map((r) => String(r.route).replace(/\d+$/, "")))];
      options = bases.map((b) => {
        const l = (sqLayouts.find((x) => x.id === b) || {}).label || b;
        return {
          id: b,
          name: l,
          label: l,
          dates: [...new Set(
            sqRecords
              .filter((r) => String(r.route).replace(/\d+$/, "") === b)
              .map((r) => r.date)
          )].sort().reverse(),
        };
      });
    }
    const trainBtn = document.getElementById("sq-train-btn");
    const trainLabel = document.getElementById("sq-train-label");
    const trainValue = document.getElementById("sq-train-value");
    const dateInput = document.getElementById("sq-date-input");
    const dateCalBtn = document.getElementById("sq-date-cal-btn");
    const datePicker = initGlassDatePicker(dateInput, dateCalBtn);
    const refreshDates = () => {
      const base = trainValue.value;
      const opt = options.find((o) => o.id === base);
      const dates = (opt && Array.isArray(opt.dates)) ? opt.dates : [];
      datePicker.setAllowed(dates);
      if (!dates.includes(dateInput.value)) {
        dateInput.value = dates[0] || "";
        dateInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (sqStatus) sqStatus.textContent = "选择车辆与出行日期后，输入姓名和身份证后四位即可查询。";
    };
    initGlassDropdown({
      btn: trainBtn,
      label: trainLabel,
      value: trainValue,
      options: options.map((o) => ({ value: o.id, label: o.label || o.name || o.id })),
      onPick: () => refreshDates(),
    });
    refreshDates();
  } catch (err) {
    seatQueryLoaded = false;
    if (sqStatus) sqStatus.textContent = "座位查询加载失败：" + (err && err.message ? err.message : String(err));
  }
}

function renderSeatQueryResult(data) {
  const list = data.results || [];
  const meta =
    `<div class="sq-result-meta">` +
    `<div><span class="k">车辆</span><span class="v">${escapeHtml(data.train || data.label || "")}</span></div>` +
    `<div><span class="k">出行日期</span><span class="v">${escapeHtml(data.date || "")}</span></div>` +
    `<div><span class="k">交路</span><span class="v">${escapeHtml(data.label || "")}</span></div>` +
    `</div>`;
  const cards = list.map((r) => {
    const segs = (r.segments || []).map((s) => s.pair).filter(Boolean).join("、") || "全程";
    return `<div class="sq-card">` +
      `<div class="sq-name">${escapeHtml(r.name)}</div>` +
      `<div class="sq-grid">` +
        `<div><span class="k">行程</span><span class="v">${escapeHtml(segs)}</span></div>` +
        (r.has_seat
          ? `<div><span class="k">车厢</span><span class="v">${escapeHtml(r.car || "—")}</span></div>` +
            `<div><span class="k">座位号</span><span class="v">${escapeHtml(r.seat || "—")}</span></div>`
          : `<div><span class="k">座位</span><span class="v">无座</span></div>`) +
        (r.ticket ? `<div><span class="k">票号</span><span class="v">${escapeHtml(r.ticket)}</span></div>` : "") +
      `</div>` +
    `</div>`;
  }).join("");
  sqResult.innerHTML = `<h3>查询结果（${list.length} 条）</h3>${meta}${cards}`;
  sqResult.classList.remove("hidden");
}

if (seatQueryForm) {
  seatQueryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(sqErrorBox);
    const train = document.getElementById("sq-train-value").value.trim();
    const date = document.getElementById("sq-date-input").value.trim();
    const name = document.getElementById("sq-name").value.trim();
    const id4 = document.getElementById("sq-id4").value.trim();
    if (!train) { showError(sqErrorBox, "请选择车辆"); return; }
    if (!date) { showError(sqErrorBox, "请选择出行日期"); return; }
    if (!name) { showError(sqErrorBox, "请输入姓名"); return; }
    if (!/^[0-9A-Za-z]{4}$/.test(id4)) {
      showError(sqErrorBox, "请输入身份证号后四位（4 位数字或字母）");
      return;
    }
    sqResult.classList.add("hidden");
    sqResult.innerHTML = "";
    sqSubmitBtn.disabled = true;
    sqSubmitBtn.textContent = "查询中…";
    try {
      const q = new URLSearchParams({ train, date, name, id4 });
      const resp = await fetch(apiUrl("/api/query?" + q.toString()));
      const data = await resp.json();
      if (!data.ok) {
        showError(sqErrorBox, data.error || "查询失败");
        return;
      }
      renderSeatQueryResult(data);
    } catch (err) {
      showError(sqErrorBox, "网络错误：" + err.message);
    } finally {
      sqSubmitBtn.disabled = false;
      sqSubmitBtn.textContent = "查询座位";
    }
  });
}

initGlassDatePicker(document.querySelector('input[type="date"][name="date"]'));
