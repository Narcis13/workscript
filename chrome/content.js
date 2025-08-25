// Content script that runs on all pages
// This script can communicate with the popup and background script

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageData') {
        try {
            const pageData = gatherPageData();
            sendResponse({ success: true, data: pageData });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Indicates we will send a response asynchronously
});

function gatherPageData() {
    // Gather comprehensive page data
    const data = {
        // Basic info
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        timestamp: new Date().toISOString(),

        // Page structure
        doctype: document.doctype ? document.doctype.name : null,
        language: document.documentElement.lang || 'not specified',
        charset: document.characterSet,

        // Content analysis
        textContent: document.body.innerText || document.body.textContent || '',
        
        // Meta information
        metaTags: Array.from(document.querySelectorAll('meta')).map(meta => ({
            name: meta.name || meta.property || meta.httpEquiv,
            content: meta.content
        })).filter(meta => meta.name),

        // Headings structure
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => ({
            level: parseInt(heading.tagName.charAt(1)),
            text: heading.textContent.trim(),
            id: heading.id
        })),

        // Images analysis
        images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt || '',
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height
        })),

        // Links analysis
        links: Array.from(document.querySelectorAll('a[href]')).map(link => ({
            href: link.href,
            text: link.textContent.trim(),
            isExternal: !link.href.includes(window.location.hostname),
            hasTitle: !!link.title
        })),

        // Forms
        forms: Array.from(document.querySelectorAll('form')).map(form => ({
            method: form.method,
            action: form.action,
            inputCount: form.querySelectorAll('input, textarea, select').length
        })),

        // Performance data (if available)
        performance: getPerformanceData(),

        // Accessibility checks
        accessibility: performAccessibilityChecks()
    };

    return data;
}

function getPerformanceData() {
    try {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            return {
                loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
                firstPaint: getFirstPaint(),
                resourceCount: performance.getEntriesByType('resource').length
            };
        }
    } catch (error) {
        console.log('Performance data unavailable:', error);
    }
    return null;
}

function getFirstPaint() {
    try {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? Math.round(firstPaint.startTime) : null;
    } catch (error) {
        return null;
    }
}

function performAccessibilityChecks() {
    const checks = {
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        linksWithoutText: document.querySelectorAll('a[href]:empty').length,
        inputsWithoutLabels: document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').length,
        headingStructure: analyzeHeadingStructure(),
        colorContrast: 'Manual review needed', // This would require more complex analysis
        focusableElements: document.querySelectorAll('[tabindex], button, input, select, textarea, a[href]').length
    };

    return checks;
}

function analyzeHeadingStructure() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map(h => parseInt(h.tagName.charAt(1)));
    
    let issues = [];
    
    // Check if there's an H1
    if (!levels.includes(1)) {
        issues.push('Missing H1 tag');
    }
    
    // Check for proper hierarchy
    for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i-1] > 1) {
            issues.push(`Heading hierarchy skip from H${levels[i-1]} to H${levels[i]}`);
        }
    }
    
    return issues.length > 0 ? issues : ['Proper heading structure'];
}

// Optional: Add a visual indicator that the extension is active
function addExtensionIndicator() {
    if (document.getElementById('web-analyzer-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'web-analyzer-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4285f4;
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        display: none;
    `;
    indicator.textContent = '🔍 Analyzer Ready';
    document.body.appendChild(indicator);
    
    // Show briefly when page loads
    setTimeout(() => {
        indicator.style.display = 'block';
        setTimeout(() => indicator.style.display = 'none', 2000);
    }, 1000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
    addExtensionIndicator();
}