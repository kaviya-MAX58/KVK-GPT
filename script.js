const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const clearKeyBtn = document.getElementById('clearKeyBtn');
const newChatBtn = document.getElementById('newChatBtn');
const historyList = document.getElementById('historyList');

// Image Upload Elements
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn'); // Image Btn
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

// Audio Upload Elements
const audioInput = document.getElementById('audioInput');
const audioBtn = document.getElementById('audioBtn');
const audioPreviewContainer = document.getElementById('audioPreviewContainer');
const audioPreview = document.getElementById('audioPreview');
const removeAudioBtn = document.getElementById('removeAudioBtn');

// Hardcoded API Key as requested
let API_KEY = 'AIzaSyAX4kUi_AUNnr9l25i8CfyXOpjmckmOag0';
// let API_KEY = localStorage.getItem('gemini_api_key'); // Commented out for now

let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
let currentFileBase64 = null;
let currentFileMimeType = null;

// Initialize
if (!API_KEY) {
    apiKeyModal.classList.remove('hidden');
} else {
    apiKeyModal.classList.add('hidden');
}

// Auto-focus input
userInput.focus();

// Event Listeners
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        API_KEY = key;
        localStorage.setItem('gemini_api_key', key);
        apiKeyModal.classList.add('hidden');
        userInput.focus();
    } else {
        alert('Please enter a valid API Key');
    }
});

clearKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    location.reload();
});

sendBtn.addEventListener('click', handleSend);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// ---------------------------------------------------------
// FILE UPLOAD LOGIC (IMAGE & AUDIO)
// ---------------------------------------------------------

// Image Events
uploadBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0], 'image'));
removeImageBtn.addEventListener('click', clearFileSelection);

// Audio Events
audioBtn.addEventListener('click', () => audioInput.click());
audioInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0], 'audio'));
removeAudioBtn.addEventListener('click', clearFileSelection);

function handleFileSelect(file, type) {
    if (!file) return;

    // Limits
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("File is too large. Please select under 10MB.");
        return;
    }

    // Clear previous selection first
    clearFileSelection();

    const reader = new FileReader();
    reader.onload = (e) => {
        currentFileBase64 = e.target.result.split(',')[1];
        currentFileMimeType = file.type;

        if (type === 'image') {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        } else if (type === 'audio') {
            audioPreview.src = e.target.result;
            audioPreviewContainer.classList.remove('hidden');
        }
        userInput.focus();
    };
    reader.readAsDataURL(file);
}

function clearFileSelection() {
    imageInput.value = '';
    audioInput.value = '';
    currentFileBase64 = null;
    currentFileMimeType = null;

    imagePreviewContainer.classList.add('hidden');
    imagePreview.src = '';

    audioPreviewContainer.classList.add('hidden');
    audioPreview.src = '';
}

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value === '') this.style.height = 'auto';
});

newChatBtn.addEventListener('click', () => {
    location.reload(); // Simple way to clear current session view
});

// Suggestion Buttons
document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const text = this.querySelector('span:last-child').textContent;
        userInput.value = text;
        handleSend();
    });
});

async function handleSend() {
    const text = userInput.value.trim();
    // Allow sending if there is text OR a file
    if (!text && !currentFileBase64) return;

    if (!API_KEY) {
        apiKeyModal.classList.remove('hidden');
        return;
    }

    // UI Updates
    userInput.value = '';
    userInput.style.height = 'auto';
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    // Capture state
    const fileToSend = currentFileBase64;
    const mimeTypeToSend = currentFileMimeType;

    // Determine source for local display
    let displaySrc = null;
    if (fileToSend) {
        if (mimeTypeToSend.startsWith('image/')) displaySrc = imagePreview.src;
        else if (mimeTypeToSend.startsWith('audio/')) displaySrc = audioPreview.src;
    }

    // Add User Message
    appendMessage('user', text, false, fileToSend ? { src: displaySrc, type: mimeTypeToSend } : null);

    // Clear Inputs immediately
    clearFileSelection();

    // Add Loading Message
    const loadingId = appendMessage('ai', 'Thinking...', true);

    try {
        const response = await fetchGeminiResponse(text, fileToSend, mimeTypeToSend);
        updateAIMessage(loadingId, response);
    } catch (error) {
        updateAIMessage(loadingId, `Error: ${error.message}. Please check your API key.`);
        console.error(error);
    }
}

