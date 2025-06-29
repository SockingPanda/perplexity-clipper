// Selector constants for content scripts
// Perplexity article page selectors
const SELECTORS = {
  PERPLEXITY: {
    // XPath for the main article title
    PAGE_TITLE_XPATH: '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[1]/div/div[1]/div/div/div/div/div/span',
    // XPath for the article description block
    DESCRIPTION_XPATH: '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[1]/div/div[2]',
    // XPath for the hero image element
    HERO_IMAGE_XPATH: '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[2]/div/div/div/div/div/div/div/div[1]/div/div/div/img',
    // Base XPath for all article section containers
    SECTION_BASE_XPATH: '//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div',
    // Function to build a section title XPath by index (starting at 3)
    sectionTitle: n => `//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[${n}]/div/div/div[1]/div[1]`,
    // Function to build a section content XPath by index (starting at 3)
    sectionContent: n => `//*[@id="__next"]/main/div[1]/div/div[2]/div/div[1]/div[4]/div/div/div[1]/div[2]/div/div[2]/div[${n}]/div/div/div[1]/div[2]`
  },
  CHATGPT: {
    // XPath to locate each conversation article containing Deep Research content
    DEEP_RESEARCH_ARTICLE_XPATH: '//*[@id="thread"]/div/div[1]/div/div/div[2]/article',
    // Function to build XPath to the Deep Research container within an article
    deepResearchContainer: index => `//*[@id="thread"]/div/div[1]/div/div/div[2]/article[${index}]/div/div/div/div/div[1]/div[3]/div[2]`,
    // CSS selectors used to detect a title inside Deep Research blocks
    TITLE_SELECTORS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[data-message-role="assistant"] > div:first-child',
      '.font-semibold', '.text-lg', '.text-xl'
    ]
  }
};

if (typeof module !== 'undefined') {
  module.exports = SELECTORS;
}
