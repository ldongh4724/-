let logs = JSON.parse(localStorage.getItem('tradeLogs') || '[]');
let currentPos = 'LONG';
let editingId = null;

// --- [기능] 수정 및 삭제 ---

// 1. 삭제 함수
function deleteLog(id) {
    if(!confirm("정말 이 기록을 삭제하시겠습니까?")) return;
    logs = logs.filter(l => l.id !== id);
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    location.reload();
}

// 2. 수정 모달 열기
function openEditModal(id) {
    editingId = id;
    const log = logs.find(l => l.id === id);
    const form = document.getElementById('editForm');
    form.innerHTML = `
        <input type="text" id="editName" value="${log.name}" placeholder="종목">
        <input type="number" id="editLev" value="${log.lev}" placeholder="레버리지">
        <input type="number" id="editBuy" value="${log.buy}" placeholder="진입가">
        <input type="number" id="editSell" value="${log.sell}" placeholder="종료가">
        <textarea id="editMemo">${log.memo}</textarea>
    `;
    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 3. 수정 사항 제출
function submitEdit() {
    const logIndex = logs.findIndex(l => l.id === editingId);
    const name = document.getElementById('editName').value;
    const lev = parseFloat(document.getElementById('editLev').value);
    const buy = document.getElementById('editBuy').value;
    const sell = document.getElementById('editSell').value;
    
    // 수익률 재계산
    let profit = ((sell - buy) / buy) * 100 * lev;
    if (logs[logIndex].pos === 'SHORT') profit *= -1;

    logs[logIndex] = { 
        ...logs[logIndex], 
        name, lev, buy, sell, 
        memo: document.getElementById('editMemo').value,
        profitRate: profit.toFixed(2)
    };
    
    localStorage.setItem('tradeLogs', JSON.stringify(logs));
    alert("수정되었습니다.");
    location.reload();
}

// --- [UI 렌더링] 수정/삭제 버튼 포함 ---

function renderLog(l) {
    return `
        <div class="log-item" style="border-top: 3px solid ${l.pos==='LONG'?varColor('green'):varColor('red')}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; font-size:0.9rem;">${l.name}</span>
                <span class="${l.profitRate>=0?'plus':'minus'}" style="font-size:1.1rem; font-weight:bold;">${l.profitRate}%</span>
            </div>
            <div style="font-size:0.75rem; color:#848e9c; margin:8px 0;">
                ${l.pos} ${l.lev}x | ${l.date}
            </div>
            <p style="font-size:0.85rem; margin:0; color:#ccc;">${l.memo}</p>
            ${l.img ? `<img src="${l.img}" class="log-img" onclick="window.open(this.src)">` : ''}
            
            <div class="action-btns">
                <button class="edit-btn" onclick="openEditModal(${l.id})">EDIT</button>
                <button class="del-btn" onclick="deleteLog(${l.id})">DELETE</button>
            </div>
        </div>`;
}

function varColor(name) {
    return name === 'green' ? '#00ff95' : '#ff3366';
}

// --- 나머지 기존 함수 (showSection, addLog, connectTicker 등) 동일하게 유지 ---
// (이전 답변의 script.js 내용 중 렌더링 부분을 제외한 나머지를 합쳐주세요)