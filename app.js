const state = {
  people: [],
  items: []
};

const tableNameInput = document.getElementById("tableName");
const taxPercentInput = document.getElementById("taxPercent");
const tipPercentInput = document.getElementById("tipPercent");
const tipModeInput = document.getElementById("tipMode");

const personNameInput = document.getElementById("personName");
const addPersonBtn = document.getElementById("addPersonBtn");
const peopleList = document.getElementById("peopleList");

const itemNameInput = document.getElementById("itemName");
const itemPriceInput = document.getElementById("itemPrice");
const addItemBtn = document.getElementById("addItemBtn");
const itemsList = document.getElementById("itemsList");

const calculateBtn = document.getElementById("calculateBtn");
const summary = document.getElementById("summary");
const resetBtn = document.getElementById("resetBtn");

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function saveState() {
  const data = {
    tableName: tableNameInput.value,
    taxPercent: taxPercentInput.value,
    tipPercent: tipPercentInput.value,
    tipMode: tipModeInput.value,
    state
  };

  localStorage.setItem("paytableData", JSON.stringify(data));
}

function loadState() {
  const savedData = localStorage.getItem("paytableData");

  if (!savedData) return;

  try {
    const data = JSON.parse(savedData);

    tableNameInput.value = data.tableName || "";
    taxPercentInput.value = data.taxPercent || 0;
    tipPercentInput.value = data.tipPercent || 0;
    tipModeInput.value = data.tipMode || "proportional";

    state.people = data.state?.people || [];
    state.items = data.state?.items || [];

    renderPeople();
    renderItems();
  } catch (error) {
    console.error("Error loading saved data:", error);
  }
}

function addPerson() {
  const name = personNameInput.value.trim();

  if (!name) {
    alert("Escribe el nombre de la persona.");
    return;
  }

  const person = {
    id: createId("person"),
    name
  };

  state.people.push(person);
  personNameInput.value = "";

  renderPeople();
  renderItems();
  saveState();
}

function removePerson(personId) {
  state.people = state.people.filter(person => person.id !== personId);

  state.items = state.items.map(item => {
    return {
      ...item,
      assignedPeopleIds: item.assignedPeopleIds.filter(id => id !== personId)
    };
  });

  renderPeople();
  renderItems();
  calculateBill();
  saveState();
}

function renderPeople() {
  peopleList.innerHTML = "";

  if (state.people.length === 0) {
    peopleList.innerHTML = `<p class="notice">Todavía no has agregado personas.</p>`;
    return;
  }

  state.people.forEach(person => {
    const pill = document.createElement("div");
    pill.className = "person-pill";
    pill.innerHTML = `
      <span>${person.name}</span>
      <button title="Eliminar persona" onclick="removePerson('${person.id}')">×</button>
    `;
    peopleList.appendChild(pill);
  });
}

function addItem() {
  const name = itemNameInput.value.trim();
  const price = Number(itemPriceInput.value);

  if (!name) {
    alert("Escribe el nombre del producto.");
    return;
  }

  if (!price || price <= 0) {
    alert("Escribe un precio válido.");
    return;
  }

  const item = {
    id: createId("item"),
    name,
    price,
    assignedPeopleIds: []
  };

  state.items.push(item);

  itemNameInput.value = "";
  itemPriceInput.value = "";

  renderItems();
  saveState();
}

function removeItem(itemId) {
  state.items = state.items.filter(item => item.id !== itemId);
  renderItems();
  calculateBill();
  saveState();
}

function toggleItemAssignment(itemId, personId) {
  const item = state.items.find(item => item.id === itemId);

  if (!item) return;

  if (item.assignedPeopleIds.includes(personId)) {
    item.assignedPeopleIds = item.assignedPeopleIds.filter(id => id !== personId);
  } else {
    item.assignedPeopleIds.push(personId);
  }

  saveState();
}

