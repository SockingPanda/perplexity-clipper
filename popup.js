/**
 * Perplexity Clipper with Anytype Integration
 * 支持提取 Markdown 并导出到 Anytype
 */

import AnytypeAPI from './anytype-api.js';

class PerplexityClipper {
  constructor(anytypeAPI) {
    this.anytypeAPI = anytypeAPI;
    this.currentMarkdown = '';
    this.currentChallengeId = null;
    this.selectedSpaceId = null;
    this.selectedTypeKey = null;
    this.selectedTemplateId = null;
    this.currentCategory = 'perplexity';
    this.preferences = {};
    this.extractedItems = [];
    this.pageInfo = null;
    this.isMultiSelectMode = false;
    this.selectedItemsForBatch = [];
    
    this.initializeElements();
    this.initializeEventListeners();
    this.loadSettings();
  }

  /**
   * 初始化 DOM 元素引用
   */
  initializeElements() {
    // 主功能元素
    this.extractBtn = document.getElementById('extract');
    this.outputTextarea = document.getElementById('output');
    this.categorySelect = document.getElementById('category');
    
    // Anytype 相关元素
    this.enableAnytypeCheckbox = document.getElementById('enableAnytype');
    this.exportAnytypeBtn = document.getElementById('exportAnytype');
    this.anytypeStatus = document.getElementById('anytypeStatus');
    
    // 选择界面元素
    this.selectionArea = document.getElementById('selectionArea');
    this.itemList = document.getElementById('itemList');
    this.selectAllBtn = document.getElementById('selectAll');
    this.selectNoneBtn = document.getElementById('selectNone');
    this.generateSelectedBtn = document.getElementById('generateSelected');
    this.refreshItemsBtn = document.getElementById('refreshItems');
    this.selectionTitle = document.getElementById('selectionTitle');
    this.modeIndicator = document.getElementById('modeIndicator');
    
    // 配对模态框
    this.pairingModal = document.getElementById('pairingModal');
    this.verificationCodeInput = document.getElementById('verificationCode');
    this.confirmPairingBtn = document.getElementById('confirmPairing');
    this.cancelPairingBtn = document.getElementById('cancelPairing');
    
    // 导出模态框
    this.exportModal = document.getElementById('exportModal');
    this.spaceSelect = document.getElementById('spaceSelect');
    this.typeSelect = document.getElementById('typeSelect');
    this.templateSelect = document.getElementById('templateSelect');
    this.templateList = document.getElementById('templateList');
    this.objectTitleInput = document.getElementById('objectTitle');
    this.confirmExportBtn = document.getElementById('confirmExport');
    this.cancelExportBtn = document.getElementById('cancelExport');
  }

  /**
   * 初始化事件监听器
   */
  initializeEventListeners() {
    // 主功能事件
    this.extractBtn.addEventListener('click', () => this.extractContent());
    this.categorySelect.addEventListener('change', () => this.onCategoryChange());
    
    // Anytype 设置事件
    this.enableAnytypeCheckbox.addEventListener('change', () => this.toggleAnytypeFeature());
    this.exportAnytypeBtn.addEventListener('click', () => this.startExportFlow());
    
    // 配对模态框事件
    this.confirmPairingBtn.addEventListener('click', () => this.completePairing());
    this.cancelPairingBtn.addEventListener('click', () => this.closePairingModal());
    this.verificationCodeInput.addEventListener('input', () => this.validateVerificationCode());
    
    // 导出模态框事件
    this.confirmExportBtn.addEventListener('click', () => this.executeExport());
    this.cancelExportBtn.addEventListener('click', () => this.closeExportModal());
    this.spaceSelect.addEventListener('change', () => this.onSpaceChange());
    this.typeSelect.addEventListener('change', () => this.onTypeChange());
    this.templateSelect.addEventListener('change', () => this.onTemplateChange());
    
    // 选择界面事件
    this.selectAllBtn.addEventListener('click', () => this.selectAllItems());
    this.selectNoneBtn.addEventListener('click', () => this.selectNoneItems());
    this.generateSelectedBtn.addEventListener('click', () => this.generateSelectedMarkdown());
    this.refreshItemsBtn.addEventListener('click', () => this.refreshExtractedItems());
  }

