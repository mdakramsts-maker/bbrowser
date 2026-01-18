        const searchInput = document.getElementById("searchInput");
        const micIcon = document.querySelector(".mic-icon");
        const clearBtn = document.getElementById("clearBtn");
        const suggestionBox = document.getElementById("suggestionBox");
        const searchBox = document.querySelector(".search-box"); // 🔹 for focus animation

        const DEFAULT_PLACEHOLDER = "Search anything or type a URL";
        let recognition = null; // upar define, niche assign
        let isMicOn = false; // 🔥 toggle state

        // ----------------------------
        // 🔹 Make whole search-box clickable
        // Ignore clicks on mic-icon and clearBtn so their handlers work normally
        // ----------------------------
        if (searchBox) {
            searchBox.addEventListener("click", function (e) {
                const clickedInsideMic = micIcon && micIcon.contains(e.target);
                const clickedClearBtn = clearBtn && (e.target === clearBtn || clearBtn.contains(e.target));
                if (!clickedInsideMic && !clickedClearBtn) {
                    searchInput.focus();
                }
            });
        }

        // ✅ Valid TLD list for URL check
        const VALID_TLDS = [
            "com","net","org","co","in","io",
           "info","me","biz","pro","tv","ai",
           "app","dev","online","tech","shop","store",
           "live","site","blog","cloud","digital",
           "news","media","services","world","fun",
           "company","solutions","agency","network","support"
        ];

        // ----------------------------
        // ✅ XSS fix: escape helper (only change requested)
        // ----------------------------
        function escapeHTML(str) {
            if (!str) return "";
            return str.replace(/[&<>"']/g, function (m) {
                return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m];
            });
        }

        // ✅ Check kare ki text "likely URL" hai ya nahi
        function isLikelyUrl(text) {
            const query = (text || "").trim();

            if (!query) return false;

            // Agar space hai → URL mat maano
            if (/\s/.test(query)) return false;

            // Agar allerede http/https se start hai → URL hi hai
            if (/^[a-zA-Z]+:\/\//.test(query)) {
                return true;
            }

            // Sirf domain part lo (path ke pehle tak)
            const domainPart = query.split("/")[0].split("?")[0].split("#")[0];

            // Dot hona chahiye (jaise example.com)
            if (!domainPart.includes(".")) {
                // allow localhost
                if (domainPart.toLowerCase() === "localhost") return true;
                return false;
            }

            const parts = domainPart.split(".");
            if (parts.length < 2) return false;

            const tld = parts[parts.length - 1].toLowerCase();

            // Agar TLD hamari list me hai to URL maante hain
            return VALID_TLDS.includes(tld);
        }

        // ✅ Common URL builder (ab smart URL check ke saath)
        function buildUrl(text) {
            let query = (text || "").trim();
            if (!query) return null;

            if (/^[a-zA-Z]+:\/\//.test(query)) {
                return query;
            }

            if (isLikelyUrl(query)) {
                if (!query.startsWith("http://") && !query.startsWith("https://")) {
                    query = "https://" + query;
                }
                return query;
            } else {
                return "https://www.google.com/search?q=" + encodeURIComponent(query);
            }
        }

        // ✅ Keyboard se search (Enter) → same tab + Opening/Searching text
        function runSearchFromKeyboard() {
            const text = searchInput.value.trim();
            const url = buildUrl(text);
            if (!url) return;

            if (isLikelyUrl(text)) {
                suggestionBox.innerHTML = `Opening: <span class="query">${escapeHTML(url)}</span>`;
            } else {
                suggestionBox.innerHTML = `Searching for: <span class="query">${escapeHTML(text)}</span>`;
            }

            // 🔹 show animation for suggestion
            suggestionBox.classList.add("show");

            window.location.href = url; // SAME TAB
        }

        // *** MANDATORY FIX ADDED: runSearchFromVoice function (minimal safe implementation)
        function runSearchFromVoice(transcript) {
            if (!transcript) return;
            // set the input value
            searchInput.value = transcript;

            // show suggestion safely (use textContent + span)
            suggestionBox.textContent = "";
            const prefixText = isLikelyUrl(transcript) ? "Opening:" : "Searching for:";
            suggestionBox.textContent = prefixText + " ";
            const span = document.createElement('span');
            span.className = 'query';
            span.textContent = transcript;
            suggestionBox.appendChild(span);
            suggestionBox.classList.add('show');

            // perform the search/open
            const url = buildUrl(transcript);
            if (!url) return;
            // same behavior as keyboard (same tab)
            window.location.href = url;
        }

        // ENTER se normal search
        searchInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.keyCode === 13) {

                // SHIFT+ENTER -> open in new tab
                if (e.shiftKey) {
                    const text = searchInput.value.trim();
                    const url = buildUrl(text);
                    if (!url) return;
                    window.open(url, "_blank");
                    return;
                }

                runSearchFromKeyboard();
            }
        });

        // ----------------------------
        // 🔹 Global keyboard shortcuts (Escape, Ctrl/Cmd+K, Ctrl/Cmd+L)
        // ----------------------------
        document.addEventListener("keydown", function (e) {
            // Escape → clear input + hide suggestions
            if (e.key === "Escape") {
                searchInput.value = "";
                suggestionBox.innerHTML = "";
                suggestionBox.classList.remove("show");
                clearBtn.style.display = "none";
                searchInput.focus();
                return;
            }

            // Support both Ctrl (Windows/Linux) and Cmd (Mac)
            const mod = e.ctrlKey || e.metaKey;

            // Ctrl/Cmd + K → focus search input
            if (mod && e.key && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInput.focus();
                return;
            }

            // Ctrl/Cmd + L → focus + select all text in input
            if (mod && e.key && e.key.toLowerCase() === "l") {
                e.preventDefault();
                searchInput.focus();
                // small timeout to ensure focus before select
                setTimeout(() => {
                    searchInput.select();
                }, 0);
                return;
            }
        });

        // 🔹 Focus/blur par search-box animation
        searchInput.addEventListener("focus", function () {
            if (searchBox) {
                searchBox.classList.add("focused");
            }
        });

        searchInput.addEventListener("blur", function () {
            if (searchBox) {
                searchBox.classList.remove("focused");
            }
        });

        // Type karte wart update
        searchInput.addEventListener("input", function () {
            const text = this.value.trim();
            updateSuggestion(text);

            // Clear button show/hide
            if (text.length > 0) {
                clearBtn.style.display = "inline";
            } else {
                clearBtn.style.display = "none";
            }

            // Agar user type kare → mic listening band + placeholder normal + border normal
            if (micIcon && micIcon.classList.contains("listening")) {
                micIcon.classList.remove("listening");
            }
            if (micIcon) {
                micIcon.style.borderColor = "#eca50b";
            }
            searchInput.placeholder = DEFAULT_PLACEHOLDER;

            if (recognition) {
                try {
                    recognition.stop();
                } catch (e) {
                    // ignore
                }
            }
            isMicOn = false;
        });

        function updateSuggestion(text) {
            if (!text) {
                suggestionBox.innerHTML = "";
                suggestionBox.classList.remove("show"); // 🔹 hide animation
                return;
            }
            suggestionBox.innerHTML = `Search for: <span class="query">${escapeHTML(text)}</span>`;

            // 🔹 trigger animation
            requestAnimationFrame(() => {
                suggestionBox.classList.add("show");
            });
        }

        // ❌ Clear button click → text + suggestion clear
        clearBtn.addEventListener("click", function () {
            searchInput.value = "";
            suggestionBox.innerHTML = "";
            suggestionBox.classList.remove("show"); // 🔹 hide
            clearBtn.style.display = "none";
            searchInput.placeholder = DEFAULT_PLACEHOLDER;

            // Safety: mic ko normal state me rakho
            if (micIcon) {
                micIcon.classList.remove("listening");
                micIcon.style.borderColor = "#eca50b";
            }
            if (recognition) {
                try {
                    recognition.stop();
                } catch (e) {}
            }
            isMicOn = false;
            searchInput.focus();
        });

        // 🎤 VOICE SEARCH
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = "en-IN";
            recognition.interimResults = false;
            recognition.continuous = false;

            recognition.onresult = function (event) {
                const transcript = event.results[0][0].transcript;
                searchInput.value = transcript;

                // Mic se bola → text set → bina Enter dabaye direct search
                runSearchFromVoice(transcript);
            };

            // 🎧 Mic khatam hone par listening state hatao
            recognition.onend = function () {
                isMicOn = false;
                if (micIcon) {
                    micIcon.classList.remove("listening");
                    micIcon.style.borderColor = "#eca50b";
                }
            };

            recognition.onerror = function (event) {
                console.error("Voice error:", event.error);
                isMicOn = false;
                if (micIcon) {
                    micIcon.classList.remove("listening");
                    micIcon.style.borderColor = "red"; // error pe red border
                }

                // Placeholder me hi error message
                searchInput.placeholder = "Voice access unavailable.";

                // Suggestion box clear (optional)
                suggestionBox.innerHTML = "";
                suggestionBox.classList.remove("show"); // 🔹 hide
            };
        }

        // 🔥 Toggle mic on each click
        function startVoice() {
            if (!recognition) {
                alert("Voice search is not supported.");
                return;
            }

            // If mic already ON -> turn OFF
            if (isMicOn) {
                isMicOn = false;
                if (micIcon) {
                    micIcon.classList.remove("listening");
                    micIcon.style.borderColor = "#eca50b";
                }
                searchInput.placeholder = DEFAULT_PLACEHOLDER;
                try {
                    recognition.stop();
                } catch (e) {
                    // ignore
                }
                return;
            }

            // If mic OFF -> turn ON
            isMicOn = true;
            if (micIcon) {
                micIcon.classList.add("listening");
                micIcon.style.borderColor = "#eca50b";
            }
            searchInput.placeholder = "Listening...";
            try {
                recognition.start();
            } catch (err) {
                console.error("recognition.start() failed:", err);
                // revert state on failure
                isMicOn = false;
                if (micIcon) {
                    micIcon.classList.remove("listening");
                    micIcon.style.borderColor = "red";
                }
                searchInput.placeholder = "Voice start failed.";
            }
        }
            
        /* =========================
            TOP RIGHT MENU LOGIC
           ========================= */

const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

if (menuBtn && menu) {

    // menu toggle
    menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        menu.classList.toggle("show");
    });

    // menu ke andar click -> close na ho
    menu.addEventListener("click", function (e) {
        e.stopPropagation();
    });

    // bahar click -> menu band
    document.addEventListener("click", function () {
        menu.classList.remove("show");
    });
}



/* --- DARK MODE LOADER (Sabse Upar Paste Karein) --- */
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

/* ... Iske niche aapka purana search code ... */
document.addEventListener("DOMContentLoaded", () => {
    // ... baaki sara code ...
});