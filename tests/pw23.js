// Larger system text (emulated by scaling every computed font size): the setup screen must not widen the page,
// and the "House rules" heading must never run under its reset button.
const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
const scale=(k)=>{const els=[...document.querySelectorAll('body *')];const sizes=els.map(e=>parseFloat(getComputedStyle(e).fontSize));els.forEach((e,i)=>{e.style.fontSize=(sizes[i]*k)+'px'});window.dispatchEvent(new Event('resize'))};
(async()=>{const b=await chromium.launch();const errs=[];
for(const [W,H] of [[390,844],[360,640]])for(const k of [1,1.3,1.5,1.8]){const p=await b.newPage({viewport:{width:W,height:H}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForSelector('#count');await p.evaluate(scale,k);await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{const h=document.querySelector('.rules > .row h2'),bt=document.querySelector('[data-act="resetRules"]');const a=h.getBoundingClientRect(),c=bt.getBoundingClientRect();
  const sideBySide=Math.abs((a.top+a.bottom)/2-(c.top+c.bottom)/2)<a.height;const tag=document.querySelector('.tape-tag');
  return {pageW:document.documentElement.scrollWidth,vw:innerWidth,headingClipped:h.scrollWidth>h.clientWidth+1,collide:sideBySide&&a.left+h.scrollWidth>c.left+1,btnRight:Math.round(c.right),tagRight:Math.round(tag.getBoundingClientRect().right)}});
 t(r.pageW<=r.vw+1,`${W}x${H} text x${k}: page not wider than the screen (${r.pageW}/${r.vw})`);
 t(!r.headingClipped&&!r.collide,`${W}x${H} text x${k}: House rules heading never runs under the reset button`);
 t(r.btnRight<=r.vw,`${W}x${H} text x${k}: reset button on screen`);
 await p.close()}
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
