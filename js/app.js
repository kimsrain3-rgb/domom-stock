/* ============================================================
   두맘코튼 재고관리 웹앱 - 프론트엔드 로직
   ============================================================ */

// ── 설정 ────────────────────────────────────────────────────
const GAS_URL_KEY = 'domom_gas_url';

// 23색 컬러 데이터
const COLORS = [
  { no:'01', nameEn:'IVORY',           nameKo:'아이보리',    hex:'#FBF9F1', textColor:'#2D2D2D' },
  { no:'02', nameEn:'LEMON',           nameKo:'레몬',        hex:'#FFF7A4', textColor:'#2D2D2D' },
  { no:'03', nameEn:'LITE PINK',       nameKo:'연핑크',      hex:'#FFE3E3', textColor:'#2D2D2D' },
  { no:'04', nameEn:'PINK',            nameKo:'핑크',        hex:'#FFB0B0', textColor:'#2D2D2D' },
  { no:'05', nameEn:'DEEP INDIGO PINK',nameKo:'딥인디고핑크', hex:'#D04848', textColor:'#FFFFFF' },
  { no:'06', nameEn:'LITE VIOLET',     nameKo:'연보라',      hex:'#E19CD8', textColor:'#2D2D2D' },
  { no:'07', nameEn:'DEEP VIOLET',     nameKo:'진보라',      hex:'#6F2232', textColor:'#FFFFFF' },
  { no:'08', nameEn:'WINE',            nameKo:'와인',        hex:'#500073', textColor:'#FFFFFF' },
  { no:'09', nameEn:'RED',             nameKo:'레드',        hex:'#E30B5C', textColor:'#FFFFFF' },
  { no:'10', nameEn:'BRICK',           nameKo:'벽돌',        hex:'#B33925', textColor:'#FFFFFF' },
  { no:'11', nameEn:'MUSTARD',         nameKo:'겨자',        hex:'#E2B659', textColor:'#2D2D2D' },
  { no:'12', nameEn:'BEIGE',           nameKo:'베이지',      hex:'#E8D8C4', textColor:'#2D2D2D' },
  { no:'13', nameEn:'LITE GRAY',       nameKo:'연회색',      hex:'#D9D9D9', textColor:'#2D2D2D' },
  { no:'14', nameEn:'LITE SKY',        nameKo:'연하늘',      hex:'#E4F2F1', textColor:'#2D2D2D' },
  { no:'15', nameEn:'SKY',             nameKo:'하늘',        hex:'#9BBEC8', textColor:'#2D2D2D' },
  { no:'16', nameEn:'LITE GREEN',      nameKo:'연그린',      hex:'#C1F2B0', textColor:'#2D2D2D' },
  { no:'17', nameEn:'GREEN',           nameKo:'그린',        hex:'#4A6741', textColor:'#FFFFFF' },
  { no:'18', nameEn:'BLUE',            nameKo:'블루',        hex:'#1F4172', textColor:'#FFFFFF' },
  { no:'19', nameEn:'DEEP BROWN',      nameKo:'진갈색',      hex:'#432C19', textColor:'#FFFFFF' },
  { no:'20', nameEn:'BLACK',           nameKo:'블랙',        hex:'#1A1A1A', textColor:'#FFFFFF' },
  { no:'21', nameEn:'YELLOW',          nameKo:'옐로우',      hex:'#FFE500', textColor:'#2D2D2D' },
  { no:'22', nameEn:'ORANGE',          nameKo:'오렌지',      hex:'#F39C12', textColor:'#2D2D2D' },
  { no:'23', nameEn:'MINT',            nameKo:'민트',        hex:'#A0E7E5', textColor:'#2D2D2D' },
];

// ── 앱 상태 ──────────────────────────────────────────────────
const state = {
  token:    null,
  role:     null,
  name:     null,
  userId:   null,
  gasUrl:   localStorage.getItem(GAS_URL_KEY) || '',
  stockData: [],
  // 입출고 워크플로우
  step: 1,
  selectedColor: null,
  selectedType:  '출고',
  selectedQty:   0,
};

