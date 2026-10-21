const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// Scoring: crew 1 each; impostors 2 each (3 for a lone impostor); caught impostors 0 unless their guess wins it.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(x)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
 await p.evaluate((x)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{playerCount:5,maxImpostors:3,guessRule:'impostors',unaware:false},x);s.settings.scores={};localStorage.setItem('impostor-party-v1',JSON.stringify(s))},x);
 await p.reload();await p.waitForSelector('#count');await p.click('[data-act="start"]');return p};
const G=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const deal=async(p,g)=>{for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]')};
const vote=async(p,i)=>{await p.click(`[data-act="pickvote"][data-i="${i}"]`);await p.click('[data-act="confirm"]');await p.waitForSelector('.after',{timeout:12000})};
const getAway=async(p)=>{await p.mouse.click(195,300);await p.waitForSelector('[data-act="unmask"]');await p.click('[data-act="unmask"]');await p.click('[data-act="toResults"]');await p.waitForSelector('.result-head')};
const guess=async(p,yes)=>{const nx=await p.$('button[data-act="verdictNext"]');if(nx)await nx.click();await p.waitForSelector('[data-act="judgeYes"]',{timeout:12000});await p.click(yes?'[data-act="judgeYes"]':'[data-act="judgeNo"]');await p.waitForSelector('.result-head')};
const pts=async(p)=>(await G(p)).outcome.scored;
const idx=(g,imp)=>g.impostors.map((v,i)=>v===imp?i:-1).filter(i=>i>=0);
const same=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
const want=(ids,v)=>Object.fromEntries(ids.map(i=>[String(i),v]));
let p,g,s;

// crew catch the lone impostor, who misses the word
p=await mk({weights:{1:100,2:0,3:0,all:0}});g=await G(p);await deal(p,g);await vote(p,idx(g,true)[0]);await p.click('[data-act="stop"]');await guess(p,false);
t(same(await pts(p),want(idx(g,false),1)),'crew win: 1 point per crewmate, the impostor nothing');
t((await p.$$eval('.srow em',e=>e.map(x=>x.textContent))).every(x=>x==='+1'),'results show +1 for each crewmate');
t(/lone impostor/.test(await p.textContent('.scores')),'the results explain the scoring');await p.close();

// a lone impostor gets away
p=await mk({weights:{1:100,2:0,3:0,all:0}});g=await G(p);await deal(p,g);await vote(p,idx(g,false)[0]);await getAway(p);
t(same(await pts(p),want(idx(g,true),3)),'a lone impostor who wins gets 3');
t((await p.$$eval('.srow em',e=>e.map(x=>x.textContent))).join()==='+3','results show +3');
const sc=(await p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings.scores));t(sc[g.players[idx(g,true)[0]]]===3,'the leaderboard total goes up by 3');
await p.click('[data-nav="board"]');t(/lone impostor/.test(await p.textContent('.sheet.board')),'the leaderboard explains the scoring');await p.close();

// two impostors: one caught, the crew stop while the other hides
p=await mk({weights:{1:0,2:100,3:0,all:0}});g=await G(p);await deal(p,g);let im=idx(g,true);await vote(p,im[0]);await p.click('[data-act="stop"]');await getAway(p);
t(same(await pts(p),want([im[1]],2)),'two impostors: the one who got away gets 2, the caught one nothing');await p.close();

// two impostors: one caught, then the crew vote out a crewmate
p=await mk({weights:{1:0,2:100,3:0,all:0}});g=await G(p);await deal(p,g);im=idx(g,true);await vote(p,im[0]);await p.click('[data-act="again"]');await vote(p,idx(g,false)[0]);await getAway(p);
t(same(await pts(p),want([im[1]],2)),'caught impostors score nothing even when their team wins');await p.close();

// caught lone impostor guesses the word
p=await mk({weights:{1:100,2:0,3:0,all:0}});g=await G(p);await deal(p,g);await vote(p,idx(g,true)[0]);await p.click('[data-act="stop"]');await guess(p,true);
t(same(await pts(p),want(idx(g,true),3)),'a caught lone impostor whose guess wins gets 3');await p.close();

// both impostors caught, and their guess wins
p=await mk({weights:{1:0,2:100,3:0,all:0}});g=await G(p);await deal(p,g);im=idx(g,true);await vote(p,im[0]);await p.click('[data-act="again"]');await vote(p,im[1]);await p.click('[data-act="stop"]');await guess(p,true);
t(same(await pts(p),want(im,2)),'caught impostors whose guess wins get 2 each');await p.close();

// guess rules: nobody wins / crew still win
p=await mk({weights:{1:100,2:0,3:0,all:0},guessRule:'nobody'});g=await G(p);await deal(p,g);await vote(p,idx(g,true)[0]);await p.click('[data-act="stop"]');await guess(p,true);
t(same(await pts(p),{}),'"Nobody wins": nobody scores');t(!(await p.$('.srow em')),'no +points shown');await p.close();
p=await mk({weights:{1:100,2:0,3:0,all:0},guessRule:'crew'});g=await G(p);await deal(p,g);await vote(p,idx(g,true)[0]);await p.click('[data-act="stop"]');await guess(p,true);
t(same(await pts(p),want(idx(g,false),1)),'"Crew still win": 1 per crewmate, impostors nothing');await p.close();

// last two: 1 crewmate and 1 impostor, the impostor guesses
p=await mk({playerCount:3,weights:{1:0,2:100,3:0,all:0}});g=await G(p);await deal(p,g);im=idx(g,true);await vote(p,im[0]);await guess(p,true);
t(same(await pts(p),want([im[1]],2)),'last two: the surviving impostor who guesses gets 2, the caught one nothing');await p.close();

// everyone is an impostor, two left: both win
p=await mk({playerCount:3,weights:{1:0,2:0,3:0,all:100}});g=await G(p);await deal(p,g);await vote(p,0);await p.waitForSelector('.result-head',{timeout:12000});
t(same(await pts(p),want([1,2],2)),'everyone an impostor, two left: both get 2, the caught one nothing');await p.close();

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