function appendMessage(role, text, isLoading = false, attachment = null) {
    const msgDiv = document.createElement('div');
    const msgId = 'msg-' + Date.now();
    msgDiv.id = msgId;

    // Layout classes
    const isUser = role === 'user';
    msgDiv.className = `flex w-full ${isUser ? 'justify-end' : 'justify-start'} message-enter mb-6`;

    const avatar = isUser
        ? `<div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 ml-3">
             <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
           </div>`
        : `<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0 mr-3 shadow-lg shadow-purple-500/20">
             <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
           </div>`;

    const loadingHtml = isLoading
        ? `<div class="flex items-center space-x-1 h-6">
             <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
             <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
             <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
           </div>`
        : '';

    // Attachment HTML
    let attachmentHtml = '';
    if (attachment) {
        if (attachment.type.startsWith('image/')) {
            attachmentHtml = `<img src="${attachment.src}" class="max-w-full h-auto rounded-lg mb-2 border border-gray-500/30" style="max-height: 300px;">`;
        } else if (attachment.type.startsWith('audio/')) {
            attachmentHtml = `<audio controls src="${attachment.src}" class="w-full mb-2 rounded-lg"></audio>`;
        }
    }

    // Content Container
    const contentClass = isUser
        ? 'bg-blue-600/90 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg max-w-[85%] md:max-w-[70%]'
        : 'bg-gray-800/80 text-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-md max-w-[85%] md:max-w-[75%] border border-gray-700/50 prose prose-invert';

    msgDiv.innerHTML = isUser
        ? `<div class="${contentClass}">${attachmentHtml}${text}</div>${avatar}`
        : `${avatar}<div class="${contentClass} message-content">${isLoading ? loadingHtml : marked.parse(text)}</div>`;

    chatContainer.appendChild(msgDiv);
    scrollToBottom();

    if (!isUser && !isLoading) {
        document.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }

    return msgId;
}

function updateAIMessage(msgId, text) {
    const msgDiv = document.getElementById(msgId);
    if (msgDiv) {
        const contentDiv = msgDiv.querySelector('.message-content');
        // Render markdown with Marked.js
        contentDiv.innerHTML = marked.parse(text);

        // Apply syntax highlighting to new code blocks
        contentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        scrollToBottom();
    }
}

// ---------------------------------------------------------
// NEW ULTIMATE FIX FOR MODEL DISCOVERY
// ---------------------------------------------------------

// We cache a working URL after we find it
let cachedModelUrl = null;

async function fetchGeminiResponse(prompt, fileBase64 = null, fileMimeType = null) {

    // If we haven't found a working model yet, find one!
    if (!cachedModelUrl) {
        try {
            // 1. Ask Google: "What models can I use?"
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
            const listResponse = await fetch(listUrl);
            const listData = await listResponse.json();

            if (!listData.models) {
                // If listing fails, fallback to hardcoded safe bet immediately
                throw new Error("Invalid API Key or no models found.");
            }

            // 2. Find models that support chatting (generateContent)
            // Models returned have names like "models/gemini-pro"
            const chatModels = listData.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent')
            );

            if (chatModels.length === 0) throw new Error("No chat models available.");

            // 3. Pick the best ONE
            // We sort so our favorites come first
            const bestModel = chatModels.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();

                // Prioritize 1.5-flash (multimodal)
                if (nameA.includes('1.5-flash')) return -1;
                if (nameB.includes('1.5-flash')) return 1;

                // Then 1.5-pro (multimodal)
                if (nameA.includes('1.5-pro')) return -1;
                if (nameB.includes('1.5-pro')) return 1;

                return 0;
            })[0];

            // 4. Construct the URL
            const modelName = bestModel.name.replace('models/', '');
            cachedModelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

            console.log(`Auto-selected Model: ${modelName}`);

        } catch (error) {
            console.error("Model discovery failed, using fallback:", error);
            // Fallback to hardcoded safe bet if list fails
            // Using v1beta/gemini-1.5-flash is currently extremely reliable
            cachedModelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        }
    }

    // Construct Payload
    const parts = [];
    if (prompt) {
        parts.push({ text: prompt });
    }

    if (fileBase64) {
        parts.push({
            inline_data: {
                mime_type: fileMimeType || 'image/jpeg',
                data: fileBase64
            }
        });
    }

    // Perform the actual chat request
    const response = await fetch(cachedModelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If it fails, clear cache to force rediscovery next time
        cachedModelUrl = null;
        throw new Error(errorData.error?.message || "AI Error");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ---------------------------------------------------------
// BACKGROUND ANIMATION
// ---------------------------------------------------------

function startBackgroundAnimation() {
    const container = document.getElementById('kvk-background');
    if (!container) return;

    // Initial set
    for (let i = 0; i < 15; i++) {
        createFloatingText(container, true);
    }

    // Ongoing creation
    setInterval(() => {
        createFloatingText(container);
    }, 2000);
}

function createFloatingText(container, initial = false) {
    const el = document.createElement('span');
    el.classList.add('floating-text');
    el.textContent = 'KVK';

    // Random Properties
    const size = Math.random() * 6 + 2; // 2rem to 8rem
    const left = Math.random() * 100; // 0% to 100%
    const duration = Math.random() * 15 + 10; // 10s to 25s
    const opacity = Math.random() * 0.04 + 0.01; // 0.01 to 0.05
    const delay = initial ? Math.random() * -20 : 0; // Negative delay for initial batch to be mid-screen

    el.style.fontSize = `${size}rem`;
    el.style.left = `${left}%`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.opacity = opacity;

    container.appendChild(el);

    // Cleanup
    setTimeout(() => {
        el.remove();
    }, (duration) * 1000); // Remove after animation + buffer
}

// Start Animation
startBackgroundAnimation();
