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
// vertical swipe starting on the players thumb: scrolls, value unchanged
let b0=await box('#count');const v0=await val('#count');const sy0=await p.evaluate(()=>scrollY);
await touch(line(b0.tx,b0.ty,b0.tx+14,b0.ty-220));
t(await val('#count')===v0,'vertical swipe over the thumb leaves the value alone');t(await p.evaluate(()=>scrollY)>sy0+50,'and the page scrolls');
await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(100);b0=await box('#count');
// tap on the track far from the thumb: nothing
await touch([[b0.x+b0.w-20,b0.y]]);t(await val('#count')===v0,'a tap on the track does nothing');
// deliberate horizontal drag from the thumb: moves
await touch(line(b0.tx,b0.ty,b0.tx+60,b0.ty+4));t(await val('#count')>v0,'sideways drag changes it ('+v0+'→'+(await val('#count'))+')');
t(await p.$eval('#names',e=>e.children.length)===await val('#count'),'name boxes follow the drag');
const thumbX=(await box('#count')).tx;t(Math.abs(thumbX-(b0.tx+60))<25,'thumb follows the finger');
// weighting: track distance per player shrinks as the count rises
const xs=[];for(const n of [3,4,9,10,15,16,19,20]){await p.$eval('#count',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},n);xs.push((await box('#count')).tx)}
const step34=xs[1]-xs[0],step910=xs[3]-xs[2],step1516=xs[5]-xs[4];
t(step34>step1516*1.8&&step910>step1516&&step34>step910,`small numbers get wider steps (3→4 ${step34.toFixed(1)}px, 9→10 ${step910.toFixed(1)}px, 15→16 ${step1516.toFixed(1)}px)`);
t(Math.abs(xs[0]-(b0.x+13))<2&&Math.abs(xs[7]-(b0.x+b0.w-13))<2,'3 sits at the left end, 20 at the right');
// precision: a 20px drag from 3 lands on 4, not 5
await p.$eval('#count',e=>{e.value=3;e.dispatchEvent(new Event('input',{bubbles:true}))});b0=await box('#count');
await touch(line(b0.tx,b0.ty,b0.tx+step34*1.1,b0.ty));t(await val('#count')===4,'a short drag at the low end moves exactly one');
// keyboard still works
await p.$eval('#count',e=>{e.value=5;e.dispatchEvent(new Event('input',{bubbles:true}))});await p.focus('#count');await p.keyboard.press('ArrowRight');
t(await val('#count')===6&&await p.textContent('#countVal')==='6','arrow keys still step the count');
// weights + max sliders use the same guard
const wsel='[data-weight="1"]';await p.$eval(wsel,e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(100);let bw=await box(wsel);const w0=await val(wsel);
await touch(line(bw.tx,bw.ty,bw.tx-6,bw.ty+180));t(await val(wsel)===w0,'odds slider ignores a scroll');
await p.$eval(wsel,e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(100);bw=await box(wsel);
await touch(line(bw.tx,bw.ty,bw.tx-80,bw.ty));t(await val(wsel)<w0-10,'odds slider moves with a sideways drag');
// mouse on desktop
const q=await b.newPage({viewport:{width:900,height:900}});await q.goto(`http://localhost:${srv.address().port}/`);await q.waitForSelector('#count');
const bm=await q.$eval('#count',e=>{const th=e.closest('.slider').querySelector('.sthumb').getBoundingClientRect();return [th.x+13,th.y+13]});const m0=await q.$eval('#count',e=>+e.value);
await q.mouse.move(...bm);await q.mouse.down();await q.mouse.move(bm[0]+70,bm[1],{steps:8});await q.mouse.up();t(await q.$eval('#count',e=>+e.value)>m0,'mouse drag works');
await p.screenshot({path:''+require('os').tmpdir()+'/SL.png'});
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
