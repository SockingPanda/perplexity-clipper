import AnytypeAPI from './anytype-api.js';

export default class AnytypeIntegration {
  constructor(contentHandler) {
    this.api = new AnytypeAPI();
    this.contentHandler = contentHandler;
    this.currentChallengeId = null;
    this.selectedSpaceId = null;
    this.selectedTypeKey = null;
    this.selectedTemplateId = null;
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
    this.preferences = result.preferences || { perplexity: {}, chatgpt: {} };
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
      templateId: this.templateSelect.value
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
    const spaces = await this.api.getSpaces();
    const prefs = this.preferences[this.contentHandler.currentCategory] || {};
    await this.populateSpaceSelect(spaces, prefs.spaceId, prefs.typeKey, prefs.templateId);
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
  }

  async populateSpaceSelect(spaces, selectedId, selectedType, selectedTemplate) {
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
    await this.onSpaceChange(selectedType, selectedTemplate);
  }

  async onSpaceChange(selectedType, selectedTemplate) {
    this.selectedSpaceId = this.spaceSelect.value;
    const types = await this.api.getObjectTypes(this.selectedSpaceId);
    await this.populateTypeSelect(types, selectedType, selectedTemplate);
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
    this.selectedTypeKey = this.typeSelect.value;
    const templates = await this.api.getTemplates(this.selectedSpaceId, this.selectedTypeKey);
    this.populateTemplateSelect(templates, selectedTemplate);
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
      const key = this.contentHandler.currentCategory || 'perplexity';
      this.preferences[key] = { spaceId, typeKey, templateId };
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
          await this.api.createObject(spaceId, obj);
        }
      } else {
        const body = this.contentHandler.currentMarkdown;
        const title = this.objectTitleInput.value.trim();
        const obj = { name: title, type_key: typeKey, body };
        if (templateId) obj.template_id = templateId;
        await this.api.createObject(spaceId, obj);
      }
      this.closeExportModal();
      this.updatePreferences();
      alert('✅ 导出成功！对象已创建到 Anytype');
    } catch (e) {
      alert('❌ 导出失败: ' + e.message);
    }
  }
}
