// タブとデータの管理
let tabs = [];
let currentTabId = null;
let renamingTabId = null;
let hasSyFuPass = false;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    loadTabs();
    loadSettings();
    renderTabs();
    if (currentTabId) {
        switchTab(currentTabId);
    }
});

// 設定の読み込み
function loadSettings() {
    try {
        const savedPass = localStorage.getItem('syfu-has-pass');
        hasSyFuPass = savedPass === 'true';
        document.getElementById('hasSyFuPass').checked = hasSyFuPass;
    } catch (error// タブとデータの管理
let tabs = [];
let currentTabId = null;
let renamingTabId = null;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    loadTabs();
    renderTabs();
    if (currentTabId) {
        switchTab(currentTabId);
    }
});

// 設定の読み込み
function loadSettings() {
    try {
        const savedPass = localStorage.getItem('syfu-has-pass');
        hasSyFuPass = savedPass === 'true';
        document.getElementById('hasSyFuPass').checked = hasSyFuPass;
    } catch (error) {
        console.error('設定読み込みエラー:', error);
    }
}

// SyFu Pass設定の切り替え
function toggleSyFuPass() {
    hasSyFuPass = document.getElementById('hasSyFuPass').checked;
    try {
        localStorage.setItem('syfu-has-pass', hasSyFuPass.toString());
    } catch (error) {
        console.error('設定保存エラー:', error);
    }
}

// タブデータの読み込み
function loadTabs() {
    try {
        const savedTabs = localStorage.getItem('syfu-tabs');
        if (savedTabs) {
            tabs = JSON.parse(savedTabs);
            const savedCurrentTab = localStorage.getItem('syfu-current-tab');
            currentTabId = savedCurrentTab ? parseInt(savedCurrentTab) : tabs[0]?.id;
        } else {
            // 初回起動時のデフォルトタブ
            tabs = [{
                id: Date.now(),
                name: 'メインタブ',
                payments: [
                    { id: 1, amount: 1500, name: 'ランチ代', date: '2025-01-15' },
                    { id: 2, amount: 2300, name: 'コンビニ', date: '2025-01-18' },
                    { id: 3, amount: 4500, name: '書籍購入', date: '' }
                ]
            }];
            currentTabId = tabs[0].id;
            saveTabs();
        }
    } catch (error) {
        console.error('タブ読み込みエラー:', error);
        tabs = [{
            id: Date.now(),
            name: 'メインタブ',
            payments: []
        }];
        currentTabId = tabs[0].id;
    }
}

// タブデータの保存
function saveTabs() {
    try {
        localStorage.setItem('syfu-tabs', JSON.stringify(tabs));
        localStorage.setItem('syfu-current-tab', currentTabId.toString());
    } catch (error) {
        console.error('保存エラー:', error);
    }
}

// タブの表示
function renderTabs() {
    const tabsList = document.getElementById('tabsList');
    
    tabsList.innerHTML = tabs.map(tab => `
        <div class="tab-item ${tab.id === currentTabId ? 'active' : ''}" onclick="switchTab(${tab.id})">
            <span class="tab-name">${escapeHtml(tab.name)}</span>
            <div class="tab-actions">
                <button class="tab-btn" onclick="event.stopPropagation(); openRenameModal(${tab.id})" title="名前変更">✏️</button>
                ${tabs.length > 1 ? `<button class="tab-btn" onclick="event.stopPropagation(); deleteTab(${tab.id})" title="削除">×</button>` : ''}
            </div>
        </div>
    `).join('');
}

// タブの切り替え
function switchTab(tabId) {
    currentTabId = tabId;
    renderTabs();
    renderPayments();
    saveTabs();
    
    // 検索結果をクリア
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('searchTime').style.display = 'none';
}

// 新しいタブを追加
function addNewTab() {
    const newTab = {
        id: Date.now(),
        name: `タブ ${tabs.length + 1}`,
        payments: []
    };
    tabs.push(newTab);
    currentTabId = newTab.id;
    saveTabs();
    renderTabs();
    renderPayments();
}

