const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait(sel,t=6000){const s=performance.now();
  while(performance.now()-s<t){const e=document.querySelector(sel);if(e)return e;await sleep(200);}
}
async function extract() {
  const tEl = await wait('main h1') || await wait('[data-testid="page-heading"]');
  let md = `# ${(tEl?.textContent||'Untitled').trim()}\n\n`;
  const img = document.querySelector('main img[src^="https"]');
  if (img) md += `![hero image](${img.currentSrc||img.src})\n\n`;
  document.querySelectorAll('main h2').forEach(h2=>{
    md+=`## ${h2.textContent.trim()}\n\n`;
    let cur=h2.nextElementSibling;
    while(cur && cur.tagName!=='H2'){if(!cur.matches('blockquote,aside,nav'))
      md+=cur.innerText.trim()+"\n\n";cur=cur.nextElementSibling;}
  });
  return md.trim();
}
chrome.runtime.onMessage.addListener((m,_,s)=>{
  if(m.action==='extract-perplexity'){extract().then(r=>s({markdown:r}));return true;}
});
