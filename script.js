let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let userData = JSON.parse(localStorage.getItem('terminalUser') || 'null');
let currentPos = 'LONG';
let currentImg = "";
let editingId = null;

// 로그인 및 초기화
function handleLogin() {
    const name = document.getElementById('userName').value;
    const seed = document.getElementById('initialSeed').value;
    if (!name || !seed) return alert("필수 입력");
    userData = { name, seed: parseFloat(seed) };
    localStorage.setItem('terminalUser', JSON.stringify(userData));
    initSystem();
}

function initSystem() {
    if (userData) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('userDisplay').innerText = `● OP: ${userData.name}`;
        document.getElementById('terminalBrand').innerText = `${userData.name}_v1.0`;
        updateDashboardStats();
        updateHome();
    }
}

function logout() { localStorage.removeItem('terminalUser'); location.reload(); }

// 통계 계산 로직 (수정됨)
function calculateStats(targetLogs) {
    if (!targetLogs.length) return { count: 0, winRate: 0, pnl: 0, cash: 0 };
    const wins = targetLogs.filter(l => parseFloat(l.rate) > 0).length;
    const cash = targetLogs.reduce((a, b) => a + parseFloat(b.amount), 0);
    const pnl = ((cash / userData.seed) * 100).toFixed(2);
    return { count: targetLogs.length, winRate: ((wins / targetLogs.length) * 100).toFixed(1), pnl, cash: cash.toFixed(2) };
}

function updateDashboardStats() {
    const s = calculateStats(logs);
    document.getElementById('equityStats').innerHTML = `
        <div class="card equity"><h4>TOTAL ROI</h4><p style="color:${s.pnl>=0?'var(--green)':'var(--red)'}">${s.pnl}%</p></div>
        <div class="card equity"><h4>NET PROFIT</h4><p>$${s.cash}</p></div>
        <div class="card"><h4>WIN RATE</h4><p>${s.winRate}%</p></div>
        <div class="card"><h4>TRADES</h4><p>${s.count}</p></div>`;
}

// 매매 저장/수정
function handleImg(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImg = e.target.result;
        document.getElementById('imgPreview').innerHTML = `<img src="${currentImg}">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function addLog() {
    const name = document.getElementById('stockName').value.toUpperCase();
    const margin = parseFloat(document.getElementById('tradeSize').value);
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);

    if (!name || isNaN(margin)) return alert("데이터 입력 확인");
    let rate = (((sell - buy) / buy) * 100 * lev) * (currentPos === 'SHORT' ? -1 : 1);
    let amount = (margin * (rate / 100)).toFixed(2);

    const logEntry = {
        id: editingId || Date.now(),
        fullDate: new Date().toISOString(),
        pos: currentPos, name, margin, lev, buy, sell, rate: rate.toFixed(2), amount, img: currentImg
    };

    if (editingId) {
        logs = logs.map(l => l.id === editingId ? logEntry : l);
        editingId = null;
        document.getElementById('saveBtn').innerText = "CONFIRM SAVE";
    } else {
        logs.push(logEntry);
    }

    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    clearInputs();
    showSection('menuSection');
}

function clearInputs() {
    document.getElementById('stockName').value = "";
    document.getElementById('tradeSize').value = "";
    document.getElementById('imgPreview').innerHTML = "";
    currentImg = "";
}

// 수정 및 삭제
function editLog(id) {
    const l = logs.find(log => log.id === id);
    editingId = id;
    showSection('inputSection');
    document.getElementById('stockName').value = l.name;
    document.getElementById('tradeSize').value = l.margin;
    document.getElementById('leverage').value = l.lev;
    document.getElementById('buyPrice').value = l.buy;
    document.getElementById('sellPrice').value = l.sell;
    document.getElementById('memo').value = l.memo || "";
    document.getElementById('saveBtn').innerText = "UPDATE LOG";
}

function deleteLog(id) {
    if (confirm("삭제할까?")) {
        logs = logs.filter(l => l.id !== id);
        localStorage.setItem('tradeLogs', JSON.stringify(logs));
        updateDashboardStats(); updateHome();
    }
}

// 필터링 기능 (퀵 버튼 포함)
function setQuickDate(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
    document.getElementById('endDate').value = end.toISOString().split('T')[0];
    filterLogs();
}

function filterLogs() {
    const start = new Date(document.getElementById('startDate').value);
    const end = new Date(document.getElementById('endDate').value);
    end.setHours(23, 59, 59);

    const filtered = logs.filter(l => {
        const d = new Date(l.fullDate);
        return d >= start && d <= end;
    });

    const s = calculateStats(filtered);
    document.getElementById('queryAnalysis').innerHTML = `
        <div class="card"><h4>PERIOD ROI</h4><p>${s.pnl}%</p></div>
        <div class="card"><h4>PERIOD PROFIT</h4><p>$${s.cash}</p></div>
        <div class="card"><h4>WIN RATE</h4><p>${s.winRate}%</p></div>
        <div class="card"><h4>TRADES</h4><p>${s.count}</p></div>`;

    renderLogs(filtered, 'filteredLogs');
}

// 렌더링
function renderLogs(data, targetId) {
    document.getElementById(targetId).innerHTML = data.slice().reverse().map(l => `
        <div class="log-item" style="border-left-color: ${l.rate >= 0 ? 'var(--green)' : 'var(--red)'}">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${l.name} <small>${l.pos} ${l.lev}x</small></span>
                <span style="color:${l.rate >= 0 ? 'var(--green)' : 'var(--red)'}">$${l.amount} (${l.rate}%)</span>
            </div>
            ${l.img ? `<img src="${l.img}" class="log-img" onclick="window.open('${l.img}')">` : ''}
            <div class="btn-group">
                <span class="edit-btn" onclick="editLog(${l.id})">EDIT</span>
                <span class="del-btn" onclick="deleteLog(${l.id})">DELETE</span>
            </div>
        </div>`).join('');
}

function updateHome() { renderLogs(logs.slice(-10), 'recentLogs'); }

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = id === 'inputSection' ? 'flex' : 'block';
    if(id === 'menuSection') { updateDashboardStats(); updateHome(); }
}

function toggleSidebar() { document.body.classList.toggle('sidebar-closed'); }
function toggleTicker() { document.body.classList.toggle('ticker-closed'); }
function setPos(p) { currentPos = p; document.getElementById('longBtn').className = p === 'LONG' ? 'active' : ''; document.getElementById('shortBtn').className = p === 'SHORT' ? 'active' : ''; }

window.onload = () => { initSystem(); };
