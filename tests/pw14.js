const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const G=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const open=()=>p.evaluate(()=>document.getElementById('rules').open=true);
const setW=async(w)=>{for(const k of ['1','2','3','all']){const el=await p.$(`[data-weight="${k}"]`);if(el)await el.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},w[k]||0)}};
const setN=(n)=>p.$eval('#count',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},n);
const home=async()=>{await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count')};
// default on
await open();t(await p.$eval('#showhint',e=>e.checked),'clue setting on by default');t((await p.textContent('#infoNote')).includes('a clue'),'note: category and clue');
await p.click('#showhint');t((await p.textContent('#infoNote')).includes('only see the category'),'note updates when clues off');
await p.reload();await p.waitForSelector('#showhint',{state:'attached'});t(!(await p.$eval('#showhint',e=>e.checked)),'setting persists after reload');
// a normal round with clues off
await setN(4);await setW({1:100});await p.click('[data-act="start"]');let g=await G();t(g.showHint===false,'round locks the setting in');
for(let i=0;i<4;i++){await p.click('[data-act="reveal"]');const txt=await p.textContent('.deal-card .cface');
  if(g.impostors[i])t(txt.includes('No clue this game')&&!g.hints.some(h=>txt.includes(h))&&!txt.includes(g.word),'impostor card shows no clue and no word');
  else t(txt.includes(g.word),'crew still see the word');
  await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');const imp=g.impostors.findIndex(v=>v);
await p.click(`[data-act="pickvote"][data-i="${imp}"]`);await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after');
await p.click('[data-act="stop"]');t(!!(await p.$('[data-act="judgeYes"]')),'caught impostor still gets the guess');await p.click('[data-act="judgeYes"]');
t((await p.textContent('.ledger')).includes('None (clues off)'),'results show clues were off');
// everyone an impostor, clues off: still playable to the end
await home();await setN(3);await setW({all:100});await p.click('[data-act="start"]');g=await G();
for(let i=0;i<3;i++){await p.click('[data-act="reveal"]');t((await p.textContent('.deal-card .cface')).includes('No clue this game'),'all-impostor round: nobody gets a clue');await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');await p.click('[data-act="pickvote"][data-i="0"]');await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');
await p.waitForSelector('.result-head',{timeout:12000});t((await p.textContent('.result-head')).includes('Impostors win'),'all-impostor round with no clues still ends properly');
// turn it back on
await home();await open();await p.click('#showhint');await setN(4);await setW({1:100});await p.click('[data-act="start"]');g=await G();const k=g.impostors.findIndex(v=>v);
for(let i=0;i<=k;i++){await p.click('[data-act="reveal"]');if(i===k)t((await p.textContent('.deal-card .cface')).includes(g.clue[k]),'clue back when switched on');await p.click('[data-act="hide"]')}
// older saved game without the field still shows the clue
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));delete s.game.showHint;s.game.idx=s.game.impostors.findIndex(v=>v);s.game.screen='pass';localStorage.setItem('impostor-party-v1',JSON.stringify(s))});
await p.reload();g=await G();await p.click('[data-act="reveal"]');t((await p.textContent('.deal-card .cface')).includes(g.clue[g.idx]),'older saved games default to showing the clue');
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0]);process.exit(1)});
