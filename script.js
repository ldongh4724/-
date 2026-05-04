let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';

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
        const msg = JSON.parse(e.data);
        const data = msg.data;
        const symbol = data.s.replace('USDT', '').toLowerCase();
        
        const priceEl = document.getElementById(`${symbol}Price`);
        const changeEl = document.getElementById(`${symbol}Change`);

        const price = parseFloat(data.c).toLocaleString();
        const change = parseFloat(data.P).toFixed(2);

        priceEl.innerText = `$${price}`;
        changeEl.innerText = `${change >= 0 ? '+' : ''}${change}%`;
        
        const color = change >= 0 ? '#00ff95' : '#ff3366';
        priceEl.style.color = color;
        changeEl.style.color = color;
    };
}

// 3. 섹션 전환 (중앙 정렬 포함)
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    
    if (sectionId === 'inputSection') {
        target.style.display = 'flex';
    } else {
        target.style.display = 'block';
    }
    
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + sectionId).classList.add('active');

    if(sectionId === 'menuSection') updateHome();
    if(sectionId === 'statsSection') runAIAnalysis();
}

// 4. 데이터 저장 및 관리
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
    const imageInput = document.getElementById('imageInput');

    if (!name || isNaN(lev)) return alert("입력값을 확인하세요.");

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
        showSection('menuSection');
    };

    if (imageInput.files[0]) {
        const reader = new FileReader();
        reader.readAsDataURL(imageInput.files[0]);
        reader.onload = () => save(reader.result);
    } else {
        save(null);
    }
}

function updateHome() {
    const container = document.getElementById('recentLogs');
    container.innerHTML = logs.slice().reverse().slice(0, 6).map(l => `
        <div class="log-item" style="border-left: 4px solid ${l.profitRate >= 0 ? '#00ff95' : '#ff3366'}; background: #0d1117; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${l.name} <small>${l.pos} ${l.lev}x</small></span>
                <span style="color:${l.profitRate >= 0 ? '#00ff95' : '#ff3366'}">${l.profitRate}%</span>
            </div>
            <div style="font-size:0.8rem; color:#848e9c; margin-top:5px;">Entry: ${l.buy} | Exit: ${l.sell}</div>
            <p style="font-size:0.85rem; margin:10px 0;">${l.memo}</p>
        </div>
    `).join('');
}

window.onload = () => {
    connectTicker();
    updateHome();
};
