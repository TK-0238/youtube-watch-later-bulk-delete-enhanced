// YouTube Watch Later Bulk Delete - Content Script (Enhanced)
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
            placeholder="🔍 タイトルで絞り込み..."
            oninput="window.bulkDeleteExtension?.filterVideos?.(this.value); console.log('🔍 Filter oninput fired:', this.value);"
          >
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
      if (e.target.id === 'title-filter') {
        console.log('🔍 Filter input changed:', e.target.value);
        this.filterVideos(e.target.value);
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
    
    // Filter input
    const filterInput = document.getElementById('title-filter');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        console.log('🔍 Direct filter input changed:', e.target.value);
        this.filterVideos(e.target.value);
      });
      console.log('✅ Direct listener added for title-filter');
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
      `${selectedCount}個の動画を削除しますか？\\n\\nこの操作は元に戻せません。`
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
      `すべての動画（${videos.length}個）を「後で見る」から削除しますか？\\n\\n⚠️ この操作は元に戻せません！`
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
      
      const success = await this.deleteVideo(video);
      
      if (success) {
        this.deleteProgress++;
        console.log(`✅ Successfully deleted video ${i + 1}`);
      } else {
        console.log(`❌ Failed to delete video ${i + 1}`);
      }
      
      this.updateProgress();
      await this.delay(1500); // Wait between deletions
    }
    
    if (this.isDeleting) {
      this.completeDeletion();
    }
  }
  
  async deleteVideo(videoElement) {
    try {
      console.log('🗑️ === STARTING ROBUST DELETE PROCESS ===');
      console.log('📺 Video element:', videoElement);
      
      // Get video title for debugging
      const titleElement = videoElement.querySelector('#video-title, h3 a, a[href*="/watch"]');
      const videoTitle = titleElement ? titleElement.textContent.trim() : 'Unknown';
      console.log(`📺 Deleting video: "${videoTitle}"`);
      
      // Step 1: Find menu button with enhanced detection
      const menuButtonSelectors = [
        'button[aria-label*="その他"]',
        'button[aria-label*="More"]', 
        'button[aria-label*="アクション"]',
        'button[aria-label*="Action"]',
        'ytd-menu-renderer button',
        'yt-icon-button[aria-label*="その他"]',
        'yt-icon-button[aria-label*="More"]',
        '[role="button"][aria-label*="その他"]',
        '[role="button"][aria-label*="More"]'
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
        console.error('❌ Menu button not found with any selector');
        console.log('🔍 Available buttons in video element:');
        const allButtons = videoElement.querySelectorAll('button');
        allButtons.forEach((btn, i) => {
          console.log(`  ${i + 1}. ${btn.outerHTML.substring(0, 100)}...`);
        });
        return false;
      }
      
      // Step 2: Click menu button with enhanced reliability
      console.log('🖱️ Clicking menu button...');
      
      // Ensure element is visible and scrolled into view
      menuButton.scrollIntoView({ behavior: 'instant', block: 'center' });
      await this.delay(500);
      
      // Try multiple click methods
      try {
        menuButton.focus();
        await this.delay(100);
        menuButton.click();
        console.log('✅ Menu button clicked successfully');
      } catch (e) {
        console.log('⚠️ Standard click failed, trying dispatchEvent');
        menuButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      
      // Wait for menu to appear with verification
      console.log('⏳ Waiting for menu to appear...');
      let menuAppeared = false;
      for (let i = 0; i < 20; i++) {
        const menuElements = document.querySelectorAll('ytd-menu-service-item-renderer, [role="menuitem"], tp-yt-paper-item');
        if (menuElements.length > 0) {
          console.log(`✅ Menu appeared with ${menuElements.length} items (after ${i * 100}ms)`);
          menuAppeared = true;
          break;
        }
        await this.delay(100);
      }
      
      if (!menuAppeared) {
        console.error('❌ Menu did not appear after clicking');
        return false;
      }
      
      // Step 3: Enhanced menu item detection and deletion
      let deleteClicked = false;
      
      for (let attempt = 0; attempt < 10; attempt++) {
        console.log(`🔍 Attempt ${attempt + 1} to find delete option...`);
        
        // Try multiple menu item selectors
        const menuItemSelectors = [
          'ytd-menu-service-item-renderer',
          '[role="menuitem"]',
          'tp-yt-paper-item',
          'ytd-menu-navigation-item-renderer',
          '.ytd-menu-service-item-renderer'
        ];
        
        let menuItems = [];
        for (const selector of menuItemSelectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            menuItems = Array.from(items);
            console.log(`✅ Found ${items.length} menu items with selector: ${selector}`);
            break;
          }
        }
        
        if (menuItems.length === 0) {
          console.log('⚠️ No menu items found, waiting...');
          await this.delay(200);
          continue;
        }
        
        // Enhanced text pattern matching for delete options
        const deletePatterns = [
          '後で見るから削除',
          'remove from watch later',
          'リストから削除', 
          'remove from list',
          '削除',
          'remove',
          'delete',
          '「後で見る」から削除',
          'watch later から削除'
        ];
        
        for (const item of menuItems) {
          const fullText = item.textContent;
          const lowerText = fullText.toLowerCase();
          
          console.log(`📝 Menu item text: "${fullText}"`);
          
          // Check if any delete pattern matches
          const matchedPattern = deletePatterns.find(pattern => 
            lowerText.includes(pattern.toLowerCase())
          );
          
          if (matchedPattern) {
            console.log(`✅ Found delete option with pattern "${matchedPattern}": "${fullText}"`);
            
            // Enhanced clicking with multiple methods
            try {
              item.scrollIntoView({ behavior: 'instant', block: 'center' });
              await this.delay(200);
              
              // Try focusing first
              if (item.focus) item.focus();
              await this.delay(100);
              
              // Try standard click
              item.click();
              console.log('✅ Delete option clicked successfully');
              deleteClicked = true;
              break;
              
            } catch (clickError) {
              console.log('⚠️ Standard click failed, trying dispatchEvent');
              try {
                item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                deleteClicked = true;
                break;
              } catch (e) {
                console.error('❌ All click methods failed:', e);
              }
            }
          }
        }
        
        if (deleteClicked) break;
        await this.delay(300);
      }
      
      if (!deleteClicked) {
        console.error('❌ Could not find or click delete option');
        console.log('🔍 Available menu items were:');
        const allMenuItems = document.querySelectorAll('ytd-menu-service-item-renderer, [role="menuitem"], tp-yt-paper-item');
        allMenuItems.forEach((item, i) => {
          console.log(`  ${i + 1}. "${item.textContent}"`);
        });
        
        // Close menu
        document.body.click();
        await this.delay(300);
        return false;
      }
      
      // Step 4: Enhanced confirmation dialog handling
      console.log('⏳ Waiting for potential confirmation dialog...');
      await this.delay(800);
      
      let confirmationHandled = false;
      for (let i = 0; i < 20; i++) {
        // Look for confirmation buttons with enhanced selectors
        const confirmSelectors = [
          'button[aria-label*="削除"]',
          'button[aria-label*="Delete"]',
          'button[aria-label*="確認"]', 
          'button[aria-label*="Confirm"]',
          'button[aria-label*="OK"]',
          'button[aria-label*="はい"]',
          'button[aria-label*="Yes"]',
          '[role="button"][aria-label*="削除"]',
          'ytd-button-renderer button[aria-label*="削除"]',
          'tp-yt-paper-button[aria-label*="削除"]'
        ];
        
        let confirmBtn = null;
        for (const selector of confirmSelectors) {
          confirmBtn = document.querySelector(selector);
          if (confirmBtn) {
            console.log(`✅ Found confirmation button with selector: ${selector}`);
            break;
          }
        }
        
        if (confirmBtn) {
          console.log('🖱️ Clicking confirmation button...');
          try {
            confirmBtn.focus();
            await this.delay(100);
            confirmBtn.click();
            console.log('✅ Confirmation button clicked');
            confirmationHandled = true;
            break;
          } catch (e) {
            console.log('⚠️ Trying dispatchEvent for confirmation');
            confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            confirmationHandled = true;
            break;
          }
        }
        
        await this.delay(100);
      }
      
      if (!confirmationHandled) {
        console.log('ℹ️ No confirmation dialog found (this may be normal)');
      }
      
      // Final wait and verification
      await this.delay(1000);
      
      console.log('✅ === DELETE PROCESS COMPLETED ===');
      return true;
      
    } catch (error) {
      console.error('❌ === DELETE PROCESS FAILED ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      return false;
    }
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
    
    // Notify background script of progress
    chrome.runtime.sendMessage({
      type: 'DELETE_PROGRESS',
      current: this.deleteProgress,
      total: this.totalToDelete
    }).catch(error => {
      console.warn('⚠️ Could not notify background script of progress:', error);
    });
  }
  
  completeDeletion() {
    console.log('🏁 Completing deletion process...');
    this.isDeleting = false;
    
    // Hide progress UI
    const progressSection = document.getElementById('progress-section');
    const controlsSection = document.getElementById('bulk-delete-controls');
    
    if (progressSection) {
      progressSection.style.display = 'none';
    }
    
    if (controlsSection) {
      controlsSection.style.display = 'block';
    }
    
    // CRITICAL: Clear selected videos and reset UI
    console.log(`📊 Before reset - selected videos: ${this.selectedVideos.size}`);
    this.selectedVideos.clear();
    console.log(`📊 After reset - selected videos: ${this.selectedVideos.size}`);
    
    // Reset all checkboxes to unchecked
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`📊 Found ${checkboxes.length} checkboxes to reset`);
    
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = false;
      if (checkbox.parentElement) {
        checkbox.parentElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      }
      console.log(`📊 Reset checkbox ${index + 1}`);
    });
    
    // Force update the selection count display
    this.updateSelectedCount();
    
    // Record completion count for background script
    const completedCount = this.deleteProgress;
    
    // Notify background script of completion
    if (completedCount > 0) {
      console.log(`📨 Notifying background script: ${completedCount} videos deleted`);
      chrome.runtime.sendMessage({
        type: 'DELETE_COMPLETED',
        count: completedCount
      }).catch(error => {
        console.warn('⚠️ Could not notify background script:', error);
      });
    }
    
    // Show completion message
    if (completedCount > 0) {
      this.showNotification(`✅ ${completedCount}個の動画を削除しました！選択がリセットされました。`);
    } else {
      this.showNotification(`❌ 動画の削除に失敗しました`);
    }
    
    console.log(`✅ Deletion completed. Final selected count: ${this.selectedVideos.size}`);
    
    // Save state
    this.saveState();
  }
  
  cancelDeletion() {
    this.isDeleting = false;
    
    // Hide progress UI
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('bulk-delete-controls').style.display = 'block';
    
    // Notify background script of cancellation
    const deletedCount = this.deleteProgress;
    console.log(`📨 Notifying background script: Deletion cancelled, ${deletedCount} videos deleted`);
    chrome.runtime.sendMessage({
      type: 'DELETE_CANCELLED',
      deletedCount: deletedCount
    }).catch(error => {
      console.warn('⚠️ Could not notify background script of cancellation:', error);
    });
    
    // Show cancellation message
    this.showNotification(
      `❌ 削除が中止されました（${deletedCount}個の動画を削除済み）`
    );
  }
  
  // Enhanced Japanese text normalization function
  normalizeJapaneseText(text) {
    if (!text) return '';
    
    let normalized = text.toString();
    
    // Unicode normalization (NFD -> NFC)
    if (normalized.normalize) {
      normalized = normalized.normalize('NFKC');
    }
    
    // Convert full-width to half-width for ASCII characters
    normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(match) {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
    
    // Convert half-width katakana to full-width katakana
    const halfToFullKatakana = {
      'ｱ': 'ア', 'ｶ': 'カ', 'ｻ': 'サ', 'ﾀ': 'タ', 'ﾅ': 'ナ', 'ﾊ': 'ハ',
      'ﾏ': 'マ', 'ﾔ': 'ヤ', 'ﾗ': 'ラ', 'ﾜ': 'ワ', 'ｨ': 'ィ', 'ｩ': 'ゥ',
      'ｪ': 'ェ', 'ｫ': 'ォ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ', 'ｯ': 'ッ',
      'ｰ': 'ー', 'ｲ': 'イ', 'ｷ': 'キ', 'ｼ': 'シ', 'ﾁ': 'チ', 'ﾆ': 'ニ',
      'ﾋ': 'ヒ', 'ﾐ': 'ミ', 'ﾘ': 'リ', 'ｳ': 'ウ', 'ｸ': 'ク', 'ｽ': 'ス',
      'ﾂ': 'ツ', 'ﾇ': 'ヌ', 'ﾌ': 'フ', 'ﾑ': 'ム', 'ﾕ': 'ユ', 'ﾙ': 'ル',
      'ｴ': 'エ', 'ｹ': 'ケ', 'ｾ': 'セ', 'ﾃ': 'テ', 'ﾈ': 'ネ', 'ﾍ': 'ヘ',
      'ﾒ': 'メ', 'ﾚ': 'レ', 'ｵ': 'オ', 'ｺ': 'コ', 'ｿ': 'ソ', 'ﾄ': 'ト',
      'ﾉ': 'ノ', 'ﾎ': 'ホ', 'ﾓ': 'モ', 'ﾖ': 'ヨ', 'ﾛ': 'ロ', 'ﾝ': 'ン'
    };
    
    // Apply half-width to full-width katakana conversion
    for (const [half, full] of Object.entries(halfToFullKatakana)) {
      normalized = normalized.replace(new RegExp(half, 'g'), full);
    }
    
    // Handle voiced marks for half-width katakana
    normalized = normalized.replace(/ｶﾞ/g, 'ガ').replace(/ｷﾞ/g, 'ギ').replace(/ｸﾞ/g, 'グ')
                        .replace(/ｹﾞ/g, 'ゲ').replace(/ｺﾞ/g, 'ゴ').replace(/ｻﾞ/g, 'ザ')
                        .replace(/ｼﾞ/g, 'ジ').replace(/ｽﾞ/g, 'ズ').replace(/ｾﾞ/g, 'ゼ')
                        .replace(/ｿﾞ/g, 'ゾ').replace(/ﾀﾞ/g, 'ダ').replace(/ﾁﾞ/g, 'ヂ')
                        .replace(/ﾂﾞ/g, 'ヅ').replace(/ﾃﾞ/g, 'デ').replace(/ﾄﾞ/g, 'ド')
                        .replace(/ﾊﾞ/g, 'バ').replace(/ﾋﾞ/g, 'ビ').replace(/ﾌﾞ/g, 'ブ')
                        .replace(/ﾍﾞ/g, 'ベ').replace(/ﾎﾞ/g, 'ボ').replace(/ﾊﾟ/g, 'パ')
                        .replace(/ﾋﾟ/g, 'ピ').replace(/ﾌﾟ/g, 'プ').replace(/ﾍﾟ/g, 'ペ')
                        .replace(/ﾎﾟ/g, 'ポ');
    
    // Create variants for better matching
    const variants = [];
    
    // Add original normalized version
    const baseNormalized = normalized.toLowerCase().trim();
    variants.push(baseNormalized);
    
    // Convert katakana to hiragana variant
    const katakanaToHiragana = baseNormalized.replace(/[\u30A1-\u30F6]/g, function(match) {
      const code = match.charCodeAt(0);
      return String.fromCharCode(code - 0x60);
    });
    if (katakanaToHiragana !== baseNormalized) {
      variants.push(katakanaToHiragana);
    }
    
    // Convert hiragana to katakana variant  
    const hiraganaToKatakana = baseNormalized.replace(/[\u3041-\u3096]/g, function(match) {
      const code = match.charCodeAt(0);
      return String.fromCharCode(code + 0x60);
    });
    if (hiraganaToKatakana !== baseNormalized) {
      variants.push(hiraganaToKatakana);
    }
    
    return {
      original: baseNormalized,
      variants: variants
    };
  }

  // Enhanced matching function with Japanese support
  matchesJapaneseText(searchText, targetText) {
    const normalizedSearch = this.normalizeJapaneseText(searchText);
    const normalizedTarget = this.normalizeJapaneseText(targetText);
    
    // Check if any search variant matches any target variant
    for (const searchVariant of normalizedSearch.variants) {
      if (!searchVariant) continue;
      
      for (const targetVariant of normalizedTarget.variants) {
        if (!targetVariant) continue;
        
        if (targetVariant.includes(searchVariant)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  filterVideos(searchTerm) {
    console.log('');
    console.log('🔍 ========================================');
    console.log('🔍 === FILTERING VIDEOS (ENHANCED) ===');
    console.log('🔍 ========================================');
    console.log('');
    
    console.log(`🔍 Search term: "${searchTerm}"`);
    
    const videos = this.getVideoElements();
    console.log(`📺 Found ${videos.length} video elements to filter`);
    
    if (videos.length === 0) {
      console.warn('⚠️ No videos found to filter');
      return;
    }
    
    // Enhanced normalization for search term
    const normalizedSearch = this.normalizeJapaneseText(searchTerm);
    console.log(`🔍 Normalized search variants:`, normalizedSearch.variants);
    
    // If search term is empty, show all videos
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('📺 Empty search term, showing all videos');
      videos.forEach((video, index) => {
        video.style.display = '';
        console.log(`✅ Video ${index + 1}: shown (empty search)`);
      });
      console.log('✅ Filter completed - all videos shown');
      return;
    }
    
    let shownCount = 0;
    let hiddenCount = 0;
    let errorCount = 0;
    
    videos.forEach((video, index) => {
      try {
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
        
        if (!titleText || titleText.length === 0) {
          console.warn(`⚠️ Video ${index + 1}: No title text found with any selector`);
          console.log(`🔍 Video ${index + 1} HTML preview:`, video.outerHTML.substring(0, 200) + '...');
          // Show video by default if we can't get the title
          video.style.display = '';
          shownCount++;
          return;
        }
        
        // Enhanced Japanese text matching
        const matches = this.matchesJapaneseText(searchTerm, titleText);
        
        const normalizedTarget = this.normalizeJapaneseText(titleText);
        console.log(`📝 Video ${index + 1} title variants:`, normalizedTarget.variants);
        console.log(`🔍 Video ${index + 1} matches "${searchTerm}": ${matches}`);
        
        // Show or hide video based on match
        if (matches) {
          video.style.display = '';
          shownCount++;
          console.log(`✅ Video ${index + 1}: SHOWN - "${titleText}"`);
        } else {
          video.style.display = 'none';
          hiddenCount++;
          console.log(`❌ Video ${index + 1}: HIDDEN - "${titleText}"`);
        }
        
      } catch (error) {
        console.error(`❌ Error filtering video ${index + 1}:`, error);
        // Show video by default on error
        video.style.display = '';
        errorCount++;
      }
    });
    
    console.log('');
    console.log('📊 Enhanced Filter Results Summary:');
    console.log(`  - Total videos: ${videos.length}`);
    console.log(`  - Shown: ${shownCount}`);
    console.log(`  - Hidden: ${hiddenCount}`);  
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Search term: "${searchTerm}"`);
    console.log(`  - Japanese normalization: Active`);
    console.log('');
    
    // Show notification to user
    if (!searchTerm || searchTerm.trim() === '') {
      this.showNotification(`📺 すべての動画を表示しています（${videos.length}個）`);
    } else if (shownCount === 0) {
      this.showNotification(`🔍 「${searchTerm}」に一致する動画が見つかりません（漢字・ひらがな・カタカナ対応）`);
    } else {
      this.showNotification(`🔍 「${searchTerm}」で${shownCount}個の動画が見つかりました（漢字・ひらがな・カタカナ対応）`);
    }
    
    // フィルター後にチェックボックスの表示を確保
    if (this.isEnabled) {
      console.log('🔧 Ensuring checkboxes are visible for filtered videos...');
      this.ensureCheckboxesForVisibleVideos();
    }
    
    console.log('✅ === ENHANCED FILTER PROCESS COMPLETED ===');
  }
  
  ensureCheckboxesForVisibleVideos() {
    console.log('');
    console.log('🔧 ========================================');
    console.log('🔧 === ENSURING CHECKBOXES FOR VISIBLE VIDEOS ===');
    console.log('🔧 ========================================');
    console.log('');
    
    const videos = this.getVideoElements();
    let processedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;
    
    videos.forEach((video, index) => {
      try {
        // 動画が表示されているかチェック
        const isVisible = video.style.display !== 'none';
        
        if (!isVisible) {
          console.log(`⏭️ Video ${index + 1}: Hidden, skipping checkbox check`);
          return;
        }
        
        processedCount++;
        
        // 既にチェックボックスが存在するかチェック
        const existingCheckbox = video.querySelector('.bulk-delete-checkbox');
        
        if (existingCheckbox) {
          console.log(`✅ Video ${index + 1}: Checkbox already exists`);
          skippedCount++;
          return;
        }
        
        // チェックボックスが存在しない場合は追加
        console.log(`🔧 Video ${index + 1}: Adding missing checkbox...`);
        
        const videoId = this.getVideoId(video);
        
        // Create checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'bulk-delete-checkbox';
        checkbox.setAttribute('data-video-id', videoId);
        
        // Check if this video was previously selected
        if (this.selectedVideos.has(videoId)) {
          checkbox.checked = true;
          console.log(`✅ Video ${index + 1}: Restoring previous selection state`);
        }
        
        // Add event listeners
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`👆 Checkbox clicked: ${videoId}`);
        });
        
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          console.log(`☑️ Checkbox changed: ${e.target.checked} for video ${e.target.dataset.videoId}`);
          this.handleCheckboxChange(e.target);
        });
        
        checkboxContainer.appendChild(checkbox);
        
        // Prevent container clicks from triggering video navigation
        checkboxContainer.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`📦 Container clicked for video: ${videoId}`);
          if (e.target !== checkbox) {
            e.preventDefault();
            checkbox.click();
          }
        });
        
        // Find the best insertion point
        const insertionPoints = [
          video.querySelector('ytd-thumbnail'),
          video.querySelector('.ytd-thumbnail'),
          video.querySelector('#thumbnail'),
          video.querySelector('img'),
          video.firstElementChild
        ];
        
        let inserted = false;
        for (const insertionPoint of insertionPoints) {
          if (insertionPoint) {
            insertionPoint.style.position = 'relative';
            insertionPoint.appendChild(checkboxContainer);
            inserted = true;
            console.log(`✅ Video ${index + 1}: Checkbox added successfully`);
            addedCount++;
            break;
          }
        }
        
        if (!inserted) {
          console.warn(`⚠️ Video ${index + 1}: Could not find insertion point for checkbox`);
        }
        
      } catch (error) {
        console.error(`❌ Video ${index + 1}: Error ensuring checkbox`, error);
      }
    });
    
    console.log('');
    console.log('📊 Checkbox Ensure Results:');
    console.log(`  - Total videos: ${videos.length}`);
    console.log(`  - Visible videos processed: ${processedCount}`);
    console.log(`  - Checkboxes added: ${addedCount}`);
    console.log(`  - Checkboxes already existed: ${skippedCount}`);
    console.log('');
    
    // Update delete button state
    this.updateSelectedCount();
    
    console.log('✅ === CHECKBOX ENSURE PROCESS COMPLETED ===');
  }
  
  showConfirmDialog(message) {
    return new Promise((resolve) => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }
  
  showNotification(message, duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.bulk-delete-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create a new notification
    const notification = document.createElement('div');
    notification.className = 'bulk-delete-notification';
    notification.innerHTML = message;
    
    // Add appropriate styling based on message type
    if (message.includes('✅')) {
      notification.style.borderLeft = '4px solid #4caf50';
      notification.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    } else if (message.includes('❌')) {
      notification.style.borderLeft = '4px solid #f44336';
      notification.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
    } else if (message.includes('⚠️')) {
      notification.style.borderLeft = '4px solid #ff9800';
      notification.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  saveState() {
    try {
      chrome.storage.local.set({
        isEnabled: this.isEnabled,
        selectedVideos: Array.from(this.selectedVideos)
      });
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  
  async restoreState() {
    try {
      const result = await chrome.storage.local.get(['isEnabled', 'selectedVideos']);
      
      if (result.isEnabled) {
        this.isEnabled = true;
        this.toggleBulkDeleteMode();
      }
      
      if (result.selectedVideos) {
        this.selectedVideos = new Set(result.selectedVideos);
        this.updateSelectedCount();
      }
    } catch (error) {
      console.error('Error restoring state:', error);
    }
  }
  
  handleMessage(request, sender, sendResponse) {
    console.log('📨 Content script received message:', request.type);
    
    switch (request.type) {
      case 'GET_STATUS':
        const videoElements = this.getVideoElements();
        const status = {
          isEnabled: this.isEnabled,
          selectedCount: this.selectedVideos.size,
          totalVideos: videoElements.length,
          isDeleting: this.isDeleting,
          pageLoaded: document.readyState === 'complete',
          uiExists: !!document.getElementById('bulk-delete-ui')
        };
        console.log('📊 Sending status:', status);
        sendResponse(status);
        break;
        
      case 'TOGGLE_MODE':
        console.log('🔄 Toggling bulk delete mode');
        this.toggleBulkDeleteMode();
        sendResponse({ success: true });
        break;
        
      default:
        console.log('❓ Unknown message type:', request.type);
        sendResponse({ error: 'Unknown message type' });
    }
  }
}

// Initialize the extension when the page loads
console.log('');
console.log('🌟 ========================================');
console.log('🌟 === YOUTUBE BULK DELETE CONTENT SCRIPT LOADED ===');
console.log('🌟 ========================================');
console.log('');

console.log('🔍 Page information:');
console.log(`  - URL: ${window.location.href}`);
console.log(`  - Document ready state: ${document.readyState}`);
console.log(`  - Is Watch Later page: ${window.location.href.includes('youtube.com/playlist?list=WL')}`);

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
    console.log('🔄 URL changed, checking if re-initialization needed...');
    console.log(`  - New URL: ${url}`);
    
    if (url.includes('youtube.com/playlist?list=WL')) {
      console.log('✅ Navigated to Watch Later page, re-initializing...');
      
      // Small delay to let YouTube update the DOM
      setTimeout(() => {
        if (window.bulkDeleteExtension) {
          console.log('🔄 Re-creating UI for new page...');
          window.bulkDeleteExtension.createUI();
          window.bulkDeleteExtension.setupEventListeners();
        }
      }, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });