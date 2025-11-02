// === Données initiales ===
// Comptes vides pour un démarrage "clean". Le solde total commence à 0.
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];

// Le Solde Total DOIT être la somme des comptes.
let totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0); 

let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let incomes = JSON.parse(localStorage.getItem('incomes')) || [];

document.getElementById('totalBalance').textContent = `€${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;


// === FONCTION UTILITAIRE : Gérer la Virgule et la Conversion en Nombre ===
function parseAmount(input) {
    const str = input.replace(',', '.');
    return parseFloat(str);
}

// === FONCTION UTILITAIRE : Mettre à jour les sélecteurs de compte ===
function updateAccountSelects() {
    const expenseSelect = document.getElementById('expenseAccount');
    const incomeSelect = document.getElementById('incomeAccount');
    
    const defaultOptionExpense = `<option value="">Choisir un compte pour la dépense</option>`;
    const defaultOptionIncome = `<option value="">Choisir un compte pour le revenu</option>`;
    
    const accountOptions = accounts.map(acc => 
        `<option value="${acc.name}">${acc.name} (€${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })})</option>`
    ).join('');
    
    expenseSelect.innerHTML = defaultOptionExpense + accountOptions;
    incomeSelect.innerHTML = defaultOptionIncome + accountOptions;
}

// === Graphique dynamique du solde (Ligne - Suivi Agrégé) ===
const ctx = document.getElementById('balanceChart').getContext('2d');
let balanceHistory = JSON.parse(localStorage.getItem('balanceHistory')) || [];

function aggregateBalanceData() {
    if (balanceHistory.length === 0) {
        balanceHistory.push({
            date: new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }),
            balance: totalBalance
        });
    }

    const todayLabel = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
    const lastEntry = balanceHistory[balanceHistory.length - 1];

    if (lastEntry && lastEntry.date === todayLabel) {
        lastEntry.balance = totalBalance;
    } else {
        balanceHistory.push({
            date: todayLabel,
            balance: totalBalance
        });
        
        if (balanceHistory.length > 90) { // Garder max 90 jours
            balanceHistory.shift();
        }
    }
    
    localStorage.setItem('balanceHistory', JSON.stringify(balanceHistory));
    
    return {
        labels: balanceHistory.map(item => item.date),
        data: balanceHistory.map(item => item.balance)
    };
}

let aggregated = aggregateBalanceData();

const balanceChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: aggregated.labels,
    datasets: [{
      label: 'Solde (€)',
      data: aggregated.data,
      borderColor: '#8F7CF9',
      backgroundColor: 'rgba(143,124,249,0.2)',
      fill: true,
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: { 
      y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#E0E0E0' } },
      x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#E0E0E0' } }
    },
    plugins: { legend: { labels: { color: '#E0E0E0' } } }
  }
});

function updateChart() {
    const updatedData = aggregateBalanceData();
    balanceChart.data.labels = updatedData.labels;
    balanceChart.data.datasets[0].data = updatedData.data;
    balanceChart.update();
}


// === GESTION DES MODALES ===
const modalAddMoney = document.getElementById('modal-add-money');
const modalWithdrawMoney = document.getElementById('modal-withdraw-money');
const closeButtons = document.querySelectorAll('.close-button');

document.querySelectorAll('.action-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        if (action === 'add-money') {
            modalAddMoney.style.display = 'flex';
        } else if (action === 'withdraw-money') {
            modalWithdrawMoney.style.display = 'flex';
        }
        // Pour les autres actions (info, more), vous pouvez ajouter des modales similaires ou d'autres logiques
    });
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modalAddMoney.style.display = 'none';
        modalWithdrawMoney.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target == modalAddMoney) {
        modalAddMoney.style.display = 'none';
    }
    if (event.target == modalWithdrawMoney) {
        modalWithdrawMoney.style.display = 'none';
    }
});


// === DÉPENSES (Le compte est maintenant affecté) ===
document.getElementById('expenseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedAccountName = document.getElementById('expenseAccount').value;
  const amountInput = document.getElementById('amount').value.trim();
  const reason = document.getElementById('reason').value.trim();
  
  const amount = parseAmount(amountInput);

  if (isNaN(amount) || amount <= 0 || !reason || !selectedAccountName) {
      alert("Veuillez remplir tous les champs correctement et choisir un compte.");
      return;
  }
  
  const expense = { id: Date.now(), account: selectedAccountName, amount, reason, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) };
  expenses.push(expense);
  localStorage.setItem('expenses', JSON.stringify(expenses));
  
  const accountIndex = accounts.findIndex(acc => acc.name === selectedAccountName);
  if (accountIndex !== -1) {
      accounts[accountIndex].balance -= amount;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      updateAccountChart();
      updateAccountList();
      updateAccountSelects();
  }

  updateExpenseList();
  updateChart();
  e.target.reset();
  modalWithdrawMoney.style.display = 'none'; // Ferme la modale
});

function updateExpenseList() {
  const list = document.getElementById('expenseList');
  list.innerHTML = '';
  // Afficher les 5 dernières dépenses
  expenses.slice().reverse().slice(0, 5).forEach((exp) => {
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="transaction-icon" style="background:${getIconColor(exp.reason)};">${getIcon(exp.reason)}</div>
        <div class="transaction-details">
            <strong>${exp.reason}</strong>
            <span>${exp.time} - ${exp.date} [${exp.account}]</span>
        </div>
        <span class="transaction-amount expense">-€${exp.amount.toFixed(2)}</span>
    `;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteTransaction('expense', exp.id, exp.amount, exp.account); 
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  // document.getElementById('expenses').textContent = `€${totalExpenses.toLocaleString('fr-FR')}`; // Supprimé du dashboard principal
}

