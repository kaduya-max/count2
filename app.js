const STORAGE_KEY = "inventory-app-v1";

const state = {
  operator: "",
  items: [],
  history: [],
};

const operatorInlineInput = document.getElementById("operatorInlineInput");
const operatorSetupInput = document.getElementById("operatorSetupInput");
const itemForm = document.getElementById("itemForm");
const itemSelect = document.getElementById("itemSelect");
const operationShelfFilter = document.getElementById("operationShelfFilter");
const listShelfFilter = document.getElementById("listShelfFilter");
const transactionForm = document.getElementById("transactionForm");
const itemTableBody = document.getElementById("itemTableBody");
const historyAddBody = document.getElementById("historyAddBody");
const historyCountBody = document.getElementById("historyCountBody");
const historyRemoveBody = document.getElementById("historyRemoveBody");
const historyRegisterBody = document.getElementById("historyRegisterBody");
const txType = document.getElementById("txType");
const txAmount = document.getElementById("txAmount");
const txUnit = document.getElementById("txUnit");
const txNote = document.getElementById("txNote");

const editItemDialog = document.getElementById("editItemDialog");
const editItemForm = document.getElementById("editItemForm");
const editName = document.getElementById("editName");
const editMaker = document.getElementById("editMaker");
const editShelf = document.getElementById("editShelf");
const editCount = document.getElementById("editCount");
const editUnit = document.getElementById("editUnit");
const editMinimum = document.getElementById("editMinimum");
const editMemo = document.getElementById("editMemo");
const deleteItemBtn = document.getElementById("deleteItemBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const m1AlertDialog = document.getElementById("m1AlertDialog");
const m1AlertMessage = document.getElementById("m1AlertMessage");
const closeM1AlertBtn = document.getElementById("closeM1AlertBtn");

const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");

let editingItemId = "";

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

function normalizeItem(item) {
  const unit = String(item.unit ?? "").trim() || "箱";
  return {
    id: item.id,
    name: String(item.name ?? "").trim(),
    maker: String(item.maker ?? "").trim(),
    shelf: String(item.shelf ?? "").trim(),
    count: Math.max(0, Number(item.count) || 0),
    unit,
    minimum: Math.max(0, Number(item.minimum) || 0),
    memo: String(item.memo ?? "").trim(),
  };
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const parsed = JSON.parse(raw);
  state.operator = parsed.operator || "";
  state.items = Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : [];
  state.history = Array.isArray(parsed.history) ? parsed.history : [];
}

function addHistory(type, content) {
  state.history.unshift({
    type,
    time: new Date().toLocaleString("ja-JP"),
    operator: state.operator,
    content,
  });

  if (state.history.length > 500) {
    state.history.length = 500;
  }
}

function rowFromRecord(record) {
  const row = document.createElement("tr");
  const timeCell = document.createElement("td");
  const operatorCell = document.createElement("td");
  const contentCell = document.createElement("td");

  timeCell.textContent = String(record.time ?? "");
  operatorCell.textContent = String(record.operator ?? "");
  contentCell.textContent = String(record.content ?? "");

  row.append(timeCell, operatorCell, contentCell);
  return row;
}

function compareShelf(a, b) {
  return a.shelf.localeCompare(b.shelf, "ja", { numeric: true, sensitivity: "base" });
}

function operationFilteredItems() {
  const shelf = operationShelfFilter.value;
  const sorted = [...state.items].sort(compareShelf);
  if (!shelf) return sorted;
  return sorted.filter((item) => item.shelf === shelf);
}

function renderShelfFilterOptions(filterElement) {
  const current = filterElement.value;
  const shelves = Array.from(new Set(state.items.map((item) => item.shelf))).sort((a, b) =>
    a.localeCompare(b, "ja", { numeric: true, sensitivity: "base" }),
  );

  filterElement.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "すべて";
  filterElement.appendChild(allOption);

  for (const shelf of shelves) {
    const option = document.createElement("option");
    option.value = shelf;
    option.textContent = shelf;
    filterElement.appendChild(option);
  }

  filterElement.value = shelves.includes(current) ? current : "";
}

function listFilteredItems() {
  const shelf = listShelfFilter.value;
  const sorted = [...state.items].sort(compareShelf);
  if (!shelf) return sorted;
  return sorted.filter((item) => item.shelf === shelf);
}

function isLowStock(item) {
  return item.count <= item.minimum;
}

function renderItemSelect() {
  itemSelect.innerHTML = "";
  const candidates = operationFilteredItems();

  for (const item of candidates) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name}（メーカー:${item.maker || "-"} / 棚:${item.shelf} / 在庫:${item.count}${item.unit}）`;
    itemSelect.appendChild(option);
  }

  const hasItems = candidates.length > 0;
  itemSelect.disabled = !hasItems;
  transactionForm.querySelector("button[type='submit']").disabled = !hasItems;
}

function renderItemTable() {
  itemTableBody.innerHTML = "";

  for (const item of listFilteredItems()) {
    const row = document.createElement("tr");
    if (isLowStock(item)) {
      row.classList.add("low-stock");
    }

    row.innerHTML = `<td>${item.name}</td><td>${item.maker || "-"}</td><td>${item.shelf}</td><td>${item.count}</td><td>${item.unit}</td><td>${item.minimum}</td><td>${item.memo || "-"}</td>`;

    const actionCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "edit-btn";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => openEditDialog(item.id));
    actionCell.appendChild(editBtn);
    row.appendChild(actionCell);

    itemTableBody.appendChild(row);
  }
}

function renderHistory() {
  historyAddBody.innerHTML = "";
  historyCountBody.innerHTML = "";
  historyRemoveBody.innerHTML = "";
  historyRegisterBody.innerHTML = "";

  for (const record of state.history) {
    if (record.type === "add") {
      historyAddBody.appendChild(rowFromRecord(record));
    } else if (record.type === "count") {
      historyCountBody.appendChild(rowFromRecord(record));
    } else if (record.type === "remove") {
      historyRemoveBody.appendChild(rowFromRecord(record));
    } else if (record.type === "register") {
      historyRegisterBody.appendChild(rowFromRecord(record));
    }
  }
}

function render() {
  operatorInlineInput.value = state.operator;
  operatorSetupInput.value = state.operator;

  renderShelfFilterOptions(operationShelfFilter);
  renderShelfFilterOptions(listShelfFilter);
  renderItemSelect();
  renderItemTable();
  renderHistory();

  txAmount.placeholder = txType.value === "count" ? "現在の実数" : "増減の数量";
  const selectedItem = state.items.find((entry) => entry.id === itemSelect.value);
  txUnit.value = selectedItem?.unit || "箱";
}

function updateOperatorFromInline() {
  const name = operatorInlineInput.value.trim();
  if (!name) return false;

  state.operator = name;
  persist();
  return true;
}

function updateOperatorFromSetup() {
  const name = operatorSetupInput.value.trim();
  if (!name) return false;

  state.operator = name;
  persist();
  return true;
}

function requireOperatorFromStock() {
  if (updateOperatorFromInline()) return true;
  alert("在庫操作の中の『記入者名』を入力してください。");
  return false;
}

function requireOperatorFromSetup() {
  if (updateOperatorFromSetup()) return true;
  alert("品目登録の上にある『記入者名』を入力してください。");
  return false;
}

function showM1Alert(item) {
  m1AlertMessage.textContent = `${item.name} の在庫が最低数(${item.minimum})以下です。M1に報告してください。`;
  if (!m1AlertDialog.open) {
    m1AlertDialog.showModal();
  }
}

function openEditDialog(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  editingItemId = itemId;
  editName.value = item.name;
  editMaker.value = item.maker;
  editShelf.value = item.shelf;
  editCount.value = item.count;
  editUnit.value = item.unit;
  editMinimum.value = item.minimum;
  editMemo.value = item.memo;
  editItemDialog.showModal();
}

function closeEditDialog() {
  editingItemId = "";
  editItemDialog.close();
}

function setupEvents() {
  for (const tab of tabs) {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  }

  operatorInlineInput.addEventListener("change", () => {
    const name = operatorInlineInput.value.trim();
    if (!name) return;
    state.operator = name;
    persist();
    render();
  });

  operatorSetupInput.addEventListener("change", () => {
    const name = operatorSetupInput.value.trim();
    if (!name) return;
    state.operator = name;
    persist();
    render();
  });

  operationShelfFilter.addEventListener("change", () => {
    renderItemSelect();
  });

  itemSelect.addEventListener("change", () => {
    const item = state.items.find((entry) => entry.id === itemSelect.value);
    if (!item) return;
    txUnit.value = item.unit;
  });

  listShelfFilter.addEventListener("change", () => {
    renderItemTable();
  });

  itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireOperatorFromSetup()) return;

    const formData = new FormData(itemForm);
    const name = String(formData.get("name") || "").trim();
    const maker = String(formData.get("maker") || "").trim();
    const shelf = String(formData.get("shelf") || "").trim();
    const count = Math.max(0, Number(formData.get("count") || 0));
    const unit = String(formData.get("unit") || "").trim() || "箱";
    const minimum = Math.max(0, Number(formData.get("minimum") || 0));
    const memo = String(formData.get("memo") || "").trim();

    const item = {
      id: crypto.randomUUID(),
      name,
      maker,
      shelf,
      count,
      unit,
      minimum,
      memo,
    };

    state.items.push(item);
    addHistory("register", `${name} / メーカー:${maker || "-"} / 棚:${shelf} / 初期数:${count}${item.unit} / 最低数:${minimum}`);
    persist();
    itemForm.reset();
    render();

    if (isLowStock(item)) {
      showM1Alert(item);
    }
  });

  transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireOperatorFromStock()) return;

    const item = state.items.find((entry) => entry.id === itemSelect.value);
    if (!item) return;

    const amount = Number(txAmount.value);
    if (!Number.isFinite(amount) || amount < 0) return;

    const type = txType.value;
    const unit = txUnit.value.trim() || "箱";
    const note = txNote.value.trim();
    item.unit = unit;

    if (type === "remove") {
      item.count = Math.max(0, item.count - amount);
      addHistory("remove", `${item.name} / 数量:-${amount}${unit}${note ? ` / メモ: ${note}` : ""}`);
    } else if (type === "add") {
      item.count += amount;
      addHistory("add", `${item.name} / 数量:+${amount}${unit}${note ? ` / メモ: ${note}` : ""}`);
    } else {
      item.count = amount;
      addHistory("count", `${item.name} / 実数:${amount}${unit}${note ? ` / メモ: ${note}` : ""}`);
    }

    persist();
    transactionForm.reset();
    operatorInlineInput.value = state.operator;
    render();

    if (isLowStock(item)) {
      showM1Alert(item);
    }
  });

  txType.addEventListener("change", () => render());

  editItemForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const item = state.items.find((entry) => entry.id === editingItemId);
    if (!item) {
      closeEditDialog();
      return;
    }

    item.name = editName.value.trim();
    item.maker = editMaker.value.trim();
    item.shelf = editShelf.value.trim();
    item.count = Math.max(0, Number(editCount.value) || 0);
    item.unit = editUnit.value.trim() || "箱";
    item.minimum = Math.max(0, Number(editMinimum.value) || 0);
    item.memo = editMemo.value.trim();

    persist();
    render();
    closeEditDialog();

    if (isLowStock(item)) {
      showM1Alert(item);
    }
  });

  deleteItemBtn.addEventListener("click", () => {
    if (!editingItemId) return;

    const item = state.items.find((entry) => entry.id === editingItemId);
    if (!item) {
      closeEditDialog();
      return;
    }

    const ok = confirm(`「${item.name}」を在庫一覧から削除します。よろしいですか？`);
    if (!ok) return;

    state.items = state.items.filter((entry) => entry.id !== editingItemId);
    persist();
    render();
    closeEditDialog();
  });

  cancelEditBtn.addEventListener("click", closeEditDialog);

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
