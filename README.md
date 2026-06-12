# TVS — Tokyo Veneer System
## 歯科技工所 オーダーシステム / 기공소 주문 시스템

---

## 시스템 개요

일본 치과 ↔ 한국 기공소(TVS) 간 비니어 제작 의뢰 시스템

| 대상 | 기본 언어 | URL |
|------|-----------|-----|
| 일본 치과 (클라이언트) | 🇯🇵 일본어 | `https://tvs.vercel.app` |
| 한국 기공소 (관리자) | 🇰🇷 한국어 | `https://tvs.vercel.app/admin` |

---

## 배포 순서

### 1. Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. 새 프로젝트 생성: `tvs-dental`
3. 다음 서비스 활성화:
   - **Authentication** → Email/Password 활성화
   - **Firestore Database** → 프로덕션 모드로 생성 (리전: `asia-northeast1` 도쿄 권장)
   - **Storage** → 기본 설정

4. 프로젝트 설정 > 앱 추가 > 웹 앱
5. SDK 설정 값 복사

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 Firebase 설정값 입력
```

### 3. Admin 계정 생성

Firebase Console > Authentication에서 이메일/비밀번호로 계정 생성 후,
Firestore > users 컬렉션에 문서 수동 추가:

```json
{
  "email": "admin@tvs-dental.com",
  "role": "admin",
  "status": "approved",
  "clinicName": "TVS Korea",
  "doctorName": "Admin"
}
```

### 4. Firestore 보안 규칙 배포

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # 프로젝트 선택
firebase deploy --only firestore:rules,storage
```

### 5. Vercel 배포

```bash
npm install -g vercel
vercel login

# 환경변수 등록
vercel env add REACT_APP_FIREBASE_API_KEY
vercel env add REACT_APP_FIREBASE_AUTH_DOMAIN
vercel env add REACT_APP_FIREBASE_PROJECT_ID
vercel env add REACT_APP_FIREBASE_STORAGE_BUCKET
vercel env add REACT_APP_FIREBASE_MESSAGING_SENDER_ID
vercel env add REACT_APP_FIREBASE_APP_ID

# 배포
vercel --prod
```

### 6. 커스텀 도메인 설정 (선택)

Vercel Dashboard > Domains에서 도메인 연결
예: `order.tvsdental.jp` 또는 `tvs-dental.vercel.app`

---

## 기능 목록

### 🇯🇵 클라이언트 (일본 치과)

| 기능 | 설명 |
|------|------|
| 신규 등록 | 치과명, 원장명, 주소, 이메일 등 등록 신청 |
| 승인 대기 | TVS에서 승인 후 로그인 가능 |
| 새 주문 | 환자명, 치아번호, 제품종류, 소재, 쉐이드 입력 + 파일 업로드 (STL/DCM/JPG/PDF 등) |
| 주문 내역 | 월별/일별 조회, 주문건수·금액 확인 |
| 배송 추적 | DHL 운송장 번호로 바로 추적 |
| 언어 전환 | 🇯🇵↔🇰🇷 화면 우상단 전환 버튼 |

### 🇰🇷 관리자 (TVS 기공소)

| 기능 | 설명 |
|------|------|
| 실시간 주문 알림 | 새 주문 시 음성 알림 "띵동. 새로운 주문이 ○○거래처에서 발생했습니다" |
| 주문 대시보드 | 거래처별·월별·상태별 필터링 |
| 상태 관리 | 처리대기 → 제작중 → 발송완료 드롭다운으로 변경 |
| 발송 처리 | DHL 운송장 번호 입력 → 자동 '발송완료' 처리 |
| 금액 입력 | 주문별 단가 입력 → 소비세(10%) 자동 계산 |
| 거래처 승인 | 신청 거래처 승인/거부 |
| 가격 설정 | 기본 가격표 + 거래처별 개별 가격 설정 |
| 주문서 출력 | 주문 1건당 1장 프린트 가능 |
| 언어 전환 | 🇰🇷↔🇯🇵 전환 가능 |

---

## 추가 설정 (선택사항)

### 이메일 발송 (신규 주문 알림, 승인 완료 메일)

Firebase Functions를 사용하거나 SendGrid API 연동:

```bash
# functions/index.js 에 다음 로직 추가
# - 신규 주문 → admin@tvs 에게 이메일
# - 승인 완료 → 해당 치과 이메일로 발송
firebase deploy --only functions
```

### SMS 알림 (Twilio)

`functions/index.js`에 Twilio SMS 로직 추가:
```javascript
// onOrderCreate trigger → SMS to TVS admin phone
```

---

## 기술 스택

- **Frontend**: React 18 + React Router 6
- **Backend/DB**: Firebase Firestore (실시간 동기화)
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage (STL, DCM, 이미지 등)
- **Hosting**: Vercel (글로벌 CDN, 일본 접속 최적화)
- **i18n**: i18next (일본어 기본, 한국어 전환)
- **Print**: react-to-print
