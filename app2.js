function applyPublicState(s){
  const c=s.contest||{};
  data.photos=(s.photos||[]).map(normalizePhoto);
  data.rounds=(s.rounds||[]).map(normalizeRound);
  data.publicVotes=s.popularity||{};
  data.publicOpen=c.public_open!==false;
  data.calendarWinners=c.calendar_winners||[];
  data.prizeFinalists=c.prize_finalists||[];
  data.tieBreaks=c.tie_breaks||{};
  data.peoplesChoice=c.peoples_choice||{open:false};
  data._coverTotals=s.coverTotals||{};
  data._centerfoldTotals=s.centerfoldTotals||{};
}

async function loadPublic(){
  const [s,v]=await Promise.all([
    rpc('get_public_state'),
    rpc('get_public_voter_state',{p_voter_id:publicVoterId})
  ]);
  applyPublicState(s);
  publicVoterState=v||{popularity:[],cover:null,centerfold:null};
}

async function renderPublic(){
  $('#root').innerHTML=shell(`<div class="empty"><h2>Loading voting...</h2></div>`,'PUBLIC CALENDAR VOTING');
  try{await loadPublic()}catch(e){return showError(e)}
  const winners=data.calendarWinners.map(id=>pm()[id]).filter(Boolean);
  const active=data.photos.filter(p=>p.active);
  const eliminated=data.photos.filter(p=>!p.active&&!data.calendarWinners.includes(p.id));
  const top5=data.prizeFinalists.length===5 && data.peoplesChoice?.open;

  if(top5){
    const coverPick=publicVoterState.cover;
    const centerPick=publicVoterState.centerfold;
    let body=`<div class="hero">
      <div><div class="eyebrow">PEOPLE’S CHOICE FINAL</div><h2>Choose the Cover & Centerfold</h2>
      <p>The Top 5 are locked. Your Cover vote and Centerfold vote each count as one vote in the same final totals as the judges.</p></div>
      <div class="pill">TOP 5 FINALISTS</div>
    </div>
    <div class="milestone"><b>🏆 All 14 Calendar Winners are already secured.</b><div class="muted">This final only decides the two premium prize spots.</div></div>
    <section class="panel"><h3>Vote for the Cover</h3><div class="gallery">
      ${data.prizeFinalists.map(id=>card(pm()[id],coverPick===id,true)).join('')}
    </div><div class="notice">${coverPick?`Your Cover vote: Entry #${pm()[coverPick]?.entryNumber}`:'Choose one finalist.'}</div></section>
    <section class="panel"><h3>Vote for the Centerfold</h3><div class="gallery" id="centerGallery">
      ${data.prizeFinalists.map(id=>{
        const p=pm()[id];
        return `<article class="card calendarwinner ${centerPick===id?'selected':''}" data-center="${id}">
          <button class="photo"><img src="${p.image}"><span class="entry">Entry #${p.entryNumber}</span><span class="prizebadge">TOP 5 FINALIST</span><span class="voteheart">${centerPick===id?'♥':'♡'}</span></button>
          <button type="button" class="zoomopen ghost">View Full Size</button>
        </article>`;
      }).join('')}
    </div><div class="notice">${centerPick?`Your Centerfold vote: Entry #${pm()[centerPick]?.entryNumber}`:'Choose one finalist.'}</div></section>
    <section class="panel"><h3>The 14 Calendar Winners</h3><div class="gallery">${winners.map(p=>card(p,false,true)).join('')}</div></section>`;
    $('#root').innerHTML=shell(body,'PUBLIC CALENDAR VOTING');

    $$('section:nth-of-type(1) .card[data-photo] .photo').forEach(b=>b.onclick=async()=>{
      const id=b.closest('.card').dataset.photo;
      try{
        await rpc('public_set_final_vote',{p_voter_id:publicVoterId,p_scope:'cover',p_photo_id:id});
        await renderPublic();
      }catch(e){alert(e.message)}
    });
    $$('[data-center] .photo').forEach(b=>b.onclick=async()=>{
      const id=b.closest('[data-center]').dataset.center;
      try{
        await rpc('public_set_final_vote',{p_voter_id:publicVoterId,p_scope:'centerfold',p_photo_id:id});
        await renderPublic();
      }catch(e){alert(e.message)}
    });
    bindZoom();
    return;
  }

  const winnerMode=data.calendarWinners.length===14;
  const visible=ui.publicFilter==='all'?data.photos:ui.publicFilter==='eliminated'?eliminated:(winnerMode?winners:active);
  const voted=publicVoterState.popularity||[];

  let body=`<div class="hero"><div><div class="eyebrow">COMMUNITY CHOICE</div>
    <h2>${winnerMode?'Meet the 14 Calendar Winners':'Vote for your favorites'}</h2>
    <p>${winnerMode?'These 14 are officially in the calendar. Community voting remains open as a popularity signal while the Top 5 is selected.':'Public votes are a popularity signal only. Judges control advancement through the Top 5.'}</p>
    </div><div class="pill">${winnerMode?'14 spots secured':active.length+' still in'}</div></div>`;
  if(winnerMode)body+=`<div class="milestone"><b>🏆 CALENDAR LINEUP LOCKED</b><div class="muted">These 14 are officially in the calendar.</div></div>`;
  body+=`<div class="publicfilters">
    <button data-pfilter="active" class="${ui.publicFilter==='active'?'active':''}">${winnerMode?'Calendar Winners (14)':'Still In ('+active.length+')'}</button>
    <button data-pfilter="all" class="${ui.publicFilter==='all'?'active':''}">All (${data.photos.length})</button>
    <button data-pfilter="eliminated" class="${ui.publicFilter==='eliminated'?'active':''}">Eliminated (${eliminated.length})</button>
  </div><div class="gallery">${visible.map(p=>card(p,voted.includes(p.id),true)).join('')}</div>`;
  $('#root').innerHTML=shell(body,'PUBLIC CALENDAR VOTING');
  $$('[data-pfilter]').forEach(b=>b.onclick=()=>{ui.publicFilter=b.dataset.pfilter;renderPublic()});
  if(data.publicOpen){
    $$('.card:not(.eliminated)[data-photo] .photo').forEach(b=>b.onclick=async()=>{
      const id=b.closest('.card').dataset.photo;
      try{
        await rpc('public_toggle_popularity',{p_voter_id:publicVoterId,p_photo_id:id});
        await renderPublic();
      }catch(e){alert(e.message)}
    });
  }
  bindZoom();
}
