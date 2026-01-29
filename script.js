// ============================================
// STORAGE WRAPPER (with error handling)
// ============================================
const storage = {
    get: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('localStorage get error:', e);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('localStorage set error:', e);
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('localStorage remove error:', e);
        }
    }
};

// ============================================
// DOM ELEMENTS
// ============================================
const searchInput = document.getElementById("searchInput");
const micIcon = document.querySelector(".mic-icon");
const clearBtn = document.getElementById("clearBtn");
const historyDropdown = document.getElementById("historyDropdown");
const searchBox = document.querySelector(".search-box");
searchBox.addEventListener("click", function () {
    searchInput.focus();
});

const searchContainer = document.querySelector(".search-container");

// ============================================
// CONSTANTS
// ============================================
const DEFAULT_PLACEHOLDER = "Search anything or type a URL";
// ============================================
// STATE
// ============================================
let recognition = null;
let isVoiceActive = false;
let isRecognitionRunning = false;

// ============================================
// SEARCH HISTORY MANAGEMENT
// ============================================
function getSearchHistory() {
    const history = storage.get('searchHistory');
    if (!history) return [];
    try {
        return JSON.parse(history);
    } catch (e) {
        return [];
    }
}

function saveSearchHistory(query) {
    if (!query || query.trim().length === 0) return;

    let history = getSearchHistory();

    history = history.filter(item => item !== query);

    history.unshift(query);

    storage.set('searchHistory', JSON.stringify(history));
}
function deleteHistoryItem(query) {
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    storage.set('searchHistory', JSON.stringify(history));

    const text = searchInput.value.trim();

    // If history is empty, hide dropdown
    if (history.length === 0) {
        hideHistoryDropdown();
        historyDropdown.innerHTML = "";
        return;
    }

    // Otherwise keep history visible
    renderHistoryDropdown(text);
}
function renderHistoryDropdown(inputText = "") {
    const history = getSearchHistory();
    if (history.length === 0) {
        hideHistoryDropdown();
        return;
    }

    const text = inputText.trim().toLowerCase();

    // If search box is empty
    if (text === "") {
        const visibleList = history.slice(0, 5);
        renderHistoryHTML(visibleList);
        return;
    }

    // Items that start with the search text
    let filtered = history.filter(item =>
        item.toLowerCase().startsWith(text)
    );

    // If nothing matches
    if (filtered.length === 0) {
        hideHistoryDropdown();
        historyDropdown.innerHTML = "";
        return;
    }

    // Alphabetical order (A → Z)
    filtered.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const visibleList = filtered.slice(0, 5);
    renderHistoryHTML(visibleList);
}


function showHistoryDropdown() {
    const history = getSearchHistory();
    if (history.length === 0) return;

    renderHistoryDropdown();
    historyDropdown.classList.add('show');
    searchContainer.classList.add('history-open');
}

function hideHistoryDropdown() {
    historyDropdown.classList.remove('show');
    searchContainer.classList.remove('history-open');
}

// ============================================
// SEARCH ENGINE MANAGEMENT
// ============================================
function getSearchEngine() {
    const engine = storage.get('searchEngine');
    const validEngines = ['google', 'duckduckgo', 'bing', 'brave', 'yahoo', 'startpage', 'ecosia'];

    if (validEngines.includes(engine)) {
        return engine;
    }

    return 'google';
}

function buildSearchUrl(query) {
    const engine = getSearchEngine();
    const encoded = encodeURIComponent(query);

    switch (engine) {
        case 'duckduckgo':
            return "https://duckduckgo.com/?q=" + encoded;
        case 'bing':
            return "https://www.bing.com/search?q=" + encoded;
        case 'brave':
            return "https://search.brave.com/search?q=" + encoded;
        case 'yahoo':
            return "https://search.yahoo.com/search?p=" + encoded;
        case 'startpage':
            return "https://www.startpage.com/do/search?q=" + encoded;
        case 'ecosia':
            return "https://www.ecosia.org/search?q=" + encoded;
        default:
            return "https://www.google.com/search?q=" + encoded;
    }
}

