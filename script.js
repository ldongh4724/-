let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';
let editingId = null;

// 사이드바 토글
function toggleSidebar() {
    document.body.classList.toggle('sidebar-closed');
    document.getElementById('toggleIcon').innerText = document.body.classList.contains('sidebar-closed') ? '▶' : '◀';
}

// 하단 시세 바 토글
function toggleTicker() {
    document.body.classList.toggle('ticker-closed');
    const icon = document.getElementById('tickerToggleIcon');
    icon.innerText = document.body.classList.contains('ticker-closed') ? '▲' : '▼';
}

// 실시간 시세 연동
function connectTicker() {
    const streams = 'btcusdt@ticker/ethusdt@ticker/solusdt@ticker/xrpusdt@ticker';
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data).data;
        const symbol = data.s.replace('USDT', '').toLowerCase();
        const pEl = document.getElementById(`${symbol}Price`);
        const cEl = document.getElementById(`${symbol}Change`);
        const p = parseFloat(data.c).toLocaleString();
        const c = parseFloat(data.P).toFixed(2);
        pEl.innerText = `$${p}`;
        cEl.innerText = `${c >= 0 ? '+' : ''}${c}%`;
        pEl.style.color = cEl.style.color = c >= 0 ? '#00ff95' : '#ff3366';
    };
}

// 통계 로직
function getStats(data) {
    if (!data.length) return { count: 0, winRate: "0.0", pnl: "0.00" };
    const wins = data.filter(l => parseFloat(l.profitRate) > 0).length;
    const pnl = data.reduce((a, b) => a + parseFloat(b.profitRate), 0).toFixed(2);
    return { count: data.length, winRate: ((wins / data.length) * 100).toFixed(1), pnl: pnl };
}

function updateDashboardStats() {
    const now = new Date();
    const calc = (days) => logs.filter(l => (now - new Date(l.fullDate)) < (days * 24 * 60 * 60 * 1000));
    
    const p24 = getStats(calc(1)).pnl, p7 = getStats(calc(7)).pnl, p30 = getStats(calc(30)).pnl, p1y = getStats(calc(365)).pnl;
    const life = getStats(logs);

    document.getElementById('periodStats').innerHTML = `
        <div class="card"><h4>24H PNL</h4><p style="color:${p24>=0?'#00ff95':'#ff3366'}">${p24}%</p></div>
        <div class="card"><h4>7D PNL</h4><p style="color:${p7>=0?'#00ff95':'#ff3366'}">${p7}%</p></div>
        <div class="card"><h4>30D PNL</h4><p style="color:${p30>=0?'#00ff95':'#ff3366'}">${p30}%</p></div>
        <div class="card"><h4>1Y PNL</h4><p style="color:${p1y>=0?'#00ff95':'#ff3366'}">${p1y}%</p></div>`;

    document.getElementById('lifetimeStats').innerHTML = `
        <div class="card"><h4>TOTAL TRADES</h4><p>${life.count}</p></div>
        <div class="card"><h4>WIN RATE</h4><p>${life.winRate}%</p></div>
        <div class="card"><h4>NET PNL</h4><p style="color:${life.pnl>=0?'#00ff95':'#ff3366'}">${life.pnl}%</p></div>`;
}

function filterLogs() {
    const start = document.getElementById('startDate').value, end = document.getElementById('endDate').value;
    if (!start || !end) return alert("날짜 선택");
    const filtered = logs.filter(l => l.date >= start && l.date <= end);
    const s = getStats(filtered);
    document.getElementById('queryAnalysis').innerHTML = `
        <div class="card"><h4>PERIOD TRADES</h4><p>${s.count}</p></div>
        <div class="card"><h4>PERIOD WIN RATE</h4><p>${s.winRate}%</p></div>
        <div class="card"><h4>PERIOD PNL</h4><p style="color:${s.pnl>=0?'#00ff95':'#ff3366'}">${s.pnl}%</p></div>`;
    document.getElementById('filteredLogs').innerHTML = filtered.reverse().map(l => createCard(l)).join('');
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = id === 'inputSection' ? 'flex' : 'block';
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'menuSection') { updateDashboardStats(); updateHome(); }
}

