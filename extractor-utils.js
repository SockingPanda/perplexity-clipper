// Helper functions for content extractors
function processDescription(description) {
  if (!description) return '';
  const paragraphs = description.split(/\n{2,}/);
  return paragraphs
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `> ${p}`)
    .join('\n\n');
}

function processContent(element) {
  const container = document.createElement('div');
  container.innerHTML = element.innerHTML;

  const citations = container.querySelectorAll('a.citation');
  citations.forEach(citation => {
    const number = citation.querySelector('span span').textContent;
    const href = citation.getAttribute('href');
    const title = citation.getAttribute('aria-label');
    citation.outerHTML = `[${number}](${href} "${title}")`;
  });

  const unorderedLists = container.querySelectorAll('ul');
  unorderedLists.forEach(ul => {
    const items = ul.querySelectorAll('li');
    const listContent = Array.from(items).map(li => {
      const paragraphs = li.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.innerHTML.trim())
        .join('\n');
      return `- ${content}`;
    }).join('\n');
    ul.outerHTML = '\n' + listContent + '\n';
  });

  const orderedLists = container.querySelectorAll('ol');
  orderedLists.forEach(ol => {
    const items = ol.querySelectorAll('li');
    const listContent = Array.from(items).map((li, index) => {
      const paragraphs = li.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.innerHTML.trim())
        .join('\n');
      return `${index + 1}. ${content}`;
    }).join('\n');
    ol.outerHTML = '\n' + listContent + '\n';
  });

  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (!p.closest('li')) {
      p.outerHTML = p.innerHTML + '\n\n';
    }
  });

  let content = container.textContent
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  return content;
}

function processImageUrl(url) {
  if (!url) return url;
  if (url.includes('pplx-res.cloudinary.com/image/fetch')) {
    try {
      const regex = /https:\/\/pplx-res\.cloudinary\.com\/image\/fetch\/[^\/]+\/(.+)$/;
      const match = url.match(regex);
      if (match && match[1]) {
        let originalUrl = decodeURIComponent(match[1]);
        if (originalUrl.includes('%')) {
          originalUrl = decodeURIComponent(originalUrl);
        }
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

if (typeof module !== 'undefined') {
  module.exports = { processDescription, processContent, processImageUrl };
}
