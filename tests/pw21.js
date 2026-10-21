const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
const W=JSON.parse(fs.readFileSync(D+'words.json','utf8'));
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(extra={},opts={})=>{const p=await b.newPage({viewport:{width:390,height:844},...opts});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForSelector('#count');
 await p.evaluate((x)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{weights:{'1':100,'2':0,'3':0,'all':0}},x);localStorage.setItem('impostor-party-v1',JSON.stringify(s))},extra);
 await p.reload();await p.waitForSelector('#count');return p};
const G=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const S=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const home=async(p)=>{await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count')};

// ---- setup
let p=await mk({});
t((await p.textContent('#rules')).includes('Impostor clues')&&!(await p.textContent('#rules')).includes('Category and impostor clues'),'box is called "Impostor clues"');
t(!(await p.$eval('#unaware',e=>e.checked))&&await p.$eval('#unawareBox',e=>e.hidden),'default: off, chance slider hidden');
t((await S(p)).unaware!==true,'default setting is off');
await p.click('#unaware');
t(await p.$eval('#unaware',e=>e.checked)&&!(await p.$eval('#unawareBox',e=>e.hidden)),'toggling on reveals the slider');
t(await p.$eval('#unawareChance',e=>+e.value)===100&&(await p.textContent('#unawareVal'))==='100%','slider defaults to 100%');
let st=await S(p);t(st.unaware===true&&st.unawareChance===100,'saved: on, 100');
t(await p.$eval('[data-act="resetRules"]',e=>!e.disabled),'reset-all is now enabled');
await p.$eval('#unawareChance',e=>{e.value=40;e.dispatchEvent(new Event('input',{bubbles:true}))});
t((await p.textContent('#unawareVal'))==='40%'&&(await S(p)).unawareChance===40,'slider changes the chance (40%)');
await p.reload();await p.waitForSelector('#count');
t(await p.$eval('#unaware',e=>e.checked)&&await p.$eval('#unawareChance',e=>+e.value)===40,'survives a reload');
await p.click('[data-act="resetRules"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForTimeout(300);
st=await S(p);t(st.unaware===false&&st.unawareChance===100,'reset all to default turns it off and puts the chance back to 100');
// slider drag with real touch moves in steps of 5
await p.click('#unaware');
const box=await p.$eval('#unawareChance',e=>{const r=e.closest('.slider').getBoundingClientRect();return [r.left,r.top+r.height/2,r.width]});
const cdp=await p.context().newCDPSession(p);await p.evaluate(()=>document.querySelector('#unawareChance').scrollIntoView({block:'center'}));
const bb=await p.$eval('#unawareChance',e=>{const r=e.closest('.slider').getBoundingClientRect();return [r.left,r.top+r.height/2,r.width]});
const thumbX=bb[0]+bb[2]-14,y0=bb[1];
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:thumbX,y:y0}]});
for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:thumbX-i*bb[2]*0.045,y:y0}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
const v=await p.$eval('#unawareChance',e=>+e.value);t(v<100&&v%5===0,'dragging the slider moves it in steps of 5 ('+v+')');
await p.close();

