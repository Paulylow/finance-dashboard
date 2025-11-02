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
            document.getElementById('incomeAmount').focus(); 
        } else if (action === 'withdraw-money') {
            modalWithdrawMoney.style.display = 'flex';
            document.getElementById('amount').focus(); 
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
