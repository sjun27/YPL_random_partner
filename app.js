// 추첨 동작 코드입니다.
// 일반적인 문구·색상·포켓몬 목록 수정에는 이 파일을 건드릴 필요가 없습니다.

const KEY = "piCupRandomPartnerYPLV17DirectReroll";
const $ = id => document.getElementById(id);
const MAX_SAFE = Math.min(Math.floor(MEGA.length / 3), Math.floor(NORMAL.length / 7));

// ============================================================
// 슬롯머신식 추첨 연출 설정
//
// 모든 카드는 처음부터 동시에 빠르게 회전합니다.
// 메가픽부터 순서대로 감속을 시작하며,
// 다음 카드의 감속 시작 시점은 1200ms씩 늦어집니다.
// 따라서 앞 카드가 공개된 뒤에도 뒷 카드는 갑자기 빨라지지 않고
// 원래 속도로 계속 회전하다가 자기 차례에 자연스럽게 감속합니다.
// ============================================================
const SLOT_REVEAL_INTERVAL_MS = 1200; // 카드별 정지·공개 간격
const SLOT_BASE_SPIN_MS = 1500;       // 메가픽이 감속하기 전 고속 회전 시간
const REROLL_BASE_SPIN_MS = 1500;     // 리롤 고속 회전 시간
const SLOT_FAST_DELAY_MS = 70;        // 고속 회전 중 이미지 교체 간격

// 실제 슬롯머신처럼 한 칸씩 점점 느려지는 감속 간격
const SLOT_BRAKE_DELAYS_MS = [
  90, 110, 135, 165, 200, 245, 300, 370, 450, 560
];

const SLOT_FINAL_SILHOUETTE_HOLD_MS = 430; // 최종 실루엣 정지 시간
const SLOT_REVEAL_EFFECT_MS = 520;         // 컬러 공개 효과 시간

let state = {
  participants: [],
  current: 0,
  mega: [...MEGA],
  normal: [...NORMAL],
  results: {},
  history: [],
  selected: null,
  busy: false
};

function randomIndex(max) {
  if (max <= 0) throw new Error('풀이 비었습니다.');
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  return data[0] % max;
}

function take(pool) {
  return pool.splice(randomIndex(pool.length), 1)[0];
}

function currentParticipant() {
  return state.participants[state.current] || null;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function artworkIds(name) {
  const ids = POKEMON_IMAGE_IDS[name];
  return Array.isArray(ids) && ids.length ? ids : [];
}

function chooseArtworkId(name) {
  const ids = artworkIds(name);
  return ids.length ? ids[randomIndex(ids.length)] : null;
}

function createCardData(name, type) {
  return { name, type, artId: chooseArtworkId(name) };
}

function normalizeArtworkState() {
  for (const result of Object.values(state.results || {})) {
    if (!Array.isArray(result.cards)) continue;
    result.cards = result.cards.map(card => ({
      ...card,
      artId: card.artId || chooseArtworkId(card.name)
    }));
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, busy: false }));
  } catch (error) {
    console.error('저장 실패:', error);
    throw new Error('브라우저 저장 공간에 기록하지 못했습니다.');
  }
}

function load() {
  const saved = localStorage.getItem(KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    state = {
      ...state,
      ...parsed,
      busy: false,
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
    normalizeArtworkState();
    $('input').value = state.participants.join('\n');
  } catch (error) {
    console.error('저장 상태 복구 실패:', error);
    localStorage.removeItem(KEY);
  }
}

function preloadArtwork() {
  const uniqueIds = [...new Set(Object.values(POKEMON_IMAGE_IDS).flat())];
  return Promise.allSettled(uniqueIds.map(id => new Promise(resolve => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = pokemonImagePathById(id);
  })));
}

const artworkReady = preloadArtwork();

