const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// Default impostor odds follow the player count; "Everyone is an impostor" stays at 7%.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const set=async(x)=>{await p.evaluate((x)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},x);localStorage.setItem('impostor-party-v1',JSON.stringify(s))},x);await p.reload();await p.waitForSelector('#weights [data-pct]')};
const pct=()=>p.$$eval('#weights [data-pct]',e=>Object.fromEntries(e.map(x=>[x.dataset.pct,parseInt(x.textContent)])));
const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const want={3:{1:93,2:0,all:7},4:{1:86,2:7,3:0,all:7},5:{1:78,2:15,3:0,all:7},8:{1:43,2:42,3:8,all:7},10:{1:20,2:50,3:23,all:7},13:{1:5,2:25,3:63,all:7},20:{1:5,2:25,3:63,all:7}};
for(const n in want){await set({playerCount:+n,weights:{},maxImpostors:3});const g=await pct();t(JSON.stringify(g)===JSON.stringify(want[n]),`${n} players: ${JSON.stringify(g)}`);}
for(let n=3;n<=20;n++){await set({playerCount:n,weights:{},maxImpostors:3});const g=await pct();t(g.all===7&&Object.values(g).reduce((a,b)=>a+b,0)===100,`${n} players: everyone is 7% and the odds add to 100`);}
await set({playerCount:10,weights:{},maxImpostors:1});let g=await pct();t(g[1]===93&&g.all===7,'max of 1 impostor: 93% one, 7% everyone');
await set({playerCount:10,weights:{},maxImpostors:4});g=await pct();t(g[4]===0&&g.all===7,'raising the max adds 4 impostors at 0%');
// the player slider moves the defaults while you haven't touched the odds
await set({playerCount:4,weights:{},maxImpostors:3});
await p.$eval('#count',e=>{e.value=10;e.dispatchEvent(new Event('input',{bubbles:true}))});g=await pct();t(g[2]===50,'changing the player count re-deals the default odds');
t(await p.$eval('[data-act="resetRules"]',e=>e.disabled),'untouched odds count as default');
// nudging a slider freezes your odds
await p.$eval('[data-weight="all"]',e=>{e.value=20;e.dispatchEvent(new Event('input',{bubbles:true}))});
let s=await S();t(s.weights['1']===20&&s.weights['2']===50&&s.weights.all===20,'the first nudge saves the odds you could see');
t(!(await p.$eval('[data-act="resetRules"]',e=>e.disabled)),'reset becomes available');
await p.$eval('#count',e=>{e.value=4;e.dispatchEvent(new Event('input',{bubbles:true}))});s=await S();t(s.weights.all===20,'your odds stay put when the player count changes');
await p.click('[data-act="resetRules"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForTimeout(250);
s=await S();g=await pct();t(Object.keys(s.weights).length===0&&g[1]===86&&g.all===7,'"Reset all to default" goes back to the odds for this many players');
// old saves holding the old fixed defaults move to the new ones
await set({playerCount:4,weights:{1:70,2:20,3:7,all:3},maxImpostors:3});g=await pct();t(g[1]===86&&(await S()).weights&&Object.keys((await S()).weights).length===0,'old default odds in a save are upgraded');
await set({playerCount:4,weights:{1:50,2:50,3:0,all:0},maxImpostors:3});g=await pct();t(g[1]===50&&g[2]===50,'customised odds in a save are kept');
// ---- Reset odds: its own button, separate from Reset all house rules
await set({playerCount:6,weights:{},maxImpostors:3,announce:false});
t(await p.$eval('#resetOdds',e=>e.disabled),'Reset odds is disabled while the odds are default');
await p.$eval('[data-weight="2"]',e=>{e.value=60;e.dispatchEvent(new Event('input',{bubbles:true}))});
t(!(await p.$eval('#resetOdds',e=>e.disabled)),'moving an odds slider enables Reset odds');
await p.$eval('#maxImp',e=>{e.value=4;e.dispatchEvent(new Event('input',{bubbles:true}))});
await p.click('#announce');await p.click('#resetOdds');s=await S();
t(Object.keys(s.weights).length===0&&s.maxImpostors===3&&s.announce===true,'Reset odds puts back the odds and the max, and leaves other rules alone');
t(await p.$eval('#resetOdds',e=>e.disabled),'then it disables itself');
await p.click('#announce');
// ---- the three reset looks
const cls=(sel)=>p.$eval(sel,e=>e.className);
t(/reset all/.test(await cls('[data-act="resetRules"]'))&&/reset scope/.test(await cls('#resetOdds'))&&/reset wipe/.test(await cls('#resetHistory')),'resets look different: all (brass), one section (plain), wipes data (coral)');
const col=(sel)=>p.$eval(sel,e=>getComputedStyle(e).color);
t(new Set([await col('[data-act="resetRules"]'),await col('#resetOdds'),await col('#resetHistory')]).size===3,'the three kinds have three different colours');
t((await p.textContent('[data-act="resetRules"]')).includes('Reset all house rules'),'the big reset says what it resets');
// ---- telling everyone the count locks out "everyone is an impostor"
await set({playerCount:5,weights:{},maxImpostors:3,announce:false});
await p.click('#announce');g=await pct();
t(g.all===0&&g[1]+g[2]+g[3]===100,'announcing the count: everyone-is-an-impostor drops to 0% and the rest make 100% ('+JSON.stringify(g)+')');
t(await p.$eval('[data-weight="all"]',e=>e.disabled)&&await p.$eval('[data-weight="all"]',e=>e.closest('.wrow').classList.contains('greyed')),'its slider is greyed out and locked');
t(/give the game away/.test(await p.textContent('#weights'))&&/off while the count is announced/.test(await p.textContent('#maxNote')),'the notes say why');
let allSeen=false;for(let k=0;k<25;k++){await p.click('[data-act="start"]');const gm=await p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);if(gm.impostorCount===gm.players.length)allSeen=true;if(gm.maxPossible===gm.players.length)allSeen=true;await p.click('[data-nav="home"]');const y2=await p.$('[data-sheet="yes"]');if(y2)await y2.click();await p.waitForSelector('#count')}
t(!allSeen,'no all-impostor rounds, and the vote-again maths knows it, over 25 deals');
await p.click('#announce');g=await pct();t(g.all===7,'switching announcing off brings everyone back at 7%');
await set({playerCount:5,weights:{1:50,2:20,3:0,all:30},maxImpostors:3,announce:true});g=await pct();
t(g.all===0&&(await S()).weights.all===30,'your own everyone setting is kept underneath while locked');

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
