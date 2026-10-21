const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// Regions: where you play renames words, drops other regions' local words, and never touches word history.
const LOC=JSON.stringify({categories:[{name:'Loc',emoji:'🌍',words:[
 ['torch','t1','t2','t3','t4',{us:'flashlight'}],
 ['Greggs','g1','g2','g3','g4',{in:['uk']}],
 ['Bunnings','b1','b2','b3','b4',{in:['au']}],
 ['chair','c1','c2','c3','c4'],
 ['handbag','h1','h2','h3','h4',{us:['purse','p1','p2','p3','p4']}]]}]});
const srv=http.createServer((q,r)=>{if(q.url.startsWith('/loc.json')){r.setHeader('content-type','application/json');return r.end(LOC)}
 const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];const ctxs=[];
const page=async(locale,vp={width:390,height:844})=>{const c=await b.newContext({locale,viewport:vp});ctxs.push(c);const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForSelector('#count');return p};
const ST=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')));
const set=async(p,x,url)=>{await p.evaluate(([x,u])=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{weights:{'1':100,'2':0,'3':0,'all':0},preferNew:false},x,u?{wordsUrl:u}:{});localStorage.setItem('impostor-party-v1',JSON.stringify(s))},[x,url]);
 await p.reload();await p.waitForSelector('#count');if(url)await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'))};