// ============================================
// URL DETECTION
// ============================================
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function isLikelyUrl(text) {
    try {
        const input = text.trim();

        if (!input) return false;
        if (/\s/.test(input)) return false;

        // Don't treat single words as URLs
        if (!input.includes(".") && !input.includes(":")) {
            return false;
        }

        const url = input.includes("://")
            ? input
            : "https://" + input;

        new URL(url);
        return true;

    } catch (e) {
        return false;
    }
}

function buildUrl(text) {
    let query = (text || "").trim();
    if (!query) return null;

    if (isLikelyUrl(query)) {
        if (!query.startsWith("http://") && !query.startsWith("https://")) {
            query = "https://" + query;
        }
        return query;
    }

    return buildSearchUrl(query);
}


// ============================================
// SEARCH EXECUTION
// ============================================
function executeSearch(query, openInNewTab = false) {
    if (!query) return;

    const url = buildUrl(query);
    if (!url) return;

    if (!isLikelyUrl(query)) {
        saveSearchHistory(query);
    }

    if (openInNewTab) {
        window.open(url, "_blank");
    } else {
        window.location.href = url;
    }
}

// ============================================
// VOICE RECOGNITION SETUP
// ============================================
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function () {
        isRecognitionRunning = true;
    };

    recognition.onresult = function (event) {
        isVoiceActive = false;
        isRecognitionRunning = false;

        if (micIcon) {
            micIcon.classList.remove("listening");
        }

        if (event.results && event.results.length > 0) {
            const text = event.results[0][0].transcript;
            searchInput.value = text;
            clearBtn.classList.add('visible');
        }

        searchInput.placeholder = DEFAULT_PLACEHOLDER;

        if (searchInput.value.trim().length > 0) {
            clearBtn.classList.add('visible');
        }
    };

    recognition.onend = function () {
        isRecognitionRunning = false;

        if (isVoiceActive) {
            isVoiceActive = false;

            if (micIcon) {
                micIcon.classList.remove("listening");
            }
        }

        searchInput.placeholder = DEFAULT_PLACEHOLDER;

        if (searchInput.value.trim().length > 0) {
            clearBtn.classList.add('visible');
        }
    };

    recognition.onerror = function (event) {
        console.error("Voice error:", event.error);
        isVoiceActive = false;
        isRecognitionRunning = false;

        if (micIcon) {
            micIcon.classList.remove("listening");
        }

        searchInput.placeholder = "Voice access unavailable";
        clearBtn.classList.add('visible');

        setTimeout(() => {
            if (searchInput.value.trim().length === 0) {
                searchInput.placeholder = DEFAULT_PLACEHOLDER;
                clearBtn.classList.remove('visible');
            }
        }, 3000);
    };
}

function startVoice() {
    if (!recognition) {
        alert("Voice search is not supported in your browser.");
        return;
    }

    if (isVoiceActive || isRecognitionRunning) {
        isVoiceActive = false;

        if (micIcon) {
            micIcon.classList.remove("listening");
        }

        searchInput.placeholder = DEFAULT_PLACEHOLDER;

        try {
            recognition.stop();
        } catch (e) {
            // Ignore error
        }

        return;
    }

    isVoiceActive = true;

    if (micIcon) {
        micIcon.classList.add("listening");
    }

    searchInput.placeholder = "Listening...";
    clearBtn.classList.add('visible');
    hideHistoryDropdown();

    try {
        recognition.stop();
    } catch (e) {
        // Ignore error
    }

    setTimeout(() => {
        try {
            recognition.start();
        } catch (err) {
            console.error("Recognition start failed:", err);
            isVoiceActive = false;

            if (micIcon) {
                micIcon.classList.remove("listening");
            }

            searchInput.placeholder = "Voice start failed";

            setTimeout(() => {
                searchInput.placeholder = DEFAULT_PLACEHOLDER;
            }, 3000);
        }
    }, 100);
}

