// ============================================================
// 두맘코튼 재고관리 웹앱 - Google Apps Script 백엔드
// ============================================================

const SHEET_STOCK   = '재고현황';
const SHEET_HISTORY = '입출고기록';
const SHEET_ORDER   = '발주관리';
const SHEET_USERS   = '사용자';

// ── GET 라우터 (모든 요청을 GET으로 처리 - CORS 안전) ──────
function doGet(e) {
  try {
    // data 파라미터가 있으면 POST 대신 GET으로 온 요청
    if (e.parameter.data) {
      const data = JSON.parse(e.parameter.data);
      const action = data.action;
      if (action === 'login')     return jsonResponse(login(data.id, data.pw));
      if (action === 'record')    { verifyToken(data.token); return jsonResponse(addRecord(data)); }
      if (action === 'chat')      { verifyToken(data.token); return jsonResponse(handleChat(data.message, data.userId)); }
      if (action === 'setApiKey') { verifyAdminToken(data.token); setApiKey(data.apiKey); return jsonResponse({ success: true }); }
      if (action === 'addUser')   { verifyAdminToken(data.token); return jsonResponse(createUser(data.userId, data.pw, data.name, data.role)); }
    }

    const action = e.parameter.action;
    const token  = e.parameter.token;
    if (action === 'stock') {
      verifyToken(token);
      return jsonResponse(getStock());
    }
    if (action === 'history') {
      verifyToken(token);
      return jsonResponse(getHistory(e.parameter.date));
    }
    if (action === 'alerts') {
      verifyToken(token);
      return jsonResponse(getAlerts());
    }
    return jsonResponse({ error: '잘못된 요청' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── POST 라우터 (폴백용) ────────────────────────────────────
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (_) {
    return jsonResponse({ error: '잘못된 요청 형식' });
  }
  const action = data.action;

  try {
    if (action === 'login')     return jsonResponse(login(data.id, data.pw));
    if (action === 'record')    { verifyToken(data.token); return jsonResponse(addRecord(data)); }
    if (action === 'chat')      { verifyToken(data.token); return jsonResponse(handleChat(data.message, data.userId)); }
    if (action === 'setApiKey') { verifyAdminToken(data.token); setApiKey(data.apiKey); return jsonResponse({ success: true }); }
    if (action === 'addUser')   { verifyAdminToken(data.token); return jsonResponse(createUser(data.userId, data.pw, data.name, data.role)); }
    return jsonResponse({ error: '잘못된 요청' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── 인증 ────────────────────────────────────────────────────
function login(id, pw) {
  const rows = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_USERS)
    .getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;
    const storedHash = rows[i][1];
    const salt       = rows[i][2];
    if (hashPassword(pw, salt) !== storedHash)
      throw new Error('아이디 또는 비밀번호가 틀렸습니다.');
    const token = Utilities.getUuid();
    CacheService.getScriptCache().put(
      'token_' + token,
      JSON.stringify({ id: id, role: rows[i][4], name: rows[i][3] }),
      3600 // 1시간
    );
    return { token, role: rows[i][4], name: rows[i][3] };
  }
  throw new Error('아이디 또는 비밀번호가 틀렸습니다.');
}

function verifyToken(token) {
  if (!token) throw new Error('토큰이 없습니다.');
  const raw = CacheService.getScriptCache().get('token_' + token);
  if (!raw) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  return JSON.parse(raw);
}

function verifyAdminToken(token) {
  const user = verifyToken(token);
  if (user.role !== 'admin') throw new Error('관리자 권한이 필요합니다.');
  return user;
}

function hashPassword(pw, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + pw
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

// ── 재고 조회 ────────────────────────────────────────────────
function getStock() {
  const rows = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_STOCK)
    .getDataRange().getValues();
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const num = rows[i][0];
    if (typeof num !== 'number' || num < 1 || num > 23) continue;
    result.push({
      no: String(num).padStart(2, '0'), nameEn: rows[i][1], nameKo: rows[i][2],
      stock: rows[i][3], safeStock: rows[i][4],
      totalIn: rows[i][5], totalOut: rows[i][6], status: rows[i][7]
    });
  }
  return result;
}

function getAlerts() {
  return getStock().filter(s => s.status !== '정상');
}

// ── 입출고 기록 ──────────────────────────────────────────────
function addRecord(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const histSheet   = ss.getSheetByName(SHEET_HISTORY);
    const stockSheet  = ss.getSheetByName(SHEET_STOCK);

    const recordDate = data.date || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    histSheet.appendRow([
      recordDate,
      parseInt(data.colorNo), data.colorName,
      data.type, parseInt(data.quantity),
      data.memo || '', data.userId
    ]);

    updateStock(stockSheet, data.colorNo, data.type, parseInt(data.quantity));
    SpreadsheetApp.flush();
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function updateStock(sheet, colorNo, type, quantity) {
  const rows = sheet.getDataRange().getValues();
  const targetNo = parseInt(colorNo);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] !== targetNo) continue;
    const safe      = rows[i][4];
    const current   = rows[i][3];
    const totalIn   = rows[i][5];
    const totalOut  = rows[i][6];

    const newStock   = type === '입고' ? current + quantity : current - quantity;
    const newTotalIn = type === '입고' ? totalIn  + quantity : totalIn;
    const newTotalOut= type === '출고' ? totalOut + quantity : totalOut;
    const newStatus  = newStock <= 0 ? '품절' : newStock < safe ? '부족' : '정상';

    sheet.getRange(i + 1, 4).setValue(newStock);
    sheet.getRange(i + 1, 6).setValue(newTotalIn);
    sheet.getRange(i + 1, 7).setValue(newTotalOut);
    sheet.getRange(i + 1, 8).setValue(newStatus);
    return;
  }
}

function getHistory(date) {
  const rows = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_HISTORY)
    .getDataRange().getValues();
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    if (!(rows[i][0] instanceof Date)) continue;
    const rowDate = Utilities.formatDate(rows[i][0], 'Asia/Seoul', 'yyyy-MM-dd');
    if (!date || rowDate === date) {
      result.push({
        date: rowDate,
        colorNo: String(rows[i][1]).padStart(2, '0'),
        colorName: rows[i][2],
        type: rows[i][3], quantity: rows[i][4],
        memo: rows[i][5], userId: rows[i][6]
      });
    }
  }
  return result.reverse();
}