// タブの削除
function deleteTab(tabId) {
    if (tabs.length === 1) {
        alert('最後のタブは削除できません');
        return;
    }
    
    if (!confirm('このタブを削除しますか？')) {
        return;
    }
    
    tabs = tabs.filter(tab => tab.id !== tabId);
    
    // 削除したタブが現在のタブの場合、最初のタブに切り替え
    if (currentTabId === tabId) {
        currentTabId = tabs[0].id;
    }
    
    saveTabs();
    renderTabs();
    renderPayments();
}

// タブ名変更モーダルを開く
function openRenameModal(tabId) {
    renamingTabId = tabId;
    const tab = tabs.find(t => t.id === tabId);
    document.getElementById('renameInput').value = tab.name;
    document.getElementById('renameModal').style.display = 'flex';
    document.getElementById('renameInput').focus();
}

// タブ名変更モーダルを閉じる
function closeRenameModal() {
    document.getElementById('renameModal').style.display = 'none';
    renamingTabId = null;
}

// タブ名変更を確定
function confirmRename() {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName) {
        alert('タブ名を入力してください');
        return;
    }
    
    const tab = tabs.find(t => t.id === renamingTabId);
    if (tab) {
        tab.name = newName;
        saveTabs();
        renderTabs();
    }
    
    closeRenameModal();
}

// 現在のタブを取得
function getCurrentTab() {
    return tabs.find(tab => tab.id === currentTabId);
}

// 決済データの表示
function renderPayments() {
    const listElement = document.getElementById('paymentList');
    const currentTab = getCurrentTab();
    
    if (!currentTab || currentTab.payments.length === 0) {
        listElement.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 1rem;">決済データがありません</div>';
        return;
    }
    
    listElement.innerHTML = currentTab.payments.map(payment => `
        <div class="payment-item">
            <div class="payment-info">
                <div class="payment-main">
                    <span class="payment-name">${escapeHtml(payment.name)}</span>
                    <span class="payment-amount">¥${payment.amount.toLocaleString()}</span>
                </div>
                ${payment.date ? `<span class="payment-date">${payment.date}</span>` : ''}
            </div>
            <button class="btn-remove" onclick="removePayment(${payment.id})">×</button>
        </div>
    `).join('');
}

// 決済データの追加
function addPayment() {
    const nameInput = document.getElementById('paymentName');
    const amountInput = document.getElementById('paymentAmount');
    const dateInput = document.getElementById('paymentDate');
    
    const name = nameInput.value.trim();
    const amount = parseInt(amountInput.value);
    const date = dateInput.value;
    
    if (!name || !amount || isNaN(amount)) {
        alert('決済名と金額を入力してください');
        return;
    }
    
    const currentTab = getCurrentTab();
    if (!currentTab) return;
    
    const newPayment = {
        id: Date.now(),
        amount: amount,
        name: name,
        date: date
    };
    
    currentTab.payments.push(newPayment);
    saveTabs();
    renderPayments();
    
    // フォームをクリア
    nameInput.value = '';
    amountInput.value = '';
    dateInput.value = '';
}

// 決済データの削除
function removePayment(id) {
    const currentTab = getCurrentTab();
    if (!currentTab) return;
    
    currentTab.payments = currentTab.payments.filter(p => p.id !== id);
    saveTabs();
    renderPayments();
}

