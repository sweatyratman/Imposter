const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
const URL=()=>`http://localhost:${srv.address().port}/`;
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(opts={})=>{const ctx=await b.newContext({viewport:{width:390,height:844},...opts});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());await p.goto(URL());await p.waitForFunction(()=>document.getElementById('wstatus')&&document.getElementById('wstatus').textContent.startsWith('✓'));return p};
const H=(p)=>({
 txt:()=>p.evaluate(()=>document.getElementById('app').innerText),
 G:()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game),
 S:()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings),
 setup:async(n,w)=>{await p.$eval('#count',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},n);
   for(const k of ['1','2','3','all']){const el=await p.$(`[data-weight="${k}"]`);if(el)await el.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},w[k]||0)}},
 deal:async(n)=>{for(let i=0;i<n;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}},
 skip:async()=>{await p.click('[data-act="skipShuffle"]');await p.waitForSelector('.starter.landed')},
 vote:async(i)=>{await p.click(`[data-act="pickvote"][data-i="${i}"]`);await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after',{timeout:6000})},
 rule:async(v)=>{await p.evaluate(()=>{const d=document.getElementById('rules');if(d)d.open=true});await p.click(`[data-act="guessrule"][data-v="${v}"]`)},
});
const ids=(g,v)=>g.impostors.map((x,i)=>x===v?i:-1).filter(i=>i>=0);
const round=async(p,h,n,w)=>{await h.setup(n,w);await p.click('[data-act="start"]');await h.deal(n);await h.skip();await p.click('[data-act="ready"]');return h.G()};
const home=async(p)=>{await p.click('[data-nav="home"]');if(await p.$('[data-sheet="yes"]'))await p.click('[data-sheet="yes"]');await p.waitForSelector('#count')};

// ---------- setup option ----------
let p=await mk();let h=H(p);
t((await h.S()).guessRule===undefined||(await h.S()).guessRule==='impostors','default guess rule');
await p.evaluate(()=>document.getElementById('rules').open=true);t(await p.$eval('#guessrule .sel',e=>e.dataset.v)==='impostors','impostors win selected by default');t(await p.$eval('#bar',e=>getComputedStyle(e).display==='none'),'no top bar on setup');
await h.rule('nobody');t((await h.S()).guessRule==='nobody','rule saved');await p.reload();await p.waitForSelector('#rules');await p.evaluate(()=>document.getElementById('rules').open=true);await p.waitForSelector('#guessrule');
t(await p.$eval('#guessrule .sel',e=>e.dataset.v)==='nobody','rule persists');await h.rule('impostors');

// ---------- deal flow ----------
await h.setup(4,{1:100});await p.click('[data-act="start"]');
t(!!(await p.$('.deal-card.enter')),'card slides in');t(!(await p.$eval('#barcat',e=>e.hidden))&&(await p.textContent('#barcat .catval'))===((await h.G()).emoji+' '+(await h.G()).category).trim(),'category shown under the top bar');
t(!(await p.textContent('.deal-card')).includes('Category'),'category not on the card');
t((await h.txt()).includes('Pass the phone to'),'pass text');t(!(await p.$('button.btn[data-act="hide"]')),'no separate hide button');
await p.click('[data-act="reveal"]');t(!!(await p.$('.deal-card.flipped[data-act="hide"]')),'tap flips card in place');
t((await p.textContent('#dealnote')).includes('Tap the card to hide it, then pass'),'hide note');
const box1=await p.$eval('.deal-card',e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width]});
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
t(!(await p.$('.deal-card.flipped')),'locking the phone hides the role');
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true})});
await p.click('[data-act="reveal"]');await p.waitForTimeout(800);
const box2=await p.$eval('.deal-card',e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width]});
t(JSON.stringify(box1)===JSON.stringify(box2),'card stays in the same place when flipped');
await p.click('[data-act="hide"]');await p.waitForTimeout(600);t(!!(await p.$('.deal-card.exit:not(.flipped)')),'flips back down and slides out');
await p.waitForSelector('.deal-card.enter');t((await h.txt()).includes('Player 2 of 4'),'next card slides in');
for(let i=1;i<3;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}
await p.click('[data-act="reveal"]');t((await p.textContent('#dealnote')).includes('go to the shuffle'),'last player note mentions shuffle');
await p.click('[data-act="hide"]');
// ---------- shuffle ----------
await p.waitForSelector('.table-area .mini');t((await h.txt()).includes('Shuffling'),'shuffle screen');
t(!(await p.$('[data-act="ready"]')),'no vote button during shuffle');
await p.waitForSelector('.drawn.flipped',{timeout:8000});await p.waitForTimeout(900);const pre=await p.$eval('.drawn',e=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y)]});
await p.waitForSelector('.starter.landed',{timeout:8000});await p.waitForTimeout(600);const post=await p.$eval('.drawn',e=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y)]});
t(JSON.stringify(pre)===JSON.stringify(post),'drawn card does not move when Game on appears '+pre+' '+post);
await p.reload();await p.waitForSelector('.starter.landed');const rl=await p.$eval('.drawn',e=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y)]});t(JSON.stringify(rl)===JSON.stringify(post),'same position after reload '+rl);
let g=await h.G();t(await p.textContent('#starterName')===g.players[g.first],'drawn card shows the starter');
t(await p.$$eval('.drawn .tape',e=>e.length)===3,'starter card has 3 tapes (2 corners + role)');
t((await p.textContent('.drawn .tape-role')).includes('REDACTED'),'role tape says redacted');
t(!(await p.$('.drawn .corner'))&&!(await p.$('.drawn .idsym'))&&!(await p.$('.drawn .cface.imp')),'starter card never shows a role symbol or scuffs');
t((await h.txt()).includes('Game on')&&(await p.textContent('#shufnote')).includes('going first'),'game on text below the drawn card');

