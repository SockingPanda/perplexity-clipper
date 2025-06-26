const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait(sel, t=6000) {
  const s = performance.now();
  while(performance.now()-s < t) {
    const e = document.querySelector(sel);
    if(e) return e;
    await sleep(200);
  }
}

function getElementByXPath(xpath) {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function getAllElementsByXPath(xpath) {
  const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const elements = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    elements.push(result.snapshotItem(i));
  }
  return elements;
}

function processContent(element) {
  // 创建一个副本以进行处理
  const container = document.createElement('div');
  container.innerHTML = element.innerHTML;

  // 处理所有引用链接
  const citations = container.querySelectorAll('a.citation');
  citations.forEach(citation => {
    const number = citation.querySelector('span span').textContent;
    const href = citation.getAttribute('href');
    const title = citation.getAttribute('aria-label');
    citation.outerHTML = `[${number}](${href} "${title}")`;
  });

  // 处理无序列表
  const unorderedLists = container.querySelectorAll('ul');
  unorderedLists.forEach(ul => {
    const items = ul.querySelectorAll('li');
    const listContent = Array.from(items).map(li => {
      // 获取段落内容，如果有多个段落，用换行符连接
      const paragraphs = li.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.innerHTML.trim())
        .join('\n');
      return `- ${content}`;
    }).join('\n');
    ul.outerHTML = '\n' + listContent + '\n';
  });

  // 处理有序列表
  const orderedLists = container.querySelectorAll('ol');
  orderedLists.forEach(ol => {
    const items = ol.querySelectorAll('li');
    const listContent = Array.from(items).map((li, index) => {
      // 获取段落内容，如果有多个段落，用换行符连接
      const paragraphs = li.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.innerHTML.trim())
        .join('\n');
      return `${index + 1}. ${content}`;
    }).join('\n');
    ol.outerHTML = '\n' + listContent + '\n';
  });

  // 处理段落
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (!p.closest('li')) { // 如果段落不在列表项内，添加额外的换行
      p.outerHTML = p.innerHTML + '\n\n';
    }
  });

  // 获取处理后的文本，并清理多余的空行
  let content = container.textContent
    .trim()
    .replace(/\n{3,}/g, '\n\n'); // 将3个或更多换行符替换为2个

  return content;
}

async function extract() {
  console.log('开始提取内容...');
  
  // 获取标题
  const titleXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[1]/div/div[1]/div/div/div/div/div/span';
  const titleEl = getElementByXPath(titleXPath);
  const mainTitle = titleEl?.textContent?.trim() || 'Untitled';
  console.log('📌 主标题:', mainTitle);
  let md = `# ${mainTitle}\n\n`;

  // 获取文章描述
  const descXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[1]/div/div[2]';
  const descEl = getElementByXPath(descXPath);
  if (descEl) {
    const description = processContent(descEl);
    console.log('📝 文章描述:', description ? description.substring(0, 100) + (description.length > 100 ? '...' : '') : '(无描述)');
    if (description) {
      md += `> ${description}\n\n`;
    }
  }

  // 获取大图
  const imgXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[2]/div/div/div/div/div/div/div/div[1]/div/div/div/img';
  const img = getElementByXPath(imgXPath);
  console.log('🖼 图片URL:', img?.src);
  if (img && img.src) {
    md += `![hero image](${img.src})\n\n`;
  }

  // 获取所有段落
  const baseXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div';
  const sections = getAllElementsByXPath(baseXPath + '[position()>=3]');
  console.log('📑 找到段落数量:', sections.length);

  let shouldContinue = true;
  sections.forEach((section, index) => {
    if (!shouldContinue) return;

    console.log(`\n--- 段落 ${index + 1} ---`);
    const sectionNumber = index + 3; // 因为从div[3]开始

    // 获取段落标题
    const titleXPath = `//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[${sectionNumber}]/div/div/div[1]/div[1]`;
    const titleEl = getElementByXPath(titleXPath);
    const title = titleEl?.textContent?.trim() || '';
    
    // 如果标题包含"相关"，则停止提取
    if (title.includes('相关')) {
      console.log('🚫 遇到"相关"标题，停止提取');
      shouldContinue = false;
      return;
    }

    console.log('📌 段落标题:', title || '(无标题)');
    if (title) {
      md += `## ${title}\n\n`;
    }

    // 获取段落正文
    const contentXPath = `//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[${sectionNumber}]/div/div/div[1]/div[2]`;
    const contentEl = getElementByXPath(contentXPath);
    if (contentEl) {
      const content = processContent(contentEl);
      console.log('📝 段落内容:', content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : '(无内容)');
      if (content) {
        md += `${content}\n\n`;
      }
    }
  });

  console.log('\n✅ Markdown 生成完成！');
  return md.trim();
}

chrome.runtime.onMessage.addListener((m,_,s)=>{
  console.log('收到消息:', m);
  if(m.action==='extract-perplexity'){
    console.log('开始处理提取请求');
    extract().then(r=>{
      console.log('提取成功，准备发送响应');
      s({markdown:r});
    }).catch(err => {
      console.error('❌ 提取过程出错:', err);
      s({error: err.message});
    });
    return true;
  }
});
