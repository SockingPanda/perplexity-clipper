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

  async toggleAnytypeFeature() {
    await this.saveSettings();
    if (this.isEnabled()) {
      this.exportAnytypeBtn.classList.remove('hidden');
      this.exportAnytypeBtn.disabled = false;
    } else {
      this.exportAnytypeBtn.classList.add('hidden');
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
    await this.populateSpaceSelect(spaces);
    const title = this.contentHandler.selectedItemsForBatch.length > 1
      ? `将创建 ${this.contentHandler.selectedItemsForBatch.length} 个对象`
      : this.contentHandler.generateDefaultTitle();
    this.objectTitleInput.value = title;
    this.showExportModal();
  }

  async populateSpaceSelect(spaces) {
    this.spaceSelect.innerHTML = '';
    spaces.forEach(space => {
      const opt = document.createElement('option');
      opt.value = space.id;
      opt.textContent = space.name || space.id;
      this.spaceSelect.appendChild(opt);
    });
    this.selectedSpaceId = spaces[0]?.id;
    await this.onSpaceChange();
  }

  async onSpaceChange() {
    this.selectedSpaceId = this.spaceSelect.value;
    const types = await this.api.getObjectTypes(this.selectedSpaceId);
    await this.populateTypeSelect(types);
  }

  async populateTypeSelect(types) {
    this.typeSelect.innerHTML = '';
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name || t.id;
      this.typeSelect.appendChild(opt);
    });
    this.selectedTypeKey = this.typeSelect.options[0].value;
    await this.onTypeChange();
  }

  async onTypeChange() {
    this.selectedTypeKey = this.typeSelect.value;
    const templates = await this.api.getTemplates(this.selectedSpaceId, this.selectedTypeKey);
    this.populateTemplateSelect(templates);
  }

  onTemplateChange() {
    this.selectedTemplateId = this.templateSelect.value;
  }

  populateTemplateSelect(templates) {
    this.templateSelect.innerHTML = '<option value="">不使用模板</option>';
    templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name || t.id;
      this.templateSelect.appendChild(opt);
    });
    this.selectedTemplateId = '';
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
      alert('✅ 导出成功！对象已创建到 Anytype');
    } catch (e) {
      alert('❌ 导出失败: ' + e.message);
    }
  }
}
