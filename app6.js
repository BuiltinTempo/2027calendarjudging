function renderAdminLogin(err=''){
  $('#root').innerHTML=`<div class="app"><header class="top"><div><div class="eyebrow">ADMIN CONTROL</div><h1>2027 Calendar Contest</h1></div></header>
  <div class="empty"><h2>Admin access</h2><p class="muted">Enter the private admin key for this contest.</p>
  ${err?`<div class="notice">${esc(err)}</div>`:''}
  <input id="adminKey" type="password" placeholder="Admin key" style="width:min(520px,100%);padding:13px;background:#0b0e15;color:#fff;border:1px solid #343b51;border-radius:10px">
  <div style="margin-top:12px"><button class="primary" id="adminLogin">Open Dashboard</button></div></div></div>`;
  $('#adminLogin').onclick=async()=>{
    const k=$('#adminKey').value.trim();if(!k)return;
    currentAdminToken=k;sessionStorage.setItem('calendar-admin-token',k);await renderAdmin();
  };
}

function showError(e,label='CONTEST PORTAL'){
  $('#root').innerHTML=shell(`<div class="empty"><h2>Could not load the contest.</h2><p class="muted">${esc(e.message||e)}</p><button class="ghost" onclick="location.reload()">Retry</button></div>`,label);
}

async function route(){
  const u=new URL(location.href);
  publicVoterId=localStorage.getItem('calendar-public-voter');
  if(!publicVoterId){
    publicVoterId='v-'+crypto.randomUUID();
    localStorage.setItem('calendar-public-voter',publicVoterId);
  }
  if(u.searchParams.get('public')==='1')return renderPublic();
  const jt=u.searchParams.get('judge');
  if(jt){currentJudgeToken=jt;return renderJudge()}
  currentAdminToken=sessionStorage.getItem('calendar-admin-token');
  return renderAdmin();
}
