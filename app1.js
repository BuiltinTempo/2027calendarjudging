const SUPABASE_URL = "https://mnzegijkceapujodqsar.supabase.co";
const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

let data={
  title:'2027 Calendar Contest',
  photos:[],
  rounds:[],
  judges:[],
  judgeVotes:{},
  finalized:{},
  activity:{},
  publicVotes:{},
  publicVoters:{},
  publicOpen:true,
  calendarWinners:[],
  prizeFinalists:[],
  tieBreaks:{},
  peoplesChoice:{open:false}
};
let ui={tab:'progress',roundId:'r1',group:0,publicFilter:'active',review:false,tieChoices:{}};
let currentJudge=null;
let currentJudgeToken=null;
let currentAdminToken=null;
let publicVoterId=null;
let publicVoterState={popularity:[],cover:null,centerfold:null};

async function rpc(fn,args={}){
  const res=await fetch(`${SUPABASE_URL}/functions/v1/contest-api`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fn,args})
  });
  const txt=await res.text();
  if(!res.ok){
    let msg=txt;
    try{msg=JSON.parse(txt).message||txt}catch{}
    throw new Error(msg);
  }
  if(!txt)return null;
  try{return JSON.parse(txt)}catch{return txt}
}

function shell(body,label='CONTEST PORTAL'){
  return `<div class="app">
    <header class="top">
      <div><div class="eyebrow">${label}</div><h1>${esc(data.title)}</h1></div>
      <div class="pill">${data.calendarWinners.length===14?'14 Calendar Winners':'102 Master Entries'}</div>
    </header>${body}
  </div>`;
}
function pm(){return Object.fromEntries(data.photos.map(p=>[p.id,p]))}
function openRound(){return data.rounds.find(r=>r.status==='open')}
function groups(r){
  let g=[];
  const per=r.photosPerGroup||r.config?.photosPerGroup||8;
  for(let i=0;i<r.photoIds.length;i+=per)g.push(r.photoIds.slice(i,i+per));
  return g;
}
function normalizePhoto(p){
  return {
    id:p.id,
    entryNumber:String(p.entry_number??p.entryNumber??'').padStart(3,'0'),
    image:(p.image_path||p.image||'').startsWith('photos/') ? `${SUPABASE_URL}/storage/v1/object/public/contest-photos/${(p.image_path||p.image).split('/').pop()}` : (p.image_path??p.image),
    active:p.active!==false
  };
}
function normalizeRound(r){
  const c=r.config||{};
  return {
    id:r.id,name:r.name,type:r.type,status:r.status,
    photoIds:r.photo_ids??r.photoIds??[],
    photosPerGroup:c.photosPerGroup??r.photosPerGroup,
    votesPerGroup:c.votesPerGroup??r.votesPerGroup,
    maxVotes:c.maxVotes??r.maxVotes
  };
}

function card(p,selected=false,publicMode=false){
  const calWinner=data.calendarWinners.includes(p.id);
  const prize=data.prizeFinalists.includes(p.id);
  const eliminated=publicMode && !p.active && !calWinner;
  return `<article class="card ${selected?'selected':''} ${eliminated?'eliminated':''} ${calWinner?'calendarwinner':''}" data-photo="${p.id}">
    <button class="photo" ${eliminated?'disabled':''}>
      <img src="${p.image}" loading="lazy">
      <span class="entry">Entry #${p.entryNumber}</span>
      ${calWinner?`<span class="winnerbadge">CALENDAR WINNER</span>`:''}
      ${prize?`<span class="prizebadge">TOP 5 FINALIST</span>`:''}
      ${eliminated?`<span class="outbadge">ELIMINATED</span>`:`<span class="voteheart">${selected?'♥':'♡'}</span>`}
    </button>
    <button type="button" class="zoomopen ghost">View Full Size</button>
  </article>`;
}

function bindZoom(){
  $$('.zoomopen').forEach(b=>b.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const img=b.closest('.card').querySelector('img');
    const d=document.createElement('div');
    d.className='lightbox';
    d.innerHTML=`<button aria-label="Close">×</button><img src="${img.src}">`;
    d.onclick=()=>d.remove();
    document.body.appendChild(d);
  });
  $$('.result img,.reviewitem img,.tiecard img').forEach(img=>img.ondblclick=()=>{
    const d=document.createElement('div');
    d.className='lightbox';
    d.innerHTML=`<button aria-label="Close">×</button><img src="${img.src}">`;
    d.onclick=()=>d.remove();
    document.body.appendChild(d);
  });
}
