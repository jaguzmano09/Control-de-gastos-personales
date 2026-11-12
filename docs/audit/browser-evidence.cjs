const { spawn } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('C:/Users/lenovo/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
(async () => {
  const result = { scope: 'Unauthenticated local production build only', pages: [], assets: [], errors: [] };
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','-p','3000'], { windowsHide:true, stdio:['ignore','ignore','pipe'] });
  let stderr = ''; server.stderr.on('data', b => { stderr += b.toString(); });
  let browser;
  try {
    let ready = false;
    for (let i=0;i<40;i++) {
      try { const r=await fetch('http://127.0.0.1:3000/login', {signal:AbortSignal.timeout(2000)}); if(r.ok){ready=true;break;} } catch {}
      await new Promise(r=>setTimeout(r,500));
    }
    if(!ready) throw new Error('Production server did not become ready');
    browser = await chromium.launch({executablePath:'C:/Users/lenovo/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe', headless:true, timeout:20000});
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const context = await browser.newContext({viewport, serviceWorkers:'block'});
      const page = await context.newPage();
      const consoleErrors=[]; page.on('pageerror',e=>consoleErrors.push(e.message));
      await page.goto('http://127.0.0.1:3000/login',{waitUntil:'networkidle',timeout:20000});
      await page.screenshot({path:'docs/audit/login-'+viewport.width+'.png',fullPage:true});
      result.pages.push({path:'/login',viewport,consoleErrors,layout:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent,inputs:[...document.querySelectorAll('input')].map(e=>({type:e.type,labels:e.labels?.length}))}))});
      await context.close();
    }
    for(const path of ['/manifest.webmanifest','/sw.js','/offline.html','/privacidad','/seguridad','/soporte']){
      const response=await fetch('http://127.0.0.1:3000'+path,{redirect:'manual',signal:AbortSignal.timeout(10000)});
      result.assets.push({path,status:response.status,location:response.headers.get('location'),type:response.headers.get('content-type')});
    }
  } catch(e) {result.errors.push(e.message);}
  finally { if(browser) await browser.close(); server.kill(); result.serverStopped=server.killed; result.serverErrors=stderr; fs.writeFileSync('docs/audit/browser-evidence-2026-11-11.json',JSON.stringify(result,null,2)); console.log(JSON.stringify(result)); }
})();
