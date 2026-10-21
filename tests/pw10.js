const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
(async()=>{const b=await chromium.launch();const out=[];
for(const [vw,vh] of [[390,844],[360,740]]){
const p=await b.newPage({viewport:{width:vw,height:vh}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('dialog',d=>d.accept());await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
for(let n=3;n<=20;n++){
  await p.evaluate((n)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'))||{settings:{}};
    s.settings=Object.assign(s.settings||{},{playerCount:n});
    s.game={screen:'vote',players:Array.from({length:n},(_,i)=>'P'+(i+1)),impostors:Array.from({length:n},(_,i)=>i===0),word:'x',hint:'y',category:'Animals',emoji:'',idx:0,out:[],voteSel:null,outcome:null,impostorCount:1,first:0,starterShown:true};
    localStorage.setItem('impostor-party-v1',JSON.stringify(s))},n);
  await p.reload();await p.waitForSelector('.grow');
  const info=await p.evaluate(()=>{const rows=Array.from(document.querySelectorAll('.grow'));const vw=innerWidth;
    return {sizes:rows.map(r=>r.children.length),centred:rows.every(r=>{const c=Array.from(r.children).map(x=>x.getBoundingClientRect());const l=c[0].left,rr=vw-c[c.length-1].right;return Math.abs(l-rr)<2}),
      back:document.querySelector('.vote > .btn').getBoundingClientRect().bottom,vh:innerHeight,w:Math.round(rows[0].children[0].getBoundingClientRect().width)}});
  const spread=Math.max(...info.sizes)-Math.min(...info.sizes);
  t(spread<=1,`${vw}x${vh} n=${n}: rows ${info.sizes} are balanced`);t(info.centred,`n=${n}: rows centred`);t(info.back<=info.vh+1,`${vw}x${vh} n=${n}: fits on screen`);
  if(vw===390)out.push(`${n}: ${info.sizes.join('+')} (${info.w}px)`);
  if(vw===390&&[4,5,7,10].includes(n))await p.screenshot({path:`bal${n}.png`});
}
await p.close();}
console.log(out.join(' | '));console.log('checks passed:',ok);await b.close();srv.close()})();
