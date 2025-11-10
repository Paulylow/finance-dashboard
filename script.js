// === Données initiales ===
// Structure de compte modifiée : { name: 'Nom', balance: 0, history: [{date: 'jj/mm/aaaa', value: 0}] }
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
let totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0); 

document.getElementById('totalBalance').textContent = `€${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

// Nettoyage des anciennes données qui ne sont plus utilisées
localStorage.removeItem('expenses');
localStorage.removeItem('incomes');

// === FONCTION UTILITAIRE : Gérer la Virgule et la Conversion en Nombre ===
function parseAmount(input) {
    const str = input.replace(',', '.');
    return parseFloat(str);
}

// === FONCTION UTILITAIRE : Formater la date en jj/mm/aaaa ===
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// === FONCTION UTILITAIRE : Calculer l'évolution (Gain/Perte et %) ===
function calculateEvolution(account) {
    const history = account.history.sort((a, b) => new Date(a.date) - new Date(b.date)); // S'assurer que c'est trié par date
    
    if (history.length < 2) {
        return { change: 0, percentage: 0, fromDate: null };
    }
    
    const latestEntry = history[history.length - 1];
    const previousEntry = history[history.length - 2];

    const latestValue = latestEntry.value;
    const previousValue = previousEntry.value;

    const change = latestValue - previousValue;
    const percentage = previousValue === 0 ? 0 : (change / previousValue) * 100;
    
    return { 
        change, 
        percentage, 
        fromDate: previousEntry.date 
    };
}


// === GESTION DES MODALES (Mise à jour) ===
const modalUpdateAccount = document.getElementById('modal-update-account');
const closeButtons = document.querySelectorAll('.close-button');

// Ouvrir la modale (via les boutons de la carte principale et l'action rapide)
document.querySelectorAll('.update-btn').forEach(item => {
    item.addEventListener('click', () => {
        updateAccountSelectForUpdate(); // S'assure que la liste est à jour
        modalUpdateAccount.style.display = 'flex';
        // Règle la date du jour par défaut
        document.getElementById('updateDate').valueAsDate = new Date(); 
    });
});

// Fermer la modale
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modalUpdateAccount.style.display = 'none';
    });
});
window.addEventListener('click', (event) => {
    if (event.target === modalUpdateAccount) {
        modalUpdateAccount.style.display = 'none';
    }
});

// Mettre à jour le sélecteur dans la modale de mise à jour
function updateAccountSelectForUpdate() {
    const select = document.getElementById('updateAccountSelect');
    const defaultOption = `<option value="">Choisir un compte à mettre à jour</option>`;
    
    const accountOptions = accounts.map(acc => 
        `<option value="${acc.name}">${acc.name} (€${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })})</option>`
    ).join('');
    
    select.innerHTML = defaultOption + accountOptions;
}


// === SOUMISSION DU FORMULAIRE DE MISE À JOUR ===
document.getElementById('updateAccountForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const selectedAccountName = document.getElementById('updateAccountSelect').value;
    const newBalanceInput = document.getElementById('updateNewBalance').value.trim();
    const updateDate = document.getElementById('updateDate').value;
    
    const newBalance = parseAmount(newBalanceInput);
    
    if (isNaN(newBalance) || newBalance < 0 || !selectedAccountName || !updateDate) {
        alert("Veuillez remplir tous les champs correctement.");
        return;
    }
    
    const accountIndex = accounts.findIndex(acc => acc.name === selectedAccountName);
    
    if (accountIndex !== -1) {
        const account = accounts[accountIndex];
        const formattedDate = formatDate(updateDate);
        
        // 1. Mettre à jour le solde actuel
        account.balance = newBalance;

        // 2. Ajouter à l'historique (ou mettre à jour si la date existe déjà)
        const historyIndex = account.history.findIndex(h => h.date === formattedDate);

        if (historyIndex !== -1) {
            account.history[historyIndex].value = newBalance; // Mise à jour
        } else {
            account.history.push({ date: formattedDate, value: newBalance }); // Ajout
        }
        
        // Trier l'historique par date
        account.history.sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));

        localStorage.setItem('accounts', JSON.stringify(accounts));
        
        updateAccountChart();
        updateAccountList();
        updateChart(); // Mise à jour du graphique global
    }

    e.target.reset();
    modalUpdateAccount.style.display = 'none'; 
});


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
    
    // Ajoute le solde initial à l'historique
    const initialHistory = [{ 
        date: formatDate(new Date()), 
        value: balance 
    }];

    accounts.push({ name, balance, history: initialHistory });
    localStorage.setItem('accounts', JSON.stringify(accounts));
    updateAccountList();
    updateAccountChart(); 
    updateAccountSelectForUpdate(); 
    e.target.reset();
  }
});

function deleteAccount(accountName) {
  accounts = accounts.filter(acc => acc.name !== accountName);
  localStorage.setItem('accounts', JSON.stringify(accounts));
  updateAccountList();
  updateAccountChart();
  updateAccountSelectForUpdate();
}

function updateAccountList() {
  const list = document.getElementById('accountList');
  list.innerHTML = '';
  if (accounts.length === 0) {
      list.innerHTML = '<p style="text-align:center; color:#B0B0B0;">Aucun compte ajouté.</p>';
  }
  accounts.forEach((acc) => {
    const div = document.createElement('div');
    
    const evolution = calculateEvolution(acc);
    const evolutionClass = evolution.change >= 0 ? 'income' : 'expense';
    const evolutionSign = evolution.change >= 0 ? '+' : '';
    const evolutionText = evolution.fromDate ? 
        `(${evolutionSign}€${evolution.change.toFixed(2)} / ${evolutionSign}${evolution.percentage.toFixed(2)}% depuis ${evolution.fromDate})` : 
        '(Historique insuffisant)';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => deleteAccount(acc.name);
    
    div.innerHTML = `
        <div>
            <strong>${acc.name}</strong>
            <span class="evolution-detail ${evolutionClass}">${evolutionText}</span>
        </div>
        <div class="balance-and-actions">
            <span>€${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
            </div>
    `;
    div.querySelector('.balance-and-actions').appendChild(deleteBtn);
    list.appendChild(div);
  });
}

function updateAccountChart() {
  accountChart.data.labels = accounts.map(acc => acc.name);
  accountChart.data.datasets[0].data = accounts.map(acc => acc.balance);
  accountChart.update();
  
  totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  document.getElementById('totalBalance').textContent = `€${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  
  updateChart(); // Met à jour le graphique de solde total
}


// === Graphique dynamique du solde Total (Ligne - Suivi Agrégé) ===
const evolutionCtx = document.getElementById('evolutionChart').getContext('2d');
let evolutionChart; // Déclaré pour être initialisé plus tard

function aggregateTotalPortfolioHistory() {
    let combinedHistory = [];
    
    // 1. Combiner tous les historiques de compte
    accounts.forEach(acc => {
        acc.history.forEach(entry => {
            combinedHistory.push({ ...entry, date: entry.date }); // Date est déjà au format jj/mm/aaaa
        });
    });

    // 2. Agréger les valeurs par date
    const aggregated = combinedHistory.reduce((acc, entry) => {
        const key = entry.date;
        acc[key] = (acc[key] || 0) + entry.value;
        return acc;
    }, {});

    // 3. Convertir en tableau trié
    let totalPortfolioHistory = Object.keys(aggregated).map(dateKey => ({
        date: dateKey,
        value: aggregated[dateKey]
    }));

    // Trier par date pour le graphique
    totalPortfolioHistory.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA - dateB;
    });

    // 4. Lisser les données (garder la valeur la plus récente si plusieurs mises à jour le même jour)
    const finalHistory = [];
    totalPortfolioHistory.forEach(entry => {
        if (finalHistory.length > 0) {
            // S'assurer que chaque entrée suivante est au moins égale à la précédente
            // Pour afficher une courbe de solde progressif
            const lastEntry = finalHistory[finalHistory.length - 1];
            if (new Date(entry.date.split('/').reverse().join('-')) > new Date(lastEntry.date.split('/').reverse().join('-'))) {
                 finalHistory.push(entry);
            } else if (entry.value !== lastEntry.value) {
                // Si la date est la même (ou plus ancienne, ce qui ne devrait pas arriver après le tri), 
                // mettez à jour la dernière entrée
                lastEntry.value = entry.value; 
            }
        } else {
            finalHistory.push(entry);
        }
    });

    // 5. Gérer les données manquantes (remplir avec la valeur précédente)
    // Ce n'est pas nécessaire pour un simple affichage des points de mise à jour. 
    
    return {
        labels: finalHistory.map(item => item.date),
        data: finalHistory.map(item => item.value)
    };
}


