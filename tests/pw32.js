const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// The home screen (stepper, folded names, quick-setup cards, "same crew again?"), the golden aura, the ink-ripple glitch, tie-break buttons and wording.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
const ONE={1:100,2:0,3:0,all:0};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(x={},vp={width:390,height:844},hist=false)=>{const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
 await p.evaluate(([x,hist])=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{playerCount:5,seenHowto:true,weights:{1:100,2:0,3:0,all:0},categories:[],unaware:false},x);if(hist)s.history={w:{'Animals::frog':1},h:{}};localStorage.setItem('impostor-party-v1',JSON.stringify(s))},[x,hist]);
 await p.reload();await p.waitForSelector('#count');await p.waitForTimeout(500);return p};
const G=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const S=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const toVote=async(p)=>{await p.click('[data-act="start"]');const g=await G(p);for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');return g};
const inView=(p,sel)=>p.$eval(sel,e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight});
let p,g;

// ---- first visit: no "same crew again?", names folded away
p=await mk({weights:{}});
t(!(await p.$('#hero'))&&/Start game/.test(await p.textContent('.dock .btn.primary')),'a first visit has no "same crew again?" card and says Start game');
t(!(await p.$eval('#namesWrap',e=>e.classList.contains('open')))&&!(await p.$eval('[data-name="0"]',e=>e.offsetParent!==null&&getComputedStyle(e).visibility!=='hidden')),'the name boxes start folded away');
t(/Player 1 · Player 2/.test(await p.textContent('#nameList'))&&/Add names/.test(await p.textContent('#nameAct')),'the folded row lists who is playing and says "Add names"');
await p.click('[data-act="names"]');await p.waitForTimeout(500);
t(await p.$eval('#namesBtn',e=>e.getAttribute('aria-expanded'))==='true'&&await p.$eval('[data-name="0"]',e=>getComputedStyle(e).visibility==='visible'),'tapping opens the boxes');
await p.fill('[data-name="0"]','Marcus');t(/Marcus · Player 2/.test(await p.textContent('#nameList')),'typing a name updates the list');
await p.click('[data-act="names"]');await p.waitForTimeout(500);t(/Edit names/.test(await p.textContent('#nameAct')),'folded again, now "Edit names"');
// ---- quick setup cards
const cards=await p.$$eval('.pcard',e=>e.map(x=>{const r=x.getBoundingClientRect();return [r.width,r.height,x.textContent]}));
t(cards.length===3&&cards.every(c=>c[0]>=90&&c[1]>=110),'three big quick-setup cards ('+cards.map(c=>Math.round(c[0])+'×'+Math.round(c[1])).join(', ')+')');
t(await p.$eval('.pcard[data-v="classic"]',e=>e.classList.contains('sel')&&e.getAttribute('aria-pressed')==='true'),'Classic is picked by default');
await p.$eval('#presetBlock',e=>e.scrollIntoView({block:'center'}));await p.click('.pcard[data-v="beginner"]');await p.waitForTimeout(400);
t((await S(p)).preset==='beginner'&&await p.$eval('.pcard[data-v="beginner"]',e=>e.classList.contains('sel')),'tapping Beginner picks it');
t(!(await p.$('#rules #preset'))&&await p.$eval('#rules',e=>!/Quick setups/.test(e.textContent)),'Quick setups moved out of House rules');
await p.close();

// ---- 360×640: the stepper and Start are on the first screen
p=await mk({},{width:360,height:640});
t(await inView(p,'#stepUp')&&await inView(p,'#stepDown')&&await inView(p,'[data-act="start"]'),'360×640: stepper and Start are both on the first screen');
t(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'360×640: nothing overflows sideways');
await p.close();

// ---- returning groups: "same crew again?"
p=await mk({names:['Marcus','Anna','Ben','Cleo','Dev'],scores:{Anna:7,Marcus:4}},{width:390,height:844},true);
t(!!(await p.$('#hero'))&&/Marcus, Anna, Ben, Cleo, Dev/.test(await p.textContent('#heroNames'))&&/Anna leads on 7 points/.test(await p.textContent('#hero')),'a returning group sees names and the leader');
t(/Play again/.test(await p.textContent('.dock .btn.primary'))&&await inView(p,'[data-act="playagain"]'),'the dock says Play again, and the big Play again button is on the first screen');
await p.click('[data-act="toSetup"]');await p.waitForTimeout(900);t(await p.$eval('#playersBlock',e=>Math.abs(e.getBoundingClientRect().top)<60),'"Change setup" scrolls to the players');
await p.evaluate(()=>scrollTo(0,0));await p.click('[data-act="playagain"]');await p.waitForSelector('[data-act="reveal"]');t((await G(p)).screen==='pass','Play again deals a new round');await p.close();

// ---- category bar is a proper height, shown or redacted
for(const [show,label] of [[true,'shown'],[false,'redacted']]){p=await mk({showCategory:show});await p.click('[data-act="start"]');await p.waitForSelector('.barcat .redcat');
 const h=await p.$eval('.barcat .redcat',e=>e.getBoundingClientRect().height);t(h>=36,`the category bar (${label}) is ${Math.round(h)}px tall, not thin`);await p.close()}