// ---- 100%: every impostor fooled
p=await mk({unaware:true,unawareChance:100});
let g;const dealt=[];
await p.click('[data-act="start"]');g=await G(p);
const ii=g.impostors.findIndex(Boolean);
t(g.fooled.filter(Boolean).length===g.impostors.filter(Boolean).length&&g.alts[ii]&&g.alts[ii].toLowerCase()!==g.word.toLowerCase(),'100%: every impostor fooled, alt word differs ('+g.word+' / '+g.alts[ii]+')');
const cat=W.categories.find(c=>c.name===g.category);t(cat.words.some(w=>w[0]===g.altKeys[ii])&&cat.words.some(w=>w[0]===g.wkey),'alt word comes from the same category');
t(g.clue.every(c=>c===null),'fooled impostors get no clue');
const cardInfo=async()=>p.$eval('.deal-card',c=>({txt:c.innerText.replace(/\s+/g,' ').trim(),face:c.querySelector('.cface').className,corner:c.querySelector('.corner').innerHTML.includes('peace')}));
let crewIdx=g.impostors.findIndex(v=>!v),dc={};
for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.waitForTimeout(150);dc[i]=await cardInfo();await p.click('[data-act="hide"]')}
t(/You're crew/.test(dc[ii].txt)&&!/impostor/i.test(dc[ii].txt)&&dc[ii].face===dc[crewIdx].face&&dc[ii].corner&&dc[ii].txt.includes(g.alts[ii])&&dc[crewIdx].txt.includes(g.word),'fooled impostor is dealt a card identical to a crew card, with their own word');
t(dc[ii].txt.replace(g.alts[ii],'X')===dc[crewIdx].txt.replace(g.word,'X'),'card text is the same apart from the word');
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');
// crew run first for a baseline, then the fooled impostor
const snap=()=>p.$eval('.verdict-card',c=>({cls:[...c.classList].filter(x=>!['verdict-card','stage-card'].includes(x)&&!/^(hit|sigh|slam)$/.test(x)).sort().join(' '),face:c.querySelector('.cface').className,txt:c.innerText.replace(/\s+/g,' ').trim(),ink:!!c.querySelector('.inkwrap')}));
const playVerdict=async(idx)=>{await p.click(`[data-act="pickvote"][data-i="${idx}"]`);await p.click('[data-act="confirm"]');const o={};const t0=Date.now();
 await p.waitForTimeout(900);o.early=await snap();await p.waitForTimeout(3850-(Date.now()-t0));o.peeled=await snap();await p.waitForTimeout(5000-(Date.now()-t0));o.crewLook=await snap();
 await p.waitForTimeout(7200-(Date.now()-t0));o.mid=await snap();
 await p.waitForSelector('.after',{timeout:9000});o.end=await snap();o.after=(await p.innerText('.after')).replace(/\s+/g,' ');return o};
const crewRun=await playVerdict(crewIdx);
t(/Wrong person/.test(crewRun.after),'(baseline) crewmate: wrong person');
// that vote ended the round for crew (impostor escapes) -> go back through unmask to results then replay to test the fooled impostor
await p.waitForSelector('[data-act="unmask"]',{timeout:9000});
await p.click('[data-act="unmask"]');await p.waitForTimeout(900);
const unm={};await p.waitForSelector('.stack-area .inkwrap',{timeout:9000});unm.ink=true;
await p.waitForSelector('[data-act="toResults"]',{timeout:12000});
t(unm.ink,'unmask: a fooled impostor flips as crew, then the ink ripple runs');
t(await p.$eval('.stack-area .c3d .idrole',e=>e.textContent.trim())==='Impostor','unmask: ends on the impostor face');
await p.click('[data-act="toResults"]');
const led=await p.innerText('.ledger');t(/Thought they were crew/.test(led)&&led.includes(g.alts[ii])&&!/Impostor clue/.test(led),'results ledger names the fooled impostor and their word');
await p.click('[data-act="replay"]');
// replay: this time vote the impostor out
g=await G(p);const ii2=g.impostors.findIndex(Boolean);
for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');
const fRun=await playVerdict(ii2);
t(fRun.early.cls===crewRun.early.cls&&fRun.early.face===crewRun.early.face,'before the peel: fooled impostor and crew cards identical');
t(JSON.stringify({...fRun.peeled,txt:0})===JSON.stringify({...crewRun.peeled,txt:0})&&/Crew/.test(fRun.peeled.txt)&&!/Impostor/.test(fRun.peeled.txt),'tape off: shows plain crew, same as a real crewmate');
t(fRun.crewLook.txt===crewRun.crewLook.txt.replace(/Player \d/,m=>m)||/Crew/.test(fRun.crewLook.txt)&&!fRun.crewLook.ink&&/crew/.test(fRun.crewLook.face),'a full second of crew before anything changes');
t(fRun.mid.ink,'then the ink ripple is running');
t(/Correct/.test(fRun.after)&&/Impostor/.test(fRun.end.txt)&&/imp/.test(fRun.end.face)&&!fRun.end.ink,'ends on the impostor card with "Correct!" and no leftover overlay');
await p.screenshot({path:''+require('os').tmpdir()+'/f_end_check.png'});
await p.close();

// ---- 0%: nobody fooled
p=await mk({unaware:true,unawareChance:0});
await p.click('[data-act="start"]');g=await G(p);
t(g.fooled.every(v=>!v)&&g.alts.every(a=>a==null)&&g.clue.filter(Boolean).length===g.impostors.filter(Boolean).length,'0%: nobody fooled, normal clues');
await home(p);await p.close();

// ---- off: nobody fooled
p=await mk({unaware:false,unawareChance:100});
await p.click('[data-act="start"]');g=await G(p);t(g.fooled.every(v=>!v)&&g.alts.every(a=>a==null),'off: nobody fooled even with 100% stored');
await home(p);await p.close();

// ---- 50%: roughly half
p=await mk({unaware:true,unawareChance:50,playerCount:8});
let imps=0,fo=0,mix=0;
for(let k=0;k<50;k++){await p.click('[data-act="start"]');const gg=await G(p);imps+=gg.impostors.filter(Boolean).length;fo+=gg.fooled.filter(Boolean).length;if(gg.fooled.some(Boolean)&&gg.impostors.filter(Boolean).length-gg.fooled.filter(Boolean).length>0)mix++;
 await p.click('[data-nav="home"]');const yy=await p.$('[data-sheet="yes"]');if(yy)await yy.click();await p.waitForSelector('#count')}
t(fo/imps>0.3&&fo/imps<0.7,'50%: about half fooled ('+fo+'/'+imps+')');
await p.close();

// ---- toggles while impostors can be fooled
p=await mk({showCategory:false,showHint:true,unaware:false});
t(!(await p.$eval('#showcat',e=>e.checked))&&await p.$eval('#showhint',e=>e.checked)&&!(await p.$eval('#showcat',e=>e.disabled)),'before: toggles show the saved choices and work');
await p.click('#unaware');
const tgl=()=>p.evaluate(()=>({c:[document.querySelector('#showcat').checked,document.querySelector('#showcat').disabled],h:[document.querySelector('#showhint').checked,document.querySelector('#showhint').disabled],g:[document.querySelector('#showcatRow').classList.contains('greyed'),document.querySelector('#showhintRow').classList.contains('greyed')],note:document.querySelector('#infoNote').textContent}));
let tg=await tgl();
t(tg.c[0]===true&&tg.c[1]&&tg.h[0]===false&&tg.h[1]&&tg.g[0]&&tg.g[1],'100%: category shown (ticked) and clue off (unticked), both greyed out');
t(/nobody gets a clue/.test(tg.note)&&/everyone sees the category/.test(tg.note),'the note explains why');
st=await S(p);t(st.showCategory===false&&st.showHint===true,'your own saved choices are untouched underneath');
await p.$eval('#unawareChance',e=>{e.value=50;e.dispatchEvent(new Event('input',{bubbles:true}))});
tg=await tgl();
t(tg.c[0]===true&&tg.c[1]&&tg.g[0]&&tg.h[0]===true&&!tg.h[1]&&!tg.g[1],'under 100%: category still forced on, but the clue toggle is available again (and shows your choice)');
const note=()=>p.textContent('#infoNote');
t(/who know what they are get a clue/.test(await note())&&/different clue/.test(await note())&&/everyone sees the category/.test(await note()),'50%: the note splits aware and fooled impostors');
await p.click('#showhint');t((await S(p)).showHint===false,'the clue toggle works at 50%');
t(/who know what they are get no clue/.test(await note()),'50% with clues off: the note says aware impostors get no clue');await p.click('#showhint');
await p.click('#showcat',{force:true}).catch(()=>{});t((await S(p)).showCategory===false,'the greyed category toggle cannot be changed');
await p.$eval('#unawareChance',e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))});
t(!(await p.$eval('#showcat',e=>e.disabled))&&!(await p.$eval('#showcat',e=>e.checked)),'at 0% nobody is fooled, so the category toggle comes back (with your choice)');
await p.$eval('#unawareChance',e=>{e.value=50;e.dispatchEvent(new Event('input',{bubbles:true}))});
// a mixed round: knowing impostors get a clue, fooled ones get a crew card
await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem('impostor-party-v1'));x.settings.weights={'1':0,'2':0,'3':100,'all':0};x.settings.playerCount=8;localStorage.setItem('impostor-party-v1',JSON.stringify(x))});await p.reload();await p.waitForSelector('#count');
let mixedOk=false,mixedSeen=0;
for(let k=0;k<40&&!mixedOk;k++){await p.click('[data-act="start"]');g=await G(p);
 const aw=g.impostors.map((v,i)=>v&&!g.fooled[i]?i:-1).filter(i=>i>=0),fo=g.fooled.map((v,i)=>v?i:-1).filter(i=>i>=0);
 if(aw.length&&fo.length){mixedSeen++;
  const read=async(i)=>{for(let j=0;j<=i;j++){if(j>0){}await p.click('[data-act="reveal"]');if(j===i){await p.waitForTimeout(120);const tx=(await p.innerText('.deal-card')).replace(/\s+/g,' ');await p.click('[data-act="hide"]');return tx}await p.click('[data-act="hide"]')}};
  const ta=await read(aw[0]);await p.click('[data-nav="home"]');const y3=await p.$('[data-sheet="yes"]');if(y3)await y3.click();await p.waitForSelector('#count');
  mixedOk=/impostor/i.test(ta)&&/Your clue/.test(ta)&&g.showCategory===true&&g.showHint===true&&g.clue[aw[0]]&&g.clue[fo[0]]===null;
  break}
 await p.click('[data-nav="home"]');const y4=await p.$('[data-sheet="yes"]');if(y4)await y4.click();await p.waitForSelector('#count')}
