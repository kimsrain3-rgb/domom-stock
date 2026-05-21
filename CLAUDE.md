# 두맘코튼 재고관리 프로젝트

## 프로젝트 개요
- **이름**: DO.MOM Cotton 재고관리
- **사용자**: 꼼지파파 (관리자) + 직원들
- **용도**: 두맘코튼 (실가게) 23색 재고 입출고 관리
- **사용 환경**: 창고에서 핸드폰으로 실시간 입출고
- **GitHub**: https://github.com/kimsrain3-rgb/domom-stock
- **배포**: GitHub Pages

## 기술 스택
- **프론트엔드**: HTML + CSS + Vanilla JavaScript
- **백엔드**: Supabase (PostgreSQL + RPC Functions + RLS)
- **AI 채팅**: Google Apps Script (Claude API 프록시) - 선택사항
- **이미지**: assets/swatches/ (23색 실 사진)

## Supabase 정보
- **프로젝트**: domom-stock (Tokyo 리전)
- **URL**: https://enfxhsautrsmvokumcmx.supabase.co
- **Publishable Key**: sb_publishable_lUY2T2L_WGDMIP76iIG2ow_E8Kpq9v3
- **관리자**: ccomzpapa / 4936

## 데이터베이스 구조

### 테이블
- **stock**: 재고 (no, name_en, name_ko, stock, safe_stock, total_in, total_out, status)
- **history**: 입출고 기록 (id, date, color_no, color_name, type, quantity, memo, user_id, created_at)
- **users**: 사용자 (id, pw_hash, salt, name, role, created)
- **sessions**: 세션 토큰 (token, user_id, role, name, expires_at)

### RPC 함수
- `do_login(p_id, p_pw)` - 로그인
- `verify_token(p_token)` - 토큰 검증
- `add_record(p_token, p_color_no, p_color_name, p_type, p_quantity, p_memo, p_user_id, p_date)` - 입출고 등록
- `create_user(p_token, p_user_id, p_pw, p_name, p_role)` - 직원 계정 추가 (관리자만)

### 비밀번호 해싱
- `encode(digest(salt || password, 'sha256'), 'hex')`
- 관리자 솔트: `domom2024salt01`

## 🚨 데이터 보호 규칙 (절대 어기지 말 것!)

### 금지 작업
- **DROP TABLE**은 절대 사용 금지 (테이블 통째로 삭제됨)
- **DROP FUNCTION**은 신중하게 (CREATE OR REPLACE로 대체 가능)
- 사용자에게 확인 없이 데이터를 건드리는 SQL 실행 금지

### 안전한 작업
- 새 컬럼 추가: `ALTER TABLE ... ADD COLUMN ...`
- 함수 수정: `CREATE OR REPLACE FUNCTION ...`
- 코드 수정 (app.js, index.html, style.css): 데이터에 영향 없음

### 데이터 손실 위험 작업 전 필수 절차
1. 사용자에게 "이 작업으로 데이터가 날아갈 수 있습니다" 명시적 경고
2. Supabase 자동 백업 확인 (매일 자동, 7일 보관)
3. 필요시 수동 백업 SQL 제공:
   ```sql
   CREATE TABLE stock_backup_YYYYMMDD AS SELECT * FROM stock;
   CREATE TABLE history_backup_YYYYMMDD AS SELECT * FROM history;
   ```
4. 사용자 확인 후에만 실행

### 자동 백업
- Supabase Dashboard → Database → Backups
- 무료 플랜: 매일 자동, 7일 보관

## 핵심 기능

### 사용자 워크플로우
1. **로그인** - sessionStorage로 자동 로그인 (1시간 유효)
2. **재고현황 탭** - 23색 한 화면에 표시 (실 사진 배경)
3. **입출고 탭** - 분할 화면 (왼쪽 색상 선택, 오른쪽 입력)
   - 색상 클릭 → 즉시 입력 패널 표시
   - 날짜/입출고/수량/메모 입력
   - 확인 누르면 **즉시 화면 업데이트** (Optimistic UI)
   - 서버 저장은 백그라운드
4. **기록 탭** - 날짜별 입출고 내역
5. **채팅 탭** (관리자) - Claude AI로 자연어 입출고
6. **설정 탭** (관리자) - 채팅 서버, API 키, 직원 계정

### 23색 컬러 코드
01=아이보리, 02=레몬, 03=연핑크, 04=핑크, 05=딥인디고핑크,
06=연보라, 07=진보라, 08=와인, 09=레드, 10=벽돌,
11=겨자, 12=베이지, 13=연회색, 14=연하늘, 15=하늘,
16=연그린, 17=그린, 18=블루, 19=진갈색, 20=블랙,
21=옐로우, 22=오렌지, 23=민트

## 파일 구조
```
domom-stock/
├── index.html          ← HTML 구조
├── css/style.css       ← 스타일
├── js/app.js           ← 메인 로직 (Supabase 클라이언트)
├── assets/swatches/    ← 23색 실 사진 (color-01.jpg ~ color-23.jpg)
├── gas/Code.gs         ← (선택) Claude API 프록시용 GAS 코드
└── CLAUDE.md           ← 이 파일
```

## 협업 규칙

### 역할
- **꼼지파파** = 비전공자, 아이디어 + 지시 + 최종 판단
- **Claude** = 실무 (코드/구현/SQL)
- 기술 용어 최소화, 비유로 설명 (예: "테이블 = 엑셀 시트", "함수 = 자판기")

### 코드 수정 원칙
- 수정 전 반드시 현재 코드 확인 (기억에 의존 금지)
- 한 번에 하나씩 (여러 기능 동시 변경 금지)
- 변경 후 git commit + push (GitHub Pages 자동 배포)

### Supabase 작업 원칙
- **SQL 실행 전**: 데이터 영향 여부 사용자에게 명시
- **함수 수정**: CREATE OR REPLACE 사용 (DROP 후 CREATE 금지)
- **컬럼 추가**: ALTER TABLE ADD COLUMN
- **스키마 변경 후**: `NOTIFY pgrst, 'reload schema';` 실행
- **에러 발생 시**: 추측 말고 `information_schema`로 실제 구조 확인

### 세션 시작 프로토콜
1. 이 CLAUDE.md 읽기 (자동)
2. 현재 git 상태 확인
3. 사용자에게 현재 상태 요약 + 오늘 작업 방향 확인

## 진행 상황
- [x] 기본 앱 구축 (Google Apps Script + Google Sheets)
- [x] 23색 실 사진 적용
- [x] 자동 로그인 (sessionStorage)
- [x] 입출고 분할 화면 + 날짜 선택
- [x] Supabase 마이그레이션 (속도 0.2~0.3초)
- [x] Optimistic UI (즉시 반응)
- [ ] 실제 재고 숫자 입력 (꼼지파파 작업)
- [ ] 직원 계정 추가
- [ ] Claude AI 채팅 활성화 (선택사항)
- [ ] 매일 자동 백업 설정 (선택사항)

## 알려진 이슈 / 주의사항
- 채팅 기능은 GAS URL 설정 필요 (관리자 설정 탭)
- sessionStorage는 브라우저 탭 닫으면 사라짐 → 다시 로그인 필요
- 24시간 후 로그인 만료 (보안)
