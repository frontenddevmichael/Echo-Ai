// =========================================
// ECHO CHAT - FULL FEATURED VERSION WITH MARKDOWN
// Working Gemini AI Integration with Markdown Support
// =========================================

class EchoChat {
    constructor() {
        this.eventHandlers = [];
        this.timeouts = [];
        this.intervals = [];
        this.isGuest = true;

        this.CONFIG = {
            BOT_RESPONSE_DELAY: 1500,
            MAX_STORED_MESSAGES: 60,
            DRAFT_SAVE_DELAY: 500,
            FEEDBACK_DURATION: 2500,
            ANIMATION_DURATION: 300,
            MAX_MESSAGE_LENGTH: 5000
        };

        // UPDATED: Using new working API key with correct model names
        this.API_CONFIG = {
            GEMINI_API_KEY: 'AIzaSyB8ai1DzTRRJiZG8zWa_iBUn469xHGEm5I',
            GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
            MODEL: 'models/gemini-2.0-flash',
            VISION_MODEL: 'models/gemini-2.0-flash'
        };

        this.STORAGE_KEYS = {
            messages: 'echo-chat-messages',
            theme: 'echo-chat-theme',
            drafts: 'echo-chat-drafts',
            mode: 'echo-chat-mode',
            userStatus: 'echo-chat-user-status',
            conversationHistory: 'echo-chat-conversation-history'
        };

        this.conversationHistory = [];
        this.currentImage = null;
        this.VALID_MESSAGE_TYPES = new Set(['user', 'bot']);

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.initElements();
        this.checkUserStatus();
        this.attachEventListeners();
        this.initAnimations();
        this.initTheme();
        this.initMarkdown();
        this.loadMessageHistory();
        this.loadConversationHistory();
        this.loadDraft();
        console.log('Echo Chat initialized successfully');
    }

