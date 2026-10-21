const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(weights,w=390,h=844)=>{const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForSelector('#count');
 await p.evaluate((x)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{weights:x});localStorage.setItem('impostor-party-v1',JSON.stringify(s))},weights);
 await p.reload();await p.waitForSelector('#count');return p};
const G=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const deal=async(p,g)=>{for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]')};
const vote=async(p,i)=>{await p.click(`[data-act="pickvote"][data-i="${i}"]`);await p.click('[data-act="confirm"]');await p.waitForSelector('.after',{timeout:12000})};
// 1) odds are 100% one impostor: catching it ends the voting
let p=await mk({'1':100,'2':0,'3':0,'all':0});await p.click('[data-act="start"]');let g=await G(p);
t(g.maxPossible===1,'the round remembers the most impostors the odds allow (1)');
await deal(p,g);await vote(p,g.impostors.findIndex(Boolean));
t(!(await p.$('[data-act="again"]'))&&!!(await p.$('[data-act="stop"]')),'one possible impostor, one caught: no "Vote again", only "We\'re done"');
const bb=await p.$eval('[data-act="stop"]',e=>{const r=e.getBoundingClientRect();return [r.bottom,innerHeight,r.width]});t(bb[0]<=bb[1]&&bb[2]>200,'the single button is on screen and full width ('+Math.round(bb[2])+'px)');
await p.click('[data-act="stop"]');await p.waitForSelector('[data-act="judgeNo"],[data-act="judgeYes"]');t(true,'We\'re done goes on to the guess');
await p.close();
// 2) exactly two impostors always: after the first, vote again; after the second, finished
p=await mk({'1':0,'2':100,'3':0,'all':0});await p.click('[data-act="start"]');g=await G(p);t(g.maxPossible===2&&g.impostorCount===2,'two always');
await deal(p,g);const imps=g.impostors.map((v,i)=>v?i:-1).filter(i=>i>=0);
await vote(p,imps[0]);t(!!(await p.$('[data-act="again"]'))&&!!(await p.$('[data-act="stop"]')),'two possible, one caught: both buttons');
await p.click('[data-act="again"]');await vote(p,imps[1]);
t(!(await p.$('[data-act="again"]'))&&!!(await p.$('[data-act="stop"]')),'two possible, both caught: no "Vote again"');
await p.close();
// 3) odds allow more than were caught (default-like): both buttons stay, whatever the real count
p=await mk({'1':70,'2':20,'3':7,'all':3});await p.click('[data-act="start"]');g=await G(p);
t(g.maxPossible===g.players.length,'with "everyone" possible the maximum is everyone');
await deal(p,g);await vote(p,g.impostors.findIndex(Boolean));
t(!!(await p.$('[data-act="again"]'))&&!!(await p.$('[data-act="stop"]')),'odds still allow more: both buttons, nothing given away');
await p.close();
// 4) a 1-or-2 split: after catching one, you cannot know, so both buttons
p=await mk({'1':50,'2':50,'3':0,'all':0});await p.click('[data-act="start"]');g=await G(p);t(g.maxPossible===2,'1-or-2 odds: maximum 2');
await deal(p,g);await vote(p,g.impostors.findIndex(Boolean));
t(!!(await p.$('[data-act="again"]')),'1-or-2 odds, one caught: Vote again stays (the count could be 2)');
await p.close();
// 5) small phone fit
p=await mk({'1':100,'2':0,'3':0,'all':0},360,640);await p.click('[data-act="start"]');g=await G(p);await deal(p,g);await vote(p,g.impostors.findIndex(Boolean));
t(await p.$eval('[data-act="stop"]',e=>e.getBoundingClientRect().bottom<=innerHeight),'360x640: the button is on screen');
await p.close();
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n')[0],ok);process.exit(1)});
