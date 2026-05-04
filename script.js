let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';

// 1. 섹션 전환 기능
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.display = 'none'); // 오타 수정용 가이드: 아래 코드로 적용
    document.getElementById('menuSection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    
    document.getElementById(sectionId).style.display = 'block';
    
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById('nav-' + sectionId).classList.add('active');

    if(sectionId === 'menuSection') updateHome();
}

// 2. 롱숏 선택
function setPos(pos) {
    currentPos = pos;
    document.getElementById('longBtn').className = pos === 'LONG' ? 'active' : '';
    document.getElementById('shortBtn').className = pos === 'SHORT' ? 'active' : '';
}

// 3. 기록 저장
function addLog() {
    const name = document.getElementById('stockName').value;
    const lev = parseFloat(document.getElementById('leverage').value);
    const buy = parseFloat(document.getElementById('buyPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const memo = document.getElementById('memo').value;
    const imageInput = document.getElementById('imageInput');

    if (!name || isNaN(lev) || isNaN(buy) || isNaN(sell)) return alert("모든 정보를 입력해주세요.");

    let rawProfit = ((sell - buy) / buy) * 100 * lev;
    if (currentPos === 'SHORT') rawProfit *= -1;
    
    const reader = new FileReader();
    const saveObj = (img) => {
        const newLog = { id: Date.now(), date: new Date().toISOString().split('T')[0], fullDate: new Date().toISOString(), pos: currentPos, name, lev, buy, sell, memo, profitRate: rawProfit.toFixed(2), img };
        logs.push(newLog);
        localStorage.setItem('tradeLogs', JSON.stringify(logs));
        alert("저장되었습니다!");
        location.reload();
    };

    if (imageInput.files[0]) {
        reader.readAsDataURL(imageInput.files[0]);
        reader.onload = () => saveObj(reader.result);
    } else {
        saveObj(null);
    }
}

// 4. 홈 대시보드 업데이트
function updateHome() {
    const calc = (days) => {
        const now = new Date();
        const filtered = logs.filter(l => (now - new Date(l.fullDate)) < (days * 24 * 60 * 60 * 1000));
        if (filtered.length === 0) return "0.00%";
        const sum = filtered.reduce((acc, cur) => acc + parseFloat(cur.profitRate), 0);
        const val = (sum / filtered.length).toFixed(2);
        return `<span class="${val >= 0 ? 'plus' : 'minus'}">${val}%</span>`;
    };

    document.getElementById('homeSummary').innerHTML = `
        <div class="card"><h4>오늘</h4><p>${calc(1)}</p></div>
        <div class="card"><h4>일주일</h4><p>${calc(7)}</p></div>
        <div class="card"><h4>한달</h4><p>${calc(30)}</p></div>
        <div class="card"><h4>일년</h4><p>${calc(365)}</p></div>
    `;

    const recent = logs.slice().reverse().slice(0, 3);
    document.getElementById('recentLogs').innerHTML = recent.map(l => renderLogItem(l)).join('');
}

// 5. 기간별 필터링
function filterLogs() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if(!start || !end) return alert("날짜를 선택하세요.");

    const filtered = logs.filter(l => l.date >= start && l.date <= end);
    const sum = filtered.reduce((acc, cur) => acc + parseFloat(cur.profitRate), 0);
    const avg = filtered.length > 0 ? (sum / filtered.length).toFixed(2) : 0;

    document.getElementById('filteredStats').innerHTML = `
        <div class="card" style="margin-bottom:20px;">
            <h4>선택 기간 평균 수익률</h4>
            <p class="${avg >= 0 ? 'plus' : 'minus'}">${avg}%</p>
            <small>총 ${filtered.length}건의 매매</small>
        </div>
    `;
    document.getElementById('filteredLogs').innerHTML = filtered.reverse().map(l => renderLogItem(l)).join('');
}

function renderLogItem(log) {
    return `
        <div class="log-item" style="border-left-color: ${log.pos === 'LONG' ? '#0ecb81' : '#f6465d'}">
            <div style="display:flex; justify-content:space-between;">
                <strong>${log.name} (${log.pos} ${log.lev}x)</strong>
                <span class="${log.profitRate >= 0 ? 'plus' : 'minus'}">${log.profitRate}%</span>
            </div>
            <div style="font-size:0.8rem; color:#848e9c; margin-top:5px;">${log.date} | Entry: ${log.buy} | Exit: ${log.sell}</div>
            <p style="font-size:0.9rem; margin-top:10px;">${log.memo}</p>
            ${log.img ? `<img src="${log.img}" class="log-img">` : ''}
        </div>
    `;
}

window.onload = () => updateHome();