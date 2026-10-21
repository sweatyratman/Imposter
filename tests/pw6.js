const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
(async()=>{const b=await chromium.launch();let bad=0;
for(const w of [280,320,360,390,430,520]){const p=await b.newPage({viewport:{width:w,height:800}});
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const pos=async()=>p.evaluate(()=>({chips:document.getElementById('cats').getBoundingClientRect().top+scrollY,below:document.querySelector('#weights').getBoundingClientRect().top+scrollY}));
const c=n=>p.click(`#cats .chip[data-cat="${n}"]`);await p.waitForTimeout(450);const ys=[];const texts=[];
ys.push(await pos());texts.push(await p.textContent('#catnote'));
await c('Animals');ys.push(await pos());texts.push(await p.textContent('#catnote'));
await c('Music');ys.push(await pos());texts.push(await p.textContent('#catnote'));
await c('Jobs');ys.push(await pos());texts.push(await p.textContent('#catnote'));
await c('Music');await c('Jobs');await c('Animals');ys.push(await pos());texts.push(await p.textContent('#catnote'));
const same=ys.every(y=>y.chips===ys[0].chips&&y.below===ys[0].below);
if(!same){bad++;console.log('SHIFT at width',w,JSON.stringify(ys))}
await p.close()}
console.log(bad?'layout shifts found':'no layout shift at any width/state (280-520px)');await b.close();srv.close()})();
