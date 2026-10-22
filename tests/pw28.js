const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// Audit batch: quick setups, the rules summary, Quick reveals, the clue timer and small UX fixes.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(x={},vp={width:390,height:844})=>{const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
 await p.evaluate((x)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},x);localStorage.setItem('impostor-party-v1',JSON.stringify(s))},x);
 await p.reload();await p.waitForSelector('#count');return p};
const S=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const G=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const deal=async(p,g)=>{for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}};
const yes=async(p)=>{const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForTimeout(250)};

// ---- quick setups
let p=await mk();
t((await p.$$eval('#preset button',e=>e.map(x=>x.textContent))).join()==='Beginner,Classic,Chaos','three quick setups');
t(await p.$eval('#preset button.sel',e=>e.dataset.v)==='classic','defaults count as Classic');
const row=await p.$$eval('#preset button',e=>e.map(x=>Math.round(x.getBoundingClientRect().top)));t(new Set(row).size===1,'the three setups sit on one row');
await p.click('#preset [data-v="beginner"]');let s=await S(p);
t(s.announce===true&&s.maxImpostors===2&&s.unaware===false,'Beginner: count announced, at most 2 impostors');
t(await p.$eval('#preset button.sel',e=>e.dataset.v)==='beginner'&&/first games/.test(await p.textContent('#presetNote')),'Beginner is selected and explained');
await p.click('#preset [data-v="chaos"]');s=await S(p);
t(s.unaware===true&&s.unawareChance===50&&s.weights.all===10,'Chaos: fooled impostors at 50%, more impostors');
await p.click('#announce');t(!(await p.$('#preset button.sel'))&&/Your own mix/.test(await p.textContent('#presetNote')),'changing a rule shows it as your own mix');
await p.click('[data-act="resetRules"]');await yes(p);t(await p.$eval('#preset button.sel',e=>e.dataset.v)==='classic','Reset all house rules lands back on Classic');

// ---- the summary above Start
t(/^5 players · mostly 1 impostor · clues on/.test(await p.textContent('#summary')),'summary: players, impostors, clues ('+await p.textContent('#summary')+')');
await p.click('#drama [data-v="quick"]');await p.click('#timer [data-v="120"]');
t(/quick reveals/.test(await p.textContent('#summary'))&&/2-min timer/.test(await p.textContent('#summary')),'summary follows the rules as they change');
await p.click('#summary');await p.waitForTimeout(900);t(await p.$eval('#rules',e=>Math.abs(e.getBoundingClientRect().top)<60),'tapping the summary jumps to the house rules');
s=await S(p);t(s.drama==='quick'&&s.timer===120,'pace settings are saved');
await p.click('[data-act="resetRules"]');await yes(p);s=await S(p);t(s.drama==='full'&&s.timer===0,'Reset all house rules puts the pace back');
await p.close();

// ---- Quick reveal: still identical for crew and impostor before the peel, just faster
const timeline=async(imp)=>{const q=await mk({playerCount:4,weights:{1:100,2:0,3:0,all:0},drama:'quick',unaware:false});await q.click('[data-act="start"]');const g=await G(q);await deal(q,g);
 const t0=Date.now();await q.waitForSelector('[data-act="ready"]',{timeout:8000});const shuf=Date.now()-t0;await q.click('[data-act="ready"]');
 const i=g.impostors.findIndex(v=>v===imp);await q.click(`[data-act="pickvote"][data-i="${i}"]`);await q.click('[data-act="confirm"]');
 const snaps=[];for(const ms of [120,320]){await q.waitForTimeout(ms-(snaps.length?120:0));snaps.push(await q.$eval('.verdict-card',e=>e.className.replace(/\b(imp|crew)\b/g,'')))}
 const t1=Date.now();await q.waitForSelector('.verdict-card.revealed',{timeout:5000});const peel=Date.now()-t1+320;await q.close();return {snaps,shuf,peel}};
