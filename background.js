// Background service worker for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Website Chat Assistant extension installed');
  
  // Initialize default settings
  chrome.storage.sync.set({
    chatHistory: [],
    websiteData: {},
    settings: {
      theme: 'default',
      notifications: true,
      autoScroll: true,
      openaiKey: ''
    }
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ 
          url: tabs[0].url,
          title: tabs[0].title 
        });
      }
    });
    return true;
  }

  if (message.type === 'EXTRACT_WEBSITE_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: extractPageContent
        }, (results) => {
          if (results && results[0]) {
            sendResponse({ 
              content: results[0].result,
              url: tabs[0].url,
              title: tabs[0].title
            });
          }
        });
      }
    });
    return true;
  }

  if (message.type === 'CHAT_WITH_AI') {
    handleAIChat(message.data, sendResponse);
    return true;
  }
  
  if (message.type === 'SAVE_CHAT_HISTORY') {
    chrome.storage.sync.set({ 
      chatHistory: message.history 
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'GET_CHAT_HISTORY') {
    chrome.storage.sync.get(['chatHistory'], (result) => {
      sendResponse({ 
        history: result.chatHistory || [] 
      });
    });
    return true;
  }
  
  if (message.type === 'CLEAR_CHAT_HISTORY') {
    chrome.storage.sync.set({ 
      chatHistory: [] 
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.sync.set({ 
      settings: message.settings 
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse({ 
        settings: result.settings || { openaiKey: '' }
      });
    });
    return true;
  }
});

// Function to extract page content
function extractPageContent() {
  // Remove script and style elements
  const scripts = document.querySelectorAll('script, style, nav, header, footer, aside');
  scripts.forEach(el => el.remove());
  
  // Get main content
  const content = document.body.innerText || document.body.textContent || '';
  
  // Clean up the content
  const cleanContent = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
  
  return {
    content: cleanContent.substring(0, 10000), // Limit to 10k characters
    title: document.title,
    url: window.location.href
  };
}

// Handle AI chat requests
async function handleAIChat(data, sendResponse) {
  try {
    const { message, context, openaiKey } = data;
    
    if (!openaiKey) {
      sendResponse({ 
        error: 'OpenAI API key not configured. Please set it in the settings.' 
      });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps users understand and interact with website content. Use the following website context to answer questions: ${context}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;

    sendResponse({ 
      response: aiResponse 
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    sendResponse({ 
      error: error.message || 'Failed to get AI response' 
    });
  }
}

// Handle browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, AI Website Chat Assistant ready');
});