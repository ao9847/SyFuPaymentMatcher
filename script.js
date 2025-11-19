// タブとデータの管理
let tabs = [];
let currentTabId = null;
let renamingTabId = null;

// 設定
let settings = {
    syFuPassEnabled: false
};

// 為替レートキャッシュ
let exchangeRates = {};
let ratesLoaded = false;

// 設定の読み込み
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('syfu-settings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('設定読み込みエラー:', error);
    }
}

// 設定の保存
function saveSettings() {
    try {
        localStorage.setItem('syfu-settings', JSON.stringify(settings));
    } catch (error) {
        console.error('設定保存エラー:', error);
    }
}

// 設定モーダルを開く
function openSettingsModal() {
    // 現在の設定をUIに反映
    document.getElementById('syFuPassEnabled').checked = settings.syFuPassEnabled;
    document.getElementById('settingsModal').style.display = 'flex';
}

// 設定モーダルを閉じる
function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

// 設定を更新
function updateSettings() {
    settings.syFuPassEnabled = document.getElementById('syFuPassEnabled').checked;
    saveSettings();
    console.log('設定を更新しました:', settings);

    // 設定変更を反映するため表示を更新
    renderPayments();
}

// 為替レートを外部APIから取得して自動更新
async function loadExchangeRates() {
    try {
        // localStorageから保存済みデータを確認
        const cachedData = localStorage.getItem('exchange-rates-cache');
        const lastUpdate = localStorage.getItem('exchange-rates-last-update');
        const today = new Date().toISOString().split('T')[0];
        
        // 今日既に更新済みならキャッシュを使用
        if (cachedData && lastUpdate === today) {
            exchangeRates = JSON.parse(cachedData);
            ratesLoaded = true;
            console.log('為替レート読み込み完了（キャッシュ）:', Object.keys(exchangeRates).length + '日分');
            return;
        }
        
        console.log('為替レートを更新中...');
        const rates = {};
        const today_date = new Date();
        
        // 過去30日分のレートを取得
        for (let i = 0; i < 30; i++) {
            const date = new Date(today_date);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            try {
                // プライマリURL（jsdelivr CDN）
                let url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.min.json`;
                let response = await fetch(url);
                
                // フォールバック（Cloudflare Pages）
                if (!response.ok) {
                    url = `https://${dateStr}.currency-api.pages.dev/v1/currencies/usd.min.json`;
                    response = await fetch(url);
                }
                
                if (response.ok) {
                    const data = await response.json();
                    // USD -> JPY レート
                    rates[dateStr] = data.usd.jpy;
                } else {
                    // データがない場合は前日のレートを使用
                    const prevDate = new Date(date);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const prevDateStr = prevDate.toISOString().split('T')[0];
                    rates[dateStr] = rates[prevDateStr] || 150.0;
                }
            } catch (error) {
                console.warn(`レート取得失敗 (${dateStr}):`, error);
                // エラー時は前日のレートまたはデフォルト値
                if (i > 0) {
                    const prevDate = new Date(date);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const prevDateStr = prevDate.toISOString().split('T')[0];
                    rates[dateStr] = rates[prevDateStr] || 150.0;
                } else {
                    rates[dateStr] = 150.0;
                }
            }
            
            // API負荷軽減のため少し待機
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        exchangeRates = rates;
        ratesLoaded = true;
        
        // localStorageに保存（1日1回更新）
        try {
            localStorage.setItem('exchange-rates-cache', JSON.stringify(rates));
            localStorage.setItem('exchange-rates-last-update', today);
        } catch (e) {
            console.warn('為替レートキャッシュ保存失敗:', e);
        }
        
        console.log('為替レート更新完了:', Object.keys(exchangeRates).length + '日分');
        
    } catch (error) {
        console.error('為替レート取得エラー:', error);
        // エラー時はデフォルト値を使用
        generateDefaultRates();
    }
}

// デフォルトレート生成（API取得失敗時のフォールバック）
function generateDefaultRates() {
    const rates = {};
    const today = new Date();
    const baseRate = 150.0;
    
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const variation = (Math.random() - 0.5) * 6;
        rates[dateStr] = parseFloat((baseRate + variation).toFixed(2));
    }
    
    exchangeRates = rates;
    ratesLoaded = true;
    console.log('デフォルト為替レート生成:', Object.keys(exchangeRates).length + '日分');
}

// 日付から為替レートを取得
function getExchangeRate(dateStr) {
    if (!dateStr) {
        // 日付がない場合は今日のレートを使用
        const today = new Date().toISOString().split('T')[0];
        return exchangeRates[today] || 150.0;
    }
    
    // 指定日のレートを取得、なければ最も近い日のレート
    if (exchangeRates[dateStr]) {
        return exchangeRates[dateStr];
    }
    
    // 日付がデータベースにない場合は平均レートを返す
    const rates = Object.values(exchangeRates);
    return rates.reduce((a, b) => a + b, 0) / rates.length;
}

