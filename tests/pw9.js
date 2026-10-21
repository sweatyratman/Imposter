const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();
for(const vw of [360,390,430]){
const p=await b.newPage({viewport:{width:vw,height:800}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('dialog',d=>d.accept());await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
// emulate a much wider display font than the fallback
await p.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent='h1,h2,h3,.bigname,.secret,.idname,.wordmark,.gameon,.vote-title,.role-title,.verdict-role{letter-spacing:.14em!important;font-family:"Arial Black",sans-serif!important}';document.head.appendChild(st)})});
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const check=async(where)=>{const bad=await p.evaluate(()=>Array.from(document.querySelectorAll('.secret,.idname,.bigname,.gameon,.vote-title,.role-title,.wordmark,.result-head h1,.after h1')).filter(e=>e.offsetParent&&e.scrollWidth>e.clientWidth+1).map(e=>e.className+':'+e.textContent.trim()));t(bad.length===0,`${vw}px ${where}: overflow ${bad.join(' | ')}`)};
await check('setup');
await p.$eval('#count',(e)=>{e.value=12;e.dispatchEvent(new Event('input',{bubbles:true}))});
const names=['Christopher','Maximiliano','Bartholomew','Alexandria','Jo','Sam','Priya','Alex','Megan','Tom','Ava','Leo'];for(let i=0;i<12;i++)await p.fill(`[data-name="${i}"]`,names[i]);
for(const [k,v] of [['1',100],['2',0],['3',0],['all',0]])await p.$eval(`[data-weight="${k}"]`,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);
await p.click('[data-act="start"]');
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));s.game.word='Remembrance Day';s.game.hint='Hippopotamuses';s.game.clue=s.game.clue.map(c=>c?'Hippopotamuses':c);s.game.first=0;localStorage.setItem('impostor-party-v1',JSON.stringify(s))});await p.reload();await p.waitForSelector('[data-act="reveal"]');
await check('pass');await p.click('[data-act="reveal"]');await p.waitForTimeout(800);await check('role card');
if(vw===390)await p.screenshot({path:'w1_role.png'});
await p.click('[data-act="hide"]');for(let i=1;i<12;i++){await p.click('[data-act="reveal"]');await p.waitForTimeout(100);await check('role card '+i);await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.waitForTimeout(500);await check('game on');if(vw===390)await p.screenshot({path:'w2_gameon.png'});
await p.click('[data-act="ready"]');await p.waitForTimeout(500);await check('vote grid');
const gb=await p.evaluate(()=>{const g=document.querySelector('.suspect-grid').getBoundingClientRect();const bk=document.querySelector('.vote > .btn').getBoundingClientRect();return {gridBottom:g.bottom,backBottom:bk.bottom,vh:innerHeight}});
t(gb.backBottom<=gb.vh+1,`${vw}px all 12 cards and the back link fit on screen (${Math.round(gb.backBottom)} <= ${gb.vh})`);
if(vw===390)await p.screenshot({path:'w3_grid.png'});
await p.click('[data-act="pickvote"][data-i="1"]');await p.waitForSelector('.stage-card');await p.waitForTimeout(700);await check('stage');if(vw===390)await p.screenshot({path:'w4_stage.png'});
await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after');await check('verdict');
await p.close();}
console.log('checks passed:',ok);await b.close();srv.close()})();
