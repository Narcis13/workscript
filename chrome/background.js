// Background service worker for the Chrome extension

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Web Page Analyzer extension installed');
    
    if (details.reason === 'install') {
        // First time installation
        chrome.storage.sync.set({
            analysisHistory: [],
            settings: {
                autoAnalyze: false,
                saveHistory: true,
                showNotifications: true
            }
        });
    }
    
    // Create context menu
    chrome.contextMenus.create({
        id: 'analyze-page',
        title: 'Analyze this page',
        contexts: ['page']
    });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeCurrentTab') {
        analyzeCurrentTab(sendResponse);
        return true; // Indicates async response
    }
    
    if (request.action === 'saveAnalysis') {
        saveAnalysisToHistory(request.data, sendResponse);
        return true;
    }
    
    if (request.action === 'getHistory') {
        getAnalysisHistory(sendResponse);
        return true;
    }
});

async function analyzeCurrentTab(sendResponse) {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab) {
            sendResponse({ error: 'No active tab found' });
            return;
        }

        // Check if we can access the tab
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            sendResponse({ error: 'Cannot analyze Chrome internal pages' });
            return;
        }

        // Execute content script to get page data
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: analyzePage
        });

        if (results && results[0] && results[0].result) {
            const analysis = {
                ...results[0].result,
                url: tab.url,
                tabId: tab.id,
                timestamp: new Date().toISOString()
            };

            sendResponse({ success: true, data: analysis });
            
            // Optionally save to history
            const settings = await chrome.storage.sync.get('settings');
            if (settings.settings?.saveHistory !== false) {
                saveAnalysisToHistory(analysis);
            }
        } else {
            sendResponse({ error: 'Failed to analyze page' });
        }

    } catch (error) {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message });
    }
}

async function saveAnalysisToHistory(analysisData, sendResponse = null) {
    try {
        const result = await chrome.storage.sync.get('analysisHistory');
        let history = result.analysisHistory || [];
        
        // Add new analysis to beginning of history
        history.unshift({
            id: Date.now(),
            ...analysisData
        });
        
        // Keep only last 50 analyses
        history = history.slice(0, 50);
        
        await chrome.storage.sync.set({ analysisHistory: history });
        
        if (sendResponse) {
            sendResponse({ success: true, historyCount: history.length });
        }
    } catch (error) {
        console.error('Error saving to history:', error);
        if (sendResponse) {
            sendResponse({ error: error.message });
        }
    }
}

async function getAnalysisHistory(sendResponse) {
    try {
        const result = await chrome.storage.sync.get('analysisHistory');
        sendResponse({ 
            success: true, 
            history: result.analysisHistory || [] 
        });
    } catch (error) {
        sendResponse({ error: error.message });
    }
}

// Context menu click handler

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'analyze-page') {
        // Trigger analysis and show notification
        analyzeCurrentTab((result) => {
            if (result.success) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Page Analysis Complete',
                    message: `Analyzed: ${result.data.title || 'Current page'}`
                });
            }
        });
    }
});

// Tab update listener (for auto-analysis if enabled)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const settings = await chrome.storage.sync.get('settings');
        
        if (settings.settings?.autoAnalyze) {
            // Auto-analyze after page load
            setTimeout(() => {
                analyzeCurrentTab((result) => {
                    if (result.success && settings.settings?.showNotifications) {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon48.png',
                            title: 'Auto Analysis',
                            message: `Analyzed: ${result.data.title || 'Page'}`
                        });
                    }
                });
            }, 2000); // Wait 2 seconds after page load
        }
    }
});

// Helper function to be injected into pages
function analyzePage() {
    const startTime = performance.now();
    
    // Helper functions
    function getWordCount() {
        const text = document.body.innerText || document.body.textContent || '';
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    function getReadingTime() {
        const wordCount = getWordCount();
        return Math.ceil(wordCount / 200); // 200 words per minute average
    }
    
    function extractTopKeywords() {
        const text = (document.body.innerText || '').toLowerCase();
        const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'];
        
        const words = text.replace(/[^\w\s]/g, ' ').split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word));
            
        const wordCount = {};
        words.forEach(word => wordCount[word] = (wordCount[word] || 0) + 1);
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }
    
    function calculateAltTextCoverage() {
        const images = document.querySelectorAll('img');
        if (images.length === 0) return '100%';
        
        const imagesWithAlt = Array.from(images).filter(img => img.alt && img.alt.trim()).length;
        return Math.round((imagesWithAlt / images.length) * 100) + '%';
    }
    
    function analyzeLinkTypes() {
        const links = document.querySelectorAll('a[href]');
        const currentDomain = window.location.hostname;
        let internal = 0, external = 0;
        
        links.forEach(link => {
            const href = link.href;
            if (href.includes(currentDomain) || href.startsWith('/') || href.startsWith('#')) {
                internal++;
            } else if (href.startsWith('http')) {
                external++;
            }
        });
        
        return { internal, external };
    }
    
    function detectTechnologies() {
        const technologies = [];
        
        // Check for common frameworks/libraries
        if (window.jQuery) technologies.push('jQuery');
        if (window.React) technologies.push('React');
        if (window.Vue) technologies.push('Vue.js');
        if (window.angular) technologies.push('Angular');
        if (document.querySelector('[data-react-root]')) technologies.push('React');
        if (document.querySelector('[ng-app], [data-ng-app]')) technologies.push('AngularJS');
        
        // Check for analytics
        if (window.gtag || window.ga) technologies.push('Google Analytics');
        if (window.fbq) technologies.push('Facebook Pixel');
        
        // Check for CSS frameworks
        if (document.querySelector('link[href*="bootstrap"]') || document.querySelector('.container, .row, .col-')) {
            technologies.push('Bootstrap');
        }
        if (document.querySelector('link[href*="tailwind"]') || document.querySelector('[class*="bg-"], [class*="text-"], [class*="p-"]')) {
            technologies.push('Tailwind CSS');
        }
        
        return technologies;
    }
    
    try {
        // Comprehensive page analysis
        const analysis = {
            // Basic info
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            
            // Content metrics
            wordCount: getWordCount(),
            readingTime: getReadingTime(),
            
            // Element counts
            imageCount: document.querySelectorAll('img').length,
            linkCount: document.querySelectorAll('a[href]').length,
            headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            paragraphCount: document.querySelectorAll('p').length,
            
            // SEO data
            metaDescription: document.querySelector('meta[name="description"]')?.content || '',
            keywords: extractTopKeywords(),
            
            // Accessibility
            altTextCoverage: calculateAltTextCoverage(),
            
            // Links analysis
            linkAnalysis: analyzeLinkTypes(),
            
            // Performance
            loadTime: Math.round(performance.now() - startTime),
            
            // Technology detection
            technologies: detectTechnologies(),
            
            // Page structure
            hasH1: !!document.querySelector('h1'),
            hasNavigation: !!document.querySelector('nav'),
            hasFooter: !!document.querySelector('footer'),
            
            // Forms
            formCount: document.querySelectorAll('form').length,
            inputCount: document.querySelectorAll('input, textarea, select').length
        };
        
        return analysis;
        
    } catch (error) {
        return { error: error.message };
    }
}