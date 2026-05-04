let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';

function setPos(pos) {
    currentPos = pos;
    document.getElementById('longBtn').className = pos === 'LONG' ? 'active' : '';
    document.getElementById('shortBtn').className = pos === 'SHORT' ? 'active' : '';
}

function addLog() {
    const name = document.getElementById('stockName').value;
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const memo = document.getElementById('memo').value;
    const imageInput = document.getElementById('imageInput');

    if (!name || isNaN(lev) || isNaN(buy) || isNaN(sell)) return alert("정보를 모두 입력해주세요!");

    // 선물 수익률 공식: (판매가-진입가)/진입가 * 레버리지 * (롱1, 숏-1)
    let rawProfit = ((sell - buy) / buy) * 100 * lev;
    if (currentPos === 'SHORT') rawProfit *= -1;
    
    const profitRate = rawProfit.toFixed(2);

    const reader = new FileReader();
    if (imageInput.files[0]) {
        reader.readAsDataURL(imageInput.files[0]);
        reader.onload = () => save(name, lev, buy, sell, memo, profitRate, reader.result);
    } else {
        save(name, lev, buy, sell, memo, profitRate, null);
    }
}

function save(name, lev, buy, sell, memo, profitRate, img) {
    const newLog = { id: Date.now(), date: new Date().toISOString(), pos: currentPos, name, lev, buy, sell, memo, profitRate, img };
    logs.push(newLog);
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    location.reload(); // 새로고침하여 반영
}

window.onload = () => {
    updateSummary();
    displayLogs();
};

function updateSummary() {
    const now = new Date();
    const calc = (filterFn) => {
        const filtered = logs.filter(filterFn);
        if (filtered.length === 0) return "0%";
        const sum = filtered.reduce((acc, cur) => acc + parseFloat(cur.profitRate), 0);
        const avg = (sum / filtered.length).toFixed(2);
        return `<span class="${avg >= 0 ? 'plus' : 'minus'}">${avg}%</span>`;
    };

    const oneDay = 24 * 60 * 60 * 1000;
    document.getElementById('dayProfit').innerHTML = calc(l => (now - new Date(l.date)) < oneDay);
    document.getElementById('weekProfit').innerHTML = calc(l => (now - new Date(l.date)) < oneDay * 7);
    document.getElementById('monthProfit').innerHTML = calc(l => (now - new Date(l.date)) < oneDay * 30);
    document.getElementById('yearProfit').innerHTML = calc(l => true);
}

function displayLogs() {
    const list = document.getElementById('logList');
    list.innerHTML = logs.slice().reverse().map(log => `
        <div class="log-item">
            <div class="log-header">
                <strong>${log.name} <span class="badge" style="background:${log.pos === 'LONG'?'#0ecb81':'#f6465d'}">${log.pos} ${log.lev}x</span></strong>
                <span class="${log.profitRate >= 0 ? 'plus' : 'minus'}" style="font-size:1.3em">${log.profitRate}%</span>
            </div>
            <div style="font-size:0.8em; color:#848e9c; margin: 5px 0;">${new Date(log.date).toLocaleString()} | Entry: ${log.buy} | Exit: ${log.sell}</div>
            <p style="margin:10px 0; font-size:0.9em;">${log.memo}</p>
            ${log.img ? `<img src="${log.img}" class="log-img">` : ''}
        </div>
    `).join('');
}