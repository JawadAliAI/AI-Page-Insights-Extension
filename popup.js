// popup.js - Main popup script for AI Website Chat Assistant

class ChatApp {
    constructor() {
        this.currentWebsiteData = null;
        this.chatHistory = [];
        this.settings = { openaiKey: '' };
        this.isLoading = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadInitialData();
    }

    initializeElements() {
        // Setup screen elements
        this.setupScreen = document.getElementById('setupScreen');
        this.chatScreen = document.getElementById('chatScreen');
        this.websiteTitle = document.getElementById('websiteTitle');
        this.websiteUrl = document.getElementById('websiteUrl');
        this.startChatBtn = document.getElementById('startChatBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.statusText = document.getElementById('statusText');
        
        // Chat screen elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.backBtn = document.getElementById('backBtn');
        this.chatStatusText = document.getElementById('chatStatusText');
        
        // Debug: Log elements to ensure they exist
        console.log('Elements found:', {
            messageInput: !!this.messageInput,
            sendButton: !!this.sendButton,
            messagesContainer: !!this.messagesContainer,
            typingIndicator: !!this.typingIndicator
        });
        
        // Settings elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.openaiKeyInput = document.getElementById('openaiKeyInput');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.settingsMessage = document.getElementById('settingsMessage');
    }

    attachEventListeners() {
        // Setup screen listeners
        this.startChatBtn.addEventListener('click', () => this.startChat());
        this.backBtn.addEventListener('click', () => this.showSetupScreen());
        
        // Chat listeners
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Send button clicked');
            this.sendMessage();
        });
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Enter key pressed');
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 80) + 'px';
        });
        
        // Settings listeners
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        
        // Close settings modal when clicking outside
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });
    }

    async loadInitialData() {
        try {
            this.setLoading(true);
            
            // Load settings first
            await this.loadSettings();
            
            // Get current website info
            await this.getCurrentWebsiteInfo();
            
            // Load chat history
            await this.loadChatHistory();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load extension data. Please refresh and try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async getCurrentWebsiteInfo() {
        return new Promise((resolve, reject) => {
            // Try to get current tab info
            chrome.runtime.sendMessage({ type: 'GET_CURRENT_URL' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    this.showManualInput();
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response && response.url) {
                    this.websiteTitle.textContent = response.title || 'Untitled Page';
                    this.websiteUrl.textContent = this.formatUrl(response.url);
                    this.statusText.textContent = 'Ready to analyze';
                    this.currentWebsiteData = response;
                    
                    // Enable start chat button
                    this.startChatBtn.disabled = false;
                    this.hideManualInput();
                    
                    resolve(response);
                } else {
                    this.showManualInput();
                    reject(new Error('No website data received'));
                }
            });
        });
    }

    showManualInput() {
        this.websiteTitle.textContent = 'Enter Website URL';
        this.websiteUrl.innerHTML = `
            <input type="url" id="manualUrlInput" placeholder="https://example.com" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 8px;">
            <button id="loadUrlBtn" style="margin-top: 8px; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Load URL
            </button>
        `;
        this.statusText.textContent = 'Manual input required';
        this.startChatBtn.disabled = true;
        
        // Add event listener for manual URL input
        const loadUrlBtn = document.getElementById('loadUrlBtn');
        const urlInput = document.getElementById('manualUrlInput');
        
        loadUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.loadManualUrl(url);
            }
        });
        
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const url = urlInput.value.trim();
                if (url) {
                    this.loadManualUrl(url);
                }
            }
        });
    }

    hideManualInput() {
        // Remove manual input if it exists
        const manualInput = document.getElementById('manualUrlInput');
        if (manualInput) {
            this.websiteUrl.textContent = this.formatUrl(this.currentWebsiteData.url);
        }
    }

    async loadManualUrl(url) {
        try {
            // Validate URL
            new URL(url);
            
            this.currentWebsiteData = {
                url: url,
                title: this.extractDomainFromUrl(url)
            };
            
            this.websiteTitle.textContent = this.currentWebsiteData.title;
            this.websiteUrl.textContent = this.formatUrl(url);
            this.statusText.textContent = 'Ready to analyze';
            this.startChatBtn.disabled = false;
            this.hideManualInput();
            
        } catch (error) {
            alert('Please enter a valid URL (e.g., https://example.com)');
        }
    }

    extractDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (error) {
            return 'Website';
        }
    }

    formatUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        } catch (error) {
            return url;
        }
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
                if (response && response.settings) {
                    this.settings = response.settings;
                    this.openaiKeyInput.value = this.settings.openaiKey || '';
                }
                resolve();
            });
        });
    }

    async loadChatHistory() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_CHAT_HISTORY' }, (response) => {
                if (response && response.history) {
                    this.chatHistory = response.history;
                }
                resolve();
            });
        });
    }

    async startChat() {
        if (!this.settings.openaiKey) {
            this.showError('Please configure your OpenAI API key in settings first.');
            this.showSettings();
            return;
        }

        if (!this.currentWebsiteData || !this.currentWebsiteData.url) {
            this.showError('Please enter a website URL first.');
            return;
        }

        this.setLoading(true);
        this.statusText.textContent = 'Analyzing website...';
        
        try {
            // For manual URLs, we'll use a simpler approach
            if (!this.currentWebsiteData.content) {
                // Set a placeholder content for manual URLs
                this.currentWebsiteData.content = `Website: ${this.currentWebsiteData.url}\nTitle: ${this.currentWebsiteData.title}\n\nNote: This is a manually entered URL. Ask me general questions about websites or provide specific content you'd like to discuss.`;
            }
            
            // Switch to chat screen
            this.showChatScreen();
            
            // Update chat status
            this.chatStatusText.textContent = `Chatting about ${this.currentWebsiteData.title || 'website'}`;
            
        } catch (error) {
            console.error('Error starting chat:', error);
            this.showError('Failed to start chat. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async sendMessage() {
        console.log('sendMessage called');
        const message = this.messageInput.value.trim();
        console.log('Message content:', message);
        
        if (!message) {
            console.log('No message content');
            return;
        }
        
        if (this.isLoading) {
            console.log('Already loading, skipping');
            return;
        }

        if (!this.settings.openaiKey) {
            this.showError('Please configure your OpenAI API key in settings first.');
            this.showSettings();
            return;
        }

        console.log('Processing message...');

        // Add user message to chat
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Show typing indicator
        this.showTyping();
        this.isLoading = true;
        this.sendButton.disabled = true;
        this.messageInput.disabled = true;

        try {
            // Send message to AI
            const response = await this.sendToAI(message);
            console.log('AI Response received:', response);
            
            // Add AI response to chat
            this.addMessage('bot', response);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('bot', `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`);
        } finally {
            this.hideTyping();
            this.isLoading = false;
            this.sendButton.disabled = false;
            this.messageInput.disabled = false;
            this.messageInput.focus();
        }
    }

    async sendToAI(message) {
        return new Promise((resolve, reject) => {
            const data = {
                message: message,
                context: this.currentWebsiteData.content || 'No website content available',
                openaiKey: this.settings.openaiKey
            };

            chrome.runtime.sendMessage({ 
                type: 'CHAT_WITH_AI', 
                data: data 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response.error) {
                    reject(new Error(response.error));
                } else if (response.response) {
                    resolve(response.response);
                } else {
                    reject(new Error('No response from AI'));
                }
            });
        });
    }

    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">${sender === 'user' ? 'You' : 'AI'}</div>
            <div class="message-content">
                ${content}
                <div class="message-time">${timeString}</div>
            </div>
        `;

        // Simply append to messages container instead of using insertBefore
        this.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Save to history
        this.chatHistory.push({
            sender: sender,
            content: content,
            timestamp: now.toISOString()
        });
        
        this.saveChatHistory();
    }

    showTyping() {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.add('hidden');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    saveChatHistory() {
        chrome.runtime.sendMessage({ 
            type: 'SAVE_CHAT_HISTORY', 
            history: this.chatHistory 
        });
    }

    showChatScreen() {
        this.setupScreen.classList.add('hidden');
        this.chatScreen.classList.remove('hidden');
        
        // Focus on input after transition
        setTimeout(() => {
            if (this.messageInput) {
                this.messageInput.focus();
                this.messageInput.disabled = false;
            }
            if (this.sendButton) {
                this.sendButton.disabled = false;
            }
        }, 100);
    }

    showSetupScreen() {
        this.chatScreen.classList.add('hidden');
        this.setupScreen.classList.remove('hidden');
        
        // Clear chat messages except the welcome message
        const messages = this.messagesContainer.querySelectorAll('.message:not(:first-child)');
        messages.forEach(message => message.remove());
        
        // Reset chat history
        this.chatHistory = [];
        
        // Refresh website info
        this.getCurrentWebsiteInfo();
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden');
        this.openaiKeyInput.focus();
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
        this.clearSettingsMessage();
    }

    async saveSettings() {
        const apiKey = this.openaiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showSettingsMessage('Please enter a valid OpenAI API key', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.showSettingsMessage('OpenAI API key should start with "sk-"', 'error');
            return;
        }

        this.settings.openaiKey = apiKey;
        
        chrome.runtime.sendMessage({ 
            type: 'SAVE_SETTINGS', 
            settings: this.settings 
        }, (response) => {
            if (response && response.success) {
                this.showSettingsMessage('Settings saved successfully!', 'success');
                setTimeout(() => {
                    this.hideSettings();
                }, 1500);
            } else {
                this.showSettingsMessage('Failed to save settings', 'error');
            }
        });
    }

    showSettingsMessage(message, type) {
        this.settingsMessage.textContent = message;
        this.settingsMessage.className = type === 'error' ? 'error-message' : 'success-message';
        this.settingsMessage.classList.remove('hidden');
    }

    clearSettingsMessage() {
        this.settingsMessage.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
        setTimeout(() => {
            this.errorMessage.classList.add('hidden');
        }, 5000);
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (loading) {
            document.body.classList.add('loading');
            this.startChatBtn.disabled = true;
        } else {
            document.body.classList.remove('loading');
            if (this.currentWebsiteData && this.currentWebsiteData.url) {
                this.startChatBtn.disabled = false;
            }
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});

// Handle extension lifecycle
window.addEventListener('beforeunload', () => {
    // Any cleanup if needed
});