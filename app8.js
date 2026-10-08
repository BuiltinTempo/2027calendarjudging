// Calendar correction hotfix: semifinal replacement rerun + fresh Top 5 vote.
(function(){
  const originalAdvancementPlan = advancementPlan;
  advancementPlan = function(r,count){
    if(r?.id==='r2r') count=1;
    if(r?.id==='r3r') count=5;
    return originalAdvancementPlan(r,count);
  };

  function rerunCount(round){
    if(round?.id==='r2r') return 1;
    if(round?.id==='r3r') return 5;
    if(round?.id==='r2') return 14;
    if(round?.id==='r3') return 5;
    return +($('#advanceCount')?.value||36);
  }

  bindAdmin = function(){
    $$('[data-tab]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;renderAdmin()});
    $$('[data-round]').forEach(b=>b.onclick=()=>{ui.roundId=b.dataset.round;renderAdmin()});
    $$('[data-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copy));
    $$('[data-tie]').forEach(c=>c.onclick=()=>{
      const id=c.dataset.tie,round=data.rounds.find(r=>r.id===ui.roundId);
      const count=rerunCount(round);
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
      const count=rerunCount(r);
      const ties=ui.tieChoices[r.id]||[];
      try{
        await rpc('admin_advance',{p_token:currentAdminToken,p_round_id:r.id,p_count:count,p_tie_choices:ties});
        ui.tieChoices[r.id]=[];
        await renderAdmin();
      }catch(e){alert(e.message)}
    };
  };

  const originalRenderAdmin = renderAdmin;
  renderAdmin = async function(){
    await originalRenderAdmin();
    const r=data.rounds.find(x=>x.id===ui.roundId)||openRound();
    if(!r)return;
    const input=$('#advanceCount');
    const adv=$('#advance');
    if(r.id==='r2r'){
      if(input){input.value='1';input.readOnly=true;}
      if(adv)adv.textContent='Lock Replacement Calendar Winner & Open Top 5 Revote';
      const panel=adv?.closest('.panel');
      if(panel){
        const h=panel.querySelector('h3');if(h)h.textContent='Replacement spot — review & approve';
        const n=panel.querySelector('.notice');if(n&&data.judges.every(j=>data.finalized[`${j.id}:${r.id}`]))n.textContent='All judges are complete. Approve the winning replacement to restore the Calendar 14 and open a fresh Top 5 vote.';
      }
    }
    if(r.id==='r3r'){
      if(input){input.value='5';input.readOnly=true;}
      if(adv)adv.textContent='Lock New Top 5 & Open People’s Choice';
      const panel=adv?.closest('.panel');
      if(panel){
        const h=panel.querySelector('h3');if(h)h.textContent='Corrected Top 5 — review & approve';
      }
    }
  };

  const originalRenderJudge = renderJudge;
  renderJudge = async function(){
    await originalRenderJudge();
    const r=openRound();
    if(!r)return;
    const hero=$('.hero');
    if(r.id==='r2r'&&hero){
      const eyebrow=hero.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='SEMIFINAL RERUN — REPLACEMENT SPOT';
      const p=hero.querySelector('p');if(p)p.textContent='Entry #071 was removed for a rule issue. Choose the single strongest eligible car from the original 2–3 vote group to fill the final calendar spot.';
    }
    if(r.id==='r3r'&&hero){
      const eyebrow=hero.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='TOP 5 REVOTE — CORRECTED CALENDAR 14';
      const p=hero.querySelector('p');if(p)p.textContent='The calendar lineup has been corrected. Choose the 5 strongest candidates for the Cover and Centerfold finalist group.';
    }
  };
})();
