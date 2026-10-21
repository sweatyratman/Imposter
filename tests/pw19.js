const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts/,r=>r.abort());await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForSelector('#count');
for(const el of await p.$$('[data-weight]')){const k=await el.getAttribute('data-weight');await el.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},k==='2'?100:0)}
const run=async(pickImp)=>{await p.click('[data-act="start"]');const g=await p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
 for(let i=0;i<5;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');
 const i=g.impostors.findIndex(v=>v===pickImp);await p.click(`[data-act="pickvote"][data-i="${i}"]`);await p.click('[data-act="confirm"]');
 const snap=()=>p.$eval('.verdict-card',c=>({cls:[...c.classList].filter(x=>x!=='verdict-card'&&x!=='stage-card').sort().join(' '),face:c.querySelector('.cface').className,anim:getComputedStyle(c.querySelector('.cface'),'::before').animationName,glow:getComputedStyle(c.querySelector('.cface')).animationName}));
 const out={};await p.waitForTimeout(700);out.early=await snap();await p.waitForTimeout(1700);out.last=await snap();
 await p.waitForTimeout(300);await p.screenshot({path:`${require('os').tmpdir()}/strobe_${pickImp?'imp':'crew'}.png`});
 await p.waitForTimeout(1300);out.after=await snap();await p.waitForSelector('.after',{timeout:6000});await p.waitForTimeout(1500);
 out.final=await p.$eval('.verdict-card .cface',f=>+getComputedStyle(f,'::before').opacity);
 await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count');return out};
const imp=await run(true),crew=await run(false);
t(imp.early.cls.includes('strobe')&&!imp.early.cls.includes('hard')&&imp.early.anim==='strobeStain','countdown: card strobes');
t(imp.last.cls.includes('hard'),'last beat: strobe goes frantic');
t(JSON.stringify(imp.early)===JSON.stringify(crew.early)&&JSON.stringify(imp.last)===JSON.stringify(crew.last),'crew and impostor cards strobe identically before the peel (no tell)');
t(!imp.after.cls.includes('strobe')&&!crew.after.cls.includes('strobe'),'strobe stops once the tape is off');
t(imp.final>0.9&&crew.final<0.05,'settles: impostor stained ('+imp.final+'), crew clean ('+crew.final+')');
// reduced motion: no strobe animation
const q=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await q.goto(`http://localhost:${srv.address().port}/`);await q.waitForSelector('#count');
t(await q.evaluate(()=>{const d=document.createElement('div');d.className='c3d strobe hard';d.innerHTML='<div class="cface cside"></div>';document.body.append(d);return getComputedStyle(d.firstChild).animationName}) ==='none','reduced motion: no strobe');
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