// ── DOM 레퍼런스 ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── API 호출 ─────────────────────────────────────────────────
async function apiGet(params) {
  const url = new URL(state.gasUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('token', state.token);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function apiPost(body) {
  const res = await fetch(state.gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, token: state.token }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── 초기화 ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  $('loading-screen').classList.add('hidden');

  // GAS URL 미설정 시 로그인 전 입력 요청
  if (!state.gasUrl) {
    const url = prompt('앱 서버 주소(GAS URL)를 입력해주세요.\n(꼼지파파에게 문의)');
    if (url) {
      state.gasUrl = url.trim();
      localStorage.setItem(GAS_URL_KEY, state.gasUrl);
    }
  }

  renderColorGrid();
  setupLoginForm();
  setupTabs();
  setupRecordWorkflow();
  setupHistory();
  setupChat();
  setupSettings();
});

// ── 로그인 ───────────────────────────────────────────────────
function setupLoginForm() {
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id  = $('login-id').value.trim();
    const pw  = $('login-pw').value;
    $('login-error').textContent = '';
    $('login-btn').disabled = true;
    $('login-btn').textContent = '로그인 중...';

    try {
      const res = await fetch(state.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', id, pw }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      state.token  = data.token;
      state.role   = data.role;
      state.name   = data.name;
      state.userId = id;

      showApp();
    } catch (err) {
      $('login-error').textContent = err.message;
    } finally {
      $('login-btn').disabled = false;
      $('login-btn').textContent = '로그인';
    }
  });
}

function showApp() {
  $('login-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('header-name').textContent = `${state.name} (${state.role === 'admin' ? '관리자' : '직원'})`;

  // 관리자만 채팅/설정 탭 표시
  if (state.role === 'admin') {
    $('tab-chat').classList.remove('hidden');
    $('tab-settings').classList.remove('hidden');
  }

  loadStock();
  showTab('dashboard');
}

// ── 탭 ──────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
  $('btn-logout').addEventListener('click', logout);
}

function showTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-pane').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + tabId));

  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'record')    { resetRecordWorkflow(); }
  if (tabId === 'history')   loadHistory();
}

function logout() {
  state.token = state.role = state.name = state.userId = null;
  sessionStorage.clear();
  $('app').classList.add('hidden');
  $('login-screen').classList.remove('hidden');
  $('login-pw').value = '';
  $('tab-chat').classList.add('hidden');
  $('tab-settings').classList.add('hidden');
}

// ── 재고 로드 ────────────────────────────────────────────────
async function loadStock() {
  try {
    state.stockData = await apiGet({ action: 'stock' });
    renderDashboard();
    syncStockToColorGrid();
  } catch (e) {
    showToast('재고 로딩 실패: ' + e.message, 'error');
  }
}

function getStock(colorNo) {
  return state.stockData.find(s => s.no === colorNo) || { stock: '-', status: '정상' };
}

// ── 대시보드 ─────────────────────────────────────────────────
function renderDashboard() {
  const ok   = state.stockData.filter(s => s.status === '정상').length;
  const warn = state.stockData.filter(s => s.status === '부족').length;
  const out  = state.stockData.filter(s => s.status === '품절').length;

  $('dash-ok').textContent   = ok;
  $('dash-warn').textContent = warn;
  $('dash-out').textContent  = out;

  const grid = $('stock-grid');
  grid.innerHTML = '';
  COLORS.forEach(c => {
    const s    = getStock(c.no);
    const badge = s.status === '품절' ? '🔴' : s.status === '부족' ? '⚠️' : '';
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.style.background  = c.hex;
    card.style.color       = c.textColor;
    card.innerHTML = `
      <div>
        <div class="color-name">${c.nameKo}</div>
        <div class="color-no">${c.no} ${c.nameEn}</div>
      </div>
      <div>
        <span class="stock-count">${s.stock}</span>
        <span class="stock-unit">볼</span>
      </div>
      ${badge ? `<span class="stock-badge">${badge}</span>` : ''}
    `;
    grid.appendChild(card);
  });
}

