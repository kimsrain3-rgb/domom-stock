/* ============================================================
   두맘코튼 재고관리 웹앱 - 프론트엔드 로직 (Supabase 버전)
   ============================================================ */

// ── Supabase 설정 ──────────────────────────────────────────
const SUPABASE_URL = 'https://enfxhsautrsmvokumcmx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lUY2T2L_WGDMIP76iIG2ow_E8Kpq9v3';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 채팅 프록시용 GAS URL (관리자 선택 설정)
const GAS_URL_KEY = 'domom_gas_url';

// 23색 컬러 데이터
const COLORS = [
  { no:'01', nameEn:'IVORY',           nameKo:'아이보리',    hex:'#FBF9F1', textColor:'#FFFFFF' },
  { no:'02', nameEn:'LEMON',           nameKo:'레몬',        hex:'#FFF7A4', textColor:'#FFFFFF' },
  { no:'03', nameEn:'LITE PINK',       nameKo:'연핑크',      hex:'#FFE3E3', textColor:'#FFFFFF' },
  { no:'04', nameEn:'PINK',            nameKo:'핑크',        hex:'#FFB0B0', textColor:'#FFFFFF' },
  { no:'05', nameEn:'DEEP INDIGO PINK',nameKo:'딥인디고핑크', hex:'#D04848', textColor:'#FFFFFF' },
  { no:'06', nameEn:'LITE VIOLET',     nameKo:'연보라',      hex:'#E19CD8', textColor:'#FFFFFF' },
  { no:'07', nameEn:'DEEP VIOLET',     nameKo:'진보라',      hex:'#6F2232', textColor:'#FFFFFF' },
  { no:'08', nameEn:'WINE',            nameKo:'와인',        hex:'#500073', textColor:'#FFFFFF' },
  { no:'09', nameEn:'RED',             nameKo:'레드',        hex:'#E30B5C', textColor:'#FFFFFF' },
  { no:'10', nameEn:'BRICK',           nameKo:'벽돌',        hex:'#B33925', textColor:'#FFFFFF' },
  { no:'11', nameEn:'MUSTARD',         nameKo:'겨자',        hex:'#E2B659', textColor:'#FFFFFF' },
  { no:'12', nameEn:'BEIGE',           nameKo:'베이지',      hex:'#E8D8C4', textColor:'#FFFFFF' },
  { no:'13', nameEn:'LITE GRAY',       nameKo:'연회색',      hex:'#D9D9D9', textColor:'#FFFFFF' },
  { no:'14', nameEn:'LITE SKY',        nameKo:'연하늘',      hex:'#E4F2F1', textColor:'#FFFFFF' },
  { no:'15', nameEn:'SKY',             nameKo:'하늘',        hex:'#9BBEC8', textColor:'#FFFFFF' },
  { no:'16', nameEn:'LITE GREEN',      nameKo:'연그린',      hex:'#C1F2B0', textColor:'#FFFFFF' },
  { no:'17', nameEn:'GREEN',           nameKo:'그린',        hex:'#4A6741', textColor:'#FFFFFF' },
  { no:'18', nameEn:'BLUE',            nameKo:'블루',        hex:'#1F4172', textColor:'#FFFFFF' },
  { no:'19', nameEn:'DEEP BROWN',      nameKo:'진갈색',      hex:'#432C19', textColor:'#FFFFFF' },
  { no:'20', nameEn:'BLACK',           nameKo:'블랙',        hex:'#1A1A1A', textColor:'#FFFFFF' },
  { no:'21', nameEn:'YELLOW',          nameKo:'옐로우',      hex:'#FFE500', textColor:'#FFFFFF' },
  { no:'22', nameEn:'ORANGE',          nameKo:'오렌지',      hex:'#F39C12', textColor:'#FFFFFF' },
  { no:'23', nameEn:'MINT',            nameKo:'민트',        hex:'#A0E7E5', textColor:'#FFFFFF' },
];

