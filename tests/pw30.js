const { chromium } = require('playwright');const http=require('http'),fs=require('fs');const D=require('path').join(__dirname,'..')+'/';
// Saved groups: each keeps its own players, house rules, word history and scores.
const srv=http.createServer((q,r)=>{const f=q.url.startsWith('/words.json')?'words.json':'index.html';r.setHeader('content-type',f.endsWith('json')?'application/json':'text/html');r.end(fs.readFileSync(D+f))}).listen(0);
let ok=0;const t=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else ok++;if(process.env.V)console.log(c?'ok  ':'FAIL',m)};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:360,height:640}});p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts/,r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>document.getElementById('wstatus').textContent.startsWith('✓'));
const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('impostor-party-v1')));
const name=()=>p.textContent('#groupChip b');
const open=async()=>{await p.click('#groupChip');await p.waitForSelector('.sheet.groups')};
t((await name())==='My group','starts as "My group"');
// set up the first group: names, a rule, scores and some history
await p.fill('[data-name="0"]','Alice');await p.fill('[data-name="1"]','Bob');await p.click('#announce');
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('impostor-party-v1'));s.settings.scores={Alice:5};s.history={w:{'Animals::cat':2},h:{}};localStorage.setItem('impostor-party-v1',JSON.stringify(s))});
await p.reload();await p.waitForSelector('#count');
await open();t((await p.$$eval('.grow',e=>e.length))===1&&/Playing now/.test(await p.textContent('.grow.on')),'the sheet lists the current group as playing now');
await p.waitForTimeout(400);t(await p.$eval('.sheet.groups',e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight+1}),'the sheet fits at 360×640');
await p.fill('.gnew input','Work lot');await p.click('.gnew button');await p.waitForTimeout(300);
t((await name())==='Work lot','"Start fresh" creates and switches to a new group');
let s=await S();t(!s.settings.names.length&&!s.settings.announce&&!Object.keys(s.settings.scores||{}).length&&!Object.keys(s.history.w).length,'a new group starts clean: no names, default rules, no scores, no history');
t(await p.$eval('[data-name="0"]',e=>e.value==='')&&!(await p.$eval('#announce',e=>e.checked)),'the setup screen shows the clean group');
await p.fill('[data-name="0"]','Zed');await p.click('#drama [data-v="quick"]');
await open();await p.click('.gpick:not([aria-current])');await p.waitForTimeout(300);
s=await S();t((await name())==='My group'&&s.settings.names[0]==='Alice'&&s.settings.announce===true&&s.settings.scores.Alice===5&&s.history.w['Animals::cat']===2,'switching back restores players, rules, scores and word history');
t(await p.$eval('[data-name="0"]',e=>e.value==='Alice'),'and the setup screen shows them');
await open();await p.click('.gpick:not([aria-current])');await p.waitForTimeout(300);s=await S();
t((await name())==='Work lot'&&s.settings.names[0]==='Zed'&&s.settings.drama==='quick','the other group kept its own changes');
t(s.settings.seenHowto===true||s.settings.seenHowto===false,'device-wide settings carry over');
// rename
await open();await p.click('[data-gren]');await p.fill('.gren','Office lot');await p.keyboard.press('Enter');await p.waitForTimeout(250);
t((await name())==='Office lot','renaming the current group');
// delete the other group (with a confirm)
await p.click('[data-gdel]');t(/Delete "My group"/.test(await p.textContent('.sheet-q')),'deleting asks first');
await p.click('[data-sheet="no"]');await p.waitForTimeout(250);await open();t((await p.$$eval('.grow',e=>e.length))===2,'"Keep it" keeps it');
await p.click('[data-gdel]');await p.click('[data-sheet="yes"]');await p.waitForTimeout(300);
t((await p.$$eval('.grow',e=>e.length))===1&&!(await p.$('[data-gdel]')),'deleted; the current group can\'t be deleted');
await p.click('[data-sheet="close"]');
// survives a reload
await p.reload();await p.waitForSelector('#count');t((await name())==='Office lot','the current group survives a reload');
// can't switch mid-game
await p.click('[data-act="start"]');t(!(await p.$('#groupChip')),'no group switching during a round');
console.log('errors:',errs.length?errs:'none','| checks passed:',ok);await b.close();srv.close()})().catch(e=>{console.log('ERR',e.message.split('\n').slice(0,3).join(' / '),ok);process.exit(1)});
