# YPL 랜덤 파트너 추첨기 — 간단 수정 안내

## 실행 방법

1. 이 폴더 안의 `index.html`을 더블클릭합니다.
2. Chrome 또는 Edge에서 열면 됩니다.
3. `index.html`, `style.css`, `config.js`, `app.js`, `assets` 폴더를 서로 분리하지 마세요.

---

## 어떤 파일을 수정해야 하나요?

### 1. 제목이나 설명 문구 변경: `index.html`

VS Code에서 `index.html`을 열고 `Ctrl + F`를 누른 뒤 아래 문구를 검색하세요.

- `제36회 파이컵`
- `YPL · Pokémon Center Yonsei`
- `RANDOM PARTNER DRAW`
- `운영 패널`

검색된 한글 문구만 바꾸면 됩니다.

예시:

```html
<h1>제36회 파이컵 — 랜덤 파트너 배틀</h1>
```

여기서 태그(`<h1>`, `</h1>`)는 지우지 말고 가운데 문구만 수정하세요.

---

### 2. 색상이나 크기 변경: `style.css`

`style.css` 맨 위의 `:root`에서 주요 색상을 바꿀 수 있습니다.

```css
:root {
  --ink: #183e68;
  --blue: #249ed0;
  --sky: #68c6e7;
  --mint: #35b8a6;
}
```

로고 크기는 `Ctrl + F`로 아래를 검색하세요.

```css
.brand img
```

상단 로고 크기:

```css
width: 92px;
height: 92px;
```

메인 화면 로고는 아래를 검색하세요.

```css
.hero-logo
```

---

### 3. 포켓몬 목록 변경: `config.js`

메가 포켓몬은 `MEGA`, 일반 포켓몬은 `NORMAL` 배열에 있습니다.

포켓몬 추가 예시:

```javascript
const NORMAL = [
  "피카츄",
  "나인테일",
  "새로운포켓몬"
];
```

주의사항:

- 이름은 반드시 큰따옴표 안에 작성합니다.
- 각 항목 뒤에 쉼표를 넣습니다.
- 같은 이름을 두 번 넣지 않습니다.
- 메가진화 포켓몬의 일반 형태를 일반풀에 넣지 않도록 주의합니다.

---

### 4. 로고 교체

`assets/ypl-logo.png` 파일을 같은 이름의 다른 PNG로 교체하면 됩니다.

파일명은 반드시 다음과 같아야 합니다.

```text
ypl-logo.png
```

투명 배경 PNG 사용을 권장합니다.

---

## 가급적 수정하지 않을 파일

`app.js`에는 추첨, 리롤, 되돌리기, 저장 기능이 들어 있습니다.

간단한 디자인이나 문구 수정이라면 `app.js`는 건드리지 않는 것이 안전합니다.

---

## VS Code에서 찾기 기능

- 현재 파일에서 찾기: `Ctrl + F`
- 모든 파일에서 찾기: `Ctrl + Shift + F`
- 저장: `Ctrl + S`
- 실행 결과 확인: 브라우저에서 새로고침 `Ctrl + R`

수정 전 폴더 전체를 복사해 백업해 두면 안전합니다.


## v9 마지막 느린 회전 설정

이 버전은 기존 일러스트 버전의 애니메이션 구조를 그대로 유지합니다.

`app.js` 위쪽의 다음 두 값만 추가되었습니다.

```javascript
const FINAL_SPIN_DELAY_MS = 560;
const FINAL_SPIN_STEPS = 2;
```

- `FINAL_SPIN_DELAY_MS`: 마지막 후보가 바뀌는 간격입니다. `560`은 0.56초입니다.
- `FINAL_SPIN_STEPS`: 마지막 느린 단계에서 후보를 몇 번 보여줄지 정합니다.

예를 들어 세 번 보여주려면:

```javascript
const FINAL_SPIN_STEPS = 3;
```


## 필수 파일

