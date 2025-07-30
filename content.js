// YouTube Watch Later Bulk Delete - Content Script
class WatchLaterBulkDelete {
  constructor() {
    this.isEnabled = false;
    this.selectedVideos = new Set();
    this.isDeleting = false;
    this.deleteProgress = 0;
    this.totalToDelete = 0;
    this.ui = null;
    this.debugMode = true; // Enable debug mode by default
    
    this.init();
  }
  
  init() {
    console.log('');
    console.log('🚀 ========================================');
    console.log('🚀 === INITIALIZING BULK DELETE EXTENSION ===');
    console.log('🚀 ========================================');
    console.log('');
    
    console.log('🔍 Extension state on init:');
    console.log(`  - URL: ${window.location.href}`);
    console.log(`  - Document ready state: ${document.readyState}`);
    console.log(`  - isEnabled: ${this.isEnabled}`);
    console.log(`  - selectedVideos.size: ${this.selectedVideos.size}`);
    
    this.waitForPageLoad().then(() => {
      console.log('✅ Page load completed, proceeding with initialization...');
      
      this.createUI();
      console.log('✅ UI creation completed');
      
      this.setupEventListeners();
      console.log('✅ Event listeners setup completed');
      
      this.restoreState();
      console.log('✅ State restoration completed');
      
      console.log('');
      console.log('🎉 ========================================');
      console.log('🎉 === BULK DELETE EXTENSION READY ===');
      console.log('🎉 ========================================');
      console.log('');
      
    }).catch(error => {
      console.error('❌ Initialization failed:', error);
    });
  }
  
  waitForPageLoad() {
    return new Promise((resolve) => {
      console.log('⏳ Waiting for YouTube page to load...');
      let attempts = 0;
      const maxAttempts = 20;
      
      const checkLoaded = () => {
        attempts++;
        console.log(`🔍 Check attempt ${attempts}/${maxAttempts}`);
        
        const playlistPage = document.querySelector('ytd-browse[page-subtype="playlist"]') ||
                           document.querySelector('ytd-playlist-header-renderer') ||
                           document.querySelector('[role="main"] ytd-playlist-video-list-renderer');
        
        if (playlistPage) {
          console.log('✅ YouTube page loaded successfully');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn('⚠️ Page load timeout - proceeding anyway');
          resolve();
        } else {
          setTimeout(checkLoaded, 500);
        }
      };
      checkLoaded();
    });
  }
  
  createUI() {
    console.log('');
    console.log('🎨 ========================================');
    console.log('🎨 === CREATING BULK DELETE UI ===');
    console.log('🎨 ========================================');
    console.log('');
    
    // Remove existing UI if any
    const existingUI = document.getElementById('bulk-delete-ui');
    if (existingUI) {
      console.log('🧹 Removing existing UI');
      existingUI.remove();
    } else {
      console.log('ℹ️ No existing UI found');
    }
    
    // Create main UI container
    this.ui = document.createElement('div');
    this.ui.id = 'bulk-delete-ui';
    this.ui.className = 'bulk-delete-container';
    
    console.log('🔧 Creating UI HTML structure...');
    
    this.ui.innerHTML = `
      <div class="bulk-delete-header">
        <h3>🗑️ YouTube後で見る 一括削除</h3>
        <button id="toggle-bulk-delete" class="toggle-button" data-enabled="false" 
                onclick="window.bulkDeleteExtension?.toggleBulkDeleteMode?.(); console.log('🔄 Toggle onclick fired');">
          一括削除モードを有効化
        </button>
      </div>
      
      <div id="bulk-delete-controls" class="bulk-delete-controls" style="display: none;">
        <div class="control-buttons">
          <button id="select-all" class="control-btn" 
                  onclick="window.bulkDeleteExtension?.selectAllVideos?.(); console.log('✅ Select all onclick fired');">
            ✅ すべて選択
          </button>
          <button id="deselect-all" class="control-btn" 
                  onclick="window.bulkDeleteExtension?.deselectAllVideos?.(); console.log('❌ Deselect all onclick fired');">
            ❌ 選択解除
          </button>
          <button id="delete-selected" class="delete-btn" disabled
                  onclick="window.bulkDeleteExtension?.deleteSelectedVideos?.(); console.log('🗑️ Delete selected onclick fired');">
            動画を選択してください
          </button>
          <button id="delete-all" class="delete-btn delete-all-btn"
                  onclick="window.bulkDeleteExtension?.deleteAllVideos?.(); console.log('🗑️ Delete all onclick fired');">
            🗑️ すべて削除
          </button>
        </div>
        
        <div class="filter-section">
          <input 
            type="text" 
            id="title-filter" 
            class="filter-input" 
            placeholder="🔍 タイトル・チャンネル名で絞り込み..."
            oninput="window.bulkDeleteExtension?.applyFilters?.(); console.log('🔍 Title filter oninput fired:', this.value);"
          >
          <input 
            type="text" 
            id="range-filter" 
            class="filter-input range-input" 
            placeholder="📊 番号範囲 (例: 1-50, 100-, -200)"
            oninput="window.bulkDeleteExtension?.applyFilters?.(); console.log('📊 Range filter oninput fired:', this.value);"
          >
          <div class="filter-info">
            <small>💡 範囲例: 1-10 (1〜10番), 50- (50番以降), -100 (100番まで)</small>
          </div>
        </div>
      </div>
      
      <div id="progress-section" class="progress-section" style="display: none;">
        <div class="progress-info">
          <span>🗑️ 削除中...</span>
          <span id="progress-text">0 / 0</span>
        </div>
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
        </div>
        <button id="cancel-delete" class="cancel-btn"
                onclick="window.bulkDeleteExtension?.cancelDeletion?.(); console.log('⏹️ Cancel onclick fired');">
          ❌ キャンセル
        </button>
      </div>
    `;
    
    console.log('✅ UI HTML structure created');
    console.log(`🔍 UI element created: ${!!this.ui}`);
    console.log(`🔍 UI innerHTML length: ${this.ui.innerHTML.length}`);
    
    this.insertUI();
  }
  
