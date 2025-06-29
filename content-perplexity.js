/**
 * 通用工具函数
 * 由 utils.js 和 extractor-utils.js 提供
 */

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
    const titleEl = getElementByXPath(SELECTORS.PERPLEXITY.PAGE_TITLE_XPATH);
    const mainTitle = titleEl?.textContent?.trim() || 'Untitled';
    console.log('📌 主标题:', mainTitle);
    let md = `# ${mainTitle}\n\n`;
  
    // 获取文章描述
    const descEl = getElementByXPath(SELECTORS.PERPLEXITY.DESCRIPTION_XPATH);
    if (descEl) {
      // 先提取内容，再处理为引用格式
      const rawDescription = processContent(descEl);
      const description = processDescription(rawDescription);
      console.log('📝 文章描述:', description ? description.substring(0, 100) + (description.length > 100 ? '...' : '') : '(无描述)');
      if (description) {
        md += `${description}\n\n`;
      }
    }
  
    // 获取大图
    const img = getElementByXPath(SELECTORS.PERPLEXITY.HERO_IMAGE_XPATH);
    if (img && img.src) {
      // 处理图片URL
      const processedUrl = processImageUrl(img.src);
      console.log('🖼 图片URL:', processedUrl);
      md += `![hero image](${processedUrl})\n\n`;
    }
  
    // 获取所有段落
    const baseXPath = SELECTORS.PERPLEXITY.SECTION_BASE_XPATH;
    const sections = getAllElementsByXPath(baseXPath + '[position()>=3]');
    console.log('📑 找到段落数量:', sections.length);
  
    let shouldContinue = true;
    sections.forEach((section, index) => {
      if (!shouldContinue) return;
  
      console.log(`\n--- 段落 ${index + 1} ---`);
      const sectionNumber = index + 3; // 因为从div[3]开始
  
      // 获取段落标题
      const titleEl = getElementByXPath(SELECTORS.PERPLEXITY.sectionTitle(sectionNumber));
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
      const contentEl = getElementByXPath(SELECTORS.PERPLEXITY.sectionContent(sectionNumber));
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
