const STORAGE_KEY = "paytable_system_v2";

const appState = {
  tables: [],
  history: [],
  activeTableId: null,
  lastSummary: null
};

const els = {
  navOpenTables: document.getElementById("navOpenTables"),
  navHistory: document.getElementById("navHistory"),
  newTableBtn: document.getElementById("newTableBtn"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  printBtn: document.getElementById("printBtn"),
  downloadBtn: document.getElementById("downloadBtn"),

  tablesView: document.getElementById("tablesView"),
  historyView: document.getElementById("historyView"),
  tableDetailView: document.getElementById("tableDetailView"),
  openTablesGrid: document.getElementById("openTablesGrid"),
  historyList: document.getElementById("historyList"),

  tableModal: document.getElementById("tableModal"),
  newTableName: document.getElementById("newTableName"),
  cancelNewTableBtn: document.getElementById("cancelNewTableBtn"),
  createTableBtn: document.getElementById("createTableBtn"),

  activeTableName: document.getElementById("activeTableName"),
  activeTableMeta: document.getElementById("activeTableMeta"),
  backToTablesBtn: document.getElementById("backToTablesBtn"),
  taxPercent: document.getElementById("taxPercent"),
  tipPercent: document.getElementById("tipPercent"),
  tipMode: document.getElementById("tipMode"),

  personName: document.getElementById("personName"),
  addPersonBtn: document.getElementById("addPersonBtn"),
  peopleList: document.getElementById("peopleList"),

  itemName: document.getElementById("itemName"),
  itemQty: document.getElementById("itemQty"),
  itemPrice: document.getElementById("itemPrice"),
  addItemBtn: document.getElementById("addItemBtn"),
  itemsList: document.getElementById("itemsList"),

  calculateBtn: document.getElementById("calculateBtn"),
  summary: document.getElementById("summary"),
  closeTableBtn: document.getElementById("closeTableBtn"),
  deleteTableBtn: document.getElementById("deleteTableBtn")
};

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("es-SV", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function saveApp() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadApp() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    appState.tables = parsed.tables || [];
    appState.history = parsed.history || [];
    appState.activeTableId = parsed.activeTableId || null;
    appState.lastSummary = parsed.lastSummary || null;
  } catch (error) {
    console.error("No se pudo cargar PayTable:", error);
  }
}

function getActiveTable() {
  return appState.tables.find(table => table.id === appState.activeTableId);
}

function getTableEstimatedTotal(table) {
  if (!table) return 0;

  const subtotal = table.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * ((Number(table.taxPercent) || 0) / 100);
  const tip = subtotal * ((Number(table.tipPercent) || 0) / 100);

  return subtotal + tax + tip;
}

function setView(viewName) {
  els.tablesView.classList.add("hidden");
  els.historyView.classList.add("hidden");
  els.tableDetailView.classList.add("hidden");

  els.navOpenTables.classList.remove("active");
  els.navHistory.classList.remove("active");

  els.printBtn.classList.add("hidden");
  els.downloadBtn.classList.add("hidden");

  if (viewName === "tables") {
    els.tablesView.classList.remove("hidden");
    els.navOpenTables.classList.add("active");
    els.pageTitle.textContent = "Mesas abiertas";
    els.pageSubtitle.textContent = "Gestiona cuentas activas, divide productos y cierra mesas.";
    renderOpenTables();
  }

  if (viewName === "history") {
    els.historyView.classList.remove("hidden");
    els.navHistory.classList.add("active");
    els.pageTitle.textContent = "Historial";
    els.pageSubtitle.textContent = "Consulta las cuentas cerradas en este navegador.";
    renderHistory();
  }

  if (viewName === "detail") {
    els.tableDetailView.classList.remove("hidden");
    els.pageTitle.textContent = "Detalle de cuenta";
    els.pageSubtitle.textContent = "Edita personas, productos, impuestos y propinas.";
    els.printBtn.classList.remove("hidden");
    els.downloadBtn.classList.remove("hidden");
    renderActiveTable();
  }
}

