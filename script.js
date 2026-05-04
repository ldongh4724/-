let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let userData = JSON.parse(localStorage.getItem('terminalUser') || 'null');
let currentPos = 'LONG', currentImg = "", editingId = null;

window.onload = () => { 
    if(userData) initSystem();
    // 날짜 기본값 세팅 (현재 시간)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('tradeDate').value = now.toISOString().slice(0, 16);
};

function handleLogin() {
    const name = document.getElementById('userName').value;
    const seed = document.getElementById('initialSeed').value;
    if (!name || !seed) return alert("입력 오류");
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

function logout() { localStorage.removeItem('terminalUser'); location.reload(); }

function toggleSidebar() {
    document.body.classList.toggle('sidebar-closed');
    document.getElementById('toggleIcon').innerText = document.body.classList.contains('sidebar-closed') ? '▶' : '◀';
}

// 수익 및 ROI 계산 핵심 함수 (색상 반영용 데이터 포함)
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
    const s = getAnalysis(logs);
    const equity = (userData.seed + parseFloat(s.totalProfit)).toLocaleString();
    document.getElementById('equityStats').innerHTML = `
        <div class="card"><h4>Seed</h4><p>$${userData.seed.toLocaleString()}</p></div>
        <div class="card"><h4>Equity</h4><p>$${equity}</p></div>
        <div class="card" style="border-left:4px solid var(--accent)"><h4>Total ROI</h4><p style="color:${s.roi>=0?'var(--green)':'var(--red)'}">${s.roi}%</p></div>
        <div class="card"><h4>Win Rate</h4><p>${s.winRate}%</p></div>
    `;
}

function handleImg(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImg = e.target.result;
        document.getElementById('imgPreview').innerHTML = `<img src="${currentImg}" style="width:50px; height:50px; margin-top:10px;">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
}

function addLog() {
    const name = document.getElementById('stockName').value.toUpperCase();
    const margin = parseFloat(document.getElementById('tradeSize').value);
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const dateInput = document.getElementById('tradeDate').value;

    if (!name || isNaN(margin) || !dateInput) return alert("필수 값 확인");

    let tradeRoi = (((sell - buy) / buy) * 100 * lev) * (currentPos === 'SHORT' ? -1 : 1);
    let profitAmount = (margin * (tradeRoi / 100)).toFixed(2);

    const logData = {
        id: editingId || Date.now(),
        fullDate: new Date(dateInput).toISOString(),
        pos: currentPos, name, margin, lev, buy, sell,
        memo: document.getElementById('memo').value,
        tradeRoi: tradeRoi.toFixed(2),
        profitAmount, img: currentImg
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
    document.getElementById('tradeDate').value = new Date(l.fullDate).toISOString().slice(0, 16);
    document.getElementById('stockName').value = l.name;
    document.getElementById('tradeSize').value = l.margin;
    document.getElementById('leverage').value = l.lev;
    document.getElementById('buyPrice').value = l.buy;
    document.getElementById('sellPrice').value = l.sell;
    document.getElementById('memo').value = l.memo;
    currentImg = l.img;
    document.getElementById('saveBtn').innerText = "UPDATE LOG";
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
    // DIAGNOSTICS 통계 색상 적용
    document.getElementById('queryAnalysis').innerHTML = `
        <div class="card"><h4>Period ROI</h4><p style="color:${s.roi>=0?'var(--green)':'var(--red)'}">${s.roi}%</p></div>
        <div class="card"><h4>Period Profit</h4><p style="color:${s.totalProfit>=0?'var(--green)':'var(--red)'}">$${s.totalProfit}</p></div>
        <div class="card"><h4>Trades</h4><p>${s.count}</p></div>
    `;
    renderList(filtered, 'filteredLogs');
}

function renderList(data, targetId) {
    document.getElementById(targetId).innerHTML = data.slice().sort((a,b) => new Date(b.fullDate) - new Date(a.fullDate)).map(l => `
        <div class="log-item">
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <span style="font-weight:bold;">${l.name}</span>
                    <small style="color:${l.pos==='LONG'?'var(--green)':'var(--red)'}"> ${l.pos} ${l.lev}x</small>
                    <div style="font-size:0.7rem; color:#848e9c;">${new Date(l.fullDate).toLocaleString()}</div>
                </div>
                <div style="text-align:right;">
                    <div style="color:${l.tradeRoi>=0?'var(--green)':'var(--red)'}; font-weight:bold;">$${l.profitAmount}</div>
                    <div style="font-size:0.75rem; color:#848e9c;">${l.tradeRoi}%</div>
                </div>
            </div>
            ${l.img ? `<img src="${l.img}" class="log-img" onclick="window.open('${l.img}')">` : ''}
            <div class="btn-group" style="margin-top:10px; font-size:0.8rem;">
                <span class="edit-btn" onclick="editLog(${l.id})">EDIT</span> | 
                <span class="del-btn" onclick="deleteLog(${l.id})">DELETE</span>
            </div>
        </div>
    `).join('');
}

function updateHome() { renderList(logs, 'recentLogs'); }

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

function setQuickDate(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
    document.getElementById('endDate').value = end.toISOString().split('T')[0];
    filterLogs();
}
