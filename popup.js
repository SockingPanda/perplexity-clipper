/**
 * Perplexity Clipper with Anytype Integration
 * 支持提取 Markdown 并导出到 Anytype
 */

class PerplexityClipper {
  constructor() {
    this.currentMarkdown = '';
    this.currentChallengeId = null;
    this.selectedSpaceId = null;
    this.selectedTypeKey = null;
    this.selectedTemplateId = null;
    this.currentCategory = 'perplexity';
    this.preferences = {};
    
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
   * 提取内容
   */
  async extractContent() {
    try {
      console.log('开始提取过程...');
      this.extractBtn.disabled = true;
      this.extractBtn.textContent = '提取中...';
      
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      console.log('当前标签页:', tab.url);
      
      if (!this.isPerplexityUrl(tab.url)) {
        alert('❌ 请在 Perplexity 文章页面使用此扩展');
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
      this.extractBtn.textContent = '抽取并复制 Markdown';
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

      // 如果当前没有内容，先提取内容
      if (!this.currentMarkdown) {
        console.log('自动提取内容...');
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!this.isPerplexityUrl(tab.url)) {
          alert('❌ 请在 Perplexity 文章页面使用此扩展');
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

      // 检查是否已配对
      try {
        const isPaired = await window.anytypeAPI.isPaired();
        
        if (!isPaired) {
          // 需要配对
          await this.startPairingFlow();
        } else {
          // 已配对，直接进入导出选择
          await this.showExportOptions();
        }
      } catch (error) {
        console.error('检查配对状态失败:', error);
        // 即使检查配对状态失败，也尝试启动配对流程
        await this.startPairingFlow();
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
      this.currentChallengeId = await window.anytypeAPI.startPairing();
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

      await window.anytypeAPI.completePairing(this.currentChallengeId, code);
      
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
      const spaces = await window.anytypeAPI.getSpaces();
      await this.populateSpaceSelect(spaces);
      
      // 生成默认标题
      const defaultTitle = this.generateDefaultTitle();
      this.objectTitleInput.value = defaultTitle;
      
      this.showExportModal();
    } catch (error) {
      console.error('获取空间信息失败:', error);
      // 如果获取空间信息失败，可能是因为 API Key 无效，尝试重新配对
      this.updateAnytypeStatus('error', '❌ 获取空间信息失败，请重试');
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
      const types = await window.anytypeAPI.getObjectTypes(spaceId);
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
      const templates = await window.anytypeAPI.getTemplates(this.selectedSpaceId, typeId);
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
    
    return `Perplexity 剪藏 - ${new Date().toLocaleString()}`;
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
  }

  /**
   * 执行导出
   */
  async executeExport() {
    try {
      const title = this.objectTitleInput.value.trim();
      const spaceId = this.spaceSelect.value;
      const typeKey = this.typeSelect.value;
      const templateId = this.selectedTemplateId;
      
      if (!title) {
        alert('❌ 请输入对象标题');
        return;
      }
      
      if (!spaceId || !typeKey) {
        alert('❌ 请选择空间和类型');
        return;
      }
      
      this.confirmExportBtn.disabled = true;
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
      const result = await window.anytypeAPI.createObject(spaceId, objectData);
      
      this.closeExportModal();
      alert('✅ 导出成功！对象已创建到 Anytype');
      
      console.log('导出成功:', result);
      
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
  new PerplexityClipper();
});