// ---- instructions during play are bright
p=await mk();await p.click('[data-act="start"]');await p.waitForSelector('#dealnote');
const lum=(c)=>{const m=c.match(/\d+/g).map(Number);return Math.min(m[0],m[1],m[2])};
t(lum(await p.$eval('#dealnote',e=>getComputedStyle(e).color))>=220,'the deal instruction is bright');
const g0=await G(p);for(let i=0;i<g0.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');
t(lum(await p.$eval('.vote-head p',e=>getComputedStyle(e).color))>=220&&await p.$eval('.vote-head p',e=>+getComputedStyle(e).fontWeight>=600),'the vote instruction is bright and heavy');

// ---- tie-break: proper buttons, and the wording
t(await p.$$eval('.votefoot .btn',e=>e.length>=2&&e.every(x=>x.getBoundingClientRect().height>=54&&x.getBoundingClientRect().width>=120)),'"Back to discussion" and "It\'s a tie" are big buttons');
await p.click('[data-act="tie"]');await p.click('[data-act="tiepick"][data-i="1"]');await p.click('[data-act="tiepick"][data-i="2"]');
t(await p.$$eval('.votefoot .btn',e=>e.every(x=>x.getBoundingClientRect().height>=54)),'"Cancel" and "Break the tie" are big buttons');
await p.click('[data-act="tieBreak"]');await p.waitForTimeout(500);
t(/A majority MUST be reached!/.test(await p.textContent('.vote-head'))&&await p.$eval('.vote-head .must',e=>+getComputedStyle(e).fontWeight>=700&&/A majority MUST be reached!/.test(e.textContent)),'the tie-break ends "A majority MUST be reached!" in bold');
t(await p.$eval('[data-act="tieCancel"]',e=>e.classList.contains('alt')&&e.getBoundingClientRect().height>=54&&parseFloat(getComputedStyle(e).borderTopWidth)>=2),'"Cancel tie-break" is a real, outlined button');
await p.close();

// ---- golden aura: a crewmate's card, straight after the slam; never on an impostor
const run=async(x,imp)=>{const q=await mk(x);const gg=await toVote(q);const i=gg.impostors.findIndex(v=>!!v===imp);
 await q.evaluate(()=>{window.__ev={};const seen=()=>{const c=document.querySelector('.verdict-card');if(c&&c.classList.contains('revealed')&&!window.__ev.rev)window.__ev.rev=performance.now();if(document.querySelector('.aura.on')&&!window.__ev.aura){window.__ev.aura=performance.now();window.__ev.auraInTape=!!document.querySelector('.aura .tape')}
   if(document.querySelector('.after')&&!window.__ev.after)window.__ev.after=performance.now();if(!window.__ev.t0)window.__ev.t0=performance.now();requestAnimationFrame(seen)};seen()});
 await q.click(`[data-act="pickvote"][data-i="${i}"]`);await q.click('[data-act="confirm"]');await q.waitForSelector('.after',{timeout:20000});await q.waitForTimeout(400);
 const ev=await q.evaluate(()=>window.__ev),still=await q.$$eval('.verdict-card .aura.still',e=>e.length);await q.close();return {ev,still}};
let r=await run({},false);
t(r.ev.aura&&r.ev.rev&&r.ev.aura-r.ev.rev>=300&&r.ev.aura-r.ev.rev<=1000,`a crewmate's aura comes up right after the slam (${Math.round(r.ev.aura-r.ev.rev)}ms after the tape)`);
t(!r.ev.auraInTape&&r.still===1,'the aura is never around the tape, and stays on the result card');
r=await run({},true);t(!r.ev.aura&&r.still===0,'an impostor never gets the aura');
const FOOL={unaware:true,unawareChance:100};
const crewF=await run(FOOL,false),impF=await run(FOOL,true);
t(crewF.ev.aura-crewF.ev.rev>=1900&&crewF.ev.aura-crewF.ev.rev<=2800,`with fooled impostors the aura waits for the moment the ink would spread (${Math.round(crewF.ev.aura-crewF.ev.rev)}ms)`);
t(Math.abs((crewF.ev.after-crewF.ev.rev)-(impF.ev.after-impF.ev.rev))<500,`a crewmate and a fooled impostor finish at the same moment (${Math.round(crewF.ev.after-crewF.ev.rev)} vs ${Math.round(impF.ev.after-impF.ev.rev)}ms)`);

// ---- the ink ripple never flashes the whole impostor card at the start
p=await mk(FOOL);g=await toVote(p);const ii=g.impostors.findIndex(v=>v);
await p.evaluate(()=>{window.__ink=[];const f=()=>{const k=document.querySelector('.ink');if(k)window.__ink.push([performance.now(),k.style.maskImage||k.style.webkitMaskImage||'']);requestAnimationFrame(f)};f()});
await p.click(`[data-act="pickvote"][data-i="${ii}"]`);await p.click('[data-act="confirm"]');await p.waitForSelector('.after',{timeout:20000});
const ink=await p.evaluate(()=>window.__ink),t0=ink[0][0],open=ink.filter(([,m])=>m===''||m==='none');
t(ink.length>60&&!/none/.test(ink[0][1])&&ink[0][1]!=='','the first ink frame is masked, not the whole card');
t(open.length===0||open[0][0]-t0>=2400,'the card only opens fully once the ripple has finished ('+(open.length?Math.round(open[0][0]-t0)+'ms':'never before the end')+')');
await p.close();

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