const a=await timeline(false),c=await timeline(true);
t(JSON.stringify(a.snaps)===JSON.stringify(c.snaps),'Quick: crew and impostor reveals look identical before the peel');
t(a.peel<1500&&c.peel<1500,`Quick: the tape comes off fast (${a.peel}ms, ${c.peel}ms)`);
t(a.shuf<3500,`Quick: the shuffle is short (${a.shuf}ms)`);

// ---- the clue timer
p=await mk({playerCount:4,weights:{1:100,2:0,3:0,all:0},timer:60,drama:'full'},{width:360,height:640});await p.click('[data-act="start"]');let g=await G(p);await deal(p,g);
await p.waitForSelector('#cluetimer',{timeout:9000});t((await p.textContent('#tleft'))==='1:00','timer shows the time before it starts');
const fit=await p.evaluate(()=>{const l=document.querySelector('.after .lead, .gameon-stack .lead').getBoundingClientRect(),d=document.querySelector('#cluetimer').getBoundingClientRect(),v=document.querySelector('[data-act="ready"]').getBoundingClientRect();return l.bottom<=d.top+2&&v.bottom<=innerHeight});
t(fit,'360×640: the clue line, timer and vote button all fit');
await p.click('#cluetimer');await p.waitForTimeout(1300);t(/0:59|0:58/.test(await p.textContent('#tleft'))&&/pause/.test(await p.textContent('#tstate')),'tap starts it counting down');
await p.click('#cluetimer');const held=await p.textContent('#tleft');await p.waitForTimeout(1200);t((await p.textContent('#tleft'))===held&&/Paused/.test(await p.textContent('#tstate')),'tap again pauses it');
await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem('impostor-party-v1'));x.game.timerLeft=1200;localStorage.setItem('impostor-party-v1',JSON.stringify(x))});await p.reload();await p.waitForSelector('#cluetimer');
await p.click('#cluetimer');await p.waitForTimeout(1900);
t(/Time's up/.test(await p.textContent('#tstate'))&&await p.$eval('#cluetimer',e=>e.classList.contains('done')),'when it runs out: "Time\'s up" and it stops');
t(!!(await p.$('[data-act="ready"]')),'it never forces the vote');
await p.close();

// ---- small fixes
p=await mk({playerCount:4,weights:{1:100,2:0,3:0,all:0},drama:'quick'});await p.click('[data-act="start"]');g=await G(p);
const brass=await p.evaluate(()=>getComputedStyle(document.querySelector('[data-nav="new"]')).color);t(brass!=='rgb(233, 185, 73)'&&brass!=='','New game is a quiet button, not brass ('+brass+')');
await deal(p,g);await p.waitForSelector('[data-act="ready"]',{timeout:8000});await p.click('[data-act="ready"]');
await p.click(`[data-act="pickvote"][data-i="${g.impostors.findIndex(Boolean)}"]`);await p.click('[data-act="confirm"]');await p.waitForSelector('.after',{timeout:12000});
await p.click('[data-act="stop"]');await p.waitForSelector('[data-act="judgeNo"]');t((await p.textContent('h1'))==='Impostor found!','one impostor: "Impostor found!", not "All impostors"');
await p.close();
p=await mk();const bar=await p.$$eval('#split span',e=>e.map(x=>x.style.transform));t(bar.length>0&&bar.every(x=>/scaleX/.test(x)),'odds bar moves by transform');
await p.$eval('[data-weight="1"]',e=>{e.value=20;e.dispatchEvent(new Event('input',{bubbles:true}))});const bar2=await p.$$eval('#split span',e=>e.length);t(bar2===bar.length,'odds bar keeps its pieces (so it can glide)');
await p.close();
// old saves with junk pace values are cleaned
p=await mk({drama:'turbo',timer:7});s=await S(p);t((await p.$eval('#drama button.sel',e=>e.dataset.v))==='full'&&(await p.$eval('#timer button.sel',e=>e.dataset.v))==='0','bad saved pace values fall back to the defaults');await p.close();

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
