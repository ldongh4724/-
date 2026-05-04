let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';
let editingId = null;

// 1. 섹션 전환 (메뉴 작동 핵심)
function showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    // 선택한 섹션만 보이기
    document.getElementById(sectionId).style.display = 'block';
    
    // 메뉴 활성화 스타일 변경
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + sectionId).classList.add('active');

    // 섹션별 데이터 업데이트
    if(sectionId === 'menuSection') updateHome();
    if(sectionId === 'statsSection') runAIAnalysis();
}

// 2. 실시간 시세
function connectTicker() {
    const btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    const ethWs = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@ticker');

    btcWs.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const el = document.getElementById('btcPrice');
        el.innerText = `$${parseFloat(data.c).toLocaleString()}`;
        el.style.color = data.p >= 0 ? '#00ff95' : '#ff3366';
    };
    ethWs.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const el = document.getElementById('ethPrice');
        el.innerText = `$${parseFloat(data.c).toLocaleString()}`;
        el.style.color = data.p >= 0 ? '#00ff95' : '#ff3366';
    };
}

// 3. 기록 추가 및 관리
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

    if (!name || isNaN(lev) || isNaN(buy) || isNaN(sell)) return alert("정보를 모두 입력해주세요.");

    let profit = ((sell - buy) / buy) * 100 * lev;
    if (currentPos === 'SHORT') profit *= -1;

    const save = (img) => {
        const newLog = { 
            id: Date.now(), 
            date: new Date().toISOString().split('T')[0], 
            fullDate: new Date().toISOString(),
            pos: currentPos, name, lev, buy, sell, memo, 
            profitRate: profit.toFixed(2), img 
        };
        logs.push(newLog);
        localStorage.setItem('tradeLogs', JSON.stringify(logs));
        location.reload();
    };

    if (imageInput.files[0]) {
        const reader = new FileReader();
        reader.readAsDataURL(imageInput.files[0]);
        reader.onload = () => save(reader.result);
    } else {
        save(null);
    }
}

// 4. 홈 대시보드 & 렌더링
function updateHome() {
    const calc = (days) => {
        const now = new Date();
        const filtered = logs.filter(l => (now - new Date(l.fullDate)) < (days * 24 * 60 * 60 * 1000));
        if (!filtered.length) return "0.00%";
        const avg = (filtered.reduce((acc, cur) => acc + parseFloat(cur.profitRate), 0) / filtered.length).toFixed(2);
        return `<span style="color:${avg >= 0 ? '#00ff95' : '#ff3366'}">${avg}%</span>`;
    };

    document.getElementById('homeSummary').innerHTML = `
        <div class="card"><h4>24H</h4><p>${calc(1)}</p></div>
        <div class="card"><h4>7D</h4><p>${calc(7)}</p></div>
        <div class="card"><h4>30D</h4><p>${calc(30)}</p></div>
        <div class="card"><h4>ALL</h4><p>${calc(365)}</p></div>`;

    const recent = logs.slice().reverse().slice(0, 4);
    document.getElementById('recentLogs').innerHTML = recent.map(l => renderLog(l)).join('');
}

function renderLog(l) {
    return `
        <div class="log-item">
            <div style="display:flex; justify-content:space-between;">
                <strong style="color:${l.pos==='LONG'?'#00ff95':'#ff3366'}">${l.name}</strong>
                <span style="color:${l.profitRate>=0?'#00ff95':'#ff3366'}">${l.profitRate}%</span>
            </div>
            <div style="font-size:0.7rem; color:#848e9c; margin-top:5px;">${l.pos} ${l.lev}x | ${l.date}</div>
            <p style="font-size:0.8rem; margin:10px 0;">${l.memo}</p>
            ${l.img ? `<img src="${l.img}" class="log-img" style="width:100%; border-radius:8px;">` : ''}
            <div class="action-btns" style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="openEditModal(${l.id})" style="flex:1; background:#333; color:white; border:none; padding:5px; cursor:pointer;">EDIT</button>
                <button onclick="deleteLog(${l.id})" style="flex:1; background:#422; color:#f33; border:none; padding:5px; cursor:pointer;">DEL</button>
            </div>
        </div>`;
}

// 5. 수정 및 삭제 기능
function deleteLog(id) {
    if(!confirm("삭제하시겠습니까?")) return;
    logs = logs.filter(l => l.id !== id);
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    updateHome();
    if(document.getElementById('statsSection').style.display === 'block') runAIAnalysis();
}

function openEditModal(id) {
    editingId = id;
    const log = logs.find(l => l.id === id);
    document.getElementById('editForm').innerHTML = `
        <input type="text" id="editName" value="${log.name}">
        <input type="number" id="editLev" value="${log.lev}">
        <input type="number" id="editBuy" value="${log.buy}">
        <input type="number" id="editSell" value="${log.sell}">
        <textarea id="editMemo">${log.memo}</textarea>`;
    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() { document.getElementById('editModal').style.display = 'none'; }

function submitEdit() {
    const idx = logs.findIndex(l => l.id === editingId);
    const buy = parseFloat(document.getElementById('editBuy').value);
    const sell = parseFloat(document.getElementById('editSell').value);
    const lev = parseFloat(document.getElementById('editLev').value);
    
    let profit = ((sell - buy) / buy) * 100 * lev;
    if (logs[idx].pos === 'SHORT') profit *= -1;

    logs[idx] = { ...logs[idx], name: document.getElementById('editName').value, lev, buy, sell, memo: document.getElementById('editMemo').value, profitRate: profit.toFixed(2) };
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    closeModal();
    location.reload();
}

// 6. AI 분석 및 필터
function runAIAnalysis() {
    if (!logs.length) return;
    const wins = logs.filter(l => parseFloat(l.profitRate) > 0).length;
    const wr = ((wins / logs.length) * 100).toFixed(1);
    document.getElementById('aiAnalysis').innerHTML = `
        <div class="analysis-card"><h4>WIN RATE</h4><p>${wr}%</p></div>
        <div class="analysis-card"><h4>TRADES</h4><p>${logs.length}</p></div>`;
}

function filterLogs() {
    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;
    const f = logs.filter(l => l.date >= s && l.date <= e);
    document.getElementById('filteredLogs').innerHTML = f.reverse().map(l => renderLog(l)).join('');
}

window.onload = () => { connectTicker(); updateHome(); };