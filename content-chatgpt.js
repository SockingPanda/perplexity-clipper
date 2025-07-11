/**
 * ChatGPT Deep Research 内容提取器
 * 支持从 ChatGPT 会话页面提取 Deep Research 内容
 */

/**
 * 通用工具函数 - 与 Perplexity 提取器共享
 */

function processDeepResearchContent(element) {
  if (!element) return '';

  const container = document.createElement('div');
  container.innerHTML = element.innerHTML;

  for (let i = 1; i <= 6; i++) {
    const headings = container.querySelectorAll(`h${i}`);
    headings.forEach(h => {
      const level = '#'.repeat(i);
      h.outerHTML = `${level} ${h.textContent.trim()}\n\n`;
    });
  }

  const boldElements = container.querySelectorAll('strong, b');
  boldElements.forEach(bold => {
    bold.outerHTML = `**${bold.textContent}**`;
  });

  const italicElements = container.querySelectorAll('em, i');
  italicElements.forEach(italic => {
    italic.outerHTML = `*${italic.textContent}*`;
  });

  const codeBlocks = container.querySelectorAll('pre');
  codeBlocks.forEach(pre => {
    const code = pre.querySelector('code');
    const language = code?.className?.match(/language-(\w+)/)?.[1] || '';
    const content = code?.textContent || pre.textContent;
    pre.outerHTML = `\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
  });

  const inlineCodes = container.querySelectorAll('code');
  inlineCodes.forEach(code => {
    if (!code.closest('pre')) {
      code.outerHTML = `\`${code.textContent}\``;
    }
  });

  const links = container.querySelectorAll('a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    if (href && text) {
      link.outerHTML = `[${text}](${href})`;
    }
  });

  const unorderedLists = container.querySelectorAll('ul');
  unorderedLists.forEach(ul => {
    const items = ul.querySelectorAll('li');
    const listContent = Array.from(items).map(li => {
      return `- ${li.textContent.trim()}`;
    }).join('\n');
    ul.outerHTML = '\n' + listContent + '\n\n';
  });

  const orderedLists = container.querySelectorAll('ol');
  orderedLists.forEach(ol => {
    const items = ol.querySelectorAll('li');
    const listContent = Array.from(items).map((li, index) => {
      return `${index + 1}. ${li.textContent.trim()}`;
    }).join('\n');
    ol.outerHTML = '\n' + listContent + '\n\n';
  });

  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (!p.closest('li')) {
      p.outerHTML = p.textContent.trim() + '\n\n';
    }
  });

  const tables = container.querySelectorAll('table');
  tables.forEach(table => {
    let markdown = '\n';
    const rows = table.querySelectorAll('tr');

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('th, td');
      const cellContent = Array.from(cells).map(cell => cell.textContent.trim()).join(' | ');
      markdown += `| ${cellContent} |\n`;

      if (rowIndex === 0 && row.querySelectorAll('th').length > 0) {
        const separator = Array.from(cells).map(() => '---').join(' | ');
        markdown += `| ${separator} |\n`;
      }
    });

    table.outerHTML = markdown + '\n';
  });

  let content = container.textContent
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  return content;
}

/**
 * ChatGPT Deep Research 提取器
 */
class ChatGPTDeepResearchExtractor {
  constructor() {
    this.name = 'ChatGPTDeepResearch';
  }
  
  /**
   * 检查是否能处理当前URL
   */
  canHandle(url) {
    return url.includes('chatgpt.com/c/');
  }
  
  /**
   * 查找所有包含Deep Research的容器
   */
  findDeepResearchContainers() {
    // 基于提供的XPath模式，查找所有包含"container"标识的Deep Research元素
    const baseXPath = SELECTORS.CHATGPT.DEEP_RESEARCH_ARTICLE_XPATH;
    
    // 获取所有article元素
    const articles = getAllElementsByXPath(baseXPath);
    const deepResearchContainers = [];
    
         articles.forEach((article, index) => {
       // 检查article下是否有包含"container"的Deep Research内容
       const containerPath = SELECTORS.CHATGPT.deepResearchContainer(index + 1);
       const containerElement = getElementByXPath(containerPath);
      
      if (containerElement) {
        // 检查是否包含Deep Research相关内容的特征
        const text = containerElement.textContent.toLowerCase();
        if (text.includes('research') || text.includes('analysis') || 
            containerElement.querySelector('[data-message-model-slug*="research"]') ||
            containerElement.textContent.length > 500) { // 长内容通常是研究内容
          
          deepResearchContainers.push({
            element: containerElement,
            articleIndex: index + 1,
            xpath: containerPath
          });
        }
      }
    });
    
    return deepResearchContainers;
  }
  