function renderItems() {
  itemsList.innerHTML = "";

  if (state.items.length === 0) {
    itemsList.innerHTML = `<p class="notice">Todavía no has agregado productos.</p>`;
    return;
  }

  state.items.forEach(item => {
    const itemCard = document.createElement("div");
    itemCard.className = "item-card";

    const peopleCheckboxes = state.people.length
      ? state.people.map(person => {
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

    itemCard.innerHTML = `
      <div class="item-header">
        <div>
          <div class="item-title">${item.name}</div>
          <div class="item-price">${formatMoney(item.price)}</div>
        </div>
        <button class="danger-btn" onclick="removeItem('${item.id}')">Eliminar</button>
      </div>

      <p>¿Quién consumió este producto?</p>
      <div class="checkbox-group">
        ${peopleCheckboxes}
      </div>
    `;

    itemsList.appendChild(itemCard);
  });
}

function calculateBill() {
  if (state.people.length === 0) {
    summary.innerHTML = `<p class="notice">Agrega al menos una persona.</p>`;
    return;
  }

  if (state.items.length === 0) {
    summary.innerHTML = `<p class="notice">Agrega al menos un producto.</p>`;
    return;
  }

  const unassignedItems = state.items.filter(item => item.assignedPeopleIds.length === 0);

  if (unassignedItems.length > 0) {
    const names = unassignedItems.map(item => item.name).join(", ");
    summary.innerHTML = `
      <p class="notice">
        Hay productos sin asignar: ${names}. 
        Asigna todos los productos antes de calcular.
      </p>
    `;
    return;
  }

  const taxPercent = Number(taxPercentInput.value) || 0;
  const tipPercent = Number(tipPercentInput.value) || 0;
  const tipMode = tipModeInput.value;

  const totalsByPerson = {};

  state.people.forEach(person => {
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

  state.items.forEach(item => {
    const splitAmount = item.price / item.assignedPeopleIds.length;

    item.assignedPeopleIds.forEach(personId => {
      if (!totalsByPerson[personId]) return;

      totalsByPerson[personId].items.push({
        name: item.name,
        amount: splitAmount
      });

      totalsByPerson[personId].subtotal += splitAmount;
    });
  });

  const tableSubtotal = Object.values(totalsByPerson)
    .reduce((sum, person) => sum + person.subtotal, 0);

  const tableTax = tableSubtotal * (taxPercent / 100);
  const tableTip = tableSubtotal * (tipPercent / 100);

  Object.values(totalsByPerson).forEach(person => {
    person.tax = person.subtotal * (taxPercent / 100);

    if (tipMode === "equal") {
      person.tip = tableTip / state.people.length;
    } else {
      const percentageOfConsumption = tableSubtotal > 0 ? person.subtotal / tableSubtotal : 0;
      person.tip = tableTip * percentageOfConsumption;
    }

    person.total = person.subtotal + person.tax + person.tip;
  });

  renderSummary(Object.values(totalsByPerson), tableSubtotal, tableTax, tableTip);
  saveState();
}

function renderSummary(peopleTotals, tableSubtotal, tableTax, tableTip) {
  const tableName = tableNameInput.value.trim() || "Mesa sin nombre";
  const tableTotal = tableSubtotal + tableTax + tableTip;

  const peopleCards = peopleTotals.map(person => {
    const itemsHtml = person.items.map(item => {
      return `
        <div class="summary-line">
          <span>${item.name}</span>
          <span>${formatMoney(item.amount)}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="person-summary">
        <h3>${person.name}</h3>

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

  summary.innerHTML = `
    <h3>${tableName}</h3>

    <div class="summary-grid">
      ${peopleCards}
    </div>

    <div class="table-total">
      Total de la mesa: ${formatMoney(tableTotal)}
    </div>
  `;
}

function resetApp() {
  const confirmation = confirm("¿Seguro que quieres limpiar la cuenta actual?");

  if (!confirmation) return;

  state.people = [];
  state.items = [];

  tableNameInput.value = "";
  taxPercentInput.value = 0;
  tipPercentInput.value = 0;
  tipModeInput.value = "proportional";

  localStorage.removeItem("paytableData");

  renderPeople();
  renderItems();

  summary.innerHTML = "";
}

addPersonBtn.addEventListener("click", addPerson);
addItemBtn.addEventListener("click", addItem);
calculateBtn.addEventListener("click", calculateBill);
resetBtn.addEventListener("click", resetApp);

personNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addPerson();
});

itemPriceInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addItem();
});

tableNameInput.addEventListener("input", saveState);
taxPercentInput.addEventListener("input", saveState);
tipPercentInput.addEventListener("input", saveState);
tipModeInput.addEventListener("change", saveState);

loadState();
renderPeople();
renderItems();