function openNewTableModal() {
  els.newTableName.value = "";
  els.tableModal.classList.remove("hidden");
  setTimeout(() => els.newTableName.focus(), 50);
}

function closeNewTableModal() {
  els.tableModal.classList.add("hidden");
}

function createTable() {
  const name = els.newTableName.value.trim();

  if (!name) {
    alert("Escribe el nombre o número de mesa.");
    return;
  }

  const table = {
    id: createId("table"),
    name,
    status: "open",
    createdAt: new Date().toISOString(),
    taxPercent: 0,
    tipPercent: 0,
    tipMode: "proportional",
    people: [],
    items: []
  };

  appState.tables.unshift(table);
  appState.activeTableId = table.id;
  appState.lastSummary = null;

  saveApp();
  closeNewTableModal();
  setView("detail");
}

function renderOpenTables() {
  els.openTablesGrid.innerHTML = "";

  if (appState.tables.length === 0) {
    els.openTablesGrid.innerHTML = `
      <div class="empty-state">
        <h3>No hay mesas abiertas</h3>
        <p>Crea una nueva mesa para empezar a dividir una cuenta.</p>
        <button onclick="openNewTableModal()">+ Nueva mesa</button>
      </div>
    `;
    return;
  }

  appState.tables.forEach(table => {
    const card = document.createElement("div");
    card.className = "table-card";
    card.onclick = () => openTable(table.id);

    card.innerHTML = `
      <span class="badge">Abierta</span>
      <h3>${table.name}</h3>
      <p>${table.people.length} personas · ${table.items.length} productos</p>
      <p>Creada: ${formatDate(table.createdAt)}</p>
      <div class="amount">${formatMoney(getTableEstimatedTotal(table))}</div>
    `;

    els.openTablesGrid.appendChild(card);
  });
}

function openTable(tableId) {
  appState.activeTableId = tableId;
  appState.lastSummary = null;
  saveApp();
  setView("detail");
}

function renderActiveTable() {
  const table = getActiveTable();

  if (!table) {
    setView("tables");
    return;
  }

  els.activeTableName.textContent = table.name;
  els.activeTableMeta.textContent = `Abierta desde ${formatDate(table.createdAt)}`;
  els.taxPercent.value = table.taxPercent || 0;
  els.tipPercent.value = table.tipPercent || 0;
  els.tipMode.value = table.tipMode || "proportional";

  renderPeople();
  renderItems();
  els.summary.innerHTML = "";
}

function updateActiveTableSettings() {
  const table = getActiveTable();
  if (!table) return;

  table.taxPercent = Number(els.taxPercent.value) || 0;
  table.tipPercent = Number(els.tipPercent.value) || 0;
  table.tipMode = els.tipMode.value;

  appState.lastSummary = null;
  saveApp();
}

function addPerson() {
  const table = getActiveTable();
  if (!table) return;

  const name = els.personName.value.trim();

  if (!name) {
    alert("Escribe el nombre de la persona.");
    return;
  }

  table.people.push({
    id: createId("person"),
    name
  });

  els.personName.value = "";
  appState.lastSummary = null;

  saveApp();
  renderPeople();
  renderItems();
}

function removePerson(personId) {
  const table = getActiveTable();
  if (!table) return;

  table.people = table.people.filter(person => person.id !== personId);

  table.items = table.items.map(item => {
    return {
      ...item,
      assignedPeopleIds: item.assignedPeopleIds.filter(id => id !== personId)
    };
  });

  appState.lastSummary = null;
  saveApp();
  renderPeople();
  renderItems();
  els.summary.innerHTML = "";
}