// ── 실 사진 배경 설정 함수 ─────────────────────────────────────
function setSwatchBackground(el, color) {
  const imgUrl = `assets/swatches/color-${color.no}.jpg`;
  el.style.background = color.hex;
  el.style.color = color.textColor;
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url(${imgUrl})`;
    el.style.backgroundSize  = 'cover';
    el.style.backgroundPosition = 'center';
  };
  img.src = imgUrl;
}

// ── 앱 상태 ──────────────────────────────────────────────────
const state = {
  token:    null,
  role:     null,
  name:     null,
  userId:   null,
  gasUrl:   localStorage.getItem(GAS_URL_KEY) || '',
  stockData: [],
  selectedColor: null,
  selectedType:  '출고',
  selectedQty:   0,
};

// ── DOM 레퍼런스 ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── 초기화 ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  $('loading-screen').classList.add('hidden');

  renderColorGrid();
  setupLoginForm();
  setupTabs();
  setupRecordWorkflow();
  setupHistory();
  setupChat();
  setupSettings();

  // 저장된 아이디/비밀번호 자동 채우기
  const lastId = localStorage.getItem('domom_last_id');
  if (lastId) $('login-id').value = lastId;
  const lastPw = localStorage.getItem('domom_last_pw');
  if (lastPw) $('login-pw').value = lastPw;

  // 저장된 세션 있으면 자동 로그인 (Supabase 토큰 검증)
  if (restoreSession()) {
    try {
      const { data, error } = await sb.rpc('verify_token', { p_token: state.token });
      if (error || !data || data.error) {
        clearSession();
      } else {
        showApp();
        return;
      }
    } catch {
      clearSession();
    }
  }
});

// ── 세션 저장/복원 ──────────────────────────────────────────────
function saveSession() {
  sessionStorage.setItem('domom_session', JSON.stringify({
    token: state.token, role: state.role,
    name: state.name, userId: state.userId
  }));
}

function restoreSession() {
  const raw = sessionStorage.getItem('domom_session');
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    if (!s.token) return false;
    state.token  = s.token;
    state.role   = s.role;
    state.name   = s.name;
    state.userId = s.userId;
    return true;
  } catch { return false; }
}

function clearSession() {
  sessionStorage.removeItem('domom_session');
}

// ── 로그인 (Supabase RPC) ───────────────────────────────────
function setupLoginForm() {
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id  = $('login-id').value.trim();
    const pw  = $('login-pw').value;
    $('login-error').textContent = '';
    $('login-btn').disabled = true;
    $('login-btn').textContent = '로그인 중...';

    try {
      const { data, error } = await sb.rpc('do_login', { p_id: id, p_pw: pw });
      if (error) throw new Error(error.message);
      if (!data || data.error) throw new Error(data?.error || '로그인 실패');

      state.token  = data.token;
      state.role   = data.role;
      state.name   = data.name;
      state.userId = id;
      localStorage.setItem('domom_last_id', id);
      localStorage.setItem('domom_last_pw', pw);
      saveSession();
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
  clearSession();
  $('app').classList.add('hidden');
  $('login-screen').classList.remove('hidden');
  // 저장된 아이디/비번 다시 채우기
  const lastId = localStorage.getItem('domom_last_id');
  const lastPw = localStorage.getItem('domom_last_pw');
  $('login-id').value = lastId || '';
  $('login-pw').value = lastPw || '';
  $('tab-chat').classList.add('hidden');
  $('tab-settings').classList.add('hidden');
}

// ── 재고 로드 (Supabase 직접 조회) ──────────────────────────
async function loadStock() {
  try {
    const { data, error } = await sb.from('stock').select('*').order('no');
    if (error) throw new Error(error.message);
    state.stockData = data.map(s => ({
      no:        String(s.no).padStart(2, '0'),
      nameEn:    s.name_en,
      nameKo:    s.name_ko,
      stock:     s.stock,
      safeStock: s.safe_stock,
      totalIn:   s.total_in,
      totalOut:  s.total_out,
      status:    s.status,
    }));
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
    setSwatchBackground(card, c);
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
    setSwatchBackground(btn, c);
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
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedType = btn.dataset.type;
    });
  });

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

  $('record-panel').classList.remove('hidden');
  $('record-date').value = new Date().toISOString().slice(0, 10);
  setSwatchBackground($('selected-swatch'), c);
  $('selected-name').textContent = `${c.no} ${c.nameKo}`;
  const s = getStock(c.no);
  $('selected-stock').textContent = `현재 재고: ${s.stock}볼`;
  $('qty-input').value = '';
  state.selectedQty = 0;
  document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === state.selectedType));
}

function resetRecordWorkflow() {
  state.selectedColor = null;
  state.selectedQty = 0;
  state.selectedType = '출고';
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === '출고'));
  $('record-panel').classList.add('hidden');
}

// ── 입출고 등록 (즉시 반응 + Supabase RPC) ──────────────────
async function submitRecord() {
  $('modal-confirm').classList.add('hidden');
  $('btn-modal-confirm').disabled = true;

  const colorNo = state.selectedColor.no;
  const qty     = state.selectedQty;
  const type    = state.selectedType;

  // ★ 즉시 화면 업데이트 (서버 응답 기다리지 않음)
  const stockItem = state.stockData.find(s => s.no === colorNo);
  if (stockItem) {
    stockItem.stock += (type === '입고' ? qty : -qty);
    if (type === '입고') stockItem.totalIn += qty;
    else stockItem.totalOut += qty;
    stockItem.status = stockItem.stock <= 0 ? '품절' : stockItem.stock < stockItem.safeStock ? '부족' : '정상';
  }
  renderDashboard();
  syncStockToColorGrid();
  $('selected-stock').textContent = `현재 재고: ${stockItem ? stockItem.stock : '?'}볼`;
  showToast(`✅ ${state.selectedColor.nameKo} ${qty}볼 ${type} 완료!`, 'success');

  // 입력란 초기화
  $('qty-input').value = '';
  state.selectedQty = 0;
  $('record-memo').value = '';
  document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active'));
  $('btn-modal-confirm').disabled = false;

  // ★ 서버 저장은 뒤에서 진행
  try {
    const { error } = await sb.rpc('add_record', {
      p_token:      state.token,
      p_color_no:   parseInt(colorNo),
      p_color_name: state.selectedColor.nameKo,
      p_type:       type,
      p_quantity:   qty,
      p_memo:       $('record-memo').value.trim(),
      p_user_id:    state.userId,
      p_date:       $('record-date').value,
    });
    if (error) {
      if (error.message.includes('만료') || error.message.includes('세션')) {
        clearSession(); logout();
      }
      // 서버 실패 시 되돌리기
      await loadStock();
      showToast('⚠️ 서버 저장 실패: ' + error.message, 'error');
    }
  } catch (e) {
    await loadStock();
    showToast('⚠️ 서버 저장 실패: ' + e.message, 'error');
  }
}

// ── 기록 조회 (Supabase 직접 조회) ──────────────────────────
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
    const { data, error } = await sb
      .from('history')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    if (!data.length) {
      list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">기록이 없습니다.</p>';
      return;
    }
    list.innerHTML = '';
    data.forEach(h => {
      const colorNo = String(h.color_no).padStart(2, '0');
      const c = COLORS.find(x => x.no === colorNo) || { hex: '#ccc', textColor: '#333' };
      const item = document.createElement('div');
      item.className = 'history-item';
      const meta = [h.user_id, h.memo].filter(Boolean).join(' · ');
      const swatchImg = `assets/swatches/color-${colorNo}.jpg`;
      item.innerHTML = `
        <div class="history-swatch" style="background:${c.hex};background-image:url(${swatchImg});background-size:cover;background-position:center"></div>
        <div class="history-info">
          <div class="h-color">${colorNo} ${h.color_name}</div>
          <div class="h-meta">${h.date} ${meta ? '· ' + meta : ''}</div>
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

// ── 채팅 (관리자 - GAS 프록시 경유) ─────────────────────────
function setupChat() {
  $('chat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('chat-input').value.trim();
    if (!msg) return;

    if (!state.gasUrl) {
      appendChatBubble('system-msg', '⚠️ 채팅 서버가 설정되지 않았습니다.\n설정 탭에서 GAS URL을 입력해주세요.');
      return;
    }

    $('chat-input').value = '';
    appendChatBubble('user', msg);
    appendChatBubble('assistant', '...');

    const thinkingEl = document.querySelector('.chat-bubble.assistant:last-child');
    try {
      const url = new URL(state.gasUrl);
      url.searchParams.set('data', JSON.stringify({
        action: 'chat', message: msg, userId: state.userId, token: 'supabase'
      }));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      thinkingEl.textContent = data.reply;
      if (data.toolResult?.success) {
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
  // GAS URL (채팅용)
  $('form-gas-url').addEventListener('submit', e => {
    e.preventDefault();
    const url = $('input-gas-url').value.trim();
    if (!url) return;
    state.gasUrl = url;
    localStorage.setItem(GAS_URL_KEY, url);
    showToast('채팅 서버 주소 저장 완료', 'success');
  });

  // API 키 (GAS 경유)
  $('form-api-key').addEventListener('submit', async e => {
    e.preventDefault();
    const key = $('input-api-key').value.trim();
    if (!key) return;
    if (!state.gasUrl) {
      showToast('먼저 채팅 서버 주소(GAS URL)를 설정해주세요', 'error');
      return;
    }
    try {
      const url = new URL(state.gasUrl);
      url.searchParams.set('data', JSON.stringify({
        action: 'setApiKey', apiKey: key, token: 'supabase'
      }));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      $('input-api-key').value = '';
      showToast('API 키 저장 완료', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // 계정 추가 (Supabase RPC)
  $('form-add-user').addEventListener('submit', async e => {
    e.preventDefault();
    const userId = $('new-user-id').value.trim();
    const pw     = $('new-user-pw').value.trim();
    const name   = $('new-user-name').value.trim();
    const role   = $('new-user-role').value;
    if (!userId || !pw || !name) { showToast('모든 항목을 입력해주세요', 'error'); return; }
    try {
      const { data, error } = await sb.rpc('create_user', {
        p_token:   state.token,
        p_user_id: userId,
        p_pw:      pw,
        p_name:    name,
        p_role:    role,
      });
      if (error) throw new Error(error.message);
      $('new-user-id').value = $('new-user-pw').value = $('new-user-name').value = '';
      showToast(`${name} 계정 생성 완료`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

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
