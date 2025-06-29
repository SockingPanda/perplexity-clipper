import { SUPPORTED_CATEGORIES } from './supported-categories.js';

export default class ContentHandler {
  constructor() {
    this.currentMarkdown = '';
    this.currentCategory = SUPPORTED_CATEGORIES[0].key;
    this.extractedItems = [];
    this.pageInfo = null;
    this.isMultiSelectMode = false;
    this.selectedItemsForBatch = [];
    this._initElements();
    this._populateCategoryOptions();
  }

  _initElements() {
    this.extractBtn = document.getElementById('extract');
    this.outputTextarea = document.getElementById('output');
    this.categorySelect = document.getElementById('category');
    this.selectionArea = document.getElementById('selectionArea');
    this.itemList = document.getElementById('itemList');
    this.selectAllBtn = document.getElementById('selectAll');
    this.selectNoneBtn = document.getElementById('selectNone');
    this.generateSelectedBtn = document.getElementById('generateSelected');
    this.refreshItemsBtn = document.getElementById('refreshItems');
    this.selectionTitle = document.getElementById('selectionTitle');
    this.modeIndicator = document.getElementById('modeIndicator');
  }

  _populateCategoryOptions() {
    this.categorySelect.innerHTML = '';
    SUPPORTED_CATEGORIES.forEach(c => {
      const option = document.createElement('option');
      option.value = c.key;
      option.textContent = c.name;
      this.categorySelect.appendChild(option);
    });
  }

  setAnytypeManager(manager) {
    this.anytype = manager;
  }

  onCategoryChange() {
    this.currentCategory = this.categorySelect.value;
    this.updateExtractButtonText();
  }

  updateExtractButtonText() {
    const cat = SUPPORTED_CATEGORIES.find(c => c.key === this.currentCategory);
    this.extractBtn.textContent = cat ? cat.buttonText : '抽取';
  }

  isValidUrl(url, category) {
    const cat = SUPPORTED_CATEGORIES.find(c => c.key === category);
    return cat ? cat.isValidUrl(url) : false;
  }

  determineCategory(url) {
    const cat = SUPPORTED_CATEGORIES.find(c => c.isValidUrl(url));
    return cat ? cat.key : SUPPORTED_CATEGORIES[0].key;
  }

