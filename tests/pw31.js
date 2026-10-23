const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// Optional fairness rules, Mr White, ties, scoring tweaks and reveal sounds.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(x={},vp={width:360,height:640})=>{const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
 await p.addInitScript(()=>{window.__sfx=[];window.addEventListener('impostor-sfx',e=>window.__sfx.push(e.detail))});
 await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
 await p.evaluate((x)=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1')||'{}');s.settings=Object.assign(s.settings||{},{playerCount:5,maxImpostors:3,seenHowto:true,unaware:false,guessRule:'impostors',scores:{}},x);localStorage.setItem('impostor-party-v1',JSON.stringify(s))},x);
 await p.reload();await p.waitForSelector('#count');return p};
const G=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).game);
const S=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')).settings);
const home=async(p)=>{await p.click('[data-nav="home"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForSelector('#count')};
const deal=async(p,g)=>{for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');await p.click('[data-act="hide"]')}await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]')};
const vote=async(p,i)=>{await p.click(`[data-act="pickvote"][data-i="${i}"]`);await p.click('[data-act="confirm"]');await p.waitForSelector('.after',{timeout:12000})};
const ONE={1:100,2:0,3:0,all:0},TWO={1:0,2:100,3:0,all:0};
let p,g,s;

// ---- defaults: all off; Beginner turns on the fairness helpers
p=await mk();s=await S(p);t(!s.fairStart&&!s.noRepeat&&!s.mrWhite&&!s.accuserBonus&&!s.guessHalf&&s.firstTo===0&&s.tieRule==='revote','every new rule is off by default (ties re-vote)');
await p.click('#preset [data-v="beginner"]');s=await S(p);t(s.fairStart&&s.noRepeat&&!s.mrWhite,'Beginner switches on "impostor never first" and "avoid repeats"');
await p.click('[data-act="resetRules"]');await p.click('[data-sheet="yes"]');await p.waitForTimeout(250);s=await S(p);t(!s.fairStart&&!s.noRepeat,'Reset all house rules turns them off');
await p.close();

// ---- the impostor never goes first
p=await mk({weights:ONE,fairStart:true});let bad=0;for(let k=0;k<30;k++){await p.click('[data-act="start"]');g=await G(p);if(g.impostors[g.first])bad++;await home(p)}
t(bad===0,'fair start on: the starter was never the impostor in 30 deals');await p.close();
p=await mk({weights:ONE,fairStart:false});let impFirst=0;for(let k=0;k<40;k++){await p.click('[data-act="start"]');g=await G(p);if(g.impostors[g.first])impFirst++;await home(p)}
t(impFirst>0,`fair start off: the impostor can start (${impFirst}/40)`);await p.close();

// ---- avoid the same impostor twice in a row
const repeats=async(on)=>{const q=await mk({weights:ONE,noRepeat:on,playerCount:4});let last=null,rep=0,n=0;for(let k=0;k<50;k++){await q.click('[data-act="start"]');const gg=await G(q);const imp=gg.players[gg.impostors.findIndex(Boolean)];if(last!==null){n++;if(imp===last)rep++}last=imp;await home(q)}await q.close();return rep/n};
const rOn=await repeats(true),rOff=await repeats(false);
t(rOn<0.16,`avoid repeats on: back-to-back impostor rare (${Math.round(rOn*100)}%, about 8% expected)`);t(rOff>0.12,`off: plain odds (${Math.round(rOff*100)}%, about 25% expected)`);

// ---- Mr White
p=await mk({weights:TWO,mrWhite:true});await p.click('[data-act="start"]');g=await G(p);
const w=g.white;t(w!=null&&g.impostors[w]&&g.clue[w]==null&&g.impostors.filter(Boolean).length===2,'Mr White on, 2 impostors: one of them has no clue');
for(let i=0;i<g.players.length;i++){await p.click('[data-act="reveal"]');if(i===w){await p.waitForTimeout(300);t(/Mr White/.test(await p.textContent('.deal-card .cface'))&&/No word, no clue/.test(await p.textContent('.deal-card .cface')),'Mr White\'s card says so')}await p.click('[data-act="hide"]')}
await p.click('[data-act="skipShuffle"]');await p.click('[data-act="ready"]');
const crew=g.impostors.findIndex(v=>!v);await vote(p,crew);await p.mouse.click(180,300);await p.waitForSelector('[data-act="unmask"]');await p.click('[data-act="unmask"]');await p.click('[data-act="toResults"]');await p.waitForSelector('.roster');
t(/Mr White/.test(await p.textContent('.roster'))&&/Mr White \(no clue\)/.test(await p.textContent('.ledger')),'results name Mr White');
{const sc=(await G(p)).outcome.scored,other=g.impostors.findIndex((v,i)=>v&&i!==w);t(sc[w]===3&&sc[other]===2,'Mr White gets +1 on a win ('+JSON.stringify(sc)+')');}
await home(p);let firsts=0;for(let k=0;k<30;k++){await p.click('[data-act="start"]');const h=await G(p);if(h.white!=null&&h.first===h.white)firsts++;await home(p)}
t(firsts===0,'Mr White never goes first (30 rounds)');await p.close();
p=await mk({weights:ONE,mrWhite:true});await p.click('[data-act="start"]');g=await G(p);t(g.white==null,'with a lone impostor there is no Mr White');await p.close();

// ---- ties
p=await mk({weights:ONE,tieRule:'revote'});await p.click('[data-act="start"]');g=await G(p);await deal(p,g);
t(!!(await p.$('[data-act="tie"]')),'the vote screen has "It\'s a tie"');
await p.click('[data-act="tie"]');t(/Who's tied/.test(await p.textContent('.vote-title'))&&await p.$eval('[data-act="tieBreak"]',e=>e.disabled),'tie: pick the tied players (needs 2)');
await p.click('[data-act="tiepick"][data-i="1"]');await p.click('[data-act="tiepick"][data-i="3"]');t(await p.$eval('[data-act="tieBreak"]',e=>!e.disabled)&&(await p.$$eval('.gcard.tied',e=>e.length))===2,'tapping marks them');
await p.click('[data-act="tieBreak"]');await p.waitForTimeout(300);
t((await p.$$eval('.gcard',e=>e.length))===2&&/one more clue/.test(await p.textContent('.vote-head')),'re-vote: only the tied players are left to vote between');
t(await p.evaluate(()=>{const f=document.querySelector('.votefoot').getBoundingClientRect();return f.bottom<=innerHeight}),'tie-break fits at 360×640');
await p.click('[data-act="tieCancel"]');t((await p.$$eval('.gcard',e=>e.length))===5,'cancel goes back to everyone');
await p.close();
p=await mk({weights:ONE,tieRule:'random'});await p.click('[data-act="start"]');g=await G(p);await deal(p,g);
await p.click('[data-act="tie"]');await p.click('[data-act="tiepick"][data-i="0"]');await p.click('[data-act="tiepick"][data-i="2"]');await p.click('[data-act="tieBreak"]');await p.waitForTimeout(300);
g=await G(p);t([0,2].includes(g.voteSel)&&/broken at random/.test(await p.textContent('.stage-head')),'random: one of the tied is picked for you');await p.close();
p=await mk({weights:ONE,tieRule:'starter'});await p.click('[data-act="start"]');g=await G(p);await deal(p,g);
await p.click('[data-act="tie"]');await p.click('[data-act="tiepick"][data-i="0"]');await p.click('[data-act="tiepick"][data-i="2"]');await p.click('[data-act="tieBreak"]');await p.waitForTimeout(300);
t(new RegExp(g.players[g.first]+' decides').test(await p.textContent('.vote-head')),'first player: they decide');await p.close();

// ---- sounds: the same until the peel for crew and impostor; off means no audio
const sounds=async(imp)=>{const q=await mk({weights:ONE,playerCount:4});await q.click('[data-act="start"]');const gg=await G(q);await deal(q,gg);await vote(q,gg.impostors.findIndex(v=>v===imp));await q.waitForTimeout(1500);const l=await q.evaluate(()=>window.__sfx);await q.close();return l};
const sc=await sounds(false),si=await sounds(true);
t(JSON.stringify(sc.slice(0,sc.indexOf('rip')+1))===JSON.stringify(si.slice(0,si.indexOf('rip')+1))&&sc.indexOf('rip')===3,'reveal sounds: three thumps then the rip, identical for crew and impostor ('+sc.join(',')+')');
t(sc.includes('sigh')&&!sc.includes('hit')&&si.includes('hit'),'then a sigh for crew, a hit for an impostor');
p=await mk();t(await p.$eval('#sound',e=>e.checked),'sound effects on by default');await p.click('#sound');t((await S(p)).sound===false,'and can be switched off');
await p.click('#announce');await p.click('[data-act="resetRules"]');const y=await p.$('[data-sheet="yes"]');if(y)await y.click();await p.waitForTimeout(250);t((await S(p)).sound===false,'sound is a device setting, not reset with the house rules');await p.close();

// ---- scoring tweaks
p=await mk({weights:ONE,accuserBonus:true});await p.click('[data-act="start"]');g=await G(p);await deal(p,g);const imp=g.impostors.findIndex(Boolean);await vote(p,imp);
t(!!(await p.$('.credit'))&&!(await p.$(`.credit [data-i="${imp}"]`)),'accuser bonus: "Who called it?" lists everyone but the caught impostor');
const caller=g.impostors.findIndex(v=>!v);await p.click(`.credit [data-i="${caller}"]`);t(await p.$eval(`.credit [data-i="${caller}"]`,e=>e.classList.contains('sel')),'tap to credit');
t(await p.evaluate(()=>{const b=document.querySelector('[data-act="stop"]').getBoundingClientRect();return b.bottom<=innerHeight+1}),'360×640: the buttons still fit under the chips');
await p.click('[data-act="stop"]');await p.click('[data-act="judgeNo"]');await p.waitForSelector('.roster');g=await G(p);
t(g.outcome.scored[caller]===2,'the caller gets 1 for the crew win + 1 bonus');await p.close();
p=await mk({weights:ONE,guessHalf:true});await p.click('[data-act="start"]');g=await G(p);await deal(p,g);await vote(p,g.impostors.findIndex(Boolean));await p.click('[data-act="stop"]');await p.click('[data-act="judgeYes"]');await p.waitForSelector('.roster');g=await G(p);
t(g.outcome.scored[g.impostors.findIndex(Boolean)]===1,'a stolen win pays 1 point');await p.close();
p=await mk({weights:ONE,firstTo:5,scores:{}});await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));s.settings.scores={'Player 1':4,'Player 2':4,'Player 3':4,'Player 4':4,'Player 5':4};localStorage.setItem('impostor-party-v1',JSON.stringify(s))});await p.reload();await p.waitForSelector('#count');
await p.click('[data-act="start"]');g=await G(p);await deal(p,g);await vote(p,g.impostors.findIndex(Boolean));await p.click('[data-act="stop"]');await p.click('[data-act="judgeNo"]');await p.waitForSelector('.roster');
t(/wins? the game/.test(await p.textContent('.champ'))&&/First to 5/.test(await p.textContent('.champ')),'play to 5: a champion banner');
await p.click('[data-act="newMatch"]');await p.click('[data-sheet="yes"]');await p.waitForTimeout(300);s=await S(p);t(!Object.values(s.scores||{}).some(v=>v>0)&&(await G(p)).screen==='pass','"New game" resets scores and deals');
await p.close();

console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
