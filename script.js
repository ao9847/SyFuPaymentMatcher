// 決済データの管理
let payments = [];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    loadPayments();
    renderPayments();
});

// データの読み込み
function loadPayments() {
    try {
        const savedData = localStorage.getItem('syfu-payments');
        if (savedData) {
            payments = JSON.parse(savedData);
        } else {
            // 初回起動時のサンプルデータ
            payments = [
                { id: 1, amount: 1500, name: 'ランチ代', date: '2025-01-15' },
                { id: 2, amount: 2300, name: 'コンビニ', date: '2025-01-18' },
                { id: 3, amount: 4500, name: '書籍購入', date: '' }
            ];
            savePayments();
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        payments = [];
    }
}

// データの保存
function savePayments() {
    try {
        localStorage.setItem('syfu-payments', JSON.stringify(payments));
    } catch (error) {
        console.error('保存エラー:', error);
    }
}

// 決済データの表示
function renderPayments() {
    const listElement = document.getElementById('paymentList');
    
    if (payments.length === 0) {
        listElement.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 1rem;">決済データがありません</div>';
        return;
    }
    
    listElement.innerHTML = payments.map(payment => `
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
    
    const newPayment = {
        id: Date.now(),
        amount: amount,
        name: name,
        date: date
    };
    
    payments.push(newPayment);
    savePayments();
    renderPayments();
    
    // フォームをクリア
    nameInput.value = '';
    amountInput.value = '';
    dateInput.value = '';
}

// 決済データの削除
function removePayment(id) {
    payments = payments.filter(p => p.id !== id);
    savePayments();
    renderPayments();
}

// 最適な組み合わせを検索
function findCombinations() {
    const targetAmount = parseInt(document.getElementById('targetAmount').value);
    
    if (payments.length === 0) {
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
        
        for (let i = index; i < payments.length; i++) {
            current.push(payments[i]);
            backtrack(i + 1, current, currentSum + payments[i].amount);
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
        <div class="result-item ${index === 0 ? 'best' : ''}">
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
        </div>
    `).join('');
    
    resultsSection.style.display = 'block';
    
    // 結果セクションまでスクロール
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        }
    }
});