  insertUI() {
    console.log('');
    console.log('📍 ========================================');
    console.log('📍 === INSERTING UI INTO DOM ===');
    console.log('📍 ========================================');
    console.log('');
    
    const insertionTargets = [
      'ytd-browse[page-subtype="playlist"] ytd-playlist-header-renderer',
      'ytd-browse[page-subtype="playlist"] #header',
      '[role="main"]',
      '#primary',
      'body'  // Fallback to body
    ];
    
    console.log('🔍 Trying insertion targets...');
    
    for (let i = 0; i < insertionTargets.length; i++) {
      const selector = insertionTargets[i];
      console.log(`🎯 Trying selector ${i + 1}/${insertionTargets.length}: ${selector}`);
      
      const target = document.querySelector(selector);
      if (target) {
        console.log(`✅ Target found: ${selector}`);
        console.log(`🔍 Target element:`, target);
        
        try {
          target.appendChild(this.ui);
          console.log('✅ UI successfully inserted into target');
          
          // Verify insertion
          const insertedUI = document.getElementById('bulk-delete-ui');
          if (insertedUI) {
            console.log('✅ UI insertion verified - element exists in DOM');
            console.log('🔍 Final UI position:', insertedUI.getBoundingClientRect());
            return;
          } else {
            console.error('❌ UI insertion failed - element not found in DOM after insertion');
          }
        } catch (error) {
          console.error(`❌ Failed to insert UI into ${selector}:`, error);
          continue;
        }
      } else {
        console.log(`❌ Target not found: ${selector}`);
      }
    }
    
    console.error('❌ Failed to insert UI into any target');
    
    // Debug: Show available elements
    console.log('🔍 Available elements for debugging:');
    const body = document.body;
    if (body && body.children) {
      console.log('📋 Body children:');
      for (let i = 0; i < Math.min(body.children.length, 10); i++) {
        const child = body.children[i];
        console.log(`  ${i + 1}. ${child.tagName} ${child.id ? '#' + child.id : ''} ${child.className ? '.' + child.className.split(' ').join('.') : ''}`);
      }
    }
  }
  
  setupEventListeners() {
    console.log('');
    console.log('🎧 ========================================');
    console.log('🎧 === SETTING UP EVENT LISTENERS (NEW METHOD) ===');
    console.log('🎧 ========================================');
    console.log('');
    
    // Remove any existing event listeners to prevent duplicates
    this.removeEventListeners();
    
    // Use event delegation on document body to catch all clicks
    this.mainEventListener = (e) => {
      console.log('👆 Document click detected:', e.target.id, e.target.className);
      
      // Handle toggle button
      if (e.target.id === 'toggle-bulk-delete') {
        console.log('🔄 === TOGGLE BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.toggleBulkDeleteMode();
        return;
      }
      
      // Handle select all button
      if (e.target.id === 'select-all') {
        console.log('');
        console.log('✅ ========================================');
        console.log('✅ === SELECT ALL BUTTON CLICKED (DELEGATED) ===');
        console.log('✅ ========================================');
        console.log('');
        e.preventDefault();
        e.stopPropagation();
        this.selectAllVideos();
        return;
      }
      
      // Handle deselect all button
      if (e.target.id === 'deselect-all') {
        console.log('❌ === DESELECT ALL BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.deselectAllVideos();
        return;
      }
      
      // Handle delete selected button
      if (e.target.id === 'delete-selected') {
        console.log('🗑️ === DELETE SELECTED BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.deleteSelectedVideos();
        return;
      }
      
      // Handle delete all button
      if (e.target.id === 'delete-all') {
        console.log('🗑️ === DELETE ALL BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.deleteAllVideos();
        return;
      }
      
      // Handle cancel button
      if (e.target.id === 'cancel-delete') {
        console.log('⏹️ === CANCEL BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.cancelDeletion();
        return;
      }
    };
    
    // Add main click listener to document
    document.addEventListener('click', this.mainEventListener, true);
    console.log('✅ Main click event listener added to document');
    
    // Handle filter input separately (not a click event)
    this.filterEventListener = (e) => {
      if (e.target.id === 'title-filter' || e.target.id === 'range-filter') {
        console.log('🔍 Filter input changed:', e.target.id, e.target.value);
        this.applyFilters();
      }
    };
    
    document.addEventListener('input', this.filterEventListener, true);
    console.log('✅ Filter input event listener added to document');
    
    // Setup drag functionality
    this.setupDragFunctionality();
    console.log('✅ Drag functionality setup completed');
    
    // Listen for messages from background script
    if (!this.messageListenerAdded) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
      });
      this.messageListenerAdded = true;
      console.log('✅ Message listener added');
    }
    
    // Add direct button listeners as backup
    setTimeout(() => {
      this.addDirectListeners();
    }, 1000);
  }
  
  addDirectListeners() {
    console.log('🔧 Adding direct button listeners as backup...');
    
    const buttons = {
      'toggle-bulk-delete': () => this.toggleBulkDeleteMode(),
      'select-all': () => this.selectAllVideos(),
      'deselect-all': () => this.deselectAllVideos(),
      'delete-selected': () => this.deleteSelectedVideos(),
      'delete-all': () => this.deleteAllVideos(),
      'cancel-delete': () => this.cancelDeletion()
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        // Remove existing listeners
        button.onclick = null;

        // Add new listener
        button.addEventListener('click', (e) => {
          console.log(`🎯 Direct listener fired for ${id}`);
          e.preventDefault();
          e.stopPropagation();
          handler();
        });
        console.log(`✅ Direct listener added for ${id}`);
      } else {
        console.log(`⚠️ Button not found: ${id}`);
      }
    });
    
    // Add filter listeners
    const titleFilter = document.getElementById('title-filter');
    const rangeFilter = document.getElementById('range-filter');
    
    if (titleFilter) {
      titleFilter.addEventListener('input', () => {
        console.log('🔍 Title filter input (direct)');
        this.applyFilters();
      });
      console.log('✅ Direct title filter listener added');
    }
    
    if (rangeFilter) {
      rangeFilter.addEventListener('input', () => {
        console.log('📊 Range filter input (direct)');
        this.applyFilters();
      });
      console.log('✅ Direct range filter listener added');
    }
  }
  
  removeEventListeners() {
    if (this.mainEventListener) {
      document.removeEventListener('click', this.mainEventListener, true);
      console.log('🧹 Removed main click event listener');
    }
    
    if (this.filterEventListener) {
      document.removeEventListener('input', this.filterEventListener, true);
      console.log('🧹 Removed filter event listener');
    }
  }
  
  handleMessage(request, sender, sendResponse) {
    console.log('📨 Message received:', request);
    
    switch (request.type) {
      case 'GET_STATUS':
        sendResponse({
          isEnabled: this.isEnabled,
          selectedCount: this.selectedVideos.size,
          totalVideos: this.getVideoElements().length,
          isDeleting: this.isDeleting
        });
        break;
        
      case 'TOGGLE_MODE':
        this.toggleBulkDeleteMode();
        sendResponse({ success: true });
        break;
        
      case 'DELETE_SELECTED':
        this.deleteSelectedVideos();
        sendResponse({ success: true });
        break;
        
      case 'DELETE_ALL':
        this.deleteAllVideos();
        sendResponse({ success: true });
        break;
        
      case 'DEBUG_DELETE_PROCESS':
        this.debugDeleteProcess();
        sendResponse({ success: true });
        break;
        
      case 'TEST_ACTUAL_DELETE':
        this.testActualDelete();
        sendResponse({ success: true });
        break;
        
      case 'SIMPLE_DELETE_TEST':
        this.simpleDeleteTest();
        sendResponse({ success: true });
        break;
        
      default:
        console.log('⚠️ Unknown message type:', request.type);
        sendResponse({ error: 'Unknown message type' });
    }
  }
  