// === REVENUS (Le compte est maintenant affecté) ===
document.getElementById('incomeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedAccountName = document.getElementById('incomeAccount').value;
  const amountInput = document.getElementById('incomeAmount').value.trim();
  const reason = document.getElementById('incomeReason').value.trim();
  
  const amount = parseAmount(amountInput);
  
  if (isNaN(amount) || amount <= 0 || !reason || !selectedAccountName) {
      alert("Veuillez remplir tous les champs correctement et choisir un compte.");
      return;
  }
  
  const income = { id: Date.now(), account: selectedAccountName, amount, reason, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) };
  incomes.push(income);
  localStorage.setItem('incomes', JSON.stringify(incomes));
  
  const accountIndex = accounts.findIndex(acc => acc.name === selectedAccountName);
  if (accountIndex !== -1) {
      accounts[accountIndex].balance += amount;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      updateAccountChart();
      updateAccountList();
      updateAccountSelects();
  }
  
  updateIncomeList();
  updateChart();
  e.target.reset();
  modalAddMoney.style.display = 'none'; // Ferme la modale
});

function updateIncomeList() {
  const list = document.getElementById('incomeList');
  list.innerHTML = '';
  // Afficher les 5 derniers revenus
  incomes.slice().reverse().slice(0, 5).forEach((inc) => {
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="transaction-icon" style="background:${getIconColor(inc.reason)};">${getIcon(inc.reason)}</div>
        <div class="transaction-details">
            <strong>${inc.reason}</strong>
            <span>${inc.time} - ${inc.date} [${inc.account}]</span>
        </div>
        <span class="transaction-amount income">+€${inc.amount.toFixed(2)}</span>
    `;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteTransaction('income', inc.id, inc.amount, inc.account); 
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
  const totalIncome = incomes.reduce((acc, e) => acc + e.amount, 0);
  // document.getElementById('income').textContent = `€${totalIncome.toLocaleString('fr-FR')}`; // Supprimé du dashboard principal
}

// === FONCTION GÉNÉRIQUE DE SUPPRESSION DE TRANSACTION (Ajuste le compte impacté) ===
function deleteTransaction(type, id, amount, accountName) {
    const accountIndex = accounts.findIndex(acc => acc.name === accountName);
    const multiplier = (type === 'expense') ? 1 : -1; 
    
    if (accountIndex !== -1) {
        accounts[accountIndex].balance += amount * multiplier; 
        localStorage.setItem('accounts', JSON.stringify(accounts));

        updateAccountChart();
        updateAccountList();
        updateAccountSelects();
    }
    
    if (type === 'expense') {
        expenses = expenses.filter(exp => exp.id !== id); 
        localStorage.setItem('expenses', JSON.stringify(expenses));
        updateExpenseList();
    } else if (type === 'income') {
        incomes = incomes.filter(inc => inc.id !== id);
        localStorage.setItem('incomes', JSON.stringify(incomes));
        updateIncomeList();
    }
    
    updateChart();
}

// === Fonctions pour les icônes de transaction (pour le style Revolut) ===
function getIcon(reason) {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('salaire')) return '💸';
    if (lowerReason.includes('essence') || lowerReason.includes('carburant')) return '⛽';
    if (lowerReason.includes('restaurant') || lowerReason.includes('repas')) return '🍽️';
    if (lowerReason.includes('courses')) return '🛒';
    if (lowerReason.includes('internet') || lowerReason.includes('netflix')) return '🌐';
    if (lowerReason.includes('sport')) return '🏋️';
    if (lowerReason.includes('loyer')) return '🏠';
    return '📝'; // Icône par défaut
}

function getIconColor(reason) {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('salaire')) return '#4CD964'; // Vert
    if (lowerReason.includes('loyer')) return '#FF9500'; // Orange
    if (lowerReason.includes('courses')) return '#007AFF'; // Bleu
    if (lowerReason.includes('sport')) return '#FF2D55'; // Rouge
    return '#8F7CF9'; // Violet par défaut
}


// === GESTION DES COMPTES (PIE CHART) ===
const accountCtx = document.getElementById('accountChart').getContext('2d');
let accountChart = new Chart(accountCtx, {
  type: 'pie',
  data: {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#5A49E2', '#8F7CF9', '#667EEA', '#764BA2', '#4CD964', '#FF5F6D', '#FF9500'],
      borderColor: '#1C1C1E', 
      borderWidth: 2
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'right', labels: { color: '#E0E0E0', boxWidth: 15 } }
    }
  }
});

document.getElementById('addAccountForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('accountName').value.trim();
  const balanceInput = document.getElementById('accountBalance').value.trim();
  const balance = parseAmount(balanceInput);
  
  if (name && !isNaN(balance)) {
    if (accounts.some(acc => acc.name === name)) {
        alert('Un compte avec ce nom existe déjà.');
        return;
    }
    
    accounts.push({ name, balance });
    localStorage.setItem('accounts', JSON.stringify(accounts));
    updateAccountList();
    updateAccountChart(); 
    updateAccountSelects(); 
    e.target.reset();
  }
});

function deleteAccount(accountName) {
  accounts = accounts.filter(acc => acc.name !== accountName);
  localStorage.setItem('accounts', JSON.stringify(accounts));
  updateAccountList();
  updateAccountChart();
  updateAccountSelects(); 
}

function updateAccountList() {
  const list = document.getElementById('accountList');
  list.innerHTML = '';
  if (accounts.length === 0) {
      list.innerHTML = '<p style="text-align:center; color:#B0B0B0;">Aucun compte ajouté.</p>';
  }
  accounts.forEach((acc) => {
    const div = document.createElement('div');
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteAccount(acc.name);
    
    div.innerHTML = `<span><strong>${acc.name}</strong></span> : <span>€${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>`;
    div.appendChild(deleteBtn);
    list.appendChild(div);
  });
}

function updateAccountChart() {
  accountChart.data.labels = accounts.map(acc => acc.name);
  accountChart.data.datasets[0].data = accounts.map(acc => acc.balance);
  accountChart.update();
  
  totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  document.getElementById('totalBalance').textContent = `€${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  
  updateChart(); 
}


// === ACTIONS (Yahoo Finance) (Solution de Contingence) ===
const stockList = document.getElementById('stockList');
const refreshButton = document.getElementById('refreshStocks');
const addStockForm = document.getElementById('addStockForm');

let myStocks = JSON.parse(localStorage.getItem('myStocks')) || [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'BNP.PA', name: 'BNP Paribas' }
];
if (!localStorage.getItem('myStocks')) {
    localStorage.setItem('myStocks', JSON.stringify(myStocks));
}

async function fetchStocks() {
  stockList.innerHTML = '<p style="text-align:center; color:#B0B0B0;">Chargement des actions...</p>';
  
  const symbols = myStocks.map(s => s.symbol).join(',');
  if (!symbols) {
      stockList.innerHTML = '<p style="text-align:center; color:#B0B0B0;">Aucune action à afficher. Ajoutez-en une !</p>';
      return;
  }
  
  // Liste des URLs à essayer
  const urlsToTry = [
    `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols}`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
  ];
  
  let success = false;
  let finalData = null;

  for (const url of urlsToTry) {
      try {
          console.log(`Tentative de connexion à l'API: ${url}`);
          const res = await fetch(url);
          if (!res.ok) {
              console.warn(`L'URL ${url} a renvoyé une erreur HTTP: ${res.status}`);
              continue; 
          }
          const data = await res.json();
          
          if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
              finalData = data;
              success = true;
              console.log('Connexion API réussie.');
              break; 
          } else {
              console.warn(`L'URL ${url} a renvoyé une réponse vide ou invalide.`);
          }
      } catch (err) {
          console.error(`Erreur de connexion pour ${url}:`, err);
      }
  }

  if (!success || !finalData) {
      stockList.innerHTML = '<p style="text-align:center; color:#FF5F6D;">Erreur lors du chargement des actions. (API non accessible)</p>';
      return;
  }

  // --- RENDU EN CAS DE SUCCÈS ---
  stockList.innerHTML = '';
  
  finalData.quoteResponse.result.forEach((stock) => {
    const div = document.createElement('div');
    const change = stock.regularMarketChangePercent || 0;
    const color = change >= 0 ? '#4CD964' : '#FF5F6D';
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'X';
    deleteButton.onclick = () => deleteStock(stock.symbol);
    

    div.innerHTML = `
      <span>
        <strong>${stock.shortName || stock.symbol}</strong> (${stock.symbol})
        — €${stock.regularMarketPrice?.toFixed(2) || 'N/A'}
        <span style="color:${color}">(${change?.toFixed(2) || 0}%)</span>
      </span>
    `;
    div.appendChild(deleteButton);
    stockList.appendChild(div);
  });
}

addStockForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const symbol = document.getElementById('stockSymbol').value.toUpperCase().trim();
  const name = document.getElementById('stockName').value.trim();
  
  if (symbol && name && !myStocks.find(s => s.symbol === symbol)) {
    myStocks.push({ symbol, name });
    localStorage.setItem('myStocks', JSON.stringify(myStocks));
    fetchStocks();
    e.target.reset();
  } else if (!symbol || !name) {
    alert('Veuillez remplir le Symbole et le Nom.');
  } else if (myStocks.find(s => s.symbol === symbol)) {
    alert('Ce symbole est déjà dans votre liste.');
  }
});

