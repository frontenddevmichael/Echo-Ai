// =========================================
// ECHO CHAT - FULL FEATURED VERSION WITH ALL UPDATES
// Complete Version with: Streaming, Conversations, Voice, Message Actions
// =========================================

class EchoChat {
    constructor() {
        this.eventHandlers = [];
        this.timeouts = [];
        this.intervals = [];
        this.isGuest = true;
        this.isRecording = false;
        this.recognition = null;

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
            MODEL: 'models/gemini-2.0-flash-exp',
            VISION_MODEL: 'models/gemini-2.0-flash-exp'
        };

        this.STORAGE_KEYS = {
            messages: 'echo-chat-messages',
            theme: 'echo-chat-theme',
            drafts: 'echo-chat-drafts',
            mode: 'echo-chat-mode',
            userStatus: 'echo-chat-user-status',
            conversationHistory: 'echo-chat-conversation-history',
            conversations: 'echo-conversations',
            currentConversation: 'echo-current-conversation'
        };

        this.conversationHistory = [];
        this.currentImage = null;
        this.VALID_MESSAGE_TYPES = new Set(['user', 'bot']);
        this.conversations = [];
        this.currentConversationId = null;

        this.init();

        this.storage = {
            messages: [],
            conversations: [],
            conversationHistory: []
        };
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
        this.initConversationManager();
        this.initVoiceInput();
        this.loadConversationHistory();
        this.loadDraft();
        console.log('Echo Chat initialized successfully with all features');
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
    initElements() {
        // Fixed selectors to match your HTML
        this.input = document.querySelector('.input-content input[type="text"]');
        this.sendBtn = document.querySelector('.send-btn');
        this.inputWrapper = document.querySelector('.input-wrapper');
        this.attachBtn = document.querySelector('.tool-btn:nth-child(1)');
        this.imageBtn = document.querySelector('.tool-btn:nth-child(2)');
        this.voiceBtn = document.getElementById('voiceInputBtn');
        this.pills = document.querySelectorAll('.pill');
        this.topBar = document.querySelector('.topBar');
        this.kickoffMode = document.getElementById('kickoffMode');
        this.chatMode = document.getElementById('chatMode');
        this.messagesContainer = document.querySelector('.messages-container');
        this.messagesList = document.getElementById('messagesList');
        this.emptyState = document.getElementById('emptyState');
        this.messageCount = document.querySelector('.message-count');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // ADD DEBUG LOGGING
        console.log('✓ Elements initialized:', {
            input: !!this.input,
            sendBtn: !!this.sendBtn,
            messagesList: !!this.messagesList
        });
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
    // CONVERSATION MANAGER
    // =========================================
    initSidebarClickOutside() {
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('conversationSidebar');
            const toggleBtn = document.querySelector('.toggle-sidebar-btn');

            if (!sidebar || !sidebar.classList.contains('open')) return;

            // Check if click is outside sidebar and toggle button
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
    initConversationManager() {
        this.conversations = this.loadConversations();
        this.currentConversationId = this.getCurrentConversationId();

        if (!this.currentConversationId || !this.conversations.find(c => c.id === this.currentConversationId)) {
            this.createNewConversation();
        } else {
            this.loadConversation(this.currentConversationId);
            this.updateConversationsList();
        }

        
    }

    loadConversations() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEYS.conversations);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading conversations:', error);
            return [];
        }
    }

    saveConversations() {
        try {
            localStorage.setItem(this.STORAGE_KEYS.conversations, JSON.stringify(this.conversations));
        } catch (error) {
            console.error('Error saving conversations:', error);
        }
    }

    getCurrentConversationId() {
        return localStorage.getItem(this.STORAGE_KEYS.currentConversation);
    }

    setCurrentConversationId(id) {
        localStorage.setItem(this.STORAGE_KEYS.currentConversation, id);
        this.currentConversationId = id;
    }

    createNewConversation(title = null) {
        const conversation = {
            id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title || 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0
        };

        this.conversations.unshift(conversation);
        this.setCurrentConversationId(conversation.id);
        this.saveConversations();

        // Clear current messages
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

        this.conversationHistory = [];
        this.switchToKickoffMode();
        this.updateConversationsList();
        this.showFeedback('New conversation started', 'success');

        return conversation;
    }

    loadConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        this.setCurrentConversationId(conversationId);

        // Clear current messages
        if (this.messagesList) {
            this.messagesList.innerHTML = '';
        }

        // Clear conversation history for fresh start
        this.conversationHistory = [];

        // Reload messages
        if (conversation.messages && conversation.messages.length > 0) {
            this.switchToChatMode();
            if (this.emptyState) {
                this.emptyState.style.display = 'none';
            }

            conversation.messages.forEach(msg => {
                this.renderMessage(msg.text, msg.type, msg.timestamp, false, msg.image, msg.isMarkdown);

                // Rebuild conversation history for context
                if (msg.type === 'user') {
                    this.conversationHistory.push({
                        role: 'user',
                        parts: [{ text: msg.text }]
                    });
                } else if (msg.type === 'bot') {
                    this.conversationHistory.push({
                        role: 'model',
                        parts: [{ text: msg.text }]
                    });
                }
            });

            this.updateMessageCount();
        } else {
            this.switchToKickoffMode();
        }

        this.updateConversationsList();
    }

    updateConversationTitle(title) {
        const conversation = this.conversations.find(c => c.id === this.currentConversationId);
        if (conversation) {
            conversation.title = title;
            conversation.updatedAt = Date.now();
            this.saveConversations();
            this.updateConversationsList();
        }
    }

    autoGenerateTitle(firstMessage) {
        // Generate title from first message
        let title = firstMessage.slice(0, 40);
        if (firstMessage.length > 40) {
            title += '...';
        }
        this.updateConversationTitle(title);
    }

    deleteConversation(conversationId) {
        const index = this.conversations.findIndex(c => c.id === conversationId);
        if (index > -1) {
            this.conversations.splice(index, 1);
            this.saveConversations();

            if (conversationId === this.currentConversationId) {
                this.createNewConversation();
            }

            this.updateConversationsList();
            this.showFeedback('Conversation deleted', 'success');
        }
    }

    updateConversationsList() {
        const listContainer = document.getElementById('conversationsList');
        if (!listContainer) return;

        if (this.conversations.length === 0) {
            listContainer.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-inbox"></i>
                    <p>No conversations yet</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}" 
                 data-id="${conv.id}"
                 onclick="app.loadConversation('${conv.id}')">
                <div class="conversation-content">
                    <div class="conversation-title">${this.escapeHtml(conv.title)}</div>
                    <div class="conversation-meta">
                        ${conv.messageCount} messages • ${this.formatRelativeTime(conv.updatedAt)}
                    </div>
                </div>
                <button class="delete-conversation" 
                        onclick="event.stopPropagation(); app.confirmDeleteConversation('${conv.id}')"
                        aria-label="Delete conversation">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    confirmDeleteConversation(conversationId) {
        if (confirm('Delete this conversation? This action cannot be undone.')) {
            this.deleteConversation(conversationId);
        }
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return new Date(timestamp).toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleSidebar() {
        const sidebar = document.getElementById('conversationSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    searchConversations(query) {
        const searchTerm = query.toLowerCase();

        const filtered = this.conversations.filter(conv =>
            conv.title.toLowerCase().includes(searchTerm) ||
            conv.messages.some(msg => msg.text.toLowerCase().includes(searchTerm))
        );

        const listContainer = document.getElementById('conversationsList');
        if (!listContainer) return;

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-search"></i>
                    <p>No results found</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filtered.map(conv => `
            <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}" 
                 data-id="${conv.id}"
                 onclick="app.loadConversation('${conv.id}')">
                <div class="conversation-content">
                    <div class="conversation-title">${this.escapeHtml(conv.title)}</div>
                    <div class="conversation-meta">
                        ${conv.messageCount} messages • ${this.formatRelativeTime(conv.updatedAt)}
                    </div>
                </div>
                <button class="delete-conversation" 
                        onclick="event.stopPropagation(); app.confirmDeleteConversation('${conv.id}')"
                        aria-label="Delete conversation">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // =========================================
    // VOICE INPUT
    // =========================================
    initVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            this.hideVoiceButton();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.showRecordingUI();
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (this.input) {
                this.input.value = finalTranscript || interimTranscript;
                this.input.dispatchEvent(new Event('input'));
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopVoiceInput();

            if (event.error === 'not-allowed') {
                this.showFeedback('Microphone access denied', 'error');
            } else if (event.error === 'no-speech') {
                this.showFeedback('No speech detected', 'error');
            }
        };

        this.recognition.onend = () => {
            this.stopVoiceInput();
        };
    }

    startVoiceInput() {
        if (!this.recognition) {
            this.showFeedback('Voice input not supported', 'error');
            return;
        }

        try {
            this.recognition.start();
            this.addHapticFeedback('medium');
        } catch (error) {
            console.error('Failed to start voice input:', error);
            this.showFeedback('Failed to start voice input', 'error');
        }
    }

    stopVoiceInput() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            this.hideRecordingUI();
        }
    }

    showRecordingUI() {
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.classList.add('recording');
            voiceBtn.querySelector('i').className = 'fas fa-stop';
        }

        // Create recording indicator
        if (!document.getElementById('recordingIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'recordingIndicator';
            indicator.className = 'recording-indicator';
            indicator.innerHTML = `
                <div class="pulse-dot"></div>
                <span>Listening...</span>
            `;
            document.body.appendChild(indicator);
        }
    }

    hideRecordingUI() {
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
            voiceBtn.querySelector('i').className = 'fas fa-microphone';
        }

        const indicator = document.getElementById('recordingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    hideVoiceButton() {
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
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
            this.addEventHandler(this.clearHistoryBtn, 'click', () => this.clearCurrentConversation());
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
    // SEND MESSAGE WITH STREAMING
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

            // Use streaming response
            const response = await this.sendToGeminiStreaming(message, imageToSend);

            this.hideTypingIndicator();

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
    // GEMINI STREAMING API
    // =========================================
    async sendToGeminiStreaming(userMessage, imageData = null) {
        const endpoint = `${this.API_CONFIG.GEMINI_BASE_URL}/${this.API_CONFIG.MODEL}:streamGenerateContent`;
        const url = `${endpoint}?alt=sse&key=${this.API_CONFIG.GEMINI_API_KEY}`;

        // Create placeholder bot message
        const botMessageEl = document.createElement('div');
        botMessageEl.className = 'message bot';
        botMessageEl.setAttribute('role', 'article');
        botMessageEl.setAttribute('aria-label', 'bot message');

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content markdown-content';

        const timeEl = document.createElement('div');
        timeEl.className = 'message-timestamp';
        timeEl.textContent = this.formatTimestamp(new Date().toISOString());

        botMessageEl.appendChild(contentEl);
        botMessageEl.appendChild(timeEl);

        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }

        this.messagesList.appendChild(botMessageEl);
        this.scrollToBottom();

        let fullResponse = '';

        const SYSTEM = `
You are Echo AI, a conversational assistant.
You were created by Omale Michael and trained by OCM developments.

PERSONALITY + BEHAVIOR FRAMEWORK:
1) Echo is concise and precise. Words are chosen with intention.
2) Echo is assistant-like: professional, composed, friendly, helpful.
3) Echo is solutions-first: prefers code and implementation over philosophy.
4) Echo asks one sharp clarifying question if the user is vague.
5) Echo values clarity, velocity, correctness.
6) Echo avoids unnecessary explanations unless the user requests them.
7) Echo is respectful and gives direct, non-sentimental suggestions.
8) Echo never uses "as an AI" or any meta commentary.

