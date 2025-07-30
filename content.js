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
          if (selector === 'body') {
            // For body, append as child
            target.appendChild(this.ui);
          } else {
            // For other elements, insert after
            target.parentNode.insertBefore(this.ui, target.nextSibling);
          }
          
          // Verify insertion
          const insertedUI = document.getElementById('bulk-delete-ui');
          if (insertedUI) {
            console.log('✅ UI successfully inserted into DOM');
            console.log(`🔍 UI parent:`, insertedUI.parentNode);
            
            // Verify buttons exist
            const toggleBtn = document.getElementById('toggle-bulk-delete');
            const selectAllBtn = document.getElementById('select-all');
            
            console.log(`🔍 Toggle button in DOM: ${!!toggleBtn}`);
            console.log(`🔍 Select all button in DOM: ${!!selectAllBtn}`);
            
            if (toggleBtn && selectAllBtn) {
              console.log('✅ All required buttons found in DOM');
            } else {
              console.error('❌ Some buttons missing from DOM');
            }
            
          } else {
            console.error('❌ UI insertion failed - element not found in DOM');
          }
          
          return;
          
        } catch (error) {
          console.error(`❌ Error inserting UI with selector ${selector}:`, error);
          continue;
        }
        
      } else {
        console.log(`❌ Target not found: ${selector}`);
      }
    }
    
    console.error('❌ Could not find any suitable insertion point for UI');
    console.log('🔍 Available body children:');
    const body = document.body;
    if (body) {
      for (let i = 0; i < body.children.length; i++) {
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
    }, 100);
    
    console.log('🎧 Event listeners setup completed (with delegation)');
  }
  
  addDirectListeners() {
    console.log('🔗 === ADDING DIRECT BUTTON LISTENERS AS BACKUP ===');
    
    const buttons = [
      { id: 'toggle-bulk-delete', handler: () => this.toggleBulkDeleteMode() },
      { id: 'select-all', handler: () => {
        console.log('✅ === SELECT ALL DIRECT LISTENER TRIGGERED ===');
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
    console.log('🔄 === TOGGLE BULK DELETE MODE CALLED ===');
    console.log('🔄 ========================================');
    console.log('');
    
    const previousState = this.isEnabled;
    this.isEnabled = !this.isEnabled;
    
    console.log(`🔄 Mode changed: ${previousState} → ${this.isEnabled}`);
    
    const toggleBtn = document.getElementById('toggle-bulk-delete');
    const controls = document.getElementById('bulk-delete-controls');
    
    console.log(`🔍 Toggle button exists: ${!!toggleBtn}`);
    console.log(`🔍 Controls exist: ${!!controls}`);
    
    if (this.isEnabled) {
      console.log('✅ Enabling bulk delete mode...');
      
      if (toggleBtn) {
        toggleBtn.textContent = '❌ 一括削除モードを無効化';
        toggleBtn.dataset.enabled = 'true';
        console.log('✅ Toggle button text updated');
      }
      
      if (controls) {
        controls.style.display = 'block';
        console.log('✅ Controls made visible');
      }
      
      console.log('🔧 Adding checkboxes to videos...');
      this.addCheckboxesToVideos();
      
      this.showNotification('✅ 一括削除モードが有効になりました');
      
    } else {
      console.log('❌ Disabling bulk delete mode...');
      
      if (toggleBtn) {
        toggleBtn.textContent = '✅ 一括削除モードを有効化';
        toggleBtn.dataset.enabled = 'false';
        console.log('❌ Toggle button text updated');
      }
      
      if (controls) {
        controls.style.display = 'none';
        console.log('❌ Controls hidden');
      }
      
      console.log('🧹 Removing checkboxes from videos...');
      this.removeCheckboxesFromVideos();
      
      this.selectedVideos.clear();
      console.log('🧹 Selected videos cleared');
      
      this.showNotification('❌ 一括削除モードが無効になりました');
    }
    
    this.updateSelectedCount();
    this.saveState();
    
    console.log('🔄 Toggle bulk delete mode completed');
    console.log(`🔍 Final state: isEnabled=${this.isEnabled}, selectedVideos.size=${this.selectedVideos.size}`);
  }
  
  addCheckboxesToVideos() {
    console.log('☑️ === ADDING CHECKBOXES TO VIDEOS ===');
    const videos = this.getVideoElements();
    console.log(`📺 Found ${videos.length} video elements`);
    
    if (videos.length === 0) {
      console.warn('⚠️ No video elements found to add checkboxes to');
      return;
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    
    videos.forEach((video, index) => {
      // Check if checkbox already exists
      if (video.querySelector('.bulk-delete-checkbox')) {
        skippedCount++;
        console.log(`⏭️ Video ${index + 1} already has checkbox, skipping`);
        return;
      }
      
      // Get video ID
      const videoId = this.getVideoId(video);
      console.log(`📋 Adding checkbox to video ${index + 1}, ID: ${videoId}`);
      
      // Create checkbox element
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-delete-checkbox';
      checkbox.dataset.videoId = videoId;
      
      // Prevent click event from bubbling to video link
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`👆 Checkbox clicked: ${videoId}`);
      });
      
      // Handle checkbox change
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        console.log(`☑️ Checkbox changed: ${e.target.checked} for video ${e.target.dataset.videoId}`);
        this.handleCheckboxChange(e.target);
      });
      
      // Find thumbnail container
      const thumbnail = video.querySelector('ytd-thumbnail');
      if (thumbnail) {
        // Create container for checkbox
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        checkboxContainer.appendChild(checkbox);
        
        // Prevent container clicks from triggering video navigation
        checkboxContainer.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`📦 Container clicked for video: ${videoId}`);
          if (e.target !== checkbox) {
            e.preventDefault();
            // Focus on checkbox for better accessibility
            checkbox.click();
          }
        });
        
        // Add to thumbnail
        thumbnail.appendChild(checkboxContainer);
        addedCount++;
        console.log(`✅ Successfully added checkbox to video ${index + 1}`);
        
      } else {
        console.warn(`⚠️ No thumbnail found for video ${index + 1}, cannot add checkbox`);
      }
    });
    
    console.log(`📊 Checkbox addition summary: ${addedCount} added, ${skippedCount} skipped`);
    
    // Verify checkboxes were added
    const totalCheckboxes = document.querySelectorAll('.bulk-delete-checkbox').length;
    console.log(`🔍 Total checkboxes in DOM after addition: ${totalCheckboxes}`);
    
    if (addedCount > 0) {
      this.showNotification(`✅ ${addedCount}個の動画にチェックボックスを追加しました`);
    }
  }
  
  removeCheckboxesFromVideos() {
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.parentElement.remove();
    });
  }
  
  getVideoElements() {
    const selectors = [
      'ytd-playlist-video-renderer',
      'ytd-playlist-panel-video-renderer'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} videos with selector: ${selector}`);
        return Array.from(elements);
      }
    }
    
    console.log('❌ No video elements found');
    return [];
  }
  
  getVideoId(videoElement) {
    const link = videoElement.querySelector('#video-title, h3 a[href*="/watch"], a[href*="/watch"]');
    if (link && link.href) {
      const match = link.href.match(/[?&]v=([^&]+)/);
      if (match) {
        return match[1];
      }
    }
    
    const dataId = videoElement.getAttribute('data-video-id') || 
                  videoElement.getAttribute('data-ytid');
    if (dataId) {
      return dataId;
    }
    
    return `video-${Date.now()}-${Math.random()}`;
  }
  
  handleCheckboxChange(checkbox) {
    const videoId = checkbox.dataset.videoId;
    
    if (checkbox.checked) {
      this.selectedVideos.add(videoId);
      console.log(`✅ Added video ${videoId} to selection`);
      checkbox.parentElement.style.backgroundColor = 'rgba(204, 0, 0, 0.9)';
    } else {
      this.selectedVideos.delete(videoId);
      console.log(`❌ Removed video ${videoId} from selection`);
      checkbox.parentElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    }
    
    this.updateSelectedCount();
    this.saveState();
  }
  
  updateSelectedCount() {
    const count = this.selectedVideos.size;
    const countElement = document.getElementById('selected-count');
    const deleteButton = document.getElementById('delete-selected');
    
    console.log(`📊 Updating selected count to: ${count}`);
    
    if (countElement) {
      countElement.textContent = count;
    }
    
    if (deleteButton) {
      deleteButton.disabled = count === 0;
      
      if (count === 0) {
        deleteButton.textContent = '動画を選択してください';
      } else {
        deleteButton.textContent = `選択した${count}個の動画を削除`;
      }
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
    
    // DO NOT clear current selection - preserve existing selections
    // this.selectedVideos.clear(); // ← REMOVED to preserve existing selections
    
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
        
        // Update visual style
        const container = checkbox.parentElement;
        if (container && container.classList.contains('checkbox-container')) {
          container.style.backgroundColor = 'rgba(204, 0, 0, 0.9)';
          container.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        }
        
        // Apply visual feedback to parent container
        if (parentContainer) {
          parentContainer.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
          parentContainer.style.border = '2px solid rgba(255, 193, 7, 0.5)';
        }
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: false });
        checkbox.dispatchEvent(changeEvent);
        
      } catch (error) {
        console.error(`❌ Error processing checkbox ${index + 1}:`, error);
      }
    });
    
    console.log('');
    console.log('📊 Selection Results (Visible Videos Only):');
    console.log(`  - Total checkboxes found: ${checkboxes.length}`);
    console.log(`  - Hidden videos skipped: ${hiddenCount}`);
    console.log(`  - Visible videos processed: ${processedCount}`);
    console.log(`  - Newly selected: ${selectedCount}`);
    console.log(`  - Already selected: ${alreadySelected}`);
    console.log(`  - Total in selection set: ${this.selectedVideos.size}`);
    console.log('');
    
    // Force UI update
    this.updateSelectedCount();
    this.saveState();
    
    // Show notification with accurate count
    const visibleSelectedCount = selectedCount + alreadySelected;
    if (selectedCount > 0) {
      this.showNotification(`✅ 表示中の${selectedCount}個の動画を新たに選択しました（合計: ${this.selectedVideos.size}個）`);
    } else if (alreadySelected > 0) {
      this.showNotification(`ℹ️ 表示中のすべての動画（${alreadySelected}個）はすでに選択されています`);
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
          // Uncheck checkbox
          checkbox.checked = false;
          
          // Update visual style
          const container = checkbox.parentElement;
          if (container && container.classList.contains('checkbox-container')) {
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            container.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
          
          // Remove visual feedback from parent container
          if (parentContainer) {
            parentContainer.style.backgroundColor = '';
            parentContainer.style.border = '';
          }
          
          // Remove from selected videos set
          this.selectedVideos.delete(videoId);
          deselectedVideoIds.push(videoId);
          deselectedCount++;
          
          // Trigger change event
          const changeEvent = new Event('change', { bubbles: false });
          checkbox.dispatchEvent(changeEvent);
          
        } else {
          alreadyDeselected++;
          console.log(`ℹ️ Checkbox ${index + 1} was already deselected`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing checkbox ${index + 1}:`, error);
      }
    });
    
    console.log('');
    console.log('📊 Deselection Results (Visible Videos Only):');
    console.log(`  - Total checkboxes found: ${checkboxes.length}`);
    console.log(`  - Hidden videos skipped: ${hiddenCount}`);
    console.log(`  - Visible videos processed: ${processedCount}`);
    console.log(`  - Deselected: ${deselectedCount}`);
    console.log(`  - Already deselected: ${alreadyDeselected}`);
    console.log(`  - Remaining selected videos: ${this.selectedVideos.size}`);
    console.log(`  - Deselected video IDs:`, deselectedVideoIds);
    console.log('');
    
    // Force update UI
    this.updateSelectedCount();
    this.saveState();
    
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
      return this.selectedVideos.has(videoId);
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
    const videos = this.getVideoElements();
    
    if (videos.length === 0) {
      this.showNotification('⚠️ 削除する動画が見つかりません');
      return;
    }
    
    console.log(`📺 Found ${videos.length} videos to delete`);
    
    const confirmed = await this.showConfirmDialog(
      `すべての動画（${videos.length}個）を「後で見る」から削除しますか？\n\n⚠️ この操作は元に戻せません！`
    );
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      this.showNotification('❌ 削除がキャンセルされました');
      return;
    }
    
    this.startDeletion(videos);
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
    });
    
    this.deleteVideosSequentially(videos, 0);
  }
  
  async deleteVideosSequentially(videos, index) {
    if (index >= videos.length || !this.isDeleting) {
      this.completeDeletion();
      return;
    }
    
    const video = videos[index];
    const videoId = this.getVideoId(video);
    
    console.log(`🗑️ Deleting video ${index + 1}/${videos.length}: ${videoId}`);
    
    try {
      await this.deleteVideo(video);
      this.deleteProgress++;
      this.updateProgress();
      
      // Remove from selected videos
      this.selectedVideos.delete(videoId);
      
      // Wait before next deletion to avoid rate limiting
      setTimeout(() => {
        this.deleteVideosSequentially(videos, index + 1);
      }, 1000);
      
    } catch (error) {
      console.error(`❌ Failed to delete video ${index + 1}:`, error);
      
      // Continue with next video
      setTimeout(() => {
        this.deleteVideosSequentially(videos, index + 1);
      }, 1000);
    }
  }
  
  async deleteVideo(videoElement) {
    return new Promise((resolve, reject) => {
      console.log('🔍 Looking for menu button...');
      
      const menuSelectors = [
        'button[aria-label*="操作メニュー"]',
        'button[aria-label*="Action menu"]',
        'ytd-menu-renderer button',
        '[class*="menu-button"]'
      ];
      
      let menuButton = null;
      for (const selector of menuSelectors) {
        menuButton = videoElement.querySelector(selector);
        if (menuButton) {
          console.log(`✅ Found menu button with selector: ${selector}`);
          break;
        }
      }
      
      if (!menuButton) {
        console.error('❌ No menu button found');
        reject(new Error('Menu button not found'));
        return;
      }
      
      // Click menu button
      menuButton.click();
      console.log('👆 Menu button clicked');
      
      // Wait for menu to appear
      setTimeout(() => {
        console.log('🔍 Looking for delete option...');
        
        const deleteSelectors = [
          'ytd-menu-service-item-renderer:contains("再生リストから削除")',
          'ytd-menu-service-item-renderer:contains("Remove from")',
          'yt-formatted-string:contains("再生リストから削除")',
          'yt-formatted-string:contains("Remove from")',
          '[role="menuitem"]:contains("削除")',
          '[role="menuitem"]:contains("Remove")'
        ];
        
        let deleteOption = null;
        
        // Try to find delete option by text content
        const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, [role="menuitem"]');
        
        for (const item of menuItems) {
          const text = item.textContent.toLowerCase();
          if (text.includes('削除') || text.includes('remove') || text.includes('リストから')) {
            deleteOption = item;
            console.log(`✅ Found delete option: ${text}`);
            break;
          }
        }
        
        if (!deleteOption) {
          console.error('❌ Delete option not found');
          console.log('🔍 Available menu items:');
          menuItems.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.textContent}`);
          });
          reject(new Error('Delete option not found'));
          return;
        }
        
        // Click delete option
        deleteOption.click();
        console.log('✅ Delete option clicked');
        
        // Wait for deletion to complete
        setTimeout(() => {
          resolve();
        }, 500);
        
      }, 500);
    });
  }
  
  updateProgress() {
    const percentage = (this.deleteProgress / this.totalToDelete) * 100;
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${this.deleteProgress} / ${this.totalToDelete}`;
    }
    
    console.log(`📊 Progress: ${this.deleteProgress}/${this.totalToDelete} (${percentage.toFixed(1)}%)`);
  }
  
  completeDeletion() {
    console.log('✅ Deletion completed');
    
    this.isDeleting = false;
    
    // Hide progress UI
    document.getElementById('progress-section').style.display = 'none';
    
    // Show controls again
    if (this.isEnabled) {
      document.getElementById('bulk-delete-controls').style.display = 'block';
    }
    
    // Update UI
    this.updateSelectedCount();
    
    // Show completion notification
    this.showNotification(`✅ ${this.deleteProgress}個の動画を削除しました`);
    
    // Save statistics
    this.saveStatistics(this.deleteProgress);
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'DELETE_COMPLETED',
      deletedCount: this.deleteProgress
    });
    
    // Reset progress
    this.deleteProgress = 0;
    this.totalToDelete = 0;
  }
  
  cancelDeletion() {
    console.log('⏹️ Canceling deletion...');
    
    this.isDeleting = false;
    
    // Hide progress UI
    document.getElementById('progress-section').style.display = 'none';
    
    // Show controls again
    if (this.isEnabled) {
      document.getElementById('bulk-delete-controls').style.display = 'block';
    }
    
    this.showNotification(`⏹️ 削除をキャンセルしました（${this.deleteProgress}個削除済み）`);
    
    // Save partial statistics if any videos were deleted
    if (this.deleteProgress > 0) {
      this.saveStatistics(this.deleteProgress);
    }
    
    // Reset progress
    this.deleteProgress = 0;
    this.totalToDelete = 0;
  }
  
  // Enhanced Japanese text processing
  normalizeJapaneseText(text) {
    if (!text) return { original: '', normalized: '', variants: [] };
    
    const original = text.toString().trim();
    
    // Basic normalization
    let normalized = original.toLowerCase();
    
    // Convert fullwidth to halfwidth
    normalized = normalized.replace(/[！-～]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    
    // Convert halfwidth katakana to fullwidth
    normalized = normalized.replace(/[ｦ-ﾟ]/g, function(s) {
      const code = s.charCodeAt(0);
      return String.fromCharCode(code + 0x60);
    });
    
    // Create variants for better matching
    const variants = [original, normalized];
    
    // Convert katakana to hiragana
    const hiragana = normalized.replace(/[ァ-ヶ]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0x60);
    });
    if (hiragana !== normalized) variants.push(hiragana);
    
    // Convert hiragana to katakana
    const katakana = normalized.replace(/[ぁ-ゖ]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) + 0x60);
    });
    if (katakana !== normalized) variants.push(katakana);
    
    // Remove duplicates
    const uniqueVariants = [...new Set(variants)];
    
    return {
      original,
      normalized,
      variants: uniqueVariants
    };
  }
  
  matchesJapaneseText(searchTerm, targetText) {
    if (!searchTerm || !targetText) return false;
    
    const searchNormalized = this.normalizeJapaneseText(searchTerm);
    const targetNormalized = this.normalizeJapaneseText(targetText);
    
    // Try matching with all variants
    for (const searchVariant of searchNormalized.variants) {
      for (const targetVariant of targetNormalized.variants) {
        if (targetVariant.includes(searchVariant)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Number range parsing for playlist filtering
  parseNumberRange(rangeText) {
    if (!rangeText || !rangeText.trim()) {
      return null; // No range specified
    }
    
    const trimmed = rangeText.trim();
    console.log(`📊 Parsing range: "${trimmed}"`);
    
    // Pattern: start-end, start-, -end, or single number
    const patterns = [
      /^(\d+)-(\d+)$/, // "1-50"
      /^(\d+)-$/, // "50-"
      /^-(\d+)$/, // "-100"
      /^(\d+)$/ // "50" (single number)
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = trimmed.match(patterns[i]);
      if (match) {
        switch (i) {
          case 0: // start-end
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            console.log(`📊 Range parsed: ${start}-${end}`);
            return { start, end };
            
          case 1: // start-
            const startOnly = parseInt(match[1]);
            console.log(`📊 Range parsed: ${startOnly}- (to end)`);
            return { start: startOnly, end: Number.MAX_SAFE_INTEGER };
            
          case 2: // -end
            const endOnly = parseInt(match[1]);
            console.log(`📊 Range parsed: -${endOnly} (from start)`);
            return { start: 1, end: endOnly };
            
          case 3: // single number
            const single = parseInt(match[1]);
            console.log(`📊 Range parsed: ${single} (single number)`);
            return { start: single, end: single };
        }
      }
    }
    
    console.warn(`⚠️ Invalid range format: "${trimmed}"`);
    return null;
  }
  
  // Get video index from YouTube's playlist numbering
  getVideoIndex(videoElement) {
    try {
      // Try to find the index number element in YouTube's DOM
      const indexSelectors = [
        '.ytd-playlist-video-renderer .index',
        '.index .style-scope.ytd-playlist-video-renderer',
        '.index-message',
        '.index',
        '[class*="index"]'
      ];
      
      for (const selector of indexSelectors) {
        const indexElement = videoElement.querySelector(selector);
        if (indexElement) {
          const indexText = indexElement.textContent.trim();
          const indexNumber = parseInt(indexText);
          
          if (!isNaN(indexNumber)) {
            console.log(`📊 Found index: ${indexNumber} with selector: ${selector}`);
            return indexNumber;
          }
        }
      }
      
      // Fallback: try to find any element with numeric content that might be the index
      const allElements = videoElement.querySelectorAll('*');
      for (const element of allElements) {
        const text = element.textContent.trim();
        if (/^\d{1,4}$/.test(text)) {
          const num = parseInt(text);
          if (num > 0 && num < 10000) { // Reasonable range for playlist index
            console.log(`📊 Found potential index: ${num} in element: ${element.tagName}`);
            return num;
          }
        }
      }
      
      console.warn('⚠️ No index number found for video element');
      return null;
      
    } catch (error) {
      console.error('❌ Error getting video index:', error);
      return null;
    }
  }
  
  // Combined filtering function
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
              // Get text content or title attribute
              titleText = titleElement.textContent || titleElement.title || titleElement.getAttribute('title') || '';
              titleText = titleText.trim();
              
              if (titleText && titleText.length > 0) {
                console.log(`✅ Video ${index + 1} title found with selector "${selector}": "${titleText}"`);
                break;
              } else {
                console.log(`⚠️ Video ${index + 1} selector "${selector}" found element but no text`);
              }
            }
          }
          
          // Try multiple selectors to find the channel name element
          const channelSelectors = [
            '#channel-name a',
            '#channel-name',
            'ytd-channel-name a',
            'ytd-channel-name',
            'a[href*="/@"]',
            'a[href*="/channel/"]',
            '#metadata #channel-name a',
            '#metadata #channel-name',
            '.ytd-video-meta-block #channel-name a',
            '.ytd-video-meta-block #channel-name',
            'ytd-video-owner-renderer a',
            'ytd-video-owner-renderer #channel-name'
          ];
          
          let channelElement = null;
          let channelText = '';
          
          // Try each selector until we find the channel name
          for (const selector of channelSelectors) {
            channelElement = video.querySelector(selector);
            if (channelElement) {
              // Get text content or title attribute
              channelText = channelElement.textContent || channelElement.title || channelElement.getAttribute('title') || '';
              channelText = channelText.trim();
              
              if (channelText && channelText.length > 0) {
                console.log(`✅ Video ${index + 1} channel found with selector "${selector}": "${channelText}"`);
                break;
              } else {
                console.log(`⚠️ Video ${index + 1} channel selector "${selector}" found element but no text`);
              }
            }
          }
          
          if (!titleText || titleText.length === 0) {
            console.warn(`⚠️ Video ${index + 1}: No title text found with any selector`);
            console.log(`🔍 Video ${index + 1} HTML preview:`, video.outerHTML.substring(0, 200) + '...');
            // Show video by default if we can't get the title
            passesTitleFilter = true;
          } else {
            // Combine title and channel text for searching
            const combinedText = titleText + (channelText ? ' ' + channelText : '');
            console.log(`📝 Video ${index + 1} combined search text: "${combinedText}"`);
            
            // Enhanced Japanese text matching on combined text
            passesTitleFilter = this.matchesJapaneseText(searchTerm, combinedText);
            
            const normalizedTarget = this.normalizeJapaneseText(combinedText);
            console.log(`📝 Video ${index + 1} combined variants:`, normalizedTarget.variants);
            console.log(`🔍 Video ${index + 1} matches "${searchTerm}": ${passesTitleFilter}`);
            
            if (!passesTitleFilter) {
              titleFilteredCount++;
            }
          }
        }
        
        // Show or hide video based on both filters
        if (passesTitleFilter) {
          video.style.display = '';
          shownCount++;
          console.log(`✅ Video ${index + 1}: SHOWN - passes all filters`);
        } else {
          video.style.display = 'none';
          hiddenCount++;
          console.log(`❌ Video ${index + 1}: HIDDEN by title filter`);
        }
        
      } catch (error) {
        console.error(`❌ Error filtering video ${index + 1}:`, error);
        // Show video by default on error
        video.style.display = '';
        errorCount++;
      }
    });
    
    console.log('');
    console.log('📊 Enhanced Filter Results Summary (with Range Support):');
    console.log(`  - Total videos: ${videos.length}`);
    console.log(`  - Shown: ${shownCount}`);
    console.log(`  - Hidden: ${hiddenCount}`);
    console.log(`  - Hidden by range filter: ${rangeFilteredCount}`);
    console.log(`  - Hidden by title filter: ${titleFilteredCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Title search term: "${searchTerm}"`);
    console.log(`  - Range filter: "${rangeText}" -> ${rangeFilter ? `[${rangeFilter.start}-${rangeFilter.end}]` : 'none'}`);
    console.log(`  - Search targets: Title + Channel Name + Index Number`);
    console.log(`  - Japanese normalization: Active`);
    console.log('');
    
    // Show notification to user
    this.showFilterNotification(searchTerm, rangeText, rangeFilter, shownCount, videos.length, rangeFilteredCount, titleFilteredCount);
    
    console.log('✅ === ENHANCED FILTER PROCESS WITH RANGE COMPLETED ===');
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
      
      message = `🔍 ${filterDescription}でフィルタ: ${shownCount}個表示中（全${totalCount}個中）`;
    }
    
    this.showNotification(message);
  }
  
  showNotification(message) {
    // Remove existing notification
    const existingNotification = document.querySelector('.bulk-delete-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'bulk-delete-notification';
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
  
  async showConfirmDialog(message) {
    return new Promise((resolve) => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }
  
  saveState() {
    try {
      const state = {
        isEnabled: this.isEnabled,
        selectedVideos: Array.from(this.selectedVideos)
      };
      localStorage.setItem('bulkDeleteState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  
  restoreState() {
    try {
      const saved = localStorage.getItem('bulkDeleteState');
      if (saved) {
        const state = JSON.parse(saved);
        this.selectedVideos = new Set(state.selectedVideos || []);
        
        // Don't automatically restore enabled state - let user decide
        console.log(`🔄 Restored state: ${this.selectedVideos.size} selected videos`);
      }
    } catch (error) {
      console.error('Error restoring state:', error);
    }
  }
  
  saveStatistics(deletedCount) {
    try {
      const stats = JSON.parse(localStorage.getItem('bulkDeleteStats') || '{}');
      const today = new Date().toDateString();
      
      if (!stats[today]) {
        stats[today] = 0;
      }
      
      stats[today] += deletedCount;
      stats.total = (stats.total || 0) + deletedCount;
      
      localStorage.setItem('bulkDeleteStats', JSON.stringify(stats));
      console.log(`📊 Statistics updated: ${deletedCount} deleted today, ${stats.total} total`);
    } catch (error) {
      console.error('Error saving statistics:', error);
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
        console.warn('Unknown message type:', request.type);
        sendResponse({ error: 'Unknown message type' });
    }
  }
  
  // Debug function to analyze delete process
  debugDeleteProcess() {
    console.log('');
    console.log('🔎 ========================================');
    console.log('🔎 === DEBUG: DELETE PROCESS ANALYSIS ===');
    console.log('🔎 ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    console.log(`📺 Found ${videos.length} video elements`);
    
    if (videos.length === 0) {
      console.log('❌ No videos found for analysis');
      return;
    }
    
    // Analyze first few videos
    const analyzeCount = Math.min(3, videos.length);
    console.log(`🔍 Analyzing first ${analyzeCount} videos...`);
    
    for (let i = 0; i < analyzeCount; i++) {
      const video = videos[i];
      console.log(`\n📺 Video ${i + 1} Analysis:`);
      
      // Video ID
      const videoId = this.getVideoId(video);
      console.log(`  - Video ID: ${videoId}`);
      
      // Check for menu button
      const menuSelectors = [
        'button[aria-label*="操作メニュー"]',
        'button[aria-label*="Action menu"]',
        'ytd-menu-renderer button',
        '[class*="menu-button"]',
        'button[aria-label*="More actions"]',
        'yt-icon-button[aria-label*="操作"]',
        'yt-icon-button[aria-label*="Action"]'
      ];
      
      let foundMenuButton = false;
      for (const selector of menuSelectors) {
        const menuButton = video.querySelector(selector);
        if (menuButton) {
          console.log(`  ✅ Menu button found: ${selector}`);
          console.log(`  - Button text: "${menuButton.textContent.trim()}"`);
          console.log(`  - Button aria-label: "${menuButton.getAttribute('aria-label') || 'none'}"`);
          foundMenuButton = true;
          break;
        }
      }
      
      if (!foundMenuButton) {
        console.log('  ❌ No menu button found');
        // List all buttons in the video element
        const allButtons = video.querySelectorAll('button');
        console.log(`  🔍 All buttons found: ${allButtons.length}`);
        allButtons.forEach((btn, btnIndex) => {
          console.log(`    ${btnIndex + 1}. "${btn.textContent.trim()}" [${btn.getAttribute('aria-label') || 'no aria-label'}]`);
        });
      }
      
      // Check video element structure
      console.log(`  - Element classes: ${video.className}`);
      console.log(`  - Element children: ${video.children.length}`);
      
      // Look for title and other identifying info
      const titleElement = video.querySelector('#video-title, h3 a, a[href*="/watch"]');
      if (titleElement) {
        const title = titleElement.textContent || titleElement.title || 'No title';
        console.log(`  - Video title: "${title.substring(0, 50)}..."`);
      }
    }
    
    console.log('');
    console.log('🔎 Debug analysis completed. Check the console output above.');
    console.log('🔎 ========================================');
  }
  
  // Test actual deletion process on one video
  async testActualDelete() {
    console.log('');
    console.log('🧪 ========================================');
    console.log('🧪 === TEST: ACTUAL DELETE PROCESS ===');
    console.log('🧪 ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      console.log('❌ No videos available for delete test');
      return;
    }
    
    const testVideo = videos[0]; // Test with first video
    const videoId = this.getVideoId(testVideo);
    
    console.log(`🧪 Testing delete process on video: ${videoId}`);
    console.log('⚠️ WARNING: This will attempt to actually delete a video!');
    
    try {
      await this.deleteVideo(testVideo);
      console.log('✅ Delete test completed successfully');
    } catch (error) {
      console.error('❌ Delete test failed:', error);
    }
    
    console.log('🧪 ========================================');
  }
  
  // Simple delete test - just analyze, don't actually delete
  simpleDeleteTest() {
    console.log('');
    console.log('⚙️ ========================================');
    console.log('⚙️ === SIMPLE DELETE TEST (ANALYSIS ONLY) ===');
    console.log('⚙️ ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      console.log('❌ No videos available for test');
      return;
    }
    
    const testVideo = videos[0];
    const videoId = this.getVideoId(testVideo);
    
    console.log(`⚙️ Testing delete elements on video: ${videoId}`);
    
    // Step 1: Look for menu button
    console.log('\n🔍 Step 1: Looking for menu button...');
    const menuSelectors = [
      'button[aria-label*="操作メニュー"]',
      'button[aria-label*="Action menu"]',
      'ytd-menu-renderer button',
      '[class*="menu-button"]'
    ];
    
    let menuButton = null;
    for (const selector of menuSelectors) {
      menuButton = testVideo.querySelector(selector);
      if (menuButton) {
        console.log(`✅ Found menu button: ${selector}`);
        console.log(`   - aria-label: "${menuButton.getAttribute('aria-label')}"`);
        break;
      }
    }
    
    if (!menuButton) {
      console.log('❌ No menu button found');
      return;
    }
    
    // Step 2: Simulate menu click (but don't actually click)
    console.log('\n👆 Step 2: Would click menu button (simulated)');
    console.log('   - This would open the context menu');
    
    // Step 3: Check what menu items might be available
    console.log('\n🔍 Step 3: Looking for existing menu items...');
    const existingMenuItems = document.querySelectorAll('ytd-menu-service-item-renderer, [role="menuitem"]');
    
    if (existingMenuItems.length > 0) {
      console.log(`✅ Found ${existingMenuItems.length} menu items:`);
      existingMenuItems.forEach((item, index) => {
        const text = item.textContent.trim();
        console.log(`   ${index + 1}. "${text}"`);
        if (text.includes('削除') || text.includes('remove') || text.includes('リスト')) {
          console.log('      ⭐ This might be the delete option!');
        }
      });
    } else {
      console.log('ℹ️ No menu items currently visible (menu needs to be opened first)');
    }
    
    console.log('');
    console.log('⚙️ Simple test completed. This was analysis only - no actual deletion attempted.');
    console.log('⚙️ ========================================');
  }
}

// Initialize the extension when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.bulkDeleteExtension = new WatchLaterBulkDelete();
  });
} else {
  window.bulkDeleteExtension = new WatchLaterBulkDelete();
}

// Export for debugging
window.debugBulkDelete = {
  testSelectAll: () => {
    console.log('🧪 === DEBUG: TESTING SELECT ALL ===');
    if (window.bulkDeleteExtension) {
      window.bulkDeleteExtension.selectAllVideos();
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  testToggleMode: () => {
    console.log('🧪 === DEBUG: TESTING TOGGLE MODE ===');
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