function deleteStock(symbolToDelete) {
  myStocks = myStocks.filter(stock => stock.symbol !== symbolToDelete);
  localStorage.setItem('myStocks', JSON.stringify(myStocks));
  fetchStocks();
}

refreshButton.addEventListener('click', fetchStocks);


// === NAVIGATION (Single Page Application - SPA) ===
const navLinks = document.querySelectorAll('.sidebar li');

function showSection(target) {
  document.querySelectorAll('.main > section').forEach(el => {
    el.style.display = 'none';
  });
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));

  if (target === 'tableau') {
    document.getElementById('section-tableau').style.display = 'flex'; 
  } else if (target === 'comptes') {
    document.getElementById('section-comptes').style.display = 'block';
  } else if (target === 'actions') {
    document.getElementById('section-actions').style.display = 'block';
  } else if (target === 'parametres') {
    document.getElementById('section-parametres').style.display = 'block';
  }
  document.querySelector(`.sidebar li[data-target="${target}"]`).classList.add('active');
}

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    const target = link.getAttribute('data-target');
    showSection(target);
  });
});

// === Initialisation de l'affichage au chargement ===
showSection('tableau');
updateExpenseList();
updateIncomeList();
updateAccountList();
updateAccountChart();
updateAccountSelects();
fetchStocks();
