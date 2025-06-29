export const SUPPORTED_CATEGORIES = [
  {
    key: 'perplexity',
    name: 'Perplexity 文章',
    buttonText: '抽取并复制 Markdown',
    loadingText: '提取中...',
    isValidUrl: (url) =>
      url.includes('perplexity.ai/page/') ||
      (url.includes('perplexity.ai/discover/') && /perplexity\.ai\/discover\/[^/]+\/[^/]+/.test(url))
  },
  {
    key: 'chatgpt',
    name: 'ChatGPT Deep Research',
    buttonText: '提取 Deep Research 内容',
    loadingText: '分析Deep Research中...',
    isValidUrl: (url) => url.includes('chatgpt.com/c/')
  }
];
