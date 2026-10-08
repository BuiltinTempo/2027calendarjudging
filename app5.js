function adminBallotCards(ids){
  const list=(ids||[]).map(id=>pm()[id]).filter(Boolean);
  return list.length?`<div class="reviewgrid" style="margin-top:10px">${list.map(p=>`<div class="reviewitem"><img src="${p.image}"><div class="row"><b>#${p.entryNumber}</b></div></div>`).join('')}</div>`:`<div class="muted" style="margin-top:8px">No selections saved.</div>`;
}

function adminJudgeBallot(j,r){
  const ballot=(data._adminBallots||[]).find(b=>b.judge_id===j.id&&b.round_id===r.id);
  const payload=ballot?.payload||{};
  const status=ballot?.finalized?'Finalized':ballot?'In progress':'Not started';
  let detail='';
  if(r.type==='batches'){
    const gs=groups(r),saved=payload.groups||{},drafts=payload.drafts||{};
    detail=gs.map((g,gi)=>{
      const ids=saved[gi]||drafts[gi]||[];
      const tag=saved[gi]?'Saved':drafts[gi]?'Draft':'No vote';
      return `<div class="reviewgroup"><div><b>Group ${gi+1}</b> <span class="muted">· ${tag} · ${ids.length} selected</span></div>${adminBallotCards(ids)}</div>`;
    }).join('');
  }else if(r.type==='peoples'){
    detail=`<div class="reviewgroup"><b>Cover</b>${adminBallotCards(payload.cover?[payload.cover]:[])}</div><div class="reviewgroup"><b>Centerfold</b>${adminBallotCards(payload.centerfold?[payload.centerfold]:[])}</div>`;
  }else{
    detail=adminBallotCards(payload.choices||[]);
  }
  return `<details class="panel" style="margin-top:10px"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center"><span><b>${esc(j.name)}</b></span><span class="muted">${status}</span></summary><div style="margin-top:12px">${detail}</div></details>`;
}

