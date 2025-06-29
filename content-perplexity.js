/**
 * 通用工具函数
 */
const Utils = {
  sleep,
  waitForElement,
  getElementByXPath,
  getAllElementsByXPath,
  
  /**
   * 处理文章描述，确保每段都以 > 开头，但空行不带>符号
   * @param {string} description - 原始描述文本
   * @returns {string} - 处理后的描述文本
   */
  processDescription(description) {
    if (!description) return '';
    
    // 按段落分割
    const paragraphs = description.split(/\n{2,}/);
    
    // 为每段添加 > 前缀
    return paragraphs
      .map(p => p.trim())
      .filter(p => p) // 过滤空段落
      .map(p => `> ${p}`)
      .join('\n\n'); // 段落之间添加空行，不带>符号
  },
  
  processContent(element) {
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
  },
  
  /**
   * 处理图片URL，将Cloudinary代理的URL转换为原始URL
   * @param {string} url - 图片URL
   * @returns {string} - 处理后的URL
   */
  processImageUrl(url) {
    if (!url) return url;
    
    // 检查是否是Cloudinary代理的URL
    if (url.includes('pplx-res.cloudinary.com/image/fetch')) {
      try {
        // 提取原始URL - 修复正则表达式
        const regex = /https:\/\/pplx-res\.cloudinary\.com\/image\/fetch\/[^\/]+\/(.+)$/;
        const match = url.match(regex);
        
        if (match && match[1]) {
          // 解码URL
          let originalUrl = decodeURIComponent(match[1]);
          
          // 处理可能的双重编码
          if (originalUrl.includes('%')) {
            originalUrl = decodeURIComponent(originalUrl);
          }
          
          // 如果URL以t_limit/开头，去掉这个前缀
          if (originalUrl.startsWith('t_limit/')) {
            originalUrl = originalUrl.substring(8);
          }
          
          console.log('🔄 图片URL已转换:', originalUrl);
          return originalUrl;
        }
      } catch (error) {
        console.error('处理图片URL时出错:', error);
      }
    }
    
    return url;
  }
};

/**
 * 提取器基类
 */
class BaseExtractor {
  constructor() {
    this.name = 'Base';
  }
  
  /**
   * 检查是否能处理当前URL
   */
  canHandle(url) {
    return false;
  }
  
  /**
   * 提取内容
   */
  async extract() {
    throw new Error('未实现的方法');
  }
}

/**
 * Perplexity 文章页面提取器
 */
class PerplexityPageExtractor extends BaseExtractor {
  constructor() {
    super();
    this.name = 'PerplexityPage';
  }
  
  canHandle(url) {
    return url.includes('perplexity.ai/page/');
  }
  
  async extract() {
    console.log('使用 PerplexityPage 提取器');
    
    // 获取标题
    const titleXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[1]/div/div[1]/div/div/div/div/div/span';
    const titleEl = Utils.getElementByXPath(titleXPath);
    const mainTitle = titleEl?.textContent?.trim() || 'Untitled';
    console.log('📌 主标题:', mainTitle);
    let md = `# ${mainTitle}\n\n`;
  
    // 获取文章描述
    const descXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[1]/div/div[2]';
    const descEl = Utils.getElementByXPath(descXPath);
    if (descEl) {
      // 先提取内容，再处理为引用格式
      const rawDescription = Utils.processContent(descEl);
      const description = Utils.processDescription(rawDescription);
      console.log('📝 文章描述:', description ? description.substring(0, 100) + (description.length > 100 ? '...' : '') : '(无描述)');
      if (description) {
        md += `${description}\n\n`;
      }
    }
  
    // 获取大图
    const imgXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[2]/div/div/div/div/div/div/div/div[1]/div/div/div/img';
    const img = Utils.getElementByXPath(imgXPath);
    if (img && img.src) {
      // 处理图片URL
      const processedUrl = Utils.processImageUrl(img.src);
      console.log('🖼 图片URL:', processedUrl);
      md += `![hero image](${processedUrl})\n\n`;
    }
  
    // 获取所有段落
    const baseXPath = '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div';
    const sections = Utils.getAllElementsByXPath(baseXPath + '[position()>=3]');
    console.log('📑 找到段落数量:', sections.length);
  
    let shouldContinue = true;
    sections.forEach((section, index) => {
      if (!shouldContinue) return;
  
      console.log(`\n--- 段落 ${index + 1} ---`);
      const sectionNumber = index + 3; // 因为从div[3]开始
  
      // 获取段落标题
      const titleXPath = `//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[${sectionNumber}]/div/div/div[1]/div[1]`;
      const titleEl = Utils.getElementByXPath(titleXPath);
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
      const contentEl = Utils.getElementByXPath(contentXPath);
      if (contentEl) {
        const content = Utils.processContent(contentEl);
        console.log('📝 段落内容:', content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : '(无内容)');
        if (content) {
          md += `${content}\n\n`;
        }
      }
    });
  
    console.log('\n✅ Markdown 生成完成！');
    return md.trim();
  }
}

/**
 * Perplexity Discover 文章页面提取器
 */
class PerplexityDiscoverExtractor extends BaseExtractor {
  constructor() {
    super();
    this.name = 'PerplexityDiscover';
  }
  
  canHandle(url) {
    return url.includes('perplexity.ai/discover/') && 
           /perplexity\.ai\/discover\/[^\/]+\/[^\/]+/.test(url);
  }
  
  async extract() {
    console.log('使用 PerplexityDiscover 提取器');
    
    // 使用与 PerplexityPage 相同的提取逻辑
    // 这里可以根据实际情况调整，如果发现两种页面结构有差异
    const pageExtractor = new PerplexityPageExtractor();
    return await pageExtractor.extract();
  }
}

/**
 * 提取器管理器
 */
class ExtractorManager {
  constructor() {
    this.extractors = [];
    this.registerExtractors();
  }
  
  registerExtractors() {
    // 注册所有提取器
    this.extractors.push(new PerplexityPageExtractor());
    this.extractors.push(new PerplexityDiscoverExtractor());
    // 在这里可以添加更多提取器
  }
  
  getExtractor(url) {
    for (const extractor of this.extractors) {
      if (extractor.canHandle(url)) {
        return extractor;
      }
    }
    return null;
  }
  
  async extract() {
    const url = window.location.href;
    const extractor = this.getExtractor(url);
    
    if (!extractor) {
      throw new Error(`不支持的URL: ${url}`);
    }
    
    console.log(`使用 ${extractor.name} 提取器处理: ${url}`);
    return await extractor.extract();
  }
}

// 创建提取器管理器实例
const extractorManager = new ExtractorManager();

// 处理消息
chrome.runtime.onMessage.addListener((m, _, s) => {
  console.log('收到消息:', m);
  if (m.action === 'extract-perplexity') {
    console.log('开始处理提取请求');
    extractorManager.extract().then(r => {
      console.log('提取成功，准备发送响应');
      s({markdown: r});
    }).catch(err => {
      console.error('❌ 提取过程出错:', err);
      s({error: err.message});
    });
    return true;
  }
});
