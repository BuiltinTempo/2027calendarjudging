// Calendar correction layer: preserve 13 winners, vote only the vacated #071 spot, then revote Top 5.
(function(){
  const originalAdvancementPlan = advancementPlan;
  advancementPlan = function(r,count){
    if(r?.id==='r2r') count=1;
    if(r?.id==='r3r') count=5;
    return originalAdvancementPlan(r,count);
  };

  function fixedCount(round){
    if(round?.id==='r2r') return 1;
    if(round?.id==='r3r') return 5;
    if(round?.id==='r2') return 14;
    if(round?.id==='r3') return 5;
    return +($('#advanceCount')?.value||36);
  }

  const baseBindAdmin = bindAdmin;
  bindAdmin = function(){
    baseBindAdmin();
    const r=data.rounds.find(x=>x.id===ui.roundId)||openRound();
    if(!r)return;

    const input=$('#advanceCount');
    const adv=$('#advance');

    if(r.id==='r2r'){
      if(input){input.value='1';input.readOnly=true;}
      if(adv){
        adv.textContent='Lock Replacement as 14th Calendar Winner';
        adv.onclick=async()=>{
          const ties=ui.tieChoices[r.id]||[];
          try{
            await rpc('admin_advance',{p_token:currentAdminToken,p_round_id:r.id,p_count:1,p_tie_choices:ties});
            ui.tieChoices[r.id]=[];
            await renderAdmin();
          }catch(e){alert(e.message)}
        };
      }
    }

    if(r.id==='r3r'){
      if(input){input.value='5';input.readOnly=true;}
      if(adv){
        adv.textContent='Lock New Top 5 & Open People’s Choice';
        adv.onclick=async()=>{
          const ties=ui.tieChoices[r.id]||[];
          try{
            await rpc('admin_advance',{p_token:currentAdminToken,p_round_id:r.id,p_count:5,p_tie_choices:ties});
            ui.tieChoices[r.id]=[];
            await renderAdmin();
          }catch(e){alert(e.message)}
        };
      }
    }
  };

  const originalRenderAdmin = renderAdmin;
  renderAdmin = async function(){
    await originalRenderAdmin();
    const r=data.rounds.find(x=>x.id===ui.roundId)||openRound();
    if(!r)return;

    if(r.id==='r2r'){
      const adv=$('#advance');
      const panel=adv?.closest('.panel');
      if(panel){
        const h=panel.querySelector('h3');
        if(h)h.textContent='Fill ONLY the vacated #071 calendar spot';
        const n=panel.querySelector('.notice');
        if(n)n.textContent=data.judges.every(j=>data.finalized[`${j.id}:${r.id}`])
          ? 'All judges are complete. Approving this result adds ONE replacement to the 13 locked winners. No other calendar winner changes.'
          : 'The existing 13 valid calendar winners remain locked. Judges are voting only on the ONE replacement for #071.';
      }
    }

    if(r.id==='r3r'){
      const adv=$('#advance');
      const panel=adv?.closest('.panel');
      if(panel){
        const h=panel.querySelector('h3');
        if(h)h.textContent='Corrected Top 5 — review & approve';
      }
    }
  };

  const originalRenderJudge = renderJudge;
  renderJudge = async function(){
    await originalRenderJudge();
    const r=openRound();
    if(!r)return;

    if(r.id==='r2r'){
      const hero=$('.hero');
      if(hero){
        const eyebrow=hero.querySelector('.eyebrow');
        if(eyebrow)eyebrow.textContent='FINAL CALENDAR SPOT REVOTE';
        const h2=hero.querySelector('h2');
        if(h2)h2.textContent='Choose ONE car to replace disqualified Entry #071';
        const p=hero.querySelector('p');
        if(p)p.textContent='The other 13 calendar winners are already locked and will not change. Entry #071 was disqualified for a rule issue. Review the eligible cars below and select exactly ONE car to fill the single open 14th calendar spot. The Top 5 vote will happen separately after this replacement round.';
        const pill=hero.querySelector('.pill');
        if(pill)pill.textContent='SELECT 1';
      }
      const sticky=$('.sticky');
      if(sticky){
        const status=sticky.querySelector('div');
        if(status){
          const current=(data.judgeVotes[`${currentJudge.id}:${r.id}`]?.choices||[]).length;
          status.innerHTML=`<b>${current}/1</b> selected <span class="muted">· Autosaved</span>`;
        }
        const review=sticky.querySelector('#review');
        if(review)review.textContent='Review My Replacement Vote';
      }
    }

    if(r.id==='r3r'){
      const hero=$('.hero');
      if(hero){
        const eyebrow=hero.querySelector('.eyebrow');
        if(eyebrow)eyebrow.textContent='TOP 5 REVOTE — CORRECTED CALENDAR 14';
        const p=hero.querySelector('p');
        if(p)p.textContent='The corrected Calendar 14 is complete. Choose exactly 5 finalists for the Cover and Centerfold round.';
      }
    }
  };
})();
