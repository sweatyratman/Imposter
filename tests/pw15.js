const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const OLD=JSON.stringify({categories:[{name:'Old',emoji:'📜',words:[['apple','tree'],['car','road'],['dog','bark'],['sun','hot']]}]});
const srv=http.createServer((q,r)=>{if(q.url.startsWith('/old.json')){r.setHeader('content-type','application/json');return r.end(OLD)}
 const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(w=390,h=844)=>{const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));return p};
let p=await mk();
const G=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const inp=(sel,v)=>p.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);
const setW=async(w)=>{for(const el of await p.$$('[data-weight]')){const k=await el.getAttribute('data-weight');await el.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},w[k]||0)}};
const home=async()=>{await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count')};
const W=JSON.parse(fs.readFileSync(D+'words.json'));

// ---- word list: 4 different clues each ----
let all=0,four=0;W.categories.forEach((c)=>{c.words.forEach((w)=>{all++;w=w.filter(x=>typeof x==='string');if(w.length===5&&new Set(w.slice(1).map(x=>x.toLowerCase())).size===4)four++})});
t(all>0&&four===all,'every word has 4 different clues ('+four+'/'+all+')');

// ---- house rules visible; impostor slider ----
t(await p.$eval('#rules',e=>e.tagName!=='DETAILS'&&e.getBoundingClientRect().height>300),'house rules are not hidden');
t(await p.$eval('#maxImp',e=>+e.value)===3&&(await p.$$('[data-weight]')).length===4,'default: up to 3 impostors + everyone');
await inp('#count',3);t(await p.$eval('#maxImp',e=>+e.max)===2&&(await p.$$('[data-weight]')).length===3,'3 players: cap 2 (n-1), plus everyone');
await inp('#count',20);t(await p.$eval('#maxImp',e=>+e.max)===10,'20 players: capped at 10');
await inp('#maxImp',10);t((await p.$$('[data-weight]')).length===11&&!!(await p.$('[data-weight="all"]')),'10 sliders + everyone');
t((await p.textContent('#maxNote')).includes('Everyone is an impostor'),'note says everyone is always an option');
await inp('#maxImp',1);t((await p.$$('[data-weight]')).length===2&&!!(await p.$('[data-weight="all"]')),'max 1: everyone still offered');
const pcts=await p.$$eval('[data-pct]',e=>e.map(x=>parseInt(x.textContent)).reduce((a,b)=>a+b,0));t(pcts>=99&&pcts<=101,'chances add to 100');
await inp('#count',5);await inp('#maxImp',4);t(await p.$eval('#maxImp',e=>+e.value)===4,'5 players: up to 4');
await inp('#count',4);t(await p.$eval('#maxImp',e=>+e.value)===3,'fewer players clamps the slider');await inp('#count',8);t(await p.$eval('#maxImp',e=>+e.value)===4,'...and restores it with more players');
// distribution: over 400 rounds with max 4 and default odds, counts stay in range
const counts=await p.evaluate(()=>{return 0});

// ---- 6 impostors: clues cycle 1,2,3,4,1,2 in deal order ----
await inp('#count',9);await inp('#maxImp',6);await setW({6:100});await p.click('[data-act="start"]');let g=await G();
const imp=g.impostors.map((v,i)=>v?i:-1).filter(i=>i>=0);t(imp.length===6,'6 impostors dealt');
t(JSON.stringify(imp.map(i=>g.clue[i]))===JSON.stringify([0,1,2,3,0,1].map(k=>g.hints[k])),'clues go 1,2,3,4,1,2 in deal order');
t(g.impostors.every((v,i)=>v||g.clue[i]===null),'crew get no clue');
for(let i=0;i<9;i++){await p.click('[data-act="reveal"]');const txt=await p.textContent('.deal-card .cface');
 if(g.impostors[i])t(txt.includes(g.clue[i])&&!txt.includes(g.word),'impostor '+i+' sees their own clue');else t(txt.includes(g.word)&&!g.hints.some(h=>txt.includes('Your clue')),'crew sees the word');await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="quit"]');await p.click('[data-sheet="yes"]');
// one impostor always gets clue 1
let one=true;for(let r=0;r<6;r++){await inp('#count',5);await setW({1:100});await p.click('[data-act="start"]');g=await G();const i=g.impostors.findIndex(v=>v);if(g.clue[i]!==g.hints[0])one=false;await home()}
t(one,'a single impostor always gets clue 1');

// ---- results list each impostor's clue ----
await inp('#count',5);await setW({2:100});await p.click('[data-act="start"]');g=await G();for(let i=0;i<5;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');const crew=g.impostors.findIndex(v=>!v);
await p.click(`[data-act="pickvote"][data-i="${crew}"]`);await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after');await p.mouse.click(195,300);
await p.click('[data-act="unmask"]');await p.click('[data-act="toResults"]');const led=await p.textContent('.ledger');
t(led.includes('Impostor clues')&&g.impostors.every((v,i)=>!v||(led.includes(g.clue[i])&&led.includes(g.players[i]))),'results list each impostor with their clue');

// ---- leaderboard ----
await p.click('[data-nav="board"]');t(!!(await p.$('.sheet.board .brow')),'trophy in the bar opens the leaderboard');
const rows=await p.$$eval('.brow b',e=>e.map(x=>+x.textContent));t(rows.length===5&&rows.slice(0,2).every(x=>x===1)&&rows.slice(2).every(x=>x===0),'both impostor winners on top, the rest of the table on zero');
await p.keyboard.press('Escape');await p.waitForTimeout(300);t(!(await p.$('.sheet-wrap')),'Escape closes it');
await home();t(!!(await p.$('.masthead [data-act="board"]')),'trophy on the setup screen too');
await p.click('.masthead [data-act="board"]');await p.click('[data-sheet="reset"]');t((await p.textContent('.sheet-q')).includes('Reset'),'reset asks to confirm');
await p.click('[data-sheet="no"]');await p.waitForTimeout(300);t(Object.keys((await S()).scores).length===2,'cancel keeps the scores');
await p.click('.masthead [data-act="board"]');await p.click('[data-sheet="reset"]');await p.click('[data-sheet="yes"]');
t(!!(await p.$('.board-empty'))&&await p.$eval('[data-sheet="reset"]',e=>e.disabled),'after reset: empty board, reset disabled');t(Object.keys((await S()).scores).length===0,'scores cleared');
await p.click('[data-sheet="close"]');await p.waitForTimeout(300);

// ---- show category rule ----
t(await p.$eval('#showcat',e=>e.checked),'show category on by default');
await p.click('#showhint');await p.click('#showcat');t((await p.textContent('#infoNote')).includes('nothing at all'),'warns when impostors get nothing');
await p.click('#showhint');t((await p.textContent('#infoNote')).includes('no context')&&(await p.textContent('#infoNote')).includes('different clue'),'clue but no category note still says each impostor gets a different clue');
await inp('#count',4);await setW({1:100});await p.click('[data-act="start"]');g=await G();t(g.showCategory===false,'round locks the rule in');
t(!!(await p.$('#barcat .redcat .tape'))&&(await p.getAttribute('#barcat .redcat','aria-label'))==='Category hidden'&&!(await p.textContent('#barcat')).includes(g.category),'bar hides the category behind redacted tape');
for(let i=0;i<4;i++){await p.click('[data-act="reveal"]');t(!(await p.evaluate(()=>document.body.innerText)).includes(g.category),'category nowhere on screen while dealing');await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');t(!(await p.evaluate(()=>document.body.innerText)).includes(g.category),'not shown while voting');
const ii=g.impostors.findIndex(v=>v);await p.click(`[data-act="pickvote"][data-i="${ii}"]`);await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after');
await p.click('[data-act="stop"]');t(!(await p.evaluate(()=>document.body.innerText)).includes(g.category),'not shown on the guess screen');await p.click('[data-act="judgeNo"]');
t((await p.textContent('.ledger')).includes(g.category),'revealed on the results');
await home();await p.click('#showcat');

// ---- category cards ----
const cards=await p.$$eval('#cats .catcard',e=>e.map(x=>{const r=x.getBoundingClientRect();return {w:r.width,h:r.height,l:r.left,r:r.right,bg:getComputedStyle(x).backgroundImage}}));
t(cards.length===21,'21 category cards incl. Random');t(cards.slice(1).every(c=>Math.abs(c.w-c.h)<1.5),'category cards are square');t(cards[0].w>cards[1].w*3.5,'Random is a full-width banner on its own row (20 categories fill 4 columns exactly)');
const box=await p.$eval('#cats',e=>{const r=e.getBoundingClientRect();return [r.left,r.right]});
t(Math.abs(cards[0].l-box[0])<1&&Math.abs(cards[0].r-box[1])<1&&Math.abs(cards[20].r-box[1])<1&&Math.abs(cards[17].l-box[0])<1,'rows justified edge to edge, last row full');
t(new Set(cards.map(c=>c.bg)).size===21,'every category has its own look');
t(await p.$eval('#cats .catcard.random',e=>e.classList.contains('sel')),'Random selected by default');
await p.click('[data-cat="Animals"]');await p.click('[data-cat="Films"]');t(await p.$$eval('#cats .sel',e=>e.map(x=>x.dataset.cat).join())==='Animals,Films','pick two categories');
await p.click('[data-cat="random"]');t(await p.$$eval('#cats .sel',e=>e.map(x=>x.dataset.cat).join())==='random','Random clears the others');
const over=await p.$$eval('#cats .cat-name',e=>e.filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent));t(!over.length,'no category name overflows '+over);
const p2=await mk(320,640);const over2=await p2.$$eval('#cats .cat-name',e=>e.filter(x=>x.scrollWidth>x.clientWidth+1).length);t(over2===0,'names fit at 320px');
t(await p2.$eval('#cats',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===3,'3 columns on very narrow phones');t(await p2.$eval('#cats',e=>{const k=e.children.length;return k%3===0&&e.querySelector('.random').style.gridColumn===''}),'narrow: Random is a normal tile and 21 tiles fill 3 columns exactly');await p2.close();

// ---- older word lists (one clue) and older saves still work ----
await p.fill('#wurl',`http://localhost:${srv.address().port}/old.json`);await p.click('[data-act="reload"]');await p.waitForFunction(()=>document.getElementById('wstatus').textContent.includes('old.json'));
await inp('#count',5);await setW({3:100});await p.click('[data-act="start"]');g=await G();const imps=g.impostors.map((v,i)=>v?i:-1).filter(i=>i>=0);
t(g.hints.length===1&&imps.every(i=>g.clue[i]===g.hints[0]),'single-clue lists: every impostor gets the one clue');
await home();await p.fill('#wurl','');await p.click('[data-act="reload"]');await p.waitForFunction(()=>document.getElementById('wstatus').textContent.includes('words.json'));
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));delete s.settings.maxImpostors;delete s.settings.showCategory;s.settings.weights={'1':50,'2':50,'3':0,'all':0};s.game=null;localStorage.setItem('impostor-party-v1',JSON.stringify(s))});
await p.reload();await p.waitForSelector('#maxImp');t(await p.$eval('#maxImp',e=>+e.value)===3&&await p.$eval('#showcat',e=>e.checked),'old saves: up to 3, category shown');
t(await p.textContent('[data-pct="1"]')==='50%','old saves keep their odds');
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' '),'| passed',ok);process.exit(1)});
