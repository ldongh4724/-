let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let userData = JSON.parse(localStorage.getItem('terminalUser') || 'null');
let currentPos = 'LONG';
let currentImg = "";
let editingId = null;

window.onload = () => { if(userData) initSystem(); };

function handleLogin() {
    const name = document.getElementById('userName').value;
    const seed = document.getElementById('initialSeed').value;
    if (!name || !seed) return alert("데이터를 입력하세요.");
    userData = { name, seed: parseFloat(seed) };
    localStorage.setItem('terminalUser', JSON.stringify(userData));
    initSystem();
}

function initSystem() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('terminalBrand').innerText = `${userData.name}_v1.0`;
    updateDashboardStats();
    updateHome();
}

function logout() { if(confirm("로그아웃 하시겠습니까?")) { localStorage.removeItem('terminalUser'); location.reload(); } }

function toggleSidebar() {
    document.body.classList.toggle('sidebar-closed');
    document.getElementById('toggleIcon').innerText = document.body.classList.contains('sidebar-closed') ? '▶' : '◀';
}

// 정확한 ROI 및 통계 계산
function getAnalysis(dataList) {
    if (!dataList.length) return { count: 0, winRate: 0, totalProfit: 0, roi: 0 };
    const wins = dataList.filter(l => parseFloat(l.profitAmount) > 0).length;
    const totalProfit = dataList.reduce((acc, cur) => acc + parseFloat(cur.profitAmount), 0);
    const roi = ((totalProfit / userData.seed) * 100).toFixed(2);
    return {
        count: dataList.length,
        winRate: ((wins / dataList.length) * 100).toFixed(1),
        totalProfit: totalProfit.toFixed(2),
        roi: roi
    };
}

function updateDashboardStats() {
    const stats = getAnalysis(logs);
    const currentEquity = (userData.seed + parseFloat(stats.totalProfit)).toLocaleString();
    document.getElementById('equityStats').innerHTML = `
        <div class="card"><h4>Seed</h4><p>$${userData.seed.toLocaleString()}</p></div>
        <div class="card"><h4>Equity</h4><p>$${currentEquity}</p></div>
        <div class="card" style="border-left: 4px solid var(--accent)"><h4>Total ROI</h4><p style="color:${stats.roi>=0?'var(--green)':'var(--red)'}">${stats.roi}%</p></div>
        <div class="card"><h4>Win Rate</h4><p>${stats.winRate}%</p></div>
    `;
}

// 이미지 처리
function handleImg(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImg = e.target.result;
        document.getElementById('imgPreview').innerHTML = `<img src="${currentImg}" style="width:100%; height:100px; object-fit:cover; margin-top:10px; border-radius:4px;">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
}

// 로그 추가/수정
function addLog() {
    const name = document.getElementById('stockName').value.toUpperCase();
    const margin = parseFloat(document.getElementById('tradeSize').value);
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const memo = document.getElementById('memo').value;

    if (!name || isNaN(margin) || isNaN(buy) || isNaN(sell)) return alert("값을 확인하세요.");

    let tradeRoi = (((sell - buy) / buy) * 100 * lev) * (currentPos === 'SHORT' ? -1 : 1);
    let profitAmount = (margin * (tradeRoi / 100)).toFixed(2);

    const logData = {
        id: editingId || Date.now(),
        fullDate: new Date().toISOString(),
        pos: currentPos, name, margin, lev, buy, sell, memo,
        tradeRoi: tradeRoi.toFixed(2),
        profitAmount,
        img: currentImg
    };

    if (editingId) {
        logs = logs.map(l => l.id === editingId ? logData : l);
        editingId = null;
        document.getElementById('saveBtn').innerText = "CONFIRM SAVE";
    } else {
        logs.push(logData);
    }

    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    resetInput();
    showSection('menuSection');
}

function resetInput() {
    document.getElementById('stockName').value = "";
    document.getElementById('tradeSize').value = "";
    document.getElementById('imgPreview').innerHTML = "";
    document.getElementById('memo').value = "";
    currentImg = "";
}

function deleteLog(id) {
    if(confirm("삭제?")) {
        logs = logs.filter(l => l.id !== id);
        localStorage.setItem('tradeLogs', JSON.stringify(logs));
        updateDashboardStats(); updateHome();
    }
}

function editLog(id) {
    const l = logs.find(log => log.id === id);
    editingId = id;
    showSection('inputSection');
    document.getElementById('stockName').value = l.name;
    document.getElementById('tradeSize').value = l.margin;
    document.getElementById('leverage').value = l.lev;
    document.getElementById('buyPrice').value = l.buy;
    document.getElementById('sellPrice').value = l.sell;
    document.getElementById('memo').value = l.memo;
    currentImg = l.img;
    document.getElementById('saveBtn').innerText = "UPDATE LOG";
}

// 섹션 전환
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = id === 'inputSection' ? 'flex' : 'block';
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'menuSection') { updateDashboardStats(); updateHome(); }
}

function setPos(p) { 
    currentPos = p; 
    document.getElementById('longBtn').className = p === 'LONG' ? 'active' : '';
    document.getElementById('shortBtn').className = p === 'SHORT' ? 'active' : '';
}

function updateHome() { renderList(logs.slice(-10), 'recentLogs'); }

function renderList(data, targetId) {
    document.getElementById(targetId).innerHTML = data.slice().reverse().map(l => `
        <div class="log-item">
            <div style="display:flex; justify-content:space-between;">
                <span style="font-weight:bold;">${l.name} <small style="color:${l.pos==='LONG'?'var(--green)':'var(--red)'}">${l.pos} ${l.lev}x</small></span>
                <span style="color:${l.tradeRoi>=0?'var(--green)':'var(--red)'}; font-weight:bold;">$${l.profitAmount} (${l.tradeRoi}%)</span>
            </div>
            ${l.img ? `<img src="${l.img}" class="log-img" onclick="window.open('${l.img}')">` : ''}
            <p style="font-size:0.8rem; color:#848e9c; margin:10px 0;">${l.memo || ''}</p>
            <div class="btn-group">
                <span class="edit-btn" onclick="editLog(${l.id})">EDIT</span>
                <span class="del-btn" onclick="deleteLog(${l.id})">DELETE</span>
            </div>
        </div>
    `).join('');
}

// 필터 기능
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
    const s = getAnalysis(filtered);
    document.getElementById('queryAnalysis').innerHTML = `
        <div class="card"><h4>Period ROI</h4><p>${s.roi}%</p></div>
        <div class="card"><h4>Period Profit</h4><p>$${s.totalProfit}</p></div>
        <div class="card"><h4>Trades</h4><p>${s.count}</p></div>
    `;
    renderList(filtered, 'filteredLogs');
}
