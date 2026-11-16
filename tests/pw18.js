const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const val=(sel)=>p.$eval(sel,e=>+e.value);
const box=(sel)=>p.$eval(sel,e=>{const w=e.closest('.slider'),r=w.getBoundingClientRect(),th=w.querySelector('.sthumb').getBoundingClientRect();return {x:r.x,y:r.y+r.height/2,w:r.width,tx:th.x+th.width/2,ty:th.y+th.height/2}});
const cdp=await ctx.newCDPSession(p);
const touch=async(pts)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pts[0][0],y:pts[0][1]}]});
 for(const [x,y] of pts.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await p.waitForTimeout(16)}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(100)};
const line=(x0,y0,x1,y1,n=12)=>Array.from({length:n+1},(_,i)=>[x0+(x1-x0)*i/n,y0+(y1-y0)*i/n]);
t(await p.$eval('.slider',e=>getComputedStyle(e).touchAction)==='pan-y','sliders let vertical scrolling through');
// ---- players: a big stepper (the old slider is gone), with hold-to-repeat
const rect=(sel)=>p.$eval(sel,e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,tx:r.x+r.width/2,ty:r.y+r.height/2}});
const cv=async()=>+(await p.textContent('#countVal'));
await p.$eval('#count',e=>{e.value=5;e.dispatchEvent(new Event('input',{bubbles:true}))});
let sb=await rect('#stepUp');t(sb.w>=60&&sb.h>=60,`the + button is a big target (${Math.round(sb.w)}×${Math.round(sb.h)}px)`);
await p.click('#stepUp');t(await cv()===6&&await val('#count')===6,'+ adds a player');
await p.click('#stepDown');await p.click('#stepDown');t(await cv()===4&&await val('#count')===4,'− removes one (two taps)');
t(await p.$eval('#names',e=>e.children.length)===4,'name boxes follow the stepper');
await p.$eval('#count',e=>{e.value=3;e.dispatchEvent(new Event('input',{bubbles:true}))});t(await p.$eval('#stepDown',e=>e.disabled),'− stops at 3');
await p.$eval('#count',e=>{e.value=20;e.dispatchEvent(new Event('input',{bubbles:true}))});t(await p.$eval('#stepUp',e=>e.disabled)&&!(await p.$eval('#stepDown',e=>e.disabled)),'+ stops at 20');
await p.$eval('#count',e=>{e.value=4;e.dispatchEvent(new Event('input',{bubbles:true}))});
sb=await rect('#stepUp');await p.mouse.move(sb.tx,sb.ty);await p.mouse.down();await p.waitForTimeout(1100);await p.mouse.up();await p.waitForTimeout(150);
const held=await cv();t(held>=8&&held<=12,`holding + keeps counting (4→${held})`);
await p.$eval('#count',e=>{e.value=7;e.dispatchEvent(new Event('input',{bubbles:true}))});await p.click('#stepUp');await p.waitForTimeout(700);t(await cv()===8,'a single tap adds exactly one');
await p.focus('#stepUp');await p.keyboard.press('Enter');t(await cv()===9,'the keyboard works on the stepper');
// weights + max sliders use the same guard
const wsel='[data-weight="1"]';await p.$eval(wsel,e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(100);let bw=await box(wsel);const w0=await val(wsel);
await touch(line(bw.tx,bw.ty,bw.tx-6,bw.ty+180));t(await val(wsel)===w0,'odds slider ignores a scroll');
await p.$eval(wsel,e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(100);bw=await box(wsel);
await touch(line(bw.tx,bw.ty,bw.tx-80,bw.ty));t(await val(wsel)<w0-10,'odds slider moves with a sideways drag');
await p.screenshot({path:''+require('os').tmpdir()+'/SL.png'});
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
