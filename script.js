// === Données initiales ===
let accounts = JSON.parse(localStorage.getItem('accounts')) || [
  { name: 'Compte Courant', balance: 10000 },
  { name: 'Livret A', balance: 2450 }
];

// Le Solde Total DOIT être la somme des comptes.
let totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0); 

let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let incomes = JSON.parse(localStorage.getItem('incomes')) || [];

document.getElementById('totalBalance').textContent = `€${totalBalance.toLocaleString('fr-FR')}`;


// === FONCTION UTILITAIRE : Gérer la Virgule et la Conversion en Nombre ===
function parseAmount(input) {
    // Remplace la virgule par un point et convertit en nombre
    const str = input.replace(',', '.');
    return parseFloat(str);
}

// === FONCTION UTILITAIRE : Mettre à jour les sélecteurs de compte ===
function updateAccountSelects() {
    const expenseSelect = document.getElementById('expenseAccount');
    const incomeSelect = document.getElementById('incomeAccount');
    
    // Conserver les options par défaut
    const defaultOptionExpense = `<option value="">Choisir un compte pour la dépense</option>`;
    const defaultOptionIncome = `<option value="">Choisir un compte pour le revenu</option>`;
    
    // Générer les options pour chaque compte
    const accountOptions = accounts.map(acc => 
        `<option value="${acc.name}">${acc.name} (€${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })})</option>`
    ).join('');
    
    expenseSelect.innerHTML = defaultOptionExpense + accountOptions;
    incomeSelect.innerHTML = defaultOptionIncome + accountOptions;
}

// === Graphique dynamique du solde (Ligne - Suivi Agrégé) ===
const ctx = document.getElementById('balanceChart').getContext('2d');
// Historique pour l'agrégation par jour/mois
let balanceHistory = JSON.parse(localStorage.getItem('balanceHistory')) || [];

function aggregateBalanceData() {
    // Si l'historique est vide, ajouter le solde initial
    if (balanceHistory.length === 0) {
        balanceHistory.push({
            date: new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }),
            balance: totalBalance
        });
    }

    const todayLabel = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
    const lastEntry = balanceHistory[balanceHistory.length - 1];

    if (lastEntry.date === todayLabel) {
        // Mettre à jour le solde d'aujourd'hui
        lastEntry.balance = totalBalance;
    } else {
        // Nouveau jour : ajouter une nouvelle entrée
        balanceHistory.push({
            date: todayLabel,
            balance: totalBalance
        });
        
        // Limiter l'historique (ex: 90 jours max)
        if (balanceHistory.length > 90) {
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
      borderColor: '#8f7cf9',
      backgroundColor: 'rgba(143,124,249,0.2)',
      fill: true,
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: { y: { beginAtZero: false } }
  }
});

function updateChart() {
    const updatedData = aggregateBalanceData();
    balanceChart.data.labels = updatedData.labels;
    balanceChart.data.datasets[0].data = updatedData.data;
    balanceChart.update();
}


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
  
  // 1. Enregistrer la transaction
  const expense = { id: Date.now(), account: selectedAccountName, amount, reason, date: new Date().toLocaleDateString() };
  expenses.push(expense);
  localStorage.setItem('expenses', JSON.stringify(expenses));
  
  // 2. Mettre à jour le solde du compte affecté
  const accountIndex = accounts.findIndex(acc => acc.name === selectedAccountName);
  if (accountIndex !== -1) {
      accounts[accountIndex].balance -= amount;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      // Mettre à jour tous les affichages
      updateAccountChart();
      updateAccountList();
      updateAccountSelects();
  }

  updateExpenseList();
  updateChart();
  e.target.reset();
});

