# Seedance 2.0 사용법 (curl)

BytePlus ModelArk에서 구매한 리소스 팩(Light Plan)으로 영상을 생성하는 curl 예시 모음.
영상 생성은 **비동기**입니다: ① 생성 요청 → ② 상태 폴링 → ③ `video_url` 다운로드.

> **입력 가능 타입: 텍스트 / 이미지 / 오디오** (영상 입력은 사용하지 않음)
> - **오디오는 단독 입력 불가** — 반드시 이미지 1개 이상과 함께 넣어야 함.
> - 영상 입력이 없으므로 토큰 차감은 **항상 약 1.6배**.

---

## 0. 사전 준비 (1회)

1. 결제한 계정으로 콘솔 로그인 → **모델 활성화**
   https://console.byteplus.com/ark/region:ark+ap-southeast-1/openManagement?tab=ComputerVision
2. **API Key 발급**
   https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey
3. 리소스 팩 잔액 확인: **Billing center → Resource package**

### 공통 변수

- **Base URL**: `https://ark.ap-southeast.bytepluses.com/api/v3`
- **Endpoint**: `/contents/generations/tasks`
- **Model ID**: `seedance-2-0-260128` (Fast 변종 등 정확한 ID는 [Model list](https://docs.byteplus.com/en/docs/ModelArk/1330310)에서 확인)
- **인증**: `Authorization: Bearer <API_KEY>`

> **Windows/PowerShell 주의**: PowerShell에서 `curl`은 `Invoke-WebRequest` 별칭입니다.
> 아래 예시는 진짜 curl이므로 **`curl.exe`** 로 호출하세요. 줄바꿈은 백슬래시(\\) 대신
> PowerShell 백틱(`` ` ``)을 쓰거나, 그냥 한 줄로 붙여서 실행하면 됩니다.
> Git Bash/WSL을 쓰면 아래 그대로(`\`) 동작합니다.

먼저 API 키를 환경변수에 넣어두면 편합니다.

```powershell
# PowerShell
$env:ARK_API_KEY = "여기에-발급받은-키"
```

```bash
# bash / WSL / Git Bash
export ARK_API_KEY="여기에-발급받은-키"
```

---

## 1. 영상 생성 요청 (POST)

응답으로 `{"id": "..."}` 작업 ID가 돌아옵니다. 그 ID로 2단계에서 결과를 조회합니다.

### A) 텍스트 → 영상 (가장 간단)

```bash
curl.exe -X POST "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks" \
  -H "Authorization: Bearer $env:ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedance-2-0-260128",
    "content": [
      { "type": "text", "text": "A kitten yawns at the camera" }
    ],
    "resolution": "720p",
    "ratio": "16:9",
    "duration": 5,
    "generate_audio": false,
    "watermark": false
  }'
```

> bash(WSL/Git Bash)에서는 `$env:ARK_API_KEY` 대신 `$ARK_API_KEY` 를 쓰세요.

### B) 이미지 → 영상 (첫 프레임 + 프롬프트)

`image_url.url` 에는 **공개 접근 가능한 URL** 또는 Base64(`data:image/png;base64,...`)를 넣습니다.

```bash
curl.exe -X POST "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks" \
  -H "Authorization: Bearer $env:ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedance-2-0-260128",
    "content": [
      { "type": "text", "text": "The character slowly turns and smiles" },
      {
        "type": "image_url",
        "role": "first_frame",
        "image_url": { "url": "https://example.com/your-image.png" }
      }
    ],
    "resolution": "720p",
    "ratio": "adaptive",
    "duration": 5
  }'
```

> **첫 프레임 + 마지막 프레임**으로 하려면 `image_url` 객체를 2개 넣고
> 각각 `"role": "first_frame"`, `"role": "last_frame"` 로 지정하세요.

### C) 오디오 동기화 영상 (Seedance 2.0 전용)

`generate_audio: true` 면 프롬프트/영상에 맞춰 음성·효과음·BGM을 **자동 생성**합니다.
대사는 큰따옴표로 감싸면 음성 품질이 좋아집니다.

```bash
curl.exe -X POST "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks" \
  -H "Authorization: Bearer $env:ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedance-2-0-260128",
    "content": [
      { "type": "text", "text": "A man stops a woman and says: \"Remember, never point at the moon.\"" }
    ],
    "resolution": "720p",
    "ratio": "16:9",
    "duration": 5,
    "generate_audio": true
  }'
```

**레퍼런스 오디오를 직접 넣는 경우** (`type: "audio_url"`): 오디오는 단독 입력 불가 →
반드시 **이미지 1개 이상**과 함께 넣습니다. 아래는 이미지 + 오디오 입력 예시입니다.

```bash
curl.exe -X POST "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks" \
  -H "Authorization: Bearer $env:ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedance-2-0-260128",
    "content": [
      { "type": "text", "text": "The character speaks in sync with the audio" },
      {
        "type": "image_url",
        "role": "reference_image",
        "image_url": { "url": "https://example.com/your-image.png" }
      },
      {
        "type": "audio_url",
        "role": "reference_audio",
        "audio_url": { "url": "https://example.com/your-audio.mp3" }
      }
    ],
    "resolution": "720p",
    "duration": 5
  }'
```

> 오디오 입력 조건: 형식 wav/mp3, 길이 2~15초, 파일당 15MB 이하.

---

## 2. 결과 조회 / 폴링 (GET)

`status` 가 `succeeded` 가 될 때까지 몇 초 간격으로 호출하세요.
성공하면 `content.video_url` 에 다운로드 주소가 들어옵니다.

```bash
curl.exe "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/여기에-TASK_ID" \
  -H "Authorization: Bearer $env:ARK_API_KEY"
```

상태 값: `queued`(대기) → `running`(생성중) → `succeeded`(완료) / `failed`(실패).

---

## 3. 영상 다운로드

> ⚠️ `video_url` 은 **24시간 후 삭제**됩니다. 받은 즉시 로컬에 저장하세요.

```bash
curl.exe -L "위에서-받은-video_url" -o output.mp4
```

---

## 부록: 작업 목록 / 취소·삭제

```bash
# 최근 작업 목록 (지난 7일)
curl.exe "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks?page_num=1&page_size=10" \
  -H "Authorization: Bearer $env:ARK_API_KEY"

# 대기중(queued) 작업 취소 / 완료·실패 기록 삭제
curl.exe -X DELETE "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/여기에-TASK_ID" \
  -H "Authorization: Bearer $env:ARK_API_KEY"
```

---

## 주요 파라미터 빠른 참고

| 파라미터 | 값 | 비고 |
|---|---|---|
| `resolution` | `480p` / `720p` / `1080p` | 2.0 Fast는 1080p 미지원 |
| `ratio` | `16:9` `4:3` `1:1` `3:4` `9:16` `21:9` `adaptive` | 2.0 기본값 `adaptive` |
| `duration` | 4~15 (정수, 초) 또는 `-1`(자동) | 과금에 직접 영향 |
| `generate_audio` | `true` / `false` | 2.0 전용, 기본 `true` |
| `watermark` | `true` / `false` | true면 우하단 'AI Generated' |
| `seed` | 정수 | 같은 seed면 유사 결과 |

차감: 리소스 팩 토큰이 먼저 소진되고, 소진 후 자동으로 종량제로 전환됩니다.
영상 입력이 있으면 1:1, 영상 없이(텍스트/이미지) 생성하면 약 1.6배로 차감됩니다.