  async autoSetCategoryFromCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const cat = this.determineCategory(tab.url || '');
      this.currentCategory = cat;
      this.categorySelect.value = cat;
    } catch (_) {
      // ignore errors
    }
    this.updateExtractButtonText();
  }

  getInvalidUrlMessage(category) {
    const cat = SUPPORTED_CATEGORIES.find(c => c.key === category);
    if (!cat) return '❌ 当前页面不受支持';
    return `❌ 请在 ${cat.name} 页面使用此扩展`;
  }

  async extractContent() {
    try {
      this.extractBtn.disabled = true;
      const cat = SUPPORTED_CATEGORIES.find(c => c.key === this.currentCategory);
      this.extractBtn.textContent = (cat && cat.loadingText) || '提取中...';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!this.isValidUrl(tab.url, this.currentCategory)) {
        alert(this.getInvalidUrlMessage(this.currentCategory));
        return;
      }

      let action = this.currentCategory === 'perplexity' ? 'extract-perplexity' : 'extract';
      const response = await this.sendMessageToTab(tab.id, { action });
      if (response.error) {
        alert('❌ 提取失败: ' + response.error);
        return;
      }

      if (response.mode === 'selection') {
        this.extractedItems = response.items;
        this.pageInfo = response.pageInfo;
        this.showSelectionInterface();
        return;
      }

      this.currentMarkdown = response.markdown;
      this.outputTextarea.value = this.currentMarkdown;
      await navigator.clipboard.writeText(this.currentMarkdown);
      if (this.anytype && this.anytype.isEnabled() && this.currentMarkdown) {
        this.anytype.enableExport();
      }
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      this.extractBtn.disabled = false;
      this.updateExtractButtonText();
    }
  }

  async sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  showSelectionInterface() {
    this.outputTextarea.style.display = 'none';
    this.selectionArea.classList.remove('hidden');
    this.isMultiSelectMode = this.anytype ? this.anytype.isEnabled() : false;
    this.updateSelectionMode();
    this.renderItemList();
  }

  updateSelectionMode() {
    if (this.isMultiSelectMode) {
      this.selectionTitle.textContent = '选择要导出的 Deep Research 内容';
      this.modeIndicator.textContent = '多选模式 - 选择后直接点击导出按钮';
      this.selectAllBtn.classList.remove('hidden');
      this.selectNoneBtn.classList.remove('hidden');
      this.generateSelectedBtn.classList.remove('hidden');
    } else {
      this.selectionTitle.textContent = '选择要复制的 Deep Research 内容';
      this.modeIndicator.textContent = '单选模式 - 点击项目自动复制';
      this.selectAllBtn.classList.add('hidden');
      this.selectNoneBtn.classList.add('hidden');
      this.generateSelectedBtn.classList.add('hidden');
    }
  }

  renderItemList() {
    this.itemList.innerHTML = '';
    this.extractedItems.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'research-item';
      div.dataset.index = i;
      const preview = item.content.substring(0, 200).replace(/\n/g, ' ') + (item.content.length > 200 ? '...' : '');
      const inputType = this.isMultiSelectMode ? 'checkbox' : 'radio';
      const inputName = this.isMultiSelectMode ? '' : 'name="research-item"';
      const checked = this.isMultiSelectMode ? 'checked' : '';
      div.innerHTML = `
        <input type="${inputType}" id="item-${i}" ${inputName} ${checked}>
        <div class="research-content">
          <div class="research-title">${item.title}</div>
          <div class="research-preview">${preview}</div>
        </div>`;
      div.addEventListener('click', (e) => {
        const input = div.querySelector('input');
        if (this.isMultiSelectMode) {
          if (e.target !== input) input.checked = !input.checked;
        } else {
          input.checked = true;
          this.highlightSelectedItem(div);
          this.copySingleItem(item);
          this.showCopyNotification();
        }
      });
      this.itemList.appendChild(div);
    });
  }

  hideSelectionInterface() {
    this.selectionArea.classList.add('hidden');
    this.outputTextarea.style.display = 'block';
  }

  onAnytypeToggle() {
    if (this.selectionArea.classList.contains('hidden')) return;
    const newMode = this.anytype ? this.anytype.isEnabled() : false;
    if (this.isMultiSelectMode !== newMode) {
      this.isMultiSelectMode = newMode;
      this.updateSelectionMode();
      this.renderItemList();
    }
  }

  async refreshExtractedItems() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!this.isValidUrl(tab.url, this.currentCategory)) {
        alert(this.getInvalidUrlMessage(this.currentCategory));
        return;
      }
      const response = await this.sendMessageToTab(tab.id, { action: 'extract' });
      if (response.error) {
        alert('❌ 刷新失败: ' + response.error);
        return;
      }
      if (response.mode === 'selection') {
        this.extractedItems = response.items;
        this.pageInfo = response.pageInfo;
        this.renderItemList();
      }
    } catch (err) {
      alert('❌ 刷新失败: ' + err.message);
    }
  }

  async copySingleItem(item) {
    try {
      await navigator.clipboard.writeText(item.content);
      this.currentMarkdown = item.content;
      this.outputTextarea.value = item.content;
      this.showCopyMessage();
    } catch (err) {
      alert('❌ 复制失败: ' + err.message);
    }
  }

  showCopyMessage() {
    clearTimeout(this.copyStatusTimeout);
    this.modeIndicator.textContent = '内容已复制到剪贴板';
    this.copyStatusTimeout = setTimeout(() => this.updateSelectionMode(), 1500);
  }

  selectAllItems() {
    this.itemList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  }

  selectNoneItems() {
    this.itemList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  }

  async generateSelectedMarkdown() {
    try {
      const checkboxes = this.itemList.querySelectorAll('input[type="checkbox"]');
      const selected = [];
      checkboxes.forEach((cb, i) => { if (cb.checked) selected.push(this.extractedItems[i]); });
      this.selectedItemsForBatch = selected;
      if (selected.length === 0) {
        alert('请至少选择一个项目');
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await this.sendMessageToTab(tab.id, {
        action: 'generateMarkdown',
        selectedItems: selected,
        pageInfo: this.pageInfo
      });
      if (response.error) {
        alert('❌ 生成失败: ' + response.error);
        return;
      }
      this.currentMarkdown = response.markdown;
      this.outputTextarea.value = this.currentMarkdown;
      await navigator.clipboard.writeText(this.currentMarkdown);
      this.hideSelectionInterface();
      if (this.anytype && this.anytype.isEnabled()) this.anytype.enableExport();
    } catch (err) {
      alert('❌ 生成失败: ' + err.message);
    }
  }

  highlightSelectedItem(div) {
    this.itemList.querySelectorAll('.research-item').forEach(d => d.classList.remove('selected-single'));
    div.classList.add('selected-single');
  }

  showCopyNotification() {
    const original = this.modeIndicator.textContent;
    this.modeIndicator.textContent = '内容已复制到剪贴板';
    setTimeout(() => {
      if (this.modeIndicator.textContent === '内容已复制到剪贴板') {
        this.modeIndicator.textContent = original;
      }
    }, 1000);
  }

  generateDefaultTitle() {
    const lines = this.currentMarkdown.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t && !t.startsWith('#')) return t.substring(0, 100);
      if (t.startsWith('# ')) return t.substring(2).trim();
    }
    return `内容剪藏 - ${new Date().toLocaleString()}`;
  }
}
