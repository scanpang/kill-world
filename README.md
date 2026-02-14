# 🎮 KILL WORLD

로블록스 스타일 1인칭 FPS 웹게임

## 기술 스택

| 영역 | 기술 |
|------|------|
| 3D 렌더링 | Three.js |
| 물리 엔진 | Cannon-es |
| 멀티플레이어 | Socket.IO |
| 서버 | Node.js + Express |
| 빌드 | Vite |

## 프로젝트 구조

```
kill-world/
├── client/                # 프론트엔드
│   ├── src/
│   │   ├── game/          # 게임 핵심 (씬, 플레이어, 맵, 무기, NPC)
│   │   ├── network/       # Socket.IO 네트워크
│   │   └── ui/            # HUD, 미니맵
│   ├── index.html
│   └── vite.config.js
├── server/                # 백엔드
│   └── src/
│       └── index.js       # Express + Socket.IO 서버
├── shared/                # 공유 상수
│   └── constants.js
└── package.json
```

## 설치 & 실행

```bash
# 1. 프로젝트 폴더로 이동
cd kill-world

# 2. 전체 의존성 설치
npm run install:all

# 3. 개발 서버 실행 (클라이언트 + 서버 동시)
npm run dev
```

- 클라이언트: http://localhost:5173
- 서버: http://localhost:3000

## 조작법

| 키 | 동작 |
|----|------|
| W/A/S/D | 이동 |
| 마우스 | 시점 회전 |
| 좌클릭 | 사격 |
| R | 재장전 |
| Space | 점프 |
| Shift | 달리기 |
| 1/2/3 | 무기 교체 (돌격소총/샷건/스나이퍼) |

## 현재 기능

- ✅ 1인칭 FPS 컨트롤 (이동, 점프, 달리기)
- ✅ 레이캐스트 슈팅 시스템 (3종 무기)
- ✅ 로블록스 스타일 블록 캐릭터
- ✅ 물리 엔진 (충돌, 중력)
- ✅ NPC (순찰, 추적, 공격 AI)
- ✅ 미니맵
- ✅ HUD (체력바, 탄약, 조준선, 킬피드, 히트마커)
- ✅ 멀티플레이어 (Socket.IO)
- ✅ 블록 맵 (건물, 벽, 엄폐물)

## 앞으로 추가할 것

- 🔲 캐릭터 커스터마이징
- 🔲 라운드/점수 시스템
- 🔲 더 많은 무기 & 무기 스킨
- 🔲 사운드 이펙트
- 🔲 파티클 이펙트
- 🔲 맵 에디터
- 🔲 팀 대전 모드
