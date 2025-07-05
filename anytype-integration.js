import AnytypeAPI from './anytype-api.js';

export default class AnytypeIntegration {
  constructor(contentHandler) {
    this.api = new AnytypeAPI();
    this.contentHandler = contentHandler;
    this.currentChallengeId = null;
    this.selectedSpaceId = null;
    this.selectedTypeKey = null;
    this.selectedTemplateId = null;
    this.selectedTags = [];
    this.tagPropertyId = null;
    this.tagPropertyName = null;
    this.preferences = {};
    this._initElements();
  }

  getModuleKey() {
    return this.contentHandler.currentCategory || 'default';
  }

  _initElements() {
    this.enableAnytypeCheckbox = document.getElementById('enableAnytype');
    this.exportAnytypeBtn = document.getElementById('exportAnytype');
    this.anytypeStatus = document.getElementById('anytypeStatus');
    this.pairingModal = document.getElementById('pairingModal');
    this.verificationCodeInput = document.getElementById('verificationCode');
    this.confirmPairingBtn = document.getElementById('confirmPairing');
    this.cancelPairingBtn = document.getElementById('cancelPairing');
    this.exportModal = document.getElementById('exportModal');
    this.spaceSelect = document.getElementById('spaceSelect');
    this.typeSelect = document.getElementById('typeSelect');
    this.templateSelect = document.getElementById('templateSelect');
    this.tagGroup = document.getElementById('tagGroup');
    this.tagList = document.getElementById('tagList');
    this.objectTitleInput = document.getElementById('objectTitle');
    this.objectTitleGroup = document.getElementById('objectTitleGroup');
    this.objectListGroup = document.getElementById('objectListGroup');
    this.objectList = document.getElementById('objectList');
    this.confirmExportBtn = document.getElementById('confirmExport');
    this.cancelExportBtn = document.getElementById('cancelExport');
  }

  isEnabled() {
    return this.enableAnytypeCheckbox.checked;
  }

