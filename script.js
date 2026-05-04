let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';
let editingId = null;

// 1. 사이드바 토글
function toggleSidebar() {
    const body = document.body;
    const icon = document.getElementById('toggleIcon');
    body.classList.toggle('sidebar-closed');
    icon.innerText = body.classList.contains('sidebar-closed') ? '▶' : '◀';
}

// 2. 실시간 시세 (4종 + 변동률)
function connectTicker() {
    const streams = 'btcusdt@ticker/ethusdt@ticker/solusdt@ticker/xrpusdt@ticker';
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data).data;
        const symbol = data.s.replace('USDT', '').toLowerCase();
        
        const priceEl = document.getElementById(`${symbol}Price`);
        const changeEl = document.getElementById(`${symbol}Change`);

        const price = parseFloat(data.c).toLocaleString();
        const change = parseFloat(data.P).toFixed(2);

        priceEl.innerText = `$${price}`;
        changeEl.innerText = `${change >= 0 ? '+' : ''}${change}%`;
        
        const color = change >= 0 ? '#00ff95' : '#ff3366';
        priceEl.style.color = changeEl.style.color = color;
    };
}

// 3. 메뉴 내 기간별 수익률 업데이트
function updateSidebarPNL() {
    const calculatePNL = (days) => {
        const now = new Date();
        const filtered = logs.filter(l => (now - new Date(l.fullDate)) < (days * 24 * 60 * 60 * 1000));
        if (!filtered.length) return "0.00%";
        const sum = filtered.reduce((a, b) => a + parseFloat(b.profitRate), 0);
        const color = sum >= 0 ? '#00ff95' : '#ff3366';
        return `<span style="color:${color}">${sum >= 0 ? '+' : ''}${sum.toFixed(2)}%</span>`;
    };

    document.getElementById('stat24h').innerHTML = calculatePNL(1);
    document.getElementById('stat7d').innerHTML = calculatePNL(7);
    document.getElementById('stat30d').innerHTML = calculatePNL(30);
    document.getElementById('stat1y').innerHTML = calculatePNL(365);
}

// 4. 섹션 전환
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    target.style.display = id === 'inputSection' ? 'flex' : 'block';
    
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + id).classList.add('active');

    updateSidebarPNL();
    if(id === 'menuSection') updateHome();
    if(id === 'statsSection') runAnalysis(logs);
}

// 5. 매매 기록 추가
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

    if (!name || isNaN(buy) || isNaN(sell)) return alert("데이터를 입력하세요.");

    let profit = ((sell - buy) / buy) * 100 * lev;
    if (currentPos === 'SHORT') profit *= -1;

    const save = (imgData) => {
        const newLog = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            fullDate: new Date().toISOString(),
            pos: currentPos, name, lev, buy, sell, memo,
            profitRate: profit.toFixed(2),
            img: imgData
        };
        logs.push(newLog);
        localStorage.setItem('tradeLogs', JSON.stringify(logs));
        alert("기록 완료");
        showSection('menuSection');
    };

    if (imgFile) {
        const reader = new FileReader();
        reader.onload = () => save(reader.result);
        reader.readAsDataURL(imgFile);
    } else {
        save(null);
    }
}

// 6. 메인 화면 및 카드 렌더링
function updateHome() {
    const container = document.getElementById('recentLogs');
    container.innerHTML = logs.slice().reverse().slice(0, 10).map(l => createCard(l)).join('');
}

function createCard(l) {
    return `
        <div class="log-item" style="border-left: 4px solid ${l.profitRate >= 0 ? '#00ff95' : '#ff3366'}; background: #0d1117; padding: 15px; border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${l.name} <small style="color:#848e9c">${l.pos} ${l.lev}x</small></span>
                <span style="color:${l.profitRate >= 0 ? '#00ff95' : '#ff3366'}">${l.profitRate}%</span>
            </div>
            <div style="font-size:0.75rem; color:#848e9c; margin-top:5px;">${l.date} | In: ${l.buy} | Out: ${l.sell}</div>
            <p style="font-size:0.85rem; margin:10px 0; color:#e6edf3;">${l.memo}</p>
            ${l.img ? `<img src="${l.img}" style="width:100%; border-radius:5px; margin-bottom:10px;">` : ''}
            <div class="action-btns">
                <button onclick="openEditModal(${l.id})">EDIT</button>
                <button onclick="deleteLog(${l.id})" style="color:#ff3366">DELETE</button>
            </div>
        </div>`;
}

// 7. 수정 및 삭제 기능
function deleteLog(id) {
    if(!confirm("진짜 삭제할래?")) return;
    logs = logs.filter(l => l.id !== id);
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    updateHome();
    updateSidebarPNL();
}

function openEditModal(id) {
    editingId = id;
    const log = logs.find(l => l.id === id);
    document.getElementById('editForm').innerHTML = `
        <input type="text" id="editName" value="${log.name}">
        <input type="number" id="editLev" value="${log.lev}">
        <input type="number" id="editBuy" value="${log.buy}">
        <input type="number" id="editSell" value="${log.sell}">
        <textarea id="editMemo">${log.memo}</textarea>
    `;
    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() { document.getElementById('editModal').style.display = 'none'; }

function submitEdit() {
    const idx = logs.findIndex(l => l.id === editingId);
    const b = parseFloat(document.getElementById('editBuy').value);
    const s = parseFloat(document.getElementById('editSell').value);
    const l = parseFloat(document.getElementById('editLev').value);
    
    let p = ((s - b) / b) * 100 * l;
    if (logs[idx].pos === 'SHORT') p *= -1;

    logs[idx] = { 
        ...logs[idx], 
        name: document.getElementById('editName').value.toUpperCase(),
        lev: l, buy: b, sell: s, memo: document.getElementById('editMemo').value,
        profitRate: p.toFixed(2)
    };
    
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    closeModal();
    showSection('menuSection');
}

// 8. 분석 탭 (통계)
function runAnalysis(data) {
    if (!data.length) {
        document.getElementById('aiAnalysis').innerHTML = "<p>기록이 없습니다.</p>";
        return;
    }
    const wins = data.filter(l => parseFloat(l.profitRate) > 0).length;
    const winRate = ((wins / data.length) * 100).toFixed(1);
    const totalPnl = data.reduce((a, b) => a + parseFloat(b.profitRate), 0).toFixed(2);

    document.getElementById('aiAnalysis').innerHTML = `
        <div class="card"><h4>TRADES</h4><p>${data.length}</p></div>
        <div class="card"><h4>WIN RATE</h4><p>${winRate}%</p></div>
        <div class="card"><h4>TOTAL PNL</h4><p style="color:${totalPnl >= 0 ? '#00ff95' : '#ff3366'}">${totalPnl}%</p></div>
    `;
}

function filterLogs() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) return alert("날짜를 선택해줘");
    
    const filtered = logs.filter(l => l.date >= start && l.date <= end);
    runAnalysis(filtered);
    document.getElementById('filteredLogs').innerHTML = filtered.reverse().map(l => createCard(l)).join('');
}

window.onload = () => {
    connectTicker();
    updateSidebarPNL();
    updateHome();
};