// ---------- wrong vote -> auto 4s -> unmask -> results ----------
await p.click('[data-act="ready"]');const c=ids(g,false),im=ids(g,true);
await p.click(`[data-act="pickvote"][data-i="${c[0]}"]`);await p.click('[data-act="confirm"]');
await p.waitForTimeout(1200);let s=await h.txt();
t(!s.includes('Wrong')&&!s.includes('Correct')&&!s.includes('crew.')&&!(await p.$('.after')),'nothing given away before the reveal');
t(await p.$$eval('.verdict-card .tape',e=>e.length)===3,'verdict card is taped');t(!!(await p.$('.verdict-card.flipped')),'verdict card arrives face-up');t(!(await p.$('.idsym')),'no centre icon on the card');
t(!(await p.$('.verdict-card .cface.imp'))&&!(await p.$('.verdict-card .cface.crew')),'no role styling before the peel');
await p.waitForSelector('.after',{timeout:7000});t((await h.txt()).includes('Wrong person'),'auto reveal after countdown');
t(!(await p.$('.verdict-card .tape')),'tape gone after peel');t(!!(await p.$('.verdict-card .corner .peace')),'crew card shows peace-hand corners');
await p.waitForTimeout(3000);t((await h.G()).screen==='verdict','still waiting at 3s');
await p.waitForSelector('.unmask',{timeout:2500});t((await h.txt()).includes('Tap to reveal the impostor'),'auto moves to unmask after 4s');
await p.click('[data-act="unmask"]');await p.waitForSelector('[data-act="toResults"]');
t((await p.getAttribute('.unmask-title','aria-label'))==='The impostor was…'&&!(await p.$('.unmask-title.plural')),'impostor revealed, singular');t((await p.textContent('.unmask .idname'))===g.players[im[0]],'shows the right impostor');
t(!!(await p.$('.unmask .cface.imp')),'impostor face is the scuffed one');
await p.click('[data-act="toResults"]');t((await h.txt()).includes('Impostors win'),'results after unmask');

// ---------- multi impostor unmask fans out; tap-to-skip ----------
await home(p);g=await round(p,h,5,{2:100});
await p.click(`[data-act="pickvote"][data-i="${ids(g,false)[0]}"]`);await p.click('[data-act="confirm"]');await p.click('[data-act="flipVerdict"]');await p.waitForSelector('.after');
await p.mouse.click(195,300);await p.waitForSelector('.unmask',{timeout:1500});t(true,'tap skips the 4s wait');
t(await p.$$eval('.stack-area .c3d',e=>e.length)===2,'2 impostor cards in the pile');t((await h.txt()).includes('Tap to reveal the impostor')&&!(await h.txt()).includes('impostors'),'prompt stays singular before the fan');
await p.click('[data-act="unmask"]');await p.waitForSelector('.stack-area.fanned');await p.waitForSelector('[data-act="toResults"]');
const shown=await p.$$eval('.stack-area .idname',e=>e.map(x=>x.textContent).sort());t(JSON.stringify(shown)===JSON.stringify(ids(g,true).map(i=>g.players[i]).sort()),'fanned cards show both impostors');

