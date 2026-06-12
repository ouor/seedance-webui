# Seedance Web UI

BytePlus **Seedance 2.0** 영상 생성 API를 감싸는 웹 UI.
React + TypeScript (프론트) · Cloudflare Workers + Hono (백엔드) · D1 (메타데이터) · R2 (미디어).

> **BYOK**: 사용자가 자기 BytePlus ModelArk API 키를 브라우저에 등록합니다. 키는 서버에 저장되지 않고,
> 생성 요청 때만 Worker를 거쳐 BytePlus로 전달됩니다.

## 구조

```
index.html              Vite 진입
src/                    React 프론트엔드
  screens/              생성 / 보관함 / 설정
  components/           TopNav, 아이콘, 공용 UI
  lib/                  api 클라이언트, 타입, content 빌더, 로컬 저장
  hooks/useTasks.ts     작업 목록 + 폴링
worker/index.ts         Hono — /api/* + /media/* + SPA 폴백
migrations/             D1 스키마
wrangler.jsonc          Worker / D1 / R2 바인딩
seedance-webui/         (참고용) 디자이너 프로토타입
DESIGN-BRIEF.md         디자인 의뢰서
USAGE.md                순수 API 사용법(curl)
```

## 동작 흐름

1. 미디어 업로드 → `POST /api/uploads` → R2 저장 → 공개 URL 반환 (영상 입력은 URL만 허용)
2. 생성 → `POST /api/tasks` → 키 헤더로 ModelArk 호출(+`callback_url` 부착) → 작업 ID를 D1에 기록
3. 완료 처리 (둘 다 동일한 아카이브 로직):
   - **웹훅(주 경로)** → ModelArk가 `POST /api/webhooks/modelark` 호출 → **브라우저가 닫혀 있어도** 서버가 결과 영상을 R2로 아카이브 (원본 24h 만료 방어)
   - **폴링(폴백)** → 브라우저가 `GET /api/tasks/:id`로 진행 확인. 로컬 개발처럼 웹훅이 닿지 않는 환경을 커버
4. 보관함/트레이는 D1 목록 + R2 영상으로 표시

## 처음 셋업

```bash
npm install

# 1) D1 데이터베이스 생성 → 출력된 database_id를 wrangler.jsonc에 붙여넣기
npx wrangler d1 create seedance-db

# 2) R2 버킷 생성
npx wrangler r2 bucket create seedance-media

# 3) 스키마 적용 (로컬)
npm run db:migrate:local
```

`wrangler.jsonc`의 `REPLACE_WITH_YOUR_D1_DATABASE_ID`를 실제 ID로 교체하세요.

## 개발 실행

```bash
npm run dev
```

Vite + Worker가 한 서버에서 함께 뜹니다. 브라우저에서 **설정 → API 키 등록** 후 생성하세요.

## 배포

```bash
npm run db:migrate:remote                 # 원격 D1에 스키마 적용 (최초 1회)
npx wrangler secret put CALLBACK_TOKEN    # 웹훅 위조 방지용 랜덤 문자열 (권장)
npm run deploy                            # 빌드 + wrangler deploy
```

배포된 공개 URL에서만 ModelArk 웹훅이 동작합니다(localhost 제외). 콜백 URL에 `CALLBACK_TOKEN`을
실어 보내고 수신 시 검증하므로, 운영에서는 `wrangler secret`로 강한 값을 설정하세요.

- 배포 대상: Worker `seedance` · 커스텀 도메인 **https://seedance.ouor.in**
- 시크릿은 워커별이므로 워커 이름을 바꾸면 `wrangler secret put CALLBACK_TOKEN`을 다시 실행해야 합니다.

## 메모

- 모델 ID는 `src/lib/types.ts`의 `MODEL_ID` (기본 `seedance-2-0-260128`). Fast 변종 등은 여기서 교체.
- 입력 규칙: 오디오는 이미지/영상과 함께만, 실제 사람 얼굴은 생성 단계에서 거부될 수 있음.
- 폴링 주기는 `src/hooks/useTasks.ts`(기본 4초). 운영에서는 `callback_url` 웹훅으로 대체 가능.
