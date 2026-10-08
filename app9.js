// Safe copy override for the #071 replacement round. No MutationObserver, so no render loop.
(function(){
  const shellCore = shell;
  shell = function(body,label='CONTEST PORTAL'){
    try{
      const r = typeof openRound==='function' ? openRound() : null;
      if(r && r.id==='r2r'){
        body = body
          .replace('All 14 are already in the calendar. Choose the 5 strongest candidates for the premium Cover and Centerfold spots.',
            'The other 13 calendar winners are already locked and will not change. Entry #071 was disqualified for a rule issue. Review the eligible cars below and select exactly ONE car to fill the single open 14th calendar spot. The Top 5 vote will happen separately after this replacement round.')
          .replace('WELCOME '+esc((currentJudge?.name||'').toUpperCase()), 'FINAL CALENDAR SPOT REVOTE')
          .replace('<div class="pill">0/1</div>', '<div class="pill">SELECT 1</div>')
          .replace('<div class="pill">1/1</div>', '<div class="pill">SELECT 1</div>')
          .replace('Review Ballot', 'Review My Replacement Vote');
      }
    }catch(e){}
    return shellCore(body,label);
  };
})();
