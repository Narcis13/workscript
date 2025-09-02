document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const getTableBtn = document.getElementById('getTableBtn');
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

    getTableBtn.addEventListener('click', async function() {
        try {
            // Show loading state
            loading.style.display = 'block';
            error.style.display = 'none';
            results.style.display = 'none';
            getTableBtn.disabled = true;

            // Get current active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            // First get the h1 text for the filename
            const [h1Result] = await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                function: getH1Text
            });
            let filename = 'table-data';
            if (h1Result.result && h1Result.result.h1Text) {
                // Clean the h1 text to make it a valid filename
                filename = h1Result.result.h1Text
                    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .toLowerCase()
                    .trim();
                
                // Ensure filename is not empty after cleaning
                if (!filename) {
                    filename = 'table-data';
                }
            }
            let result;
            if(filename == 'proprietati-adauga'){
                [result] = await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    function: extractPropertiesData
                });
            } else if(filename == 'cereri-adauga'){
                [result] = await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    function: extractRequestData
                });
            } else if(filename == 'activitati-adauga'){
                [result] = await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    function: extractActivitiesData
                });
            } else {
                [result] = await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    function: extractTableData
                });
            }

            if (result.result.error) {
                error.textContent = 'Table extraction failed: ' + result.result.error;
                error.style.display = 'block';
            } else if (result.result.json) {
                // Create filename from h1 text, fallback to 'table-data' if no h1


                // Create a downloadable JSON file
                const jsonString = JSON.stringify(result.result.json, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.json`;
               // a.click();
                URL.revokeObjectURL(url);
              //make a post request to the import endpoint
              let importPromise;
              if(filename == 'agenti-adauga'){
                importPromise = fetch('http://localhost:3013/api/zoca/agents/import', {
                    method: 'POST',
                    body: jsonString
                  });
              }
              else if(filename == 'contacte-adauga'){
                importPromise = fetch('http://localhost:3013/api/zoca/contacts/import', {
                    method: 'POST',
                    body: jsonString
                  });
              }
              else if(filename == 'proprietati-adauga'){
                importPromise = fetch('http://localhost:3013/api/zoca/properties/import', {
                    method: 'POST',
                    body: jsonString
                  });
              }
              else if(filename == 'cereri-adauga'){
                importPromise = fetch('http://localhost:3013/api/zoca/requests/import', {
                    method: 'POST',
                    body: jsonString
                  });
              }
              else if(filename == 'activitati-adauga'){
                importPromise = fetch('http://localhost:3013/api/zoca/activities/import', {
                    method: 'POST',
                    body: jsonString
                  });
              }

              if(importPromise) {
                importPromise
                  .then(response => response.json())
                  .then(importData => {
                    console.log('Import response:', importData);
                    
                    // Show import results instead of extraction metrics
                    const successDiv = document.createElement('div');
                    successDiv.className = 'results';
                    successDiv.innerHTML = `
                        <div class="metric">
                            <span class="metric-label">Import completed!</span>
                            <span class="metric-value">${importData.total} rows processed</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Successfully imported:</span>
                            <span class="metric-value" style="color: #28a745;">${importData.imported}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Skipped:</span>
                            <span class="metric-value" style="color: #ffc107;">${importData.skipped}</span>
                        </div>
                        ${importData.duplicates > 0 ? `
                        <div class="metric">
                            <span class="metric-label">Duplicates:</span>
                            <span class="metric-value" style="color: #6c757d;">${importData.duplicates}</span>
                        </div>
                        ` : ''}
                        ${importData.errors && importData.errors.length > 0 ? `
                        <div class="metric">
                            <span class="metric-label">Errors:</span>
                            <span class="metric-value" style="color: #dc3545;">${importData.errors.length}</span>
                        </div>
                        ` : ''}
                        <div style="margin-top: 10px; padding: 10px; background: #e8f5e8; border-radius: 4px; font-size: 12px;">
                            ${importData.success ? 'Data successfully imported to database' : 'Import failed: ' + (importData.error || 'Unknown error')}
                        </div>
                    `;
                    
                    // Replace the loading message with results
                    const loadingDiv = document.querySelector('.loading');
                    if (loadingDiv) {
                      loadingDiv.parentNode.replaceChild(successDiv, loadingDiv);
                    }
                  })
                  .catch(error => {
                    console.error('Import error:', error);
                    
                    // Show error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'results';
                    errorDiv.innerHTML = `
                        <div style="margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 4px; font-size: 12px; color: #721c24;">
                            Import failed: ${error.message || 'Network error'}
                        </div>
                    `;
                    
                    const loadingDiv = document.querySelector('.loading');
                    if (loadingDiv) {
                      loadingDiv.parentNode.replaceChild(errorDiv, loadingDiv);
                    }
                  });
                return; // Exit early to avoid showing extraction metrics
              }
                // Show success message with column names
                const columnsList = result.result.tableInfo.columnNames.join(', ');
                const successDiv = document.createElement('div');
                successDiv.className = 'results';
                successDiv.innerHTML = `
                    <div class="metric">
                        <span class="metric-label">Table found!</span>
                        <span class="metric-value">${result.result.rowCount} data rows extracted</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Columns:</span>
                        <span class="metric-value">${result.result.tableInfo.columns}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Fields:</span>
                        <span class="metric-value" style="font-size: 11px;">${columnsList}</span>
                    </div>
                    <div style="margin-top: 10px; padding: 10px; background: #e8f5e8; border-radius: 4px; font-size: 12px;">
                        JSON file downloaded automatically - Ready for database insertion
                    </div>
                `;
                
                // Clear existing results and show table data
                results.innerHTML = '';
                results.appendChild(successDiv);
                results.style.display = 'block';
            } else {
                error.textContent = 'No table found on the page';
                error.style.display = 'block';
            }
            
        } catch (err) {
            error.textContent = 'Table extraction failed: ' + err.message;
            error.style.display = 'block';
        } finally {
            loading.style.display = 'none';
            getTableBtn.disabled = false;
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

// Function to get the text content of the first h1 element
function getH1Text() {
    try {
        const h1Element = document.querySelector('h1');
        if (h1Element) {
            const h1Text = h1Element.textContent || h1Element.innerText || '';
            return { h1Text: h1Text.trim() };
        } else {
            return { h1Text: null };
        }
    } catch (error) {
        return { error: error.message };
    }
}

function extractPropertiesData() {
    try {
        const table = document.querySelector('table');
        
        if (!table) {
            return { error: 'No table found on the page' };
        }

        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            return { error: 'Table has no data rows' };
        }

        const jsonData = [];
        let currentProperty = null;

        rows.forEach((row) => {
            const isMainRow = row.classList.contains('model-item');
            const isTagsRow = row.classList.contains('tags-row');

            if (isMainRow) {
                // Extract main property data
                currentProperty = {
                    id: null,
                    internalCode: null,
                    image: null,
                    status: null,
                    transaction: null,
                    propertyType: null,
                    price: null,
                    pricePerSqm: null,
                    rooms: null,
                    bedrooms: null,
                    compartmentType: null,
                    usefulSurface: null,
                    constructedSurface: null,
                    floor: null,
                    zone: null,
                    address: null,
                    agent: null,
                    landlord: null,
                    landlordPhone: null,
                    dateAdded: null,
                    dateModified: null,
                    dateRepublished: null,
                    contractDocument: null,
                    platforms: []
                };

                // Extract property ID from data attributes or checkbox value
                const checkbox = row.querySelector('input[name="id[]"]');
                if (checkbox) {
                    currentProperty.id = checkbox.value;
                }

                // Extract image and status
                const imageCell = row.querySelector('td img');
                if (imageCell) {
                    currentProperty.image = imageCell.src;
                }
                
                const statusLabel = row.querySelector('td .label');
                if (statusLabel) {
                    currentProperty.status = statusLabel.textContent.trim();
                }

                // Extract transaction and property type
                const transactionCell = row.querySelectorAll('td')[2];
                if (transactionCell) {
                    const cellContent = transactionCell.querySelector('.tablesaw-cell-content');
                    if (cellContent) {
                        const cellText = cellContent.textContent;
                        const lines = cellText.split('\n').map(line => line.trim()).filter(line => line && !line.includes('Tranzactie') && !line.includes('Tip'));
                        if (lines.length >= 2) {
                            currentProperty.transaction = lines[0];
                            currentProperty.propertyType = lines[1];
                        }
                        // Extract property code (P######)
                        const codeMatch = cellText.match(/P(\d{6})/);
                        if (codeMatch) {
                            currentProperty.internalCode = codeMatch[0];
                        }
                    }
                }

                // Extract price information
                const priceCell = row.querySelectorAll('td')[3];
                if (priceCell) {
                    const priceStrong = priceCell.querySelector('strong');
                    if (priceStrong) {
                        currentProperty.price = priceStrong.textContent.trim();
                    }
                    const pricePerSqm = priceCell.textContent.match(/(\d+[.,]?\d*€\/mp)/);
                    if (pricePerSqm) {
                        currentProperty.pricePerSqm = pricePerSqm[1];
                    }
                }

                // Extract rooms information
                const roomsCell = row.querySelectorAll('td')[4];
                if (roomsCell) {
                    const roomsStrong = roomsCell.querySelector('strong');
                    if (roomsStrong) {
                        currentProperty.rooms = roomsStrong.textContent.trim();
                    }
                    const bedroomsDiv = roomsCell.querySelector('.text-table-small');
                    if (bedroomsDiv && bedroomsDiv.textContent.includes('dorm')) {
                        currentProperty.bedrooms = bedroomsDiv.textContent.trim();
                    }
                    const compartmentDiv = roomsCell.querySelector('.text-muted.text-table-small');
                    if (compartmentDiv) {
                        currentProperty.compartmentType = compartmentDiv.textContent.trim();
                    }
                }

                // Extract surface information
                const surfaceCell = row.querySelectorAll('td')[5];
                if (surfaceCell) {
                    const surfaceText = surfaceCell.textContent;
                    const usefulMatch = surfaceText.match(/SU.*?(\d+[.,]?\d*\s*m²?)/);
                    if (usefulMatch) {
                        currentProperty.usefulSurface = usefulMatch[1].trim();
                    }
                    const constructedMatch = surfaceText.match(/SC.*?(\d+[.,]?\d*\s*m²?)/);
                    if (constructedMatch) {
                        currentProperty.constructedSurface = constructedMatch[1].trim();
                    }
                }

                // Extract floor
                const floorCell = row.querySelectorAll('td')[6];
                if (floorCell) {
                    const floorStrong = floorCell.querySelector('strong');
                    if (floorStrong) {
                        currentProperty.floor = floorStrong.textContent.trim();
                    }
                }

                // Extract zone and address
                const zoneCell = row.querySelectorAll('td')[7];
                if (zoneCell) {
                    const cellText = zoneCell.textContent;
                    const lines = cellText.split('\n').map(line => line.trim()).filter(line => line);
                    if (lines.length > 0) {
                        currentProperty.zone = lines[0];
                    }
                    const addressDiv = zoneCell.querySelector('.hide-on-private');
                    if (addressDiv) {
                        currentProperty.address = addressDiv.textContent.trim();
                    }
                }

                // Extract agent and landlord information
                const agentCell = row.querySelectorAll('td')[8];
                if (agentCell) {
                    const agentSpan = agentCell.querySelector('.labelish.purple-600');
                    if (agentSpan) {
                        currentProperty.agent = agentSpan.textContent.replace(/\s*\s*/, '').trim();
                    }
                    const landlordLink = agentCell.querySelector('a.labelish.text-primary');
                    if (landlordLink) {
                        currentProperty.landlord = landlordLink.textContent.replace(/\s*\s*/, '').trim();
                    }
                    const phoneLink = agentCell.querySelector('a[href^="tel:"]');
                    if (phoneLink) {
                        currentProperty.landlordPhone = phoneLink.href.replace('tel:', '');
                    }
                }

                // Extract dates
                const dateCell = row.querySelectorAll('td')[9];
                if (dateCell) {
                    const dateSpans = dateCell.querySelectorAll('span[data-tooltip]');
                    if (dateSpans.length >= 2) {
                        currentProperty.dateAdded = dateSpans[0].textContent.trim();
                        currentProperty.dateModified = dateSpans[1].textContent.trim();
                        if (dateSpans.length >= 3) {
                            currentProperty.dateRepublished = dateSpans[2].textContent.trim();
                        }
                    }
                }

            } else if (isTagsRow && currentProperty) {
                // Extract contract and platform information from tags row
                const contractLink = row.querySelector('a[href*="files"]');
                if (contractLink) {
                    currentProperty.contractDocument = contractLink.href;
                }

                // Extract platform links
                const platformLinks = row.querySelectorAll('a[target="_blank"]');
                platformLinks.forEach(link => {
                    const platformSpan = link.querySelector('span.label');
                    if (platformSpan) {
                        const platformTitle = platformSpan.getAttribute('data-original-title') || 
                                            platformSpan.getAttribute('title') || 
                                            platformSpan.textContent;
                        currentProperty.platforms.push({
                            name: platformTitle,
                            url: link.href,
                            code: platformSpan.textContent
                        });
                    }
                });

                // Extract additional labels (like LC - Luna Curenta)
                const additionalLabels = row.querySelectorAll('span.label:not(a span)');
                additionalLabels.forEach(label => {
                    const title = label.getAttribute('data-original-title') || label.getAttribute('title');
                    if (title) {
                        currentProperty.platforms.push({
                            name: title,
                            code: label.textContent,
                            url: null
                        });
                    }
                });

                // Push completed property and reset
                if (currentProperty) {
                    jsonData.push(currentProperty);
                    currentProperty = null;
                }
            }
        });

        // Add the last property if it wasn't added (in case there's no tags row)
        if (currentProperty) {
            jsonData.push(currentProperty);
        }

        const extractedFields = [
            'id', 'internalCode', 'image', 'status', 'transaction', 'propertyType',
            'price', 'pricePerSqm', 'rooms', 'bedrooms', 'compartmentType',
            'usefulSurface', 'constructedSurface', 'floor', 'zone', 'address',
            'agent', 'landlord', 'landlordPhone', 'dateAdded', 'dateModified',
            'dateRepublished', 'contractDocument', 'platforms'
        ];

        return {
            json: jsonData,
            rowCount: jsonData.length,
            tableInfo: {
                totalRows: jsonData.length + 1, // +1 for header
                dataRows: jsonData.length,
                columns: extractedFields.length,
                columnNames: extractedFields
            }
        };

    } catch (error) {
        return { error: error.message };
    }
}

// Function to extract request data from the requests table
function extractRequestData() {
    try {
        const table = document.querySelector('table');
        
        if (!table) {
            return { error: 'No table found on the page' };
        }
        
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            return { error: 'Table has no data rows' };
        }
        
        const jsonData = [];
        let currentRequest = null;
        
        rows.forEach((row) => {
            const isMainRow = row.classList.contains('model-item');
            const isTagsRow = row.classList.contains('tags-row');
            
            if (isMainRow) {
                // Extract main request data
                currentRequest = {
                    id: null,
                    requestCode: null,
                    status: null,
                    statusColor: null,
                    contactName: null,
                    contactPhone: null,
                    contactId: null,
                    transaction: null,
                    propertyType: null,
                    propertySubtype: null,
                    budget: null,
                    city: null,
                    zones: null,
                    source: null,
                    syncStatus: null,
                    sourcePropertyCode: null,
                    sourcePropertyId: null,
                    agent: null,
                    dateAdded: null,
                    dateModified: null,
                    dateVerified: null
                };
                
                // Extract request ID from checkbox value
                const checkbox = row.querySelector('input[name="id[]"]');
                if (checkbox) {
                    currentRequest.id = checkbox.value;
                }
                
                // Extract status and request code
                const statusCell = row.querySelector('td[rowspan="2"]');
                if (statusCell) {
                    const statusLabel = statusCell.querySelector('.label');
                    if (statusLabel) {
                        currentRequest.status = statusLabel.textContent.trim();
                        
                        // Extract status background color class
                        const classNames = statusLabel.className.split(' ');
                        const colorClass = classNames.find(cls => cls.startsWith('bg-'));
                        if (colorClass) {
                            currentRequest.statusColor = colorClass;
                        }
                    }
                    
                    // Extract request code (R#####)
                    const codeMatch = statusCell.textContent.match(/R(\d+)/);
                    if (codeMatch) {
                        currentRequest.requestCode = codeMatch[0];
                    }
                }
                
                // Extract contact information
                const contactCell = row.querySelectorAll('td')[2];
                if (contactCell) {
                    const contactLink = contactCell.querySelector('a[data-has="popover"]');
                    if (contactLink) {
                        // Extract full contact name - get text content and remove icon by filtering out non-letter characters at start
                        const fullText = contactLink.textContent.trim();
                        const nameMatch = fullText.match(/[A-Za-z\s]+/);
                        if (nameMatch) {
                            currentRequest.contactName = nameMatch[0].trim();
                        }
                        
                        // Extract contact ID from URL
                        const idMatch = contactLink.href.match(/contacts\/(\d+)/);
                        if (idMatch) {
                            currentRequest.contactId = idMatch[1];
                        }
                    }
                    
                    // Extract phone number
                    const phoneLink = contactCell.querySelector('a[href^="tel:"]');
                    if (phoneLink) {
                        currentRequest.contactPhone = phoneLink.getAttribute('href').replace('tel:', '');
                    }
                }
                
                // Extract transaction and property type
                const transactionCell = row.querySelectorAll('td')[3];
                if (transactionCell) {
                    const cellContent = transactionCell.querySelector('.tablesaw-cell-content');
                    if (cellContent) {
                        const lines = cellContent.textContent.split('\n')
                            .map(line => line.trim())
                            .filter(line => line && !line.includes('Tranzactie') && !line.includes('Tip'));
                        
                        if (lines.length >= 1) {
                            currentRequest.transaction = lines[0];
                        }
                        if (lines.length >= 2) {
                            currentRequest.propertyType = lines[1];
                        }
                        if (lines.length >= 3) {
                            currentRequest.propertySubtype = lines[2];
                        }
                    }
                }
                
                // Extract budget
                const budgetCell = row.querySelectorAll('td')[4];
                if (budgetCell) {
                    const budgetStrong = budgetCell.querySelector('strong');
                    if (budgetStrong) {
                        currentRequest.budget = budgetStrong.textContent.trim();
                    }
                }
                
                // Extract city and zones
                const locationCell = row.querySelectorAll('td')[5];
                if (locationCell) {
                    const cellContent = locationCell.querySelector('.tablesaw-cell-content');
                    if (cellContent) {
                        const lines = cellContent.textContent.split('\n')
                            .map(line => line.trim())
                            .filter(line => line);
                        
                        if (lines.length >= 1) {
                            currentRequest.city = lines[0];
                        }
                        if (lines.length >= 2) {
                            currentRequest.zones = lines[1];
                        }
                    }
                }
                
                // Extract source and sync status
                const sourceCell = row.querySelectorAll('td')[6];
                if (sourceCell) {
                    // Extract property code if present (P followed by 6 digits)
                    const propertyLink = sourceCell.querySelector('a[data-has="popover"]');
                    if (propertyLink) {
                        const propertyCodeMatch = propertyLink.textContent.match(/P(\d{6})/);
                        if (propertyCodeMatch) {
                            currentRequest.sourcePropertyCode = propertyCodeMatch[0];
                        }
                        
                        // Extract property ID from URL
                        const propertyIdMatch = propertyLink.href.match(/properties\/(\d+)/);
                        if (propertyIdMatch) {
                            currentRequest.sourcePropertyId = propertyIdMatch[1];
                        }
                    }
                    
                    const syncLabel = sourceCell.querySelector('.label');
                    if (syncLabel) {
                        currentRequest.source = syncLabel.textContent.trim();
                        const tooltip = syncLabel.getAttribute('data-original-title');
                        if (tooltip) {
                            currentRequest.syncStatus = tooltip;
                        }
                    }
                }
                
                // Extract agent
                const agentCell = row.querySelectorAll('td')[7];
                if (agentCell) {
                    const agentSpan = agentCell.querySelector('span[data-has="popover"]');
                    if (agentSpan) {
                        // Extract full agent name - get text content and remove icon by filtering out non-letter characters at start
                        const fullText = agentSpan.textContent.trim();
                        const nameMatch = fullText.match(/[A-Za-z\s]+/);
                        if (nameMatch) {
                            currentRequest.agent = nameMatch[0].trim();
                        }
                    }
                }
                
                // Extract dates
                const dateCell = row.querySelectorAll('td')[8];
                if (dateCell) {
                    const cellContent = dateCell.querySelector('.tablesaw-cell-content');
                    if (cellContent) {
                        const dateSpans = cellContent.querySelectorAll('span[data-tooltip="true"]');
                        
                        if (dateSpans.length >= 1) {
                            const addedTitle = dateSpans[0].getAttribute('title');
                            if (addedTitle) {
                                currentRequest.dateAdded = addedTitle;
                            }
                        }
                        
                        if (dateSpans.length >= 2) {
                            const modifiedTitle = dateSpans[1].getAttribute('title');
                            if (modifiedTitle) {
                                currentRequest.dateModified = modifiedTitle;
                            }
                        }
                        
                        if (dateSpans.length >= 3) {
                            const verifiedTitle = dateSpans[2].getAttribute('title');
                            if (verifiedTitle) {
                                currentRequest.dateVerified = verifiedTitle;
                            }
                        }
                    }
                }
                
                // Push completed request
                if (currentRequest) {
                    jsonData.push(currentRequest);
                    currentRequest = null;
                }
            }
        });
        
        // Add the last request if it wasn't added
        if (currentRequest) {
            jsonData.push(currentRequest);
        }
        
        const extractedFields = [
            'id', 'requestCode', 'status', 'statusColor', 'contactName', 'contactPhone', 'contactId',
            'transaction', 'propertyType', 'propertySubtype', 'budget', 'city', 'zones',
            'source', 'syncStatus', 'sourcePropertyCode', 'sourcePropertyId', 'agent', 
            'dateAdded', 'dateModified', 'dateVerified'
        ];
        
        return {
            json: jsonData,
            rowCount: jsonData.length,
            tableInfo: {
                totalRows: jsonData.length + 1, // +1 for header
                dataRows: jsonData.length,
                columns: extractedFields.length,
                columnNames: extractedFields
            }
        };
        
    } catch (error) {
        return { error: error.message };
    }
}

// Function to extract activities data from the activities table
async function extractActivitiesData() {
    try {
        const table = document.querySelector('table');
        
        if (!table) {
            return { error: 'No table found on the page' };
        }
        
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            return { error: 'Table has no data rows' };
        }
        
        const jsonData = [];
        
        // Helper function to extract phone number from popover
        const extractPhoneFromPopover = async (contactElement) => {
            return new Promise((resolve) => {
                if (!contactElement) {
                    resolve(null);
                    return;
                }
                
                // Create hover events
                const mouseEnterEvent = new MouseEvent('mouseenter', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                
                const mouseOverEvent = new MouseEvent('mouseover', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                
                // Function to check for popover and extract phone
                const checkForPopover = () => {
                    // Look for popover content that might contain phone number
                    const popovers = document.querySelectorAll('.popover, .tooltip, [class*="popover"], [class*="tooltip"]');
                    
                    for (const popover of popovers) {
                        if (popover.style.display !== 'none' && popover.offsetHeight > 0) {
                            // Look for phone number in various formats
                            const popoverText = popover.textContent || popover.innerText || '';
                            
                            // Match phone patterns (Romanian format and international)
                            const phonePatterns = [
                                /\+40[0-9\s\-\.]{9,}/g,  // +40 format
                                /07[0-9\s\-\.]{8,}/g,    // 07xx format
                                /\b[0-9\s\-\.]{10,}\b/g  // General 10+ digit format
                            ];
                            
                            for (const pattern of phonePatterns) {
                                const matches = popoverText.match(pattern);
                                if (matches && matches.length > 0) {
                                    // Clean the phone number
                                    const phone = matches[0].replace(/[\s\-\.]/g, '').trim();
                                    if (phone.length >= 10) {
                                        return phone;
                                    }
                                }
                            }
                            
                            // Also look for tel: links in popover
                            const telLinks = popover.querySelectorAll('a[href^="tel:"]');
                            if (telLinks.length > 0) {
                                return telLinks[0].getAttribute('href').replace('tel:', '').replace(/[\s\-\.]/g, '');
                            }
                        }
                    }
                    
                    return null;
                };
                
                // Trigger hover events
                contactElement.dispatchEvent(mouseEnterEvent);
                contactElement.dispatchEvent(mouseOverEvent);
                
                // Wait for popover to appear and extract phone
                setTimeout(() => {
                    const phone = checkForPopover();
                    
                    // Create mouse leave event to hide popover
                    const mouseLeaveEvent = new MouseEvent('mouseleave', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    contactElement.dispatchEvent(mouseLeaveEvent);
                    
                    resolve(phone);
                }, 300); // Wait 300ms for popover to load
            });
        };
        
        // Process rows sequentially to avoid overwhelming the page
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Skip non-activity rows (like headers)
            if (!row.classList.contains('model-item')) {
                continue;
            }
            
            const activity = {
                id: null,
                status: null,
                statusIcon: null,
                statusClass: null,
                type: null,
                typeColor: null,
                typeIcon: null,
                typeDuration: null,
                name: null,
                memo: null,
                date: null,
                time: null,
                contact: null,
                contactId: null,
                contactPhone: null,
                properties: null,
                propertyId: null,
                requests: null,
                requestId: null,
                agent: null,
                agentId: null,
                editUrl: null,
                slideUrl: null
            };
            
            // Extract activity ID from checkbox value
            const checkbox = row.querySelector('input.selectable-item');
            if (checkbox) {
                activity.id = checkbox.value;
            }
            
            // Extract slide panel URL from row data attribute
            const slideUrl = row.getAttribute('data-url');
            if (slideUrl) {
                activity.slideUrl = slideUrl;
            }
            
            const cells = row.querySelectorAll('td');
            
            // Extract status (second cell - index 1)
            if (cells[1]) {
                const statusSpan = cells[1].querySelector('.activity-status');
                if (statusSpan) {
                    // Extract status class for styling
                    const statusClasses = statusSpan.className.split(' ');
                    const statusClass = statusClasses.find(cls => cls.startsWith('activity-status-'));
                    if (statusClass) {
                        activity.statusClass = statusClass;
                    }
                    
                    const timeframeClass = statusClasses.find(cls => cls.startsWith('activity-timeframe-'));
                    if (timeframeClass) {
                        activity.status = timeframeClass.replace('activity-timeframe-', '');
                    }
                }
                
                const statusIcon = cells[1].querySelector('i');
                if (statusIcon) {
                    activity.statusIcon = statusIcon.className;
                }
            }
            
            // Extract type (third cell - index 2)
            if (cells[2]) {
                const typeLabel = cells[2].querySelector('label.btn');
                if (typeLabel) {
                    // Extract type color from button class
                    const typeClasses = typeLabel.className.split(' ');
                    const colorClass = typeClasses.find(cls => cls.startsWith('btn-') && cls !== 'btn');
                    if (colorClass) {
                        activity.typeColor = colorClass;
                    }
                    
                    // Extract duration from data attribute
                    const duration = typeLabel.getAttribute('data-duration');
                    if (duration) {
                        activity.typeDuration = duration;
                    }
                }
                
                const typeIcon = cells[2].querySelector('i');
                if (typeIcon) {
                    activity.typeIcon = typeIcon.className;
                    
                    // Determine type based on icon
                    if (typeIcon.classList.contains('fa-group')) {
                        activity.type = 'meeting';
                    } else if (typeIcon.classList.contains('ti-check')) {
                        activity.type = 'task';
                    } else if (typeIcon.classList.contains('fa-phone')) {
                        activity.type = 'call';
                    } else if (typeIcon.classList.contains('ti-eye')) {
                        activity.type = 'viewing';
                    } else {
                        activity.type = 'other';
                    }
                }
            }
            
            // Extract name and memo (fourth cell - index 3)
            if (cells[3]) {
                const cellContent = cells[3].querySelector('.tablesaw-cell-content');
                if (cellContent) {
                    const strong = cellContent.querySelector('strong');
                    if (strong) {
                        activity.name = strong.textContent.trim();
                    }
                    
                    // Extract memo from the text after the strong element
                    const memoSpan = cellContent.querySelector('span.text-muted');
                    if (memoSpan) {
                        const memoText = memoSpan.textContent || memoSpan.innerText || '';
                        // Remove "Memo:" prefix if present
                        activity.memo = memoText.replace(/^Memo:\s*/i, '').trim();
                    }
                }
            }
            
            // Extract date and time (fifth cell - index 4)
            if (cells[4]) {
                const cellContent = cells[4].querySelector('.tablesaw-cell-content');
                if (cellContent) {
                    const textMuted = cellContent.querySelector('.text-muted');
                    if (textMuted) {
                        const dateTimeText = textMuted.textContent.trim();
                        const lines = dateTimeText.split('\n').map(line => line.trim()).filter(line => line);
                        
                        if (lines.length >= 1) {
                            activity.date = lines[0];
                        }
                        if (lines.length >= 2) {
                            activity.time = lines[1];
                        }
                    }
                }
            }
            
            // Extract contact (sixth cell - index 5)
            if (cells[5]) {
                const contactSpan = cells[5].querySelector('span.labelish.text-primary');
                if (contactSpan) {
                    // Extract contact name - remove icon text
                    const fullText = contactSpan.textContent.trim();
                    const nameMatch = fullText.match(/[A-Za-z\s]+/);
                    if (nameMatch) {
                        activity.contact = nameMatch[0].trim();
                    }
                    
                    // Extract contact ID from popover href
                    const popoverHref = contactSpan.getAttribute('data-pophref');
                    if (popoverHref) {
                        const idMatch = popoverHref.match(/contacts\/(\d+)/);
                        if (idMatch) {
                            activity.contactId = idMatch[1];
                        }
                    }
                    
                    // Extract phone number from popover
                    try {
                        const phone = await extractPhoneFromPopover(contactSpan);
                        if (phone) {
                            activity.contactPhone = phone;
                        }
                    } catch (error) {
                        console.log('Error extracting phone for contact:', activity.contact, error);
                    }
                }
            }
            
            // Extract properties (seventh cell - index 6)
            if (cells[6]) {
                const propertyLink = cells[6].querySelector('a.labelish.cyan-600');
                if (propertyLink) {
                    activity.properties = propertyLink.textContent.trim();
                    
                    // Extract property ID from URL
                    const href = propertyLink.getAttribute('href');
                    if (href) {
                        const idMatch = href.match(/properties\/(\d+)/);
                        if (idMatch) {
                            activity.propertyId = idMatch[1];
                        }
                    }
                } else {
                    // Check for red property link (different color class)
                    const redPropertyLink = cells[6].querySelector('a.labelish.red-600');
                    if (redPropertyLink) {
                        activity.properties = redPropertyLink.textContent.trim();
                        
                        const href = redPropertyLink.getAttribute('href');
                        if (href) {
                            const idMatch = href.match(/properties\/(\d+)/);
                            if (idMatch) {
                                activity.propertyId = idMatch[1];
                            }
                        }
                    }
                }
            }
            
            // Extract requests (eighth cell - index 7)
            if (cells[7]) {
                const requestLink = cells[7].querySelector('a.labelish.blue-grey-400');
                if (requestLink) {
                    activity.requests = requestLink.textContent.trim();
                    
                    // Extract request ID from URL
                    const href = requestLink.getAttribute('href');
                    if (href) {
                        const idMatch = href.match(/requests\/(\d+)/);
                        if (idMatch) {
                            activity.requestId = idMatch[1];
                        }
                    }
                }
            }
            
            // Extract agent (ninth cell - index 8)
            if (cells[8]) {
                const agentSpan = cells[8].querySelector('span.labelish.purple-600');
                if (agentSpan) {
                    // Extract agent name - remove icon text
                    const fullText = agentSpan.textContent.trim();
                    const nameMatch = fullText.match(/[A-Za-z\s]+/);
                    if (nameMatch) {
                        activity.agent = nameMatch[0].trim();
                    }
                    
                    // Extract agent ID from popover href
                    const popoverHref = agentSpan.getAttribute('data-pophref');
                    if (popoverHref) {
                        const idMatch = popoverHref.match(/agents\/(\d+)/);
                        if (idMatch) {
                            activity.agentId = idMatch[1];
                        }
                    }
                }
            }
            
            // Extract edit URL (last cell - index 9)
            if (cells[9]) {
                const editLink = cells[9].querySelector('a[data-url*="/edit"]');
                if (editLink) {
                    activity.editUrl = editLink.getAttribute('data-url');
                }
            }
            
            jsonData.push(activity);
            
            // Add small delay between rows to ensure popovers are processed correctly
            if (i < rows.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        const extractedFields = [
            'id', 'status', 'statusIcon', 'statusClass', 'type', 'typeColor', 'typeIcon', 'typeDuration',
            'name', 'memo', 'date', 'time', 'contact', 'contactId', 'contactPhone', 'properties', 'propertyId',
            'requests', 'requestId', 'agent', 'agentId', 'editUrl', 'slideUrl'
        ];
        
        return {
            json: jsonData,
            rowCount: jsonData.length,
            tableInfo: {
                totalRows: jsonData.length + 1, // +1 for header
                dataRows: jsonData.length,
                columns: extractedFields.length,
                columnNames: extractedFields
            }
        };
        
    } catch (error) {
        return { error: error.message };
    }
}

// Function to extract clean JSON data from the first table on the page (without header row)
function extractTableData() {
    try {
        const table = document.querySelector('table');
        
        if (!table) {
            return { error: 'No table found on the page' };
        }

        const rows = table.querySelectorAll('tr');
        if (rows.length === 0) {
            return { error: 'Table has no rows' };
        }

        // Get header row to determine column names
        const headerRow = rows[0];
        const headerCells = headerRow.querySelectorAll('td, th');
        const columnNames = Array.from(headerCells).map((cell, index) => {
            let headerText = cell.textContent.trim();
            // Clean header text and use as property name
            headerText = headerText.replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
            return headerText || `column_${index}`;
        });

        // Extract data rows (skip header row)
        const dataRows = Array.from(rows).slice(1);
        const jsonData = [];

        dataRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            const rowData = {};
            
            Array.from(cells).forEach((cell, index) => {
                // Clean cell text - remove all newlines, extra spaces, and special characters
                let text = cell.textContent || cell.innerText || '';
                
                // Replace multiple whitespace (including newlines, tabs) with single space
                text = text.replace(/\s+/g, ' ').trim();
                
                // Remove invisible characters and phone number formatting
                text = text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
                text = text.replace(/[‪‬]/g, ''); // Remove specific invisible chars
                
                // Remove header text from beginning of cell value if present
                const headerName = columnNames[index];
                if (headerName && text.toLowerCase().startsWith(headerName.toLowerCase())) {
                    text = text.substring(headerName.length).trim();
                } else {
                    // Try to remove specific known header patterns only
                    const knownHeaders = ['Poza', 'Nume', 'E-mail', 'Email', 'Telefon', 'Grup', 'Activ', 'Actiuni'];
                    for (const header of knownHeaders) {
                        if (text.toLowerCase().startsWith(header.toLowerCase() + ' ')) {
                            text = text.substring(header.length).trim();
                            break;
                        }
                    }
                }
                
                // Use header name as property key, fallback to column index
                const propertyName = columnNames[index] || `column_${index}`;
                rowData[propertyName] = text;
            });
            
            // Only add row if it has at least one non-empty cell
            const hasData = Object.values(rowData).some(value => value && value.length > 0);
            if (hasData) {
                jsonData.push(rowData);
            }
        });

        return {
            json: jsonData,
            rowCount: jsonData.length,
            tableInfo: {
                totalRows: rows.length,
                dataRows: jsonData.length,
                columns: columnNames.length,
                columnNames: columnNames
            }
        };

    } catch (error) {
        return { error: error.message };
    }
}