// 円をドルに変換
function convertYenToUsd(yen, dateStr) {
    const rate = getExchangeRate(dateStr);
    let usd = yen / rate;

    // 小数点切り上げ
    usd = Math.ceil(usd);

    // SyFu Passが有効な場合は+20%して再度切り上げ
    if (settings.syFuPassEnabled) {
        usd = Math.ceil(usd * 1.2);
    }

    return usd;
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    // 設定を読み込む
    loadSettings();

    // 為替レートを読み込んでからタブを初期化
    loadExchangeRates().then(() => {
        loadTabs();
        renderTabs();
        renderPayments();
    });
});

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
                name: 'MANEKINEKO #1',
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
            name: 'MANEKINEKO #1',
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
        name: `MANEKINEKO #${tabs.length + 1}`,
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
    
    listElement.innerHTML = currentTab.payments.map(payment => {
        const usdAmount = convertYenToUsd(payment.amount, payment.date);
        const rate = getExchangeRate(payment.date);
        
        return `
        <div class="payment-item">
            <div class="payment-info">
                <div class="payment-main">
                    <span class="payment-name">${escapeHtml(payment.name)}</span>
                    <span class="payment-amount">¥${payment.amount.toLocaleString()}</span>
                    <span class="payment-usd">($${usdAmount.toFixed(2)})</span>
                </div>
                ${payment.date ? `<span class="payment-date">${payment.date} (レート: ¥${rate.toFixed(2)}/USD)</span>` : `<span class="payment-date">日付なし (レート: ¥${rate.toFixed(2)}/USD)</span>`}
            </div>
            <button class="btn-remove" onclick="removePayment(${payment.id})">×</button>
        </div>
        `;
    }).join('');
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
    const targetAmountUsd = parseFloat(document.getElementById('targetAmount').value);
    const currentTab = getCurrentTab();
    
    if (!currentTab || currentTab.payments.length === 0) {
        alert('決済データを追加してください');
        return;
    }
    
    if (!targetAmountUsd || isNaN(targetAmountUsd)) {
        alert('目標金額（USD）を入力してください');
        return;
    }
    
    const startTime = performance.now();
    const allCombinations = [];
    
    // バックトラッキングアルゴリズム（USD換算で計算）
    function backtrack(index, current, currentSumUsd, currentSumYen) {
        if (current.length > 0) {
            allCombinations.push({
                items: [...current],
                totalUsd: currentSumUsd,
                totalYen: currentSumYen,
                diff: Math.abs(targetAmountUsd - currentSumUsd)
            });
        }
        
        // 目標金額を大きく超えたら枝刈り
        if (currentSumUsd > targetAmountUsd * 1.5) return;
        
        for (let i = index; i < currentTab.payments.length; i++) {
            const payment = currentTab.payments[i];
            const paymentUsd = convertYenToUsd(payment.amount, payment.date);
            
            current.push(payment);
            backtrack(i + 1, current, currentSumUsd + paymentUsd, currentSumYen + payment.amount);
            current.pop();
        }
    }
    
    backtrack(0, [], 0, 0);
    
    // 差額が小さい順にソート
    allCombinations.sort((a, b) => a.diff - b.diff);
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    // 検索時間を表示
    document.getElementById('timeValue').textContent = searchTime.toFixed(2);
    document.getElementById('searchTime').style.display = 'flex';
    
    // 結果を表示
    displayResults(allCombinations.slice(0, 10), targetAmountUsd);
}

// 検索結果の表示
function displayResults(results, targetAmountUsd) {
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
                    <span class="result-total">合計: $${result.totalUsd.toFixed(2)} (¥${result.totalYen.toLocaleString()})</span>
                    <span class="result-diff ${result.diff < 0.01 ? 'perfect' : ''}">
                        ${result.diff < 0.01 ? '(ぴったり!)' : `差額: $${result.diff.toFixed(2)}`}
                    </span>
                </div>
                <span class="result-count">${result.items.length}件</span>
            </div>
            <div class="result-items">
                ${result.items.map(item => {
                    const usdAmount = convertYenToUsd(item.amount, item.date);
                    const rate = getExchangeRate(item.date);
                    return `
                    <span class="item-tag">
                        ${escapeHtml(item.name)} (¥${item.amount.toLocaleString()})
                        ${item.date ? `<span class="item-date"> ${item.date}</span>` : ''}
                    </span>
                    `;
                }).join('')}
            </div>
            <div class="result-hint">この組み合わせに決定（選択して決済データ一覧から削除）</div>
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
    
    if (!confirm(`この組み合わせ（合計 $${result.totalUsd.toFixed(2)} / ¥${result.totalYen.toLocaleString()}）の決済データを削除しますか？`)) {
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
    const renameModal = document.getElementById('renameModal');
    const settingsModal = document.getElementById('settingsModal');

    if (e.target === renameModal) {
        closeRenameModal();
    }
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
});