// ── 입출고 워크플로우 ─────────────────────────────────────────
function renderColorGrid() {
  const grid = $('color-grid');
  grid.innerHTML = '';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.dataset.no = c.no;
    btn.style.background = c.hex;
    btn.style.color = c.textColor;
    btn.innerHTML = `
      <span class="btn-no">${c.no}</span>
      <span class="btn-name">${c.nameKo}</span>
      <span class="btn-stock">-볼</span>
    `;
    btn.addEventListener('click', () => selectColor(c));
    grid.appendChild(btn);
  });
}

function syncStockToColorGrid() {
  document.querySelectorAll('.color-btn').forEach(btn => {
    const s = getStock(btn.dataset.no);
    btn.querySelector('.btn-stock').textContent = `${s.stock}볼`;
    const badge = s.status === '품절' ? '🔴' : s.status === '부족' ? '⚠️' : '';
    let badgeEl = btn.querySelector('.color-btn-badge');
    if (badge) {
      if (!badgeEl) { badgeEl = document.createElement('span'); badgeEl.className = 'color-btn-badge'; btn.appendChild(badgeEl); }
      badgeEl.textContent = badge;
    } else if (badgeEl) badgeEl.remove();
  });
}

function setupRecordWorkflow() {
  // 타입 토글
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedType = btn.dataset.type;
    });
  });

  // 수량 프리셋
  document.querySelectorAll('.qty-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('qty-input').value = btn.dataset.qty;
      state.selectedQty = parseInt(btn.dataset.qty);
    });
  });

  $('qty-input').addEventListener('input', () => {
    document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active'));
    state.selectedQty = parseInt($('qty-input').value) || 0;
  });

  $('btn-to-step2').addEventListener('click', () => {
    if (!state.selectedColor) { showToast('색상을 선택해주세요', 'error'); return; }
    showStep(2);
  });

  $('btn-back-to-step1').addEventListener('click', () => showStep(1));

  $('btn-confirm-open').addEventListener('click', () => {
    const qty = parseInt($('qty-input').value) || 0;
    if (qty <= 0) { showToast('수량을 입력해주세요', 'error'); return; }
    state.selectedQty = qty;
    const c = state.selectedColor;
    $('confirm-text').textContent =
      `${c.no} ${c.nameKo} ${qty}볼 ${state.selectedType} 맞나요?`;
    $('modal-confirm').classList.remove('hidden');
  });

  $('btn-modal-cancel').addEventListener('click', () =>
    $('modal-confirm').classList.add('hidden'));

  $('btn-modal-confirm').addEventListener('click', submitRecord);
}

function selectColor(c) {
  state.selectedColor = c;
  document.querySelectorAll('.color-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.no === c.no));
}

function showStep(step) {
  state.step = step;

  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < step) dot.classList.add('done');
    else if (i + 1 === step) dot.classList.add('active');
  });

  $('step1-content').classList.toggle('hidden', step !== 1);
  $('step2-content').classList.toggle('hidden', step !== 2);

  if (step === 2 && state.selectedColor) {
    const c = state.selectedColor;
    $('selected-swatch').style.background = c.hex;
    $('selected-name').textContent = `${c.no} ${c.nameKo}`;
    const s = getStock(c.no);
    $('selected-stock').textContent = `현재 재고: ${s.stock}볼`;
    $('qty-input').value = '';
    state.selectedQty = 0;
    document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.type-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.type === state.selectedType));
  }
}

function resetRecordWorkflow() {
  state.selectedColor = null;
  state.selectedQty = 0;
  state.selectedType = '출고';
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === '출고'));
  showStep(1);
}

async function submitRecord() {
  $('modal-confirm').classList.add('hidden');
  $('btn-modal-confirm').disabled = true;

  try {
    await apiPost({
      action:    'record',
      colorNo:   state.selectedColor.no,
      colorName: state.selectedColor.nameKo,
      type:      state.selectedType,
      quantity:  state.selectedQty,
      memo:      $('record-memo').value.trim(),
      userId:    state.userId,
    });
    showToast(`✅ ${state.selectedColor.nameKo} ${state.selectedQty}볼 ${state.selectedType} 완료!`, 'success');
    await loadStock();
    resetRecordWorkflow();
    showTab('dashboard');
  } catch (e) {
    showToast('처리 실패: ' + e.message, 'error');
  } finally {
    $('btn-modal-confirm').disabled = false;
  }
}

