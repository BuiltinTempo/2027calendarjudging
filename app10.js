// Admin-only force advance for the r2r replacement round when one or more judges have not finalized.
(function(){
  const previousRenderAdmin = renderAdmin;

  renderAdmin = async function(){
    await previousRenderAdmin();

    const r = data.rounds.find(x=>x.id===ui.roundId) || openRound();
    if(!r || r.id!=='r2r' || ui.tab!=='results') return;

    const completed = data.judges.filter(j=>data.finalized[`${j.id}:${r.id}`]).length;
    const total = data.judges.length;
    const allDone = completed===total;
    if(allDone) return;

    const plan = advancementPlan(r,1);
    const choice = ui.tieChoices[r.id] || [];
    const normalPanel = $('#advance')?.closest('.panel');
    if(!normalPanel) return;

    // Keep tie cards selectable even though normal advancement remains disabled.
    $$('[data-tie]').forEach(c=>{
      c.onclick=()=>{
        const id=c.dataset.tie;
        let arr=[...(ui.tieChoices[r.id]||[])];
        if(arr.includes(id)) arr=[];
        else arr=[id];
        ui.tieChoices[r.id]=arr;
        $$('[data-tie]').forEach(x=>x.classList.toggle('selected',arr.includes(x.dataset.tie)));
        const force=$('#forceAdvanceR2r');
        if(force) force.disabled=plan.hasTie && arr.length!==1;
      };
    });

    const forceSection=document.createElement('section');
    forceSection.className='panel tiebreak';
    forceSection.innerHTML=`
      <h3>Admin Override — Force Advance</h3>
      <div class="notice">
        <b>${completed}/${total} judges finalized.</b> This override counts only finalized ballots and permanently ignores unfinished ballots for this replacement round.
        ${plan.hasTie?` There is currently a tie for the replacement spot. Select exactly one tied entry above as the admin tie-break.`:` The finalized ballots currently produce a single leader.`}
      </div>
      <button class="primary" id="forceAdvanceR2r" ${plan.hasTie&&choice.length!==1?'disabled':''}>Force Advance With ${completed}/${total} Votes</button>
    `;
    normalPanel.insertAdjacentElement('afterend',forceSection);

    const force=$('#forceAdvanceR2r');
    force.onclick=async()=>{
      const ties=ui.tieChoices[r.id]||[];
      if(plan.hasTie && ties.length!==1){
        alert('Select exactly one tied entry before force advancing.');
        return;
      }
      const selectedLabel=plan.hasTie
        ? `Entry #${pm()[ties[0]]?.entryNumber||ties[0]}`
        : `the current vote leader`;
      const ok=confirm(`Force advance using only ${completed} of ${total} finalized ballots?\n\n${selectedLabel} will fill the vacated #071 calendar spot. The unfinished judge ballot will not count, r2r will close, and the corrected Top 5 round will open.`);
      if(!ok)return;
      try{
        force.disabled=true;
        force.textContent='Advancing...';
        await rpc('admin_force_advance_r2r',{
          p_token:currentAdminToken,
          p_tie_choices:ties
        });
        ui.tieChoices[r.id]=[];
        ui.roundId='r3r';
        await renderAdmin();
      }catch(e){
        alert(e.message);
        force.disabled=false;
        force.textContent=`Force Advance With ${completed}/${total} Votes`;
      }
    };
  };
})();
