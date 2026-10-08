// Force-clear replacement-vote instructions for the #071 DQ rerun.
(function(){
  function applyReplacementCopy(){
    try{
      const r=typeof openRound==='function'?openRound():null;
      if(!r||r.id!=='r2r')return;
      const hero=document.querySelector('.hero');
      if(!hero)return;
      const eyebrow=hero.querySelector('.eyebrow');
      if(eyebrow)eyebrow.textContent='FINAL CALENDAR SPOT REVOTE';
      const h2=hero.querySelector('h2');
      if(h2)h2.textContent='Choose ONE car to replace disqualified Entry #071';
      const p=hero.querySelector('p');
      if(p)p.innerHTML='<strong>How to vote:</strong> The other 13 calendar winners are already locked and will not change. Entry #071 was disqualified for a rule issue. Review the eligible cars below and select <strong>exactly ONE</strong> car. Your selection is your vote for the single open 14th calendar spot. After all judges vote, the winning replacement will complete the Calendar 14. The Top 5 vote will happen separately after this round.';
      const pill=hero.querySelector('.pill');
      if(pill)pill.textContent='SELECT 1';
      const sticky=document.querySelector('.sticky');
      if(sticky){
        const status=sticky.querySelector('div');
        if(status&&/selected/i.test(status.textContent||'')){
          const n=((status.textContent||'').match(/\d+/)||['0'])[0];
          status.innerHTML='<b>'+n+'/1</b> selected <span class="muted">· Select exactly one replacement</span>';
        }
        const review=sticky.querySelector('#review');
        if(review)review.textContent='Review My Replacement Vote';
      }
    }catch(e){}
  }
  const observer=new MutationObserver(()=>applyReplacementCopy());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',()=>setTimeout(applyReplacementCopy,50));
  setTimeout(applyReplacementCopy,250);
})();
