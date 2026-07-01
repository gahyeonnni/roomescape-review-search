# 🔑 방탈출 리뷰 검색

> 우아한테크코스 8기 **방탈출 미션 PR 리뷰**를 한 곳에서 검색·탐색하는 웹앱

### 🔗 **[배포 사이트 바로가기 →](https://gahyeonnni.github.io/roomescape-review-search/)**

리뷰어(코치)나 크루 한 명 한 명의 PR을 일일이 열어보지 않아도, **사람**과 **개념**으로
리뷰 코멘트를 찾아볼 수 있습니다. 내가 받은 리뷰와 비슷한 리뷰가 다른 사람들에게 어떻게
달렸는지도 한눈에 볼 수 있어요.

<br>

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| **사람 검색** | 리뷰어·크루 이름(닉네임/GitHub 아이디)으로 검색 → 그 사람이 **남긴 리뷰**와 **받은 리뷰**를 미션·사이클·단계별로 정리해서 보여줍니다. |
| **개념 검색** | `의존성`, `책임`, `테스트`처럼 개념을 검색하면 **전체 리뷰어**가 그 주제로 남긴 코멘트를 모아 보여줍니다. 미션·리뷰어로 필터링 가능. |
| **유사한 리뷰** | 리뷰 카드의 `🔎 유사한 리뷰`를 누르면 표현·주제가 비슷한 다른 리뷰를 TF-IDF 유사도로 찾아줍니다. |
| **미션 둘러보기** | 미션(레포) → 사이클 → 세부 미션 단위로 크루·리뷰어 목록을 탐색합니다. |

<br>

## 📚 데이터

GitHub API로 아래 세 레포의 **2026년(8기) merged PR**과 리뷰 코멘트를 수집해
`public/data/reviews.json` 스냅샷으로 저장합니다. (close·미머지 PR은 제외)

| 미션(레포) | 사이클 · 세부 미션 |
| --- | --- |
| `spring-roomescape-admin` | 방탈출 예약 관리 |
| `spring-roomescape-member` | 사이클1 테마 + 사용자 예약 / 사이클2 예약 변경·취소와 에러 처리 |
| `spring-roomescape-waiting` | 사이클1 예약 대기 / 사이클2 예약 대기 승인 / 외부 API 연동(1~3단계) |

**수집되는 정보**

- **PR** — 작성자(크루), 닉네임, 미션·사이클·단계(제목에서 파싱)
- **인라인 리뷰 코멘트** — 코드 라인별 리뷰 (파일·라인·본문)
- **PR 대화 코멘트** — PR 대화창 댓글
- **리뷰 총평** — 승인/변경요청 리뷰 본문 (코치 자기소개에서 닉네임도 추출)

> 규모: PR 579개 · 코멘트 약 18,700개 · 리뷰어 116명 (2026-07 기준)

<br>

## 🛠 개발

```bash
npm install
npm run dev        # 로컬 개발 서버 (http://localhost:5173)
npm run build      # dist/ 정적 빌드
npm run preview    # 빌드 결과 미리보기
```

**기술 스택** — React 19 · TypeScript · Vite · 해시 라우팅 (외부 상태/라우팅 라이브러리 없음)

<br>

## 🔄 데이터 다시 수집

GitHub API를 사용하므로 인증이 필요합니다. `gh` 로그인 또는 `GH_TOKEN` 환경변수를 쓰세요.

```bash
gh auth login                    # 또는 export GH_TOKEN=...
npm run collect                  # 세 레포 전체 수집
npm run collect -- --repo admin  # 특정 레포만
npm run collect -- --year 2025   # 다른 기수(연도)
```

| 스크립트 | 용도 |
| --- | --- |
| `scripts/collect.mjs` | 전체 수집 (PR·코멘트·리뷰 총평) |
| `scripts/patch-reparse.mjs` | 재수집 없이 저장된 제목만 다시 파싱해 미션·단계 갱신 |
| `scripts/patch-nicknames.mjs` | 저장된 리뷰 총평에서 코치 닉네임만 다시 추출 |

GitHub Actions(`.github/workflows/refresh-data.yml`)로 매주 자동 갱신도 됩니다.

<br>

## 🚀 배포

`main` 브랜치에 push 하면 GitHub Actions(`deploy.yml`)가 GitHub Pages로 자동 배포합니다.

1. 저장소 **Settings → Pages → Source** 를 `GitHub Actions` 로 설정
2. `main` 에 push → 빌드 & 배포

> 배포 URL: `https://<사용자명>.github.io/roomescape-review-search/`
> 레포명이 다르면 `vite.config.ts` 의 `base` 값을 맞춰주세요.

<br>

## 📁 구조

```
src/
├─ App.tsx              # 앱 셸 + 해시 라우팅
├─ components/          # 화면 (Home / Person / Mission / Concept / Similar / SearchBar / CommentCard)
└─ lib/
   ├─ data.ts          # 데이터 로드 · 사람 집계
   ├─ search.ts        # 개념 검색 · TF-IDF 유사도
   ├─ format.ts        # 미션·단계 라벨 포맷
   └─ router.ts        # 해시 라우터
scripts/               # 데이터 수집·패치 스크립트
public/data/           # reviews.json 스냅샷 (배포 포함)
```
