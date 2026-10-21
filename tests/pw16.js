const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[390,844],[360,640]]){
const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')||'{}').settings||{});
const inp=(sel,v)=>p.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);
t((await p.textContent('label:has(#showcat)')).trim()==='Show the category during gameplay','renamed');
t(await p.$eval('#showcat',e=>e.closest('.sub').contains(document.getElementById('showhint'))&&e.closest('.sub').querySelector('h3').textContent==='Impostor clues'),'category toggle in the "Impostor clues" box');
for(const v of ['impostors','nobody','crew']){await p.click(`[data-act="guessrule"][data-v="${v}"]`);const hs=await p.$$eval('#guessrule button',e=>e.map(b=>b.getBoundingClientRect().height+':'+Math.round(b.scrollWidth)));
 if(v==='impostors')globalThis.H0=hs.join();else t(hs.join()===globalThis.H0,'guess-rule labels keep their wrapping when '+v+' is picked ('+w+'px)')}
await p.click('[data-act="guessrule"][data-v="impostors"]');
t(await p.$eval('#rules',e=>{const b=e.querySelector('[data-act="resetRules"]');return !!b&&b.compareDocumentPosition(e.querySelector('.sub'))&Node.DOCUMENT_POSITION_FOLLOWING}),'reset button at the top of house rules');
t(await p.$eval('[data-act="resetRules"]',e=>e.disabled),'disabled while everything is default');
const btn=await p.$eval('[data-act="resetRules"]',e=>{const r=e.getBoundingClientRect(),h=e.parentElement.querySelector('h2').getBoundingClientRect();return Math.abs(r.top+r.height/2-(h.top+h.height/2))<8&&r.right<=innerWidth-15});t(btn,'button sits on the heading row');
await inp('#maxImp',4);await inp('[data-weight="2"]',60);await p.click('#showcat');await p.click('#showhint');await p.click('#announce');await p.click('[data-act="guessrule"][data-v="crew"]');
await p.fill('[data-name="0"]','Jonny');await p.click('[data-cat="Animals"]');
t(!(await p.$eval('[data-act="resetRules"]',e=>e.disabled)),'enabled once a rule changes');
await p.click('[data-act="resetRules"]');await p.click('[data-sheet="no"]');await p.waitForTimeout(300);t((await S()).maxImpostors===4,'cancel keeps rules');
await p.click('[data-act="resetRules"]');await p.click('[data-sheet="yes"]');const s=await S();
t(s.maxImpostors===3&&Object.keys(s.weights).length===0&&s.showCategory===true&&s.showHint===true&&s.announce===false&&s.guessRule==='impostors','rules back to defaults');
t(s.names[0]==='Jonny'&&s.categories[0]==='Animals','players and categories untouched');
t(await p.$eval('#showcat',e=>e.checked)&&await p.$eval('#maxImp',e=>+e.value)===3&&await p.$eval('[data-act="resetRules"]',e=>e.disabled),'screen shows defaults, button disabled again');
await p.waitForTimeout(400);await inp('#maxImp',4);await p.$eval('#rules',e=>e.scrollIntoView());await p.screenshot({path:`${require('os').tmpdir()}/R_${w}.png`});
await p.close()}
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
