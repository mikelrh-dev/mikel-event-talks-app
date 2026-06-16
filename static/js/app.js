document.addEventListener('DOMContentLoaded', () => {
    // State
    let releaseNotesData = [];
    let selectedUpdate = null;
    let activeFilter = 'all';
    let searchQuery = '';

    // Emoji Map for Tweet generation
    const emojiMap = {
        'feature': '🚀',
        'issue': '⚠️',
        'change': '🔄',
        'announcement': '📢',
        'breaking': '💥',
        'general': 'ℹ️'
    };

    // DOM Elements
    const timelineLoader = document.getElementById('timeline-loader');
    const timelineError = document.getElementById('timeline-error');
    const timelineEmpty = document.getElementById('timeline-empty');
    const timelineContent = document.getElementById('timeline-content');
    const errorMessage = document.getElementById('error-message');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const btnRefresh = document.getElementById('btn-refresh');
    const btnRetry = document.getElementById('btn-retry');
    const filterChips = document.getElementById('filter-chips');
    const btnExportCSV = document.getElementById('btn-export-csv');
    
    // Composer Elements
    const composerContainer = document.getElementById('composer-container');
    const composerUnselected = document.getElementById('composer-unselected');
    const composerCard = document.getElementById('composer-card');
    const selectedTypeBadge = document.getElementById('selected-type-badge');
    const selectedDateText = document.getElementById('selected-date-text');
    const selectedHtmlContent = document.getElementById('selected-html-content');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountText = document.getElementById('char-count');
    const btnTweet = document.getElementById('btn-tweet');
    const btnCopy = document.getElementById('btn-copy');
    const btnCloseComposer = document.getElementById('btn-close-composer');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Progress Ring configuration
    const progressRingCircle = document.querySelector('.progress-ring__circle');
    const radius = progressRingCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    progressRingCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRingCircle.style.strokeDashoffset = circumference;

    function setProgress(percent) {
        const offset = circumference - (percent / 100 * circumference);
        progressRingCircle.style.strokeDashoffset = offset;
    }

    // Load Data
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        const url = forceRefresh ? '/api/refresh' : '/api/release-notes';
        const options = forceRefresh ? { method: 'POST' } : { method: 'GET' };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            
            const result = await response.json();
            releaseNotesData = result.data;
            
            // Update timestamp
            const fetchDate = new Date(result.last_fetched);
            lastUpdatedText.textContent = `Last updated: ${fetchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            
            setLoadingState(false);
            renderTimeline();
        } catch (error) {
            console.error('Error fetching release notes:', error);
            setLoadingState(false, error.message);
        }
    }

    // Loader Management
    function setLoadingState(isLoading, errorMsg = null) {
        if (isLoading) {
            timelineLoader.style.display = 'flex';
            timelineError.style.display = 'none';
            timelineEmpty.style.display = 'none';
            timelineContent.style.display = 'none';
            btnRefresh.classList.add('loading');
            btnRefresh.disabled = true;
        } else {
            timelineLoader.style.display = 'none';
            btnRefresh.classList.remove('loading');
            btnRefresh.disabled = false;
            
            if (errorMsg) {
                timelineError.style.display = 'block';
                errorMessage.textContent = errorMsg;
                timelineContent.style.display = 'none';
            }
        }
    }

    // Render Timeline with Filters and Search applied
    function renderTimeline() {
        if (!releaseNotesData || releaseNotesData.length === 0) {
            timelineEmpty.style.display = 'block';
            timelineContent.style.display = 'none';
            return;
        }

        timelineContent.innerHTML = '';
        let matchedAny = false;

        releaseNotesData.forEach(entry => {
            // Filter the updates in this entry
            const filteredUpdates = entry.updates.filter(update => {
                // Filter by type
                const matchesType = activeFilter === 'all' || 
                    update.type.toLowerCase() === activeFilter.toLowerCase();

                // Filter by search text
                const matchesSearch = searchQuery === '' || 
                    update.type.toLowerCase().includes(searchQuery) ||
                    update.content_text.toLowerCase().includes(searchQuery) ||
                    entry.date.toLowerCase().includes(searchQuery);

                return matchesType && matchesSearch;
            });

            // If we have matching updates, render this entry
            if (filteredUpdates.length > 0) {
                matchedAny = true;
                
                const groupDiv = document.createElement('div');
                groupDiv.className = 'timeline-group';

                const markerDiv = document.createElement('div');
                markerDiv.className = 'timeline-marker-container';
                
                // Group Date header markup
                let dateLink = '';
                if (entry.url) {
                    dateLink = `<a href="${entry.url}" target="_blank" class="timeline-date-link" title="Open official notes for this date"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
                }

                groupDiv.innerHTML = `
                    <div class="timeline-date-marker">
                        <div class="timeline-dot"></div>
                        <div class="timeline-date-title">
                            ${entry.date}
                            ${dateLink}
                        </div>
                    </div>
                    <div class="timeline-items"></div>
                `;

                const itemsContainer = groupDiv.querySelector('.timeline-items');

                filteredUpdates.forEach(update => {
                    const card = document.createElement('div');
                    card.className = `update-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
                    card.dataset.id = update.id;
                    
                    const typeClass = update.type.toLowerCase();
                    const emoji = emojiMap[typeClass] || 'ℹ️';

                    card.innerHTML = `
                        <div class="card-header">
                            <span class="badge ${typeClass}">${update.type}</span>
                            <div class="card-actions">
                                <button class="btn-card-action btn-copy-card" title="Copy text to clipboard">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                                <span class="tweet-action-hint">
                                    <i class="fa-brands fa-x-twitter"></i> Select to Tweet
                                </span>
                            </div>
                        </div>
                        <div class="update-desc">
                            ${update.content_html}
                        </div>
                    `;

                    // Copy card text event
                    const copyBtn = card.querySelector('.btn-copy-card');
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent card selection and side composer popup
                        navigator.clipboard.writeText(update.content_text).then(() => {
                            showToast('Update copied to clipboard!');
                            
                            const icon = copyBtn.querySelector('i');
                            copyBtn.classList.add('copied');
                            icon.className = 'fa-solid fa-check';
                            
                            setTimeout(() => {
                                copyBtn.classList.remove('copied');
                                icon.className = 'fa-regular fa-copy';
                            }, 2000);
                        }).catch(err => {
                            console.error('Failed to copy card text:', err);
                        });
                    });

                    // Card select event
                    card.addEventListener('click', (e) => {
                        // Prevent click triggering if user is clicking an anchor tag inside description or copy button
                        if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('.btn-copy-card')) {
                            return;
                        }
                        selectUpdateItem(update, entry);
                    });

                    itemsContainer.appendChild(card);
                });

                timelineContent.appendChild(groupDiv);
            }
        });

        if (matchedAny) {
            timelineEmpty.style.display = 'none';
            timelineContent.style.display = 'block';
        } else {
            timelineEmpty.style.display = 'block';
            timelineContent.style.display = 'none';
        }
    }

    // Select Update Item and Populate Composer
    function selectUpdateItem(update, entry) {
        selectedUpdate = update;
        
        // Visual Selection update
        document.querySelectorAll('.update-card').forEach(card => {
            if (card.dataset.id === update.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Set Details in Composer
        selectedTypeBadge.className = `badge ${update.type.toLowerCase()}`;
        selectedTypeBadge.textContent = update.type;
        selectedDateText.textContent = entry.date;
        selectedHtmlContent.innerHTML = update.content_html;

        // Generate draft Tweet text
        const typeEmoji = emojiMap[update.type.toLowerCase()] || 'ℹ️';
        const formattedDate = entry.date;
        const linkStr = entry.url || "https://cloud.google.com/bigquery/docs/release-notes";
        
        // Default text layout
        const prefix = `BigQuery ${typeEmoji} [${update.type}] (${formattedDate}):\n`;
        const suffix = `\n\nRead details: ${linkStr}`;
        
        // Truncate detail text to fit X 280 limit (taking link as 23 chars)
        // Standard template length = prefix length + suffix length + 23 (Twitter link placeholder)
        const dummyLink = "https://t.co/xxxxxxxxxx";
        const dummySuffix = `\n\nRead details: ${dummyLink}`;
        const overheadLength = prefix.length + dummySuffix.length;
        const availableTextChars = 280 - overheadLength;
        
        let detailText = update.content_text;
        if (detailText.length > availableTextChars) {
            detailText = detailText.substring(0, availableTextChars - 3) + '...';
        }
        
        const defaultTweet = `${prefix}${detailText}\n\nRead details: ${linkStr}`;
        
        tweetTextarea.value = defaultTweet;
        
        // Show Composer
        composerUnselected.style.display = 'none';
        composerCard.style.display = 'flex';
        composerContainer.classList.add('active'); // For mobile popup drawer

        // Update counts
        handleTweetTextChange();
    }

    // Tweet Textarea Change Handler (counts char lengths accurately)
    function handleTweetTextChange() {
        const text = tweetTextarea.value;
        const maxChars = 280;
        
        // Twitter count: Replace any link with a 23 character placeholder
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const textForCounting = text.replace(urlRegex, "12345678901234567890123");
        const count = textForCounting.length;

        charCountText.textContent = `${count} / ${maxChars}`;
        
        const percent = Math.min((count / maxChars) * 100, 100);
        setProgress(percent);

        // Highlight visual boundaries
        if (count > maxChars) {
            charCountText.className = 'char-count danger';
            progressRingCircle.style.stroke = '#ef4444';
            btnTweet.disabled = true;
        } else if (count > maxChars - 20) {
            charCountText.className = 'char-count warning';
            progressRingCircle.style.stroke = '#f59e0b';
            btnTweet.disabled = false;
        } else {
            charCountText.className = 'char-count';
            progressRingCircle.style.stroke = '#38bdf8';
            btnTweet.disabled = false;
        }
    }

    // Tweet Text Area Listeners
    tweetTextarea.addEventListener('input', handleTweetTextChange);

    // Filter Chips Click handler
    filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        activeFilter = chip.dataset.type;
        renderTimeline();
    });

    // Search Input listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        renderTimeline();
    });

    // Clear Search Input
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    // Refresh Action
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Export to CSV Action
    btnExportCSV.addEventListener('click', () => {
        const csvRows = [
            ['Date', 'Type', 'Description', 'URL'] // Header row
        ];
        
        let exportCount = 0;
        releaseNotesData.forEach(entry => {
            entry.updates.forEach(update => {
                const matchesType = activeFilter === 'all' || 
                    update.type.toLowerCase() === activeFilter.toLowerCase();
                const matchesSearch = searchQuery === '' || 
                    update.type.toLowerCase().includes(searchQuery) ||
                    update.content_text.toLowerCase().includes(searchQuery) ||
                    entry.date.toLowerCase().includes(searchQuery);
                    
                if (matchesType && matchesSearch) {
                    const dateClean = entry.date.replace(/"/g, '""');
                    const typeClean = update.type.replace(/"/g, '""');
                    const textClean = update.content_text.replace(/"/g, '""');
                    const urlClean = (entry.url || '').replace(/"/g, '""');
                    
                    csvRows.push([
                        `"${dateClean}"`,
                        `"${typeClean}"`,
                        `"${textClean}"`,
                        `"${urlClean}"`
                    ]);
                    exportCount++;
                }
            });
        });
        
        if (exportCount === 0) {
            showToast('No updates found to export!');
            return;
        }
        
        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Successfully exported ${exportCount} updates to CSV!`);
    });

    // Retry Action (from error screen)
    btnRetry.addEventListener('click', () => {
        fetchReleaseNotes(false);
    });

    // Close Composer Panel
    btnCloseComposer.addEventListener('click', () => {
        selectedUpdate = null;
        composerContainer.classList.remove('active');
        composerCard.style.display = 'none';
        composerUnselected.style.display = 'flex';
        
        // Remove active selection borders
        document.querySelectorAll('.update-card').forEach(card => {
            card.classList.remove('selected');
        });
    });

    // Copy to Clipboard Action
    btnCopy.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Draft copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            tweetTextarea.select();
            document.execCommand('copy');
            showToast('Draft copied to clipboard!');
        });
    });

    // Open Web Intent for Tweeting
    btnTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
    });

    // Toast Alert Helper
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Initial load
    fetchReleaseNotes(false);
});
