import ContentHandler from './content-handler.js';
import AnytypeIntegration from './anytype-integration.js';

document.addEventListener('DOMContentLoaded', async () => {
  const content = new ContentHandler();
  const anytype = new AnytypeIntegration(content);
  content.setAnytypeManager(anytype);
  await anytype.loadSettings();
  await content.autoSetCategoryFromCurrentTab();
  await anytype.toggleAnytypeFeature();
  content.updateExtractButtonText();

  // main actions
  content.extractBtn.addEventListener('click', () => content.extractContent());
  content.categorySelect.addEventListener('change', () => content.onCategoryChange());

  // anytype settings
  anytype.enableAnytypeCheckbox.addEventListener('change', () => anytype.toggleAnytypeFeature());
  anytype.exportAnytypeBtn.addEventListener('click', () => anytype.startExportFlow());

  // pairing modal
  anytype.confirmPairingBtn.addEventListener('click', () => anytype.completePairing());
  anytype.cancelPairingBtn.addEventListener('click', () => anytype.closePairingModal());
  anytype.verificationCodeInput.addEventListener('input', () => anytype.validateVerificationCode());

  // export modal
  anytype.confirmExportBtn.addEventListener('click', () => anytype.executeExport());
  anytype.cancelExportBtn.addEventListener('click', () => anytype.closeExportModal());
  anytype.spaceSelect.addEventListener('change', () => anytype.onSpaceChange());
  anytype.typeSelect.addEventListener('change', () => anytype.onTypeChange());
  anytype.templateSelect.addEventListener('change', () => anytype.onTemplateChange());

  // selection handlers
  content.selectAllBtn.addEventListener('click', () => content.selectAllItems());
  content.selectNoneBtn.addEventListener('click', () => content.selectNoneItems());
  content.generateSelectedBtn.addEventListener('click', () => content.generateSelectedMarkdown());
  content.refreshItemsBtn.addEventListener('click', () => content.refreshExtractedItems());
});
