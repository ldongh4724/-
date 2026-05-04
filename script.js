let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let userData = JSON.parse(localStorage.getItem('terminalUser') || 'null');
let currentPos = 'LONG';

function handleLogin() {
    const name = document.getElementById('userName').value;
    const seed = document.getElementById('initialSeed').value;
    if (!name || !seed) return alert("이름과 자산 입력 필수");
    userData = { name, seed: parseFloat(seed) };
    localStorage.setItem('terminalUser', JSON.stringify(userData));
    initSystem();
}

function logout() { if(confirm("로그아웃?")) { localStorage.removeItem('terminalUser'); location.reload(); } }

function initSystem() {
    if (userData) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('userDisplay').innerText = `● OP: ${userData.name}`;
        document.getElementById('terminalBrand').innerText = `${userData.name}_v1.0`;
        updateDashboardStats();
        updateHome();
    }
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-closed');
    document.getElementById('toggleIcon').innerText = document.body.classList.contains('sidebar-closed') ? '▶' : '◀';
}

function toggleTicker() {
    document.body.classList.toggle('ticker-closed');
    document.getElementById('tickerToggleIcon').innerText = document.body.classList.contains('ticker-closed') ? '▲' : '▼';
}

function connectTicker() {
    const streams = 'btcusdt@ticker/ethusdt@ticker/solusdt@ticker/xrpusdt@ticker';
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data).data;
        const sym = data.s.replace('USDT', '').toLowerCase();
        const pEl = document.getElementById(`${sym}Price`), cEl = document.getElementById(`${sym}Change`);
        if(!pEl) return;
        const p = parseFloat(data.c).toLocaleString(), c = parseFloat(data.P).toFixed(2);
        pEl.innerText = `$${p}`; cEl.innerText = `${c >= 0 ? '+' : ''}${c}%`;
        pEl.style.color = cEl.style.color = c >= 0 ? '#00ff95' : '#ff3366';
    };
}

function getStats(data) {
    if (!data.length) return { count: 0, winRate: "0.0", pnl: "0.00", cash: 0 };
    const wins = data.filter(l => parseFloat(l.rate) > 0).length;
    const cash = data.reduce((a, b) => a + parseFloat(b.amount), 0);
    return { count: data.length, winRate: ((wins / data.length) * 100).toFixed(1), pnl: ((cash / userData.seed) * 100).toFixed(2), cash: cash.toFixed(2) };
}

function updateDashboardStats() {
    const life = getStats(logs);
    const equity = (userData.seed + parseFloat(life.cash)).toFixed(2);
    document.getElementById('equityStats').innerHTML = `
        <div class="card equity"><h4>SEED</h4><p>$${userData.seed}</p></div>
        <div class="card equity"><h4>EQUITY</h4><p>$${equity}</p></div>
        <div class="card equity"><h4>PROFIT</h4><p style="color:${life.cash>=0?'#00ff95':'#ff3366'}">$${life.cash}</p></div>
        <div class="card equity"><h4>TOTAL ROI</h4><p style="color:${life.pnl>=0?'#00ff95':'#ff3366'}">${life.pnl}%</p></div>`;
    
    const now = new Date();
    const calc = (d) => logs.filter(l => (now - new Date(l.fullDate)) < (d * 86400000));
    document.getElementById('periodStats').innerHTML = `
        <div class="card"><h4>24H ROI</h4><p>${getStats(calc(1)).pnl}%</p></div>
        <div class="card"><h4>7D ROI</h4><p>${getStats(calc(7)).pnl}%</p></div>
        <div class="card"><h4>WIN RATE</h4><p>${life.winRate}%</p></div>
        <div class="card"><h4>TRADES</h4><p>${life.count}</p></div>`;
}

function setPos(p) { 
    currentPos = p; 
    document.getElementById('longBtn').className = p === 'LONG' ? 'active' : '';
    document.getElementById('shortBtn').className = p === 'SHORT' ? 'active' : '';
}

function addLog() {
    const name = document.getElementById('stockName').value.toUpperCase();
    const margin = parseFloat(document.getElementById('tradeSize').value);
    const lev = parseFloat(document.getElementById('leverage').value), buy = parseFloat(document.getElementById('buyPrice').value), sell = parseFloat(document.getElementById('sellPrice').value);
    if (!name || isNaN(margin) || isNaN(buy)) return alert("입력 확인");
    let rate = (((sell - buy) / buy) * 100 * lev) * (currentPos === 'SHORT' ? -1 : 1);
    let amount = (margin * (rate / 100)).toFixed(2);
    logs.push({ id: Date.now(), fullDate: new Date().toISOString(), pos: currentPos, name, margin, lev, buy, sell, rate: rate.toFixed(2), amount });
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    showSection('menuSection');
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = id === 'inputSection' ? 'flex' : 'block';
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'menuSection') { updateDashboardStats(); updateHome(); }
}

function updateHome() {
    document.getElementById('recentLogs').innerHTML = logs.slice().reverse().slice(0, 10).map(l => `
        <div class="log-item" style="border-left: 4px solid ${l.rate >= 0 ? '#00ff95' : '#ff3366'};">
            <div style="display:flex; justify-content:space-between;">
                <span>${l.name} <small>${l.pos} ${l.lev}x</small></span>
                <span style="color:${l.rate >= 0 ? '#00ff95' : '#ff3366'}">$${l.amount} (${l.rate}%)</span>
            </div>
        </div>`).join('');
}

window.onload = () => { connectTicker(); initSystem(); };
