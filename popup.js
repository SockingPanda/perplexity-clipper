document.getElementById('extract').addEventListener('click', async () => {
  try {
    console.log('开始提取过程...');
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    console.log('当前标签页:', tab.url);
    
    if (!tab.url.includes('perplexity.ai/page/')) {
      alert('❌ 请在 Perplexity 文章页面使用此扩展');
      return;
    }

    chrome.tabs.sendMessage(tab.id, {action: 'extract-perplexity'}, async res => {
      console.log('收到响应:', res);
      if (chrome.runtime.lastError) {
        console.error('发生错误:', chrome.runtime.lastError);
        alert('❌ ' + chrome.runtime.lastError.message);
        return;
      }
      if (res.error) {
        alert('❌ 提取失败: ' + res.error);
        return;
      }
      const md = res.markdown;
      document.getElementById('output').value = md;
      try { 
        await navigator.clipboard.writeText(md);
        console.log('已复制到剪贴板');
      } catch (err) {
        console.error('复制到剪贴板失败:', err);
      }
    });
  } catch (err) {
    console.error('执行过程出错:', err);
    alert('❌ ' + err.message);
  }
});
