let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';

// 1. 실시간 시세 (Binance Public API)
function connectTicker() {
    const btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    const ethWs = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@ticker');

    btcWs.onmessage = (e) => {
        const data = JSON.parse(e.data);
        document.getElementById('btcPrice').innerText = `$${parseFloat(data.c).toLocaleString()}`;
        document.getElementById('btcPrice').className = data.p >= 0 ? 'plus' : 'minus';
    };
    ethWs.onmessage = (e) => {
        const data = JSON.parse(e.data);
        document.getElementById('ethPrice').innerText = `$${parseFloat(data.c).toLocaleString()}`;
        document.getElementById('ethPrice').className = data.p >= 0 ? 'plus' : 'minus';
    };
}

// 2. 섹션 전환
function showSection(sectionId) {
    document.getElementById('menuSection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';
    
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + sectionId).classList.add('active');

    if(sectionId === 'menuSection') updateHome();
    if(sectionId === 'statsSection') runAIAnalysis();
}

// 3. 기록 추가
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

    if (!name || isNaN(lev) || isNaN(buy) || isNaN(sell)) return alert("모든 정보를 입력하세요.");

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
        alert("기록 완료!");
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

// 4. 홈 요약 업데이트
function updateHome() {
    const calc = (days) => {
        const now = new Date();
        const filtered = logs.filter(l => (now - new Date(l.fullDate)) < (days * 24 * 60 * 60 * 1000));
        if (!filtered.length) return "0.00%";
        const avg = (filtered.reduce((acc, cur) => acc + parseFloat(cur.profitRate), 0) / filtered.length).toFixed(2);
        return `<span class="${avg >= 0 ? 'plus' : 'minus'}">${avg}%</span>`;
    };
    document.getElementById('homeSummary').innerHTML = `
        <div class="card"><h4>오늘</h4><p>${calc(1)}</p></div>
        <div class="card"><h4>일주일</h4><p>${calc(7)}</p></div>
        <div class="card"><h4>한달</h4><p>${calc(30)}</p></div>
        <div class="card"><h4>일년</h4><p>${calc(365)}</p></div>`;
    const recent = logs.slice().reverse().slice(0, 3);
    document.getElementById('recentLogs').innerHTML = recent.map(l => renderLog(l)).join('');
}

// 5. AI 분석
function runAIAnalysis() {
    if (!logs.length) return document.getElementById('aiAnalysis').innerHTML = "<p>기록이 없습니다.</p>";
    const wins = logs.filter(l => parseFloat(l.profitRate) > 0).length;
    const winRate = ((wins / logs.length) * 100).toFixed(1);
    const worst = [...logs].sort((a,b) => a.profitRate - b.profitRate)[0];
    
    document.getElementById('aiAnalysis').innerHTML = `
        <div class="analysis-card"><h4>평균 승률</h4><p class="${winRate>=50?'plus':'minus'}">${winRate}%</p></div>
        <div class="analysis-card"><h4>총 매매 횟수</h4><p>${logs.length}회</p></div>
        <div class="analysis-card"><h4>최대 손실 종목</h4><p class="minus">${worst.name} (${worst.profitRate}%)</p></div>
        <div class="analysis-card"><h4>주력 레버리지</h4><p>${(logs.reduce((a,b)=>a+b.lev,0)/logs.length).toFixed(1)}x</p></div>`;
}

function renderLog(l) {
    return `
        <div class="log-item" style="border-left-color: ${l.pos==='LONG'?'#0ecb81':'#f6465d'}">
            <div style="display:flex; justify-content:space-between;">
                <strong>${l.name} (${l.pos} ${l.lev}x)</strong>
                <span class="${l.profitRate>=0?'plus':'minus'}">${l.profitRate}%</span>
            </div>
            <div style="font-size:0.8rem; color:#848e9c; margin:5px 0;">${l.date} | Entry: ${l.buy} | Exit: ${l.sell}</div>
            <p style="font-size:0.9rem;">${l.memo}</p>
            ${l.img ? `<img src="${l.img}" class="log-img">` : ''}
        </div>`;
}

// 6. 필터링
function filterLogs() {
    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;
    const f = logs.filter(l => l.date >= s && l.date <= e);
    document.getElementById('filteredLogs').innerHTML = f.reverse().map(l => renderLog(l)).join('');
}

window.onload = () => { connectTicker(); updateHome(); };