function renderPeople() {
  const table = getActiveTable();
  els.peopleList.innerHTML = "";

  if (!table || table.people.length === 0) {
    els.peopleList.innerHTML = `<p class="notice">Todavía no has agregado personas.</p>`;
    return;
  }

  table.people.forEach(person => {
    const pill = document.createElement("div");
    pill.className = "person-pill";
    pill.innerHTML = `
      <span>${person.name}</span>
      <button title="Eliminar persona" onclick="removePerson('${person.id}')">×</button>
    `;
    els.peopleList.appendChild(pill);
  });
}

function addItem() {
  const table = getActiveTable();
  if (!table) return;

  const name = els.itemName.value.trim();
  const quantity = Number(els.itemQty.value);
  const price = Number(els.itemPrice.value);

  if (!name) {
    alert("Escribe el nombre del producto.");
    return;
  }

  if (!quantity || quantity <= 0) {
    alert("Escribe una cantidad válida.");
    return;
  }

  if (!price || price <= 0) {
    alert("Escribe un precio unitario válido.");
    return;
  }

  table.items.push({
    id: createId("item"),
    name,
    quantity,
    price,
    assignedPeopleIds: []
  });

  els.itemName.value = "";
  els.itemQty.value = 1;
  els.itemPrice.value = "";

  appState.lastSummary = null;
  saveApp();
  renderItems();
}

function removeItem(itemId) {
  const table = getActiveTable();
  if (!table) return;

  table.items = table.items.filter(item => item.id !== itemId);

  appState.lastSummary = null;
  saveApp();
  renderItems();
  els.summary.innerHTML = "";
}

function toggleItemAssignment(itemId, personId) {
  const table = getActiveTable();
  if (!table) return;

  const item = table.items.find(item => item.id === itemId);
  if (!item) return;

  if (item.assignedPeopleIds.includes(personId)) {
    item.assignedPeopleIds = item.assignedPeopleIds.filter(id => id !== personId);
  } else {
    item.assignedPeopleIds.push(personId);
  }

  appState.lastSummary = null;
  saveApp();
}

function renderItems() {
  const table = getActiveTable();
  els.itemsList.innerHTML = "";

  if (!table || table.items.length === 0) {
    els.itemsList.innerHTML = `<p class="notice">Todavía no has agregado productos.</p>`;
    return;
  }

  table.items.forEach(item => {
    const itemTotal = item.price * item.quantity;

    const peopleCheckboxes = table.people.length
      ? table.people.map(person => {
          const checked = item.assignedPeopleIds.includes(person.id) ? "checked" : "";
          return `
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                ${checked}
                onchange="toggleItemAssignment('${item.id}', '${person.id}')"
              />
              ${person.name}
            </label>
          `;
        }).join("")
      : `<p class="notice">Agrega personas para asignar este producto.</p>`;

    const itemCard = document.createElement("div");
    itemCard.className = "item-card";
    itemCard.innerHTML = `
      <div class="item-header">
        <div>
          <div class="item-title">${item.name}</div>
          <div class="item-price">${item.quantity} × ${formatMoney(item.price)} = ${formatMoney(itemTotal)}</div>
        </div>
        <button class="danger-btn" onclick="removeItem('${item.id}')">Eliminar</button>
      </div>

      <p>¿Quién consumió este producto?</p>
      <div class="checkbox-group">${peopleCheckboxes}</div>
    `;

    els.itemsList.appendChild(itemCard);
  });
}

