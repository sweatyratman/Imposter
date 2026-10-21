const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});p.on('dialog',d=>d.accept());
await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));
  s.game={screen:'vote',players:['Jonny','Sam','Priya','Alex'],impostors:[false,true,false,false],word:'x',hint:'y',category:'Animals',emoji:'🐾',idx:0,out:[],voteSel:null,outcome:null,impostorCount:1,first:0,starterShown:true};
  localStorage.setItem('impostor-party-v1',JSON.stringify(s))});
await p.reload();await p.waitForSelector('.gcard');
// Is the card centre showing the cream face (light) or the smoky back (dark)?
const faceUp=async()=>{const buf=await p.screenshot({clip:await p.$eval('.stage-card',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width*0.5-4,y:r.y+r.height*0.22,width:8,height:8}})});
  const {PNG}=(()=>{try{return require('pngjs')}catch(e){return {}}})();
  return buf};
const light=async(label)=>{const v=await p.evaluate(async()=>{const e=document.querySelector('.stage-card');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height*0.2]});
  const shot=await p.screenshot({clip:{x:Math.round(v[0])-3,y:Math.round(v[1])-3,width:6,height:6}});
  // decode PNG via the browser to get the average brightness
  const avg=await p.evaluate(async(b64)=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=(d[i]+d[i+1]+d[i+2])/3;return s/(d.length/4)},shot.toString('base64'));
  return avg};
await p.click('[data-act="pickvote"][data-i="1"]');await p.waitForSelector('.stage-card');await p.waitForTimeout(800);
t(await light()>180,'chosen card face-up on the vote stage');
await p.click('[data-act="confirm"]');
for(const ms of [100,500,1200,1900,2400]){await p.waitForTimeout(ms===100?100:ms-[100,500,1200,1900,2400][[100,500,1200,1900,2400].indexOf(ms)-1]);const L=await light();t(L>180,`face-up during countdown at ~${ms}ms (brightness ${Math.round(L)})`);if(ms===1200)await p.screenshot({path:'fix_count.png'})}
console.log('checks passed:',ok);await b.close();srv.close()})();
