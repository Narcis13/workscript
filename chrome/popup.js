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
              if(filename == 'agenti-adauga'){
                fetch('http://localhost:3013/api/zoca/agents/import', {
                    method: 'POST',
                    body: jsonString
                  })
                  .then(response => response.json())
                  .then(data => {
                    console.log('Import response:', data)
                  })
                  .catch(error => {
                    console.error('Import error:', error)
                  })
    
              }
              if(filename == 'contacte-adauga'){
                fetch('http://localhost:3013/api/zoca/contacts/import', {
                    method: 'POST',
                    body: jsonString
                  })
                  .then(response => response.json())
                  .then(data => {
                    console.log('Import response:', data)
                  })
                  .catch(error => {
                    console.error('Import error:', error)
                  })
    
              }
              if(filename == 'proprietati-adauga'){
                  fetch('http://localhost:3013/api/zoca/properties/import', {
                    method: 'POST',
                    body: jsonString
                  })
                  .then(response => response.json())
                  .then(data => {
                    console.log('Import response:', data)
                  })
                  .catch(error => {
                    console.error('Import error:', error)
                  })
    
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
                    propertyCode: null,
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
                    const cellText = transactionCell.textContent;
                    const lines = cellText.split('\n').map(line => line.trim()).filter(line => line);
                    if (lines.length >= 2) {
                        currentProperty.transaction = lines[0];
                        currentProperty.propertyType = lines[1];
                    }
                    // Extract property code (P######)
                    const codeMatch = cellText.match(/P(\d{6})/);
                    if (codeMatch) {
                        currentProperty.propertyCode = codeMatch[0];
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
            'id', 'propertyCode', 'image', 'status', 'transaction', 'propertyType',
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

