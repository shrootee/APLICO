/**
 * Aplico Chrome Extension - Content Script
 * Conservatively detects resume upload fields and injects selected PDF using DataTransfer.
 * NEVER clicks submit buttons or modifies unrelated form fields.
 */

(function () {
  // Prevent duplicate listener registration if script is injected multiple times
  if (window.__aplico_content_script_loaded) {
    return;
  }
  window.__aplico_content_script_loaded = true;

  /**
   * Evaluates and scores an input element to determine if it is a resume upload field
   */
  function scoreFileInput(input) {
    let score = 0;

    // Reject non-file inputs or disabled inputs
    if (input.type !== 'file' || input.disabled || input.readOnly) {
      return -100;
    }

    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    const title = (input.getAttribute('title') || '').toLowerCase();

    // Check for negative terms (e.g. profile photos, avatars)
    const negativeKeywords = ['photo', 'avatar', 'picture', 'image', 'video', 'audio', 'signature'];
    for (const neg of negativeKeywords) {
      if (name.includes(neg) || id.includes(neg) || ariaLabel.includes(neg)) {
        return -50;
      }
    }

    // Check for direct keywords in attributes
    const resumeKeywords = ['resume', 'cv', 'curriculum', 'curriculo', 'lebenslauf', 'resumé'];
    for (const kw of resumeKeywords) {
      if (name.includes(kw)) score += 40;
      if (id.includes(kw)) score += 40;
      if (ariaLabel.includes(kw)) score += 35;
      if (title.includes(kw)) score += 20;
    }

    // Secondary positive keywords
    const secondaryKeywords = ['attachment', 'document', 'file', 'upload'];
    for (const kw of secondaryKeywords) {
      if (name.includes(kw)) score += 10;
      if (id.includes(kw)) score += 10;
    }

    // Check accept attribute
    if (accept.includes('pdf') || accept.includes('.pdf') || accept.includes('application/pdf')) {
      score += 25;
    }

    // Check associated labels and nearby container text
    try {
      let labelText = '';
      if (input.id) {
        const labelElem = document.querySelector(`label[for="${input.id}"]`);
        if (labelElem) labelText += ' ' + labelElem.innerText;
      }
      const parentLabel = input.closest('label');
      if (parentLabel) labelText += ' ' + parentLabel.innerText;

      // Nearby container (up to 2 levels)
      const container = input.closest('.form-group, .field, [class*="upload"], [class*="file"], div');
      if (container) {
        labelText += ' ' + (container.innerText || '').substring(0, 300);
      }

      const lowerLabel = labelText.toLowerCase();
      for (const kw of resumeKeywords) {
        if (lowerLabel.includes(kw)) score += 30;
      }
    } catch (_) {}

    return score;
  }

  /**
   * Finds the most suitable resume file input on the active page
   */
  function findResumeFileInput() {
    const allFileInputs = Array.from(document.querySelectorAll('input[type="file"]'));

    if (allFileInputs.length === 0) {
      return null;
    }

    // Score all file inputs
    const scored = allFileInputs.map((input) => ({
      input,
      score: scoreFileInput(input)
    }));

    // Filter out definitely excluded inputs
    const candidates = scored.filter((item) => item.score > 0);

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].input;
    }

    // If there is only one file input on the whole page and it wasn't disqualified
    if (allFileInputs.length === 1 && scored[0].score >= 0) {
      return allFileInputs[0];
    }

    return null;
  }

  /**
   * Injects an on-screen toast on the active webpage
   */
  function showFloatingToast(message, isSuccess = true) {
    const existing = document.getElementById('aplico-extension-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'aplico-extension-toast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #0F172A;
      color: #FFFFFF;
      padding: 12px 18px;
      border-radius: 12px;
      border: 1.5px solid ${isSuccess ? '#5EEAD4' : '#EF4444'};
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px ${isSuccess ? 'rgba(94, 234, 212, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      line-height: 1.4;
      pointer-events: none;
      animation: aplicoToastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    // Inject styles for animation if not present
    if (!document.getElementById('aplico-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'aplico-toast-styles';
      style.textContent = `
        @keyframes aplicoToastIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aplicoToastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-8px) scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }

    const icon = document.createElement('span');
    icon.innerHTML = isSuccess ? '✓' : '⚠️';
    icon.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${isSuccess ? 'rgba(94, 234, 212, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
      color: ${isSuccess ? '#5EEAD4' : '#EF4444'};
      font-weight: bold;
      font-size: 13px;
    `;

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'aplicoToastOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Converts base64 encoded string to native File object
   */
  function base64ToFile(base64Data, fileName, fileType) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mime = fileType || 'application/pdf';
    const blob = new Blob([byteArray], { type: mime });
    return new File([blob], fileName, { type: mime, lastModified: Date.now() });
  }

  // Listen for message from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      sendResponse({ status: 'PONG', url: window.location.href });
      return true;
    }

    if (request.action === 'CHECK_INPUT') {
      const input = findResumeFileInput();
      sendResponse({
        found: !!input,
        fieldInfo: input ? (input.name || input.id || 'File input') : null
      });
      return true;
    }

    if (request.action === 'ATTACH_RESUME') {
      const { fileName, fileType, fileBase64 } = request;

      if (!fileBase64 || !fileName) {
        sendResponse({ success: false, reason: 'INVALID_PAYLOAD', message: 'Missing resume file data.' });
        return true;
      }

      const input = findResumeFileInput();

      if (!input) {
        showFloatingToast('Aplico: No resume upload field found on this page.', false);
        sendResponse({
          success: false,
          reason: 'NO_INPUT_FOUND',
          message: 'Could not locate a standard resume upload field on this page.'
        });
        return true;
      }

      try {
        const file = base64ToFile(fileBase64, fileName, fileType);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        // Assign to input
        input.files = dataTransfer.files;

        // Dispatch standard change and input events
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

        // Verify attachment
        const isAttached = input.files && input.files.length > 0 && input.files[0].name === fileName;

        if (isAttached) {
          showFloatingToast(`Aplico: Attached "${fileName}"`, true);
          sendResponse({
            success: true,
            fileName: fileName,
            fieldName: input.name || input.id || 'Resume upload'
          });
        } else {
          showFloatingToast('Aplico: Website blocked automatic attachment.', false);
          sendResponse({
            success: false,
            reason: 'ATTACHMENT_UNVERIFIED',
            message: 'Website did not accept the programmatic file attachment.'
          });
        }
      } catch (err) {
        console.error('[Aplico Content Script] Attachment error:', err);
        showFloatingToast('Aplico: Error attaching resume.', false);
        sendResponse({
          success: false,
          reason: 'EXECUTION_ERROR',
          message: err.message || 'Error occurred while attaching file.'
        });
      }

      return true;
    }
  });

  console.log('[Aplico Content Script] Initialized on', window.location.hostname);
})();