  /**
   * 提取单个Deep Research内容
   */
  extractSingleDeepResearch(container) {
    if (!container.element) return null;
    
    console.log(`🔍 正在提取Deep Research (Article ${container.articleIndex})`);
    
    // 尝试获取标题
    let title = '';
    const titleSelectors = SELECTORS.CHATGPT.TITLE_SELECTORS;
    
    for (const selector of titleSelectors) {
      const titleEl = container.element.querySelector(selector);
      if (titleEl && titleEl.textContent.trim()) {
        title = titleEl.textContent.trim();
        break;
      }
    }
    
    if (!title) {
      title = `Deep Research ${container.articleIndex}`;
    }
    
    // 提取内容
    const content = processDeepResearchContent(container.element);
    
    if (!content || content.trim().length < 50) {
      console.warn(`⚠️ Deep Research ${container.articleIndex} 内容过短或为空`);
      return null;
    }
    
    return {
      title,
      content,
      articleIndex: container.articleIndex,
      xpath: container.xpath
    };
  }
  
  /**
   * 提取所有Deep Research内容
   */
  async extract() {
    console.log('🚀 开始提取ChatGPT Deep Research内容');
    
    try {
      // 等待页面加载完成
      await sleep(1000);
      
      // 查找所有Deep Research容器
      const containers = this.findDeepResearchContainers();
      
      if (containers.length === 0) {
        console.log('❌ 未找到Deep Research内容');
        return {
          success: false,
          message: '当前页面没有找到Deep Research内容'
        };
      }
      
             console.log(`📋 找到 ${containers.length} 个Deep Research容器`);
       
       // 提取每个Deep Research的内容
       const extractedContents = [];
       
       for (const container of containers) {
         const extracted = this.extractSingleDeepResearch(container);
         if (extracted) {
           extractedContents.push(extracted);
         }
       }
       
       if (extractedContents.length === 0) {
         return {
           success: false,
           message: '无法提取有效的Deep Research内容'
         };
       }
       
       console.log('✅ Deep Research内容提取完成');
       
       // 返回提取的项目列表，让用户选择
       return {
         success: true,
         mode: 'selection', // 标识这是选择模式
         extractedCount: extractedContents.length,
         items: extractedContents,
         pageInfo: {
           title: document.title || 'ChatGPT Conversation',
           url: window.location.href,
           extractTime: new Date().toLocaleString('zh-CN')
         }
       };
      
    } catch (error) {
      console.error('❌ 提取Deep Research内容时出错:', error);
      return {
        success: false,
        message: `提取失败: ${error.message}`
      };
    }
  }
}

/**
 * ChatGPT提取器管理器
 */
class ChatGPTExtractorManager {
  constructor() {
    this.extractor = new ChatGPTDeepResearchExtractor();
  }
  
  canHandle(url) {
    return this.extractor.canHandle(url);
  }
  
  async extract() {
    if (!this.canHandle(window.location.href)) {
      return {
        success: false,
        message: '当前页面不是ChatGPT会话页面'
      };
    }
    
    return await this.extractor.extract();
  }
}

// 初始化管理器
const chatGPTManager = new ChatGPTExtractorManager();

/**
 * 根据选择的项目生成Markdown
 */
function generateSelectedMarkdown(selectedItems, pageInfo) {
  if (!selectedItems || selectedItems.length === 0) {
    return '';
  }

  let finalMarkdown = '';
  
//   // 添加会话标题
//   finalMarkdown += `# ${pageInfo.title}\n\n`;
  
//   // 添加提取时间
//   finalMarkdown += `> 提取时间: ${pageInfo.extractTime}\n`;
//   finalMarkdown += `> 来源: ${pageInfo.url}\n\n`;
  
  // 添加选中的Deep Research内容
  selectedItems.forEach((item, index) => {
    finalMarkdown += item.content;
    
    if (index < selectedItems.length - 1) {
      finalMarkdown += '\n\n---\n\n';
    }
  });
  
  return finalMarkdown;
}

/**
 * 消息监听器 - 响应popup的提取请求
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    chatGPTManager.extract()
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('提取失败:', error);
        sendResponse({
          success: false,
          message: `提取失败: ${error.message}`
        });
      });
    
    // 返回true表示异步响应
    return true;
  } else if (request.action === 'generateMarkdown') {
    // 根据选择的项目生成Markdown
    try {
      const markdown = generateSelectedMarkdown(request.selectedItems, request.pageInfo);
      sendResponse({
        success: true,
        markdown: markdown
      });
    } catch (error) {
      console.error('生成Markdown失败:', error);
      sendResponse({
        success: false,
        message: `生成Markdown失败: ${error.message}`
      });
    }
    
    return true;
  }
});

console.log('🔧 ChatGPT Deep Research 提取器已加载'); 