function addLog(text) {
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString('ko-KR')}] ${text}`;
  $('log').prepend(line);
}

function setArtwork(cardElement, name, artId, silhouette) {
  const image = cardElement.querySelector('.pokemon-art');
  const fallback = cardElement.querySelector('.art-fallback');
  const ids = artworkIds(name);
  const resolvedId = artId || (ids.length ? ids[0] : null);

  image.classList.toggle('silhouette', silhouette);
  image.alt = `${name} 일러스트`;

  if (!resolvedId) {
    image.removeAttribute('src');
    image.classList.add('missing');
    fallback.hidden = false;
    return;
  }

  image.classList.remove('missing');
  fallback.hidden = true;
  image.onerror = () => {
    image.classList.add('missing');
    fallback.hidden = false;
  };
  image.onload = () => {
    image.classList.remove('missing');
    fallback.hidden = true;
  };
  image.src = pokemonImagePathById(resolvedId);
}

function setCardCandidate(cardElement, name, artId, silhouette = true) {
  cardElement.querySelector('.name').textContent = name;
  setArtwork(cardElement, name, artId, silhouette);
}

function render() {
  const participant = currentParticipant();
  const result = participant && state.results[participant];

  $('pc').textContent = state.participants.length;
  $('mc').textContent = state.mega.length;
  $('nc').textContent = state.normal.length;
  $('pname').textContent = participant || '참가자를 등록하세요';
  $('msg').textContent = participant
    ? (result
      ? `리롤 ${result.rerolls}/2 · 카드를 선택해 리롤할 수 있습니다.`
      : '현재 참가자의 랜덤 파트너를 추첨하세요.')
    : 'YPL 랜덤 파트너 추첨 시스템';

  $('draw').disabled = state.busy || !participant || !!result;
  $('next').disabled = state.busy || !participant || state.current >= state.participants.length - 1;
  $('reroll').disabled = state.busy || !result || state.selected === null || result.rerolls >= 2;
  $('undo').disabled = state.busy || !state.history.length;

  renderParticipantList();
  renderCards();

  if ($('poolModal') && $('poolModal').classList.contains('show')) {
    renderPoolModal();
  }
}

function renderParticipantList() {
  const list = $('plist');
  list.innerHTML = '';

  state.participants.forEach((name, index) => {
    const item = document.createElement('div');
    item.className = 'pitem'
      + (index === state.current ? ' active' : '')
      + (state.results[name] ? ' done' : '');
    item.innerHTML = `<span>${index + 1}. ${name}</span><span>${state.results[name] ? `완료 · ${state.results[name].rerolls}/2` : '대기'}</span>`;
    item.onclick = () => {
      if (state.busy) return;
      state.current = index;
      state.selected = null;
      save();
      render();
    };
    list.appendChild(item);
  });
}

function makeCard(card, index, mode = 'final') {
  const element = document.createElement('article');
  const isFinal = mode === 'final';
  element.className = 'card'
    + (card.type === 'mega' ? ' mega' : '')
    + (state.selected === index && isFinal ? ' selected' : '');

  const label = card.type === 'mega' ? 'MEGA PICK' : `NORMAL ${index}`;
  const subtext = isFinal ? '파트너 확정' : '후보 탐색 중';

  element.innerHTML = `
    <div class="tag">${label}</div>
    <div class="visual">
      <div class="art-frame">
        <img class="pokemon-art" draggable="false" alt="" />
        <div class="art-fallback" hidden>?</div>
      </div>
    </div>
    <div class="name">${card.name}</div>
    <div class="subname">${subtext}</div>
  `;

  setArtwork(element, card.name, card.artId, !isFinal);

  if (mode === 'rolling') element.classList.add('rolling');
  if (mode === 'locked') element.classList.add('locked');
  if (isFinal) element.classList.add('revealed');

  if (isFinal) {
    element.onclick = () => {
      if (state.busy) return;
      state.selected = state.selected === index ? null : index;
      save();
      render();
    };
  }

  return element;
}

function renderCards() {
  if (state.busy) return;

  const participant = currentParticipant();
  const result = participant && state.results[participant];
  const wrapper = $('cards');

  if (!result) {
    wrapper.className = 'empty';
    wrapper.textContent = '추첨 결과가 여기에 표시됩니다.';
    return;
  }

  wrapper.className = 'slots';
  wrapper.innerHTML = '';
  result.cards.forEach((card, index) => wrapper.appendChild(makeCard(card, index, 'final')));
}

function randomCandidate(type) {
  // 애니메이션에는 현재 실제로 추첨 가능한 남은 풀만 사용합니다.
  // MEGA / NORMAL 원본 목록을 사용하면 이미 다른 참가자가 뽑았거나
  // 리롤로 버린 포켓몬이 실루엣 후보로 다시 나타날 수 있습니다.
  const pool = type === 'mega' ? state.mega : state.normal;

  if (!pool.length) {
    return { name: '???', artId: null };
  }

  const name = pool[randomIndex(pool.length)];
  return { name, artId: chooseArtworkId(name) };
}

function updateReelCandidate(element, cardType) {
  if (!element || !element.isConnected) return;
  const candidate = randomCandidate(cardType);
  setCardCandidate(element, candidate.name, candidate.artId, true);
}

async function runFastReel(element, cardType, durationMs) {
  const endAt = performance.now() + durationMs;

  element.classList.add('reel-fast');
  element.querySelector('.subname').textContent = '고속 회전 중';

  while (performance.now() < endAt) {
    updateReelCandidate(element, cardType);
    await wait(SLOT_FAST_DELAY_MS);
  }

  element.classList.remove('reel-fast');
}

async function runBrakeReel(element, cardType) {
  element.classList.add('reel-braking');
  element.querySelector('.subname').textContent = '감속 중';

  for (const delay of SLOT_BRAKE_DELAYS_MS) {
    updateReelCandidate(element, cardType);
    await wait(delay);
  }

  element.classList.remove('reel-braking');
}

async function stopAndRevealReel(element, card, label = '파트너 확정') {
  if (!element || !element.isConnected) {
    throw new Error('추첨 카드가 화면에서 사라졌습니다.');
  }

  element.classList.remove('rolling', 'reel-fast', 'reel-braking');
  element.classList.add('locked', 'slot-stop');
  element.querySelector('.subname').textContent = '최종 파트너 확인';
  setCardCandidate(element, card.name, card.artId, true);

  await wait(SLOT_FINAL_SILHOUETTE_HOLD_MS);

  element.classList.remove('locked');
  element.classList.add('revealed', 'burst');
  setCardCandidate(element, card.name, card.artId, false);
  element.querySelector('.subname').textContent = label;

  await wait(SLOT_REVEAL_EFFECT_MS);
  element.classList.remove('slot-stop');
}

async function animateSlotReel(element, card, orderIndex, baseSpinMs = SLOT_BASE_SPIN_MS) {
  // 모든 릴은 처음부터 회전하지만, 뒤 릴일수록 감속 시작이 늦습니다.
  const fastDuration = baseSpinMs + orderIndex * SLOT_REVEAL_INTERVAL_MS;

  await runFastReel(element, card.type, fastDuration);
  await runBrakeReel(element, card.type);
  await stopAndRevealReel(element, card);
}

async function animateDraw(cards) {
  const wrapper = $('cards');
  wrapper.className = 'slots';
  wrapper.innerHTML = '';

  const slots = cards.map((card, index) => {
    const element = makeCard(card, index, 'rolling');
    wrapper.appendChild(element);
    return element;
  });

  await artworkReady;

  // 여섯 개 릴을 독립적으로 동시에 실행합니다.
  // 각 릴은 같은 감속 곡선을 사용하므로 공개 시점만 1200ms씩 어긋납니다.
  await Promise.all(
    slots.map((element, index) =>
      animateSlotReel(element, cards[index], index)
    )
  );

  await wait(200);
}

async function draw() {
  const participant = currentParticipant();
  if (!participant || state.results[participant] || state.busy) return;
  if (state.mega.length < 1 || state.normal.length < 5) {
    alert('남은 풀이 부족합니다.');
    return;
  }

  state.busy = true;
  render();

  let megaName = null;
  let normalNames = [];
  let historyAdded = false;

  try {
    megaName = take(state.mega);
    normalNames = Array.from({ length: 5 }, () => take(state.normal));
    const cards = [
      createCardData(megaName, 'mega'),
      ...normalNames.map(name => createCardData(name, 'normal'))
    ];

    state.results[participant] = { cards, rerolls: 0 };
    state.history.push({
      type: 'draw',
      participant,
      mega: megaName,
      normals: [...normalNames]
    });
    historyAdded = true;
    state.selected = null;
    save();

    await animateDraw(cards);
    addLog(`${participant}: ${megaName} / ${normalNames.join(', ')}`);
  } catch (error) {
    console.error('추첨 오류:', error);
    if (state.results[participant]) delete state.results[participant];
    if (megaName !== null && !state.mega.includes(megaName)) state.mega.push(megaName);
    normalNames.forEach(name => {
      if (!state.normal.includes(name)) state.normal.push(name);
    });
    if (historyAdded) state.history.pop();
    alert(`추첨 중 오류가 발생해 작업을 취소했습니다.\n${error.message || error}`);
  } finally {
    state.busy = false;
    try { save(); } catch (error) { console.error(error); }
    render();
  }
}

function next() {
  if (state.busy) return;
  if (state.current < state.participants.length - 1) {
    state.current++;
    state.selected = null;
    save();
    render();
  }
}

async function animateReroll(index, newCard) {
  const wrapper = $('cards');
  let oldCard = wrapper.children[index];

  if (!oldCard) {
    const participant = currentParticipant();
    const result = participant && state.results[participant];
    wrapper.className = 'slots';
    wrapper.innerHTML = '';
    if (result) {
      result.cards.forEach((card, cardIndex) => wrapper.appendChild(makeCard(card, cardIndex, 'final')));
    }
    oldCard = wrapper.children[index];
  }

  if (oldCard) {
    oldCard.classList.add('depart');
    await wait(400);
  }

  const rolling = makeCard(newCard, index, 'rolling');
  rolling.classList.add('enter');

  if (oldCard && oldCard.parentNode === wrapper) wrapper.replaceChild(rolling, oldCard);
  else wrapper.appendChild(rolling);

  await artworkReady;

  await runFastReel(rolling, newCard.type, REROLL_BASE_SPIN_MS);
  await runBrakeReel(rolling, newCard.type);
  await stopAndRevealReel(rolling, newCard, '리롤 확정');
}

async function rerollConfirmed() {
  const participant = currentParticipant();
  const result = participant && state.results[participant];
  const index = state.selected;

  if (!result || index === null || result.rerolls >= 2 || state.busy) return;

  const oldCard = { ...result.cards[index] };
  const pool = oldCard.type === 'mega' ? state.mega : state.normal;
  if (!pool.length) {
    alert('해당 풀이 비었습니다.');
    return;
  }

  state.busy = true;
  render();

  let newName = null;
  let historyAdded = false;

  try {
    newName = take(pool);
    const newCard = createCardData(newName, oldCard.type);
    result.cards[index] = newCard;
    result.rerolls++;
    state.history.push({
      type: 'reroll',
      participant,
      index,
      oldCard,
      newCard: { ...newCard }
    });
    historyAdded = true;
    state.selected = null;
    save();

    await animateReroll(index, newCard);
    addLog(`${participant} 리롤: ${oldCard.name} → ${newName} (${result.rerolls}/2)`);
  } catch (error) {
    console.error('리롤 오류:', error);
    result.cards[index] = oldCard;
    result.rerolls = Math.max(0, result.rerolls - 1);
    if (newName !== null && !pool.includes(newName)) pool.push(newName);
    if (historyAdded) state.history.pop();
    alert(`리롤 중 오류가 발생해 원래 상태로 복구했습니다.\n${error.message || error}`);
  } finally {
    state.busy = false;
    state.selected = null;
    try { save(); } catch (error) { console.error(error); }
    render();
  }
}

function reroll() {
  const participant = currentParticipant();
  const result = participant && state.results[participant];
  const index = state.selected;

  if (!result || index === null || result.rerolls >= 2 || state.busy) return;

  const oldCard = result.cards[index];
  const pool = oldCard.type === 'mega' ? state.mega : state.normal;

  if (!pool.length) {
    alert('해당 풀이 비었습니다.');
    return;
  }

  confirmBox(
    '리롤 확인',
    `${participant}의 ${oldCard.name}을(를) 리롤합니다.\n`
      + `현재 남은 ${poolTypeLabel(oldCard.type)}풀: ${pool.length}마리\n`
      + `기존 포켓몬은 풀에 돌아가지 않으며 새 결과는 즉시 확정됩니다.`,
    rerollConfirmed
  );
}

function undo() {
  if (state.busy || !state.history.length) return;

  const action = state.history.pop();

  try {
    if (action.type === 'draw') {
      delete state.results[action.participant];
      if (!state.mega.includes(action.mega)) state.mega.push(action.mega);
      action.normals.forEach(name => {
        if (!state.normal.includes(name)) state.normal.push(name);
      });
      const index = state.participants.indexOf(action.participant);
      if (index >= 0) state.current = index;
    } else if (action.type === 'reroll') {
      const result = state.results[action.participant];
      if (!result) throw new Error('되돌릴 참가자 결과가 없습니다.');

      const returnPool = action.newCard.type === 'mega' ? state.mega : state.normal;
      if (!returnPool.includes(action.newCard.name)) returnPool.push(action.newCard.name);

      result.cards[action.index] = {
        ...action.oldCard,
        artId: action.oldCard.artId || chooseArtworkId(action.oldCard.name)
      };
      result.rerolls = Math.max(0, result.rerolls - 1);

      const index = state.participants.indexOf(action.participant);
      if (index >= 0) state.current = index;
    } else {
      throw new Error('알 수 없는 작업 기록입니다.');
    }

    state.selected = null;
    save();
    render();
    addLog('마지막 작업을 되돌렸습니다.');
  } catch (error) {
    console.error('되돌리기 오류:', error);
    alert(`되돌리기 중 오류가 발생했습니다.\n${error.message || error}`);
  }
}

function apply() {
  if (state.busy) return;

  const names = $('input').value
    .split('\n')
    .map(name => name.trim())
    .filter(Boolean);

  if (!names.length) return alert('참가자를 입력하세요.');
  if (new Set(names).size !== names.length) return alert('중복된 참가자 이름이 있습니다.');
  if (names.length > MAX_SAFE) {
    return alert(`리롤 2회까지 모두 보장 가능한 최대 인원은 ${MAX_SAFE}명입니다.`);
  }

  confirmBox('참가자 적용', '기존 추첨 결과가 모두 초기화됩니다.', () => {
    state = {
      participants: names,
      current: 0,
      mega: [...MEGA],
      normal: [...NORMAL],
      results: {},
      history: [],
      selected: null,
      busy: false
    };
    save();
    render();
    addLog(`참가자 ${names.length}명 등록`);
  });
}

function reset() {
  if (state.busy) return;

  confirmBox('전체 초기화', '모든 참가자와 추첨 기록을 삭제합니다.', () => {
    localStorage.removeItem(KEY);
    state = {
      participants: [],
      current: 0,
      mega: [...MEGA],
      normal: [...NORMAL],
      results: {},
      history: [],
      selected: null,
      busy: false
    };
    $('input').value = '';
    $('log').innerHTML = '';
    save();
    render();
  });
}

function exportCSV() {
  const rows = [['참가자', '메가픽', '일반픽1', '일반픽2', '일반픽3', '일반픽4', '일반픽5', '리롤횟수']];

  state.participants.forEach(name => {
    const result = state.results[name];
    rows.push(result
      ? [name, result.cards[0].name, ...result.cards.slice(1).map(card => card.name), result.rerolls]
      : [name, '', '', '', '', '', '', 0]);
  });

  const csv = rows
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '파이컵_랜덤파트너_결과.csv';
  link.click();
  URL.revokeObjectURL(url);
}


let poolViewType = 'mega';
let poolSearchQuery = '';

function representativeArtworkId(name) {
  const ids = artworkIds(name);
  return ids.length ? ids[0] : null;
}

function currentPool(type) {
  return type === 'mega' ? state.mega : state.normal;
}

function poolTypeLabel(type) {
  return type === 'mega' ? '메가' : '일반';
}

function createPoolArtwork(name, className = '') {
  const frame = document.createElement('div');
  frame.className = `pool-art-frame ${className}`.trim();

  const image = document.createElement('img');
  image.className = 'pool-art';
  image.alt = `${name} 일러스트`;
  image.draggable = false;

  const fallback = document.createElement('div');
  fallback.className = 'pool-art-fallback';
  fallback.textContent = '?';
  fallback.hidden = true;

  const artId = representativeArtworkId(name);
  if (artId) {
    image.src = pokemonImagePathById(artId);
    image.onerror = () => {
      image.hidden = true;
      fallback.hidden = false;
    };
  } else {
    image.hidden = true;
    fallback.hidden = false;
  }

  frame.append(image, fallback);
  return frame;
}

function renderDecisionParty() {
  const participant = currentParticipant();
  const result = participant && state.results[participant];
  const party = $('decisionParty');
  party.innerHTML = '';

  if (!participant) {
    party.innerHTML = '<div class="party-placeholder">참가자를 먼저 등록하세요.</div>';
    return;
  }

  if (!result) {
    party.innerHTML = `<div class="party-placeholder">${participant}의 추첨을 먼저 진행하세요.</div>`;
    return;
  }

  result.cards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'party-mini-card'
      + (card.type === 'mega' ? ' mega' : '')
      + (state.selected === index ? ' selected' : '');
    button.setAttribute('aria-pressed', state.selected === index ? 'true' : 'false');

    const badge = document.createElement('span');
    badge.className = 'party-mini-badge';
    badge.textContent = card.type === 'mega' ? 'MEGA' : `NORMAL ${index}`;

    const artwork = createPoolArtwork(card.name, card.type === 'mega' ? 'mega' : '');

    const name = document.createElement('strong');
    name.textContent = card.name;

    button.append(badge, artwork, name);
    button.onclick = () => {
      if (state.busy) return;
      state.selected = state.selected === index ? null : index;
      if (state.selected !== null) {
        poolViewType = result.cards[state.selected].type;
      }
      save();
      render();
    };

    party.appendChild(button);
  });
}

function createRemainingPoolCard(name, type) {
  const item = document.createElement('div');
  item.className = 'remaining-pokemon-card' + (type === 'mega' ? ' mega' : '');
  item.title = `${name} · 남은 ${poolTypeLabel(type)}풀`;

  const artwork = createPoolArtwork(name, type === 'mega' ? 'mega' : '');
  const label = document.createElement('span');
  label.textContent = name;

  item.append(artwork, label);
  return item;
}

function renderPoolGrid() {
  const pool = currentPool(poolViewType);
  const query = poolSearchQuery.trim().toLocaleLowerCase('ko-KR');

  const displayed = [...pool]
    .filter(name => !query || name.toLocaleLowerCase('ko-KR').includes(query))
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const grid = $('remainingGrid');
  grid.innerHTML = '';

  displayed.forEach(name => {
    grid.appendChild(createRemainingPoolCard(name, poolViewType));
  });

  $('poolEmpty').hidden = displayed.length !== 0;

  const probability = pool.length ? 100 / pool.length : 0;
  $('poolProbability').textContent = pool.length
    ? `각 포켓몬 등장 확률 약 ${probability.toFixed(2)}% · 가나다순`
    : '남은 포켓몬이 없습니다.';
}

function renderPoolModal() {
  const participant = currentParticipant();
  const result = participant && state.results[participant];
  const selectedCard = result && state.selected !== null
    ? result.cards[state.selected]
    : null;

  $('poolSubtitle').textContent = participant
    ? `${participant}의 현재 파티와 남은 풀을 함께 확인합니다.`
    : '참가자를 선택하면 현재 파티가 이곳에 표시됩니다.';

  $('poolRerollCount').textContent = result
    ? `리롤 ${result.rerolls}/2`
    : '리롤 -/2';

  $('poolMegaCount').textContent = state.mega.length;
  $('poolNormalCount').textContent = state.normal.length;

  $('poolMegaTab').classList.toggle('active', poolViewType === 'mega');
  $('poolNormalTab').classList.toggle('active', poolViewType === 'normal');
  $('poolSearch').value = poolSearchQuery;

  renderDecisionParty();
  renderPoolGrid();

  if (!result) {
    $('selectedSummary').textContent = '추첨 완료 후 파티에서 리롤할 포켓몬을 선택할 수 있습니다.';
  } else if (!selectedCard) {
    $('selectedSummary').textContent = '현재 파티에서 리롤할 포켓몬을 선택하세요.';
  } else {
    const remainingCount = currentPool(selectedCard.type).length;
    $('selectedSummary').innerHTML =
      `<b>${selectedCard.name}</b> 선택 · 남은 ${poolTypeLabel(selectedCard.type)}풀 ${remainingCount}마리`;
  }

  const selectedPoolHasPokemon = selectedCard
    ? currentPool(selectedCard.type).length > 0
    : false;

  $('decisionReroll').disabled = state.busy
    || !result
    || !selectedCard
    || result.rerolls >= 2
    || !selectedPoolHasPokemon;

  $('decisionReroll').textContent = selectedCard
    ? `${selectedCard.name} 리롤 실행`
    : '선택 포켓몬 리롤';
}

function openPoolModal(type = 'mega') {
  if (state.busy) return;

  poolViewType = type === 'normal' ? 'normal' : 'mega';
  poolSearchQuery = '';
  $('poolModal').classList.add('show');
  $('poolModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  renderPoolModal();
  setTimeout(() => $('poolSearch').focus(), 0);
}

function closePoolModal() {
  $('poolModal').classList.remove('show');
  $('poolModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function prepareDecisionReroll() {
  const participant = currentParticipant();
  const result = participant && state.results[participant];
  const index = state.selected;

  if (!result || index === null || result.rerolls >= 2 || state.busy) return;

  const oldCard = result.cards[index];
  closePoolModal();

  confirmBox(
    '리롤 확인',
    `${participant}의 ${oldCard.name}을(를) 리롤합니다.\n`
      + `현재 남은 ${poolTypeLabel(oldCard.type)}풀: ${currentPool(oldCard.type).length}마리\n`
      + `기존 포켓몬은 풀에 돌아가지 않으며 새 결과는 즉시 확정됩니다.`,
    rerollConfirmed
  );
}


let pendingAction = null;

function confirmBox(title, text, action) {
  $('mtitle').textContent = title;
  $('mtext').textContent = text;
  $('modal').classList.add('show');
  pendingAction = action;
}

function closeModal() {
  $('modal').classList.remove('show');
  pendingAction = null;
}

$('apply').onclick = apply;
$('draw').onclick = draw;
$('next').onclick = next;
$('reroll').onclick = reroll;

document.querySelectorAll('.pool-pill').forEach(pill => {
  const open = () => openPoolModal(pill.dataset.poolType);
  pill.onclick = open;
  pill.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };
});

$('poolMegaTab').onclick = () => {
  poolViewType = 'mega';
  renderPoolModal();
};

$('poolNormalTab').onclick = () => {
  poolViewType = 'normal';
  renderPoolModal();
};

$('poolSearch').oninput = event => {
  poolSearchQuery = event.target.value;
  renderPoolGrid();
};

$('poolClose').onclick = closePoolModal;
$('decisionReroll').onclick = prepareDecisionReroll;
$('poolModal').onclick = event => {
  if (event.target === $('poolModal')) closePoolModal();
};
$('undo').onclick = undo;
$('reset').onclick = reset;
$('export').onclick = exportCSV;
$('full').onclick = () => document.fullscreenElement
  ? document.exitFullscreen()
  : document.documentElement.requestFullscreen();
$('cancel').onclick = closeModal;
$('confirm').onclick = async () => {
  const action = pendingAction;
  closeModal();
  if (action) await action();
};
$('modal').onclick = event => {
  if (event.target === $('modal')) closeModal();
};

window.addEventListener('unhandledrejection', event => {
  console.error('처리되지 않은 비동기 오류:', event.reason);
  state.busy = false;
  try { save(); } catch (_) {}
  render();
});

window.addEventListener('error', event => {
  console.error('전역 오류:', event.error || event.message);
  state.busy = false;
  try { save(); } catch (_) {}
  render();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('poolModal').classList.contains('show')) {
    closePoolModal();
  }
});

load();
render();
