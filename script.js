// === Données initiales ===
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];

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
    });
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modalAddMoney.style.display = 'none';
        modalWithdrawMoney.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target === modalAddMoney) {
        modalAddMoney.style.display = 'none';
    }
    if (event.target === modalWithdrawMoney) {
        modalWithdrawMoney.style.display = 'none';
    }
});


// === DÉPENSES (Le compte est maintenant affecté) ===
document.getElementById('expenseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedAccountName = document.getElementById('expenseAccount').value;
  const amountInput = document.getElementById('amount').value.trim();
  const reason = document.getElementById('reason').value; // Récupère la valeur du sélecteur
  
  const amount = parseAmount(amountInput);

  if (isNaN(amount) || amount <= 0 || !reason || !selectedAccountName) {
      alert("Veuillez remplir tous les champs correctement et choisir un compte.");
      return;
  }
  
  const expense = { id: Date.now(), account: selectedAccountName, reason, amount, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}), type: 'expense' };
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

  updateCombinedTransactionList();
  updateChart();
  updateHistory();
  e.target.reset(); // Réinitialise le formulaire après soumission
  modalWithdrawMoney.style.display = 'none'; // Ferme la modale
});


// === REVENUS (Le compte est maintenant affecté) ===
document.getElementById('incomeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedAccountName = document.getElementById('incomeAccount').value;
  const amountInput = document.getElementById('incomeAmount').value.trim();
  const reason = document.getElementById('incomeReason').value; // Récupère la valeur du sélecteur
  
  const amount = parseAmount(amountInput);
  
  if (isNaN(amount) || amount <= 0 || !reason || !selectedAccountName) {
      alert("Veuillez remplir tous les champs correctement et choisir un compte.");
      return;
  }
  
  const income = { id: Date.now(), account: selectedAccountName, reason, amount, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}), type: 'income' };
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
  
  updateCombinedTransactionList();
  updateChart();
  updateHistory();
  e.target.reset(); // Réinitialise le formulaire après soumission
  modalAddMoney.style.display = 'none'; // Ferme la modale
});

