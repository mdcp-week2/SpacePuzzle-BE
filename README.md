# 🚀 SpacePuzzle

> 🌌 **우주를 테마로 한 퍼즐**과 **커스터마이징**을 즐기며  
> **나만의 별 세계**를 만들어가는 웹사이트

> 🛸 **컨셉**  
> 나만의 **우주선 조종실**에서 섹터를 선택하고  
> **천체 퍼즐을 풀며 우주를 탐험**하는 웹 게임

> 🎯 **타깃 사용자**  
> 우주와 퍼즐을 사랑하는 모든 사람!!!

## 🎮 Core Loop

**메인 루프**  
🧩 퍼즐 클리어 → ⭐ 별 획득 → 🌠 섹터 해금 / 🎁 마일스톤 보상 → 다음 목표로 진행

- **성장(Progression)**: ⭐ 별 누적으로 🌠 새 섹터 해금 → 더 다양한 천체 퍼즐 플레이
- **커스터마이징(Customization)**: 🎁 (크레딧/부품) → 🛒 상점 구매 → 🛠️ 우주선/조종석 꾸미기
- **수집(Collection)**: 🖼️ 클리어 천체가 갤러리에 자동 등록 → 도감처럼 감상
- **경쟁(Competition)**: 🏆 천체별 리더보드에서 내 순위 + 상위 5명 확인 (클리어 시간 기준)
- **재방문(Replayability)**: 🔁 매일 바뀌는 데일리 퍼즐(APOD)로 일일 퀘스트/보상 제공

## ✨ Features

### 🧩 섹터별 천체 퍼즐
- 퍼즐을 클리어하면 ⭐ **별 획득**
- ⭐️ **누적 별 수**에 따라 🎁 **마일스톤 보상(크레딧/우주 부품)** 지급 및 🌠 **섹터 해금**
- 섹터별 **난이도 차이**가 있으며, 난이도에 비례해 ⭐ **획득 별(보상)** 차등 지급
- 🏆 천체별 클리어 시간 기준 **상위 5명 랭킹** 확인 가능

### 🪐 오늘의 퍼즐 (Daily: APOD)
- NASA APOD API로 오늘의 사진 수신 → 해당 사진으로 퍼즐 제공
- 매일 진행되는 퀘스트(데일리 루프) → **UTC 기준으로 매일 리셋**
- 🎁 보상: 🔩 **우주 부품 1개**

### 🛒 상점 + 우주선 꾸미기
- 퍼즐을 클리어하며 모은 **💳 크레딧 / 🔩 부품으로 아이템 구매** (조종석/벽지/일반 아이템)
- 구매 아이템 장착으로 **나만의 우주선 커스터마이징** 🛸🪄 가능

### 🎇 클리어한 천체 감상 갤러리
- 클리어한 천체를 도감처럼 모아보기 (**APOD 천체 포함**)

## 🌌 Sectors

### ☀️ Sector 1: The Solar System (태양계)
태양의 중력 아래 다양한 행성들이 공전하는 구역으로, **암석 행성의 지질·대기 차이**부터 **거대 가스 행성의 폭풍/고리**까지 태양계의 극단적인 환경을 한 번에 경험합니다.  
**Objects:** Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, The Sun

### 👽 Sector 2: Exoplanet Systems (외계 행성계)
태양 밖 다른 항성을 도는 행성들로, 관측(분광 등)을 통해 **대기 성분과 거주 가능성**을 탐사하는 영역입니다.  
**Objects:** Proxima b, Barnard's Star b, Kepler-186f, TRAPPIST-1e, Ross 128b, Proxima Centauri

### ☁️ Sector 3: The Nebulae (성운)
성간 가스와 먼지가 모여 **별이 탄생하거나(성형 구역)** 혹은 **별의 죽음으로 남겨진 잔해(초신성/행성상 성운)**가 빛나는 구역입니다.  
**Objects:** Horsehead, Orion, Butterfly, Crab, Carina, Pillars of Creation

### 🌀 Sector 4: The Galaxies (은하)
수천억 개의 별이 모인 거대 구조로, **나선팔·먼지띠·상호작용/합병** 등 은하의 다양한 형태와 진화를 탐험합니다.  
**Objects:** Sombrero(M104), Triangulum(M33), Pinwheel(M101), Black Eye(M64), Whirlpool(M51), Andromeda(M31)

### 🕳️ Sector 5: Deep Space Extremes (심연의 극한)
초고밀도 중력과 강한 방사선이 지배하는 영역으로, **중성자별/펄서/퀘이사/초거대 블랙홀** 같은 우주의 극한 현상을 다룹니다.  
**Objects:** Magnetar, Quasar(3C 273), Vela Pulsar, Cassiopeia A, Neutron Star Collision(kilonova), Sagittarius A*

## 💰 Economy (재화 정책)

SpacePuzzle의 재화는 **진행(별)**, **소비(크레딧)**, **희귀(우주 부품)**의 3종으로 구성됩니다.

