// Random should hand out categories in proportion to their word counts.
const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const counts={};const N=3000;
for(let k=0;k<N;k++){await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));s.game=null;s.recent=[];localStorage.setItem('impostor-party-v1',JSON.stringify(s))});
 if(k%300===0){await p.reload();await p.waitForSelector('[data-act="start"]')}
 await p.evaluate(()=>document.querySelector('[data-act="start"]').click());
 const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game.category);counts[c]=(counts[c]||0)+1;
 await p.evaluate(()=>document.querySelector('[data-nav="home"]').click());const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('[data-act="start"]');}
const j=JSON.parse(fs.readFileSync(D+'words.json','utf8'));const tot=j.categories.reduce((n,c)=>n+c.words.length,0);
let worst=0;for(const c of j.categories){const exp=N*c.words.length/tot,got=counts[c.name]||0;worst=Math.max(worst,Math.abs(got-exp)/exp);console.log(c.name.padEnd(22),String(c.words.length).padStart(3),'words  expected',exp.toFixed(0).padStart(4),' got',String(got).padStart(4))}
console.log('largest relative gap',(worst*100).toFixed(0)+'%',worst<0.35?'OK':'CHECK');await b.close();srv.close()})();
