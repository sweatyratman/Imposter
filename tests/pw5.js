const { chromium } = require('playwright');
const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const url=`http://localhost:${srv.address().port}/`;await p.goto(url);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++};
const sel=()=>p.$$eval('#cats .chip.sel',e=>e.map(x=>x.dataset.cat));const chip=n=>p.click(`#cats .chip[data-cat="${n}"]`);
const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const G=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const note=()=>p.textContent('#catnote');
t((await sel()).join()==='random','Random selected by default');
await chip('Animals');t((await sel()).join()==='Animals','picking Animals un-selects Random');
await chip('Music');await chip('Jobs');t((await sel()).sort().join()==='Animals,Jobs,Music','three categories selected at once');
t((await note()).includes('3 chosen'),'note describes 3 chosen categories');
await chip('Music');t((await sel()).sort().join()==='Animals,Jobs','tap again deselects');
await chip('random');t((await sel()).join()==='random'&&(await S()).categories.length===0,'Random clears all other categories');
await chip('Films');await chip('Actors');
t((await sel()).sort().join()==='Actors,Films','Films+Actors selected');
await p.reload();await p.waitForSelector('#cats .chip.sel');t((await sel()).sort().join()==='Actors,Films','multi-selection persists on reload');
await chip('Films');await chip('Actors');t((await sel()).join()==='random','deselecting the last category falls back to Random');
// rounds only use chosen categories
await chip('Films');await chip('Music');
const seen=new Set();
for(let r=0;r<30;r++){await p.click('[data-act="start"]');seen.add((await G()).category);await p.click('[data-nav="home"]');if(await p.$('[data-sheet="yes"]'))await p.click('[data-sheet="yes"]');}
t([...seen].sort().join()==='Films,Music','30 rounds drew only from chosen categories, both used: '+[...seen].join('/'));
// random uses many
await chip('random');const all=new Set();
for(let r=0;r<40;r++){await p.click('[data-act="start"]');all.add((await G()).category);await p.click('[data-nav="home"]');if(await p.$('[data-sheet="yes"]'))await p.click('[data-sheet="yes"]');}
t(all.size>=8,'Random drew '+all.size+' different categories over 40 rounds');
// migration from old single-category save
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));s.settings={playerCount:5,names:[],category:'Jobs',weights:{1:70,2:20,3:7,all:3},announce:false,wordsUrl:''};delete s.settings.categories;s.game=null;localStorage.setItem('impostor-party-v1',JSON.stringify(s))});
await p.reload();await p.waitForSelector('#cats .chip.sel');t((await sel()).join()==='Jobs','old saved single category migrates');
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await p.click('#cats .chip[data-cat="Animals"]');await p.screenshot({path:'cats.png',fullPage:false});await b.close();srv.close()})();
