let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let userData = JSON.parse(localStorage.getItem('terminalUser') || 'null');
let currentPos = 'LONG';
let currentImg = "";
let editingId = null;

// 시스템 초기화
window.onload = () => { if(userData) initSystem(); };

function handleLogin() {
    const name = document.getElementById('userName').value;
    const seed = document.getElementById('initialSeed').value;
    if (!name || !seed) return alert("운영자 성함과 자본금을 입력하세요.");
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

// 사이드바 토글 로직
function toggleSidebar() {
    document.body.classList.toggle('sidebar-closed');
    const icon = document.getElementById('toggleIcon');
    icon.innerText = document.body.classList.contains('sidebar-closed') ? '▶' : '◀';
}

// 수익 및 ROI 계산 로직 (수정)
function getAnalysis(dataList) {
    if (!dataList.length) return { count: 0, winRate: 0, totalProfit: 0, roi: 0 };
    
    const wins = dataList.filter(l => parseFloat(l.profitAmount) > 0).length;
    const totalProfit = dataList.reduce((acc, cur) => acc + parseFloat(cur.profitAmount), 0);
    // ROI = (총 수익금 / 초기 자본금) * 100
    const roi = ((totalProfit / userData.seed) * 100).toFixed(2);

    return {
        count: dataList.length,
        winRate: ((wins / dataList.length) * 100).toFixed(1),
        totalProfit: totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2}),
        roi: roi
    };
}

function updateDashboardStats() {
    const stats = getAnalysis(logs);
    const currentEquity = (userData.seed + parseFloat(stats.totalProfit.replace(/,/g, ''))).toLocaleString();

    document.getElementById('equityStats').innerHTML = `
        <div class="card equity"><h4>Initial Seed</h4><p>$${userData.seed.toLocaleString()}</p></div>
        <div class="card equity"><h4>Current Equity</h4><p>$${currentEquity}</p></div>
        <div class="card equity"><h4>Total ROI</h4><p style="color:${stats.roi>=0?'var(--green)':'var(--red)'}">${stats.roi}%</p></div>
        <div class="card"><h4>Win Rate</h4><p>${stats.winRate}%</p></div>
    `;
}

// 매매 일지 작성
function handleImg(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImg = e.target.result;
        document.getElementById('imgPreview').innerHTML = `<img src="${currentImg}" style="width:50px; height:50px; margin-top:10px; border-radius:4px;">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function addLog() {
    const name = document.getElementById('stockName').value.toUpperCase();
    const margin = parseFloat(document.getElementById('tradeSize').value);
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const memo = document.getElementById('memo').value;

    if (!name || isNaN(margin) || isNaN(buy) || isNaN(sell)) return alert("모든 수치를 입력하세요.");

    // 거래별 수익률 및 수익금 계산
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
    currentImg = "";
}

// 수정 / 삭제
function deleteLog(id) {
    if(confirm("기록을 삭제하시겠습니까?")) {
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
    document.getElementById('saveBtn').innerText = "UPDATE LOG";
}

// 필터 및 렌더링
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

function renderList(data, targetId) {
    document.getElementById(targetId).innerHTML = data.slice().reverse().map(l => `
        <div class="log-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span style="font-weight:bold; font-size:1.1rem;">${l.name}</span>
                    <span style="color:${l.pos==='LONG'?'var(--green)':'var(--red)'}; margin-left:8px; font-size:0.8rem;">${l.pos} ${l.lev}x</span>
                </div>
                <div style="text-align:right;">
                    <div style="color:${l.tradeRoi>=0?'var(--green)':'var(--red)'}; font-weight:bold;">$${l.profitAmount}</div>
                    <div style="font-size:0.75rem; color:#848e9c;">${l.tradeRoi}%</div>
                </div>
            </div>
            ${l.img ? `<img src="${l.img}" class="log-img" onclick="window.open('${l.img}')">` : ''}
            <p style="font-size:0.8rem; color:#8b949e; margin:10px 0;">${l.memo || 'No notes...'}</p>
            <div class="btn-group">
                <span class="edit-btn" onclick="editLog(${l.id})">EDIT</span>
                <span class="del-btn" onclick="deleteLog(${l.id})">DELETE</span>
            </div>
        </div>
    `).join('');
}

function updateHome() { renderList(logs.slice(-10), 'recentLogs'); }

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