// === NOUVEAU: Mettre à jour la liste des transactions combinées (Tableau de bord) ===
function updateCombinedTransactionList() {
    const combined = [
        ...expenses.map(t => ({ ...t, type: 'expense' })),
        ...incomes.map(t => ({ ...t, type: 'income' }))
    ];
    
    // Trier par ID descendant (le plus récent en haut)
    combined.sort((a, b) => b.id - a.id); 

    const list = document.getElementById('combinedTransactionList');
    list.innerHTML = '';

    // Afficher les 5 dernières transactions
    combined.slice(0, 5).forEach((t) => {
        const isExpense = t.type === 'expense';
        const typeClass = isExpense ? 'expense' : 'income';
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="transaction-icon" style="background:${getIconColor(t.reason, isExpense)};">${getIcon(t.reason)}</div>
            <div class="transaction-details">
                <strong>${t.reason}</strong>
                <span>${t.time} - ${t.date} [${t.account}]</span>
            </div>
            <span class="transaction-amount ${typeClass}">
                ${isExpense ? '-€' : '+€'}${t.amount.toFixed(2)}
            </span>
            <button onclick="deleteTransaction('${t.type}', ${t.id}, ${t.amount}, '${t.account}')">X</button>
        `;
        list.appendChild(li);
    });
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
    } else if (type === 'income') {
        incomes = incomes.filter(inc => inc.id !== id);
        localStorage.setItem('incomes', JSON.stringify(incomes));
    }
    
    updateChart();
    updateCombinedTransactionList();
    updateHistory();
}

// === Fonctions pour les icônes de transaction (basées sur les options des sélecteurs) ===
function getIcon(reason) {
    switch (reason.toLowerCase()) {
        // Revenus
        case 'salaire': return '💰';
        case 'anniversaire': return '🎁';
        case 'prime': return '🌟';
        // Dépenses
        case 'voiture': return '🚗';
        case 'nourriture': return '🍔';
        case 'transport': return '🚌';
        case 'téléphone': return '📱';
        case 'sport': return '🏋️';
        // Général
        case 'autres':
        default: return '❓'; // CORRIGÉ: Icône pour "Autres"
    }
}

// CORRIGÉ: Détermine la couleur de fond de l'icône
function getIconColor(reason, isExpense) {
    if (isExpense) {
        return '#FF5F6D'; // Rouge pour toutes les dépenses
    }
    
    switch (reason.toLowerCase()) {
        case 'salaire':
        case 'prime':
        case 'anniversaire':
            return '#4CD964'; // Vert pour revenu
        case 'nourriture':
            return '#007AFF'; // Bleu pour nourriture si ce n'est pas une dépense
        default: 
            return '#8F7CF9'; // Violet par défaut pour revenus
    }
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


// === GESTION DE L'HISTORIQUE MENSUEL ===
const monthSelector = document.getElementById('monthSelector');

function getUniqueMonths() {
    const allTransactions = [...expenses, ...incomes];
    const uniqueMonths = new Set();
    
    allTransactions.forEach(t => {
        const dateParts = t.date.split('/');
        if (dateParts.length >= 2) {
            uniqueMonths.add(`${dateParts[1]}/${dateParts[2]}`);
        }
    });

    const today = new Date();
    const currentMonthKey = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    if (!uniqueMonths.has(currentMonthKey)) {
         uniqueMonths.add(currentMonthKey);
    }
    
    const sortedMonths = Array.from(uniqueMonths).sort((a, b) => {
        const [mA, yA] = a.split('/').map(Number);
        const [mB, yB] = b.split('/').map(Number);
        if (yA !== yB) return yB - yA;
        return mB - mA;
    });

    return sortedMonths;
}

function renderMonthSelector() {
    const uniqueMonths = getUniqueMonths();
    monthSelector.innerHTML = '';
    
    uniqueMonths.forEach(key => {
        const [month, year] = key.split('/');
        const monthName = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const option = document.createElement('option');
        option.value = key;
        option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthSelector.appendChild(option);
    });

    const today = new Date();
    const currentMonthKey = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    monthSelector.value = currentMonthKey;
}

function updateHistory() {
    renderMonthSelector();
    
    const selectedMonthKey = monthSelector.value;
    if (!selectedMonthKey) return;
    
    const [selectedMonth, selectedYear] = selectedMonthKey.split('/');

    const allTransactions = [...expenses, ...incomes];
    
    const filteredTransactions = allTransactions.filter(t => {
        const dateParts = t.date.split('/');
        if (dateParts.length >= 2) {
            const transactionMonth = dateParts[1];
            const transactionYear = dateParts[2];
            return transactionMonth === selectedMonth && transactionYear === selectedYear;
        }
        return false;
    });
    
    let totalExpenses = 0;
    let totalIncomes = 0;
    
    const list = document.getElementById('historyTransactionList');
    list.innerHTML = '';

    filteredTransactions.sort((a, b) => b.id - a.id).forEach(t => {
        const isExpense = expenses.some(e => e.id === t.id);
        const typeClass = isExpense ? 'expense' : 'income';
        
        if (isExpense) {
            totalExpenses += t.amount;
        } else {
            totalIncomes += t.amount;
        }
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="transaction-icon" style="background:${getIconColor(t.reason, isExpense)};">${getIcon(t.reason)}</div>
            <div class="transaction-details">
                <strong>${t.reason}</strong>
                <span>${t.time} - ${t.date} [${t.account}]</span>
            </div>
            <span class="transaction-amount ${typeClass}">
                ${isExpense ? '-€' : '+€'}${t.amount.toFixed(2)}
            </span>
        `;
        list.appendChild(li);
    });
    
    document.getElementById('historyTotalExpenses').textContent = `€${totalExpenses.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
    document.getElementById('historyTotalIncomes').textContent = `€${totalIncomes.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
}

monthSelector.addEventListener('change', updateHistory);


// === ACTIONS (SUPPRIMÉES) ===
let myStocks = [];
function fetchStocks() { 
    // Fonction vide car la section est supprimée
} 


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
  } else if (target === 'historique') {
    document.getElementById('section-historique').style.display = 'block';
    updateHistory(); 
  }
  
  const activeLink = document.querySelector(`.sidebar li[data-target="${target}"]`);
  if(activeLink) {
      activeLink.classList.add('active');
  }
}

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    const target = link.getAttribute('data-target');
    showSection(target);
  });
});

// NOUVEAU: Fonction pour forcer la fermeture des modales au démarrage
function ensureModalsClosed() {
    document.getElementById('modal-add-money').style.display = 'none';
    document.getElementById('modal-withdraw-money').style.display = 'none';
}

// === Initialisation de l'affichage au chargement ===
updateCombinedTransactionList();
showSection('tableau');
updateAccountList();
updateAccountChart();
updateAccountSelects();
ensureModalsClosed();