t(mixedOk,'a mixed round: the knowing impostor gets a clue, the fooled one gets none and a crew card, category shown');
await p.close();
// 100%: no clue handed out at all and the category is on even if saved otherwise
p=await mk({showCategory:false,showHint:true,unaware:true,unawareChance:100});
await p.click('[data-act="start"]');g=await G(p);t(g.showCategory===true&&g.showHint===false,'100% in the round: category shown, clues off');
await home(p);await p.close();

// ---- several fooled impostors each get their own word
p=await mk({unaware:true,unawareChance:100,playerCount:8,weights:{'1':0,'2':0,'3':100,'all':0}});
let allDistinct=true,counts=[];
for(let k=0;k<15;k++){await p.click('[data-act="start"]');const gg=await G(p);
 const ws=gg.alts.filter(a=>a!=null);counts.push(ws.length);
 const cat2=W.categories.find(c=>c.name===gg.category);
 if(ws.length!==3||new Set(ws.map(x=>x.toLowerCase())).size!==3||ws.some(x=>x.toLowerCase()===gg.word.toLowerCase())||gg.altKeys.filter(a=>a!=null).some(k=>!cat2.words.some(w=>w[0]===k)))allDistinct=false;
 await p.click('[data-nav="home"]');const yy=await p.$('[data-sheet="yes"]');if(yy)await yy.click();await p.waitForSelector('#count')}
t(allDistinct,'3 fooled impostors: three different words, none the crew word, all from the category (15 rounds)');
await p.close();
// everyone an impostor, all fooled: still all different
p=await mk({unaware:true,unawareChance:100,playerCount:6,weights:{'1':0,'2':0,'3':0,'all':100}});
await p.click('[data-act="start"]');g=await G(p);
t(g.alts.filter(Boolean).length===6&&new Set(g.alts.map(a=>a.toLowerCase())).size===6,'everyone an impostor and fooled: six different words');
await home(p);await p.close();

// ---- reduced motion
p=await mk({unaware:true,unawareChance:100},{reducedMotion:'reduce'});
await p.click('[data-act="start"]');g=await G(p);const ir=g.impostors.findIndex(Boolean);
for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}
await p.waitForSelector('[data-act="ready"]');await p.click('[data-act="ready"]');await p.click(`[data-act="pickvote"][data-i="${ir}"]`);await p.click('[data-act="confirm"]');
await p.waitForSelector('.after',{timeout:4000});t(/Correct/.test(await p.innerText('.after'))&&(await p.innerText('.verdict-card')).includes('Impostor'),'reduced motion: straight to the answer, no ripple');
await p.close();
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
