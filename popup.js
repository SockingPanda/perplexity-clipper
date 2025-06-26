document.getElementById('extract').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  chrome.tabs.sendMessage(tab.id, {action: 'extract-perplexity'}, async res => {
    if (chrome.runtime.lastError) {
      alert('❌ ' + chrome.runtime.lastError.message);
      return;
    }
    const md = res.markdown;
    document.getElementById('output').value = md;
    try { await navigator.clipboard.writeText(md); } catch {}
  });
});
