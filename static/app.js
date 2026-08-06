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

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalOk = document.getElementById("modal-ok");
const modalCancel = document.getElementById("modal-cancel");
const modalConfirm = document.getElementById("modal-confirm");

const originInfo = document.getElementById("origin-info");
if (originInfo) originInfo.textContent = "页面来源：" + location.origin;

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

function populateTrains() {
  const sel = seatForm.train;
  const list = (SCHEDULE && SCHEDULE.trains) || [
    { id: "wuyishan", name: "武夷山国家公园主题观光列车" },
    { id: "shangrao", name: "大美上饶主题观光列车" },
  ];
  sel.innerHTML = '<option value="">请选择列车</option>';
  for (const t of list) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
}
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
  const msg =
    `确认开始排座？\n` +
    `· 游客信息表：${file ? file.name : "（未选择）"}\n` +
    `· 订单维度表：${orders ? orders.name : "（未提供，将回退游客表信息）"}\n` +
    `· 列车：${seatForm.train.value}\n· 游玩日期：${seatForm.date.value}`;
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

// ---------- 动态毛玻璃光效（跟随鼠标） ----------
const sheen = document.getElementById("liquid-sheen");
if (sheen) {
  document.addEventListener("pointermove", (e) => {
    sheen.style.background =
      `radial-gradient(480px circle at ${e.clientX}px ${e.clientY}px, rgba(255,255,255,0.04), transparent 65%)`;
  });
}

// ---------- 玻璃日期选择器（替换原生日历弹窗） ----------
function initGlassDatePicker(input) {
  if (!input) return;
  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
  const popup = document.createElement("div");
  popup.className = "date-popup hidden";
  document.body.appendChild(popup);
  let view = null;

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
      const cls = ["date-cell", iso === input.value ? "selected" : "", iso === todayIso() ? "today" : ""]
        .filter(Boolean).join(" ");
      html += `<button type="button" class="${cls}" data-date="${iso}">${d}</button>`;
    }
    html += `</div>`;
    popup.innerHTML = html;
  }

  function open() {
    const now = input.value ? new Date(input.value + "T00:00:00") : new Date();
    view = { y: now.getFullYear(), m: now.getMonth() };
    render();
    const r = input.getBoundingClientRect();
    popup.style.left = Math.min(r.left, window.innerWidth - 320) + "px";
    popup.style.top = (r.bottom + 8) + "px";
    popup.classList.remove("hidden");
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
  const btn = document.getElementById("date-cal-btn");
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
}

initGlassDatePicker(document.querySelector('input[type="date"][name="date"]'));
