const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// How to play (animated scenes, swiped through) and the cross-fade between screens.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
// a fake voice: records what it says; ends only when the test says so
const mk=async(opts={},vp={width:360,height:640})=>{const c=await b.newContext({viewport:vp,reducedMotion:opts.reduce?'reduce':'no-preference'});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.addInitScript(()=>{window.__said=[];window.__utt=[];const S=window.speechSynthesis;if(S){S.speak=(u)=>{window.__said.push(u.text);window.__utt.push(u)};S.cancel=()=>{}}});
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));p.ctx=c;return p};
const cap=(p)=>p.$eval('.howto-cap',e=>e.textContent);
const S=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);

let p=await mk();
t(!!(await p.$('#howtoCta')),'first visit: a "New here?" invitation');
await p.click('#howtoCta [data-act="howtoDismiss"]');await p.waitForTimeout(300);t(!(await p.$('#howtoCta'))&&(await S(p)).seenHowto===true,'dismissing it hides it and remembers');
await p.reload();await p.waitForSelector('#count');t(!(await p.$('#howtoCta')),'it stays gone after a reload');
await p.click('[data-act="howto"]');await p.waitForSelector('.howto');
t((await p.$$eval('.howto .pips i',e=>e.length))===5&&(await p.textContent('.howto-count'))==='1 of 5','five scenes, "1 of 5"');
t(/same secret word/.test(await cap(p))&&await p.$eval('[data-h="back"]',e=>e.disabled),'scene 1 caption; Back is off at the start');
t((await p.evaluate(()=>window.__said.length))===0,'no voice');
t(/Swipe for the next tip/.test(await p.textContent('.howto-swipe'))&&await p.$eval('.howto-swipe .hand',e=>e.getAnimations().length>0),'an animated "Swipe for the next tip" cue');
await p.waitForTimeout(7000);t(/same secret word/.test(await cap(p)),'it never moves on by itself');
const swipe=async(dx)=>{const x0=dx>0?90:270;await p.mouse.move(x0,300);await p.mouse.down();await p.mouse.move(x0+dx,304,{steps:10});await p.mouse.up();await p.waitForTimeout(450)};
await swipe(-160);t(/Pass the phone/.test(await cap(p))&&(await p.textContent('.howto-count'))==='2 of 5','swiping left goes to the next tip');
await swipe(160);t(/same secret word/.test(await cap(p)),'swiping right goes back');
await swipe(-25);t(/same secret word/.test(await cap(p)),'a tiny drag springs back');
await p.mouse.move(200,250);await p.mouse.down();await p.mouse.move(210,420,{steps:8});await p.mouse.up();await p.waitForTimeout(300);t(/same secret word/.test(await cap(p)),'an up/down drag is not a swipe');
await p.click('[data-h="next"]');t(/Pass the phone/.test(await cap(p)),'Next still works');
await p.keyboard.press('ArrowRight');t(/one clue/.test(await cap(p)),'arrow keys work');
await p.click('[data-h="back"]');t(/Pass the phone/.test(await cap(p)),'Back goes back');
const stage=await p.$eval('.howto-stage',e=>e.innerHTML.length);t(stage>50,'each scene has its animation');
for(let k=0;k<3;k++)await swipe(-160);
t((await p.textContent('[data-h="next"]')).includes("Let's play")&&await p.$eval('.howto-swipe',e=>e.classList.contains('gone')),'last scene: "Let\'s play", swipe cue hidden');
const fit=await p.evaluate(()=>{const n=document.querySelector('.howto-nav').getBoundingClientRect(),c=document.querySelector('.howto-cap').getBoundingClientRect(),w=document.querySelector('.howto-swipe').getBoundingClientRect(),st=document.querySelector('.howto-stage').getBoundingClientRect();return n.bottom<=innerHeight&&w.bottom<=n.top+1&&c.bottom<=w.top+1&&st.bottom<=c.top+1});
t(fit,'360×640: stage, caption, swipe cue and buttons all fit without overlapping');
await swipe(-160);await p.waitForTimeout(300);t(!(await p.$('.howto')),'swiping past the last tip closes it');
await p.click('[data-act="howto"]');await p.waitForSelector('.howto');await p.click('[data-h="close"]');await p.waitForTimeout(400);t(!(await p.$('.howto')),'✕ closes it');
await p.ctx.close();

