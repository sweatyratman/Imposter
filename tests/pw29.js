const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// How to play (animated scenes with narration) and the cross-fade between screens.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
// a fake voice: records what it says; ends only when the test says so
const mk=async(opts={},vp={width:360,height:640})=>{const c=await b.newContext({viewport:vp,reducedMotion:opts.reduce?'reduce':'no-preference'});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.addInitScript(()=>{window.__said=[];window.__utt=[];const S=window.speechSynthesis;if(S){S.speak=(u)=>{window.__said.push(u.text);window.__utt.push(u)};S.cancel=()=>{}}});
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));p.ctx=c;return p};
const cap=(p)=>p.$eval('.howto-cap',e=>e.textContent);
const endVoice=(p,k=-1)=>p.evaluate((k)=>{const u=window.__utt.at(k);u&&u.onend&&u.onend()},k);
const S=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);

let p=await mk();
t(!!(await p.$('#howtoCta')),'first visit: a "New here?" invitation');
await p.click('#howtoCta [data-act="howtoDismiss"]');await p.waitForTimeout(300);t(!(await p.$('#howtoCta'))&&(await S(p)).seenHowto===true,'dismissing it hides it and remembers');
await p.reload();await p.waitForSelector('#count');t(!(await p.$('#howtoCta')),'it stays gone after a reload');
await p.click('[data-act="howto"]');await p.waitForSelector('.howto');
t((await p.$$eval('.howto .pips i',e=>e.length))===5,'five scenes');
t(/same secret word/.test(await cap(p))&&await p.$eval('[data-h="back"]',e=>e.disabled),'scene 1 caption; Back is off at the start');
t((await p.evaluate(()=>window.__said))[0]===await cap(p),'the narration says the caption');
await endVoice(p);await p.waitForTimeout(1300);t(/Pass the phone/.test(await cap(p)),'when the voice finishes it moves on by itself');
await p.click('[data-h="next"]');t(/one clue/.test(await cap(p)),'Next goes forward');
await endVoice(p,-2);await p.waitForTimeout(1300);t(/one clue/.test(await cap(p)),'an old scene finishing its voice late does not skip ahead');
await p.click('[data-h="back"]');t(/Pass the phone/.test(await cap(p)),'Back goes back');
await p.click('[data-h="voice"]');let s=await S(p);const n0=(await p.evaluate(()=>window.__said.length));
t(s.voice===false&&await p.$eval('[data-h="voice"]',e=>e.getAttribute('aria-pressed'))==='false','mute is saved and shown');
await p.click('[data-h="next"]');t((await p.evaluate(()=>window.__said.length))===n0,'muted: no more narration, captions still show ('+await cap(p)+')');
const stage=await p.$eval('.howto-stage',e=>e.innerHTML.length);t(stage>50,'each scene has its animation');
for(let k=0;k<2;k++)await p.click('[data-h="next"]');
t((await p.textContent('[data-h="next"]')).includes("Let's play"),'last scene: "Let\'s play"');
const fit=await p.evaluate(()=>{const n=document.querySelector('.howto-nav').getBoundingClientRect(),c=document.querySelector('.howto-cap').getBoundingClientRect(),st=document.querySelector('.howto-stage').getBoundingClientRect();return n.bottom<=innerHeight&&c.bottom<=n.top+1&&st.bottom<=c.top+1});
t(fit,'360×640: stage, caption and buttons all fit without overlapping');
await p.click('[data-h="next"]');await p.waitForTimeout(400);t(!(await p.$('.howto')),'"Let\'s play" closes it');
await p.click('[data-act="howto"]');await p.waitForSelector('.howto');await p.click('[data-h="close"]');await p.waitForTimeout(400);t(!(await p.$('.howto')),'✕ closes it');
// muted auto-advance uses its own timer
await p.click('[data-act="howto"]');await p.waitForSelector('.howto');await p.waitForTimeout(7600);t(!/same secret word/.test(await cap(p)),'muted, it still moves on by itself');
await p.click('[data-h="close"]');await p.ctx.close();

// watching from the invitation also counts as seen; big text still fits
p=await mk({}, {width:360,height:640});await p.click('#howtoCta [data-act="howto"]');await p.waitForSelector('.howto');t((await S(p)).seenHowto===true&&!(await p.$('#howtoCta')),'watching uses up the invitation');
const big=await p.evaluate(()=>{document.querySelectorAll('.howto, .howto *').forEach(e=>{e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*1.5)+'px'});const n=document.querySelector('.howto-nav').getBoundingClientRect();return n.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth});
t(big,'text ×1.5: the buttons stay on screen');await p.ctx.close();

// reduced motion
p=await mk({reduce:true});await p.click('#howtoCta [data-act="howto"]');await p.waitForSelector('.howto');
t(/same secret word/.test(await cap(p))&&await p.evaluate(()=>document.querySelector('.howto .hcard').getAnimations().length===0),'reduced motion: still works, nothing moves');
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
