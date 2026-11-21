// Missions and story for Solmar City. Marisol Vega, who runs the marina, has
// work for a newcomer with a fast pair of hands. Five story jobs chain from
// her dock; after the story, endless package runs and pickups keep paying.
export function createMissions(city) {
  const P = city.places;
  const story = [
    {
      title: 'First Errand', pay: 120,
      intro: 'Marisol: "You must be the new face. Take this package off my dock — no questions."',
      steps: [
        { kind: 'goto', at: P.docks, text: 'Pick up the package at the South Docks', radius: 46 },
        { kind: 'goto', at: P.marina, text: 'Deliver the package to Marisol Marina', radius: 52, pickup: true },
      ],
    },
    {
      title: 'Hot Delivery', pay: 200, time: 75,
      intro: 'Marisol: "Fresh fish for the Hotel Coral. Ice melts, so do not stroll."',
      steps: [
        { kind: 'goto', at: P.marina, text: 'Collect the delivery at the marina', radius: 52 },
        { kind: 'goto', at: P.hotel, text: 'Deliver to Hotel Coral — beat the clock!', radius: 56, pickup: true },
      ],
    },
    {
      title: 'Borrowed Coupe', pay: 320,
      intro: 'Marisol: "A red coupe near the diner owes me. Bring it to Solmar Customs — gently."',
      steps: [
        { kind: 'steal', at: P.diner, text: 'Steal the marked coupe near Seabreeze Diner', radius: 60 },
        { kind: 'goto', at: P.garage, text: 'Deliver the coupe to Solmar Customs Garage', radius: 58, needCar: true },
      ],
    },
    {
      title: 'Shake the Heat', pay: 400,
      intro: 'Marisol: "The PD are watching my dock. Draw them off — then lose them."',
      steps: [
        { kind: 'heat', at: P.police, text: 'Get the police attention (reach 3 stars)', radius: 9999 },
        { kind: 'escape', at: P.police, text: 'Lose the police completely', radius: 9999 },
      ],
    },
    {
      title: 'Three Drops', pay: 650,
      intro: 'Marisol: "Last job. Three cash drops, one boat waiting. The whole bay will chase you."',
      steps: [
        { kind: 'goto', at: P.bank, text: 'Collect drop 1 of 3 at Banco Solmar', radius: 52, count: 1 },
        { kind: 'goto', at: P.beach, text: 'Collect drop 2 of 3 at Solmar Beach', radius: 56, count: 2 },
        { kind: 'goto', at: P.docks, text: 'Collect drop 3 of 3 at the South Docks', radius: 52, count: 3 },
        { kind: 'goto', at: P.marina, text: 'Reach the boat at Marisol Marina!', radius: 56, pickup: true, heat: 3 },
      ],
    },
  ];

  const state = {
    index: 0, step: 0, active: false, done: false, timer: 0,
    dialogue: 'Marisol Vega at the marina has work for you. Head to the gold marker.',
    dialogueT: 8, side: null, storyDone: false,
  };

  function current() {
    if (state.side) return state.side;
    if (state.index >= story.length) return null;
    return story[state.index];
  }
  function currentStep() {
    const m = current();
    return m ? m.steps[state.step] : null;
  }
  function startSide(random) {
    const spots = [P.docks, P.hotel, P.diner, P.bank, P.beach, P.garage];
    const a = spots[Math.floor(random() * spots.length)];
    let b = spots[Math.floor(random() * spots.length)];
    if (b === a) b = P.marina;
    state.side = {
      title: 'Package Run', pay: 90 + Math.floor(random() * 90),
      steps: [
        { kind: 'goto', at: a, text: `Pick up a package at ${a.name}`, radius: 52 },
        { kind: 'goto', at: b, text: `Deliver it to ${b.name}`, radius: 56, pickup: true },
      ],
    };
    state.step = 0; state.timer = 0;
    state.dialogue = `Side work: a package run pays $${state.side.pay}.`;
    state.dialogueT = 6;
  }

  // Called every step by the world. ctx: {distTo(step), inMarkedCar, wanted, pay(n), setHeat(n)}
  function update(dt, ctx, random) {
    if (state.dialogueT > 0) state.dialogueT -= dt;
    const m = current();
    if (!m) { if (!state.side) startSide(random); return; }
    if (m.time && state.step === 1) {
      state.timer -= dt;
      if (state.timer <= 0) { // failed the clock: restart this mission kindly
        state.step = 0; state.timer = 0;
        state.dialogue = 'Marisol: "Too slow — the ice melted. Start that one again."';
        state.dialogueT = 6;
        return;
      }
    }
    const s = currentStep();
    if (!s) return;
    let complete = false;
    if (s.kind === 'goto') complete = ctx.distTo(s) <= s.radius && (!s.needCar || ctx.inAnyCar);
    else if (s.kind === 'steal') complete = ctx.inMarkedCar;
    else if (s.kind === 'heat') complete = ctx.wanted >= 3;
    else if (s.kind === 'escape') complete = ctx.wanted === 0;
    if (!complete) return;
    if (s.heat) ctx.setHeat(s.heat);
    state.step++;
    if (state.step === 1 && m.time) state.timer = m.time;
    if (state.step >= m.steps.length) {
      ctx.pay(m.pay);
      state.dialogue = state.side
        ? `Delivered. +$${m.pay}. More work at the gold marker.`
        : `Marisol: "Good hands. +$${m.pay}." ${state.index + 1 < story.length ? 'Come back for the next job.' : 'You own this bay now, friend.'}`;
      state.dialogueT = 7;
      if (state.side) { state.side = null; startSide(random); }
      else {
        state.index++; state.step = 0; state.timer = 0;
        if (state.index >= story.length) { state.storyDone = true; startSide(random); }
        else { state.dialogue += ` Next: ${story[state.index].title}. ${story[state.index].intro}`; state.dialogueT = 10; }
      }
    } else if (s.pickup) {
      state.dialogue = 'Package on board. Take it to the gold marker.';
      state.dialogueT = 5;
    }
  }

  function objectiveText() {
    const m = current(), s = currentStep();
    if (!m || !s) return 'Free roam — Solmar City is yours.';
    let t = `${m.title}: ${s.text}`;
    if (m.time && state.step === 1) t += ` (${Math.max(0, Math.ceil(state.timer))}s)`;
    return t;
  }
  function marker() {
    const s = currentStep();
    return s && s.radius < 9000 ? { x: s.at.x, y: s.at.y } : null;
  }
  return { state, story, update, objectiveText, marker, currentStep, startSide };
}