MANDATE:
Echo always adheres to this persona.
`;

        let requestBody;

        if (imageData) {
            const base64Data = imageData.split(',')[1];
            const mimeType = imageData.split(';')[0].split(':')[1];

            requestBody = {
                contents: this.buildConversationContents(userMessage, {
                    mime_type: mimeType,
                    data: base64Data
                }),
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            };
        } else {
            requestBody = {
                contents: [
                    { role: "user", parts: [{ text: SYSTEM + "\n\n" + userMessage }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6);
                            if (jsonStr.trim() === '[DONE]') continue;

                            const data = JSON.parse(jsonStr);
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                            if (text) {
                                fullResponse += text;
                                const htmlContent = this.parseMarkdown(fullResponse);
                                contentEl.innerHTML = htmlContent;
                                this.styleMarkdownContent(contentEl);
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', e);
                        }
                    }
                }
            }

            // Remove streaming cursor


            // Add message actions
            this.addMessageActions(botMessageEl, fullResponse);

            // Update conversation history
            this.conversationHistory.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: fullResponse }]
            });

            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            this.saveConversationHistory();
            this.saveMessageToConversation(fullResponse, 'bot', null, true);
            this.updateMessageCount();

            return fullResponse;

        } catch (error) {
            console.error('Streaming error:', error);
            botMessageEl.remove();
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
    // MESSAGE ACTIONS (Copy, Regenerate, Edit)
    // =========================================
    addMessageActions(messageEl, messageText) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-actions';
        actionsContainer.innerHTML = `
            <button class="action-btn" onclick="app.copyMessage(this)" title="Copy message">
                <i class="fas fa-copy"></i>
            </button>
            <button class="action-btn" onclick="app.regenerateResponse(this)" title="Regenerate">
                <i class="fas fa-refresh"></i>
            </button>
        `;

        // Store message text as data attribute for easy access
        messageEl.dataset.messageText = messageText;

        messageEl.appendChild(actionsContainer);
    }

    copyMessage(button) {
        const messageEl = button.closest('.message');
        const messageText = messageEl.dataset.messageText || messageEl.querySelector('.message-content').textContent;

        navigator.clipboard.writeText(messageText).then(() => {
            this.showFeedback('Message copied!', 'success');

            // Visual feedback
            const icon = button.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fas fa-check';

            setTimeout(() => {
                icon.className = originalClass;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showFeedback('Failed to copy message', 'error');
        });
    }

    async regenerateResponse(button) {
        const messageEl = button.closest('.message');

        // Find the previous user message
        let prevElement = messageEl.previousElementSibling;
        while (prevElement && !prevElement.classList.contains('user')) {
            prevElement = prevElement.previousElementSibling;
        }

        if (!prevElement) {
            this.showFeedback('Cannot find original message', 'error');
            return;
        }

        const userMessage = prevElement.dataset.messageText || prevElement.querySelector('.message-content').textContent;

        // Remove the old bot response
        messageEl.remove();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Regenerate response
            await this.sendToGeminiStreaming(userMessage, null);
            this.hideTypingIndicator();
            this.showFeedback('Response regenerated', 'success');
        } catch (error) {
            this.hideTypingIndicator();
            this.showFeedback('Failed to regenerate', 'error');
            console.error('Regeneration error:', error);
        }
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
    // MESSAGE HISTORY - UPDATED FOR CONVERSATIONS
    // =========================================
    saveMessageToConversation(message, type, imageData = null, isMarkdown = false) {
        const conversation = this.conversations.find(c => c.id === this.currentConversationId);
        if (conversation) {
            const messageData = {
                text: message,
                type: type,
                timestamp: new Date().toISOString(),
                image: imageData,
                isMarkdown: isMarkdown
            };

            conversation.messages.push(messageData);
            conversation.messageCount = conversation.messages.length;
            conversation.updatedAt = Date.now();

            // Auto-generate title from first user message
            if (conversation.messageCount === 1 && type === 'user' && conversation.title === 'New Chat') {
                this.autoGenerateTitle(message);
            }

            this.saveConversations();
            this.updateConversationsList();
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

    clearCurrentConversation() {
        try {
            const confirmed = confirm('Start a new chat? This will clear all messages in the current conversation.');
            if (!confirmed) return;

            this.createNewConversation();
            this.showFeedback('New conversation started', 'success');
        } catch (error) {
            console.error('Error clearing conversation:', error);
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
            messageEl.dataset.messageText = text;

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
                contentEl.classList.add('markdown-content');
                const htmlContent = this.parseMarkdown(text);
                contentEl.innerHTML = htmlContent;
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

            // Add actions for user messages (copy)
            if (type === 'user') {
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'message-actions';
                actionsContainer.innerHTML = `
                    <button class="action-btn" onclick="app.copyMessage(this)" title="Copy message">
                        <i class="fas fa-copy"></i>
                    </button>
                `;
                messageEl.appendChild(actionsContainer);
            }

            this.messagesList.appendChild(messageEl);

            this.scrollToBottom();
            this.updateMessageCount();

            if (save) {
                this.saveMessageToConversation(text, type, imageData, isMarkdown);
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