// watching from the invitation also counts as seen; big text still fits
p=await mk({}, {width:360,height:640});await p.click('#howtoCta [data-act="howto"]');await p.waitForSelector('.howto');t((await S(p)).seenHowto===true&&!(await p.$('#howtoCta')),'watching uses up the invitation');
const big=await p.evaluate(()=>{document.querySelectorAll('.howto, .howto *').forEach(e=>{e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*1.5)+'px'});const n=document.querySelector('.howto-nav').getBoundingClientRect();return n.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth});
t(big,'text ×1.5: the buttons stay on screen');await p.ctx.close();

// reduced motion
p=await mk({reduce:true});await p.click('#howtoCta [data-act="howto"]');await p.waitForSelector('.howto');
t(/same secret word/.test(await cap(p))&&await p.evaluate(()=>document.querySelector('.howto .hcard').getAnimations().length===0),'reduced motion: still works, nothing moves');
await p.click('[data-h="next"]');t(/Pass the phone/.test(await cap(p)),'reduced motion: Next works');
await p.click('[data-h="close"]');await p.ctx.close();

// cross-fade between screens
p=await mk();await p.click('#howtoCta [data-act="howtoDismiss"]');
await p.click('[data-act="start"]');
const g1=await p.evaluate(()=>({ghost:document.querySelectorAll('.xfade').length,dupes:document.querySelectorAll('[data-act="start"]').length}));
t(g1.ghost===1,'leaving setup: the old screen fades out over the new one');
t(g1.dupes===0,'the fading copy never matches page lookups');
t(await p.evaluate(()=>{const b=document.querySelector('.btn.ghost');return !b||getComputedStyle(b).position!=='fixed'}),'quiet .ghost buttons are not mistaken for the fading copy');
await p.waitForTimeout(400);t((await p.evaluate(()=>document.querySelectorAll('.xfade').length))===0,'and it cleans itself up');
await p.click('[data-act="reveal"]');t((await p.evaluate(()=>document.querySelectorAll('.xfade').length))===0,'the deal keeps its own slide (no cross-fade)');
await p.ctx.close();
p=await mk({reduce:true});await p.click('[data-act="start"]');t((await p.evaluate(()=>document.querySelectorAll('.xfade').length))===0,'reduced motion: no cross-fade');await p.ctx.close();

// get the game card on the results screen
p=await mk();await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem('impostor-party-v1'));x.settings.weights={1:100,2:0,3:0,all:0};x.settings.seenHowto=true;localStorage.setItem('impostor-party-v1',JSON.stringify(x))});
await p.reload();await p.waitForSelector('#count');await p.evaluate(()=>{window.__copied=null;Object.defineProperty(navigator,'share',{value:undefined,configurable:true});navigator.clipboard.writeText=async(t)=>{window.__copied=t}});
await p.click('[data-act="start"]');let gg=await p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
for(let i=0;i<gg.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');
await p.click(`[data-act="pickvote"][data-i="${gg.impostors.findIndex(Boolean)}"]`);await p.click('[data-act="confirm"]');await p.waitForSelector('.after',{timeout:12000});await p.click('[data-act="stop"]');await p.click('[data-act="judgeNo"]');
await p.waitForSelector('.getgame');t(await p.$eval('.gg-qr svg path',e=>e.getAttribute('d').length>500),'results: a "Get the game" card with a QR code');
const qb=await p.$eval('.gg-qr',e=>{const r=e.getBoundingClientRect();return r.width>=90&&r.right<=innerWidth});t(qb,'the QR is big enough to scan and on screen');
await p.click('#shareGame');await p.waitForTimeout(200);t((await p.evaluate(()=>window.__copied))===await p.evaluate(()=>location.origin+location.pathname)&&/copied/.test(await p.textContent('#shareGame')),'Share copies the link when the phone has no share sheet');
await p.ctx.close();

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
