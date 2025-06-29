// Shared utility helpers loaded by content scripts
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(sel, t = 6000) {
  const s = performance.now();
  while (performance.now() - s < t) {
    const el = document.querySelector(sel);
    if (el) return el;
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

// Export for testing environments
if (typeof module !== 'undefined') {
  module.exports = { sleep, waitForElement, getElementByXPath, getAllElementsByXPath };
}