  restoreState() {
    console.log('🔄 Restoring extension state...');
    try {
      const savedState = localStorage.getItem('bulkDeleteState');
      if (savedState) {
        const state = JSON.parse(savedState);
        console.log('📂 Found saved state:', state);
        
        if (state.isEnabled) {
          console.log('🔄 Restoring enabled state...');
          this.toggleBulkDeleteMode();
        }
      } else {
        console.log('ℹ️ No saved state found');
      }
    } catch (error) {
      console.error('❌ Error restoring state:', error);
    }
  }
  
  saveState() {
    try {
      const state = {
        isEnabled: this.isEnabled
      };
      localStorage.setItem('bulkDeleteState', JSON.stringify(state));
      console.log('💾 State saved:', state);
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  }
  
  toggleBulkDeleteMode() {
    console.log('');
    console.log('🔄 ========================================');
    console.log('🔄 === TOGGLING BULK DELETE MODE ===');
    console.log('🔄 ========================================');
    console.log('');
    
    console.log(`🔍 Current state: isEnabled = ${this.isEnabled}`);
    
    this.isEnabled = !this.isEnabled;
    console.log(`🔄 New state: isEnabled = ${this.isEnabled}`);
    
    const toggleButton = document.getElementById('toggle-bulk-delete');
    const controls = document.getElementById('bulk-delete-controls');
    
    if (!toggleButton) {
      console.error('❌ Toggle button not found');
      return;
    }
    
    if (!controls) {
      console.error('❌ Controls element not found');
      return;
    }
    
    if (this.isEnabled) {
      console.log('✅ Enabling bulk delete mode...');
      
      // Update button
      toggleButton.textContent = '一括削除モードを無効化';
      toggleButton.dataset.enabled = 'true';
      console.log('✅ Toggle button updated to "disable" state');
      
      // Show controls
      controls.style.display = 'block';
      console.log('✅ Controls shown');
      
      // Add checkboxes to videos
      this.addCheckboxesToVideos();
      console.log('✅ Checkboxes added to videos');
      
      // Enable filter functionality
      this.applyFilters();
      console.log('✅ Filters applied');
      
    } else {
      console.log('❌ Disabling bulk delete mode...');
      
      // Update button
      toggleButton.textContent = '一括削除モードを有効化';
      toggleButton.dataset.enabled = 'false';
      console.log('✅ Toggle button updated to "enable" state');
      
      // Hide controls
      controls.style.display = 'none';
      console.log('✅ Controls hidden');
      
      // Remove checkboxes
      this.removeCheckboxes();
      console.log('✅ Checkboxes removed');
      
      // Clear selections
      this.selectedVideos.clear();
      console.log('✅ Selections cleared');
    }
    
    this.saveState();
    console.log('💾 State saved');
    
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 === TOGGLE COMPLETE ===');
    console.log('🎉 ========================================');
    console.log('');
  }
  
  getVideoElements() {
    // Multiple selectors to catch different layouts
    const selectors = [
      'ytd-playlist-video-renderer', // Standard playlist view
      'ytd-playlist-video-list-renderer ytd-playlist-video-renderer', // Nested in list
      '[role="main"] ytd-playlist-video-renderer', // Within main content
      'ytd-playlist-panel-video-renderer' // Playlist panel (if applicable)
    ];
    
    let videos = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        videos = Array.from(elements);
        console.log(`🎯 Found ${videos.length} videos using selector: ${selector}`);
        break;
      }
    }
    
    if (videos.length === 0) {
      console.log('⚠️ No videos found with any selector');
    }
    
