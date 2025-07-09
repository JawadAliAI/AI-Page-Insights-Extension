// content.js - Content script for AI Website Chat Assistant

// This content script runs on all web pages
// Currently, it's minimal as most functionality is handled in the popup and background scripts

console.log('AI Website Chat Assistant content script loaded');

// Listen for messages from the background script if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle any content script specific messages here
    if (request.type === 'PING') {
        sendResponse({ status: 'Content script is active' });
    }
});

// You can add more content script functionality here if needed
// For example, DOM manipulation, page content extraction, etc.