- ⭐ **별(Star)**: 퍼즐 클리어로 얻는 **누적 진행도 포인트** (소모 X)  
  → 🎁 **마일스톤 보상 트리거** + 🌠 **섹터 해금 조건**

- 💳 **크레딧(Credit)**: 상점에서 사용하는 **일반 소비 재화** (소모 O)  
  → 주로 🎁 **마일스톤 보상**으로 획득  
  → 🛒 **일반 ~ 레어 아이템 구매**

- 🔩 **우주 부품(Space Part)**: 데일리 플레이로 얻는 **희귀 재화** (소모 O)  
  → 🔁 **데일리 퍼즐(APOD) 클리어 시 1개 고정 지급** (+ 마일스톤 보상으로도 획득 가능)  
  → 🛒 **에픽 ~ 전설 아이템 구매**

### 💎 Star Milestones (마일스톤 테이블)

| 누적 별(⭐) | 보상(💳/🔩) | 섹터 해금 |
|---:|---|---|
| 5 | 💳 +10 / 🔩 +1 | - |
| 10 | 💳 +10 / 🔩 +1 | - |
| 15 | 💳 +20 / 🔩 +2 | 🌠 외계 행성 |
| 20 | 💳 +15 / 🔩 +1 | - |
| 28 | 💳 +25 / 🔩 +3 | 🌠 성운 |
| 35 | 💳 +15 / 🔩 +2 | - |
| 45 | 💳 +30 / 🔩 +4 | 🌠 은하 |
| 55 | 💳 +20 / 🔩 +3 | - |
| 65 | 💳 +40 / 🔩 +5 | 🌠 심연 |
| 85 | 💳 +50 / 🔩 +5 | - |
| 105 | 💳 +60 / 🔩 +8 | - |
| 116 | 💳 +100 / 🔩 +10 | - |

## 🗄️ Database Architecture
<img width="700" height="648" alt="스크린샷 2026-01-21 오후 4 07 40" src="https://github.com/user-attachments/assets/2413983d-fbd6-494a-a4a6-dc2a3f0a3132" />

> 진행(별) / 소비(크레딧) / 희귀(부품), 퍼즐 기록, 상점/커스터마이징, 데일리(APOD), 마일스톤 시스템을 안정적으로 저장/조회하는 테이블 구조

<!-- ERD 이미지가 repo에 있다면 아래 경로를 실제 파일명으로 바꿔주세요 -->
<!-- ![ERD](./docs/erd.png) -->

### Tables
- **users**: 회원 기본 정보 + 재화(별/크레딧/부품) + 진행 상태
- **apods**: NASA APOD(오늘의 사진) 퍼즐 정보
- **sectors**: 섹터 정보 + 해금 조건(필요 별 수) + 섹터 보상 정책
- **celestial_objects**: 천체 퍼즐 메타데이터(이미지/난이도/보상 등)
- **game_records**: 사용자별 퍼즐 진행/완료 기록(최단시간/저장상태)
- **game_attempts**: 퍼즐 시도 단위 기록(플레이 시간/완료 여부)
- **items**: 상점 아이템 기본 정보(이름/타입/가격/에셋 URL)
- **user_items**: 사용자 보유 아이템 + 장착 상태/위치
- **activity_logs**: 사용자 활동 로그(일자별 집계)
- **star_milestones**: 별 기반 마일스톤 정의(보상/해금)
- **user_milestones**: 사용자 마일스톤 달성/수령 내역
- **daily_puzzle_completions**: 데일리(APOD) 완료 기록 + 보상 지급 내역

## 🧰 Tech Stack

### 🪄 Frontend
![React](https://img.shields.io/badge/React-white?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-white?logo=vite&logoColor=646CFF)
![React Router](https://img.shields.io/badge/React%20Router-white?logo=reactrouter&logoColor=CA4245)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-white?logo=tailwindcss&logoColor=06B6D4)
![Supabase](https://img.shields.io/badge/Supabase-white?logo=supabase&logoColor=3FCF8E)

### ⚙ Backend
![Node.js](https://img.shields.io/badge/Node.js-white?logo=node.js&logoColor=339933)
![Express](https://img.shields.io/badge/Express-white?logo=express&logoColor=FFFFFF)
![Prisma](https://img.shields.io/badge/Prisma-white?logo=prisma&logoColor=2D3748)

### 🗃 DB / Server
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-white?logo=postgresql&logoColor=4169E1)
![Render](https://img.shields.io/badge/Render-white?logo=render&logoColor=46E3B7)

## 👥 Team

| Name | School | Role | GitHub |
|------|--------|------|--------|
| **이연서** | 숙명여자대학교 컴퓨터과학전공 | Backend | https://github.com/yexnsxo |
| **박승완** | 카이스트 전기 및 전자공학부 | Frontend | https://github.com/wanipark1004 |

## 📌 Notes
- 데일리 퍼즐(APOD)은 **UTC 기준으로 매일 리셋**됩니다.
- 리더보드는 **천체별 클리어 시간 기준**으로 상위 5명을 노출합니다.