// ============================================
// CLEAR BUTTON LOGIC
// ============================================
function handleClear() {
    searchInput.value = "";
    searchInput.placeholder = DEFAULT_PLACEHOLDER;
    clearBtn.classList.remove('visible');

    if (isVoiceActive && recognition) {
        isVoiceActive = false;
        isRecognitionRunning = false;

        if (micIcon) {
            micIcon.classList.remove("listening");
        }

        try {
            recognition.stop();
        } catch (e) {
            // Ignore
        }
    }

    searchInput.focus();
    renderHistoryDropdown("");
}

// ============================================
// EVENT LISTENERS
// ============================================

searchInput.addEventListener("focus", function () {
    if (searchBox) {
        searchBox.classList.add("focused");
    }

    if (searchInput.value.trim().length === 0) {
        showHistoryDropdown();
    }
});

// BUG FIX: Remove focused class on blur
searchInput.addEventListener("blur", function () {
    if (searchBox) {
        searchBox.classList.remove("focused");
    }
    
    setTimeout(() => {
        if (historyDropdown.contains(document.activeElement)) return;
        hideHistoryDropdown();
    }, 200);
});

searchInput.addEventListener("input", function () {
    const text = this.value.trim();

    if (text.length > 0) {
        clearBtn.classList.add("visible");
    } else {
        clearBtn.classList.remove("visible");
    }

    renderHistoryDropdown(text);

    if (isVoiceActive && recognition) {
        try { recognition.stop(); } catch (e) { }
        micIcon.classList.remove("listening");
        isVoiceActive = false;
        isRecognitionRunning = false;
        searchInput.placeholder = DEFAULT_PLACEHOLDER;
    }
});

searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        const query = searchInput.value.trim();
        if (!query) return;

        if (e.shiftKey) {
            executeSearch(query, true);
            return;
        }

        executeSearch(query, false);
    }
});

clearBtn.addEventListener("click", handleClear);

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        handleClear();
        return;
    }

    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInput.focus();
        return;
    }

    if (mod && e.key && e.key.toLowerCase() === "l") {
        e.preventDefault();
        searchInput.focus();
        setTimeout(() => {
            searchInput.select();
        }, 0);
        return;
    }
});

if (historyDropdown) {
    // Prevent input blur when clicking inside history
    historyDropdown.addEventListener("mousedown", function (e) {
        e.preventDefault();
    });

    historyDropdown.addEventListener('click', function (e) {
        if (e.target.classList.contains('history-text')) {
            const query = e.target.getAttribute('data-query');
            if (query) {
                searchInput.value = query;
                executeSearch(query, false);
            }
        }

        if (e.target.classList.contains('history-delete')) {
            e.stopPropagation();
            const query = e.target.getAttribute('data-query');
            if (query) {
                deleteHistoryItem(query);
            }
        }
    });
}

document.addEventListener("click", function (e) {
    if (!searchContainer.contains(e.target)) {
        hideHistoryDropdown();
    }
});

// ============================================
// MENU FUNCTIONALITY
// ============================================
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

if (menuBtn && menu) {
    menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        menu.classList.toggle("show");
    });

    menuBtn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            menu.classList.toggle("show");
        }
    });

    const menuItems = menu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            menu.classList.remove('show');
        });
    });

    document.addEventListener("click", function (e) {
        if (!menuBtn.contains(e.target)) {
            menu.classList.remove("show");
        }
    });
}

// ============================================
// THEME INITIALIZATION
// ============================================
const savedTheme = storage.get('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

function renderHistoryHTML(list) {
    let html = "";

    list.forEach(item => {
        html += `
            <div class="history-item" role="menuitem">
                <div class="history-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>

                <div class="history-text" data-query="${escapeHTML(item)}">
                    ${escapeHTML(item)}
                </div>

                <button class="history-delete"
                        data-query="${escapeHTML(item)}">×</button>
            </div>
        `;
    });

    historyDropdown.innerHTML = html;
}