// 最適な組み合わせを検索
function findCombinations() {
    const targetAmount = parseInt(document.getElementById('targetAmount').value);
    const currentTab = getCurrentTab();
    
    if (!currentTab || currentTab.payments.length === 0) {
        alert('決済データを追加してください');
        return;
    }
    
    if (!targetAmount || isNaN(targetAmount)) {
        alert('目標金額を入力してください');
        return;
    }
    
    const startTime = performance.now();
    const allCombinations = [];
    
    // バックトラッキングアルゴリズム
    function backtrack(index, current, currentSum) {
        if (current.length > 0) {
            allCombinations.push({
                items: [...current],
                total: currentSum,
                diff: Math.abs(targetAmount - currentSum)
            });
        }
        
        // 目標金額を大きく超えたら枝刈り
        if (currentSum > targetAmount * 1.5) return;
        
        for (let i = index; i < currentTab.payments.length; i++) {
            current.push(currentTab.payments[i]);
            backtrack(i + 1, current, currentSum + currentTab.payments[i].amount);
            current.pop();
        }
    }
    
    backtrack(0, [], 0);
    
    // 差額が小さい順にソート
    allCombinations.sort((a, b) => a.diff - b.diff);
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    // 検索時間を表示
    document.getElementById('timeValue').textContent = searchTime.toFixed(2);
    document.getElementById('searchTime').style.display = 'flex';
    
    // 結果を表示
    displayResults(allCombinations.slice(0, 10));
}

// 検索結果の表示
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    
    if (results.length === 0) {
        resultsSection.style.display = 'none';
        alert('組み合わせが見つかりませんでした');
        return;
    }
    
    resultsList.innerHTML = results.map((result, index) => `
        <div class="result-item ${index === 0 ? 'best' : ''}" onclick="useResult(${index})" style="cursor: pointer;">
            <div class="result-header">
                <div class="result-info">
                    ${index === 0 ? '<span class="badge-best">最適</span>' : ''}
                    <span class="result-total">合計: ¥${result.total.toLocaleString()}</span>
                    <span class="result-diff ${result.diff === 0 ? 'perfect' : ''}">
                        ${result.diff === 0 ? '(ぴったり!)' : `(差額: ¥${result.diff.toLocaleString()})`}
                    </span>
                </div>
                <span class="result-count">${result.items.length}件</span>
            </div>
            <div class="result-items">
                ${result.items.map(item => `
                    <span class="item-tag">
                        ${escapeHtml(item.name)} (¥${item.amount.toLocaleString()})
                        ${item.date ? `<span class="item-date">• ${item.date}</span>` : ''}
                    </span>
                `).join('')}
            </div>
            <div class="result-hint">この組み合わせに決定（クリックして決済データを削除）</div>
        </div>
    `).join('');
    
    // 結果をグローバル変数に保存（useResultで使用）
    window.currentResults = results;
    
    resultsSection.style.display = 'block';
    
    // 結果セクションまでスクロール
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 検索結果を使用（決済データを削除）
function useResult(resultIndex) {
    const result = window.currentResults[resultIndex];
    
    if (!confirm(`この組み合わせ（合計¥${result.total.toLocaleString()}）の決済データを削除しますか？`)) {
        return;
    }
    
    const currentTab = getCurrentTab();
    if (!currentTab) return;
    
    // 選択された組み合わせのIDリストを取得
    const idsToRemove = result.items.map(item => item.id);
    
    // 該当する決済データを削除
    currentTab.payments = currentTab.payments.filter(p => !idsToRemove.includes(p.id));
    
    saveTabs();
    renderPayments();
    
    // 検索結果をクリア
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('searchTime').style.display = 'none';
    
    alert(`${result.items.length}件の決済データを削除しました`);
}

// HTMLエスケープ（XSS対策）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enterキーでの送信対応
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'paymentName' || 
            activeElement.id === 'paymentAmount' || 
            activeElement.id === 'paymentDate') {
            addPayment();
        } else if (activeElement.id === 'targetAmount') {
            findCombinations();
        } else if (activeElement.id === 'renameInput') {
            confirmRename();
        }
    }
});

// モーダルの背景クリックで閉じる
document.addEventListener('click', function(e) {
    const modal = document.getElementById('renameModal');
    if (e.target === modal) {
        closeRenameModal();
    }
});