function initEvolutionChart() {
    const aggregated = aggregateTotalPortfolioHistory();

    evolutionChart = new Chart(evolutionCtx, {
      type: 'line',
      data: {
        labels: aggregated.labels,
        datasets: [{
          label: 'Patrimoine Total (€)',
          data: aggregated.data,
          borderColor: '#4CD964', // Couleur verte pour le patrimoine
          backgroundColor: 'rgba(76, 217, 100, 0.2)',
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
}

function updateChart() {
    if (!evolutionChart) {
        initEvolutionChart();
    }
    const updatedData = aggregateTotalPortfolioHistory();
    evolutionChart.data.labels = updatedData.labels;
    evolutionChart.data.datasets[0].data = updatedData.data;
    evolutionChart.update();
}


// === NAVIGATION (Single Page Application - SPA) ===
function showSection(target) {
  // 1. Masquer toutes les sections
  document.querySelectorAll('.main > section').forEach(el => {
    el.style.display = 'none';
  });

  // Masquer les canvas manuellement
  document.getElementById('evolutionChart').style.display = 'none';
  document.getElementById('accountChart').style.display = 'none';


  // 2. Retirer la classe active de tous les éléments de navigation
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));

  // 3. Afficher la section ciblée
  const targetElement = document.getElementById(`section-${target}`);
  if (targetElement) {
      targetElement.style.display = (target === 'tableau') ? 'flex' : 'block'; 
  }

  // 4. Afficher les éléments spécifiques
  if (target === 'historique') {
      document.getElementById('evolutionChart').style.display = 'block'; 
      updateChart();
  }
  
  if (target === 'comptes') {
      document.getElementById('accountChart').style.display = 'block';
  }

  // 5. Activer le lien correspondant
  const activeLink = document.querySelector(`.sidebar li[data-target="${target}"]`);
  if (activeLink) {
      activeLink.classList.add('active');
  }
}

// === Gestion des clics sur la sidebar ===
const allNavLinks = document.querySelectorAll('.sidebar li'); 

allNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    const target = link.getAttribute('data-target');
    showSection(target);
  });
});


// === Initialisation de l'affichage au chargement ===
updateAccountList();
updateAccountChart();
updateAccountSelectForUpdate();
initEvolutionChart(); 
showSection('tableau'); // Démarre sur le tableau de bord