`index.html`은 `config.js`, `pokemon-images.js`, `app.js`를 순서대로 불러옵니다. 세 파일을 같은 폴더에 유지하세요.


## v10 룰렛식 감속 설정

이 버전은 초반에는 빠르게 돌고, 감속 구간부터는 **각 회전마다 점점 느려지도록** 바뀌었습니다.

`app.js` 맨 위쪽의 다음 값들을 수정하면 됩니다.

```javascript
const FAST_SPIN_COUNT = 14;
const FAST_SPIN_DELAY_MS = 65;
const ROULETTE_START_DELAY_MS = 90;
const ROULETTE_MULTIPLIER = 1.18;
const FINAL_SPIN_DELAY_MS = 560;
const FINAL_SPIN_STEPS = 2;
```

- `FAST_SPIN_COUNT`: 초반 빠르게 도는 횟수
- `FAST_SPIN_DELAY_MS`: 초반 빠른 회전 간격
- `ROULETTE_START_DELAY_MS`: 감속 구간의 첫 간격
- `ROULETTE_MULTIPLIER`: 회전마다 얼마나 느려질지 결정하는 비율
- `FINAL_SPIN_DELAY_MS`: 마지막 느린 간격
- `FINAL_SPIN_STEPS`: 마지막 느린 간격으로 몇 번 바꾼 뒤 확정할지

예를 들어 감속이 더 강했으면 좋다면:

```javascript
const ROULETTE_MULTIPLIER = 1.22;
```

로 바꾸면 됩니다.


## v11 카드 공개 간격 설정

이 버전은 메가픽 공개 후 나머지 카드가 **1200ms 간격으로 하나씩 공개**됩니다.
그동안 아직 공개되지 않은 카드는 계속 회전합니다.

`app.js` 위쪽의 아래 설정만 바꾸면 됩니다.

```javascript
const CARD_REVEAL_INTERVAL_MS = 1200;
const BETWEEN_REVEAL_SPIN_DELAY_MS = 95;
```

- `CARD_REVEAL_INTERVAL_MS`: 한 카드 공개 시작부터 다음 카드 공개 시작까지의 목표 간격
- `BETWEEN_REVEAL_SPIN_DELAY_MS`: 공개 대기 중 나머지 카드가 돌아가는 속도

예를 들어 1초 간격으로 바꾸고 싶다면:

```javascript
const CARD_REVEAL_INTERVAL_MS = 1000;
```

처럼 수정하면 됩니다.


## v12 슬롯머신식 순차 정지 연출

이 버전은 앞 카드가 공개된 뒤 뒷 카드가 갑자기 빨라지는 문제를 제거했습니다.

각 카드는 독립적인 릴처럼 동작합니다.

```text
전체 카드 고속 회전
→ 메가픽 감속·정지·공개
→ 1.2초 뒤 일반픽 1 감속·정지·공개
→ 1.2초 뒤 일반픽 2 공개
→ 같은 방식으로 순차 공개
```

뒤 카드는 자기 차례가 오기 전까지 처음부터 유지하던 고속 회전을 계속합니다.
이미 느려졌다가 다시 빨라지는 동작은 없습니다.

`app.js` 맨 위쪽에서 다음 값을 수정할 수 있습니다.

```javascript
const SLOT_REVEAL_INTERVAL_MS = 1200;
const SLOT_BASE_SPIN_MS = 850;
const SLOT_FAST_DELAY_MS = 70;

const SLOT_BRAKE_DELAYS_MS = [
  90, 110, 135, 165, 200, 245, 300, 370, 450, 560
];
```

- `SLOT_REVEAL_INTERVAL_MS`: 카드별 공개 시점 차이
- `SLOT_BASE_SPIN_MS`: 메가픽의 최초 고속 회전 시간
- `SLOT_FAST_DELAY_MS`: 고속 회전 속도
- `SLOT_BRAKE_DELAYS_MS`: 감속 단계에서 각 후보가 보이는 시간