async function renderAdmin(){
  if(!currentAdminToken)return renderAdminLogin();
  $('#root').innerHTML=shell(`<div class="empty"><h2>Loading admin dashboard...</h2></div>`,'ADMIN CONTROL');
  try{await loadAdmin()}catch(e){
    sessionStorage.removeItem('calendar-admin-token');currentAdminToken=null;
    return renderAdminLogin(e.message);
  }
  let r=data.rounds.find(x=>x.id===ui.roundId)||openRound()||data.rounds[0];
  ui.roundId=r.id;
  let body=`<div class="hero"><div><div class="eyebrow">ADMIN CONTROL</div><h2>Contest dashboard</h2>
  <p><b>Supabase Live v1.1</b> · Shared judge progress and public voting are online.</p></div>
  <div class="pill">${data.prizeFinalists.length===5?'TOP 5 LOCKED':data.calendarWinners.length===14?'14 CALENDAR WINNERS':'LIVE'}</div></div>
  <div class="tabs">
    <button data-tab="progress" class="${ui.tab==='progress'?'active':''}">Judge Progress</button>
    <button data-tab="results" class="${ui.tab==='results'?'active':''}">Judge Results</button>
    <button data-tab="public" class="${ui.tab==='public'?'active':''}">People’s Choice</button>
    <button data-tab="links" class="${ui.tab==='links'?'active':''}">Links</button>
  </div>
  <div class="rounds">${data.rounds.map(x=>`<button data-round="${x.id}" class="${x.id===r.id?'active':''}">${x.name}<br><small>${x.status}</small></button>`).join('')}</div>`;
  if(data.calendarWinners.length===14)body+=`<div class="milestone"><b>🏆 14 CALENDAR SPOTS SECURED</b><div class="muted">These 14 are permanent calendar winners.</div></div>`;
  if(data.prizeFinalists.length===5)body+=`<div class="milestone"><b>⭐ TOP 5 FINALISTS LOCKED</b><div class="muted">Public and judge prize votes now count together.</div></div>`;

  if(ui.tab==='progress'){
    const complete=data.judges.filter(j=>data.finalized[`${j.id}:${r.id}`]).length;
    body+=`<section class="panel"><h3>${r.name} — Judge progress</h3><div class="notice"><b>${complete}/${data.judges.length}</b> finalized</div>
    <div class="judgegrid">${data.judges.map(j=>{const[d,t]=progressFor(j,r),pct=t?Math.round(d/t*100):0;return`<div class="judge"><div class="avatar">${j.name[0]}</div><div><b>${j.name}</b><div class="muted">${data.finalized[`${j.id}:${r.id}`]?'Complete':d?'In progress':'Not started'}</div></div><div class="bar"><span style="width:${pct}%"></span></div><div>${pct}%</div></div>`}).join('')}</div></section>`;
  }

  if(ui.tab==='results'){
    const totals=adminTotals(r),rank=[...r.photoIds].sort((a,b)=>(totals[b]||0)-(totals[a]||0)||String(a).localeCompare(String(b)));
    body+=`<section class="panel"><h3>${r.name} — Judge ranking</h3><div class="results">${rank.map(id=>{const p=pm()[id];return`<div class="result"><img src="${p.image}"><div><b>#${p.entryNumber}</b><span>${totals[id]||0} judge votes</span></div></div>`}).join('')}</div></section>`;
    body+=`<section class="panel"><h3>Individual Judge Ballots</h3><div class="notice">Expand a judge to see exactly which entries they selected in ${r.name}${r.type==='batches'?', broken out group-by-group':''}.</div>${data.judges.map(j=>adminJudgeBallot(j,r)).join('')}</section>`;
    const next=data.rounds[data.rounds.findIndex(x=>x.id===r.id)+1];
    if(next&&r.id!=='r4'){
      const allDone=data.judges.every(j=>data.finalized[`${j.id}:${r.id}`]);
      const fixed=r.id==='r2'?14:r.id==='r3'?5:null;
      const count=fixed??36;
      const plan=advancementPlan(r,count);
      const choice=ui.tieChoices[r.id]||[];
      if(plan.hasTie){
        body+=`<section class="panel tiebreak"><h3>⚖ Cutoff tie requires tie-break</h3>
        <div class="notice">${plan.tie.length} photos are tied for ${plan.needed} remaining spot${plan.needed===1?'':'s'}.</div>
        <div class="tiebreakgrid">${plan.tie.map(id=>{const p=pm()[id],sel=choice.includes(id);return`<div class="tiecard ${sel?'selected':''}" data-tie="${id}"><img src="${p.image}"><div class="meta"><b>#${p.entryNumber}</b><span>${plan.totals[id]||0} votes</span></div></div>`}).join('')}</div></section>`;
      }
      const ready=allDone&&(!plan.hasTie||choice.length===plan.needed);
      body+=`<section class="panel"><h3>Review & approve</h3><div class="notice">${allDone?'Results are ready.':'All 7 judges must finalize first.'}</div>
      <label>${fixed?'Selected':'Advance top'} <input id="advanceCount" type="number" value="${count}" ${fixed?'readonly':''} min="1" max="${r.photoIds.length}" style="width:80px;padding:9px;background:#0b0e15;color:#fff;border:1px solid #343b51;border-radius:8px"></label>
      <button class="primary" id="advance" data-next="${next.id}" ${ready?'':'disabled'}>${r.id==='r2'?'Lock Top 14 Calendar Winners':r.id==='r3'?'Lock Defined Top 5 & Open People’s Choice':'Approve Results & Open Semifinal'}</button></section>`;
    }
  }

  if(ui.tab==='public'){
    if(data.prizeFinalists.length===5){
      const ct=combinedTotals('cover'),ft=combinedTotals('centerfold');
      body+=`<section class="panel"><h3>Combined Cover Vote</h3><div class="results">${[...data.prizeFinalists].sort((a,b)=>(ct[b]||0)-(ct[a]||0)).map(id=>{const p=pm()[id];return`<div class="result"><img src="${p.image}"><div><b>#${p.entryNumber}</b><span>${ct[id]||0} combined votes</span></div></div>`}).join('')}</div></section>
      <section class="panel"><h3>Combined Centerfold Vote</h3><div class="results">${[...data.prizeFinalists].sort((a,b)=>(ft[b]||0)-(ft[a]||0)).map(id=>{const p=pm()[id];return`<div class="result"><img src="${p.image}"><div><b>#${p.entryNumber}</b><span>${ft[id]||0} combined votes</span></div></div>`}).join('')}</div></section>`;
    }else{
      const base=data.calendarWinners.length===14?data.calendarWinners.map(id=>pm()[id]).filter(Boolean):data.photos.filter(p=>p.active);
      body+=`<section class="panel"><h3>Community popularity</h3><div class="results">${base.sort((a,b)=>(data.publicVotes[b.id]||0)-(data.publicVotes[a.id]||0)).map(p=>`<div class="result"><img src="${p.image}"><div><b>#${p.entryNumber}</b><span>${data.publicVotes[p.id]||0} public votes</span></div></div>`).join('')}</div></section>`;
    }
    body+=`<section class="panel"><button class="ghost" id="togglePublic">${data.publicOpen?'Close':'Open'} public voting</button></section>`;
  }

  if(ui.tab==='links'){
    const base=location.origin+location.pathname;
    body+=`<section class="panel"><h3>Share links</h3><div class="links">
      <div class="linkrow"><b>Public</b><code>${esc(base+'?public=1')}</code><button class="ghost" data-copy="${esc(base+'?public=1')}">Copy</button></div>
      ${data.judges.map(j=>{const u=base+'?judge='+encodeURIComponent(j.token);return`<div class="linkrow"><b>${j.name}</b><code>${esc(u)}</code><button class="ghost" data-copy="${esc(u)}">Copy</button></div>`}).join('')}
    </div></section>`;
  }

  $('#root').innerHTML=shell(body,'ADMIN CONTROL');
  bindAdmin();
  bindZoom();
}

function bindAdmin(){
  $$('[data-tab]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;renderAdmin()});
  $$('[data-round]').forEach(b=>b.onclick=()=>{ui.roundId=b.dataset.round;renderAdmin()});
  $$('[data-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copy));
  $$('[data-tie]').forEach(c=>c.onclick=()=>{
    const id=c.dataset.tie,round=data.rounds.find(r=>r.id===ui.roundId);
    const count=round.id==='r2'?14:round.id==='r3'?5:+($('#advanceCount')?.value||36);
    const plan=advancementPlan(round,count);
    let arr=[...(ui.tieChoices[round.id]||[])];
    if(arr.includes(id))arr=arr.filter(x=>x!==id);
    else if(arr.length<plan.needed)arr.push(id);
    ui.tieChoices[round.id]=arr;
    c.classList.toggle('selected',arr.includes(id));
    const adv=$('#advance');
    if(adv){
      const allDone=data.judges.every(j=>data.finalized[`${j.id}:${round.id}`]);
      adv.disabled=!(allDone&&(!plan.hasTie||arr.length===plan.needed));
    }
  });
  const tog=$('#togglePublic');if(tog)tog.onclick=async()=>{
    try{await rpc('admin_set_public_open',{p_token:currentAdminToken,p_open:!data.publicOpen});await renderAdmin()}catch(e){alert(e.message)}
  };
  const adv=$('#advance');if(adv)adv.onclick=async()=>{
    const r=data.rounds.find(x=>x.id===ui.roundId);
    const count=+$('#advanceCount').value;
    const ties=ui.tieChoices[r.id]||[];
    try{
      await rpc('admin_advance',{p_token:currentAdminToken,p_round_id:r.id,p_count:count,p_tie_choices:ties});
      ui.tieChoices[r.id]=[];
      await renderAdmin();
    }catch(e){alert(e.message)}
  };
}