  enableExport() {
    this.exportAnytypeBtn.disabled = false;
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['enableAnytype', 'preferences']);
    this.enableAnytypeCheckbox.checked = result.enableAnytype || false;
    this.preferences = result.preferences || {};
  }

  async saveSettings() {
    await chrome.storage.local.set({
      enableAnytype: this.enableAnytypeCheckbox.checked,
      preferences: this.preferences
    });
  }

  updatePreferences() {
    const key = this.getModuleKey();
    this.preferences[key] = {
      spaceId: this.spaceSelect.value,
      typeKey: this.typeSelect.value,
      templateId: this.templateSelect.value,
      selectedTags: this.getSelectedTags()
    };
    this.saveSettings();
  }

  async toggleAnytypeFeature() {
    await this.saveSettings();
    if (this.isEnabled()) {
      this.exportAnytypeBtn.classList.remove('hidden');
      this.exportAnytypeBtn.disabled = false;
    } else {
      this.exportAnytypeBtn.classList.add('hidden');
    }
    if (this.contentHandler) {
      this.contentHandler.onAnytypeToggle();
    }
  }

  updateAnytypeStatus(type, message) {
    if (!message) {
      this.anytypeStatus.classList.add('hidden');
      return;
    }
    this.anytypeStatus.className = `status ${type}`;
    this.anytypeStatus.textContent = message;
    this.anytypeStatus.classList.remove('hidden');
  }

  async startExportFlow() {
    try {
      this.exportAnytypeBtn.disabled = true;
      if (!this.contentHandler.currentMarkdown) {
        if (this.contentHandler.extractedItems.length === 0) {
          // 未执行过提取，先自动提取
          await this.contentHandler.extractContent();
        }
        // 如果仍然没有Markdown且处于多选模式，则尝试根据用户选择生成
        if (!this.contentHandler.currentMarkdown && this.contentHandler.extractedItems.length > 0) {
          await this.contentHandler.generateSelectedMarkdown();
        }
      }

      if (!this.contentHandler.currentMarkdown) {
        alert('❌ 请先提取或选择内容');
        return;
      }
      await this.showExportOptions();
    } catch (e) {
      if (e.code === 'unauthorized') {
        this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
        await this.startPairingFlow();
        return;
      }
      alert('❌ ' + e.message);
    } finally {
      this.exportAnytypeBtn.disabled = false;
    }
  }

  async startPairingFlow() {
    try {
      this.updateAnytypeStatus('info', '正在连接 Anytype...');
      this.currentChallengeId = await this.api.startPairing();
      this.showPairingModal();
    } catch (e) {
      this.updateAnytypeStatus('error', '❌ 连接失败');
      alert('❌ ' + e.message);
    }
  }

  showPairingModal() {
    this.verificationCodeInput.value = '';
    this.confirmPairingBtn.disabled = true;
    this.pairingModal.classList.remove('hidden');
  }

  closePairingModal() {
    this.pairingModal.classList.add('hidden');
    this.currentChallengeId = null;
  }

  validateVerificationCode() {
    const code = this.verificationCodeInput.value.trim();
    this.confirmPairingBtn.disabled = code.length !== 4 || !/^\d{4}$/.test(code);
  }

  async completePairing() {
    try {
      const code = this.verificationCodeInput.value.trim();
      await this.api.completePairing(this.currentChallengeId, code);
      this.closePairingModal();
      this.updateAnytypeStatus('success', '✅ 配对成功！');
      await this.showExportOptions();
    } catch (e) {
      alert('❌ 配对失败: ' + e.message);
    }
  }

  async showExportOptions() {
    try {
      const spaces = await this.api.getSpaces();
      const prefs = this.preferences[this.contentHandler.currentCategory] || {};
      await this.populateSpaceSelect(spaces, prefs.spaceId, prefs.typeKey, prefs.templateId, prefs.selectedTags);
      const multiple = this.contentHandler.selectedItemsForBatch.length > 1;
      if (multiple) {
        this.objectTitleGroup.classList.add('hidden');
        this.objectListGroup.classList.remove('hidden');
        this.objectList.innerHTML = '';
        this.contentHandler.selectedItemsForBatch.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item.title || '未命名';
          this.objectList.appendChild(li);
        });
        this.objectTitleInput.value = `将创建 ${this.contentHandler.selectedItemsForBatch.length} 个对象`;
      } else {
        this.objectListGroup.classList.add('hidden');
        this.objectTitleGroup.classList.remove('hidden');
        this.objectTitleInput.value = this.contentHandler.generateDefaultTitle();
      }
      this.showExportModal();
    } catch (e) {
      if (e.code === 'unauthorized') {
        this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
        await this.startPairingFlow();
        return;
      }
      throw e;
    }
  }

  async populateSpaceSelect(spaces, selectedId, selectedType, selectedTemplate, selectedTags) {
    this.spaceSelect.innerHTML = '';
    spaces.forEach(space => {
      const opt = document.createElement('option');
      opt.value = space.id;
      opt.textContent = space.name || space.id;
      this.spaceSelect.appendChild(opt);
    });
    this.selectedSpaceId = spaces[0]?.id;
    if (selectedId && spaces.find(s => s.id === selectedId)) {
      this.spaceSelect.value = selectedId;
      this.selectedSpaceId = selectedId;
    }
    await this.onSpaceChange(selectedType, selectedTemplate, selectedTags);
  }

  async onSpaceChange(selectedType, selectedTemplate, selectedTags) {
    try {
      this.selectedSpaceId = this.spaceSelect.value;
      const types = await this.api.getObjectTypes(this.selectedSpaceId);
      await this.populateTypeSelect(types, selectedType, selectedTemplate);
      await this.loadTags(selectedTags);
    } catch (e) {
      if (e.code === 'unauthorized') {
        this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
        await this.startPairingFlow();
        return;
      }
      throw e;
    }
  }

  async populateTypeSelect(types, selectedType, selectedTemplate) {
    this.typeSelect.innerHTML = '';
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name || t.id;
      this.typeSelect.appendChild(opt);
    });
    this.selectedTypeKey = this.typeSelect.options[0].value;
    if (selectedType && types.find(t => t.id === selectedType)) {
      this.typeSelect.value = selectedType;
      this.selectedTypeKey = selectedType;
    }
    await this.onTypeChange(selectedTemplate);
  }

  async onTypeChange(selectedTemplate) {
    try {
      this.selectedTypeKey = this.typeSelect.value;
      const templates = await this.api.getTemplates(this.selectedSpaceId, this.selectedTypeKey);
      this.populateTemplateSelect(templates, selectedTemplate);
    } catch (e) {
      if (e.code === 'unauthorized') {
        this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
        await this.startPairingFlow();
        return;
      }
      throw e;
    }
  }

  onTemplateChange() {
    this.selectedTemplateId = this.templateSelect.value;
    this.updatePreferences();
  }

  populateTemplateSelect(templates, selectedTemplate) {
    this.templateSelect.innerHTML = '<option value="">不使用模板</option>';
    templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name || t.id;
      this.templateSelect.appendChild(opt);
    });
    this.selectedTemplateId = '';
    if (selectedTemplate && templates.find(t => t.id === selectedTemplate)) {
      this.templateSelect.value = selectedTemplate;
      this.selectedTemplateId = selectedTemplate;
    }
  }

  async loadTags(selectedTags = []) {
    try {
      // 首先获取属性列表，寻找key为'tag'的属性
      const properties = await this.api.listProperties(this.selectedSpaceId);
      console.log('🏷️ 所有属性:', properties);
      
      // 寻找标签属性（key为'tag'）
      const tagProperty = properties.find(prop => prop.key === 'tag');
      if (!tagProperty) {
        console.log('⚠️ 未找到标签属性，隐藏标签选择区域');
        this.tagGroup.classList.add('hidden');
        return;
      }

      console.log('🏷️ 找到标签属性:', tagProperty);
      this.tagPropertyId = tagProperty.id;
      this.tagPropertyName = tagProperty.name || 'Tag';
      
      // 更新标签区域的标题
      const tagLabel = this.tagGroup.querySelector('label');
      tagLabel.textContent = `选择${this.tagPropertyName} (可选)`;
      
      // 获取标签列表
      const tags = await this.api.listTags(this.selectedSpaceId, this.tagPropertyId);
      console.log('🏷️ 标签列表:', tags);
      
      this.populateTagSelect(tags, selectedTags);
      this.tagGroup.classList.remove('hidden');
    } catch (error) {
      if (error.code === 'unauthorized') {
        this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
        await this.startPairingFlow();
        return;
      }
      console.error('❌ 加载标签失败:', error);
      this.tagGroup.classList.add('hidden');
    }
  }

  populateTagSelect(tags, selectedTags = []) {
    this.tagList.innerHTML = '';
    
    // 添加现有标签
    tags.forEach(tag => {
      const tagItem = document.createElement('div');
      tagItem.className = 'tag-item';
      tagItem.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          const checkbox = tagItem.querySelector('input[type="checkbox"]');
          checkbox.checked = !checkbox.checked;
          this.onTagChange();
        }
      });
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tag.id;
      checkbox.checked = selectedTags.includes(tag.id);
      checkbox.addEventListener('change', () => this.onTagChange());
      
      const tagName = document.createElement('span');
      tagName.className = 'tag-name';
      tagName.textContent = tag.name || tag.id;
      
      tagItem.appendChild(checkbox);
      tagItem.appendChild(tagName);
      
      // 如果有颜色信息，添加颜色指示器
      if (tag.color) {
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'tag-color-indicator';
        colorIndicator.style.backgroundColor = tag.color;
        tagItem.appendChild(colorIndicator);
      }
      
      this.tagList.appendChild(tagItem);
    });
    
    // 添加"添加新标签"选项
    this.addCreateNewTagOption();
    
    // 更新选中的标签
    this.selectedTags = this.getSelectedTags();
  }

  addCreateNewTagOption() {
    const addTagItem = document.createElement('div');
    addTagItem.className = 'add-tag-item';
    addTagItem.innerHTML = `+ 添加新${this.tagPropertyName || '标签'}`;
    
    addTagItem.addEventListener('click', () => {
      this.showAddTagInput(addTagItem);
    });
    
    this.tagList.appendChild(addTagItem);
  }

  showAddTagInput(addTagItem) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'add-tag-input-container';
    
    const input = document.createElement('input');
    input.className = 'add-tag-input';
    input.type = 'text';
    input.placeholder = `输入新${this.tagPropertyName || '标签'}名称...`;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'add-tag-confirm';
    confirmBtn.textContent = '✓';
    
    const saveNewTag = async () => {
      const tagName = input.value.trim();
      if (!tagName) return;
      
      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '...';
        
        // 创建新标签，使用颜色名称
        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        await this.api.createTag(this.selectedSpaceId, this.tagPropertyId, {
          name: tagName,
          color: randomColor
        });
        
        // 重新加载标签列表
        await this.loadTags(this.selectedTags);

      } catch (error) {
        if (error.code === 'unauthorized') {
          this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
          await this.startPairingFlow();
          return;
        }
        alert('❌ 创建标签失败: ' + error.message);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓';
      }
    };
    
    confirmBtn.addEventListener('click', saveNewTag);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveNewTag();
      }
    });
    
    inputContainer.appendChild(input);
    inputContainer.appendChild(confirmBtn);
    
    // 替换添加标签项
    this.tagList.replaceChild(inputContainer, addTagItem);
    input.focus();
    
    // 点击其他地方时恢复添加标签项
    const restoreAddItem = (e) => {
      if (!inputContainer.contains(e.target)) {
        this.tagList.replaceChild(addTagItem, inputContainer);
        document.removeEventListener('click', restoreAddItem);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', restoreAddItem);
    }, 100);
  }

  getSelectedTags() {
    const checkboxes = this.tagList.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  onTagChange() {
    this.selectedTags = this.getSelectedTags();
    this.updatePreferences();
  }

  showExportModal() {
    this.exportModal.classList.remove('hidden');
  }

  closeExportModal() {
    this.exportModal.classList.add('hidden');
  }

  async executeExport() {
    try {
      const spaceId = this.spaceSelect.value;
      const typeKey = this.typeSelect.value;
      const templateId = this.templateSelect.value;
      const selectedTags = this.getSelectedTags();
      
      const key = this.getModuleKey();
      this.preferences[key] = { spaceId, typeKey, templateId, selectedTags };
      await this.saveSettings();
      
      const items = this.contentHandler.selectedItemsForBatch;
      if (items.length > 1) {
        for (const item of items) {
          const obj = {
            name: item.title || this.objectTitleInput.value.trim(),
            type_key: typeKey,
            body: item.content
          };
          if (templateId) obj.template_id = templateId;
          
          // 添加标签属性
          if (selectedTags.length > 0 && this.tagPropertyId) {
            obj.properties = obj.properties || [];
            obj.properties.push({
              key: 'tag',
              multi_select: selectedTags
            });
          }
          
          await this.api.createObject(spaceId, obj);
        }
      } else {
        const body = this.contentHandler.currentMarkdown;
        const title = this.objectTitleInput.value.trim();
        const obj = { name: title, type_key: typeKey, body };
        if (templateId) obj.template_id = templateId;
        
        // 添加标签属性
        if (selectedTags.length > 0 && this.tagPropertyId) {
          obj.properties = obj.properties || [];
          obj.properties.push({
            key: 'tag',
            multi_select: selectedTags
          });
        }
        
        await this.api.createObject(spaceId, obj);
      }
      this.closeExportModal();
      this.updatePreferences();
      alert('✅ 导出成功！对象已创建到 Anytype');
    } catch (e) {
      if (e.code === 'unauthorized') {
        this.updateAnytypeStatus('error', 'API 认证失败，请重新配对');
        await this.startPairingFlow();
        return;
      }
      alert('❌ 导出失败: ' + e.message);
    }
  }
}