function updateExpenseList() {
  const list = document.getElementById('expenseList');
  list.innerHTML = '';
  expenses.slice().reverse().forEach((exp) => {
    // Afficher le compte affecté
    const li = document.createElement('li');
    li.innerHTML = `<span>${exp.date} - [${exp.account}] ${exp.reason}</span><span style="color:#ff5f6d">-€${exp.amount.toFixed(2)}</span>`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteTransaction('expense', exp.id, exp.amount, exp.account); 
    deleteBtn.style.cssText = 'background: #ff5f6d; color: white; border: none; padding: 5px 8px; margin-left: 10px; cursor: pointer; border-radius: 5px; font-weight: normal; transform: none;';

    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  document.getElementById('expenses').textContent = `€${totalExpenses.toLocaleString('fr-FR')}`;
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
  
  // 1. Enregistrer la transaction
  const income = { id: Date.now(), account: selectedAccountName, amount, reason, date: new Date().toLocaleDateString() };
  incomes.push(income);
  localStorage.setItem('incomes', JSON.stringify(incomes));
  
  // 2. Mettre à jour le solde du compte affecté
  const accountIndex = accounts.findIndex(acc => acc.name === selectedAccountName);
  if (accountIndex !== -1) {
      accounts[accountIndex].balance += amount;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      // Mettre à jour tous les affichages
      updateAccountChart();
      updateAccountList();
      updateAccountSelects();
  }
  
  updateIncomeList();
  updateChart();
  e.target.reset();
});

function updateIncomeList() {
  const list = document.getElementById('incomeList');
  list.innerHTML = '';
  incomes.slice().reverse().forEach((inc) => {
    // Afficher le compte affecté
    const li = document.createElement('li');
    li.innerHTML = `<span>${inc.date} - [${inc.account}] ${inc.reason}</span><span style="color:#4cd964">+€${inc.amount.toFixed(2)}</span>`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteTransaction('income', inc.id, inc.amount, inc.account); 
    deleteBtn.style.cssText = 'background: #4cd964; color: white; border: none; padding: 5px 8px; margin-left: 10px; cursor: pointer; border-radius: 5px; font-weight: normal; transform: none;';

    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
  const totalIncome = incomes.reduce((acc, e) => acc + e.amount, 0);
  document.getElementById('income').textContent = `€${totalIncome.toLocaleString('fr-FR')}`;
}

// === FONCTION GÉNÉRIQUE DE SUPPRESSION DE TRANSACTION (Ajuste le compte impacté) ===
function deleteTransaction(type, id, amount, accountName) {
    const accountIndex = accounts.findIndex(acc => acc.name === accountName);
    const multiplier = (type === 'expense') ? 1 : -1; // +1 pour dépense (remboursement), -1 pour revenu (annulation)
    
    if (accountIndex !== -1) {
        // 1. Ajuster le solde du compte
        accounts[accountIndex].balance += amount * multiplier; 
        localStorage.setItem('accounts', JSON.stringify(accounts));

        // 2. Mettre à jour les affichages (Total, Camembert, Selecteurs)
        updateAccountChart();
        updateAccountList();
        updateAccountSelects();
    }
    
    // 3. Supprimer la transaction de la liste
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


// === GESTION DES COMPTES (PIE CHART) ===
const accountCtx = document.getElementById('accountChart').getContext('2d');
let accountChart = new Chart(accountCtx, {
  type: 'pie',
  data: {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#667eea', '#764ba2', '#8f7cf9', '#5a49e2', '#4cd964', '#ff5f6d'],
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'white' } }
    }
  }
});

document.getElementById('addAccountForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('accountName').value.trim();
  
  // Utiliser parseAmount pour le solde initial
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
    updateAccountSelects(); // Mis à jour
    e.target.reset();
  }
});

function deleteAccount(accountName) {
  accounts = accounts.filter(acc => acc.name !== accountName);
  localStorage.setItem('accounts', JSON.stringify(accounts));
  updateAccountList();
  updateAccountChart();
  updateAccountSelects(); // Mis à jour
}

function updateAccountList() {
  const list = document.getElementById('accountList');
  list.innerHTML = '';
  accounts.forEach((acc) => {
    const div = document.createElement('div');
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteAccount(acc.name);
    deleteBtn.style.cssText = 'background: #ff5f6d; color: white; border: none; padding: 5px 8px; margin-left: 10px; cursor: pointer; border-radius: 5px; font-weight: normal; transform: none;';
    
    div.innerHTML = `<strong>${acc.name}</strong> : €${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
    div.appendChild(deleteBtn);
    list.appendChild(div);
  });
}

function updateAccountChart() {
  accountChart.data.labels = accounts.map(acc => acc.name);
  accountChart.data.datasets[0].data = accounts.map(acc => acc.balance);
  accountChart.update();
  
  totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  document.getElementById('totalBalance').textContent = `€${totalBalance.toLocaleString('fr-FR')}`;
  
  updateChart(); 
}


// === ACTIONS (Yahoo Finance) ===
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
  stockList.innerHTML = 'Chargement...';
  try {
    const symbols = myStocks.map(s => s.symbol).join(',');
    if (!symbols) {
        stockList.innerHTML = 'Aucune action à afficher.';
        return;
    }
    
    // Utilisation de la version v8 de l'API pour une meilleure fiabilité
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols}`;
    
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
    }
    const data = await res.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
        throw new Error('Réponse API invalide.');
    }
    
    stockList.innerHTML = '';
    
    data.quoteResponse.result.forEach((stock) => {
      const div = document.createElement('div');
      const change = stock.regularMarketChangePercent || 0;
      const color = change >= 0 ? '#4cd964' : '#ff5f6d';
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'X';
      deleteButton.onclick = () => deleteStock(stock.symbol);
      deleteButton.style.cssText = 'background: #ff5f6d; color: white; border: none; padding: 5px 8px; margin-left: 10px; cursor: pointer; border-radius: 5px; font-weight: normal; transform: none;';

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
  } catch (err) {
    stockList.innerHTML = 'Erreur lors du chargement des actions.';
    console.error('Erreur API des actions:', err);
  }
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
  document.querySelectorAll('.main > section, .main > .chart-section').forEach(el => {
    el.style.display = 'none';
  });

  if (target === 'tableau') {
    document.getElementById('section-tableau').style.display = 'flex'; 
    document.getElementById('balanceChart').style.display = 'block';
    document.getElementById('section-transactions').style.display = 'flex';
  } else if (target === 'comptes') {
    document.getElementById('section-comptes').style.display = 'block';
    document.getElementById('accountChart').style.display = 'block';
  } else if (target === 'actions') {
    document.getElementById('section-actions').style.display = 'block';
  } else if (target === 'parametres') {
    document.getElementById('section-parametres').style.display = 'block';
  }
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