// ── 기록 조회 ────────────────────────────────────────────────
function setupHistory() {
  const today = new Date().toISOString().slice(0, 10);
  $('history-date').value = today;

  $('btn-today').addEventListener('click', () => {
    $('history-date').value = new Date().toISOString().slice(0, 10);
    loadHistory();
  });
  $('history-date').addEventListener('change', loadHistory);
}

async function loadHistory() {
  const date = $('history-date').value;
  const list = $('history-list');
  list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">로딩 중...</p>';
  try {
    const data = await apiGet({ action: 'history', date });
    if (!data.length) {
      list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">기록이 없습니다.</p>';
      return;
    }
    list.innerHTML = '';
    data.forEach(h => {
      const c   = COLORS.find(x => x.no === h.colorNo) || { hex: '#ccc', textColor: '#333' };
      const item = document.createElement('div');
      item.className = 'history-item';
      const meta = [h.userId, h.memo].filter(Boolean).join(' · ');
      item.innerHTML = `
        <div class="history-swatch" style="background:${c.hex}"></div>
        <div class="history-info">
          <div class="h-color">${h.colorNo} ${h.colorName}</div>
          <div class="h-meta">${h.date.toString().substring(0,16).replace('T',' ')} ${meta ? '· ' + meta : ''}</div>
        </div>
        <span class="history-type-badge ${h.type === '입고' ? 'in' : 'out'}">${h.type}</span>
        <span class="history-qty">${h.quantity}볼</span>
      `;
      list.appendChild(item);
    });
  } catch (e) {
    list.innerHTML = `<p style="color:#E30B5C;text-align:center;padding:20px">${e.message}</p>`;
  }
}

// ── 채팅 (관리자) ────────────────────────────────────────────
function setupChat() {
  $('chat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('chat-input').value.trim();
    if (!msg) return;
    $('chat-input').value = '';
    appendChatBubble('user', msg);
    appendChatBubble('assistant', '...');

    const thinkingEl = document.querySelector('.chat-bubble.assistant:last-child');
    try {
      const res = await apiPost({ action: 'chat', message: msg, userId: state.userId });
      thinkingEl.textContent = res.reply;
      if (res.toolResult?.success) {
        await loadStock();
        appendChatBubble('system-msg', '재고가 업데이트되었습니다.');
      }
    } catch (e) {
      thinkingEl.textContent = '❌ ' + e.message;
    }
    $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
  });
}

function appendChatBubble(type, text) {
  const div = document.createElement('div');
  div.className = `chat-bubble ${type}`;
  div.textContent = text;
  $('chat-messages').appendChild(div);
  $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
  return div;
}

// ── 설정 (관리자) ────────────────────────────────────────────
function setupSettings() {
  $('form-gas-url').addEventListener('submit', e => {
    e.preventDefault();
    const url = $('input-gas-url').value.trim();
    if (!url) return;
    state.gasUrl = url;
    localStorage.setItem(GAS_URL_KEY, url);
    showToast('서버 주소 저장 완료', 'success');
  });

  $('form-api-key').addEventListener('submit', async e => {
    e.preventDefault();
    const key = $('input-api-key').value.trim();
    if (!key) return;
    try {
      await apiPost({ action: 'setApiKey', apiKey: key });
      $('input-api-key').value = '';
      showToast('API 키 저장 완료', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  $('form-add-user').addEventListener('submit', async e => {
    e.preventDefault();
    const userId = $('new-user-id').value.trim();
    const pw     = $('new-user-pw').value.trim();
    const name   = $('new-user-name').value.trim();
    const role   = $('new-user-role').value;
    if (!userId || !pw || !name) { showToast('모든 항목을 입력해주세요', 'error'); return; }
    try {
      await apiPost({ action: 'addUser', userId, pw, name, role });
      $('new-user-id').value = $('new-user-pw').value = $('new-user-name').value = '';
      showToast(`${name} 계정 생성 완료`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // 현재 GAS URL 채워두기
  if (state.gasUrl) $('input-gas-url').value = state.gasUrl;
}

// ── 토스트 ───────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `show ${type}`;
  toastTimer = setTimeout(() => { toast.className = ''; }, 3000);
}