function createCard(l) {
    return `
        <div class="log-item" style="border-left: 4px solid ${l.profitRate >= 0 ? '#00ff95' : '#ff3366'};">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${l.name} <small style="color:#848e9c">${l.pos} ${l.lev}x</small></span>
                <span style="color:${l.profitRate >= 0 ? '#00ff95' : '#ff3366'}">${l.profitRate}%</span>
            </div>
            <div style="font-size:0.75rem; color:#848e9c; margin-top:5px;">${l.date} | In: ${l.buy} | Out: ${l.sell}</div>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button onclick="openEditModal(${l.id})" style="flex:1; cursor:pointer; background:#161b22; border:1px solid #333; color:white; font-size:0.7rem; padding:5px;">EDIT</button>
                <button onclick="deleteLog(${l.id})" style="flex:1; cursor:pointer; background:#161b22; border:1px solid #333; color:#ff3366; font-size:0.7rem; padding:5px;">DEL</button>
            </div>
        </div>`;
}

function setPos(pos) {
    currentPos = pos;
    document.getElementById('longBtn').className = pos === 'LONG' ? 'active' : '';
    document.getElementById('shortBtn').className = pos === 'SHORT' ? 'active' : '';
}

function addLog() {
    const name = document.getElementById('stockName').value.toUpperCase();
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const memo = document.getElementById('memo').value;
    const imgFile = document.getElementById('imageInput').files[0];
    if (!name || isNaN(buy)) return;
    let profit = (((sell - buy) / buy) * 100 * lev) * (currentPos === 'SHORT' ? -1 : 1);
    const save = (img) => {
        logs.push({ id: Date.now(), date: new Date().toISOString().split('T')[0], fullDate: new Date().toISOString(), pos: currentPos, name, lev, buy, sell, memo, profitRate: profit.toFixed(2), img });
        localStorage.setItem('tradeLogs', JSON.stringify(logs));
        showSection('menuSection');
    };
    if (imgFile) { const r = new FileReader(); r.onload = () => save(r.result); r.readAsDataURL(imgFile); } else save(null);
}

function updateHome() { document.getElementById('recentLogs').innerHTML = logs.slice().reverse().slice(0, 10).map(l => createCard(l)).join(''); }

function deleteLog(id) { if(confirm("삭제?")) { logs = logs.filter(l => l.id !== id); localStorage.setItem('tradeLogs', JSON.stringify(logs)); updateDashboardStats(); updateHome(); } }

function openEditModal(id) {
    editingId = id; const log = logs.find(l => l.id === id);
    document.getElementById('editForm').innerHTML = `<input type="text" id="eN" value="${log.name}"><input type="number" id="eL" value="${log.lev}"><input type="number" id="eB" value="${log.buy}"><input type="number" id="eS" value="${log.sell}"><textarea id="eM">${log.memo}</textarea>`;
    document.getElementById('editModal').style.display = 'flex';
}
function closeModal() { document.getElementById('editModal').style.display = 'none'; }
function submitEdit() {
    const i = logs.findIndex(l => l.id === editingId);
    const b = parseFloat(document.getElementById('eB').value), s = parseFloat(document.getElementById('eS').value), l = parseFloat(document.getElementById('eL').value);
    let p = (((s - b) / b) * 100 * l) * (logs[i].pos === 'SHORT' ? -1 : 1);
    logs[i] = { ...logs[i], name: document.getElementById('eN').value.toUpperCase(), lev: l, buy: b, sell: s, memo: document.getElementById('eM').value, profitRate: p.toFixed(2) };
    localStorage.setItem('tradeLogs', JSON.stringify(logs)); closeModal(); showSection('menuSection');
}

window.onload = () => { connectTicker(); updateDashboardStats(); updateHome(); };
