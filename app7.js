// Admin-only optional Calendar Save controls for the Semifinal.
// Up to 4 semifinal photos can be protected into the Top 14 without changing
// judge/public vote totals or Top 5 voting.

const renderAdminCore = renderAdmin;
renderAdmin = async function renderAdminWithCalendarSaves(){
  await renderAdminCore();
  if(!currentAdminToken)return;

  const semifinal=data.rounds.find(r=>r.id==='r2');
  if(!semifinal || semifinal.status!=='open')return;

  try{
    const snapshot=await rpc('admin_get',{p_token:currentAdminToken});
    data.calendarSaves=snapshot?.contest?.calendar_saves||[];
  }catch(e){
    console.error('Unable to load calendar saves',e);
    return;
  }

  injectCalendarSavePanel(semifinal);
};

function injectCalendarSavePanel(semifinal){
  const roundsEl=$('.rounds');
  if(!roundsEl || $('#calendarSavePanel'))return;

  const semifinalPhotos=(semifinal.photoIds||[]).map(id=>pm()[id]).filter(Boolean);
  const used=(data.calendarSaves||[]).length;
  const remaining=4-used;
  const cards=semifinalPhotos.map(p=>calendarSaveCard(p)).join('');

  roundsEl.insertAdjacentHTML('afterend',`
    <section class="panel" id="calendarSavePanel" style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <div class="eyebrow">SEMIFINAL EDITORIAL SAFETY NET</div>
          <h3 style="margin-bottom:6px">Protect Photos Into the Top 14</h3>
          <div class="muted">Use up to 4 saves from the 36 semifinalists. You do not have to use all four. Every saved photo is guaranteed a Top 14 calendar spot; the remaining Top 14 spots are filled by the normal judge ranking and tie-break process.</div>
        </div>
        <div class="pill" id="calendarSaveCount">${used} of 4 used · ${remaining} remaining</div>
      </div>
      <div class="reviewgrid" style="margin-top:14px" id="calendarSaveGrid">${cards}</div>
    </section>`);

  bindCalendarSaveButtons();
}

function calendarSaveCard(p){
  const saved=(data.calendarSaves||[]).includes(p.id);
  const full=(data.calendarSaves||[]).length>=4;
  return `<div class="reviewitem" data-save-card="${p.id}" style="position:relative">
    <img src="${p.image}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px">
    <div class="row" style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <b>#${p.entryNumber}</b>
      <button type="button" class="${saved?'primary':'ghost'}" data-calendar-save="${p.id}" ${!saved&&full?'disabled':''}>
        ${saved?'🔒 Saved to Top 14':'Save to Top 14'}
      </button>
    </div>
    ${saved?'<div class="winnerbadge" style="position:absolute;top:10px;left:10px">TOP 14 SAVE</div>':''}
  </div>`;
}

function refreshCalendarSavePanel(){
  const count=$('#calendarSaveCount');
  const grid=$('#calendarSaveGrid');
  const semifinal=data.rounds.find(r=>r.id==='r2');
  const used=(data.calendarSaves||[]).length;
  if(count)count.textContent=`${used} of 4 used · ${4-used} remaining`;
  if(grid&&semifinal){
    grid.innerHTML=(semifinal.photoIds||[]).map(id=>pm()[id]).filter(Boolean).map(p=>calendarSaveCard(p)).join('');
    bindCalendarSaveButtons();
  }
}

function bindCalendarSaveButtons(){
  $$('[data-calendar-save]').forEach(btn=>btn.onclick=async e=>{
    e.preventDefault();
    e.stopPropagation();
    if(btn.disabled)return;

    const id=btn.dataset.calendarSave;
    btn.disabled=true;
    try{
      const result=await rpc('admin_toggle_calendar_save',{
        p_token:currentAdminToken,
        p_photo_id:id
      });
      data.calendarSaves=result?.calendar_saves||[];
      refreshCalendarSavePanel();
    }catch(err){
      btn.disabled=false;
      alert(err.message);
    }
  });
}
