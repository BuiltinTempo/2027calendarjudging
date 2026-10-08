function ballotVoteCount(ballot,round,photoId){
  const payload=ballot.payload||{};
  if(round.type==='batches'){
    return Object.values(payload.groups||{}).some(arr=>(arr||[]).includes(photoId))?1:0;
  }
  return (payload.choices||[]).includes(photoId)?1:0;
}
function adminTotals(round){
  const totals=Object.fromEntries(round.photoIds.map(id=>[id,0]));
  (data._adminBallots||[]).filter(b=>b.round_id===round.id&&b.finalized).forEach(b=>{
    round.photoIds.forEach(id=>totals[id]=(totals[id]||0)+ballotVoteCount(b,round,id));
  });
  return totals;
}
function advancementPlan(round,count){
  const totals=adminTotals(round);
  const rank=[...round.photoIds].sort((a,b)=>(totals[b]||0)-(totals[a]||0)||String(a).localeCompare(String(b)));
  if(count<=0||count>=rank.length)return{rank,totals,auto:rank.slice(0,count),tie:[],needed:0,hasTie:false};
  const cutoff=totals[rank[count-1]]||0;
  const above=rank.filter(id=>(totals[id]||0)>cutoff);
  const tied=rank.filter(id=>(totals[id]||0)===cutoff);
  const needed=count-above.length;
  return {rank,totals,auto:above,tie:tied,needed,hasTie:tied.length>needed&&needed>0};
}

async function loadAdmin(){
  const a=await rpc('admin_get',{p_token:currentAdminToken});
  const c=a.contest||{};
  data.photos=(a.photos||[]).map(normalizePhoto);
  data.rounds=(a.rounds||[]).map(normalizeRound);
  data.judges=(a.judges||[]).map(j=>({id:j.id,name:j.name,token:j.token}));
  data._adminBallots=a.ballots||[];
  data.publicVotes=a.popularity||{};
  data.publicOpen=c.public_open!==false;
  data.calendarWinners=c.calendar_winners||[];
  data.calendarSaves=c.calendar_saves||[];
  data.prizeFinalists=c.prize_finalists||[];
  data.tieBreaks=c.tie_breaks||{};
  data.peoplesChoice=c.peoples_choice||{open:false};
  data._finalVotes=a.finalVotes||[];
  data.judgeVotes={};data.finalized={};
  (a.ballots||[]).forEach(b=>{
    data.judgeVotes[`${b.judge_id}:${b.round_id}`]=b.payload||{};
    if(b.finalized)data.finalized[`${b.judge_id}:${b.round_id}`]=true;
  });
}

function progressFor(j,r){
  const v=data.judgeVotes[`${j.id}:${r.id}`]||{};
  if(r.type==='batches'){const gs=groups(r);return[Object.keys(v.groups||{}).length,gs.length]}
  if(r.type==='peoples')return[(v.cover?1:0)+(v.centerfold?1:0),2];
  return[(v.choices||[]).length,r.maxVotes||1];
}
function combinedTotals(scope){
  const out=Object.fromEntries(data.prizeFinalists.map(id=>[id,0]));
  (data._finalVotes||[]).filter(v=>v.vote_scope===scope).forEach(v=>out[v.photo_id]=(out[v.photo_id]||0)+1);
  return out;
}
