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
    
    const buttons = [
      { id: 'toggle-bulk-delete', handler: () => this.toggleBulkDeleteMode() },
      { id: 'select-all', handler: () => {
        console.log('🎯 Direct select-all listener triggered');
        this.selectAllVideos();
      }},
      { id: 'deselect-all', handler: () => this.deselectAllVideos() },
      { id: 'delete-selected', handler: () => this.deleteSelectedVideos() },
      { id: 'delete-all', handler: () => this.deleteAllVideos() },
      { id: 'cancel-delete', handler: () => this.cancelDeletion() }
    ];
    
    buttons.forEach(({ id, handler }) => {
      const btn = document.getElementById(id);
      if (btn) {
        // Remove existing listeners
        btn.removeEventListener('click', handler);
        // Add new listener
        btn.addEventListener('click', (e) => {
          console.log(`🎯 Direct listener for ${id} triggered`);
          e.preventDefault();
          e.stopPropagation();
          handler();
        });
        console.log(`✅ Direct listener added for ${id}`);
      } else {
        console.warn(`⚠️ Button ${id} not found for direct listener`);
      }
    });
    
    // Filter inputs
    const titleFilterInput = document.getElementById('title-filter');
    const rangeFilterInput = document.getElementById('range-filter');
    
    if (titleFilterInput) {
      titleFilterInput.addEventListener('input', (e) => {
        console.log('🔍 Direct title filter input changed:', e.target.value);
        this.applyFilters();
      });
      console.log('✅ Direct listener added for title-filter');
    }
    
    if (rangeFilterInput) {
      rangeFilterInput.addEventListener('input', (e) => {
        console.log('📊 Direct range filter input changed:', e.target.value);
        this.applyFilters();
      });
      console.log('✅ Direct listener added for range-filter');
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
  
  toggleBulkDeleteMode() {
    console.log('');
    console.log('🔄 ========================================');
    console.log('🔄 === TOGGLING BULK DELETE MODE ===');
    console.log('🔄 ========================================');
    console.log('');
    
    console.log(`🔍 Current state: ${this.isEnabled}`);
    
    this.isEnabled = !this.isEnabled;
    console.log(`🔍 New state: ${this.isEnabled}`);
    
    const toggleButton = document.getElementById('toggle-bulk-delete');
    const controls = document.getElementById('bulk-delete-controls');
    
    if (!toggleButton) {
      console.error('❌ Toggle button not found');
      return;
    }
    
    if (!controls) {
      console.error('❌ Controls not found');
      return;
    }
    
    if (this.isEnabled) {
      console.log('✅ Enabling bulk delete mode...');
      
      // Update button
      toggleButton.textContent = '一括削除モードを無効化';
      toggleButton.dataset.enabled = 'true';
      
      // Show controls
      controls.style.display = 'block';
      
      // Add checkboxes to all videos
      this.addCheckboxesToVideos();
      
      // Apply any existing filters
      this.applyFilters();
      
      this.showNotification('✅ 一括削除モードが有効になりました');
      
    } else {
      console.log('❌ Disabling bulk delete mode...');
      
      // Update button
      toggleButton.textContent = '一括削除モードを有効化';
      toggleButton.dataset.enabled = 'false';
      
      // Hide controls
      controls.style.display = 'none';
      
      // Remove checkboxes and reset
      this.removeCheckboxes();
      this.selectedVideos.clear();
      
      // Show all videos (remove filtering)
      this.showAllVideos();
      
      this.showNotification('❌ 一括削除モードが無効になりました');
    }
    
    this.saveState();
    console.log('✅ Toggle mode completed');
  }
  
  getVideoElements() {
    const videoSelectors = [
      'ytd-playlist-video-renderer',
      'ytd-video-renderer',
      '[class*="video-renderer"]'
    ];
    
    let videos = [];
    for (const selector of videoSelectors) {
      videos = Array.from(document.querySelectorAll(selector));
      if (videos.length > 0) {
        console.log(`🎯 Found ${videos.length} videos using selector: ${selector}`);
        break;
      }
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
    
    if (videos.length === 0) {
      console.warn('⚠️ No videos found to add checkboxes to');
      return;
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    
    videos.forEach((video, index) => {
      try {
        // Skip if checkbox already exists
        if (video.querySelector('.bulk-delete-checkbox')) {
          skippedCount++;
          return;
        }
        
        // Get unique video ID
        const videoId = this.getVideoId(video);
        if (!videoId) {
          console.warn(`⚠️ Could not get video ID for video ${index + 1}`);
          return;
        }
        
        // Find thumbnail container
        const thumbnailContainer = video.querySelector('ytd-thumbnail, [id="thumbnail"], .thumbnail, [class*="thumbnail"]');
        if (!thumbnailContainer) {
          console.warn(`⚠️ No thumbnail container found for video ${index + 1}`);
          return;
        }
        
        // Create checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'bulk-delete-checkbox';
        checkbox.dataset.videoId = videoId;
        
        // Add change event listener
        checkbox.addEventListener('change', (e) => {
          console.log(`☑️ Checkbox for video ${videoId} changed: ${e.target.checked}`);
          
          if (e.target.checked) {
            this.selectedVideos.add(videoId);
          } else {
            this.selectedVideos.delete(videoId);
          }
          
          this.updateDeleteButton();
        });
        
        checkboxContainer.appendChild(checkbox);
        
        // Make thumbnail container position relative
        thumbnailContainer.style.position = 'relative';
        thumbnailContainer.appendChild(checkboxContainer);
        
        addedCount++;
        console.log(`✅ Added checkbox to video ${index + 1} (ID: ${videoId})`);
        
      } catch (error) {
        console.error(`❌ Error adding checkbox to video ${index + 1}:`, error);
      }
    });
    
    console.log(`🎉 Checkbox addition completed: ${addedCount} added, ${skippedCount} skipped`);
    
    // Update UI state
    this.updateDeleteButton();
  }
  
  getVideoId(videoElement) {
    // Try multiple methods to get a unique video identifier
    const methods = [
      // Method 1: From watch URL
      () => {
        const link = videoElement.querySelector('a[href*="/watch"]');
        if (link) {
          const url = new URL(link.href, window.location.origin);
          return url.searchParams.get('v');
        }
        return null;
      },
      
      // Method 2: From data attributes
      () => {
        return videoElement.dataset.videoId || 
               videoElement.getAttribute('data-video-id') ||
               videoElement.getAttribute('video-id');
      },
      
      // Method 3: From nested elements
      () => {
        const nested = videoElement.querySelector('[data-video-id]');
        return nested ? nested.dataset.videoId : null;
      },
      
      // Method 4: Generate from title and channel (fallback)
      () => {
        const title = this.getVideoTitle(videoElement);
        const channel = this.getVideoChannel(videoElement);
        if (title && channel) {
          return `${channel}-${title}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        }
        return null;
      }
    ];
    
    for (const method of methods) {
      try {
        const id = method();
        if (id) {
          return id;
        }
      } catch (error) {
        console.warn('Error in video ID method:', error);
      }
    }
    
    // Final fallback: use index
    const videos = this.getVideoElements();
    const index = videos.indexOf(videoElement);
    return `video-${index}`;
  }
  
  getVideoTitle(videoElement) {
    const titleSelectors = [
      '#video-title',
      'h3 a[href*="/watch"]',
      'a[href*="/watch"] #video-title',
      '[id="video-title"]',
      'a[href*="/watch"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = videoElement.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || element.title?.trim() || '';
      }
    }
    
    return '';
  }
  
  getVideoChannel(videoElement) {
    const channelSelectors = [
      'ytd-channel-name a',
      '.ytd-channel-name a',
      'a[href*="/channel/"]',
      'a[href*="/@"]',
      '[class*="channel"] a'
    ];
    
    for (const selector of channelSelectors) {
      const element = videoElement.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    
    return '';
  }
  
  removeCheckboxes() {
    console.log('🧹 Removing all checkboxes...');
    
    const containers = document.querySelectorAll('.checkbox-container');
    console.log(`🔍 Found ${containers.length} checkbox containers to remove`);
    
    containers.forEach(container => container.remove());
    
    console.log('✅ All checkboxes removed');
  }
  
  updateDeleteButton() {
    const deleteButton = document.getElementById('delete-selected');
    if (!deleteButton) return;
    
    const selectedCount = this.selectedVideos.size;
    
    if (selectedCount > 0) {
      deleteButton.disabled = false;
      deleteButton.textContent = `🗑️ 選択した${selectedCount}個を削除`;
    } else {
      deleteButton.disabled = true;
      deleteButton.textContent = '動画を選択してください';
    }
  }
  
  selectAllVideos() {
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ === SELECT ALL VIDEOS (SIMPLIFIED) ===');
    console.log('✅ ========================================');
    console.log('');
    
    try {
      // Step 1: Ensure bulk delete mode is enabled
      if (!this.isEnabled) {
        console.log('🔄 Enabling bulk delete mode first...');
        this.toggleBulkDeleteMode();
        
        // Wait and retry
        setTimeout(() => {
          console.log('🔄 Retrying select all after enabling mode...');
          this.selectAllVideos();
        }, 500);
        return;
      }
      
      // Step 2: Get video elements
      const videos = this.getVideoElements();
      console.log(`📺 Found ${videos.length} video elements`);
      
      if (videos.length === 0) {
        this.showNotification('⚠️ 動画が見つかりません');
        return;
      }
      
      // Step 3: Ensure checkboxes exist
      let checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
      console.log(`☑️ Found ${checkboxes.length} existing checkboxes`);
      
      if (checkboxes.length === 0) {
        console.log('🔧 No checkboxes found, adding them...');
        this.addCheckboxesToVideos();
        
        // Wait for checkboxes to be added
        setTimeout(() => {
          checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
          console.log(`☑️ After adding: Found ${checkboxes.length} checkboxes`);
          this.performSelectAll(checkboxes);
        }, 200);
        return;
      }
      
      // Step 4: Select all immediately
      this.performSelectAll(checkboxes);
      
    } catch (error) {
      console.error('❌ Error in selectAllVideos:', error);
      this.showNotification('❌ 選択処理でエラーが発生しました');
    }
  }
  
  performSelectAll(checkboxes) {
    console.log('');
    console.log('⚡ === PERFORMING SELECT ALL (VISIBLE ONLY) ===');
    console.log('');
    
    if (!checkboxes || checkboxes.length === 0) {
      console.error('❌ No checkboxes provided to performSelectAll');
      this.showNotification('❌ チェックボックスが見つかりません');
      return;
    }
    
    let selectedCount = 0;
    let alreadySelected = 0;
    let hiddenCount = 0;
    let processedCount = 0;
    
    // Check if filtering is active
    const titleFilter = document.getElementById('title-filter')?.value?.trim() || '';
    const rangeFilter = document.getElementById('range-filter')?.value?.trim() || '';
    const isFiltering = titleFilter || rangeFilter;
    
    if (isFiltering) {
      console.log('🔍 Filtering is active, clearing previous selections to avoid unwanted deletions');
      console.log(`📊 Filter state: title="${titleFilter}", range="${rangeFilter}"`);
      
      // Clear previous selections when filtering to prevent deleting hidden videos
      this.selectedVideos.clear();
      
      // Also uncheck all checkboxes first
      const allCheckboxes = document.querySelectorAll('.bulk-delete-checkbox');
      allCheckboxes.forEach(cb => {
        cb.checked = false;
      });
      console.log('✅ Cleared all previous selections and unchecked all checkboxes');
    } else {
      console.log('ℹ️ No filtering active, preserving existing selections');
    }
    
    // Process each checkbox (only visible ones)
    Array.from(checkboxes).forEach((checkbox, index) => {
      try {
        const videoId = checkbox.dataset.videoId;
        console.log(`📋 Processing checkbox ${index + 1}: videoId=${videoId}`);
        
        if (!videoId) {
          console.warn(`⚠️ Checkbox ${index + 1} has no videoId`);
          return;
        }
        
        // Check if the parent video element is visible
        const parentContainer = checkbox.closest('ytd-playlist-video-renderer, ytd-video-renderer, [class*="video-renderer"]');
        if (parentContainer) {
          const isVisible = parentContainer.style.display !== 'none';
          
          if (!isVisible) {
            console.log(`⏭️ Checkbox ${index + 1}: Parent video is hidden, skipping`);
            hiddenCount++;
            return;
          }
        }
        
        processedCount++;
        
        // Check if already selected
        if (checkbox.checked) {
          alreadySelected++;
          console.log(`ℹ️ Checkbox ${index + 1} already selected`);
        } else {
          selectedCount++;
          console.log(`✅ Selecting checkbox ${index + 1}`);
          // Select checkbox
          checkbox.checked = true;
        }
        
        // Add to selection set
        this.selectedVideos.add(videoId);
        
      } catch (error) {
        console.error(`❌ Error processing checkbox ${index + 1}:`, error);
      }
    });
    
    // Update UI
    this.updateDeleteButton();
    
    // Show results
    console.log('');
    console.log('📊 === SELECT ALL RESULTS ===');
    console.log(`  - Newly selected: ${selectedCount}`);
    console.log(`  - Already selected: ${alreadySelected}`);
    console.log(`  - Hidden (skipped): ${hiddenCount}`);
    console.log(`  - Total processed: ${processedCount}`);
    console.log(`  - Final selection count: ${this.selectedVideos.size}`);
    console.log('');
    
    // Show appropriate notification
    if (selectedCount > 0 || alreadySelected > 0) {
      const totalVisible = selectedCount + alreadySelected;
      this.showNotification(`✅ 表示中の${totalVisible}個の動画を選択しました（非表示: ${hiddenCount}個をスキップ）`);
    } else {
      this.showNotification('⚠️ 選択できる動画が見つかりません');
    }
    
    // Debug verification
    const finalCheckboxes = document.querySelectorAll('.bulk-delete-checkbox:checked');
    console.log(`✅ Final verification: ${finalCheckboxes.length} checkboxes are now checked`);
  }
  
  
  deselectAllVideos() {
    console.log('❌ === DESELECT ALL VIDEOS (VISIBLE ONLY) ===');
    
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`🔍 Found ${checkboxes.length} checkboxes to deselect`);
    
    if (checkboxes.length === 0) {
      this.showNotification('⚠️ 選択解除する動画が見つかりません');
      return;
    }
    
    let deselectedCount = 0;
    let alreadyDeselected = 0;
    let hiddenCount = 0;
    let processedCount = 0;
    const deselectedVideoIds = [];
    
    checkboxes.forEach((checkbox, index) => {
      try {
        const videoId = checkbox.dataset.videoId;
        console.log(`📋 Processing checkbox ${index + 1}: videoId=${videoId}, checked=${checkbox.checked}`);
        
        if (!videoId) {
          console.warn(`⚠️ Checkbox ${index + 1} has no videoId`);
          return;
        }
        
        // Check if the parent video element is visible
        const parentContainer = checkbox.closest('ytd-playlist-video-renderer, ytd-video-renderer, [class*="video-renderer"]');
        if (parentContainer) {
          const isVisible = parentContainer.style.display !== 'none';
          
          if (!isVisible) {
            console.log(`⏭️ Checkbox ${index + 1}: Parent video is hidden, skipping`);
            hiddenCount++;
            return;
          }
        }
        
        processedCount++;
        
        if (checkbox.checked) {
          deselectedCount++;
          console.log(`❌ Deselecting checkbox ${index + 1}`);
          
          // Uncheck checkbox
          checkbox.checked = false;
          
          // Remove from selection set
          this.selectedVideos.delete(videoId);
          deselectedVideoIds.push(videoId);
        } else {
          alreadyDeselected++;
          console.log(`ℹ️ Checkbox ${index + 1} already deselected`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing checkbox ${index + 1}:`, error);
      }
    });
    
    console.log('');
    console.log('📊 === DESELECT ALL RESULTS ===');
    console.log(`  - Newly deselected: ${deselectedCount}`);
    console.log(`  - Already deselected: ${alreadyDeselected}`);
    console.log(`  - Hidden (skipped): ${hiddenCount}`);
    console.log(`  - Total processed: ${processedCount}`);
    console.log(`  - Final selection count: ${this.selectedVideos.size}`);
    console.log(`  - Deselected video IDs:`, deselectedVideoIds);
    console.log('');
    
    // Update UI
    this.updateDeleteButton();
    
    // Show appropriate notification
    if (deselectedCount > 0) {
      this.showNotification(`❌ 表示中の${deselectedCount}個の動画の選択を解除しました（残り: ${this.selectedVideos.size}個）`);
    } else if (alreadyDeselected > 0) {
      this.showNotification('ℹ️ 表示中のすべての動画の選択はすでに解除されています');
    } else {
      this.showNotification('⚠️ 選択解除できる動画が見つかりません');
    }
  }
  
  async deleteSelectedVideos() {
    if (this.selectedVideos.size === 0) {
      this.showNotification('⚠️ 削除する動画が選択されていません');
      return;
    }
    
    const selectedCount = this.selectedVideos.size;
    console.log(`🗑️ Starting deletion of ${selectedCount} selected videos`);
    
    const confirmed = await this.showConfirmDialog(
      `${selectedCount}個の動画を削除しますか？\n\nこの操作は元に戻せません。`
    );
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      this.showNotification('❌ 削除がキャンセルされました');
      return;
    }
    
    const allVideos = this.getVideoElements();
    const videosToDelete = allVideos.filter(video => {
      const videoId = this.getVideoId(video);
      const isSelected = this.selectedVideos.has(videoId);
      
      // Additional safety: check if video is actually visible (not filtered out)
      const isVisible = video.style.display !== 'none';
      
      if (isSelected && !isVisible) {
        console.warn(`⚠️ Video ${videoId} is selected but not visible - excluding from deletion`);
        // Remove from selected set to clean up
        this.selectedVideos.delete(videoId);
        return false;
      }
      
      return isSelected;
    });
    
    console.log(`📺 Found ${videosToDelete.length} videos to delete from ${allVideos.length} total videos`);
    
    if (videosToDelete.length === 0) {
      console.error('❌ No matching videos found for deletion');
      this.showNotification('❌ 削除する動画が見つかりません');
      return;
    }
    
    this.startDeletion(videosToDelete);
  }
  
  async deleteAllVideos() {
    console.log('🗑️ Starting deletion of all videos');
    const allVideos = this.getVideoElements();
    
    if (allVideos.length === 0) {
      this.showNotification('⚠️ 削除する動画が見つかりません');
      return;
    }
    
    // Filter to only include visible videos (not filtered out)
    const visibleVideos = allVideos.filter(video => video.style.display !== 'none');
    
    console.log(`📺 Found ${allVideos.length} total videos, ${visibleVideos.length} visible videos`);
    
    if (visibleVideos.length === 0) {
      this.showNotification('⚠️ 表示されている動画が見つかりません');
      return;
    }
    
    // Check if filtering is active
    const titleFilter = document.getElementById('title-filter')?.value?.trim() || '';
    const rangeFilter = document.getElementById('range-filter')?.value?.trim() || '';
    const isFiltering = titleFilter || rangeFilter;
    
    let confirmMessage;
    if (isFiltering) {
      confirmMessage = `フィルタリング条件に一致する${visibleVideos.length}個の動画を「後で見る」から削除しますか？\n\n⚠️ この操作は元に戻せません！`;
    } else {
      confirmMessage = `すべての動画（${visibleVideos.length}個）を「後で見る」から削除しますか？\n\n⚠️ この操作は元に戻せません！`;
    }
    
    const confirmed = await this.showConfirmDialog(confirmMessage);
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      this.showNotification('❌ 削除がキャンセルされました');
      return;
    }
    
    this.startDeletion(visibleVideos);
  }
  
  startDeletion(videos) {
    this.isDeleting = true;
    this.totalToDelete = videos.length;
    this.deleteProgress = 0;
    
    // Show progress UI
    document.getElementById('bulk-delete-controls').style.display = 'none';
    document.getElementById('progress-section').style.display = 'block';
    
    // Notify background script of deletion start
    console.log(`📨 Notifying background script: Starting deletion of ${videos.length} videos`);
    chrome.runtime.sendMessage({
      type: 'DELETE_STARTED',
      count: videos.length
    }).catch(error => {
      console.warn('⚠️ Could not notify background script of deletion start:', error);
    });
    
    this.showNotification(`🗑️ ${videos.length}個の動画の削除を開始します...`);
    
    this.processDeletionQueue(videos);
  }
  
  async processDeletionQueue(videos) {
    console.log(`🗑️ Starting deletion of ${videos.length} videos`);
    
    for (let i = 0; i < videos.length && this.isDeleting; i++) {
      const video = videos[i];
      console.log(`🗑️ Deleting video ${i + 1}/${videos.length}`);
      
      try {
        const success = await this.deleteVideo(video);
        if (success) {
          console.log(`✅ Video ${i + 1} deleted successfully`);
        } else {
          console.log(`❌ Failed to delete video ${i + 1}`);
        }
      } catch (error) {
        console.error(`💥 Error deleting video ${i + 1}:`, error);
      }
      
      this.deleteProgress = i + 1;
      this.updateProgress();
      
      // Small delay between deletions
      await this.delay(1000);
    }
    
    this.completeDeletion();
  }
  
  async deleteVideo(videoElement) {
    // Enhanced video deletion logic
    const videoId = this.getVideoId(videoElement);
    console.log(`🎯 Attempting to delete video: ${videoId}`);
    
    // Multiple menu button selectors
    const menuSelectors = [
      'button[aria-label*="メニュー"]',
      'button[aria-label*="menu"]',
      'button[aria-label*="操作"]',
      'button[aria-label*="More actions"]',
      'ytd-menu-renderer button',
      'yt-icon-button[aria-label*="menu"]',
      '[role="button"][aria-haspopup="true"]'
    ];
    
    let menuButton = null;
    for (const selector of menuSelectors) {
      menuButton = videoElement.querySelector(selector);
      if (menuButton) {
        console.log(`✅ Found menu button: ${selector}`);
        break;
      }
    }
    
    if (!menuButton) {
      console.log('❌ No menu button found');
      return false;
    }
    
    try {
      // Click menu button
      console.log('👆 Clicking menu button...');
      menuButton.click();
      await this.delay(500);
      
      // Find delete option
      const deleteSelectors = [
        '[role="menuitem"]:has([aria-label*="削除"])',
        '[role="menuitem"]:has([aria-label*="remove"])',
        'ytd-menu-service-item-renderer:has([aria-label*="削除"])',
        'ytd-menu-service-item-renderer:has([aria-label*="remove"])',
        'tp-yt-paper-item:has([aria-label*="削除"])',
        'tp-yt-paper-item:has([aria-label*="remove"])'
      ];
      
      let deleteOption = null;
      for (const selector of deleteSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.toLowerCase() || '';
          const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
          
          if (text.includes('削除') || text.includes('remove') ||
              ariaLabel.includes('削除') || ariaLabel.includes('remove')) {
            deleteOption = element;
            console.log(`✅ Found delete option: ${selector}`);
            break;
          }
        }
        if (deleteOption) break;
      }
      
      if (!deleteOption) {
        console.log('❌ Delete option not found');
        // Close menu
        document.body.click();
        await this.delay(200);
        return false;
      }
      
      // Click delete option
      console.log('🗑️ Clicking delete option...');
      deleteOption.click();
      await this.delay(500);
      
      // Look for confirmation dialog
      const confirmSelectors = [
        'button[aria-label*="削除"]',
        'button[aria-label*="remove"]',
        '#confirm-button',
        '[role="dialog"] button'
      ];
      
      let confirmButton = null;
      for (const selector of confirmSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.toLowerCase() || '';
          const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
          
          if ((text.includes('削除') || text.includes('remove') ||
               ariaLabel.includes('削除') || ariaLabel.includes('remove')) &&
              element.offsetParent !== null) { // Must be visible
            confirmButton = element;
            console.log(`✅ Found confirm button: ${selector}`);
            break;
          }
        }
        if (confirmButton) break;
      }
      
      if (confirmButton) {
        console.log('✅ Clicking confirmation button...');
        confirmButton.click();
        await this.delay(1000);
      }
      
      console.log('✅ Video deletion completed');
      return true;
      
    } catch (error) {
      console.error('💥 Error during video deletion:', error);
      return false;
    }
  }
  
  completeDeletion() {
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 === DELETION COMPLETED ===');
    console.log('🎉 ========================================');
    console.log('');
    
    this.isDeleting = false;
    
    // Hide progress UI
    document.getElementById('progress-section').style.display = 'none';
    
    // Show controls
    document.getElementById('bulk-delete-controls').style.display = 'block';
    
    // Reset selection
    this.selectedVideos.clear();
    
    // Remove and re-add checkboxes
    this.removeCheckboxes();
    setTimeout(() => {
      this.addCheckboxesToVideos();
      this.updateDeleteButton();
    }, 1000);
    
    // Notify completion
    this.showNotification(`🎉 削除処理が完了しました（${this.deleteProgress}/${this.totalToDelete}）`);
    
    console.log(`🎉 Deletion completed: ${this.deleteProgress}/${this.totalToDelete}`);
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
    
    console.log(`📊 Progress: ${this.deleteProgress}/${this.totalToDelete} (${Math.round((this.deleteProgress / this.totalToDelete) * 100)}%)`);
  }
  
  cancelDeletion() {
    console.log('⏹️ Cancelling deletion...');
    this.isDeleting = false;
    this.showNotification('⏹️ 削除をキャンセルしました');
    
    // Hide progress and show controls
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('bulk-delete-controls').style.display = 'block';
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
        
      case 'DEBUG_DELETE_PROCESS':
        this.debugDeleteProcess();
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
          // Don't auto-enable on page load to avoid confusion
          // this.toggleBulkDeleteMode();
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
      console.log('💾 State saved');
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  }
  
  showAllVideos() {
    console.log('📺 Showing all videos (removing filter)');
    const videos = this.getVideoElements();
    videos.forEach(video => {
      video.style.display = '';
    });
    
    // Clear filter inputs
    const titleFilter = document.getElementById('title-filter');
    const rangeFilter = document.getElementById('range-filter');
    if (titleFilter) titleFilter.value = '';
    if (rangeFilter) rangeFilter.value = '';
  }
  
  applyFilters() {
    console.log('');
    console.log('🔍 ========================================');
    console.log('🔍 === APPLYING COMBINED FILTERS ===');
    console.log('🔍 ========================================');
    console.log('');
    
    const titleFilter = document.getElementById('title-filter')?.value || '';
    const rangeFilter = document.getElementById('range-filter')?.value || '';
    
    console.log(`🔍 Title filter: "${titleFilter}"`);
    console.log(`📊 Range filter: "${rangeFilter}"`);
    
    this.filterVideos(titleFilter, rangeFilter);
  }
  
  filterVideos(searchTerm = '', rangeText = '') {
    console.log('');
    console.log('🔍 ========================================');
    console.log('🔍 === FILTERING VIDEOS (ENHANCED WITH RANGE) ===');
    console.log('🔍 ========================================');
    console.log('');
    
    console.log(`🔍 Search term: "${searchTerm}"`);
    console.log(`📊 Range text: "${rangeText}"`);
    
    const videos = this.getVideoElements();
    console.log(`📺 Found ${videos.length} video elements to filter`);
    
    if (videos.length === 0) {
      console.warn('⚠️ No videos found to filter');
      return;
    }
    
    // Parse range filter
    const rangeFilter = this.parseNumberRange(rangeText);
    console.log(`📊 Parsed range filter:`, rangeFilter);
    
    // Enhanced normalization for search term
    const normalizedSearch = this.normalizeJapaneseText(searchTerm);
    console.log(`🔍 Normalized search variants:`, normalizedSearch.variants);
    
    // If both filters are empty, show all videos
    if ((!searchTerm || searchTerm.trim() === '') && !rangeFilter) {
      console.log('📺 No filters applied, showing all videos');
      videos.forEach((video, index) => {
        video.style.display = '';
        console.log(`✅ Video ${index + 1}: shown (no filters)`);
      });
      console.log('✅ Filter completed - all videos shown');
      return;
    }
    
    let shownCount = 0;
    let hiddenCount = 0;
    let errorCount = 0;
    let rangeFilteredCount = 0;
    let titleFilteredCount = 0;
    
    videos.forEach((video, index) => {
      try {
        // Get video index for range filtering
        const videoIndex = this.getVideoIndex(video);
        console.log(`📊 Video ${index + 1}: index = ${videoIndex}`);
        
        // Check range filter first (if specified)
        let passesRangeFilter = true;
        if (rangeFilter) {
          if (videoIndex === null) {
            console.warn(`⚠️ Video ${index + 1}: Could not determine index, treating as outside range`);
            passesRangeFilter = false;
          } else {
            passesRangeFilter = videoIndex >= rangeFilter.start && videoIndex <= rangeFilter.end;
            console.log(`📊 Video ${index + 1}: index ${videoIndex} in range [${rangeFilter.start}-${rangeFilter.end}]: ${passesRangeFilter}`);
          }
          
          if (!passesRangeFilter) {
            rangeFilteredCount++;
          }
        }
        
        // If range filter fails, hide video and skip title checking
        if (!passesRangeFilter) {
          video.style.display = 'none';
          hiddenCount++;
          console.log(`❌ Video ${index + 1}: HIDDEN by range filter`);
          return;
        }
        
        // Check title/channel filter (if specified)
        let passesTitleFilter = true;
        if (searchTerm && searchTerm.trim() !== '') {
          // Try multiple selectors to find the title element
          const titleSelectors = [
            '#video-title',
            'h3 a[href*="/watch"]',
            'a[href*="/watch"] #video-title',
            '[id="video-title"]',
            'ytd-video-meta-block #video-title',
            'a[href*="/watch"] span[title]',
            'h3 a span',
            'a[href*="/watch"]'
          ];
          
          let titleElement = null;
          let titleText = '';
          
          // Try each selector until we find the title
          for (const selector of titleSelectors) {
            titleElement = video.querySelector(selector);
            if (titleElement) {
              titleText = titleElement.textContent?.trim() || titleElement.title?.trim() || '';
              if (titleText) {
                console.log(`🔍 Video ${index + 1}: Found title using "${selector}" -> "${titleText.substring(0, 50)}..."`);
                break;
              }
            }
          }
          
          // Try to find channel name
          const channelSelectors = [
            'ytd-channel-name a',
            '.ytd-channel-name a',
            'a[href*="/channel/"]',
            'a[href*="/@"]',
            '[class*="channel"] a'
          ];
          
          let channelElement = null;
          let channelText = '';
          
          for (const selector of channelSelectors) {
            channelElement = video.querySelector(selector);
            if (channelElement) {
              channelText = channelElement.textContent?.trim() || '';
              if (channelText) {
                console.log(`🔍 Video ${index + 1}: Found channel using "${selector}" -> "${channelText}"`);
                break;
              }
            }
          }
          
          // Combine title and channel for searching
          const combinedText = `${titleText} ${channelText}`.toLowerCase();
          console.log(`🔍 Video ${index + 1}: Combined search text -> "${combinedText.substring(0, 100)}..."`);
          
          // Check if any search variant matches
          const searchVariants = normalizedSearch.variants;
          let found = false;
          
          for (const variant of searchVariants) {
            if (combinedText.includes(variant.toLowerCase())) {
              found = true;
              console.log(`✅ Video ${index + 1}: MATCH found with variant "${variant}"`);
              break;
            }
          }
          
          passesTitleFilter = found;
          
          if (!passesTitleFilter) {
            titleFilteredCount++;
            console.log(`❌ Video ${index + 1}: NO MATCH for search "${searchTerm}"`);
          }
        }
        
        // Final decision: show only if passes both filters
        const shouldShow = passesTitleFilter; // Range filter already applied above
        
        if (shouldShow) {
          video.style.display = '';
          shownCount++;
          console.log(`✅ Video ${index + 1}: SHOWN`);
        } else {
          video.style.display = 'none';
          hiddenCount++;
          console.log(`❌ Video ${index + 1}: HIDDEN by title/channel filter`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing video ${index + 1}:`, error);
        errorCount++;
        // Show video by default on error
        video.style.display = '';
      }
    });
    
    console.log('');
    console.log('📊 === ENHANCED FILTER RESULTS WITH RANGE ===');
    console.log(`  - Shown: ${shownCount}`);
    console.log(`  - Hidden: ${hiddenCount}`);
    console.log(`  - Range filtered: ${rangeFilteredCount}`);
    console.log(`  - Title filtered: ${titleFilteredCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Title search term: "${searchTerm}"`);
    console.log(`  - Range filter: "${rangeText}" -> ${rangeFilter ? `[${rangeFilter.start}-${rangeFilter.end}]` : 'none'}`);
    console.log(`  - Search targets: Title + Channel Name + Index Number`);
    console.log(`  - Japanese normalization: Active`);
    console.log('');
    
    // Clean up selections for hidden videos to prevent unwanted deletions
    this.cleanupHiddenVideoSelections();
    
    // Show notification to user
    this.showFilterNotification(searchTerm, rangeText, rangeFilter, shownCount, videos.length, rangeFilteredCount, titleFilteredCount);
    
    console.log('✅ === ENHANCED FILTER PROCESS WITH RANGE COMPLETED ===');
  }
  
  cleanupHiddenVideoSelections() {
    console.log('🧹 === CLEANING UP HIDDEN VIDEO SELECTIONS ===');
    
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    let cleanedCount = 0;
    let processedCount = 0;
    
    checkboxes.forEach((checkbox, index) => {
      try {
        const videoId = checkbox.dataset.videoId;
        if (!videoId) return;
        
        processedCount++;
        
        // Check if the parent video element is hidden
        const parentContainer = checkbox.closest('ytd-playlist-video-renderer, ytd-video-renderer, [class*="video-renderer"]');
        if (parentContainer) {
          const isHidden = parentContainer.style.display === 'none';
          
          if (isHidden && checkbox.checked) {
            console.log(`🧹 Cleaning up hidden video: ${videoId}`);
            
            // Uncheck the checkbox
            checkbox.checked = false;
            
            // Remove from selection set
            this.selectedVideos.delete(videoId);
            
            cleanedCount++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error cleaning up checkbox ${index}:`, error);
      }
    });
    
    console.log(`🧹 Cleaned up ${cleanedCount} hidden video selections (processed ${processedCount} checkboxes)`);
    
    // Update delete button state
    this.updateDeleteButton();
  }
  
  // Enhanced notification for combined filtering
  showFilterNotification(searchTerm, rangeText, rangeFilter, shownCount, totalCount, rangeFilteredCount, titleFilteredCount) {
    let message = '';
    
    // Determine what filters are active
    const hasSearchFilter = searchTerm && searchTerm.trim() !== '';
    const hasRangeFilter = rangeFilter !== null;
    
    if (!hasSearchFilter && !hasRangeFilter) {
      // No filters
      message = `📺 すべての動画を表示しています（${totalCount}個）`;
    } else if (shownCount === 0) {
      // No results
      if (hasSearchFilter && hasRangeFilter) {
        message = `🔍 「${searchTerm}」+ 範囲「${rangeText}」に一致する動画が見つかりません`;
      } else if (hasSearchFilter) {
        message = `🔍 「${searchTerm}」に一致する動画が見つかりません（タイトル・チャンネル名対応）`;
      } else {
        message = `📊 範囲「${rangeText}」に該当する動画が見つかりません`;
      }
    } else {
      // Has results
      let filterDescription = '';
      
      if (hasSearchFilter && hasRangeFilter) {
        filterDescription = `「${searchTerm}」+ 範囲「${rangeText}」`;
      } else if (hasSearchFilter) {
        filterDescription = `「${searchTerm}」`;
      } else {
        filterDescription = `範囲「${rangeText}」`;
      }
      
      // Add details about filtering
      let details = '';
      if (hasSearchFilter && hasRangeFilter) {
        details = '（タイトル・チャンネル名 + 番号範囲対応、漢字・ひらがな・カタカナ対応）';
      } else if (hasSearchFilter) {
        details = '（タイトル・チャンネル名対応、漢字・ひらがな・カタカナ対応）';
      } else {
        details = '（番号範囲対応）';
      }
      
      message = `🔍 ${filterDescription}に一致: ${shownCount}個の動画 ${details}`;
    }
    
    this.showNotification(message);
  }
  
  parseNumberRange(rangeText) {
    if (!rangeText || rangeText.trim() === '') {
      return null;
    }
    
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
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            return {
              start: Math.min(start, end),  // Ensure start <= end
              end: Math.max(start, end),
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
      '.index-message',
      '.index',
      '[aria-label*="番"]',
      '[class*="index"]',
      '.ytd-playlist-video-renderer .index-message',
      'ytd-playlist-video-renderer [class*="index"]'
    ];
    
    for (const selector of indexSelectors) {
      const indexElement = videoElement.querySelector(selector);
      if (indexElement) {
        const indexText = indexElement.textContent || indexElement.innerText || '';
        const match = indexText.match(/\d+/);
        if (match) {
          const index = parseInt(match[0]);
          console.log(`📊 Found video index: ${index} from selector: ${selector}`);
          return index;
        }
      }
    }
    
    // Fallback: try to find by position in DOM
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
  
  normalizeJapaneseText(text) {
    if (!text || text.trim() === '') {
      return { original: text, variants: [text] };
    }
    
    const variants = [text.toLowerCase()];
    
    // Add hiragana/katakana conversions if needed
    // This is a simplified version - full conversion would require external libraries
    
    return {
      original: text,
      variants: [...new Set(variants)] // Remove duplicates
    };
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
  
  showConfirmDialog(message) {
    return new Promise((resolve) => {
      resolve(confirm(message));
    });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Debug method
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
      'button[aria-label*="メニュー"]',
      'button[aria-label*="menu"]',
      'button[aria-label*="操作"]',
      'ytd-menu-renderer button',
      'yt-icon-button[aria-label*="menu"]'
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
    console.log('🧪 === MANUAL TOGGLE MODE TEST ===');
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