// ── Claude API 프록시 ────────────────────────────────────────
function handleChat(message, userId) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('Claude API 키가 설정되지 않았습니다.');

  const stock = getStock();
  const stockSummary = stock
    .map(s => `${s.no} ${s.nameKo}: ${s.stock}볼 (${s.status})`)
    .join('\n');

  const tools = [
    {
      name: 'updateStockInventory',
      description: '두맘코튼 재고 입출고 처리',
      input_schema: {
        type: 'object',
        properties: {
          colorNo:         { type: 'string',  description: '2자리 컬러 코드 (예: "04")' },
          colorName:       { type: 'string',  description: '한글 컬러명 (예: "핑크")' },
          quantity:        { type: 'integer', description: '수량 (볼)' },
          transactionType: { type: 'string',  enum: ['입고', '출고'] },
          memo:            { type: 'string',  description: '메모/사유' }
        },
        required: ['colorNo', 'colorName', 'quantity', 'transactionType']
      }
    }
  ];

  const system = `당신은 두맘코튼 재고관리 도우미입니다.

현재 재고 현황:
${stockSummary}

컬러 코드표: 01=아이보리, 02=레몬, 03=연핑크, 04=핑크, 05=딥인디고핑크, 06=연보라, 07=진보라, 08=와인, 09=레드, 10=벽돌, 11=겨자, 12=베이지, 13=연회색, 14=연하늘, 15=하늘, 16=연그린, 17=그린, 18=블루, 19=진갈색, 20=블랙, 21=옐로우, 22=오렌지, 23=민트

입출고 요청이면 updateStockInventory 도구를 사용하세요. 색상명이 불명확하면 가장 가까운 색상을 추론하세요.`;

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: system,
      messages: [{ role: 'user', content: message }],
      tools: tools
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(res.getContentText());
  if (result.error) throw new Error(result.error.message);

  let replyText = '';
  let toolResult = null;

  for (const block of result.content) {
    if (block.type === 'text') {
      replyText = block.text;
    } else if (block.type === 'tool_use' && block.name === 'updateStockInventory') {
      const inp = block.input;
      try {
        addRecord({
          colorNo: inp.colorNo, colorName: inp.colorName,
          type: inp.transactionType, quantity: inp.quantity,
          memo: inp.memo || '', userId: userId
        });
        toolResult = { success: true, ...inp };
        if (!replyText)
          replyText = `✅ ${inp.colorNo} ${inp.colorName} ${inp.quantity}볼 ${inp.transactionType} 완료!`;
      } catch (e) {
        toolResult = { success: false, error: e.message };
        replyText = `❌ 처리 실패: ${e.message}`;
      }
    }
  }

  return { reply: replyText || '처리 완료', toolResult };
}

// ── 사용자 관리 ──────────────────────────────────────────────
function createUser(userId, pw, name, role) {
  const salt = generateSalt();
  const hash = hashPassword(pw, salt);
  const now  = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_USERS)
    .appendRow([userId, hash, salt, name, role || 'staff', now]);
  return { success: true };
}

function setApiKey(apiKey) {
  PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', apiKey);
}

// ── 자동 백업 (시간 기반 트리거에 등록) ─────────────────────
function dailyBackup() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const today  = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  const folder = DriveApp.getFileById(ss.getId()).getParents().next();

  DriveApp.getFileById(ss.getId()).makeCopy('domom-stock_backup_' + today, folder);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().startsWith('domom-stock_backup_') && f.getDateCreated() < cutoff)
      f.setTrashed(true);
  }
}

// ── 유틸 ────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