function calculateBill({ silent = false } = {}) {
  const table = getActiveTable();

  if (!table) return null;

  updateActiveTableSettings();

  if (table.people.length === 0) {
    if (!silent) els.summary.innerHTML = `<p class="notice">Agrega al menos una persona.</p>`;
    return null;
  }

  if (table.items.length === 0) {
    if (!silent) els.summary.innerHTML = `<p class="notice">Agrega al menos un producto.</p>`;
    return null;
  }

  const unassignedItems = table.items.filter(item => item.assignedPeopleIds.length === 0);

  if (unassignedItems.length > 0) {
    const names = unassignedItems.map(item => item.name).join(", ");

    if (!silent) {
      els.summary.innerHTML = `
        <p class="notice">
          Hay productos sin asignar: ${names}. Asigna todos los productos antes de calcular.
        </p>
      `;
    }

    return null;
  }

  const totalsByPerson = {};

  table.people.forEach(person => {
    totalsByPerson[person.id] = {
      id: person.id,
      name: person.name,
      items: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0
    };
  });

  table.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const splitAmount = itemTotal / item.assignedPeopleIds.length;

    item.assignedPeopleIds.forEach(personId => {
      if (!totalsByPerson[personId]) return;

      totalsByPerson[personId].items.push({
        name: `${item.name} (${item.quantity}x)`,
        amount: splitAmount
      });

      totalsByPerson[personId].subtotal += splitAmount;
    });
  });

  const peopleTotals = Object.values(totalsByPerson);
  const tableSubtotal = peopleTotals.reduce((sum, person) => sum + person.subtotal, 0);
  const tableTax = tableSubtotal * ((Number(table.taxPercent) || 0) / 100);
  const tableTip = tableSubtotal * ((Number(table.tipPercent) || 0) / 100);

  peopleTotals.forEach(person => {
    person.tax = person.subtotal * ((Number(table.taxPercent) || 0) / 100);

    if (table.tipMode === "equal") {
      person.tip = tableTip / table.people.length;
    } else {
      const percentage = tableSubtotal > 0 ? person.subtotal / tableSubtotal : 0;
      person.tip = tableTip * percentage;
    }

    person.total = person.subtotal + person.tax + person.tip;
  });

  const result = {
    tableId: table.id,
    tableName: table.name,
    createdAt: table.createdAt,
    closedAt: new Date().toISOString(),
    peopleTotals,
    tableSubtotal,
    tableTax,
    tableTip,
    tableTotal: tableSubtotal + tableTax + tableTip
  };

  appState.lastSummary = result;
  saveApp();

  if (!silent) renderSummary(result);

  return result;
}

function renderSummary(result) {
  const peopleCards = result.peopleTotals.map(person => {
    const itemsHtml = person.items.map(item => `
      <div class="summary-line">
        <span>${item.name}</span>
        <span>${formatMoney(item.amount)}</span>
      </div>
    `).join("");

    return `
      <div class="person-summary">
        <h4>${person.name}</h4>
        ${itemsHtml}

        <div class="summary-line">
          <span>Subtotal</span>
          <span>${formatMoney(person.subtotal)}</span>
        </div>

        <div class="summary-line">
          <span>Impuesto</span>
          <span>${formatMoney(person.tax)}</span>
        </div>

        <div class="summary-line">
          <span>Propina</span>
          <span>${formatMoney(person.tip)}</span>
        </div>

        <div class="summary-line total">
          <span>Total</span>
          <span>${formatMoney(person.total)}</span>
        </div>
      </div>
    `;
  }).join("");

  els.summary.innerHTML = `
    <h3>${result.tableName}</h3>
    <p>Resumen generado: ${formatDate(result.closedAt)}</p>

    <div class="summary-grid">
      ${peopleCards}
    </div>

    <div class="table-total">
      Total de la mesa: ${formatMoney(result.tableTotal)}
    </div>
  `;
}

function closeTable() {
  const table = getActiveTable();
  if (!table) return;

  const result = calculateBill();

  if (!result) return;

  const confirmation = confirm(`¿Cerrar ${table.name} por ${formatMoney(result.tableTotal)}?`);

  if (!confirmation) return;

  appState.history.unshift({
    ...result,
    id: createId("closed")
  });

  appState.tables = appState.tables.filter(openTable => openTable.id !== table.id);
  appState.activeTableId = null;
  appState.lastSummary = null;

  saveApp();
  setView("tables");
}