    return videos;
  }
  
  addCheckboxesToVideos() {
    console.log('');
    console.log('☑️ ========================================');
    console.log('☑️ === ADDING CHECKBOXES TO VIDEOS ===');
    console.log('☑️ ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    console.log(`🎯 Found ${videos.length} video elements`);
    
    let addedCount = 0;
    
    videos.forEach((video, index) => {
      // Check if checkbox already exists
      if (video.querySelector('.bulk-delete-checkbox')) {
        console.log(`⏭️ Checkbox already exists for video ${index + 1}`);
        return;
      }
      
      // Create checkbox container
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'checkbox-container';
      
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-delete-checkbox';
      checkbox.dataset.videoIndex = index;
      
      // Add change event listener
      checkbox.addEventListener('change', (e) => {
        console.log(`☑️ Checkbox ${index + 1} changed:`, e.target.checked);
        
        if (e.target.checked) {
          this.selectedVideos.add(index);
          console.log(`✅ Video ${index + 1} selected. Total selected: ${this.selectedVideos.size}`);
        } else {
          this.selectedVideos.delete(index);
          console.log(`❌ Video ${index + 1} deselected. Total selected: ${this.selectedVideos.size}`);
        }
        
        this.updateDeleteButton();
      });
      
      checkboxContainer.appendChild(checkbox);
      
      // Find the best insertion point (thumbnail container)
      const thumbnailContainer = video.querySelector('ytd-thumbnail') || 
                               video.querySelector('#thumbnail') ||
                               video.querySelector('.ytd-thumbnail');
      
      if (thumbnailContainer) {
        // Make thumbnail container position relative for absolute positioning of checkbox
        thumbnailContainer.style.position = 'relative';
        thumbnailContainer.appendChild(checkboxContainer);
        addedCount++;
        console.log(`✅ Checkbox added to video ${index + 1}`);
      } else {
        console.log(`⚠️ Could not find thumbnail container for video ${index + 1}`);
        console.log('🔍 Video element structure:', video.outerHTML.substring(0, 200) + '...');
      }
    });
    
    console.log(`🎉 Successfully added ${addedCount} checkboxes out of ${videos.length} videos`);
    
    // Update delete button state
    this.updateDeleteButton();
    
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ === CHECKBOX ADDITION COMPLETE ===');
    console.log('✅ ========================================');
    console.log('');
  }
  
  removeCheckboxes() {
    console.log('🧹 Removing all checkboxes...');
    
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    const containers = document.querySelectorAll('.checkbox-container');
    
    console.log(`🔍 Found ${checkboxes.length} checkboxes and ${containers.length} containers`);
    
    containers.forEach(container => container.remove());
    
    console.log('✅ All checkboxes removed');
  }
  
  updateDeleteButton() {
    const deleteButton = document.getElementById('delete-selected');
    if (!deleteButton) {
      console.log('⚠️ Delete button not found');
      return;
    }
    
    const selectedCount = this.selectedVideos.size;
    
    if (selectedCount > 0) {
      deleteButton.disabled = false;
      deleteButton.textContent = `🗑️ 選択した${selectedCount}件を削除`;
      console.log(`✅ Delete button enabled for ${selectedCount} videos`);
    } else {
      deleteButton.disabled = true;
      deleteButton.textContent = '動画を選択してください';
      console.log('❌ Delete button disabled (no selections)');
    }
  }
  
  selectAllVideos() {
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ === SELECTING ALL VIDEOS ===');
    console.log('✅ ========================================');
    console.log('');
    
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`🎯 Found ${checkboxes.length} checkboxes`);
    
    if (checkboxes.length === 0) {
      console.log('⚠️ No checkboxes found. Adding checkboxes first...');
      this.addCheckboxesToVideos();
      // Retry after a short delay
      setTimeout(() => {
        this.selectAllVideos();
      }, 500);
      return;
    }
    
    // Clear current selections
    this.selectedVideos.clear();
    
    // Select all visible checkboxes
    let selectedCount = 0;
    checkboxes.forEach((checkbox, index) => {
      // Only select visible checkboxes (not filtered out)
      const videoElement = checkbox.closest('ytd-playlist-video-renderer');
      if (videoElement && videoElement.style.display !== 'none') {
        checkbox.checked = true;
        const videoIndex = parseInt(checkbox.dataset.videoIndex) || index;
        this.selectedVideos.add(videoIndex);
        selectedCount++;
        console.log(`✅ Selected video ${videoIndex + 1}`);
      } else {
        console.log(`⏭️ Skipped hidden video ${index + 1}`);
      }
    });
    
    console.log(`🎉 Selected ${selectedCount} videos out of ${checkboxes.length} total`);
    
    this.updateDeleteButton();
    this.showNotification(`✅ ${selectedCount}件の動画を選択しました`);
    
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 === SELECT ALL COMPLETE ===');
    console.log('🎉 ========================================');
    console.log('');
  }
  
  deselectAllVideos() {
    console.log('');
    console.log('❌ ========================================');
    console.log('❌ === DESELECTING ALL VIDEOS ===');
    console.log('❌ ========================================');
    console.log('');
    
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`🎯 Found ${checkboxes.length} checkboxes`);
    
    // Clear selections
    this.selectedVideos.clear();
    
    // Uncheck all checkboxes
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = false;
      console.log(`❌ Deselected video ${index + 1}`);
    });
    
    this.updateDeleteButton();
    this.showNotification('❌ すべての選択を解除しました');
    
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ === DESELECT ALL COMPLETE ===');
    console.log('✅ ========================================');
    console.log('');
  }
  
  parseNumberRange(rangeText) {
    if (!rangeText.trim()) return null;
    
    const text = rangeText.trim();
    
    // Pattern matching for different range formats
    const patterns = [
      { regex: /^(\d+)-(\d+)$/, type: 'range' },        // "1-50"
      { regex: /^(\d+)-$/, type: 'from' },              // "50-"
      { regex: /^-(\d+)$/, type: 'to' },                // "-100"
      { regex: /^(\d+)$/, type: 'single' }              // "50"
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        switch (pattern.type) {
          case 'range':
            return {
              start: parseInt(match[1]),
              end: parseInt(match[2]),
              type: 'range'
            };
          case 'from':
            return {
              start: parseInt(match[1]),
              end: Infinity,
              type: 'from'
            };
          case 'to':
            return {
              start: 1,
              end: parseInt(match[1]),
              type: 'to'
            };
          case 'single':
            const num = parseInt(match[1]);
            return {
              start: num,
              end: num,
              type: 'single'
            };
        }
      }
    }
    
    return null;
  }
  
  getVideoIndex(videoElement) {
    // Try to find the index number displayed in the video element
    const indexSelectors = [
      '.index-message', // YouTube's index display
      '.index', 
      '[aria-label*="番"]',
      '[aria-label*="位"]',
      '.ytd-playlist-video-renderer .index-message',
      'ytd-playlist-video-renderer [class*="index"]'
    ];
    
    for (const selector of indexSelectors) {
      const indexElement = videoElement.querySelector(selector);
      if (indexElement) {
        const indexText = indexElement.textContent || indexElement.innerText;
        const match = indexText.match(/\d+/);
        if (match) {
          const index = parseInt(match[0]);
          console.log(`📊 Found video index: ${index} from selector: ${selector}`);
          return index;
        }
      }
    }
    
    // Fallback: try to find by position in playlist
    const allVideos = this.getVideoElements();
    const videoIndex = allVideos.indexOf(videoElement);
    if (videoIndex !== -1) {
      const displayIndex = videoIndex + 1; // 1-based index
      console.log(`📊 Fallback video index: ${displayIndex} (position-based)`);
      return displayIndex;
    }
    
    console.log('⚠️ Could not determine video index');
    return null;
  }
  
  applyFilters() {
    console.log('');
    console.log('🔍 ========================================');
    console.log('🔍 === APPLYING FILTERS ===');
    console.log('🔍 ========================================');
    console.log('');
    
    const titleFilter = document.getElementById('title-filter')?.value?.toLowerCase() || '';
    const rangeFilter = document.getElementById('range-filter')?.value || '';
    
    console.log(`🔍 Title filter: "${titleFilter}"`);
    console.log(`📊 Range filter: "${rangeFilter}"`);
    
    const videos = this.getVideoElements();
    console.log(`🎯 Found ${videos.length} video elements to filter`);
    
    // Parse range filter
    const rangeCondition = this.parseNumberRange(rangeFilter);
    if (rangeCondition) {
      console.log('📊 Parsed range condition:', rangeCondition);
    }
    
    let visibleCount = 0;
    let hiddenCount = 0;
    
    videos.forEach((video, index) => {
      let shouldShow = true;
      
      // Title/Channel filter
      if (titleFilter) {
        const titleElement = video.querySelector('a#video-title, #video-title, .ytd-playlist-video-renderer a[href*="/watch"]');
        const channelElement = video.querySelector('ytd-channel-name a, .ytd-channel-name a, [href*="/channel/"], [href*="/@"]');
        
        const title = titleElement?.textContent?.toLowerCase() || '';
        const channel = channelElement?.textContent?.toLowerCase() || '';
        
        // Combine title and channel for searching
        const searchText = `${title} ${channel}`.toLowerCase();
        
        if (!searchText.includes(titleFilter)) {
          shouldShow = false;
          console.log(`🔍 Video ${index + 1} hidden by title/channel filter`);
        }
      }
      
      // Range filter
      if (shouldShow && rangeCondition) {
        const videoIndex = this.getVideoIndex(video);
        if (videoIndex !== null) {
          const inRange = videoIndex >= rangeCondition.start && videoIndex <= rangeCondition.end;
          if (!inRange) {
            shouldShow = false;
            console.log(`📊 Video ${index + 1} (playlist index: ${videoIndex}) hidden by range filter`);
          }
        } else {
          // Hide videos where we can't determine the index
          shouldShow = false;
          console.log(`📊 Video ${index + 1} hidden (could not determine playlist index)`);
        }
      }
      
      // Apply visibility
      if (shouldShow) {
        video.style.display = '';
        visibleCount++;
      } else {
        video.style.display = 'none';
        hiddenCount++;
      }
    });
    
    console.log(`📊 Filter results: ${visibleCount} visible, ${hiddenCount} hidden`);
    
    // Show notification
    let message = '';
    if (titleFilter && rangeCondition) {
      message = `🔍 ${visibleCount}件の動画が条件に一致 (タイトル・チャンネル: "${titleFilter}", 範囲: ${rangeFilter})`;
    } else if (titleFilter) {
      message = `🔍 ${visibleCount}件の動画が条件に一致 (タイトル・チャンネル: "${titleFilter}")`;
    } else if (rangeCondition) {
      message = `📊 ${visibleCount}件の動画が条件に一致 (範囲: ${rangeFilter})`;
    } else {
      message = `📊 ${visibleCount}件の動画を表示中`;
    }
    
    this.showNotification(message);
    
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ === FILTERS APPLIED ===');
    console.log('✅ ========================================');
    console.log('');
  }
  
  async deleteSelectedVideos() {
    console.log('');
    console.log('🗑️ ========================================');
    console.log('🗑️ === DELETING SELECTED VIDEOS ===');
    console.log('🗑️ ========================================');
    console.log('');
    
    if (this.selectedVideos.size === 0) {
      console.log('⚠️ No videos selected for deletion');
      this.showNotification('⚠️ 削除する動画を選択してください');
      return;
    }
    
    const selectedCount = this.selectedVideos.size;
    console.log(`🎯 Deleting ${selectedCount} selected videos`);
    
    // Confirm deletion
    const confirmed = confirm(`選択した${selectedCount}件の動画を削除しますか？\n\nこの操作は元に戻せません。`);
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    // Get video elements to delete
    const videosToDelete = [];
    const allVideos = this.getVideoElements();
    
    this.selectedVideos.forEach(index => {
      if (allVideos[index]) {
        videosToDelete.push(allVideos[index]);
      }
    });
    
    console.log(`🎯 Found ${videosToDelete.length} video elements to delete`);
    
    if (videosToDelete.length === 0) {
      console.log('❌ No video elements found for deletion');
      this.showNotification('❌ 削除対象の動画が見つかりません');
      return;
    }
    
    await this.performDeletion(videosToDelete, 'selected');
  }
  
  async deleteAllVideos() {
    console.log('');
    console.log('🗑️ ========================================');
    console.log('🗑️ === DELETING ALL VIDEOS ===');
    console.log('🗑️ ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    const visibleVideos = videos.filter(video => video.style.display !== 'none');
    const videoCount = visibleVideos.length;
    
    if (videoCount === 0) {
      console.log('⚠️ No visible videos found for deletion');
      this.showNotification('⚠️ 削除する動画がありません');
      return;
    }
    
    console.log(`🎯 Deleting ${videoCount} visible videos`);
    
    // Confirm deletion
    const confirmed = confirm(`表示中の${videoCount}件すべての動画を削除しますか？\n\nこの操作は元に戻せません。`);
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    await this.performDeletion(visibleVideos, 'all');
  }
  
  async performDeletion(videosToDelete, deleteType) {
    console.log('');
    console.log('⚡ ========================================');
    console.log('⚡ === PERFORMING DELETION ===');
    console.log('⚡ ========================================');
    console.log('');
    
    this.isDeleting = true;
    this.totalToDelete = videosToDelete.length;
    this.deleteProgress = 0;
    
    console.log(`🎯 Starting deletion of ${this.totalToDelete} videos`);
    
    // Show progress section
    this.showProgressSection();
    
    // Hide controls
    const controls = document.getElementById('bulk-delete-controls');
    if (controls) {
      controls.style.display = 'none';
    }
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < videosToDelete.length; i++) {
      if (!this.isDeleting) {
        console.log('⏹️ Deletion cancelled by user');
        break;
      }
      
      const video = videosToDelete[i];
      console.log(`🗑️ Deleting video ${i + 1}/${videosToDelete.length}`);
      
      try {
        const success = await this.deleteVideo(video);
        if (success) {
          deletedCount++;
          console.log(`✅ Video ${i + 1} deleted successfully`);
        } else {
          errorCount++;
          console.log(`❌ Failed to delete video ${i + 1}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`💥 Error deleting video ${i + 1}:`, error);
      }
      
      this.deleteProgress = i + 1;
      this.updateProgress();
      
      // Small delay between deletions to avoid rate limiting
      await this.delay(500);
    }
    
    console.log('');
    console.log('📊 ========================================');
    console.log('📊 === DELETION SUMMARY ===');
    console.log('📊 ========================================');
    console.log('');
    console.log(`✅ Successfully deleted: ${deletedCount}`);
    console.log(`❌ Failed to delete: ${errorCount}`);
    console.log(`📊 Total processed: ${this.deleteProgress}`);
    
    // Hide progress section
    this.hideProgressSection();
    
    // Show controls
    if (controls) {
      controls.style.display = 'block';
    }
    
    // Reset state
    this.isDeleting = false;
    this.selectedVideos.clear();
    
    // Refresh checkboxes and update UI
    this.removeCheckboxes();
    setTimeout(() => {
      this.addCheckboxesToVideos();
      this.updateDeleteButton();
    }, 1000);
    
    // Show completion notification
    const message = `🎉 削除完了: ${deletedCount}件成功${errorCount > 0 ? `, ${errorCount}件失敗` : ''}`;
    this.showNotification(message);
    
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 === DELETION COMPLETE ===');
    console.log('🎉 ========================================');
    console.log('');
  }
  
  async deleteVideo(videoElement) {
    console.log('🎯 Attempting to delete video...');
    
    // Find the menu button (three dots)
    const menuButtonSelectors = [
      'button[aria-label*="操作メニュー"]',
      'button[aria-label*="Action menu"]',
      'button[aria-label*="その他の操作"]',
      'button[aria-label*="More actions"]',
      'ytd-menu-renderer button',
      '#button[aria-label]',
      'yt-icon-button[aria-label*="メニュー"]',
      'yt-icon-button[aria-label*="menu"]',
      '.dropdown-trigger',
      '[role="button"][aria-haspopup="true"]'
    ];
    
    let menuButton = null;
    for (const selector of menuButtonSelectors) {
      menuButton = videoElement.querySelector(selector);
      if (menuButton) {
        console.log(`✅ Found menu button with selector: ${selector}`);
        break;
      }
    }
    
    if (!menuButton) {
      console.log('❌ Menu button not found');
      console.log('🔍 Video element HTML:');
      console.log(videoElement.outerHTML.substring(0, 500) + '...');
      return false;
    }
    
    try {
      // Click menu button
      console.log('👆 Clicking menu button...');
      menuButton.click();
      await this.delay(300);
      
      // Find delete/remove option in the dropdown
      const deleteOptionSelectors = [
        'ytd-menu-service-item-renderer:has([aria-label*="削除"])',
        'ytd-menu-service-item-renderer:has([aria-label*="Remove"])',
        'ytd-menu-service-item-renderer:has([aria-label*="プレイリストから削除"])',
        'ytd-menu-service-item-renderer:has([aria-label*="remove from"])',
        'tp-yt-paper-item:has([aria-label*="削除"])',
        'tp-yt-paper-item:has([aria-label*="Remove"])',
        'a[href*="remove_from_playlist"]',
        '[role="menuitem"]:has([aria-label*="削除"])',
        '[role="menuitem"]:has([aria-label*="Remove"])',
        'ytd-menu-service-item-renderer',
        'tp-yt-paper-item'
      ];
      
      let deleteOption = null;
      for (const selector of deleteOptionSelectors) {
        deleteOption = document.querySelector(selector);
        if (deleteOption) {
          const text = deleteOption.textContent || deleteOption.innerText || '';
          const ariaLabel = deleteOption.getAttribute('aria-label') || '';
          
          // Check if this is actually a delete/remove option
          if (text.includes('削除') || text.includes('Remove') || 
              ariaLabel.includes('削除') || ariaLabel.includes('Remove') ||
              text.includes('プレイリストから削除') || ariaLabel.includes('remove from')) {
            console.log(`✅ Found delete option with selector: ${selector}`);
            console.log(`📝 Delete option text: "${text}"`);
            console.log(`🏷️ Delete option aria-label: "${ariaLabel}"`);
            break;
          } else {
            deleteOption = null; // Reset if not a delete option
          }
        }
      }
      
      if (!deleteOption) {
        console.log('❌ Delete option not found in menu');
        
        // Debug: show available menu options
        const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item, [role="menuitem"]');
        console.log(`🔍 Available menu items (${menuItems.length}):`);
        menuItems.forEach((item, index) => {
          const text = item.textContent || item.innerText || '';
          const ariaLabel = item.getAttribute('aria-label') || '';
          console.log(`  ${index + 1}. "${text.trim()}" (aria-label: "${ariaLabel}")`);
        });
        
        // Close menu by clicking elsewhere
        document.body.click();
        await this.delay(200);
        
        return false;
      }
      
      // Click delete option
      console.log('🗑️ Clicking delete option...');
      deleteOption.click();
      await this.delay(500);
      
      // Look for confirmation dialog
      const confirmButtonSelectors = [
        'tp-yt-paper-button:has([aria-label*="削除"])',
        'tp-yt-paper-button:has([aria-label*="Remove"])',
        'button[aria-label*="削除"]',
        'button[aria-label*="Remove"]',
        '#confirm-button',
        '.confirm-dialog button',
        'ytd-button-renderer[is-paper-button] button'
      ];
      
      let confirmButton = null;
      for (const selector of confirmButtonSelectors) {
        confirmButton = document.querySelector(selector);
        if (confirmButton) {
          const text = confirmButton.textContent || confirmButton.innerText || '';
          const ariaLabel = confirmButton.getAttribute('aria-label') || '';
          
          if (text.includes('削除') || text.includes('Remove') ||
              ariaLabel.includes('削除') || ariaLabel.includes('Remove')) {
            console.log(`✅ Found confirm button with selector: ${selector}`);
            break;
          } else {
            confirmButton = null;
          }
        }
      }
      
      if (confirmButton) {
        console.log('✅ Clicking confirmation button...');
        confirmButton.click();
        await this.delay(1000);
        
        console.log('✅ Video deletion completed');
        return true;
      } else {
        console.log('⚠️ No confirmation dialog found - deletion may have completed');
        return true;
      }
      
    } catch (error) {
      console.error('💥 Error during video deletion:', error);
      return false;
    }
  }
  
  showProgressSection() {
    const progressSection = document.getElementById('progress-section');
    if (progressSection) {
      progressSection.style.display = 'block';
      console.log('📊 Progress section shown');
    }
  }
  
  hideProgressSection() {
    const progressSection = document.getElementById('progress-section');
    if (progressSection) {
      progressSection.style.display = 'none';
      console.log('📊 Progress section hidden');
    }
  }
  
  updateProgress() {
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    
    if (progressText) {
      progressText.textContent = `${this.deleteProgress} / ${this.totalToDelete}`;
    }
    
    if (progressFill) {
      const percentage = (this.deleteProgress / this.totalToDelete) * 100;
      progressFill.style.width = `${percentage}%`;
    }
    
    console.log(`📊 Progress updated: ${this.deleteProgress}/${this.totalToDelete} (${Math.round((this.deleteProgress / this.totalToDelete) * 100)}%)`);
  }
  
  cancelDeletion() {
    console.log('⏹️ Cancelling deletion...');
    this.isDeleting = false;
    this.showNotification('⏹️ 削除をキャンセルしました');
  }
  
  showNotification(message, duration = 3000) {
    console.log(`📢 Notification: ${message}`);
    
    // Remove existing notification
    const existingNotification = document.querySelector('.bulk-delete-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'bulk-delete-notification';
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Debug methods
  async debugDeleteProcess() {
    console.log('');
    console.log('🔎 ========================================');
    console.log('🔎 === DEBUG DELETE PROCESS ===');
    console.log('🔎 ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    console.log(`🎯 Found ${videos.length} video elements`);
    
    if (videos.length === 0) {
      console.log('❌ No videos found for debugging');
      return;
    }
    
    const firstVideo = videos[0];
    console.log('🔍 Analyzing first video element...');
    console.log('📋 Video HTML structure:');
    console.log(firstVideo.outerHTML.substring(0, 1000) + '...');
    
    // Test menu button finding
    const menuButtonSelectors = [
      'button[aria-label*="操作メニュー"]',
      'button[aria-label*="Action menu"]',
      'button[aria-label*="その他の操作"]',
      'button[aria-label*="More actions"]',
      'ytd-menu-renderer button',
      '#button[aria-label]',
      'yt-icon-button[aria-label*="メニュー"]',
      'yt-icon-button[aria-label*="menu"]',
      '.dropdown-trigger',
      '[role="button"][aria-haspopup="true"]'
    ];
    
    console.log('🔍 Testing menu button selectors...');
    menuButtonSelectors.forEach((selector, index) => {
      const button = firstVideo.querySelector(selector);
      if (button) {
        console.log(`  ✅ ${index + 1}. ${selector} - FOUND`);
        console.log(`      aria-label: "${button.getAttribute('aria-label') || 'none'}"`);
        console.log(`      text: "${(button.textContent || '').trim()}"`);
      } else {
        console.log(`  ❌ ${index + 1}. ${selector} - NOT FOUND`);
      }
    });
    
    // Test clicking menu if available
    const menuButton = firstVideo.querySelector('button[aria-label*="操作メニュー"], button[aria-label*="Action menu"], ytd-menu-renderer button');
    if (menuButton) {
      console.log('🎯 Testing menu click...');
      menuButton.click();
      await this.delay(1000);
      
      console.log('🔍 Menu options after click:');
      const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item, [role="menuitem"]');
      menuItems.forEach((item, index) => {
        const text = (item.textContent || item.innerText || '').trim();
        const ariaLabel = item.getAttribute('aria-label') || '';
        console.log(`  ${index + 1}. "${text}" (aria-label: "${ariaLabel}")`);
      });
      
      // Close menu
      document.body.click();
      await this.delay(300);
    }
    
    console.log('🔎 === DEBUG ANALYSIS COMPLETE ===');
  }
  
  async testActualDelete() {
    console.log('🧪 === TESTING ACTUAL DELETE ===');
    
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      console.log('❌ No videos found for testing');
      return;
    }
    
    const testVideo = videos[0];
    console.log('🎯 Testing deletion on first video');
    
    const success = await this.deleteVideo(testVideo);
    console.log(`📊 Delete test result: ${success ? 'SUCCESS' : 'FAILED'}`);
  }
  
  async simpleDeleteTest() {
    console.log('🧪 === SIMPLE DELETE TEST ===');
    
    // Just try to find and click elements step by step
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      console.log('❌ No videos found');
      return;
    }
    
    const video = videos[0];
    console.log('🎯 Testing on first video');
    
    // Find any button in the video
    const buttons = video.querySelectorAll('button');
    console.log(`🔍 Found ${buttons.length} buttons in video`);
    
    buttons.forEach((button, index) => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const text = (button.textContent || '').trim();
      console.log(`  ${index + 1}. aria-label: "${ariaLabel}", text: "${text}"`);
    });
    
    // Click the first button that looks like a menu
    const menuButton = Array.from(buttons).find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      return ariaLabel.includes('メニュー') || ariaLabel.includes('menu') || ariaLabel.includes('操作');
    });
    
    if (menuButton) {
      console.log('🎯 Found potential menu button, clicking...');
      menuButton.click();
      await this.delay(1000);
      
      // Check what appeared
      const popups = document.querySelectorAll('ytd-menu-popup-renderer, tp-yt-iron-dropdown, [role="menu"]');
      console.log(`📋 Found ${popups.length} potential menu popups`);
      
      popups.forEach((popup, index) => {
        console.log(`  Popup ${index + 1}:`, popup.innerHTML.substring(0, 200) + '...');
      });
      
      // Close by clicking body
      document.body.click();
      await this.delay(300);
    }
    
    console.log('🔎 === DEBUG ANALYSIS COMPLETE ===');
  }
  
  // ===================================
  // DRAG FUNCTIONALITY
  // ===================================
  
  setupDragFunctionality() {
    console.log('🖱️ Setting up drag functionality...');
    
    if (!this.ui) {
      console.log('⚠️ No UI element found for drag setup');
      return;
    }
    
    // Initialize drag state
    this.dragState = {
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      originalPosition: null
    };
    
    // Find the drag handle (header element)
    const dragHandle = this.ui.querySelector('.bulk-delete-header');
    if (!dragHandle) {
      console.log('⚠️ No drag handle found');
      return;
    }
    
    // Add drag handle styling
    dragHandle.style.cursor = 'move';
    dragHandle.style.userSelect = 'none';
    dragHandle.title = 'ドラッグして移動';
    
    // Mouse down event
    this.dragMouseDownHandler = (e) => {
      // Only handle left mouse button and prevent if clicking on buttons
      if (e.button !== 0 || e.target.tagName === 'BUTTON') {
        return;
      }
      
      console.log('🖱️ Drag started');
      this.dragState.isDragging = true;
      
      // Get UI position
      const rect = this.ui.getBoundingClientRect();
      this.dragState.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Store original position for restoration if needed
      this.dragState.originalPosition = {
        top: this.ui.style.top || '80px',
        right: this.ui.style.right || '20px',
        left: this.ui.style.left || 'auto',
        bottom: this.ui.style.bottom || 'auto'
      };
      
      // Add dragging class for visual feedback
      this.ui.classList.add('dragging');
      
      // Prevent text selection
      e.preventDefault();
      
      // Add temporary event listeners
      document.addEventListener('mousemove', this.dragMouseMoveHandler);
      document.addEventListener('mouseup', this.dragMouseUpHandler);
    };
    
    // Mouse move event
    this.dragMouseMoveHandler = (e) => {
      if (!this.dragState.isDragging) return;
      
      e.preventDefault();
      
      // Calculate new position
      let newX = e.clientX - this.dragState.dragOffset.x;
      let newY = e.clientY - this.dragState.dragOffset.y;
      
      // Get viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const uiRect = this.ui.getBoundingClientRect();
      
      // Constrain to viewport bounds
      newX = Math.max(0, Math.min(newX, viewportWidth - uiRect.width));
      newY = Math.max(0, Math.min(newY, viewportHeight - uiRect.height));
      
      // Update position - switch from right/top positioning to left/top
      this.ui.style.left = newX + 'px';
      this.ui.style.top = newY + 'px';
      this.ui.style.right = 'auto';
      this.ui.style.bottom = 'auto';
    };
    
    // Mouse up event
    this.dragMouseUpHandler = (e) => {
      if (!this.dragState.isDragging) return;
      
      console.log('🖱️ Drag ended');
      this.dragState.isDragging = false;
      
      // Remove dragging class
      this.ui.classList.remove('dragging');
      
      // Remove temporary event listeners
      document.removeEventListener('mousemove', this.dragMouseMoveHandler);
      document.removeEventListener('mouseup', this.dragMouseUpHandler);
      
      // Save position to localStorage for persistence
      this.saveUIPosition();
    };
    
    // Add mouse down listener to drag handle
    dragHandle.addEventListener('mousedown', this.dragMouseDownHandler);
    
    // Restore saved position if available
    this.restoreUIPosition();
    
    console.log('✅ Drag functionality setup complete');
  }
  
  saveUIPosition() {
    try {
      const position = {
        left: this.ui.style.left,
        top: this.ui.style.top,
        right: this.ui.style.right,
        bottom: this.ui.style.bottom
      };
      localStorage.setItem('bulkDeleteUI_position', JSON.stringify(position));
      console.log('💾 UI position saved:', position);
    } catch (error) {
      console.log('⚠️ Could not save UI position:', error);
    }
  }
  
  restoreUIPosition() {
    try {
      const saved = localStorage.getItem('bulkDeleteUI_position');
      if (saved) {
        const position = JSON.parse(saved);
        console.log('📍 Restoring UI position:', position);
        
        // Apply saved position
        if (position.left && position.left !== 'auto') {
          this.ui.style.left = position.left;
          this.ui.style.right = 'auto';
        }
        if (position.top && position.top !== 'auto') {
          this.ui.style.top = position.top;
          this.ui.style.bottom = 'auto';
        }
      }
    } catch (error) {
      console.log('⚠️ Could not restore UI position:', error);
    }
  }
  
  resetUIPosition() {
    // Reset to default position
    this.ui.style.top = '80px';
    this.ui.style.right = '20px';
    this.ui.style.left = 'auto';
    this.ui.style.bottom = 'auto';
    
    // Clear saved position
    try {
      localStorage.removeItem('bulkDeleteUI_position');
      console.log('🔄 UI position reset to default');
    } catch (error) {
      console.log('⚠️ Could not clear saved position:', error);
    }
  }
}

// Initialize the extension when the page loads
console.log('');
console.log('🌟 ========================================');
console.log('🌟 === YOUTUBE BULK DELETE SCRIPT LOADED ===');
console.log('🌟 ========================================');
console.log('');

// Make extension available globally for debugging
window.bulkDeleteExtension = null;

// Check if we're on the Watch Later page
const isWatchLaterPage = window.location.href.includes('youtube.com/playlist?list=WL');
console.log(`🔍 Watch Later page check: ${isWatchLaterPage}`);

if (isWatchLaterPage) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOMContentLoaded fired, initializing extension...');
      window.bulkDeleteExtension = new WatchLaterBulkDelete();
    });
  } else {
    console.log('✅ Document already loaded, initializing extension immediately...');
    window.bulkDeleteExtension = new WatchLaterBulkDelete();
  }
  
  // Also initialize on navigation changes (for SPA behavior)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('🔄 URL changed, checking if still on Watch Later page...');
      
      if (url.includes('youtube.com/playlist?list=WL')) {
        console.log('✅ Still on Watch Later page, reinitializing...');
        setTimeout(() => {
          if (window.bulkDeleteExtension) {
            window.bulkDeleteExtension.setupEventListeners();
          } else {
            window.bulkDeleteExtension = new WatchLaterBulkDelete();
          }
        }, 1000);
      } else {
        console.log('❌ Navigated away from Watch Later page');
      }
    }
  }).observe(document, { subtree: true, childList: true });
} else {
  console.log('ℹ️ Not on Watch Later page, extension will not initialize');
}

// Debug functions for console access
window.debugBulkDelete = {
  testSelectAll: () => {
    console.log('🧪 === TESTING SELECT ALL ===');
    if (window.bulkDeleteExtension) {
      window.bulkDeleteExtension.selectAllVideos();
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  testToggleMode: () => {
    console.log('🧪 === TESTING TOGGLE MODE ===');
    if (window.bulkDeleteExtension) {
      window.bulkDeleteExtension.toggleBulkDeleteMode();
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  checkState: () => {
    console.log('🧪 === EXTENSION STATE CHECK ===');
    if (window.bulkDeleteExtension) {
      const ext = window.bulkDeleteExtension;
      console.log(`  - isEnabled: ${ext.isEnabled}`);
      console.log(`  - selectedVideos.size: ${ext.selectedVideos.size}`);
      console.log(`  - UI exists: ${!!document.getElementById('bulk-delete-ui')}`);
      console.log(`  - Toggle button exists: ${!!document.getElementById('toggle-bulk-delete')}`);
      console.log(`  - Select all button exists: ${!!document.getElementById('select-all')}`);
      console.log(`  - Checkboxes count: ${document.querySelectorAll('.bulk-delete-checkbox').length}`);
      console.log(`  - Video elements count: ${ext.getVideoElements().length}`);
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  forceSelectAll: () => {
    console.log('🧪 === FORCE SELECT ALL (BYPASS CHECKS) ===');
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`Found ${checkboxes.length} checkboxes`);
    
    if (checkboxes.length === 0) {
      console.log('⚠️ No checkboxes found, trying to add them...');
      if (window.bulkDeleteExtension) {
        window.bulkDeleteExtension.addCheckboxesToVideos();
        setTimeout(() => {
          const newCheckboxes = document.querySelectorAll('.bulk-delete-checkbox');
          console.log(`Found ${newCheckboxes.length} checkboxes after adding`);
          newCheckboxes.forEach((cb, i) => {
            cb.checked = true;
            console.log(`✅ Checkbox ${i + 1} checked`);
          });
        }, 200);
      }
    } else {
      checkboxes.forEach((cb, i) => {
        cb.checked = true;
        console.log(`✅ Checkbox ${i + 1} checked`);
      });
    }
  },
  
  performSelectAll: () => {
    console.log('🧪 === PERFORM SELECT ALL (USE EXTENSION METHOD) ===');
    if (window.bulkDeleteExtension) {
      const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
      if (checkboxes.length > 0) {
        window.bulkDeleteExtension.performSelectAll(checkboxes);
      } else {
        console.log('⚠️ No checkboxes found, calling selectAllVideos instead');
        window.bulkDeleteExtension.selectAllVideos();
      }
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  clickSelectAllButton: () => {
    console.log('🧪 === MANUALLY CLICKING SELECT ALL BUTTON ===');
    const selectAllBtn = document.getElementById('select-all');
    if (selectAllBtn) {
      console.log('✅ Select all button found, clicking it...');
      selectAllBtn.click();
    } else {
      console.error('❌ Select all button not found');
    }
  },
  
  testButtonExists: () => {
    console.log('🧪 === TESTING BUTTON EXISTENCE ===');
    const ui = document.getElementById('bulk-delete-ui');
    const controls = document.getElementById('bulk-delete-controls');
    const selectAllBtn = document.getElementById('select-all');
    
    console.log(`UI exists: ${!!ui}`);
    console.log(`Controls exist: ${!!controls}`);
    console.log(`Select all button exists: ${!!selectAllBtn}`);
    
    if (selectAllBtn) {
      console.log(`Select all button visible: ${selectAllBtn.offsetParent !== null}`);
      console.log(`Select all button onclick: ${selectAllBtn.onclick ? 'exists' : 'missing'}`);
      console.log(`Select all button innerHTML: ${selectAllBtn.innerHTML}`);
    }
  }
};

console.log('');
console.log('🔧 Debug functions available:');
console.log('  - debugBulkDelete.testSelectAll() - Test select all function');
console.log('  - debugBulkDelete.testToggleMode() - Test toggle mode');
console.log('  - debugBulkDelete.checkState() - Check extension state');
console.log('  - debugBulkDelete.forceSelectAll() - Force check all boxes');
console.log('  - debugBulkDelete.performSelectAll() - Use extension method');
console.log('  - debugBulkDelete.clickSelectAllButton() - Manually click button');
console.log('  - debugBulkDelete.testButtonExists() - Test button existence');
console.log('');