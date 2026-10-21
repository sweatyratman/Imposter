const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const inp=(sel,v)=>p.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);
const vis=()=>p.$eval('.unmask-title',e=>{const pl=[...e.querySelectorAll('.pl')].map(x=>x.getBoundingClientRect().width),sg=e.querySelector('.sg');return {s:pl[0],ere:pl[1],as:sg?sg.getBoundingClientRect().width:-1,txt:e.textContent}});
for(const n of [3,1]){
 await inp('#count',6);for(const el of await p.$$('[data-weight]')){const k=await el.getAttribute('data-weight');await el.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},k===String(n)?100:0)}
 await p.click('[data-act="start"]');const g=await p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
 for(let i=0;i<6;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}
 await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');await p.click(`[data-act="pickvote"][data-i="${g.impostors.findIndex(v=>!v)}"]`);await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after');await p.mouse.click(195,300);
 await p.waitForSelector('.unmask');t((await p.textContent('.unmask-title'))==='Tap to reveal the impostor',n+': prompt singular before the tap');
 await p.click('[data-act="unmask"]');await p.waitForTimeout(250);let v=await vis();
 t(v.s<0.5&&v.ere<0.5&&v.as>5,n+': singular "The impostor was" while the cards flip');
 if(n>1){await p.screenshot({path:''+require('os').tmpdir()+'/U1_flip.png'});await p.waitForSelector('.stack-area.fanned',{timeout:8000});await p.waitForTimeout(1000);v=await vis();t(v.s>3&&v.ere>10&&v.as<0.5,'fanned: s fades in, "was" becomes "were"');
   t(!!(await p.$('.stack-area.fanned')),'cards fanned');await p.waitForSelector('[data-act="toResults"]');await p.waitForTimeout(200);v=await vis();
   t(v.s>3&&await p.getAttribute('.unmask-title','aria-label')==='The impostors were…','plural holds after redraw, screen readers hear it');await p.screenshot({path:''+require('os').tmpdir()+'/U2_fan.png'})}
 else {await p.waitForSelector('[data-act="toResults"]');await p.waitForTimeout(800);v=await vis();t(v.s<0.5&&v.as>5,'1 impostor: stays singular')}
 await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count');}
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
