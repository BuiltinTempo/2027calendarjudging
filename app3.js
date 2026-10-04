function judgePayloadFor(roundId){
  return data.judgeVotes[`${currentJudge.id}:${roundId}`]||{};
}
async function saveJudge(roundId,payload,finalize=false){
  await rpc('judge_save',{p_token:currentJudgeToken,p_round_id:roundId,p_payload:payload,p_finalize:finalize});
}

async function loadJudge(){
  const s=await rpc('judge_load',{p_token:currentJudgeToken});
  currentJudge=s.judge;
  const c=s.contest||{};
  const r=s.round?normalizeRound(s.round):null;
  data.calendarWinners=c.calendar_winners||[];
  data.prizeFinalists=c.prize_finalists||[];
  data.peoplesChoice=c.peoples_choice||{open:false};
  data.photos=(s.photos||[]).map(normalizePhoto);
  data.rounds=r?[r]:[];
  data.judges=currentJudge?[currentJudge]:[];
  if(r){
    const key=`${currentJudge.id}:${r.id}`;
    const payload=s.ballot?.payload||{};
    data.judgeVotes[key]=payload;
    if(s.ballot?.finalized)data.finalized[key]=true;
  }
}

async function renderJudge(){
  $('#root').innerHTML=shell(`<div class="empty"><h2>Loading your ballot...</h2></div>`,'PRIVATE JUDGE PORTAL');
  try{await loadJudge()}catch(e){return showError(e,'PRIVATE JUDGE PORTAL')}
  const r=openRound();
  if(!r){
    $('#root').innerHTML=shell(`<div class="empty"><h2>No judge stage is currently open.</h2><p class="muted">Your completed work is saved.</p></div>`,'PRIVATE JUDGE PORTAL');
    return;
  }
  const key=`${currentJudge.id}:${r.id}`;
  let v=data.judgeVotes[key]||{};
  if(data.finalized[key]){
    $('#root').innerHTML=shell(`<div class="empty"><h2>${esc(currentJudge.name)}, your ${r.name} ballot is locked.</h2><p class="muted">Waiting for admin approval of the next stage.</p></div>`,'PRIVATE JUDGE PORTAL');
    return;
  }

  if(r.type==='peoples'){
    const cover=v.cover||null, center=v.centerfold||null;
    if(ui.review){
      $('#root').innerHTML=shell(`<div class="hero"><div><div class="eyebrow">FINAL REVIEW</div><h2>Review Prize Ballot</h2></div></div>
      <section class="panel"><h3>Cover</h3><div class="reviewgrid">${cover?reviewCard(cover):''}</div></section>
      <section class="panel"><h3>Centerfold</h3><div class="reviewgrid">${center?reviewCard(center):''}</div></section>
      <div class="sticky"><button class="ghost" id="back">Change Votes</button><button class="primary" id="submit">Submit Final Ballot</button></div>`,'PRIVATE JUDGE PORTAL');
      $('#back').onclick=()=>{ui.review=false;renderJudge()};
      $('#submit').onclick=async()=>{
        try{await saveJudge(r.id,v,true);ui.review=false;await renderJudge()}catch(e){alert(e.message)}
      };
      bindZoom();return;
    }
    let body=`<div class="hero"><div><div class="eyebrow">TOP 5 PEOPLE’S CHOICE FINAL</div><h2>${esc(currentJudge.name)}, cast your prize votes</h2>
      <p>Your Cover and Centerfold votes each count as one vote in the same totals as the public.</p></div><div class="pill">TOP 5</div></div>
      <section class="panel"><h3>Your Cover Vote</h3><div class="gallery">
      ${data.prizeFinalists.map(id=>voteCard(id,cover===id,'cover')).join('')}</div></section>
      <section class="panel"><h3>Your Centerfold Vote</h3><div class="gallery">
      ${data.prizeFinalists.map(id=>voteCard(id,center===id,'center')).join('')}</div></section>
      <div class="sticky"><div>${cover&&center?'Both votes selected':'Select one Cover and one Centerfold vote'}</div>
      <button class="primary" id="review" ${cover&&center?'':'disabled'}>Review Ballot</button></div>`;
    $('#root').innerHTML=shell(body,'PRIVATE JUDGE PORTAL');
    $$('[data-jvote="cover"] .photo').forEach(b=>b.onclick=async()=>{
      v={...v,cover:b.closest('[data-id]').dataset.id};
      data.judgeVotes[key]=v;
      try{await saveJudge(r.id,v,false);await renderJudge()}catch(e){alert(e.message)}
    });
    $$('[data-jvote="center"] .photo').forEach(b=>b.onclick=async()=>{
      v={...v,centerfold:b.closest('[data-id]').dataset.id};
      data.judgeVotes[key]=v;
      try{await saveJudge(r.id,v,false);await renderJudge()}catch(e){alert(e.message)}
    });
    $('#review').onclick=()=>{ui.review=true;renderJudge()};
    bindZoom();return;
  }

  if(r.type==='batches'){
    const gs=groups(r), groupsSaved=v.groups||{}, drafts=v.drafts||{};
    const complete=Object.keys(groupsSaved).filter(k=>gs[Number(k)]).length;
    const flexible=r.id==='r1';
    const votesPer=r.votesPerGroup||2;
    if(ui.review || complete===gs.length){
      ui.review=true;
      let body=`<div class="hero"><div><div class="eyebrow">FINAL REVIEW</div><h2>${r.name} — Review Your Ballot</h2>
        <p>Review every group before locking this round.</p></div><div class="pill">${complete}/${gs.length} groups saved</div></div>
        <section class="panel">${gs.map((g,gi)=>{
          const ids=groupsSaved[gi]||[];
          return `<div class="reviewgroup"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div><b>Group ${gi+1}</b><div class="muted">${ids.length} selected</div></div><button class="ghost" data-edit="${gi}">Edit Group</button></div>
          <div class="reviewgrid" style="margin-top:10px">${ids.length?ids.map(reviewCard).join(''):`<div class="muted">No photos selected.</div>`}</div></div>`;
        }).join('')}</section><div class="sticky"><button class="primary" id="finalize">Submit Final Ballot</button></div>`;
      $('#root').innerHTML=shell(body,'PRIVATE JUDGE PORTAL');
      $$('[data-edit]').forEach(b=>b.onclick=async()=>{
        const gi=Number(b.dataset.edit);
        const ng={...(groupsSaved||{})}, nd={...(drafts||{})};
        nd[gi]=[...(ng[gi]||[])];delete ng[gi];
        v={...v,groups:ng,drafts:nd};data.judgeVotes[key]=v;
        ui.review=false;ui.group=gi;
        try{await saveJudge(r.id,v,false);await renderJudge()}catch(e){alert(e.message)}
      });
      $('#finalize').onclick=async()=>{
        try{await saveJudge(r.id,v,true);ui.review=false;await renderJudge()}catch(e){alert(e.message)}
      };
      bindZoom();return;
    }

    let first=gs.findIndex((_,i)=>!groupsSaved[i]);
    if(ui.group<0||ui.group>=gs.length||groupsSaved[ui.group])ui.group=first<0?0:first;
    const gi=ui.group, draft=[...(drafts[gi]||[])], pct=Math.round(complete/gs.length*100);
    let body=`<div class="hero"><div><div class="eyebrow">WELCOME ${esc(currentJudge.name.toUpperCase())}</div><h2>${r.name}</h2>
      <p>${flexible?'Keep anywhere from 0 to 8 photos in this group.':`Pick exactly ${votesPer} photos from this group.`} Progress saves automatically.</p></div>
      <div class="pill">${complete}/${gs.length} groups · ${pct}%</div></div>
      <section class="panel"><div class="bar"><span style="width:${pct}%"></span></div></section>
      <div class="hero" style="padding-top:10px"><div><h2 style="font-size:24px">Group ${gi+1}</h2></div><div class="pill">Group ${gi+1}/${gs.length}</div></div>
      <div class="gallery">${gs[gi].map(id=>card(pm()[id],draft.includes(id))).join('')}</div>
      <div class="sticky"><div><b>${draft.length}${flexible?'/8':'/'+votesPer}</b> selected <span class="muted">· Autosaved</span></div>
      <button class="primary" id="saveGroup" ${(!flexible&&draft.length!==votesPer)?'disabled':''}>Save Group & Continue</button></div>`;
    $('#root').innerHTML=shell(body,'PRIVATE JUDGE PORTAL');
    $$('.card[data-photo] .photo').forEach(b=>b.onclick=async()=>{
      const id=b.closest('.card').dataset.photo;
      let cur=[...((v.drafts||{})[gi]||[])];
      if(cur.includes(id))cur=cur.filter(x=>x!==id);
      else if(cur.length<(flexible?8:votesPer))cur.push(id);
      v={...v,groups:{...(v.groups||{})},drafts:{...(v.drafts||{}),[gi]:cur}};
      data.judgeVotes[key]=v;
      try{await saveJudge(r.id,v,false);await renderJudge()}catch(e){alert(e.message)}
    });
    $('#saveGroup').onclick=async()=>{
      const cur=[...((v.drafts||{})[gi]||[])];
      if(!flexible&&cur.length!==votesPer)return;
      const ng={...(v.groups||{}),[gi]:cur},nd={...(v.drafts||{})};delete nd[gi];
      v={...v,groups:ng,drafts:nd};data.judgeVotes[key]=v;
      if(Object.keys(ng).filter(k=>gs[Number(k)]).length===gs.length)ui.review=true;
      else{
        let next=gs.findIndex((_,i)=>i>gi&&!ng[i]);if(next<0)next=gs.findIndex((_,i)=>!ng[i]);ui.group=next;
      }
      try{await saveJudge(r.id,v,false);await renderJudge()}catch(e){alert(e.message)}
    };
    bindZoom();return;
  }

  const choices=v.choices||[],max=r.maxVotes||5;
  if(ui.review){
    $('#root').innerHTML=shell(`<div class="hero"><div><div class="eyebrow">FINAL REVIEW</div><h2>${r.name} — Review Your Ballot</h2></div></div>
    <section class="panel"><div class="reviewgrid">${choices.map(reviewCard).join('')}</div></section>
    <div class="sticky"><button class="ghost" id="back">Change Selections</button><button class="primary" id="finalize">Submit Final Ballot</button></div>`,'PRIVATE JUDGE PORTAL');
    $('#back').onclick=()=>{ui.review=false;renderJudge()};
    $('#finalize').onclick=async()=>{try{await saveJudge(r.id,v,true);ui.review=false;await renderJudge()}catch(e){alert(e.message)}};
    bindZoom();return;
  }
  $('#root').innerHTML=shell(`<div class="hero"><div><div class="eyebrow">WELCOME ${esc(currentJudge.name.toUpperCase())}</div><h2>${r.name}</h2>
    <p>All 14 are already in the calendar. Choose the 5 strongest candidates for the premium Cover and Centerfold spots.</p></div><div class="pill">${choices.length}/${max}</div></div>
    <div class="gallery">${r.photoIds.map(id=>card(pm()[id],choices.includes(id))).join('')}</div>
    <div class="sticky"><div><b>${choices.length}/${max}</b> selected</div><button class="primary" id="review" ${choices.length===max?'':'disabled'}>Review Ballot</button></div>`,'PRIVATE JUDGE PORTAL');
  $$('.card[data-photo] .photo').forEach(b=>b.onclick=async()=>{
    const id=b.closest('.card').dataset.photo;
    let arr=[...choices];
    if(arr.includes(id))arr=arr.filter(x=>x!==id);else if(arr.length<max)arr.push(id);
    v={...v,choices:arr};data.judgeVotes[key]=v;
    try{await saveJudge(r.id,v,false);await renderJudge()}catch(e){alert(e.message)}
  });
  $('#review').onclick=()=>{ui.review=true;renderJudge()};
  bindZoom();
}

function reviewCard(id){
  const p=pm()[id];
  return p?`<div class="reviewitem"><img src="${p.image}"><div class="row"><b>#${p.entryNumber}</b></div></div>`:'';
}
function voteCard(id,selected,kind){
  const p=pm()[id];
  return `<article class="card ${selected?'selected':''}" data-id="${id}" data-jvote="${kind}">
    <button class="photo"><img src="${p.image}"><span class="entry">Entry #${p.entryNumber}</span><span class="prizebadge">TOP 5 FINALIST</span><span class="voteheart">${selected?'♥':'♡'}</span></button>
    <button type="button" class="zoomopen ghost">View Full Size</button>
  </article>`;
}
