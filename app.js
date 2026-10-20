const prizes = [
  { points: 5, label: '5<br><small>POINTS</small>' },
  { points: 10, label: '10<br><small>POINTS</small>' },
  { points: 15, label: '15<br><small>POINTS</small>' },
  { points: 20, label: '20<br><small>POINTS</small>' },
  { points: 30, label: '30<br><small>POINTS</small>' },
  { points: 50, label: 'JACKPOT<br><small>50 POINTS</small>', jackpot: true }
];

const form = document.getElementById('entry');
const button = document.getElementById('spin');
const buttonLabel = button.querySelector('.button__label');
const message = document.getElementById('msg');
const wheel = document.getElementById('wheel');
const wheelbox = document.querySelector('.wheelbox');
const wheelLabels = document.getElementById('wheelLabels');
const result = document.getElementById('result');
const confetti = document.getElementById('confetti');
const nameInput = document.getElementById('name');
const suffixInput = document.getElementById('suffix');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let spinning = false;
let rotation = 0;

function buildWheelLabels() {
  const slice = 360 / prizes.length;
  const radius = Math.round(wheel.clientWidth * .33);
  wheelLabels.innerHTML = prizes.map((prize, index) => {
    const angle = index * slice + slice / 2;
    return `<span class="wheel__label${prize.jackpot ? ' wheel__label--jackpot' : ''}" style="--angle:${angle}deg;--counter-angle:-${angle}deg;--label-offset:-${radius}px"><b>${prize.label}</b></span>`;
  }).join('');
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('message--error', isError);
}

function destinationFor(points) {
  const index = prizes.findIndex(prize => prize.points === Number(points));
  const segment = index === -1 ? 0 : index;
  const slice = 360 / prizes.length;
  const targetAngle = (360 - (segment * slice + slice / 2)) % 360;
  const currentAngle = ((rotation % 360) + 360) % 360;
  const forwardDistance = (targetAngle - currentAngle + 360) % 360;
  const extraTurns = reduceMotion ? 0 : 5 + Math.floor(Math.random() * 2);
  rotation += extraTurns * 360 + forwardDistance;
  return rotation;
}

function celebrate() {
  if (reduceMotion) return;
  const colors = ['#e64536', '#f5be2e', '#2d9a65', '#fff4cf', '#7444aa'];
  confetti.replaceChildren();
  for (let index = 0; index < 30; index += 1) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${(Math.random() - .5) * 260}px`);
    piece.style.setProperty('--r', `${Math.random() * 520 - 260}deg`);
    piece.style.setProperty('--delay', `${Math.random() * .22}s`);
    piece.style.background = colors[index % colors.length];
    confetti.appendChild(piece);
  }
  window.setTimeout(() => confetti.replaceChildren(), 1900);
}

function showResult(data) {
  document.getElementById('points').textContent = `${data.points} POINTS`;
  document.getElementById('prize').textContent = data.prize;
  result.hidden = false;
  result.classList.remove('result--visible');
  requestAnimationFrame(() => result.classList.add('result--visible'));
  celebrate();
}

function waitForSpin() {
  return new Promise(resolve => window.setTimeout(resolve, reduceMotion ? 80 : 4300));
}

function setupScrollMotion() {
  const targets = [
    ...document.querySelectorAll('.hero .eyebrow, .hero h1, .hero__intro, .game-card, .section-title, .steps article')
  ];

  targets.forEach((target, index) => {
    target.classList.add('motion-reveal');
    target.style.setProperty('--reveal-delay', `${Math.min(index * 75, 300)}ms`);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach(target => target.classList.add('is-visible'));
    return;
  }

  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .14, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(target => observer.observe(target));
}

buildWheelLabels();
setupScrollMotion();
window.addEventListener('resize', () => {
  if (!spinning) buildWheelLabels();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (spinning) return;

  const displayName = nameInput.value.trim();
  const phoneSuffix = suffixInput.value.trim();
  if (displayName.length < 2) {
    setMessage('Entre le nom affiché sur ton compte WhatsApp.', true);
    nameInput.focus();
    return;
  }
  if (!/^\d{3}$/.test(phoneSuffix)) {
    setMessage('Entre exactement les 3 derniers chiffres de ton numéro.', true);
    suffixInput.focus();
    return;
  }

  spinning = true;
  button.disabled = true;
  buttonLabel.textContent = 'La roulette tourne…';
  setMessage('');
  result.hidden = true;

  try {
    const response = await fetch('/api/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, phoneSuffix })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Une erreur est survenue. Réessaie dans un instant.');

    wheel.classList.remove('wheel--spinning');
    void wheel.offsetWidth;
    wheel.style.transform = `rotate(${destinationFor(data.points)}deg)`;
    wheel.classList.add('wheel--spinning');
    wheelbox.classList.add('wheelbox--spinning');
    await waitForSpin();

    showResult(data);
    setMessage('Participation enregistrée. Bonne chance !');
    form.querySelectorAll('input').forEach(input => { input.disabled = true; });
    buttonLabel.textContent = 'Participation validée';
  } catch (error) {
    setMessage(error.message, true);
    button.disabled = false;
    buttonLabel.textContent = 'Lancer la roulette';
  } finally {
    wheelbox.classList.remove('wheelbox--spinning');
    spinning = false;
  }
});

suffixInput.addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 3);
});