공개 간격을 1초로 바꾸려면:

```javascript
const SLOT_REVEAL_INTERVAL_MS = 1000;
```

으로 수정하면 됩니다.


## v13 고속 회전 시간 및 화질 설정

고속 회전 시간이 다음처럼 늘어났습니다.

```javascript
const SLOT_BASE_SPIN_MS = 2000;
const REROLL_BASE_SPIN_MS = 1800;
```

- `SLOT_BASE_SPIN_MS`: 최초 추첨에서 메가픽이 감속을 시작하기 전 고속 회전 시간
- `REROLL_BASE_SPIN_MS`: 리롤에서 감속을 시작하기 전 고속 회전 시간

예를 들어 최초 추첨의 고속 회전을 2.5초로 바꾸려면:

```javascript
const SLOT_BASE_SPIN_MS = 2500;
```

으로 수정하면 됩니다.

이전 버전에서 고속 회전 중 이미지가 흐릿해 보였던 이유는
`style.css`에 `blur(1.1px)`와 `opacity: .86`을 의도적으로 적용했기 때문입니다.
v13에서는 두 효과를 제거하여 고속 회전 중에도 원본 화질을 유지합니다.


## v14 회전 중 사각형 배경 고정

고속 회전과 감속 중에 포켓몬 이미지 바깥의 사각형 배경이 위아래로 흔들리던 효과를 제거했습니다.

이제 회전 중에는:

- 카드와 사각형 배경은 고정
- 포켓몬 이름과 실루엣만 변경
- 최종 정지 순간의 짧은 강조 효과는 유지

직접 제거하려면 `style.css`에서 다음 두 규칙을 삭제하면 됩니다.

```css
.card.reel-fast .art-frame {
  animation: reelFastPulse ...;
}

.card.reel-braking .art-frame {
  animation: reelBrakePulse ...;
}
```


## v15 남은 풀 / 리롤 판단 패널

상단의 `남은 메가`, `남은 일반` 숫자를 클릭하면 다음 정보가 함께 표시됩니다.

- 현재 선택된 참가자의 6마리 파티
- 남은 메가 또는 일반 포켓몬 목록
- 이름 검색
- 각 포켓몬의 대략적인 등장 확률
- 현재 리롤 사용 횟수
- 파티 카드 선택 및 리롤 실행

남은 풀의 포켓몬 카드는 참고용이며 직접 선택할 수 없습니다.
리롤 대상은 왼쪽의 현재 파티에서 선택합니다.

공개용 화면에서는 `.subname`을 숨겼으며 카드 이름의 아래쪽 여백도 조정했습니다.


## v16 추첨 실루엣 후보 수정

이전 버전의 회전 애니메이션은 전체 원본 목록인 `MEGA`, `NORMAL`에서
실루엣 후보를 골랐습니다. 그래서 다음 포켓몬이 회전 중 다시 보일 수 있었습니다.

- 이미 다른 참가자가 뽑은 포켓몬
- 현재 참가자가 보유한 포켓몬
- 리롤로 버려져 풀에서 제외된 포켓몬

v16에서는 회전 애니메이션도 실제 남은 풀인 다음 배열만 사용합니다.

```javascript
state.mega
state.normal
```

따라서 실루엣으로 보이는 포켓몬도 모두 현재 시점에 실제로 추첨 가능한 후보입니다.
최종 당첨 포켓몬은 정지 순간에 별도로 표시됩니다.


## v17 메인 리롤 버튼 동작

메인 화면의 리롤 버튼은 다시 기존 방식으로 동작합니다.

```text
파티 카드 선택
→ 선택 카드 리롤 버튼
→ 리롤 확인 창
→ 리롤 애니메이션 실행
```

`남은 메가`, `남은 일반`을 눌렀을 때 열리는 판단 패널은 그대로 유지됩니다.
판단 패널 안에서도 파티를 확인하고 리롤을 실행할 수 있습니다.
