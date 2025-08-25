document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const results = document.getElementById('results');

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });

    analyzeBtn.addEventListener('click', async function() {
        try {
            // Show loading state
            loading.style.display = 'block';
            error.style.display = 'none';
            results.style.display = 'none';
            analyzeBtn.disabled = true;

            // Get current active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            // Inject content script and analyze page
            const [result] = await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                function: analyzePage
            });

            if (result.result.error) {
                throw new Error(result.result.error);
            }

            // Display results
            displayResults(result.result);
            
        } catch (err) {
            console.error('Analysis failed:', err);
            error.textContent = 'Failed to analyze page: ' + err.message;
            error.style.display = 'block';
        } finally {
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    });

    function displayResults(data) {
        // Overview tab
        document.getElementById('pageTitle').textContent = data.title || 'N/A';
        document.getElementById('wordCount').textContent = data.wordCount || '0';
        document.getElementById('imageCount').textContent = data.imageCount || '0';
        document.getElementById('linkCount').textContent = data.linkCount || '0';
        document.getElementById('loadTime').textContent = data.loadTime ? data.loadTime + 'ms' : 'N/A';

        // Content tab
        document.getElementById('headingCount').textContent = data.headingCount || '0';
        document.getElementById('paragraphCount').textContent = data.paragraphCount || '0';
        document.getElementById('readingTime').textContent = data.readingTime ? data.readingTime + ' min' : 'N/A';
        
        // Display keywords
        const keywordsContainer = document.getElementById('keywords');
        keywordsContainer.innerHTML = '';
        if (data.keywords && data.keywords.length > 0) {
            data.keywords.slice(0, 10).forEach(keyword => {
                const span = document.createElement('span');
                span.className = 'keyword';
                span.textContent = keyword;
                keywordsContainer.appendChild(span);
            });
        }

        // SEO tab
        document.getElementById('metaDescription').textContent = data.metaDescription || 'Not found';
        document.getElementById('altTextCoverage').textContent = data.altTextCoverage || '0%';
        document.getElementById('internalLinks').textContent = data.internalLinks || '0';
        document.getElementById('externalLinks').textContent = data.externalLinks || '0';

        results.style.display = 'block';
    }
});

// This function will be injected into the page
function analyzePage() {
    // Define helper function inside so it gets injected too
    function extractKeywords(text) {
        const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
        
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word));

        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15)
            .map(([word]) => word);
    }

    try {
        const startTime = performance.now();
        
        // Basic page info
        const title = document.title;
        const url = window.location.href;
        
        // Text analysis
        const textContent = document.body.innerText || document.body.textContent || '';
        const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        
        // Reading time (average 200 words per minute)
        const readingTime = Math.ceil(wordCount / 200);
        
        // Element counts
        const images = document.querySelectorAll('img');
        const imageCount = images.length;
        const links = document.querySelectorAll('a[href]');
        const linkCount = links.length;
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const headingCount = headings.length;
        const paragraphs = document.querySelectorAll('p');
        const paragraphCount = paragraphs.length;

        // SEO analysis
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        
        // Alt text coverage
        let imagesWithAlt = 0;
        images.forEach(img => {
            if (img.getAttribute('alt')) {
                imagesWithAlt++;
            }
        });
        const altTextCoverage = imageCount > 0 ? Math.round((imagesWithAlt / imageCount) * 100) + '%' : '100%';

        // Link analysis
        let internalLinks = 0;
        let externalLinks = 0;
        const currentDomain = window.location.hostname;
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                if (href.startsWith('#') || href.startsWith('/') || href.includes(currentDomain)) {
                    internalLinks++;
                } else if (href.startsWith('http')) {
                    externalLinks++;
                }
            }
        });

        // Keyword extraction (simple approach)
        const keywords = extractKeywords(textContent);
        
        // Performance
        const loadTime = Math.round(performance.now() - startTime);

        return {
            title,
            url,
            wordCount,
            imageCount,
            linkCount,
            headingCount,
            paragraphCount,
            readingTime,
            keywords,
            metaDescription,
            altTextCoverage,
            internalLinks,
            externalLinks,
            loadTime
        };

    } catch (error) {
        return { error: error.message };
    }
}

