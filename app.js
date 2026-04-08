const STORAGE_KEY = "inventory-app-v1";

const state = {
  operator: "",
  procedure: "",
  items: [],
  history: [],
};

const currentOperator = document.getElementById("currentOperator");
const procedure = document.getElementById("procedure");
const saveProcedureBtn = document.getElementById("saveProcedureBtn");
const itemForm = document.getElementById("itemForm");
const itemSelect = document.getElementById("itemSelect");
const transactionForm = document.getElementById("transactionForm");
const itemTableBody = document.getElementById("itemTableBody");
const historyTableBody = document.getElementById("historyTableBody");
const txType = document.getElementById("txType");
const txAmount = document.getElementById("txAmount");
const txNote = document.getElementById("txNote");

const operatorDialog = document.getElementById("operatorDialog");
const operatorForm = document.getElementById("operatorForm");
const operatorInput = document.getElementById("operatorInput");
const changeOperatorBtn = document.getElementById("changeOperatorBtn");
const cancelOperatorBtn = document.getElementById("cancelOperatorBtn");
const m1AlertDialog = document.getElementById("m1AlertDialog");
const m1AlertMessage = document.getElementById("m1AlertMessage");
const closeM1AlertBtn = document.getElementById("closeM1AlertBtn");

const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");

function activateTab(tabName) {
  for (const tab of tabs) {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  }

  for (const page of pages) {
    page.classList.toggle("active", page.dataset.page === tabName);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const parsed = JSON.parse(raw);
  state.operator = parsed.operator || "";
  state.procedure = parsed.procedure || "";
  state.items = Array.isArray(parsed.items)
    ? parsed.items.map((item) => ({
        ...item,
        minimum: Math.max(0, Number(item.minimum) || 0),
        count: Math.max(0, Number(item.count) || 0),
      }))
    : [];
  state.history = Array.isArray(parsed.history) ? parsed.history : [];
}

function addHistory(content) {
  state.history.unshift({
    time: new Date().toLocaleString("ja-JP"),
    operator: state.operator,
    content,
  });

  if (state.history.length > 500) {
    state.history.length = 500;
  }
}

function render() {
  currentOperator.textContent = state.operator || "未設定";
  procedure.value = state.procedure;

  itemSelect.innerHTML = "";
  for (const item of state.items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name}（棚:${item.shelf} / 在庫:${item.count}）`;
    itemSelect.appendChild(option);
  }

  itemTableBody.innerHTML = "";
  for (const item of state.items) {
    const row = document.createElement("tr");
    const isLow = item.count <= item.minimum;
    if (isLow) {
      row.classList.add("low-stock");
    }
    row.innerHTML = `<td>${item.name}</td><td>${item.maker || "-"}</td><td>${item.shelf}</td><td>${item.count}</td><td>${item.minimum}</td><td>${item.memo || "-"}</td>`;
    itemTableBody.appendChild(row);
  }

  historyTableBody.innerHTML = "";
  for (const record of state.history) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${record.time}</td><td>${record.operator}</td><td>${record.content}</td>`;
    historyTableBody.appendChild(row);
  }

  txAmount.placeholder = txType.value === "count" ? "現在の実数" : "増減の数量";
}

function requireOperator() {
  if (!state.operator) {
    operatorInput.value = "";
    operatorDialog.showModal();
    return false;
  }
  return true;
}

function showM1Alert(item) {
  m1AlertMessage.textContent = `${item.name} の在庫が最低数(${item.minimum})以下です。M1に報告してください。`;
  if (!m1AlertDialog.open) {
    m1AlertDialog.showModal();
  }
}

function setupEvents() {
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
    });
  }

  saveProcedureBtn.addEventListener("click", () => {
    if (!requireOperator()) return;

    state.procedure = procedure.value.trim();
    addHistory("棚卸し手順を更新");
    persist();
    render();
  });

  itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireOperator()) return;

    const formData = new FormData(itemForm);
    const name = String(formData.get("name") || "").trim();
    const maker = String(formData.get("maker") || "").trim();
    const shelf = String(formData.get("shelf") || "").trim();
    const count = Number(formData.get("count") || 0);
    const minimum = Number(formData.get("minimum") || 0);
    const memo = String(formData.get("memo") || "").trim();

    const item = {
      id: crypto.randomUUID(),
      name,
      maker,
      shelf,
      count: Math.max(0, count),
      minimum: Math.max(0, minimum),
      memo,
    };

    state.items.push(item);
    addHistory(`品目登録: ${name} / メーカー:${maker || "-"} / 棚:${shelf} / 初期数:${item.count} / 最低数:${item.minimum}`);
    persist();
    render();
    itemForm.reset();

    if (item.count <= item.minimum) {
      showM1Alert(item);
    }
  });

  transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireOperator()) return;

    const item = state.items.find((entry) => entry.id === itemSelect.value);
    if (!item) return;

    const amount = Number(txAmount.value);
    if (!Number.isFinite(amount) || amount < 0) return;

    const type = txType.value;
    const note = txNote.value.trim();

    let message = "";
    if (type === "add") {
      item.count += amount;
      message = `入庫: ${item.name} +${amount}`;
    } else if (type === "remove") {
      item.count = Math.max(0, item.count - amount);
      message = `出庫: ${item.name} -${amount}`;
    } else {
      item.count = amount;
      message = `棚卸し: ${item.name} を ${amount} に更新`;
    }

    if (note) message += ` / メモ: ${note}`;

    addHistory(message);
    persist();
    render();
    transactionForm.reset();

    if (item.count <= item.minimum) {
      showM1Alert(item);
    }
  });

  txType.addEventListener("change", () => render());

  changeOperatorBtn.addEventListener("click", () => {
    operatorInput.value = state.operator;
    operatorDialog.showModal();
  });

  operatorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = operatorInput.value.trim();
    if (!name) return;

    state.operator = name;
    persist();
    render();
    operatorDialog.close();
  });

  cancelOperatorBtn.addEventListener("click", () => {
    operatorDialog.close();
  });

  m1AlertDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
  });

  closeM1AlertBtn.addEventListener("click", () => {
    m1AlertDialog.close();
  });
}

load();
setupEvents();
activateTab("stock");
render();

if (!state.operator) {
  operatorDialog.showModal();
}