/**
 * ChatGPT Deep Research 内容提取器
 * 支持从 ChatGPT 会话页面提取 Deep Research 内容
 */

/**
 * 通用工具函数 - 复用自 content-perplexity.js
 */
const ChatGPTUtils = {
  sleep,
  waitForElement,
  getElementByXPath,
  getAllElementsByXPath,

  /**
   * 处理Deep Research内容，转换为Markdown格式
   */
  processDeepResearchContent(element) {
    if (!element) return '';
    
    // 创建一个副本以进行处理
    const container = document.createElement('div');
    container.innerHTML = element.innerHTML;
    
    // 处理标题 - ChatGPT可能使用h1-h6标签
    for (let i = 1; i <= 6; i++) {
      const headings = container.querySelectorAll(`h${i}`);
      headings.forEach(h => {
        const level = '#'.repeat(i);
        h.outerHTML = `${level} ${h.textContent.trim()}\n\n`;
      });
    }
    
    // 处理粗体文本
    const boldElements = container.querySelectorAll('strong, b');
    boldElements.forEach(bold => {
      bold.outerHTML = `**${bold.textContent}**`;
    });
    
    // 处理斜体文本
    const italicElements = container.querySelectorAll('em, i');
    italicElements.forEach(italic => {
      italic.outerHTML = `*${italic.textContent}*`;
    });
    
    // 处理代码块
    const codeBlocks = container.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      const code = pre.querySelector('code');
      const language = code?.className?.match(/language-(\w+)/)?.[1] || '';
      const content = code?.textContent || pre.textContent;
      pre.outerHTML = `\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
    });
    
    // 处理行内代码
    const inlineCodes = container.querySelectorAll('code');
    inlineCodes.forEach(code => {
      if (!code.closest('pre')) {
        code.outerHTML = `\`${code.textContent}\``;
      }
    });
    
    // 处理链接
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && text) {
        link.outerHTML = `[${text}](${href})`;
      }
    });
    
    // 处理无序列表
    const unorderedLists = container.querySelectorAll('ul');
    unorderedLists.forEach(ul => {
      const items = ul.querySelectorAll('li');
      const listContent = Array.from(items).map(li => {
        return `- ${li.textContent.trim()}`;
      }).join('\n');
      ul.outerHTML = '\n' + listContent + '\n\n';
    });
    
    // 处理有序列表
    const orderedLists = container.querySelectorAll('ol');
    orderedLists.forEach(ol => {
      const items = ol.querySelectorAll('li');
      const listContent = Array.from(items).map((li, index) => {
        return `${index + 1}. ${li.textContent.trim()}`;
      }).join('\n');
      ol.outerHTML = '\n' + listContent + '\n\n';
    });
    
    // 处理段落
    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (!p.closest('li')) {
        p.outerHTML = p.textContent.trim() + '\n\n';
      }
    });
    
    // 处理表格
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      let markdown = '\n';
      const rows = table.querySelectorAll('tr');
      
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const cellContent = Array.from(cells).map(cell => cell.textContent.trim()).join(' | ');
        markdown += `| ${cellContent} |\n`;
        
        // 添加表头分隔线
        if (rowIndex === 0 && row.querySelectorAll('th').length > 0) {
          const separator = Array.from(cells).map(() => '---').join(' | ');
          markdown += `| ${separator} |\n`;
        }
      });
      
      table.outerHTML = markdown + '\n';
    });
    
    // 获取处理后的文本，并清理多余的空行
    let content = container.textContent
      .trim()
      .replace(/\n{3,}/g, '\n\n'); // 将3个或更多换行符替换为2个
    
    return content;
  }
};

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
    const baseXPath = '//*[@id="thread"]/div/div[1]/div/div/div[2]/article';
    
    // 获取所有article元素
    const articles = ChatGPTUtils.getAllElementsByXPath(baseXPath);
    const deepResearchContainers = [];
    
         articles.forEach((article, index) => {
       // 检查article下是否有包含"container"的Deep Research内容
       const containerPath = `${baseXPath}[${index + 1}]/div/div/div/div/div[1]/div[3]/div[2]`;
       const containerElement = ChatGPTUtils.getElementByXPath(containerPath);
      
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
    const titleSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[data-message-role="assistant"] > div:first-child',
      '.font-semibold', '.text-lg', '.text-xl'
    ];
    
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
    const content = ChatGPTUtils.processDeepResearchContent(container.element);
    
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
      await ChatGPTUtils.sleep(1000);
      
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