/**
 * Aplico Chrome Extension - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const authView = document.getElementById('auth-view');
  const resumesView = document.getElementById('resumes-view');
  const authUserBar = document.getElementById('auth-user-bar');
  const userEmailDisplay = document.getElementById('user-email-display');
  const btnSignout = document.getElementById('btn-signout');

  // Login elements
  const loginForm = document.getElementById('login-form');
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');
  const btnLogin = document.getElementById('btn-login');
  const loginSpinner = document.getElementById('login-spinner');

  // Resumes list elements
  const searchInput = document.getElementById('resume-search');
  const btnRefresh = document.getElementById('btn-refresh');
  const resumesListContainer = document.getElementById('resumes-list-container');
  const resumesLoading = document.getElementById('resumes-loading');
  const resumesEmpty = document.getElementById('resumes-empty');
  const btnOpenAplicoEmpty = document.getElementById('btn-open-aplico-empty');

  // Action bar elements
  const actionBar = document.getElementById('action-bar');
  const selectedResumeTitle = document.getElementById('selected-resume-title');
  const btnUseResume = document.getElementById('btn-use-resume');
  const btnUseResumeText = document.getElementById('btn-use-resume-text');
  const attachSpinner = document.getElementById('attach-spinner');
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  const btnOpenLibrary = document.getElementById('btn-open-library');

  // Status banner elements
  const statusBanner = document.getElementById('status-banner');
  const statusText = document.getElementById('status-text');
  const statusIcon = document.getElementById('status-icon');

  // State
  let allResumes = [];
  let selectedResume = null;
  let statusTimeout = null;

  /**
   * Display floating feedback banner
   */
  function showStatus(message, type = 'success', duration = 4000) {
    if (statusTimeout) clearTimeout(statusTimeout);

    statusBanner.className = `status-banner ${type}`;
    statusText.textContent = message;

    if (type === 'success') {
      statusIcon.textContent = '✓';
    } else if (type === 'error') {
      statusIcon.textContent = '✕';
    } else {
      statusIcon.textContent = '⚠️';
    }

    statusBanner.classList.remove('hidden');

    if (duration > 0) {
      statusTimeout = setTimeout(() => {
        statusBanner.classList.add('hidden');
      }, duration);
    }
  }

  function hideStatus() {
    if (statusTimeout) clearTimeout(statusTimeout);
    statusBanner.classList.add('hidden');
  }

  /**
   * Formats file size in bytes to KB or MB
   */
  function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Formats ISO timestamp to short human date
   */
  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (_) {
      return '';
    }
  }

  /**
   * Check authentication state on popup mount
   */
  async function checkAuth() {
    hideStatus();
    try {
      const session = await window.AplicoSupabase.getValidSession();
      if (session && session.user) {
        showResumesView(session.user);
        await loadResumes();
      } else {
        showAuthView();
      }
    } catch (err) {
      console.error('[Popup] Auth check error:', err);
      showAuthView();
    }
  }

  function showAuthView() {
    authView.classList.remove('hidden');
    resumesView.classList.add('hidden');
    authUserBar.classList.add('hidden');
    actionBar.classList.add('hidden');
    selectedResume = null;
  }

  function showResumesView(user) {
    authView.classList.add('hidden');
    resumesView.classList.remove('hidden');
    authUserBar.classList.remove('hidden');
    userEmailDisplay.textContent = user.email || 'Aplico User';
    userEmailDisplay.title = user.email || '';
  }

  /**
   * Handle user login
   */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus();

    const email = inputEmail.value.trim();
    const password = inputPassword.value;

    if (!email || !password) {
      showStatus('Please enter your email and password.', 'warning');
      return;
    }

    try {
      btnLogin.disabled = true;
      loginSpinner.classList.remove('hidden');

      const session = await window.AplicoSupabase.signIn(email, password);
      showStatus('Signed in successfully!', 'success', 2000);
      showResumesView(session.user);
      inputPassword.value = '';
      await loadResumes();
    } catch (err) {
      console.error('[Popup] Sign in error:', err);
      showStatus(err.message || 'Failed to sign in. Please verify credentials.', 'error', 5000);
    } finally {
      btnLogin.disabled = false;
      loginSpinner.classList.add('hidden');
    }
  });

  /**
   * Handle user sign out
   */
  btnSignout.addEventListener('click', async () => {
    try {
      await window.AplicoSupabase.signOut();
      showStatus('Signed out', 'success', 2000);
      showAuthView();
    } catch (err) {
      console.error('[Popup] Sign out error:', err);
    }
  });

  /**
   * Load resumes from Supabase
   */
  async function loadResumes() {
    try {
      resumesLoading.classList.remove('hidden');
      resumesEmpty.classList.add('hidden');
      resumesListContainer.innerHTML = '';
      actionBar.classList.add('hidden');

      const data = await window.AplicoSupabase.fetchResumes();
      allResumes = data || [];

      renderResumes(allResumes);

      if (allResumes.length === 0) {
        resumesEmpty.classList.remove('hidden');
      } else {
        // Auto-select the first resume
        selectResume(allResumes[0]);
      }
    } catch (err) {
      console.error('[Popup] Error loading resumes:', err);
      if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
        showStatus('Session expired. Please sign in again.', 'warning');
        showAuthView();
      } else {
        showStatus(err.message || 'Failed to load resumes from Aplico.', 'error');
      }
    } finally {
      resumesLoading.classList.add('hidden');
    }
  }

  /**
   * Render resume card items
   */
  function renderResumes(list) {
    resumesListContainer.innerHTML = '';

    if (!list || list.length === 0) {
      if (allResumes.length > 0) {
        // Search returned no matches
        resumesListContainer.innerHTML = `
          <div class="state-container" style="padding: 30px 10px;">
            <p style="color: #64748B;">No resumes match your search filter.</p>
          </div>
        `;
      }
      return;
    }

    list.forEach((resume) => {
      const isSelected = selectedResume && selectedResume.id === resume.id;
      const card = document.createElement('div');
      card.className = `resume-card-item ${isSelected ? 'selected' : ''}`;
      card.dataset.id = resume.id;

      const title = resume.resume_name || resume.file_name || 'Untitled Resume';
      const fileName = resume.file_name || 'resume.pdf';
      const roleTag = resume.target_role ? `<span class="role-tag">${escapeHtml(resume.target_role)}</span>` : '';
      const sizeStr = formatSize(resume.file_size);
      const dateStr = formatDate(resume.uploaded_at);
      const meta = [sizeStr, dateStr].filter(Boolean).join(' • ');

      card.innerHTML = `
        <div class="pdf-icon-badge">
          <span>PDF</span>
        </div>
        <div class="resume-item-content">
          <div class="resume-title-row">
            <span class="resume-name-text" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
            ${roleTag}
          </div>
          <div class="resume-file-info" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>
          <div class="resume-meta-row">${escapeHtml(meta)}</div>
        </div>
        <div class="check-indicator">✓</div>
      `;

      card.addEventListener('click', () => {
        selectResume(resume);
      });

      resumesListContainer.appendChild(card);
    });
  }

  /**
   * Select a resume card
   */
  function selectResume(resume) {
    selectedResume = resume;

    // Update selection styling in list
    const cards = resumesListContainer.querySelectorAll('.resume-card-item');
    cards.forEach((c) => {
      if (c.dataset.id === String(resume.id)) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    // Update Action Bar
    selectedResumeTitle.textContent = resume.resume_name || resume.file_name || 'Resume';
    selectedResumeTitle.title = resume.file_name || '';
    actionBar.classList.remove('hidden');
  }

  /**
   * Filter resumes by search term
   */
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderResumes(allResumes);
      return;
    }

    const filtered = allResumes.filter((r) => {
      const name = (r.resume_name || '').toLowerCase();
      const file = (r.file_name || '').toLowerCase();
      const role = (r.target_role || '').toLowerCase();
      return name.includes(query) || file.includes(query) || role.includes(query);
    });

    renderResumes(filtered);
  });

  btnRefresh.addEventListener('click', async () => {
    hideStatus();
    await loadResumes();
  });

  /**
   * Attach the selected resume to the active tab's application form
   */
  btnUseResume.addEventListener('click', async () => {
    if (!selectedResume) {
      showStatus('Please select a resume first.', 'warning');
      return;
    }

    hideStatus();

    try {
      btnUseResume.disabled = true;
      btnUseResumeText.textContent = 'Attaching...';
      attachSpinner.classList.remove('hidden');

      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active browser tab found.');
      }

      // Check if restricted browser page (chrome:// or edge://)
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
        showStatus('Cannot attach files to browser internal pages. Please open a job application tab.', 'warning', 5000);
        return;
      }

      // 2. Download the resume binary from Supabase Storage
      btnUseResumeText.textContent = 'Fetching file...';
      const fileBlob = await window.AplicoSupabase.downloadResumeBlob(selectedResume.file_path);

      // Convert to base64 for message passing
      const fileBase64 = await window.AplicoSupabase.blobToBase64(fileBlob);

      // 3. Inject content script into active tab programmatically
      btnUseResumeText.textContent = 'Injecting...';
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/content.js']
        });
      } catch (scriptErr) {
        console.warn('[Popup] Script injection notice:', scriptErr);
      }

      // 4. Send message to content script to attach file
      btnUseResumeText.textContent = 'Attaching...';
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'ATTACH_RESUME',
        fileName: selectedResume.file_name || `${selectedResume.resume_name || 'resume'}.pdf`,
        fileType: selectedResume.file_type || 'application/pdf',
        fileBase64: fileBase64
      });

      if (response && response.success) {
        showStatus(`✓ Attached "${response.fileName}" to ${response.fieldName}!`, 'success', 5000);
      } else if (response && response.reason === 'NO_INPUT_FOUND') {
        showStatus('No file upload field detected on this page. Use "Download PDF" below to upload manually.', 'warning', 6000);
      } else {
        showStatus(response?.message || 'Attachment was rejected by the page.', 'error', 5000);
      }
    } catch (err) {
      console.error('[Popup] Attachment failure:', err);
      showStatus(err.message || 'Failed to attach resume to page.', 'error', 5000);
    } finally {
      btnUseResume.disabled = false;
      btnUseResumeText.textContent = 'Use this resume';
      attachSpinner.classList.add('hidden');
    }
  });

  /**
   * Fallback 1: Download PDF directly to user's computer
   */
  btnDownloadPdf.addEventListener('click', async () => {
    if (!selectedResume) return;
    try {
      showStatus('Downloading PDF...', 'warning', 2000);
      const blob = await window.AplicoSupabase.downloadResumeBlob(selectedResume.file_path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedResume.file_name || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showStatus('PDF downloaded! You can now drag and drop it into the job form.', 'success', 4000);
    } catch (err) {
      console.error('[Popup] Download fallback error:', err);
      showStatus('Failed to download PDF.', 'error');
    }
  });

  /**
   * Fallback 2: Open Aplico Web Resume Library
   */
  function openWebLibrary() {
    chrome.tabs.create({ url: 'https://aplico-black.vercel.app/dashboard/resumes/all-resumes' });
  }

  btnOpenLibrary.addEventListener('click', openWebLibrary);
  btnOpenAplicoEmpty.addEventListener('click', openWebLibrary);

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Initial check
  checkAuth();
});