const home=async(p)=>{await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count')};
const sel=(p)=>p.$eval('#region button.sel',e=>e.dataset.v);

// ---- default from the phone's language
for(const [loc,want] of [['en-GB','uk'],['en-US','us'],['en-AU','au'],['fr-FR','all']]){const p=await page(loc);t(await sel(p)===want,`${loc} starts on ${want}`);}
let p=await page('en-GB');
t((await p.$$eval('#region button',e=>e.map(x=>x.textContent))).join()==='UK,US,Aus,Everywhere','four options: UK, US, Aus, Everywhere');
await p.click('#region [data-v="au"]');
t(await sel(p)==='au'&&(await ST(p)).settings.region==='au'&&/Aussie/.test(await p.textContent('#regionNote')),'picking Aus is saved and explained');
t(await p.$eval('#region [data-v="au"]',e=>e.getAttribute('aria-pressed'))==='true','aria-pressed follows the choice');
await p.reload();await p.waitForSelector('#count');t(await sel(p)==='au','the choice survives a reload');
await p.click('#announce');await p.click('[data-act="resetRules"]');const yr=await p.$('[data-sheet="yes"]');if(yr)await yr.click();await p.waitForTimeout(250);
t((await ST(p)).settings.region==='au'&&await sel(p)==='au','"Reset all to default" leaves where you play alone');

// ---- what each region gets
const draw=async(region,n=30)=>{await set(p,{region,unaware:false},'/loc.json');const got=[];for(let k=0;k<n;k++){await p.click('[data-act="start"]');const g=(await ST(p)).game;got.push(g);await home(p)}return got};
let gs=await draw('us');let shown=new Set(gs.map(g=>g.word));
t(!shown.has('Greggs')&&!shown.has('Bunnings'),'US: no UK-only or Aus-only words ('+[...shown].join(', ')+')');
t(shown.has('flashlight')&&!shown.has('torch'),'US: torch is called flashlight');
const tg=gs.find(g=>g.word==='flashlight');t(tg&&tg.wkey==='torch','US: the history key stays the base word');
const pg=gs.find(g=>g.word==='purse');t(pg&&pg.wkey==='handbag'&&pg.hints.join()==='p1,p2,p3,p4','US: a word can swap its clues too');
gs=await draw('uk');shown=new Set(gs.map(g=>g.word));
t(shown.has('Greggs')&&!shown.has('Bunnings')&&shown.has('torch')&&shown.has('handbag'),'UK: UK words in, Aus words out, base names ('+[...shown].join(', ')+')');
gs=await draw('au');shown=new Set(gs.map(g=>g.word));
t(shown.has('Bunnings')&&!shown.has('Greggs')&&shown.has('torch'),'Aus: Aus words in, UK words out ('+[...shown].join(', ')+')');
gs=await draw('all');shown=new Set(gs.map(g=>g.word));
t(!shown.has('Greggs')&&!shown.has('Bunnings')&&shown.has('torch')&&!shown.has('flashlight'),'Everywhere: only words everyone knows, base names');

// ---- fooled impostors get a word from your region too
await set(p,{region:'us',unaware:true,unawareChance:100},'/loc.json');let bad=0,fooled=0;
for(let k=0;k<20;k++){await p.click('[data-act="start"]');const g=(await ST(p)).game;g.alts.forEach((a,i)=>{if(a!=null){fooled++;if(a==='Greggs'||a==='Bunnings'||a==='torch'||a===g.word)bad++;if(a==='flashlight'&&g.altKeys[i]!=='torch')bad++}});await home(p)}
t(fooled>0&&bad===0,`fooled words follow the region, with base keys (${fooled} fooled)`);

// ---- history counts the base word, and the note counts only your region's words
await set(p,{region:'us',unaware:false},'/loc.json');
t(/of 3 words/.test(await p.textContent('#seenNote')),'US: the note counts 3 words of the 5');
await p.click('#region [data-v="uk"]');t(/of 4 words/.test(await p.textContent('#seenNote')),'switching to UK updates the count straight away');
await p.click('#region [data-v="us"]');
for(let k=0;k<12;k++){await p.click('[data-act="start"]');const g=(await ST(p)).game;if(g.word==='flashlight'){for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');break}await home(p)}
const h=(await ST(p)).history.w;t(h['Loc::torch']===1&&!h['Loc::flashlight'],'a renamed word is counted under its base name');
await home(p);

// ---- offline: the cached copy keeps the region notes
await set(p,{region:'us',unaware:false},'/loc.json');await p.route(/loc\.json/,r=>r.abort());await p.reload();await p.waitForSelector('#count');
await p.waitForFunction(()=>/last saved copy/.test(document.getElementById('wstatus').textContent));
let off=new Set();for(let k=0;k<25;k++){await p.click('[data-act="start"]');off.add((await ST(p)).game.word);await home(p)}
t(!off.has('Greggs')&&!off.has('Bunnings')&&off.has('flashlight'),'offline from the cache, regions still apply ('+[...off].join(', ')+')');
await p.unroute(/loc\.json/);

// ---- the real list: every region has plenty in every category, and local names show
const W=JSON.parse(fs.readFileSync(D+'words.json'));
const nOf=(c,r)=>c.words.filter(w=>{const n=w.find(x=>x&&typeof x==='object'&&!Array.isArray(x));return !(n&&n.in&&n.in.length&&(r==='all'||!n.in.includes(r)))}).length;
t(W.categories.every(c=>['uk','us','au','all'].every(r=>nOf(c,r)>=45)),'every category has at least 45 words in every region');
t(W.categories.every(c=>c.words.every(w=>{const n=w.find(x=>x&&typeof x==='object');return !n||Object.keys(n).every(k=>['in','uk','us','au'].includes(k))})),'region notes only use in/uk/us/au');

// ---- fits a small phone, even with big text
const s=await page('en-US',{width:360,height:640});
const fit=async(scale)=>s.evaluate((k)=>{document.querySelectorAll('#region, #region *, .regionhead, #regionNote').forEach(e=>{if(!e.dataset.fs)e.dataset.fs=parseFloat(getComputedStyle(e).fontSize);e.style.fontSize=(e.dataset.fs*k)+'px'});
 const seg=document.getElementById('region');const bs=[...seg.querySelectorAll('button')];
 return document.documentElement.scrollWidth<=innerWidth&&seg.scrollWidth<=seg.clientWidth+1&&bs.every(x=>x.scrollWidth<=x.clientWidth+1)},scale);
for(const k of [1,1.5,1.8])t(await fit(k),`region buttons fit at 360px with text ×${k}`);

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);for(const c of ctxs)await c.close();await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