// ---------- found: split buttons, no extra line; partial then wrong -> only remaining unmasked ----------
await home(p);g=await round(p,h,5,{2:100});let I=ids(g,true),C=ids(g,false);
await h.vote(I[0]);s=await h.txt();
t(s.includes('Correct!')&&!s.includes('was an impostor'),'correct, without the extra line');
t(!!(await p.$('.split [data-act="again"]'))&&!!(await p.$('.split [data-act="stop"]')),'vote again / done side by side');
t(!!(await p.$('.verdict-card .corner .mask')),'impostor card shows mask corners');
await p.click('[data-act="again"]');await h.vote(C[0]);await p.mouse.click(195,300);await p.waitForSelector('.unmask');
t(await p.$$eval('.stack-area .c3d',e=>e.length)===1,'only the impostor still hiding is unmasked');

// ---------- stop with an impostor hiding -> unmask -> results ----------
await home(p);g=await round(p,h,5,{2:100});I=ids(g,true);
await h.vote(I[0]);await p.click('[data-act="stop"]');await p.waitForSelector('.unmask');await p.click('[data-act="unmask"]');await p.click('[data-act="toResults"]');
t((await h.txt()).includes('still hiding'),'stopping early: impostors win after unmask');

// ---------- guess screen and the 3 rule options ----------
for(const [rule,yes] of [['impostors','Impostors win'],['nobody','Nobody wins'],['crew','Crew wins']]){
  await home(p);await h.rule(rule);g=await round(p,h,5,{2:100});I=ids(g,true);
  await h.vote(I[0]);await p.click('[data-act="again"]');await h.vote(I[1]);await p.click('[data-act="stop"]');
  s=await h.txt();t(!(await p.$('input#guessInput'))&&!!(await p.$('.split [data-act="judgeYes"]'))&&!!(await p.$('.split [data-act="judgeNo"]')),rule+': two buttons, no typing');
  t(s.includes('must agree on a single word'),rule+': 2 caught impostors told to agree on one word');
  await p.click('[data-act="judgeYes"]');t((await h.txt()).includes(yes),rule+': correct guess -> '+yes);
}
await home(p);await h.rule('impostors');g=await round(p,h,4,{1:100});I=ids(g,true);
await h.vote(I[0]);await p.click('[data-act="stop"]');s=await h.txt();t(s.includes('One guess')&&!s.includes('must agree'),'single impostor: one guess');
await p.click('[data-act="judgeNo"]');t((await h.txt()).includes('Crew wins'),'wrong guess -> crew wins');

// ---------- last two (n-1 impostors) ----------
await home(p);g=await round(p,h,3,{2:100});I=ids(g,true);
await h.vote(I[0]);t(!!(await p.$('[data-act="verdictNext"].btn')),'last two: continue button');await p.click('[data-act="verdictNext"]');
t((await h.txt()).includes('Crew wins… almost'),'last two guess screen');await p.click('[data-act="judgeYes"]');t((await h.txt()).includes('Impostors win'),'last impostor guesses -> impostors win');
await p.click('[data-act="replay"]');await h.deal(3);await h.skip();await p.click('[data-act="ready"]');g=await h.G();I=ids(g,true);
await h.vote(I[0]);await p.click('[data-act="verdictNext"]');await p.click('[data-act="judgeNo"]');t((await h.txt()).includes('Crew wins'),'last impostor misses -> crew wins');

// ---------- everyone an impostor ----------
await home(p);g=await round(p,h,3,{all:100});await h.vote(0);t((await h.txt()).includes('both impostors'),'both win message');
await p.waitForSelector('.result-head',{timeout:5500});t(await p.$$eval('.badge.win',e=>e.length)===2,'both remaining win after 4s');
await home(p);g=await round(p,h,4,{all:100});await h.vote(0);s=await h.txt();
t(!!(await p.$('.split [data-act="stop"]'))&&!!(await p.$('.split [data-act="again"]'))&&!/no crew|impostors are|impostor is/i.test(s),'all-impostor round looks exactly like any other round');
await p.click('[data-act="stop"]');await p.waitForSelector('.unmask');t(await p.$$eval('.stack-area .c3d',e=>e.length)===3,'stopping early reveals the 3 hidden impostors');
await p.click('[data-act="unmask"]');await p.click('[data-act="toResults"]');t((await h.txt()).includes('Impostors win'),'and they win');

// ---------- reduced motion ----------
const q=await mk({reducedMotion:'reduce'});const hq=H(q);await hq.setup(4,{1:100});await q.click('[data-act="start"]');await hq.deal(4);
t(!!(await q.$('.starter.landed')),'reduced motion: starter immediately');await q.click('[data-act="ready"]');
await q.click('[data-act="pickvote"][data-i="0"]');await q.click('[data-act="confirm"]');t(!!(await q.$('.after')),'reduced motion: verdict immediately');

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' '),'| passed so far',ok);process.exit(1)});