function deleteTable() {
  const table = getActiveTable();
  if (!table) return;

  const confirmation = confirm(`¿Eliminar ${table.name}? Esta acción no enviará la cuenta al historial.`);

  if (!confirmation) return;

  appState.tables = appState.tables.filter(openTable => openTable.id !== table.id);
  appState.activeTableId = null;
  appState.lastSummary = null;

  saveApp();
  setView("tables");
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (appState.history.length === 0) {
    els.historyList.innerHTML = `
      <div class="empty-state">
        <h3>No hay cuentas cerradas</h3>
        <p>Cuando cierres una mesa, aparecerá aquí.</p>
      </div>
    `;
    return;
  }

  appState.history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    row.innerHTML = `
      <div>
        <h3>${item.tableName}</h3>
        <p>Cerrada: ${formatDate(item.closedAt)} · ${item.peopleTotals.length} personas</p>
      </div>
      <div class="history-total">${formatMoney(item.tableTotal)}</div>
    `;

    els.historyList.appendChild(row);
  });
}

function buildSummaryText(result) {
  const lines = [];

  lines.push("PayTable - Resumen de cuenta");
  lines.push("--------------------------------");
  lines.push(`Mesa: ${result.tableName}`);
  lines.push(`Fecha: ${formatDate(result.closedAt)}`);
  lines.push("");

  result.peopleTotals.forEach(person => {
    lines.push(`${person.name}`);
    person.items.forEach(item => {
      lines.push(`  - ${item.name}: ${formatMoney(item.amount)}`);
    });
    lines.push(`  Subtotal: ${formatMoney(person.subtotal)}`);
    lines.push(`  Impuesto: ${formatMoney(person.tax)}`);
    lines.push(`  Propina: ${formatMoney(person.tip)}`);
    lines.push(`  Total: ${formatMoney(person.total)}`);
    lines.push("");
  });

  lines.push(`Subtotal mesa: ${formatMoney(result.tableSubtotal)}`);
  lines.push(`Impuesto mesa: ${formatMoney(result.tableTax)}`);
  lines.push(`Propina mesa: ${formatMoney(result.tableTip)}`);
  lines.push(`Total mesa: ${formatMoney(result.tableTotal)}`);

  return lines.join("\n");
}

function printSummary() {
  const result = appState.lastSummary || calculateBill();

  if (!result) return;

  renderSummary(result);
  window.print();
}

function downloadSummary() {
  const result = appState.lastSummary || calculateBill();

  if (!result) return;

  const text = buildSummaryText(result);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${result.tableName.replaceAll(" ", "_")}_PayTable_Resumen.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

els.navOpenTables.addEventListener("click", () => setView("tables"));
els.navHistory.addEventListener("click", () => setView("history"));
els.newTableBtn.addEventListener("click", openNewTableModal);
els.cancelNewTableBtn.addEventListener("click", closeNewTableModal);
els.createTableBtn.addEventListener("click", createTable);
els.backToTablesBtn.addEventListener("click", () => setView("tables"));

els.addPersonBtn.addEventListener("click", addPerson);
els.addItemBtn.addEventListener("click", addItem);
els.calculateBtn.addEventListener("click", () => calculateBill());
els.closeTableBtn.addEventListener("click", closeTable);
els.deleteTableBtn.addEventListener("click", deleteTable);

els.printBtn.addEventListener("click", printSummary);
els.downloadBtn.addEventListener("click", downloadSummary);

els.taxPercent.addEventListener("input", updateActiveTableSettings);
els.tipPercent.addEventListener("input", updateActiveTableSettings);
els.tipMode.addEventListener("change", updateActiveTableSettings);

els.newTableName.addEventListener("keydown", event => {
  if (event.key === "Enter") createTable();
});

els.personName.addEventListener("keydown", event => {
  if (event.key === "Enter") addPerson();
});

els.itemPrice.addEventListener("keydown", event => {
  if (event.key === "Enter") addItem();
});

window.openNewTableModal = openNewTableModal;
window.removePerson = removePerson;
window.removeItem = removeItem;
window.toggleItemAssignment = toggleItemAssignment;

loadApp();
setView("tables");