  /**
   * 加载用户设置
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['enableAnytype', 'preferences']);
      const enableAnytype = result.enableAnytype || false;
      this.preferences = result.preferences || {};
      
      this.enableAnytypeCheckbox.checked = enableAnytype;
      await this.toggleAnytypeFeature();
      
      // 设置当前类别
      this.currentCategory = this.categorySelect.value;
      this.updateExtractButtonText();
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  /**
   * 保存用户设置
   */
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        enableAnytype: this.enableAnytypeCheckbox.checked,
        preferences: this.preferences
      });
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  /**
   * 保存用户选择的偏好
   */
  async savePreferences() {
    // 保存当前类别的偏好设置
    if (!this.preferences[this.currentCategory]) {
      this.preferences[this.currentCategory] = {};
    }
    
    this.preferences[this.currentCategory] = {
      spaceId: this.selectedSpaceId,
      typeKey: this.selectedTypeKey,
      templateId: this.selectedTemplateId
    };
    
    await this.saveSettings();
  }

  /**
   * 切换 Anytype 功能
   */
  async toggleAnytypeFeature() {
    const enabled = this.enableAnytypeCheckbox.checked;
    await this.saveSettings();
    
    if (enabled) {
      this.exportAnytypeBtn.classList.remove('hidden');
      // 不再检查 Anytype 状态，直接启用按钮
      this.exportAnytypeBtn.disabled = false;
      // 显示信息提示用户可以使用导出功能
      this.updateAnytypeStatus('info', '点击导出按钮开始使用 Anytype 功能');
    } else {
      this.exportAnytypeBtn.classList.add('hidden');
      this.updateAnytypeStatus('', '');
    }
    
    // 如果选择界面已显示，更新选择模式
    if (!this.selectionArea.classList.contains('hidden')) {
      this.isMultiSelectMode = enabled;
      this.updateSelectionMode();
      this.renderItemList();
    }
  }

  /**
   * 更新 Anytype 状态显示
   */
  updateAnytypeStatus(type, message) {
    if (!message) {
      this.anytypeStatus.classList.add('hidden');
      return;
    }

    this.anytypeStatus.className = `status ${type}`;
    this.anytypeStatus.textContent = message;
    this.anytypeStatus.classList.remove('hidden');
  }

  /**
   * 类别变更事件
   */
  onCategoryChange() {
    this.currentCategory = this.categorySelect.value;
    console.log('类别已更改为:', this.currentCategory);
    
    // 更新按钮文本以反映当前类别
    this.updateExtractButtonText();
  }

  /**
   * 更新提取按钮文本
   */
  updateExtractButtonText() {
    const buttonTexts = {
      'perplexity': '抽取并复制 Markdown',
      'chatgpt': '提取 Deep Research 内容',
      'default': '抽取并复制 Markdown'
    };
    
    this.extractBtn.textContent = buttonTexts[this.currentCategory] || buttonTexts.default;
  }

  /**
   * 检查URL是否为Perplexity文章页面
   */
  isPerplexityUrl(url) {
    // 匹配具体文章页面，而非分类页面
    return (
      url.includes('perplexity.ai/page/') || 
      // 对于discover路径，确保它是具体文章而不是分类页面
      (url.includes('perplexity.ai/discover/') && 
       /perplexity\.ai\/discover\/[^\/]+\/[^\/]+/.test(url))
    );
  }

  /**
   * 检查URL是否为ChatGPT会话页面
   */
  isChatGPTUrl(url) {
    return url.includes('chatgpt.com/c/');
  }

  /**
   * 根据当前类别检查URL是否有效
   */
  isValidUrl(url, category) {
    switch (category) {
      case 'perplexity':
        return this.isPerplexityUrl(url);
      case 'chatgpt':
        return this.isChatGPTUrl(url);
      default:
        return false;
    }
  }

  /**
   * 获取当前类别的错误提示消息
   */
  getInvalidUrlMessage(category) {
    switch (category) {
      case 'perplexity':
        return '❌ 请在 Perplexity 文章页面使用此扩展';
      case 'chatgpt':
        return '❌ 请在 ChatGPT 会话页面使用此扩展';
      default:
        return '❌ 请在支持的页面使用此扩展';
    }
  }

  /**
   * 提取内容
   */
  async extractContent() {
    try {
      console.log('开始提取过程...');
      this.extractBtn.disabled = true;
      const loadingTexts = {
        'perplexity': '提取中...',
        'chatgpt': '分析Deep Research中...',
        'default': '提取中...'
      };
      this.extractBtn.textContent = loadingTexts[this.currentCategory] || loadingTexts.default;
      
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      console.log('当前标签页:', tab.url);
      console.log('当前类别:', this.currentCategory);
      
      if (!this.isValidUrl(tab.url, this.currentCategory)) {
        alert(this.getInvalidUrlMessage(this.currentCategory));
        return;
      }

      // 根据类别发送不同的消息到内容脚本
      let action;
      switch (this.currentCategory) {
        case 'perplexity':
          action = 'extract-perplexity';
          break;
        case 'chatgpt':
          action = 'extract';
          break;
        default:
          alert('❌ 不支持的内容类别');
          return;
      }

      // 发送消息到内容脚本
      const response = await this.sendMessageToTab(tab.id, {action});
      
      if (response.error) {
        alert('❌ 提取失败: ' + response.error);
        return;
      }
      
      // 检查是否是选择模式（ChatGPT Deep Research）
      if (response.mode === 'selection') {
        // 显示选择界面
        this.extractedItems = response.items;
        this.pageInfo = response.pageInfo;
        this.showSelectionInterface();
        return;
      }
      
      // 传统模式（Perplexity）
      this.currentMarkdown = response.markdown;
      this.outputTextarea.value = this.currentMarkdown;
      
      // 复制到剪贴板
      try { 
        await navigator.clipboard.writeText(this.currentMarkdown);
        console.log('已复制到剪贴板');
      } catch (err) {
        console.error('复制到剪贴板失败:', err);
      }
      
      // 如果启用了 Anytype 且有内容，启用导出按钮
      if (this.enableAnytypeCheckbox.checked && this.currentMarkdown) {
        this.exportAnytypeBtn.disabled = false;
      }
      
  } catch (err) {
    console.error('执行过程出错:', err);
    alert('❌ ' + err.message);
    } finally {
      this.extractBtn.disabled = false;
      this.updateExtractButtonText();
    }
  }

  /**
   * 发送消息到标签页
   */
  async sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 开始导出流程
   */
  async startExportFlow() {
    try {
      this.exportAnytypeBtn.disabled = true;
      this.exportAnytypeBtn.textContent = '连接中...';

      // 检查是否有内容可以导出
      let hasBatchContent = this.selectedItemsForBatch && this.selectedItemsForBatch.length > 0;
      const hasMarkdownContent = this.currentMarkdown && this.currentMarkdown.trim();
      
      // 对于ChatGPT多选模式，实时获取选中的项目
      if (this.currentCategory === 'chatgpt' && this.isMultiSelectMode && !hasBatchContent) {
        const checkboxes = this.itemList?.querySelectorAll('input[type="checkbox"]') || [];
        const selectedItems = [];
        
        checkboxes.forEach((cb, index) => {
          if (cb.checked && this.extractedItems[index]) {
            selectedItems.push(this.extractedItems[index]);
          }
        });
        
        if (selectedItems.length > 0) {
          this.selectedItemsForBatch = selectedItems;
          hasBatchContent = true;
          console.log('📋 实时检测到选中项目:', selectedItems.length);
        }
      }
      
      console.log('📋 导出内容检查:', {
        category: this.currentCategory,
        isMultiSelectMode: this.isMultiSelectMode,
        hasBatchContent,
        hasMarkdownContent,
        batchCount: this.selectedItemsForBatch?.length || 0,
        markdownLength: this.currentMarkdown?.length || 0
      });
      
      if (!hasBatchContent && !hasMarkdownContent) {
        console.log('没有内容，需要先提取...');
        
        if (this.currentCategory === 'chatgpt') {
          alert('❌ 请先选择要导出的 Deep Research 内容');
          return;
        }
        
        // 对于 Perplexity，自动提取内容
        console.log('自动提取 Perplexity 内容...');
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!this.isValidUrl(tab.url, this.currentCategory)) {
          alert(this.getInvalidUrlMessage(this.currentCategory));
          return;
        }
        
        // 发送消息到内容脚本
        const response = await this.sendMessageToTab(tab.id, {action: 'extract-perplexity'});
        
        if (response.error) {
          alert('❌ 提取失败: ' + response.error);
          return;
        }
        
        this.currentMarkdown = response.markdown;
        this.outputTextarea.value = this.currentMarkdown;
      }

      // 直接尝试获取空间信息，复用已有的配对状态
      try {
        await this.showExportOptions();
      } catch (error) {
        console.error('获取Anytype信息失败:', error);
        
        // 检查错误类型并给出相应提示
        if (error.message.includes('未找到 API Key') || error.message.includes('获取空间信息失败')) {
          this.updateAnytypeStatus('error', '❌ 未配对或连接失败');
          alert('❌ 请先在 Perplexity 页面使用 Anytype 导出功能完成配对，或确保 Anytype 应用正在运行');
        } else {
          this.updateAnytypeStatus('error', '❌ 导出失败');
          alert('❌ ' + error.message);
        }
      }
    } catch (error) {
      console.error('启动导出流程失败:', error);
      alert('❌ ' + error.message);
    } finally {
      this.exportAnytypeBtn.disabled = false;
      this.exportAnytypeBtn.textContent = '🚀 导出到 Anytype';
    }
  }

  /**
   * 开始配对流程
   */
  async startPairingFlow() {
    try {
      this.updateAnytypeStatus('info', '正在连接 Anytype...');
      this.currentChallengeId = await this.anytypeAPI.startPairing();
      this.showPairingModal();
    } catch (error) {
      console.error('启动配对失败:', error);
      this.updateAnytypeStatus('error', '❌ 连接失败，请确保 Anytype 已运行');
      throw new Error('启动配对失败: ' + error.message);
    }
  }

  /**
   * 显示配对模态框
   */
  showPairingModal() {
    this.verificationCodeInput.value = '';
    this.confirmPairingBtn.disabled = true;
    this.pairingModal.classList.remove('hidden');
  }

  /**
   * 关闭配对模态框
   */
  closePairingModal() {
    this.pairingModal.classList.add('hidden');
    this.currentChallengeId = null;
  }

  /**
   * 验证验证码输入
   */
  validateVerificationCode() {
    const code = this.verificationCodeInput.value.trim();
    this.confirmPairingBtn.disabled = code.length !== 4 || !/^\d{4}$/.test(code);
  }

  /**
   * 完成配对
   */
  async completePairing() {
    try {
      const code = this.verificationCodeInput.value.trim();
      if (!code || !this.currentChallengeId) {
        return;
      }

      this.confirmPairingBtn.disabled = true;
      this.confirmPairingBtn.textContent = '验证中...';

      await this.anytypeAPI.completePairing(this.currentChallengeId, code);
      
      this.closePairingModal();
      this.updateAnytypeStatus('success', '✅ 配对成功！');
      
      // 继续导出流程
      await this.showExportOptions();
      
    } catch (error) {
      console.error('配对失败:', error);
      alert('❌ 配对失败: ' + error.message);
    } finally {
      this.confirmPairingBtn.disabled = false;
      this.confirmPairingBtn.textContent = '确认';
    }
  }

  /**
   * 显示导出选项
   */
  async showExportOptions() {
    try {
      // 获取空间列表
      const spaces = await this.anytypeAPI.getSpaces();
      await this.populateSpaceSelect(spaces);
      
      // 根据是否是批量导出决定标题处理方式
      if (this.selectedItemsForBatch && this.selectedItemsForBatch.length > 1) {
        // 批量导出模式 - 显示批量信息
        this.objectTitleInput.value = `将创建 ${this.selectedItemsForBatch.length} 个对象`;
        this.objectTitleInput.disabled = true;
        this.objectTitleInput.style.color = '#6c757d';
        this.objectTitleInput.style.fontStyle = 'italic';
      } else if (this.selectedItemsForBatch && this.selectedItemsForBatch.length === 1) {
        // 单个选中项导出 - 使用项目标题
        this.objectTitleInput.value = this.selectedItemsForBatch[0].title;
        this.objectTitleInput.disabled = false;
        this.objectTitleInput.style.color = '';
        this.objectTitleInput.style.fontStyle = '';
      } else {
        // 传统单个导出模式 - 生成默认标题
        const defaultTitle = this.generateDefaultTitle();
        this.objectTitleInput.value = defaultTitle;
        this.objectTitleInput.disabled = false;
        this.objectTitleInput.style.color = '';
        this.objectTitleInput.style.fontStyle = '';
      }
      
      this.showExportModal();
    } catch (error) {
      console.error('获取空间信息失败:', error);
      throw new Error('获取空间信息失败: ' + error.message);
    }
  }

  /**
   * 填充空间选择器
   */
  async populateSpaceSelect(spaces) {
    this.spaceSelect.innerHTML = '';
    
    if (spaces.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '未找到可用空间';
      this.spaceSelect.appendChild(option);
      return;
    }
    
    spaces.forEach(space => {
      const option = document.createElement('option');
      option.value = space.id;
      option.textContent = space.name || space.id;
      this.spaceSelect.appendChild(option);
    });
    
    // 获取上次选择的空间ID
    const categoryPrefs = this.preferences[this.currentCategory] || {};
    const lastSpaceId = categoryPrefs.spaceId;
    
    // 如果有上次选择的空间，则选中它
    if (lastSpaceId && Array.from(this.spaceSelect.options).some(opt => opt.value === lastSpaceId)) {
      this.spaceSelect.value = lastSpaceId;
      this.selectedSpaceId = lastSpaceId;
    } else {
      // 否则选择第一个空间
      this.selectedSpaceId = spaces[0].id;
    }
    
    // 加载类型列表
    await this.onSpaceChange();
  }

  /**
   * 空间选择改变事件
   */
  async onSpaceChange() {
    const spaceId = this.spaceSelect.value;
    if (!spaceId) return;
    
    this.selectedSpaceId = spaceId;
    
    try {
      const types = await this.anytypeAPI.getObjectTypes(spaceId);
      await this.populateTypeSelect(types);
      
      // 保存用户偏好
      await this.savePreferences();
    } catch (error) {
      console.error('获取对象类型失败:', error);
      alert('❌ 获取对象类型失败: ' + error.message);
    }
  }

  /**
   * 填充类型选择器
   */
  async populateTypeSelect(types) {
    this.typeSelect.innerHTML = '';
    
    // 优先显示常用类型
    // 更新：使用最新的类型键名
    const commonTypes = ['page', 'note', 'bookmark'];
    const typeMap = new Map(types.map(type => [type.id, type]));
    
    // 添加常用类型
    commonTypes.forEach(key => {
      // 查找包含此关键字的类型
      const matchingType = types.find(t => 
        t.id.toLowerCase().includes(key) || 
        (t.name && t.name.toLowerCase().includes(key))
      );
      
      if (matchingType) {
        const option = document.createElement('option');
        option.value = matchingType.id;
        option.textContent = this.getTypeDisplayName(matchingType);
        this.typeSelect.appendChild(option);
      }
    });
    
    // 添加其他类型
    types.forEach(type => {
      // 检查是否已添加
      const alreadyAdded = Array.from(this.typeSelect.options).some(opt => opt.value === type.id);
      
      if (!alreadyAdded) {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = this.getTypeDisplayName(type);
        this.typeSelect.appendChild(option);
      }
    });
    
    // 获取上次选择的类型ID
    const categoryPrefs = this.preferences[this.currentCategory] || {};
    const lastTypeId = categoryPrefs.typeKey;
    
    // 如果有上次选择的类型，则选中它
    if (lastTypeId && Array.from(this.typeSelect.options).some(opt => opt.value === lastTypeId)) {
      this.typeSelect.value = lastTypeId;
      this.selectedTypeKey = lastTypeId;
    } else {
      // 否则选择第一个类型
      this.selectedTypeKey = this.typeSelect.options[0].value;
    }
    
    // 加载模板列表
    await this.onTypeChange();
  }

  /**
   * 类型选择改变事件
   */
  async onTypeChange() {
    const typeId = this.typeSelect.value;
    if (!typeId) return;
    
    this.selectedTypeKey = typeId;
    
    try {
      // 获取模板列表
      const templates = await this.anytypeAPI.getTemplates(this.selectedSpaceId, typeId);
      this.populateTemplateSelect(templates);
      
      // 保存用户偏好
      await this.savePreferences();
    } catch (error) {
      console.error('获取模板列表失败:', error);
      // 清空模板选择器
      this.templateSelect.innerHTML = '<option value="">不使用模板</option>';
      this.selectedTemplateId = null;
    }
  }

  /**
   * 填充模板选择器
   */
  populateTemplateSelect(templates) {
    this.templateSelect.innerHTML = '<option value="">不使用模板</option>';
    
    if (templates && templates.length > 0) {
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name || template.id;
        this.templateSelect.appendChild(option);
      });
      
      // 获取上次选择的模板ID
      const categoryPrefs = this.preferences[this.currentCategory] || {};
      const lastTemplateId = categoryPrefs.templateId;
      
      // 如果有上次选择的模板，则选中它
      if (lastTemplateId && Array.from(this.templateSelect.options).some(opt => opt.value === lastTemplateId)) {
        this.templateSelect.value = lastTemplateId;
        this.selectedTemplateId = lastTemplateId;
      } else {
        // 否则不使用模板
        this.selectedTemplateId = '';
      }
    } else {
      this.selectedTemplateId = '';
    }
  }

  /**
   * 模板选择改变事件
   */
  async onTemplateChange() {
    const templateId = this.templateSelect.value;
    this.selectedTemplateId = templateId;
    
    // 保存用户偏好
    await this.savePreferences();
  }

  /**
   * 获取类型显示名称
   */
  getTypeDisplayName(type) {
    // 根据类型ID或名称添加图标
    let icon = '📄';
    const id = type.id.toLowerCase();
    const name = (type.name || '').toLowerCase();
    
    if (id.includes('page') || name.includes('page')) {
      icon = '📄';
    } else if (id.includes('note') || name.includes('note')) {
      icon = '📝';
    } else if (id.includes('bookmark') || name.includes('bookmark')) {
      icon = '🔖';
    } else if (id.includes('task') || name.includes('task')) {
      icon = '✅';
    }
    
    return `${icon} ${type.name || type.id}`;
  }

  /**
   * 显示选择界面
   */
  showSelectionInterface() {
    // 隐藏输出区域，显示选择界面
    this.outputTextarea.style.display = 'none';
    this.selectionArea.classList.remove('hidden');
    
    // 根据Anytype状态决定选择模式
    this.isMultiSelectMode = this.enableAnytypeCheckbox.checked;
    this.updateSelectionMode();
    
    // 生成项目列表
    this.renderItemList();
  }

  /**
   * 更新选择模式
   */
  updateSelectionMode() {
    if (this.isMultiSelectMode) {
      // 多选模式 - Anytype导出
      this.selectionTitle.textContent = '选择要导出的 Deep Research 内容';
      this.modeIndicator.textContent = '多选模式 - 选择后直接点击导出按钮';
      this.selectAllBtn.classList.remove('hidden');
      this.selectNoneBtn.classList.remove('hidden');
      this.generateSelectedBtn.classList.add('hidden'); // 隐藏生成按钮
    } else {
      // 单选模式 - 直接复制
      this.selectionTitle.textContent = '选择要复制的 Deep Research 内容';
      this.modeIndicator.textContent = '单选模式 - 点击项目自动复制';
      this.selectAllBtn.classList.add('hidden');
      this.selectNoneBtn.classList.add('hidden');
      this.generateSelectedBtn.classList.add('hidden');
    }
  }

  /**
   * 渲染项目列表
   */
  renderItemList() {
    // 清空之前的内容
    this.itemList.innerHTML = '';
    
    // 生成每个项目的选择项
    this.extractedItems.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'research-item';
      itemDiv.dataset.index = index;
      
      // 创建预览文本（限制长度）
      const preview = item.content.substring(0, 200).replace(/\n/g, ' ') + 
                     (item.content.length > 200 ? '...' : '');
      
      // 计算字符数和字数
      const charCount = item.content.length;
      const wordCount = item.content.split(/\s+/).length;
      
      const inputType = this.isMultiSelectMode ? 'checkbox' : 'radio';
      const inputName = this.isMultiSelectMode ? '' : 'name="research-item"';
      const isChecked = this.isMultiSelectMode ? 'checked' : '';
      
      itemDiv.innerHTML = `
        <input type="${inputType}" id="item-${index}" ${inputName} ${isChecked}>
        <div class="research-content">
          <div class="research-title">${item.title}</div>
          <div class="research-preview">${preview}</div>
          <div class="research-meta">
            <div class="meta-item">📄 Article ${item.articleIndex}</div>
            <div class="meta-item">📝 ${charCount} 字符</div>
            <div class="meta-item">📊 ${wordCount} 词</div>
          </div>
        </div>
      `;
      
      // 添加点击事件
      itemDiv.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox' || e.target.type === 'radio') return;
        
        const input = itemDiv.querySelector('input');
        if (this.isMultiSelectMode) {
          input.checked = !input.checked;
        } else {
          // 单选模式 - 直接复制并关闭
          this.copySingleItem(item);
        }
      });
      
      // 单选模式下的radio按钮事件
      if (!this.isMultiSelectMode) {
        const radioInput = itemDiv.querySelector('input');
        radioInput.addEventListener('change', () => {
          if (radioInput.checked) {
            // 更新UI显示选中状态
            this.itemList.querySelectorAll('.research-item').forEach(item => {
              item.classList.remove('selected-single');
            });
            itemDiv.classList.add('selected-single');
            
            // 复制内容
            this.copySingleItem(item);
          }
        });
      }
      
      this.itemList.appendChild(itemDiv);
    });
  }
  
  /**
   * 隐藏选择界面
   */
  hideSelectionInterface() {
    this.selectionArea.classList.add('hidden');
    this.outputTextarea.style.display = 'block';
  }
  
    /**
   * 刷新提取的项目
   */
  async refreshExtractedItems() {
    try {
      this.refreshItemsBtn.disabled = true;
      this.refreshItemsBtn.textContent = '🔄 刷新中...';
      
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!this.isValidUrl(tab.url, this.currentCategory)) {
        alert(this.getInvalidUrlMessage(this.currentCategory));
        return;
      }
      
      // 重新提取内容
      const response = await this.sendMessageToTab(tab.id, {action: 'extract'});
      
      if (response.error) {
        alert('❌ 刷新失败: ' + response.error);
        return;
      }
      
      if (response.mode === 'selection') {
        this.extractedItems = response.items;
        this.pageInfo = response.pageInfo;
        this.renderItemList();
        console.log(`✅ 已刷新，找到 ${response.items.length} 个项目`);
      }
      
    } catch (error) {
      console.error('刷新失败:', error);
      alert('❌ 刷新失败: ' + error.message);
    } finally {
      this.refreshItemsBtn.disabled = false;
      this.refreshItemsBtn.textContent = '🔄 刷新';
    }
  }

  /**
   * 复制单个项目
   */
  async copySingleItem(item) {
    try {
      // 生成单个项目的Markdown
      const markdown = item.content;
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(markdown);
      console.log('✅ 已复制到剪贴板:', item.title);
      
      // 更新输出区域但不关闭选择界面（单选模式保持在列表）
      this.currentMarkdown = markdown;
      this.outputTextarea.value = markdown;
      
      // 显示临时提示
      const originalIndicator = this.modeIndicator.textContent;
      this.modeIndicator.textContent = `✅ 已复制: ${item.title}`;
      this.modeIndicator.style.color = '#28a745';
      
      setTimeout(() => {
        if (this.modeIndicator.textContent.startsWith('✅')) {
          this.modeIndicator.textContent = originalIndicator;
          this.modeIndicator.style.color = '#6c757d';
        }
      }, 3000);
      
    } catch (error) {
      console.error('复制失败:', error);
      alert('❌ 复制失败: ' + error.message);
    }
  }

  /**
   * 全选项目
   */
  selectAllItems() {
    const checkboxes = this.itemList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
  }

  /**
   * 全不选项目
   */
  selectNoneItems() {
    const checkboxes = this.itemList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  }
  
  /**
   * 生成选中项目的Markdown
   */
  async generateSelectedMarkdown() {
    try {
      this.generateSelectedBtn.disabled = true;
      this.generateSelectedBtn.textContent = '生成中...';
      
      // 获取选中的项目
      const checkboxes = this.itemList.querySelectorAll('input[type="checkbox"]');
      const selectedItems = [];
      
      checkboxes.forEach((cb, index) => {
        if (cb.checked) {
          selectedItems.push(this.extractedItems[index]);
        }
      });
      
      // 保存选中的项目用于批量导出
      this.selectedItemsForBatch = selectedItems;
      
      console.log('📋 生成选中内容:', {
        selectedCount: selectedItems.length,
        extractedCount: this.extractedItems.length,
        selectedTitles: selectedItems.map(item => item.title)
      });
      
      if (selectedItems.length === 0) {
        alert('请至少选择一个项目');
        return;
      }
      
      // 获取当前激活的标签页
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      // 发送消息到content script生成Markdown
      const response = await this.sendMessageToTab(tab.id, {
        action: 'generateMarkdown',
        selectedItems: selectedItems,
        pageInfo: this.pageInfo
      });
      
      if (response.error) {
        alert('❌ 生成失败: ' + response.error);
        return;
      }
      
      this.currentMarkdown = response.markdown;
      this.outputTextarea.value = this.currentMarkdown;
      
      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(this.currentMarkdown);
        console.log('✅ Markdown 已复制到剪贴板');
      } catch (err) {
        console.error('复制失败:', err);
      }
      
      // 隐藏选择界面，显示结果
      this.hideSelectionInterface();
      
      // 如果启用了 Anytype 功能，启用导出按钮
      if (this.enableAnytypeCheckbox.checked) {
        this.exportAnytypeBtn.disabled = false;
        // 不显示状态信息，保持原有的导出流程
      }
       
       console.log(`✅ 已生成 ${selectedItems.length} 个选中项目的 Markdown`);
      
    } catch (error) {
      console.error('生成选中内容失败:', error);
      alert('❌ 生成失败: ' + error.message);
    } finally {
      this.generateSelectedBtn.disabled = false;
      this.generateSelectedBtn.textContent = '生成选中内容的 Markdown';
    }
  }

  /**
   * 生成默认标题
   */
  generateDefaultTitle() {
    // 从 Markdown 内容中提取第一行作为标题
    const lines = this.currentMarkdown.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.substring(0, 100); // 限制长度
      }
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    
    // 根据当前类别生成不同的默认标题
    const timestamp = new Date().toLocaleString();
    switch (this.currentCategory) {
      case 'perplexity':
        return `Perplexity 剪藏 - ${timestamp}`;
      case 'chatgpt':
        return `ChatGPT Deep Research - ${timestamp}`;
      default:
        return `内容剪藏 - ${timestamp}`;
    }
  }

  /**
   * 显示导出模态框
   */
  showExportModal() {
    this.exportModal.classList.remove('hidden');
  }

  /**
   * 关闭导出模态框
   */
  closeExportModal() {
    this.exportModal.classList.add('hidden');
    
    // 恢复标题输入框状态
    this.objectTitleInput.disabled = false;
    this.objectTitleInput.style.color = '';
    this.objectTitleInput.style.fontStyle = '';
  }

  /**
   * 执行导出
   */
  async executeExport() {
    try {
      const spaceId = this.spaceSelect.value;
      const typeKey = this.typeSelect.value;
      const templateId = this.selectedTemplateId;
      
      if (!spaceId || !typeKey) {
        alert('❌ 请选择空间和类型');
        return;
      }
      
      this.confirmExportBtn.disabled = true;
      
      // 检查是否是批量导出（ChatGPT Deep Research）
      if (this.selectedItemsForBatch && this.selectedItemsForBatch.length >= 1) {
        // 批量导出模式
        this.confirmExportBtn.textContent = `导出中 (0/${this.selectedItemsForBatch.length})...`;
        
        const results = [];
        let successCount = 0;
        
        for (let i = 0; i < this.selectedItemsForBatch.length; i++) {
          const item = this.selectedItemsForBatch[i];
          this.confirmExportBtn.textContent = `导出中 (${i + 1}/${this.selectedItemsForBatch.length})...`;
          
          try {
            // 构建对象数据
            let objectTitle = item.title;
            
            // 如果只有一个项目且用户修改了标题，使用用户输入的标题
            if (this.selectedItemsForBatch.length === 1 && !this.objectTitleInput.disabled) {
              const userTitle = this.objectTitleInput.value.trim();
              if (userTitle && userTitle !== item.title) {
                objectTitle = userTitle;
              }
            }
            
            const objectData = {
              name: objectTitle,
              type_key: typeKey,
              body: item.content
            };
            
            // 如果选择了模板，添加模板ID
            if (templateId) {
              objectData.template_id = templateId;
            }
            
            // 创建对象
            const result = await this.anytypeAPI.createObject(spaceId, objectData);
            results.push({ success: true, title: item.title, result });
            successCount++;
            
            // 批量导出时添加小延迟避免过快请求
            if (i < this.selectedItemsForBatch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
          } catch (error) {
            console.error(`导出项目 "${item.title}" 失败:`, error);
            results.push({ success: false, title: item.title, error: error.message });
          }
        }
        
        this.closeExportModal();
        
        // 显示批量导出结果
        if (successCount === this.selectedItemsForBatch.length) {
          alert(`✅ 批量导出成功！${successCount} 个对象已创建到 Anytype`);
        } else if (successCount > 0) {
          alert(`⚠️ 部分导出成功：${successCount}/${this.selectedItemsForBatch.length} 个对象已创建到 Anytype`);
        } else {
          alert('❌ 批量导出失败');
        }
        
        console.log('批量导出结果:', results);
        
        // 清理批量选择状态
        this.selectedItemsForBatch = [];
        
      } else {
        // 单个导出模式
        const title = this.objectTitleInput.value.trim();
        
        if (!title) {
          alert('❌ 请输入对象标题');
          return;
        }
        
        this.confirmExportBtn.textContent = '导出中...';
        
        // 构建对象数据
        const objectData = {
          name: title,
          type_key: typeKey,
          body: this.currentMarkdown
        };
        
        // 如果选择了模板，添加模板ID
        if (templateId) {
          objectData.template_id = templateId;
        }
        
        // 创建对象
        const result = await this.anytypeAPI.createObject(spaceId, objectData);
        
        this.closeExportModal();
        alert('✅ 导出成功！对象已创建到 Anytype');
        
        console.log('导出成功:', result);
        
        // 清理批量选择状态
        this.selectedItemsForBatch = [];
      }
      
    } catch (error) {
      console.error('导出失败:', error);
      alert('❌ 导出失败: ' + error.message);
    } finally {
      this.confirmExportBtn.disabled = false;
      this.confirmExportBtn.textContent = '确认导出';
    }
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  const api = new AnytypeAPI();
  new PerplexityClipper(api);
});
