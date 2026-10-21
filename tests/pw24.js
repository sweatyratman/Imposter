const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const MINI=JSON.stringify({categories:[{name:'Mini',emoji:'🧪',words:Array.from({length:20},(_,i)=>['word'+i,'a'+i,'b'+i,'c'+i,'d'+i])}]});
const ONE=JSON.stringify({categories:[{name:'One',emoji:'1️⃣',words:[['alpha','h1','h2','h3','h4'],['beta','k1','k2','k3','k4']]}]});
const srv=http.createServer((q,r)=>{if(q.url.startsWith('/mini.json')||q.url.startsWith('/one.json')){r.setHeader('content-type','application/json');return r.end(q.url.startsWith('/mini')?MINI:ONE)}
 const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(extra={},url='',hist=null)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForSelector('#count');
 await p.evaluate(([x,u,h])=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{weights:{'1':100,'2':0,'3':0,'all':0},wordsUrl:u},x);if(h)s.history=h;localStorage.setItem('impostor-party-v1',JSON.stringify(s))},[extra,url,hist]);
 await p.reload();await p.waitForSelector('#count');if(url)await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));return p};
const ST=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')));
const home=async(p)=>{await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count')};
const dealAll=async(p,g)=>{for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}};

// ---- setting
let p=await mk({});
t(await p.$eval('#prefernew',e=>e.checked),'default: prefer words not seen is ON');
t(/played 0 of \d+ words/.test(await p.textContent('#seenNote')),'note shows progress through the list');
t(await p.$eval('#resetHistory',e=>e.disabled),'reset history disabled while there is none');
await p.click('#prefernew');t((await ST(p)).settings.preferNew===false&&/Off: every word is equally likely/.test(await p.textContent('#seenNote')),'turning it off is saved and explained');
t(await p.$eval('[data-act="resetRules"]',e=>!e.disabled),'reset-all becomes available');
await p.click('[data-act="resetRules"]');const yy=await p.$('[data-sheet="yes"]');if(yy)await yy.click();await p.waitForTimeout(250);
t(await p.$eval('#prefernew',e=>e.checked)&&(await ST(p)).settings.preferNew===true,'"Reset all to default" turns it back on');

// ---- counting happens when the starter is announced, once
await p.click('[data-act="start"]');let g=(await ST(p)).game;
t(Object.keys((await ST(p)).history.w).length===0&&!g.counted,'dealt but not yet counted');
await dealAll(p,g);t(Object.keys((await ST(p)).history.w).length===0,'still not counted after everyone has seen their card');
await p.click('[data-act="skipShuffle"]');let h=(await ST(p)).history;const key=g.category+'::'+g.word;
t(h.w[key]===1&&Object.keys(h.w).length===1,'counted once the first player is chosen ('+key+')');
await p.click('[data-act="ready"]');t((await ST(p)).history.w[key]===1,'moving on does not count it twice');
await home(p);await p.click('[data-act="start"]');g=(await ST(p)).game;await home(p);
t(Object.keys((await ST(p)).history.w).length===1,'a round abandoned before the starter is announced is not counted');
t(/played 1 of/.test(await p.textContent('#seenNote'))&&!(await p.$eval('#resetHistory',e=>e.disabled)),'note updates and reset history becomes available');
await p.click('#resetHistory');const y1=await p.$('[data-sheet="yes"]');if(y1)await y1.click();await p.waitForTimeout(250);
t(Object.keys((await ST(p)).history.w).length===0&&/played 0 of/.test(await p.textContent('#seenNote')),'reset word history clears it');
await p.close();

// ---- weighting: 19 well-worn words and one fresh one
const worn={};for(let i=1;i<20;i++)worn['Mini::word'+i]=5;
const sample=async(prefer)=>{const q=await mk({preferNew:prefer},'/mini.json',{w:worn,h:{}});let fresh=0;const N=60;
 for(let k=0;k<N;k++){await q.click('[data-act="start"]');const gg=(await ST(q)).game;if(gg.word==='word0')fresh++;await home(q)}await q.close();return fresh/N};
const on=await sample(true),off=await sample(false);
t(on>0.4,'on: the one unseen word is picked far more than 1 in 20 ('+Math.round(on*100)+'%)');
t(off<0.25,'off: plain random, the unseen word gets no special treatment ('+Math.round(off*100)+'%)');

// ---- clues rotate to ones not seen
const play=async(q)=>{await q.click('[data-act="start"]');const gg=(await ST(q)).game;await dealAll(q,gg);await q.click('[data-act="skipShuffle"]');const clue=gg.clue.find(Boolean);await home(q);return [gg.word,clue]};
const seqOn=[];let q=await mk({preferNew:true,categories:['One']},'/one.json');
for(let k=0;k<6;k++)seqOn.push(await play(q));
const byWord={};seqOn.forEach(([w,c])=>{(byWord[w]=byWord[w]||[]).push(c)});
const rot=Object.values(byWord).every(cs=>cs.every((c,i)=>c===['h1','h2','h3','h4','h1','h2'][i]||c===['k1','k2','k3','k4','k1','k2'][i]));
t(rot&&Object.values(byWord).some(cs=>cs.length>=2),'on: a returning word hands out its next unseen clue ('+JSON.stringify(byWord)+')');
t(Object.values(byWord).every(cs=>/1$/.test(cs[0])),'the first time a word appears its existing clue (clue 1) leads');
await q.close();
const seqOff=[];q=await mk({preferNew:false,categories:['One']},'/one.json');for(let k=0;k<5;k++)seqOff.push((await play(q))[1]);
t(seqOff.every(c=>/1$/.test(c)),'off: clue 1 every time ('+seqOff.join(',')+')');
// the counts under it are still kept while off, so switching on later works
const hh=(await ST(q)).history;t(Object.values(hh.w).reduce((x,y)=>x+y,0)===5,'history keeps filling while the preference is off');
await q.close();

// ---- what does not count
q=await mk({showHint:false,categories:['One']},'/one.json');await play(q);let hs=(await ST(q)).history;
t(Object.keys(hs.w).length===1&&Object.keys(hs.h).length===0,'clues off: the word counts, no clue does');
await q.close();
q=await mk({unaware:true,unawareChance:100,categories:['One']},'/one.json');await play(q);hs=(await ST(q)).history;
t(Object.keys(hs.w).length===1&&Object.keys(hs.h).length===0,'a fooled impostor sees no clue, so none is counted');
await q.close();
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
