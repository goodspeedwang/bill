// 记账本 —— 纯静态前端 + Supabase Auth（邮箱密码），依赖 config.js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = ["餐饮", "交通", "购物", "居住", "娱乐", "医疗", "教育", "工资", "其他"];

// 操作列图标（SVG，省空间且跨平台一致）
const ICON_EDIT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICON_DEL  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_CLOSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const $ = (id) => document.getElementById(id);
let viewYear, viewMonth; // viewMonth: 1-12
let editingId = null;
let appReady = false;

// ---------- 工具 ----------
function pad(n) { return n < 10 ? "0" + n : "" + n; }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function esc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------- 认证（用户由 Supabase 后台手动创建，这里只登录）----------
async function handleAuth() {
  const email = $("email").value.trim();
  const password = $("password").value;
  $("authMsg").textContent = "";
  if (!email || !password) {
    $("authMsg").textContent = "请输入邮箱和密码。";
    return;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { $("authMsg").textContent = error.message; return; }
  enterApp(); // 登录成功，auth 状态变化也会触发 onAuthStateChange
}

$("authBtn").onclick = handleAuth;
["email", "password"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") handleAuth(); })
);

async function signOut() {
  await sb.auth.signOut();
  showAuth();
}

function showAuth() {
  $("app").classList.add("hidden");
  $("auth").classList.remove("hidden");
}
function enterApp() {
  $("auth").classList.add("hidden");
  $("app").classList.remove("hidden");
  if (!appReady) initApp();
}
function initApp() {
  appReady = true;

  const sel = $("f_category");
  CATEGORIES.forEach((c) => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
  $("f_date").value = todayStr();

  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth() + 1;
  renderMonthLabel();
  loadMonth();

  $("prevMonth").onclick = () => shiftMonth(-1);
  $("nextMonth").onclick = () => shiftMonth(1);
  $("addForm").onsubmit = onAdd;
}

// 登录态变化时自动切换界面
sb.auth.onAuthStateChange((_event, session) => {
  if (session && session.user) enterApp();
  else showAuth();
});

// 启动：根据当前会话决定显示登录框还是应用
sb.auth.getSession().then(({ data }) => {
  if (data.session && data.session.user) enterApp();
  else showAuth();
});

// ---------- 月份导航 ----------
function shiftMonth(d) {
  let m = viewMonth + d, y = viewYear;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  viewYear = y; viewMonth = m;
  renderMonthLabel();
  loadMonth();
}
function renderMonthLabel() {
  $("monthLabel").textContent = `${viewYear} 年 ${viewMonth} 月`;
}

// ---------- 加载与渲染 ----------
async function loadMonth() {
  const start = `${viewYear}-${pad(viewMonth)}-01`;
  const last = new Date(viewYear, viewMonth, 0).getDate();
  const end = `${viewYear}-${pad(viewMonth)}-${pad(last)}`;

  const { data, error } = await sb
    .from("transactions")
    .select("*")
    .gte("transaction_date", start)
    .lte("transaction_date", end)
    .order("transaction_date", { ascending: false });

  if (error) { alert("加载失败：" + error.message); return; }
  renderRows(data || []);
}

function renderRows(rows) {
  const body = $("txnBody");
  body.innerHTML = "";
  let total = 0;
  rows.forEach((r) => { total += Number(r.amount); body.appendChild(renderRow(r)); });
  $("monthTotal").textContent = total.toFixed(2);
  $("emptyHint").classList.toggle("hidden", rows.length > 0);
}

function renderRow(r) {
  const tr = document.createElement("tr");
  if (editingId === r.id) {
    tr.innerHTML = `
      <td><input type="date" class="e_date" value="${esc(r.transaction_date)}"></td>
      <td><select class="e_category">${CATEGORIES.map((c) =>
        `<option ${c === r.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></td>
      <td class="num"><input type="number" step="0.01" min="0.01" class="e_amount" value="${esc(r.amount)}"></td>
      <td><input type="text" class="e_desc" value="${esc(r.description)}"></td>
      <td><button class="save" title="保存" aria-label="保存">${ICON_CHECK}</button><button class="cancel" title="取消" aria-label="取消">${ICON_CLOSE}</button></td>`;
    tr.querySelector(".save").onclick = () => onSave(r.id, tr);
    tr.querySelector(".cancel").onclick = () => { editingId = null; loadMonth(); };
  } else {
    tr.innerHTML = `
      <td>${esc(r.transaction_date)}</td>
      <td>${esc(r.category)}</td>
      <td class="num">${Number(r.amount).toFixed(2)}</td>
      <td class="desc">${esc(r.description)}</td>
      <td><button class="edit" title="编辑" aria-label="编辑">${ICON_EDIT}</button><button class="del" title="删除" aria-label="删除">${ICON_DEL}</button></td>`;
    tr.querySelector(".edit").onclick = () => { editingId = r.id; loadMonth(); };
    tr.querySelector(".del").onclick = () => onDelete(r.id);
  }
  return tr;
}

// ---------- 增删改 ----------
async function onAdd(e) {
  e.preventDefault();
  const payload = {
    amount: parseFloat($("f_amount").value),
    category: $("f_category").value,
    description: $("f_desc").value.trim() || null,
    transaction_date: $("f_date").value,
  };
  const { error } = await sb.from("transactions").insert(payload);
  if (error) { alert("添加失败：" + error.message); return; }
  $("f_amount").value = "";
  $("f_desc").value = "";
  $("f_date").value = todayStr();
  loadMonth();
}

async function onSave(id, tr) {
  const payload = {
    amount: parseFloat(tr.querySelector(".e_amount").value),
    category: tr.querySelector(".e_category").value,
    description: tr.querySelector(".e_desc").value.trim() || null,
    transaction_date: tr.querySelector(".e_date").value,
  };
  const { error } = await sb.from("transactions").update(payload).eq("id", id);
  if (error) { alert("保存失败：" + error.message); return; }
  editingId = null;
  loadMonth();
}

async function onDelete(id) {
  if (!confirm("确定删除这笔记录？")) return;
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) { alert("删除失败：" + error.message); return; }
  loadMonth();
}