    // =========================================
    // MARKDOWN INITIALIZATION
    // =========================================
    initMarkdown() {
        // Configure marked.js if available
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: true,
                mangle: false,
                sanitize: false // We'll use DOMPurify for sanitization
            });
            console.log('Marked.js configured successfully');
        } else {
            console.warn('Marked.js not loaded. Markdown rendering will be disabled.');
        }

        // Check if DOMPurify is available
        if (typeof DOMPurify === 'undefined') {
            console.warn('DOMPurify not loaded. HTML sanitization will be limited.');
        }
    }

    // =========================================
    // MARKDOWN RENDERING
    // =========================================
    parseMarkdown(text) {
        try {
            if (typeof marked === 'undefined') {
                // Fallback: basic text formatting
                return this.basicTextFormat(text);
            }

            // Parse markdown to HTML
            let html = marked.parse(text);

            // Sanitize HTML with DOMPurify
            if (typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
                        'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2',
                        'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody',
                        'tr', 'th', 'td', 'img', 'hr', 'del', 'ins'],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
                    ALLOW_DATA_ATTR: false
                });
            }

            return html;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return this.basicTextFormat(text);
        }
    }

    basicTextFormat(text) {
        // Basic fallback formatting
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    // =========================================
    // ELEMENT INITIALIZATION
    // =========================================
    initElements() {
        this.input = document.querySelector('input[type="text"]');
        this.sendBtn = document.querySelector('.send-btn');
        this.inputWrapper = document.querySelector('.input-wrapper');
        this.attachBtn = document.querySelector('.tool-btn:nth-child(1)');
        this.imageBtn = document.querySelector('.tool-btn:nth-child(2)');
        this.pills = document.querySelectorAll('.pill');
        this.topBar = document.querySelector('.topBar');
        this.kickoffMode = document.getElementById('kickoffMode');
        this.chatMode = document.getElementById('chatMode');
        this.messagesContainer = document.querySelector('.messages-container');
        this.messagesList = document.getElementById('messagesList');
        this.emptyState = document.getElementById('emptyState');
        this.messageCount = document.querySelector('.message-count');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.themeToggle = document.querySelector('.theme-toggle');

        if (this.input) {
            this.input.setAttribute('aria-label', 'Type your message');
            this.input.setAttribute('maxlength', this.CONFIG.MAX_MESSAGE_LENGTH);
        }
        if (this.sendBtn) this.sendBtn.setAttribute('aria-label', 'Send message');
        if (this.attachBtn) this.attachBtn.setAttribute('aria-label', 'Attach file');
        if (this.imageBtn) this.imageBtn.setAttribute('aria-label', 'Upload image');
        if (this.messagesList) {
            this.messagesList.setAttribute('role', 'log');
            this.messagesList.setAttribute('aria-live', 'polite');
            this.messagesList.setAttribute('aria-atomic', 'false');
            this.messagesList.setAttribute('aria-label', 'Chat messages');
        }
        if (this.clearHistoryBtn) this.clearHistoryBtn.setAttribute('aria-label', 'Clear chat history');
    }

    addEventHandler(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this.eventHandlers.push({ element, event, handler });
    }

    addTimeout(callback, delay) {
        const timeoutId = setTimeout(callback, delay);
        this.timeouts.push(timeoutId);
        return timeoutId;
    }

    addInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.intervals.push(intervalId);
        return intervalId;
    }

    isElementReady(element) {
        return element && element.nodeType === Node.ELEMENT_NODE;
    }

    // =========================================
    // USER STATUS
    // =========================================
    checkUserStatus() {
        const userStatus = localStorage.getItem(this.STORAGE_KEYS.userStatus);
        this.isGuest = !userStatus || userStatus === 'guest';
    }

    setUserAsLoggedIn() {
        this.isGuest = false;
        localStorage.setItem(this.STORAGE_KEYS.userStatus, 'logged-in');
        this.hideGuestBadge();
        this.showNavBar();
    }

    setUserAsGuest() {
        this.isGuest = true;
        localStorage.setItem(this.STORAGE_KEYS.userStatus, 'guest');
    }

    showGuestMode() {
        this.hideNavBar();
        this.showGuestBadge();
    }

    showGuestBadge() {
        this.hideGuestBadge();
        this.guestBadge = document.createElement('div');
        this.guestBadge.className = 'guest-badge';
        this.guestBadge.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span>Guest Mode</span>
        `;
        document.body.appendChild(this.guestBadge);
    }

    hideGuestBadge() {
        if (this.guestBadge) {
            this.guestBadge.remove();
            this.guestBadge = null;
        }
        const existingBadges = document.querySelectorAll('.guest-badge');
        existingBadges.forEach(badge => badge.remove());
    }

    hideNavBar() {
        if (this.topBar) {
            this.topBar.classList.add('hidden');
        }
    }

    showNavBar() {
        if (this.topBar) {
            this.topBar.classList.remove('hidden');
        }
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================
    attachEventListeners() {
        if (this.input) {
            this.addEventHandler(this.input, 'input', (e) => this.handleInput(e));
            this.addEventHandler(this.input, 'keypress', (e) => this.handleKeyPress(e));
            this.addEventHandler(this.input, 'focus', () => this.handleInputFocus());
            this.addEventHandler(this.input, 'blur', () => this.handleInputBlur());
        }
        if (this.sendBtn) {
            this.addEventHandler(this.sendBtn, 'click', () => this.handleSend());
        }
        if (this.attachBtn) {
            this.addEventHandler(this.attachBtn, 'click', () => this.handleAttachment());
        }
        if (this.imageBtn) {
            this.addEventHandler(this.imageBtn, 'click', () => this.handleImage());
        }
        this.pills.forEach(pill => {
            this.addEventHandler(pill, 'click', (e) => this.handlePillClick(e));
        });
        if (this.clearHistoryBtn) {
            this.addEventHandler(this.clearHistoryBtn, 'click', () => this.clearMessageHistory());
        }
        if (this.themeToggle) {
            this.addEventHandler(this.themeToggle, 'click', () => this.toggleTheme());
        }
        this.addEventHandler(window, 'scroll', () => this.handleScroll());
        this.addEventHandler(window, 'resize', () => this.handleResize());
        this.addEventHandler(window, 'beforeunload', () => this.cleanup());
    }

    cleanup() {
        this.eventHandlers.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        this.eventHandlers = [];
        this.timeouts = [];
        this.intervals = [];
    }

    // =========================================
    // INPUT HANDLERS
    // =========================================
    handleInput(e) {
        if (!this.isElementReady(this.input)) return;
        const value = e.target.value;

        if (value.length > this.CONFIG.MAX_MESSAGE_LENGTH) {
            this.showFeedback(`Message too long (max ${this.CONFIG.MAX_MESSAGE_LENGTH} characters)`, 'error');
            this.input.value = value.substring(0, this.CONFIG.MAX_MESSAGE_LENGTH);
            return;
        }

        if (this.isElementReady(this.sendBtn)) {
            if (value.trim().length > 0) {
                this.sendBtn.style.opacity = '1';
                this.sendBtn.style.transform = 'scale(1)';
                this.sendBtn.disabled = false;
            } else {
                this.sendBtn.style.opacity = '0.5';
                this.sendBtn.style.transform = 'scale(0.95)';
                this.sendBtn.disabled = true;
            }
        }

        clearTimeout(this.draftTimeout);
        this.draftTimeout = this.addTimeout(() => this.saveDraft(), this.CONFIG.DRAFT_SAVE_DELAY);
    }

    handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    }

    handleInputFocus() {
        if (this.inputWrapper) {
            this.inputWrapper.style.transform = 'scale(1.01)';
            this.addHapticFeedback('light');
        }
    }

    handleInputBlur() {
        if (this.inputWrapper) {
            this.inputWrapper.style.transform = 'scale(1)';
        }
    }

    // =========================================
    // SEND MESSAGE
    // =========================================
    async handleSend() {
        if (!this.isElementReady(this.input) || !this.input.value.trim()) {
            if (!this.currentImage) {
                return;
            }
        }

        const message = this.input.value.trim() || "What's in this image?";

        if (message.length > this.CONFIG.MAX_MESSAGE_LENGTH) {
            this.showFeedback('Message too long', 'error');
            return;
        }

        try {
            if (this.kickoffMode && this.kickoffMode.style.display !== 'none') {
                this.switchToChatMode();
                if (this.isGuest) {
                    this.showGuestMode();
                }
            }

            const imageToSend = this.currentImage;

            console.log('Sending message:', message);
            console.log('With image:', imageToSend ? 'Yes' : 'No');

            const rendered = this.renderMessage(message, 'user', null, true, imageToSend);

            if (!rendered) {
                throw new Error('Failed to render message');
            }

            this.input.value = '';
            if (!this.isGuest) {
                this.clearDraft();
            }

            this.removeImagePreview();

            if (this.isElementReady(this.sendBtn)) {
                this.sendBtn.style.opacity = '0.5';
                this.sendBtn.style.transform = 'scale(0.95)';
                this.sendBtn.disabled = true;
            }

            this.showTypingIndicator();

            const response = await this.sendToGemini(message, imageToSend);

            this.hideTypingIndicator();
            this.renderMessage(response, 'bot', null, true, null, true); // Added markdown flag

        } catch (error) {
            this.hideTypingIndicator();
            this.renderMessage('Sorry, I encountered an error. Please try again.', 'bot');

            console.error('Error:', error);

            if (error.message.includes('API_KEY_INVALID')) {
                this.showFeedback('Invalid API key. Please check configuration.', 'error');
            } else if (error.message.includes('429')) {
                this.showFeedback('Rate limit reached. Please wait a moment.', 'error');
            } else if (error.message.includes('Failed to fetch')) {
                this.showFeedback('Network error. Check your connection.', 'error');
            } else {
                this.showFeedback('Failed to get response from AI', 'error');
            }

            this.addHapticFeedback('heavy');
        }
    }

    // =========================================
    // GEMINI API INTEGRATION
    // =========================================
    async sendToGemini(userMessage, imageData = null) {
        const endpoint = `${this.API_CONFIG.GEMINI_BASE_URL}/${this.API_CONFIG.MODEL}:generateContent`;
        const url = `${endpoint}?key=${this.API_CONFIG.GEMINI_API_KEY}`;

        let requestBody;

        if (imageData) {
            const base64Data = imageData.split(',')[1];
            const mimeType = imageData.split(';')[0].split(':')[1];

            requestBody = {
                contents: this.buildConversationContents(userMessage, {
                    mime_type: mimeType,
                    data: base64Data
                })
            };
        } else {
            requestBody = {
                contents: this.buildConversationContents(userMessage)
            };
        }

        try {
            console.log('=== GEMINI API REQUEST ===');
            console.log('URL:', url);
            console.log('Request Body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

            const responseText = await response.text();
            console.log('Response Body:', responseText);

            if (!response.ok) {
                let errorMessage = `API Error: ${response.status}`;

                try {
                    const errorData = JSON.parse(responseText);
                    console.error('Parsed Error:', errorData);

                    if (errorData.error) {
                        errorMessage = errorData.error.message || errorMessage;

                        // Specific error handling
                        if (errorData.error.code === 400) {
                            errorMessage = 'Invalid request format';
                        } else if (errorData.error.code === 403) {
                            errorMessage = 'API key invalid or API not enabled. Check Google Cloud Console.';
                        } else if (errorData.error.code === 429) {
                            errorMessage = 'Rate limit exceeded. Please wait a moment.';
                        }
                    }
                } catch (e) {
                    console.error('Could not parse error response:', e);
                    errorMessage = `${errorMessage} - ${responseText}`;
                }

                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            console.log('=== API SUCCESS ===');
            console.log('Full Response:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                console.error('Invalid response structure:', data);
                throw new Error('Invalid response format from API');
            }

            const botResponse = data.candidates[0].content.parts[0].text;
            console.log('Bot Response:', botResponse);

            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: botResponse }]
            });

            // Keep history manageable
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            // Save conversation history
            this.saveConversationHistory();

            return botResponse;

        } catch (error) {
            console.error('=== GEMINI API ERROR ===');
            console.error('Error Name:', error.name);
            console.error('Error Message:', error.message);
            console.error('Error Stack:', error.stack);
            throw error;
        }
    }

    buildConversationContents(userMessage, imageData = null) {
        const contents = [...this.conversationHistory];

        const currentParts = [{ text: userMessage }];

        if (imageData) {
            currentParts.push({
                inline_data: imageData
            });
        }

        contents.push({
            role: 'user',
            parts: currentParts
        });

        return contents;
    }

    // =========================================
    // TOOL BUTTON HANDLERS
    // =========================================
    handleAttachment() {
        this.showFeedback('Attachment feature coming soon', 'info');
        this.addHapticFeedback('light');

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx,.txt';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.showFeedback(`Selected: ${file.name}`, 'success');
                console.log('File selected:', file.name);
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        setTimeout(() => fileInput.remove(), 100);
    }

    handleImage() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    this.showFeedback('Image too large (max 10MB)', 'error');
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    this.showFeedback('Please select an image file', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    this.currentImage = event.target.result;
                    this.showImagePreview(file.name);
                    this.showFeedback(`Image selected: ${file.name}`, 'success');
                };
                reader.onerror = () => {
                    this.showFeedback('Failed to read image', 'error');
                };
                reader.readAsDataURL(file);
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        setTimeout(() => fileInput.remove(), 100);
        this.addHapticFeedback('light');
    }

    showImagePreview(filename) {
        this.removeImagePreview();

        const preview = document.createElement('div');
        preview.className = 'image-preview-mini';
        preview.innerHTML = `
            <div class="mini-thumb">
                <img src="${this.currentImage}" alt="Preview">
                <button class="remove-thumb" aria-label="Remove image">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        Object.assign(preview.style, {
            display: 'inline-block',
            position: 'relative',
            marginRight: '8px'
        });

        const thumbDiv = preview.querySelector('.mini-thumb');
        Object.assign(thumbDiv.style, {
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid var(--accent, #007aff)',
            cursor: 'pointer'
        });

        const img = preview.querySelector('img');
        Object.assign(img.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
        });

        const removeBtn = preview.querySelector('.remove-thumb');
        Object.assign(removeBtn.style, {
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#ff3b30',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: '2'
        });

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImagePreview();
        });

        thumbDiv.addEventListener('click', () => {
            this.showFullImage(this.currentImage);
        });

        if (this.inputWrapper) {
            if (!this.inputWrapper.querySelector('.input-content')) {
                const inputContent = document.createElement('div');
                inputContent.className = 'input-content';
                Object.assign(inputContent.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: '1',
                    padding: '8px'
                });

                const input = this.inputWrapper.querySelector('input[type="text"]');
                inputContent.appendChild(preview);
                inputContent.appendChild(input);

                const sendBtn = this.inputWrapper.querySelector('.send-btn');
                this.inputWrapper.insertBefore(inputContent, sendBtn);

                Object.assign(input.style, {
                    flex: '1',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent'
                });
            } else {
                const inputContent = this.inputWrapper.querySelector('.input-content');
                const input = inputContent.querySelector('input[type="text"]');
                inputContent.insertBefore(preview, input);
            }
        }

        this.imagePreview = preview;
    }

    removeImagePreview() {
        if (this.imagePreview) {
            this.imagePreview.remove();
            this.imagePreview = null;
        }
        this.currentImage = null;
    }

    showFullImage(imageData) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';

        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10001',
            cursor: 'pointer'
        });

        const img = document.createElement('img');
        img.src = imageData;
        img.alt = 'Full size image';

        Object.assign(img.style, {
            maxWidth: '90%',
            maxHeight: '90%',
            objectFit: 'contain',
            borderRadius: '8px'
        });

        modal.appendChild(img);
        modal.addEventListener('click', () => modal.remove());

        document.body.appendChild(modal);
        this.addHapticFeedback('light');
    }

    // =========================================
    // FEATURE PILL HANDLERS
    // =========================================
    handlePillClick(e) {
        const pill = e.currentTarget;
        const text = pill.textContent.trim();

        pill.style.transform = 'scale(0.95)';
        setTimeout(() => {
            pill.style.transform = '';
        }, 150);

        if (this.input) {
            this.input.value = text;
            this.input.focus();
            this.input.dispatchEvent(new Event('input'));
        }

        this.addHapticFeedback('light');
    }

    // =========================================
    // SCROLL HANDLING
    // =========================================
    handleScroll() {
        if (!this.topBar) return;
        const scrolled = window.scrollY > 10;
        if (scrolled) {
            this.topBar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
        } else {
            this.topBar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
        }
    }

    handleResize() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // =========================================
    // MESSAGE HISTORY
    // =========================================
    loadMessageHistory() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEYS.messages);
            const savedMode = localStorage.getItem(this.STORAGE_KEYS.mode);

            if (stored) {
                const messages = JSON.parse(stored);
                if (messages.length > 0) {
                    this.switchToChatMode();
                    if (this.emptyState) {
                        this.emptyState.style.display = 'none';
                    }
                    messages.forEach(msg => this.renderMessage(msg.text, msg.type, msg.timestamp, false, msg.image, msg.isMarkdown));
                    this.updateMessageCount();
                }
            } else if (savedMode === 'chat') {
                this.switchToChatMode();
            }
        } catch (error) {
            console.error('Error loading message history:', error);
        }
    }

    saveMessageHistory(message, type, imageData = null, isMarkdown = false) {
        if (this.isGuest) return true;

        try {
            const stored = localStorage.getItem(this.STORAGE_KEYS.messages);
            const messages = stored ? JSON.parse(stored) : [];

            messages.push({
                text: message,
                type: type,
                timestamp: new Date().toISOString(),
                image: imageData,
                isMarkdown: isMarkdown
            });

            if (messages.length > this.CONFIG.MAX_STORED_MESSAGES) {
                messages.shift();
            }

            localStorage.setItem(this.STORAGE_KEYS.messages, JSON.stringify(messages));
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded');
                try {
                    const stored = localStorage.getItem(this.STORAGE_KEYS.messages);
                    const messages = stored ? JSON.parse(stored) : [];
                    const prunedMessages = messages.slice(-20);
                    localStorage.setItem(this.STORAGE_KEYS.messages, JSON.stringify(prunedMessages));
                    this.showFeedback('Storage full - old messages removed', 'info');
                    return true;
                } catch (retryError) {
                    console.error('Failed to free storage space:', retryError);
                    this.showFeedback('Storage full - messages not saved', 'error');
                    return false;
                }
            } else {
                console.error('Error saving message:', error);
                this.showFeedback('Failed to save message', 'error');
                return false;
            }
        }
    }

    loadConversationHistory() {
        if (this.isGuest) return;
        try {
            const stored = localStorage.getItem(this.STORAGE_KEYS.conversationHistory);
            if (stored) {
                this.conversationHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
        }
    }

    saveConversationHistory() {
        if (this.isGuest) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.conversationHistory, JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.error('Error saving conversation history:', error);
        }
    }

    clearMessageHistory() {
        try {
            const confirmed = confirm('Start a new chat? This will clear all messages.');
            if (!confirmed) return;

            localStorage.removeItem(this.STORAGE_KEYS.messages);
            localStorage.removeItem(this.STORAGE_KEYS.conversationHistory);
            this.conversationHistory = [];

            if (this.messagesList) {
                this.messagesList.innerHTML = '';
            }

            this.switchToKickoffMode();

            if (this.messagesList) {
                this.messagesList.innerHTML = `
                    <div class="empty-state" id="emptyState">
                        <div class="empty-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <h3>Ready to chat</h3>
                        <p>Your messages will appear here</p>
                    </div>
                `;
                this.emptyState = document.getElementById('emptyState');
            }

            this.updateMessageCount();
            this.showFeedback('New chat started', 'success');
        } catch (error) {
            console.error('Error clearing messages:', error);
        }
    }

    renderMessage(text, type = 'user', timestamp = null, save = true, imageData = null, isMarkdown = false) {
        try {
            if (!this.isElementReady(this.messagesList)) {
                throw new Error('Messages list not found');
            }

            if (!text || typeof text !== 'string') {
                throw new Error('Invalid message text');
            }

            if (!this.VALID_MESSAGE_TYPES.has(type)) {
                console.warn(`Invalid message type: ${type}, defaulting to 'user'`);
                type = 'user';
            }

            if (this.emptyState) {
                this.emptyState.style.display = 'none';
            }

            const messageEl = document.createElement('div');
            messageEl.className = `message ${type}`;
            messageEl.setAttribute('role', 'article');
            messageEl.setAttribute('aria-label', `${type} message`);

            if (imageData) {
                const imageEl = document.createElement('div');
                imageEl.className = 'message-image';

                const img = document.createElement('img');
                img.src = imageData;
                img.alt = 'Uploaded image';

                Object.assign(img.style, {
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    objectFit: 'cover',
                    cursor: 'pointer'
                });

                img.addEventListener('click', () => {
                    this.showFullImage(imageData);
                });

                imageEl.appendChild(img);
                messageEl.appendChild(imageEl);
            }

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';

            // Apply markdown rendering for bot messages
            if (type === 'bot' && isMarkdown) {
                const htmlContent = this.parseMarkdown(text);
                contentEl.innerHTML = htmlContent;

                // Add styling for markdown elements
                this.styleMarkdownContent(contentEl);
            } else {
                contentEl.textContent = text;
            }

            const timeEl = document.createElement('div');
            timeEl.className = 'message-timestamp';
            timeEl.textContent = this.formatTimestamp(timestamp || new Date().toISOString());
            timeEl.setAttribute('aria-label', 'Message time');

            messageEl.appendChild(contentEl);
            messageEl.appendChild(timeEl);
            this.messagesList.appendChild(messageEl);

            this.scrollToBottom();
            this.updateMessageCount();

            if (save) {
                this.saveMessageHistory(text, type, imageData, isMarkdown);
            }

            return messageEl;
        } catch (error) {
            console.error('Failed to render message:', error);
            this.showFeedback('Failed to display message', 'error');
            return null;
        }
    }

    // =========================================
    // MARKDOWN STYLING
    // =========================================
    styleMarkdownContent(contentEl) {
        // Style code blocks
        const codeBlocks = contentEl.querySelectorAll('pre');
        codeBlocks.forEach(block => {
            Object.assign(block.style, {
                backgroundColor: 'var(--code-bg, #f5f5f7)',
                padding: '12px 16px',
                borderRadius: '8px',
                overflow: 'auto',
                margin: '8px 0',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.5'
            });
        });

        // Style inline code
        const inlineCode = contentEl.querySelectorAll('code');
        inlineCode.forEach(code => {
            if (!code.parentElement || code.parentElement.tagName !== 'PRE') {
                Object.assign(code.style, {
                    backgroundColor: 'var(--code-bg, #f5f5f7)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                });
            }
        });

        // Style links
        const links = contentEl.querySelectorAll('a');
        links.forEach(link => {
            Object.assign(link.style, {
                color: 'var(--accent, #007aff)',
                textDecoration: 'none'
            });
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });

        // Style blockquotes
        const blockquotes = contentEl.querySelectorAll('blockquote');
        blockquotes.forEach(quote => {
            Object.assign(quote.style, {
                borderLeft: '4px solid var(--accent, #007aff)',
                paddingLeft: '16px',
                margin: '8px 0',
                fontStyle: 'italic',
                color: 'var(--text-secondary, #666)'
            });
        });

        // Style lists
        const lists = contentEl.querySelectorAll('ul, ol');
        lists.forEach(list => {
            Object.assign(list.style, {
                paddingLeft: '24px',
                margin: '8px 0'
            });
        });

        // Style tables
        const tables = contentEl.querySelectorAll('table');
        tables.forEach(table => {
            Object.assign(table.style, {
                borderCollapse: 'collapse',
                width: '100%',
                margin: '8px 0'
            });

            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                Object.assign(cell.style, {
                    border: '1px solid var(--border, #e0e0e0)',
                    padding: '8px',
                    textAlign: 'left'
                });
            });

            const headers = table.querySelectorAll('th');
            headers.forEach(th => {
                Object.assign(th.style, {
                    backgroundColor: 'var(--code-bg, #f5f5f7)',
                    fontWeight: 'bold'
                });
            });
        });

        // Style headings
        const headings = contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            Object.assign(heading.style, {
                marginTop: '16px',
                marginBottom: '8px',
                fontWeight: 'bold'
            });
        });

        // Style paragraphs
        const paragraphs = contentEl.querySelectorAll('p');
        paragraphs.forEach(p => {
            Object.assign(p.style, {
                margin: '8px 0',
                lineHeight: '1.6'
            });
        });

        // Style horizontal rules
        const hrs = contentEl.querySelectorAll('hr');
        hrs.forEach(hr => {
            Object.assign(hr.style, {
                border: 'none',
                borderTop: '1px solid var(--border, #e0e0e0)',
                margin: '16px 0'
            });
        });
    }

    formatTimestamp(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins}m ago`;
        }
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    scrollToBottom() {
        if (this.messagesList) {
            requestAnimationFrame(() => {
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
            });
        }
    }

    // =========================================
    // TYPING INDICATOR
    // =========================================
    showTypingIndicator() {
        try {
            if (!this.isElementReady(this.messagesList)) return;
            this.hideTypingIndicator();

            const typingEl = document.createElement('div');
            typingEl.className = 'message bot';
            typingEl.id = 'typing-indicator';
            typingEl.setAttribute('role', 'status');
            typingEl.setAttribute('aria-label', 'Bot is typing');

            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';

            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'typing-dot';
                indicator.appendChild(dot);
            }

            typingEl.appendChild(indicator);
            this.messagesList.appendChild(typingEl);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error showing typing indicator:', error);
        }
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // =========================================
    // THEME SYSTEM
    // =========================================
    initTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEYS.theme);
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            this.updateThemeIcon();
        }

        if (!document.querySelector('.theme-toggle')) {
            const toggle = document.createElement('button');
            toggle.className = 'theme-toggle';
            toggle.setAttribute('aria-label', 'Toggle theme');
            toggle.innerHTML = '<i class="fas fa-moon"></i>';
            toggle.addEventListener('click', () => this.toggleTheme());
            document.body.appendChild(toggle);
            this.themeToggle = toggle;
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');

        localStorage.setItem(this.STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
        this.updateThemeIcon();
        this.showFeedback(`${isDark ? 'Dark' : 'Light'} mode activated`, 'success');
        this.addHapticFeedback('light');
    }

    updateThemeIcon() {
        if (!this.themeToggle) return;
        const icon = this.themeToggle.querySelector('i');
        if (icon) {
            const isDark = document.body.classList.contains('dark-theme');
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // =========================================
    // DRAFT SAVING
    // =========================================
    saveDraft() {
        if (this.isGuest) return;
        if (!this.input) return;
        const value = this.input.value.trim();
        if (value) {
            localStorage.setItem(this.STORAGE_KEYS.drafts, value);
        } else {
            localStorage.removeItem(this.STORAGE_KEYS.drafts);
        }
    }

    loadDraft() {
        if (this.isGuest) return;
        const draft = localStorage.getItem(this.STORAGE_KEYS.drafts);
        if (draft && this.input) {
            this.input.value = draft;
            this.input.dispatchEvent(new Event('input'));
        }
    }

    clearDraft() {
        if (this.isGuest) return;
        localStorage.removeItem(this.STORAGE_KEYS.drafts);
    }

    // =========================================
    // FEEDBACK
    // =========================================
    showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = `feedback feedback-${type}`;
        feedback.textContent = message;

        Object.assign(feedback.style, {
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-20px)',
            padding: '12px 24px',
            background: type === 'success' ? '#34c759' :
                type === 'error' ? '#ff3b30' : '#007aff',
            color: 'white',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: '10000',
            opacity: '0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none'
        });

        document.body.appendChild(feedback);

        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => feedback.remove(), 300);
        }, this.CONFIG.FEEDBACK_DURATION);
    }

    // =========================================
    // HAPTIC FEEDBACK
    // =========================================
    addHapticFeedback(intensity = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30
            };
            navigator.vibrate(patterns[intensity] || 10);
        }
    }

    // =========================================
    // ANIMATIONS
    // =========================================
    initAnimations() {
        if (this.sendBtn && this.input) {
            this.sendBtn.style.opacity = '0.5';
            this.sendBtn.style.transform = 'scale(0.95)';
            this.sendBtn.disabled = true;
        }
        this.addSmoothTransitions();
    }

    addSmoothTransitions() {
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }

    // =========================================
    // MODE SWITCHING
    // =========================================
    switchToChatMode() {
        if (!this.isGuest) {
            localStorage.setItem(this.STORAGE_KEYS.mode, 'chat');
        }

        if (this.kickoffMode) {
            this.kickoffMode.classList.add('fade-out');
            setTimeout(() => {
                this.kickoffMode.style.display = 'none';
            }, 300);
        }

        if (this.isGuest && this.topBar) {
            this.topBar.classList.add('hidden');
        }

        if (this.chatMode) {
            this.chatMode.style.display = 'flex';
        }
    }

    switchToKickoffMode() {
        if (!this.isGuest) {
            localStorage.setItem(this.STORAGE_KEYS.mode, 'kickoff');
        }

        if (this.kickoffMode) {
            this.kickoffMode.style.display = 'flex';
            this.kickoffMode.classList.remove('fade-out');
        }

        if (this.topBar) {
            this.topBar.classList.remove('hidden');
        }

        if (this.chatMode) {
            this.chatMode.style.display = 'none';
        }
    }

    updateMessageCount() {
        if (!this.messageCount) return;
        const count = this.messagesList?.querySelectorAll('.message:not(#typing-indicator)').length || 0;
        this.messageCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;
    }
}

// =========================================
// INITIALIZE APP
// =========================================
const app = new EchoChat();

// =========================================
// UTILITY FUNCTIONS
// =========================================
function smoothScrollTo(element) {
    if (!element) return;
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

function isInViewport(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =========================================
// EXPORT FOR MODULE USE
// =========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EchoChat;
}