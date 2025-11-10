 // Yeh script.js file hai
// Yeh Netlify par deploy hogi aur user ke Browser mein chalegi

// ----- THEME TOGGLE -----
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-icon-light').style.display = isDark ? 'block' : 'none';
    document.getElementById('theme-icon-dark').style.display = isDark ? 'none' : 'block';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Page load par theme check karein
if (localStorage.getItem('theme') === 'dark') {
    toggleTheme();
}
// ----- END THEME TOGGLE -----


// ----- IMAGE MODAL -----
/**
 * @param {string} src - The full-size image src
 * @param {string} filename - The original filename for download
 * @param {string} sender - 'sender' or 'receiver'
 * @param {string} msgId - The unique message ID (for download notification)
 */
function openImageModal(src, filename, sender, msgId) { // Added msgId
    const imageModalOverlay = document.getElementById('image-modal-overlay');
    const imageModalContent = document.getElementById('image-modal-content');
    const imageModalDownload = document.getElementById('image-modal-download');
    
    if (!imageModalOverlay || !imageModalContent || !imageModalDownload) return;
    
    console.log(`Opening modal for ${sender}, msgId: ${msgId}`);
    
    // Set image source
    imageModalContent.src = src;
    
    // Set download button properties
    if (sender === 'receiver') {
        imageModalDownload.href = src;
        imageModalDownload.download = filename;
        imageModalDownload.classList.add('active'); // Show download button
        
        // --- NEW: Add dynamic onclick for download notification ---
        imageModalDownload.onclick = (e) => {
            e.stopPropagation(); // Prevent modal from closing
            console.log('Download button clicked, sending notification...');
            // 'sendImageDownloadNotification' function neeche defined hai
            sendImageDownloadNotification(msgId);
            // The 'a' tag will handle the download itself
        };
        // --- END NEW ---
        
    } else {
        imageModalDownload.classList.remove('active'); // Hide for sender
        imageModalDownload.onclick = null; // Clear any previous listener
    }
    
    // Show modal
    imageModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeImageModal() {
    const imageModalOverlay = document.getElementById('image-modal-overlay');
    const imageModalContent = document.getElementById('image-modal-content');
    if (!imageModalOverlay) return;
    imageModalOverlay.classList.remove('active');
    imageModalContent.src = ''; // Clear src
    
    // --- NEW: Clear download onclick ---
    const imageModalDownload = document.getElementById('image-modal-download');
    imageModalDownload.onclick = null;
    // --- END ---
    document.body.style.overflow = ''; // Restore scrolling
}
// ----- END IMAGE MODAL -----


// ----- SCANNER FUNCTIONS -----
let html5QrCode = null;
let isScanning = false;
let hasScanned = false;
// This flag blocks peer init *while scanning* to prevent race conditions
let ALLOW_PEER_INIT = true;
// This flag prevents reload loops on disconnect
let IS_RELOADING = false; 

function openScanner() {
    if (isScanning || document.getElementById('scanner-modal').classList.contains('active')) {
        console.log('⚠ openScanner called but scanner is already active. Ignoring.');
        return;
    }
    console.log('📷 Opening scanner...');
    hasScanned = false;
    ALLOW_PEER_INIT = false; 
    console.log('🚫 BLOCKED peer auto-init');
    document.getElementById('scanner-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    startScanner();
}

function closeScanner() {
    if (!document.getElementById('scanner-modal').classList.contains('active')) {
        console.log('⚠ closeScanner called but modal is already closed.');
        return;
    }
    console.log('❌ Closing scanner...');
    document.getElementById('scanner-modal').classList.remove('active');
    document.body.style.overflow = '';
    stopScanner();
    if (!hasScanned && !IS_RELOADING) { 
        ALLOW_PEER_INIT = true;
        console.log('✅ RE-ENABLED peer auto-init');
    }
}

function startScanner() {
    if (html5QrCode || isScanning) {
        console.log('⚠ Scanner already running');
        return;
    }
    isScanning = true;
    console.log('🎥 Starting camera...');

    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 30,
        qrbox: function(viewfinderWidth, viewfinderHeight) {
            let minDimension = Math.min(viewfinderWidth, viewfinderHeight);
            let qrboxSize = Math.floor(minDimension * 0.8);
            return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
        disableFlip: false
    };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            if (hasScanned) {
                console.log('⚠ Already processed, ignoring...');
                return;
            }
            hasScanned = true;
            
            console.log('✓✓✓ QR SCANNED:', decodedText);
            
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            setTimeout(() => {
                console.log('→ Calling processQRCode NOW (from timeout)...');
                processQRCode(decodedText);

                console.log('→ Calling closeScanner NOW (from timeout)...');
                closeScanner();
            }, 0); 
        },
        (errorMessage) => {
            // Silent
        }
    ).catch((err) => {
        console.error('❌ Scanner error:', err);
        isScanning = false;
        ALLOW_PEER_INIT = true; 
        showChatStatus('❌ Camera error: ' + err.name, true);
        closeScanner();
    });
}

/**
 * UPDATED: This function now sets the URL hash and reloads the page.
 */
function processQRCode(decodedText) {
    if (IS_RELOADING) {
        console.log('⚠ Already processing QR and reloading. Ignoring.');
        return;
    }
    IS_RELOADING = true; // Set flag immediately

    console.log('=== PROCESSING QR CODE ===');
    console.log('URL:', decodedText);
    
    try {
        const url = new URL(decodedText);
        console.log('✓ Valid URL');
        console.log('Hash:', url.hash);
        
        const scannedPeerId = url.hash.substring(1);
        console.log('🎯 Extracted Peer ID:', scannedPeerId);
        
        if (!scannedPeerId || scannedPeerId.trim() === '') {
            console.error('❌ Empty peer ID!');
            showChatStatus('QR code has no peer ID', true);
            hasScanned = false; 
            ALLOW_PEER_INIT = true;
            IS_RELOADING = false; 
            return;
        }
        
        console.log('✓ Peer ID is valid');
        
        console.log('🔄 Setting hash and reloading to switch to CLIENT mode...');
        window.location.hash = scannedPeerId;
        window.location.reload();

    } catch (e) {
        console.error('❌❌❌ QR parse FAILED:', e);
        showChatStatus('Invalid QR code: ' + e.message, true);
        hasScanned = false; 
        ALLOW_PEER_INIT = true;
        IS_RELOADING = false; 
    }
}

function stopScanner() {
    if (html5QrCode && isScanning) {
        console.log('🛑 Stopping scanner...');
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            isScanning = false;
            console.log('✓ Scanner stopped');
        }).catch((err) => {
            console.error('Stop error:', err);
            html5QrCode = null;
            isScanning = false;
        });
    }
}
// ----- END SCANNER FUNCTIONS -----


// ----- APP STATE & DOM ELEMENTS -----

// --- NEW CALL STATE VARS ---
let localStream = null;
let remoteStream = null;
let currentCall = null;
let isCallActive = false;
let callTimerInterval = null;
let callStartTime = 0;
// --- END NEW CALL STATE VARS ---

// Global App State
window.APP_PEER = null;
window.APP_CONNECTION = null;
let currentConnection = null;
let peer = null;
let myId = '';
let connectUrl = '';
let isHost = false; 
let connectionRetryCount = 0;
const MAX_RETRY = 3;

// File Transfer State
let fileQueue = []; 
let isSending = false;
let activeSend = null; 
let receivingFiles = new Map(); 
let hasActiveTransfer = false; 
let heartbeatInterval = null;

// --- CHAT STATE VARIABLES ---
let typingTimer;
let isTypingSent = false;
let peerTypingTimer;
let replyingTo = null; // Reply State

// DOM Elements
let statusEl, qrCodeContainer, qrEl, scanInstructions, fileInput, transferStatusEl, shareButtonsContainer, nativeShareButton, copyLinkButton, downloadQrButton, transferListContainer, chatContainer, chatPlaceholder, chatMessages, chatInput, chatSendButton, chatAttachButton, chatImageInput, chatLimitsInfo, chatStatus, replyContextBar, replyContextClose, callModalOverlay, localVideo, remoteVideo, callStatus, callTimer, callAvatar, startVideoCallButton, startVoiceCallButton, toggleMicButton, toggleVideoButton, endCallButton, incomingCallToast, incomingCallType, acceptCallButton, rejectCallButton;

// Helper function to assign all DOM elements
function assignDOMElements() {
    statusEl = document.getElementById('status');
    qrCodeContainer = document.getElementById('qr-code-container');
    qrEl = document.getElementById('qrcode');
    scanInstructions = document.getElementById('scan-instructions');
    fileInput = document.getElementById('file-input');
    transferStatusEl = document.getElementById('transfer-status');
    shareButtonsContainer = document.getElementById('share-buttons-container');
    nativeShareButton = document.getElementById('native-share-button');
    copyLinkButton = document.getElementById('copy-link-button');
    downloadQrButton = document.getElementById('download-qr-button');
    transferListContainer = document.getElementById('transfer-list-container');
    
    // CHAT ELEMENTS
    chatContainer = document.getElementById('chat-container');
    chatPlaceholder = document.getElementById('chat-placeholder');
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    chatSendButton = document.getElementById('chat-send-button');
    chatAttachButton = document.getElementById('chat-attach-button');
    chatImageInput = document.getElementById('chat-image-input');
    chatLimitsInfo = document.getElementById('chat-limits-info');
    chatStatus = document.getElementById('chat-status');

    // REPLY BAR ELEMENTS
    replyContextBar = document.getElementById('reply-context-bar');
    replyContextClose = document.getElementById('reply-context-close');

    // MODAL & CALL ELEMENTS
    callModalOverlay = document.getElementById('call-modal-overlay');
    localVideo = document.getElementById('local-video');
    remoteVideo = document.getElementById('remote-video');
    callStatus = document.getElementById('call-status');
    callTimer = document.getElementById('call-timer');
    callAvatar = document.getElementById('call-avatar');
    startVideoCallButton = document.getElementById('start-video-call');
    startVoiceCallButton = document.getElementById('start-voice-call');
    toggleMicButton = document.getElementById('toggle-mic-button');
    toggleVideoButton = document.getElementById('toggle-video-button');
    endCallButton = document.getElementById('end-call-button');
    incomingCallToast = document.getElementById('incoming-call-toast');
    incomingCallType = document.getElementById('incoming-call-type');
    acceptCallButton = document.getElementById('accept-call-button');
    rejectCallButton = document.getElementById('reject-call-button');
}
// ----- END APP STATE & DOM -----


// ----- UI & HELPER FUNCTIONS -----

function showConnectionAnimation() {
    const overlay = document.getElementById('connection-overlay');
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 2000);
}

/**
 * Creates and appends a progress bar UI to the transfer list.
 * @param {string} fileId - The unique ID for this transfer.
 * @param {string} fileName - The name of the file.
 * @param {boolean} isSender - True if this is a sending bar, false for receiving.
 */
function createTransferUI(fileId, fileName, isSender) {
    const container = document.getElementById('transfer-list-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'progress-container';
    el.id = `transfer-${fileId}`;

    const label = isSender ? `Sending: ${fileName}` : `Receiving: ${fileName}`;
    const cancelButtonHTML = `<button class="cancel-button" data-file-id="${fileId}">❌</button>`; 

    el.innerHTML = `
        <div class="progress-top-row">
            <div class="progress-bar-wrapper">
                <div class="progress-label">
                    <span class="progress-label-text">${label}</span>
                    <span class="progress-percentage">0%</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            ${cancelButtonHTML}
        </div>
        <div class="progress-stats">
            <span class="progress-size">-- MB / -- MB</span>
            <span class="progress-eta">ETA: --:--</span>
        </div>
    `;

    container.appendChild(el);
    
    // Add click listener
    el.querySelector('.cancel-button').addEventListener('click', () => {
        console.log(`[DEBUG] Cancel button clicked for fileId: ${fileId}, isSender: ${isSender}`); 
        if (isSender) {
            cancelTransfer(fileId);
        } else {
            cancelReceive(fileId); 
        }
    });
}

/**
 * Updates a specific progress bar in the UI.
 * @param {string} fileId - The ID of the transfer to update.
 * @param {object} options - The values to update.
 */
function updateTransferUI(fileId, options) {
    const el = document.getElementById(`transfer-${fileId}`);
    if (!el) return;

    const bar = el.querySelector('.progress-bar');
    const percentage = el.querySelector('.progress-percentage');
    const size = el.querySelector('.progress-size');
    const eta = el.querySelector('.progress-eta');
    const label = el.querySelector('.progress-label-text');

    if (!bar || !percentage || !size || !eta || !label) return;

    if (options.percent != null) {
        bar.style.width = `${options.percent}%`;
        percentage.textContent = `${options.percent}%`;
    }
    if (options.sizeText) size.textContent = options.sizeText;
    if (options.etaText) eta.textContent = options.etaText;
    
    if (options.status === 'pending') {
        bar.classList.add('pending');
        label.style.opacity = 0.7;
        percentage.textContent = 'Pending';
        size.textContent = options.sizeText; // Show file size for pending
        eta.textContent = '';
    } else {
         bar.classList.remove('pending');
         label.style.opacity = 1;
    }
}

/**
 * Shows a temporary status message in the chat UI.
 */
function showChatStatus(message, isError = false) {
    if (!chatStatus) return;
    chatStatus.textContent = message;
    chatStatus.style.color = isError ? 'var(--error)' : 'var(--success)';
    chatStatus.style.opacity = 1;
    
    // Clear any existing timer
    clearTimeout(peerTypingTimer); 
    
    // Hide after 3 seconds
    peerTypingTimer = setTimeout(() => {
        chatStatus.style.opacity = 0;
    }, 3000);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    if (seconds === Infinity || isNaN(seconds)) return '--:--';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
// ----- END UI & HELPER FUNCTIONS -----


// ----- CHAT LOGIC -----
const MAX_WORDS = 1000;
const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves with the Base64 string.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * @returns {{wordCount: number, imageCount: number, imageSize: number}}
 */
function getChatLimits() {
    if (!chatMessages) return { wordCount: 0, imageCount: 0, imageSize: 0 };
    const textMessages = chatMessages.querySelectorAll('.chat-message[data-type="text"]');
    const imageMessages = chatMessages.querySelectorAll('.chat-message[data-type="image"]');

    let totalWords = 0;
    textMessages.forEach(msg => {
        totalWords += parseInt(msg.dataset.words || 0, 10);
    });

    let totalImageSize = 0;
    imageMessages.forEach(img => {
        totalImageSize += parseInt(img.dataset.size || 0, 10);
    });

    return {
        wordCount: totalWords,
        imageCount: imageMessages.length,
        imageSize: totalImageSize
    };
}

function pruneChat() {
    if (!chatMessages) return;
    // Prune text
    const textMessages = Array.from(chatMessages.querySelectorAll('.chat-message[data-type="text"]'));
    let { wordCount } = getChatLimits(); // Get current word count

    while (wordCount > MAX_WORDS && textMessages.length > 0) {
        const oldMsg = textMessages.shift(); // Get oldest message
        const wordsToRemove = parseInt(oldMsg.dataset.words || 0, 10);
        wordCount -= wordsToRemove;
        oldMsg.remove();
    }

    // Prune images
    const imageMessages = Array.from(chatMessages.querySelectorAll('.chat-message[data-type="image"]'));
    let { imageCount, imageSize } = getChatLimits(); // Get current image stats

    while ((imageCount > MAX_IMAGES || imageSize > MAX_IMAGE_SIZE) && imageMessages.length > 0) {
        const oldImg = imageMessages.shift(); // Get oldest image
        const sizeToRemove = parseInt(oldImg.dataset.size || 0, 10);
        imageSize -= sizeToRemove;
        imageCount--;
        oldImg.remove();
    }
}

function updateChatLimitsUI() {
    if (!chatLimitsInfo) return;
    const { wordCount, imageCount, imageSize } = getChatLimits();
    chatLimitsInfo.textContent = `Words: ${wordCount}/${MAX_WORDS} | Images: ${imageCount}/${MAX_IMAGES} (${formatBytes(imageSize)}/10 MB)`;
}

/**
 * @param {string} type - 'text' or 'image'
 * @param {string} content - The text message or Base64 image data
 * @param {string} sender - 'sender' or 'receiver'
 * @param {object} metadata - { words: number } or { size: number, name: string }
 * @param {string} msgId - The unique message ID
 * @param {object} replyContext - Optional: { text: string }
 */
function addMessageToDOM(type, content, sender, metadata, msgId, replyContext = null) {
    if (!chatMessages) return;
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${sender}`;
    msgEl.dataset.type = type;
    msgEl.dataset.msgId = msgId;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';

    // --- NEW: Add Reply Context ---
    if (replyContext && replyContext.text) {
        const replyEl = document.createElement('div');
        replyEl.className = 'message-reply-context';
        replyEl.textContent = replyContext.text;
        msgEl.appendChild(replyEl);
    }
    // --- END NEW ---

    let textContentForReply = ''; // Store text for reply function

    if (type === 'text') {
        contentEl.textContent = content;
        msgEl.dataset.words = metadata.words;
        textContentForReply = content; // Store text
    } else if (type === 'image') {
        const img = document.createElement('img');
        img.src = content; // 'content' is Base64 data
        img.dataset.filename = metadata.name; // Store filename for download
        textContentForReply = `Image: ${metadata.name}`; // Store image name
        
        // --- MODIFIED CLICK HANDLER (passes msgId) ---
        img.onclick = () => {
            openImageModal(img.src, img.dataset.filename, sender, msgId);
        };
        // --- END MODIFIED HANDLER ---
        
        img.onload = () => {
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll on image load
        };
        contentEl.appendChild(img);
        msgEl.dataset.size = metadata.size;
    }
    
    msgEl.appendChild(contentEl);

    // --- NEW: Add Reply Button ---
    const replyBtn = document.createElement('button');
    replyBtn.className = 'chat-message-reply-btn';
    replyBtn.title = 'Reply';
    replyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>';
    replyBtn.onclick = () => {
        setReplyContext(msgId, textContentForReply);
    };
    msgEl.appendChild(replyBtn);
    // --- END NEW ---


    // Add status bar (for sender only)
    if (sender === 'sender') {
        const statusBar = document.createElement('div');
        statusBar.className = 'message-status-bar';
        
        if (type === 'image') {
             const downloadStatus = document.createElement('span');
             downloadStatus.className = 'download-status';
             downloadStatus.textContent = 'Downloaded by peer';
             statusBar.appendChild(downloadStatus);
        }
        
        const msgStatus = document.createElement('span');
        msgStatus.className = 'msg-status';
        msgStatus.innerHTML = '✓'; // One tick
        statusBar.appendChild(msgStatus);
        
        msgEl.appendChild(statusBar);
    }

    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendTextMessage() {
    const message = chatInput.value.trim();
    if (message === '' || !currentConnection || !currentConnection.open) return;

    const wordCount = message.split(/\s+/).length;
    const msgId = crypto.randomUUID();
    
    try {
        currentConnection.send({ 
            type: 'chat-text', 
            message: message, 
            msgId: msgId,
            replyContext: replyingTo // --- NEW: Send reply context
        });
        addMessageToDOM('text', message, 'sender', { words: wordCount }, msgId, replyingTo); // --- NEW: Pass context
        pruneChat();
        updateChatLimitsUI();
        chatInput.value = '';
        cancelReply(); // --- NEW: Clear reply state
        
        // Stop typing indicator after send
        clearTimeout(typingTimer);
        isTypingSent = false;
        currentConnection.send({ type: 'chat-stop-typing' });

    } catch (e) {
        console.error("Chat send error:", e);
        showChatStatus('Message send error', true);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
        showChatStatus('❌ Image is too large (Max 10MB)', true);
        return;
    }
    
    const { imageCount, imageSize } = getChatLimits();
    if (imageCount >= MAX_IMAGES || imageSize + file.size > MAX_IMAGE_SIZE) {
         showChatStatus('Image quota full. Old images will be removed.', true);
         // We still allow sending, pruneChat() will handle removal.
    }

    fileToBase64(file).then(base64data => {
        if (!currentConnection || !currentConnection.open) return;
        
        const msgId = crypto.randomUUID();
        const metadata = { size: file.size, name: file.name };

        try {
            currentConnection.send({
                type: 'chat-image',
                name: file.name,
                fileType: file.type,
                size: file.size,
                data: base64data,
                msgId: msgId,
                replyContext: replyingTo // --- NEW: Send reply context with image
            });
            addMessageToDOM('image', base64data, 'sender', metadata, msgId, replyingTo); // --- NEW: Pass context
            pruneChat();
            updateChatLimitsUI();
            cancelReply(); // --- NEW: Clear reply state
        } catch (e) {
            console.error("Image send error:", e);
            showChatStatus('Image send error', true);
        }
    }).catch(err => {
        console.error("Base64 conversion error:", err);
        showChatStatus('Could not read image', true);
    });
    
    event.target.value = null; // Clear input
}

/**
 * @param {string} msgId
 */
function sendImageDownloadNotification(msgId) {
    if (currentConnection && currentConnection.open && msgId) {
        try {
            currentConnection.send({ type: 'chat-img-download', msgId: msgId });
        } catch (e) {
            console.error("Failed to send download notification:", e);
        }
    }
}

/**
 * @param {string} msgId
 * @param {string} text
 */
function setReplyContext(msgId, text) {
    if (!replyContextBar || !replyContextClose) return;
    
    const truncatedText = text.length > 70 ? text.substring(0, 70) + '...' : text;
    
    replyingTo = { msgId, text: truncatedText };
    
    document.getElementById('reply-context-content').textContent = truncatedText;
    replyContextBar.style.display = 'block';
    
    chatInput.focus();
}

function cancelReply() {
    if (!replyContextBar) return;
    replyingTo = null;
    replyContextBar.style.display = 'none';
}
// ----- END CHAT LOGIC -----


// ----- CALL LOGIC -----
/**
 * @param {boolean} isVideo - True for video call, false for voice
 */
async function startCall(isVideo) {
    if (!currentConnection || !currentConnection.open || isCallActive) {
        showChatStatus('❌ Not connected or already in call', true);
        return;
    }
    
    console.log(`Starting ${isVideo ? 'video' : 'voice'} call...`);
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: isVideo,
            audio: true
        });
        
        showCallUI(true, isVideo); // Show our own UI
        
        if (isVideo) {
            localVideo.srcObject = localStream;
            localVideo.style.display = 'block';
            toggleVideoButton.classList.add('active');
            toggleVideoButton.querySelector('.icon-video-on').style.display = 'block';
            toggleVideoButton.querySelector('.icon-video-off').style.display = 'none';
            callAvatar.style.display = 'none';
        } else {
            localVideo.style.display = 'none';
            toggleVideoButton.classList.remove('active');
            toggleVideoButton.querySelector('.icon-video-on').style.display = 'none';
            toggleVideoButton.querySelector('.icon-video-off').style.display = 'block';
            callAvatar.style.display = 'flex';
        }
        toggleMicButton.classList.add('active'); // Mic is on by default
        toggleMicButton.querySelector('.icon-mic-on').style.display = 'block';
        toggleMicButton.querySelector('.icon-mic-off').style.display = 'none';

        
        console.log('Initiating peer.call()...');
        currentCall = peer.call(currentConnection.peer, localStream, {
            metadata: { isVideo: isVideo }
        });
        
        currentCall.on('stream', setupRemoteStream);
        currentCall.on('close', endCall);
        currentCall.on('error', (err) => {
            console.error('Call error:', err);
            endCall();
        });
        
        callStatus.textContent = 'Ringing...';
        isCallActive = true; 
        
    } catch (err) {
        console.error('getUserMedia error:', err);
        showChatStatus(`❌ ${err.name}`, true);
        cleanupCall();
    }
}

async function answerCall() {
    if (!currentCall || isCallActive) return;
    
    console.log('Answering call...');
    hideIncomingCallToast();
    
    isCallActive = true;
    
    const isVideo = currentCall.metadata.isVideo;
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: isVideo,
            audio: true
        });
        
        showCallUI(true, isVideo); // Show call UI
        
        if (isVideo) {
            localVideo.srcObject = localStream;
            localVideo.style.display = 'block';
            toggleVideoButton.classList.add('active');
            toggleVideoButton.querySelector('.icon-video-on').style.display = 'block';
            toggleVideoButton.querySelector('.icon-video-off').style.display = 'none';
            callAvatar.style.display = 'none';
        } else {
            localVideo.style.display = 'none';
            toggleVideoButton.classList.remove('active');
            toggleVideoButton.querySelector('.icon-video-on').style.display = 'none';
            toggleVideoButton.querySelector('.icon-video-off').style.display = 'block';
            callAvatar.style.display = 'flex';
        }
        toggleMicButton.classList.add('active');
        toggleMicButton.querySelector('.icon-mic-on').style.display = 'block';
        toggleMicButton.querySelector('.icon-mic-off').style.display = 'none';
        
        // Answer the call and send our stream
        currentCall.answer(localStream);
        
        currentCall.on('stream', setupRemoteStream);
        currentCall.on('close', endCall);
        currentCall.on('error', (err) => {
            console.error('Call error:', err);
            endCall();
        });
        
        callStatus.textContent = 'Connected';
        startCallTimer();
        
    } catch (err) {
        console.error('getUserMedia error:', err);
        showChatStatus(`❌ ${err.name}`, true);
        rejectCall(); // Reject if we can't get media
    }
}

function rejectCall() {
    console.log('Rejecting call...');
    
    if (currentCall) {
        currentCall.close(); // This *is* the rejection
        currentCall = null;
    }
    hideIncomingCallToast();
    cleanupCall();
}

function toggleMic() {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleMicButton.classList.toggle('active');
        toggleMicButton.querySelector('.icon-mic-on').style.display = audioTrack.enabled ? 'block' : 'none';
        toggleMicButton.querySelector('.icon-mic-off').style.display = audioTrack.enabled ? 'none' : 'block';
    }
}

function toggleVideo() {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleVideoButton.classList.toggle('active');
        toggleVideoButton.querySelector('.icon-video-on').style.display = videoTrack.enabled ? 'block' : 'none';
        toggleVideoButton.querySelector('.icon-video-off').style.display = videoTrack.enabled ? 'none' : 'block';
        
        callAvatar.style.display = videoTrack.enabled ? 'none' : 'flex';
        localVideo.style.display = videoTrack.enabled ? 'block' : 'none';
        
        if (currentConnection && currentConnection.open) {
            currentConnection.send({ type: 'call-toggle-video', isVideoOn: videoTrack.enabled });
        }
    }
}

function endCall() {
    console.log('Ending call...');
    if (currentCall) {
        currentCall.close();
        currentCall = null; 
    }
    if (currentConnection && currentConnection.open) {
        currentConnection.send({ type: 'call-end' });
    }
    cleanupCall();
}

function cleanupCall() {
    console.log('Cleaning up call...');
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    isCallActive = false;
    
    stopCallTimer();
    showCallUI(false);
    hideIncomingCallToast();
}

/**
 * @param {MediaStream} stream
 */
function setupRemoteStream(stream) {
    console.log('Received remote stream');
    remoteStream = stream;
    remoteVideo.srcObject = stream;
    remoteVideo.style.display = 'block';
    
    if (stream.getVideoTracks().length > 0) {
        callAvatar.style.display = 'none';
    } else {
        callAvatar.style.display = 'flex';
    }
    
    callStatus.textContent = 'Connected';
    startCallTimer();
}

/**
 * @param {boolean} show
 * @param {boolean} [isVideo=false]
 */
function showCallUI(show, isVideo = false) {
    if (show) {
        callModalOverlay.classList.add('active');
        toggleVideoButton.style.display = isVideo ? 'flex' : 'none';
        localVideo.style.display = isVideo ? 'block' : 'none';
        remoteVideo.style.display = 'none'; // Hide remote until stream arrives
        callAvatar.style.display = isVideo ? 'none' : 'flex';
    } else {
        callModalOverlay.classList.remove('active');
    }
}

function showIncomingCallToast(isVideo) {
    incomingCallType.textContent = `Incoming ${isVideo ? 'Video' : 'Voice'} Call...`;
    incomingCallToast.classList.add('active');
}

function hideIncomingCallToast() {
    incomingCallToast.classList.remove('active');
}

function startCallTimer() {
    stopCallTimer();
    callStartTime = Date.now();
    callTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        callTimer.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
    callTimer.textContent = '00:00';
}
// ----- END CALL LOGIC -----


// ----- PEERJS CONNECTION LOGIC -----

// --- ZAROORI! Yahaan RENDER.COM ka URL daalein ---
// Jab aap Step 2 (Render deploy) poora kar lein, to Render se mila URL
// (e.g., 'my-server-123.onrender.com') yahaan paste karein.
const RENDER_HOST = 'qr-send-server.onrender.com'; // <--- YEH SIRF PLACEHOLDER HAI

const CHUNK_SIZE = 64 * 1024; // 64KB

// Reload Warning
window.addEventListener('beforeunload', (event) => {
    hasActiveTransfer = isSending || receivingFiles.size > 0;
    if (hasActiveTransfer || (currentConnection && currentConnection.open)) {
        
        // --- CLIENT RELOAD FIX ---
        // Agar Client reload karta hai, to hash ko mita do
        // taaki woh Host bankar wapas aaye.
        if (!isHost) {
            console.log('Client is reloading, clearing hash to become host.');
            // Forcefully clear the hash.
            window.location.hash = ''; 
        }
        // --- END CLIENT RELOAD FIX ---

        const warningText = 'Changes you made may not be saved.';
        event.preventDefault();
        event.returnValue = warningText;
        return warningText;
    }
});

function initializePeer() {
    if (!ALLOW_PEER_INIT) {
        console.log('🚫 Peer init BLOCKED (scanner active)');
        return;
    }
    
    console.log('🔧 Initializing peer...');
    statusEl.textContent = 'Initializing...';
    
    try {
        // --- YEH BADLAAV ZAROORI HAI ---
        // Hum ab Peer() ko bata rahe hain ki humara apna server hai
        peer = new Peer(undefined, {
            host: RENDER_HOST,    // Aapke Render server ka host
            port: 443,            // Render.com 'https' ke liye port 443 use karta hai
            path: '/peerjs',      // Aapke server.js ka path
            secure: true,         // HTTPS ke liye zaroori
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { 
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ],
                sdpSemantics: 'unified-plan'
            },
            debug: 1
        });
        // --- END BADLAAV ---
        
        window.APP_PEER = peer;
        
    } catch (e) {
        console.error('❌ Init error:', e);
        statusEl.textContent = '❌ Error';
        return;
    }

    peer.on('open', (id) => {
        myId = id;
        console.log('✓ Peer ID:', id);
        const peerToConnect = window.location.hash.substring(1);

        if (peerToConnect) {
            // --- CLIENT MODE ---
            console.log('→ CLIENT MODE');
            isHost = false;
            statusEl.textContent = '🔗 Connecting...';
            qrCodeContainer.style.display = 'none'; 
            shareButtonsContainer.style.display = 'none';
            scanInstructions.style.display = 'none';
            attemptConnection(peerToConnect); 
        } else {
            // --- HOST MODE ---
            console.log('→ HOST MODE');
            isHost = true;
            qrCodeContainer.style.display = 'block';
            scanInstructions.style.display = 'none';
            
            statusEl.textContent = 'Generating QR...';
            
            // Yahaan hum Netlify URL ka istemaal karenge
            connectUrl = `${window.location.origin}${window.location.pathname}#${myId}`;
            qrEl.innerHTML = '';
            
            new QRCode(qrEl, {
                text: connectUrl,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            shareButtonsContainer.style.display = 'flex';
            setTimeout(setupShareButton, 100);
            statusEl.textContent = '✅ Ready';
        }
    });

    peer.on('connection', (conn) => {
        console.log('📡 Incoming connection');
        if (currentConnection) {
            console.log('⚠ Already connected, rejecting new connection.');
            conn.close();
            return;
        }
        
        statusEl.textContent = '📡 Incoming...';
        
        if (conn.open) {
            setupConnection(conn);
        } else {
            conn.on('open', () => setupConnection(conn));
        }
    });

    // --- HANDLE INCOMING CALLS ---
    peer.on('call', (call) => {
        console.log('Incoming call...');
        
        if (currentCall || isCallActive) {
            console.log('⚠ Already in call, rejecting new one.');
            return;
        }
        
        currentCall = call;
        const isVideo = call.metadata.isVideo;
        
        showIncomingCallToast(isVideo);
    });
    // --- END NEW CALL HANDLER ---

    peer.on('error', (err) => {
        console.error('❌ Peer error:', err.type);
        // Error handling logic (Retry, Reload)
        if (err.type === 'peer-unavailable') { 
            if (!isHost && connectionRetryCount < MAX_RETRY) {
                connectionRetryCount++;
                statusEl.textContent = `🔄 Retry ${connectionRetryCount}`;
                setTimeout(() => {
                    const targetId = window.location.hash.substring(1);
                    if (targetId) attemptConnection(targetId);
                }, 2000);
            } else if (!isHost) {
                statusEl.textContent = '❌ Peer not found';
                showSwitchButton(); 
            }
        } else if (!isHost && (err.type === 'network' || err.type === 'webrtc' || err.type === 'server-error' || err.type === 'socket-error')) { 
            statusEl.textContent = '❌ Connection Error. Reloading...';
            if (IS_RELOADING) return;
            IS_RELOADING = true;
            window.location.hash = '';
            window.location.reload();
        } else if (isHost) {
            console.error('Host peer error:', err.type);
            if (err.type === 'disconnected') {
                console.log('Host disconnected from server, attempting to reconnect...');
                statusEl.textContent = 'Reconnecting...';
                try {
                    peer.reconnect();
                } catch (e) {
                    console.error('Host reconnect failed', e);
                    statusEl.textContent = '⚠️ Connection Lost';
                }
            } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
                statusEl.textContent = '⚠️ Network Error. Reloading page...';
                if (IS_RELOADING) return;
                IS_RELOADING = true;
                // Host ko bhi reload kar dena behtar hai
                window.location.hash = '';
                window.location.reload();
            }
        }
    });
}

/**
 * Naya "Go to Host Mode" button
 */
function showSwitchButton() {
    if (document.getElementById('switch-mode-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'switch-mode-btn';
    btn.textContent = '🔄 Go to Host Mode';
    btn.className = 'switch-mode-button';
    btn.onclick = () => {
        btn.remove();
        window.location.hash = '';
        window.location.reload();
    };
    document.querySelector('.transfer-area').appendChild(btn);
}

function attemptConnection(targetId) {
    console.log('→ Attempting connection to:', targetId);
    let connectionFailed = false;
    let connectionTimer = null;
    
    const handleFailure = (message) => {
        if (connectionFailed) return;
        connectionFailed = true;
        if (connectionTimer) clearTimeout(connectionTimer);
        console.error('❌ Connection failed:', message);
        
        if (connectionRetryCount < MAX_RETRY) {
            connectionRetryCount++;
            statusEl.textContent = `🔄 Retry ${connectionRetryCount}`;
            setTimeout(() => attemptConnection(targetId), 2000);
        } else {
            statusEl.textContent = '❌ Failed to connect';
            showSwitchButton(); // Show button to go back
        }
    };

    try {
        connectionTimer = setTimeout(() => handleFailure('Timeout'), 20000);
        
        const conn = peer.connect(targetId, { 
            reliable: true,
            serialization: 'binary' // File transfer ke liye behtar
        });

        conn.on('open', () => {
            console.log('✓✓✓ CONNECTION OPENED!');
            clearTimeout(connectionTimer);
            if (!connectionFailed) {
                connectionRetryCount = 0;
                setupConnection(conn);
            }
        });

        conn.on('error', (err) => {
            console.error('❌ Connection error:', err);
            handleFailure('Error');
        });
        
        conn.on('close', () => {
            console.log('⚠ Connection closed early');
            if (!currentConnection) handleFailure('Closed');
        });
    } catch (e) {
        console.error('❌ Connect exception:', e);
        handleFailure('Failed');
    }
}

function setupConnection(conn) {
    console.log('✓ Setup connection');
    currentConnection = conn;
    window.APP_CONNECTION = conn;
    showConnectionAnimation();
    
    statusEl.textContent = '🔐 Connected!';
    fileInput.disabled = false;
    transferStatusEl.textContent = '✅ Ready';
    
    qrCodeContainer.style.display = 'none';
    shareButtonsContainer.style.display = 'none';
    scanInstructions.style.display = 'block';

    // --- SHOW CHAT ---
    chatPlaceholder.style.display = 'none';
    chatContainer.style.display = 'flex'; 
    updateChatLimitsUI();
    
    const switchBtn = document.getElementById('switch-mode-btn');
    if (switchBtn) switchBtn.remove();
    
    if (isHost) startHeartbeat();

    setTimeout(() => {
        if (currentConnection && currentConnection.open) {
            try {
                currentConnection.send({ type: 'ready' });
            } catch(e) {
                console.error("Failed to send ready signal", e);
            }
        }
    }, 100);

    conn.on('data', (data) => {
        
        // --- HEARTBEAT & READY ---
        if (data.type === 'ready') {
            statusEl.textContent = '✅ Ready!';
            return;
        }
        if (data.type === 'heartbeat-ping') {
            conn.send({ type: 'heartbeat-pong' });
            return;
        }
        if (data.type === 'heartbeat-pong') return;

        // --- CHAT LOGIC ---
        if (data.type === 'chat-text') {
            addMessageToDOM('text', data.message, 'receiver', { words: data.message.split(/\s+/).length }, data.msgId, data.replyContext);
            conn.send({ type: 'chat-read', msgId: data.msgId }); // Send read receipt
            pruneChat();
            updateChatLimitsUI();
            return;
        }
        if (data.type === 'chat-image') {
            addMessageToDOM('image', data.data, 'receiver', { size: data.size, name: data.name }, data.msgId, data.replyContext);
            conn.send({ type: 'chat-read', msgId: data.msgId }); // Send read receipt
            pruneChat();
            updateChatLimitsUI();
            return;
        }
        if (data.type === 'chat-typing') {
            chatStatus.textContent = 'Typing...';
            chatStatus.style.opacity = 1;
            clearTimeout(peerTypingTimer);
            peerTypingTimer = setTimeout(() => { chatStatus.style.opacity = 0; }, 3500); // Auto-hide
            return;
        }
        if (data.type === 'chat-stop-typing') {
            clearTimeout(peerTypingTimer);
            chatStatus.style.opacity = 0;
            return;
        }
        if (data.type === 'chat-read') {
            const msgEl = document.querySelector(`.chat-message[data-msg-id="${data.msgId}"]`);
            if (msgEl) {
                const statusEl = msgEl.querySelector('.msg-status');
                if (statusEl) {
                    statusEl.innerHTML = '✓✓';
                    statusEl.classList.add('seen');
                }
            }
            return;
        }
        if (data.type === 'chat-img-download') {
            console.log(`[DEBUG] Received chat-img-download for msgId: ${data.msgId}`); 
            const msgEl = document.querySelector(`.chat-message[data-msg-id="${data.msgId}"]`);
            if (msgEl) {
                console.log(`[DEBUG] Found message element for download status.`); 
                const statusEl = msgEl.querySelector('.download-status');
                if (statusEl) {
                    console.log(`[DEBUG] Setting download status to 'inline'.`); 
                    statusEl.style.display = 'inline';
                }
            }
            return;
        }


        // --- CALL SIGNALING ---
        if (data.type === 'call-end') {
            console.log('Peer ended the call');
            cleanupCall();
            return;
        }
        
        if (data.type === 'call-toggle-video') {
            console.log('Peer toggled video:', data.isVideoOn);
            if (remoteVideo) {
                remoteVideo.style.display = data.isVideoOn ? 'block' : 'none';
            }
            if (callAvatar) {
                callAvatar.style.display = data.isVideoOn ? 'none' : 'flex';
            }
            return;
        }
        // --- END CALL SIGNALING ---


        // --- FILE TRANSFER LOGIC ---
        if (data.type === 'metadata') {
            const fileId = data.fileId;
            receivingFiles.set(fileId, {
                id: fileId,
                name: data.name,
                size: data.size,
                type: data.fileType,
                data: [],
                receivedBytes: 0,
                startTime: Date.now() 
            });
            
            createTransferUI(fileId, data.name, false);
            updateTransferUI(fileId, {
                percent: 0,
                sizeText: `0 / ${formatBytes(data.size)}`,
                etaText: 'ETA: --:--'
            });
            
            transferStatusEl.textContent = `Receiving...`;
        } else if (data.type === 'end') {
            const fileId = data.fileId;
            const fileData = receivingFiles.get(fileId);
            
            if (!fileData) return; // Already cancelled or finished

            const fileBlob = new Blob(fileData.data, { type: fileData.type });
            const downloadUrl = URL.createObjectURL(fileBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileData.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
            
            document.getElementById(`transfer-${fileId}`)?.remove();
            receivingFiles.delete(fileId);
            
            if (receivingFiles.size === 0 && !isSending) {
                transferStatusEl.textContent = `✅ Received`;
            }
        } else if (data.type === 'cancel') {
            const fileId = data.fileId;
            console.log(`Received cancel for: ${fileId}`);

            // 1. Is it our active send?
            if (activeSend && activeSend.id === fileId) {
                activeSend.status = 'cancelled'; 
                document.getElementById(`transfer-${fileId}`)?.remove();
                
                // We must manually stop and start the next file,
                isSending = false;
                activeSend = null;
                sendNextFileFromQueue();
            }
            // 2. Is it in our pending send queue?
            else if (fileQueue.some(job => job.id === fileId)) {
                fileQueue = fileQueue.filter(job => job.id !== fileId);
                document.getElementById(`transfer-${fileId}`)?.remove();
            }
            // 3. Is it our active receive?
            else if (receivingFiles.has(fileId)) {
                receivingFiles.delete(fileId);
                document.getElementById(`transfer-${fileId}`)?.remove();
                if (receivingFiles.size === 0 && !isSending) {
                    transferStatusEl.textContent = '❌ Cancelled by peer';
                }
            }
        } else {
            // This is a file chunk (ArrayBuffer)
            const fileId = data.fileId; 
            const chunk = data.chunk;
            
            const fileData = receivingFiles.get(fileId);
            if (!fileData) return; // No metadata for this chunk, ignore

            fileData.data.push(chunk);
            fileData.receivedBytes += chunk.byteLength;
            
            const percent = Math.round((fileData.receivedBytes / fileData.size) * 100);
            
            const elapsedTime = (Date.now() - fileData.startTime) / 1000;
            let etaText = 'ETA: --:--';
            if (elapsedTime > 0.5) {
                const speed = fileData.receivedBytes / elapsedTime;
                const remainingBytes = fileData.size - fileData.receivedBytes;
                const remainingTime = remainingBytes / speed;
                etaText = `ETA: ${formatTime(remainingTime)}`;
            }
            
            updateTransferUI(fileId, {
                percent: percent,
                sizeText: `${formatBytes(fileData.receivedBytes)} / ${formatBytes(fileData.size)}`,
                etaText: etaText
            });
        }
    });

    conn.on('close', () => handleDisconnect('Closed'));
    conn.on('error', (err) => {
        console.error("Connection error:", err);
        handleDisconnect('Error');
    });
    
    sendNextFileFromQueue();
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
        if (currentConnection && currentConnection.open) {
            try {
                currentConnection.send({ type: 'heartbeat-ping' });
            } catch (e) {}
        }
    }, 5000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

/**
 * --- CRITICAL FIX: handleDisconnect ---
 */
function handleDisconnect(message) {
    console.log('⚠ Disconnect:', message);
    stopHeartbeat();
    
    // --- HIDE CHAT & CALL UI ---
    if (chatContainer) chatContainer.style.display = 'none';
    if (chatPlaceholder) chatPlaceholder.style.display = 'flex';
    cleanupCall(); // End any active call
    
    if (currentConnection) {
        try { currentConnection.close(); } catch (e) {}
        currentConnection = null;
    }

    if (isHost) {
        // --- HOST LOGIC ---
        console.log('Host reset: waiting for new connection.');
        statusEl.textContent = '⚠️ Disconnected. Ready...';
        
        qrCodeContainer.style.display = 'block';
        shareButtonsContainer.style.display = 'flex';
        scanInstructions.style.display = 'none';
        fileInput.disabled = true;
        transferStatusEl.textContent = 'Waiting...';
        
        isSending = false;
        activeSend = null;
        fileQueue = [];
        receivingFiles.clear();
        transferListContainer.innerHTML = ''; 
        
    } else {
        // --- CLIENT LOGIC ---
        if (IS_RELOADING) return;
        IS_RELOADING = true;

        statusEl.textContent = '⚠️ Disconnected... Reloading...';
        
        if (peer && !peer.destroyed) {
            try { peer.destroy(); } catch (e) {}
            peer = null;
        }
        
        console.log('🔄 Client disconnected, reloading to host mode...');
        window.location.hash = '';
        window.location.reload();
    }
}
// ----- END PEERJS CONNECTION LOGIC -----


// ----- FILE TRANSFER LOGIC -----
function setupFileInputListener() {
    fileInput.addEventListener('change', (event) => {
        for (const file of event.target.files) {
            const fileId = crypto.randomUUID();
            const fileJob = {
                file: file,
                id: fileId,
                status: 'pending'
            };
            fileQueue.push(fileJob);
            
            createTransferUI(fileId, file.name, true);
            updateTransferUI(fileId, {
                status: 'pending',
                sizeText: formatBytes(file.size)
            });
        }
        event.target.value = null; // Clear input
        transferStatusEl.textContent = `📁 ${fileQueue.length} files queued`;
        
        if (currentConnection && currentConnection.open && !isSending) {
            sendNextFileFromQueue();
        }
    });
}

function sendNextFileFromQueue() {
    if (fileQueue.length === 0) {
        isSending = false;
        activeSend = null;
        if (receivingFiles.size === 0) {
            transferStatusEl.textContent = '✅ All sent!';
        }
        return;
    }
    
    if (!currentConnection || !currentConnection.open || isSending) return;
    
    isSending = true;
    const fileJob = fileQueue.shift();
    activeSend = fileJob; 
    
    fileJob.status = 'sending';
    const file = fileJob.file;
    
    transferStatusEl.textContent = `📤 Sending...`;
    
    const startTime = Date.now();

    try {
        currentConnection.send({
            type: 'metadata',
            fileId: fileJob.id, 
            name: file.name,
            size: file.size,
            fileType: file.type
        });
    } catch (e) {
        handleDisconnect('Send failed');
        return;
    }

    let offset = 0;
    const reader = new FileReader();

    reader.onload = (e) => {
        if (activeSend !== fileJob) {
            console.log('reader.onload fired for a cancelled/stale job. Ignoring.');
            return;
        }

        if (fileJob.status === 'cancelled') {
            isSending = false;
            activeSend = null;
            sendNextFileFromQueue(); // Try next file
            return;
        }
        
        if(!currentConnection || !currentConnection.open) {
            isSending = false;
            activeSend = null;
            fileQueue.unshift(fileJob);
            console.error("Connection lost during sending");
            return;
        }
    
        try {
            currentConnection.send({
                type: 'chunk',
                fileId: fileJob.id,
                chunk: e.target.result
            });
            
            offset += e.target.result.byteLength;
            
            updateProgress(fileJob.id, offset, file.size, startTime);

            if (offset < file.size) {
                readSlice(offset);
            } else {
                currentConnection.send({ type: 'end', fileId: fileJob.id });
                document.getElementById(`transfer-${fileJob.id}`)?.remove();
                isSending = false;
                activeSend = null;
                sendNextFileFromQueue(); // Send next file
            }
        } catch (err) {
            console.error("Send error:", err);
            // Handle send error, maybe retry or disconnect
            handleDisconnect("Chunk send error");
        }
    };
    
    reader.onerror = (e) => {
        isSending = false;
        activeSend = null;
        transferStatusEl.textContent = '❌ File Read error';
        document.getElementById(`transfer-${fileJob.id}`)?.remove();
        sendNextFileFromQueue(); // Try next file
    };

    function readSlice(o) {
        if (activeSend !== fileJob) {
             console.log('readSlice called for a cancelled/stale job. Ignoring.');
            return;
        }

        if (fileJob.status === 'cancelled') {
            isSending = false;
            activeSend = null;
            sendNextFileFromQueue();
            return;
        }
        const slice = file.slice(o, o + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    }
    
    readSlice(0);
}

/**
 * @param {string} fileId
 */
function cancelTransfer(fileId) {
    console.log(`[DEBUG] [cancelTransfer] called for ${fileId}`); 
    // Is it the active transfer?
    if (activeSend && activeSend.id === fileId) {
        console.log(`Cancelling active transfer: ${fileId}`);
        activeSend.status = 'cancelled'; 
        
        document.getElementById(`transfer-${fileId}`)?.remove();
        
        if (currentConnection && currentConnection.open) {
            try {
                currentConnection.send({ type: 'cancel', fileId: fileId });
            } catch (err) {}
        }
        
        isSending = false;
        activeSend = null;
        sendNextFileFromQueue(); // Start next file

    } else {
        // It's in the queue, just remove it
        console.log(`Cancelling pending transfer: ${fileId}`);
        fileQueue = fileQueue.filter(job => job.id !== fileId);
        document.getElementById(`transfer-${fileId}`)?.remove();
    }
    
    if (!isSending && fileQueue.length === 0) {
         transferStatusEl.textContent = '❌ Cancelled';
    }
}

/**
 * @param {string} fileId
 */
function updateProgress(fileId, sentBytes, totalBytes, startTime) {
    const percent = Math.round((sentBytes / totalBytes) * 100);
    const sizeText = `${formatBytes(sentBytes)} / ${formatBytes(totalBytes)}`;
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    let etaText = 'ETA: --:--';
    if (elapsedTime > 0.5) {
        const speed = sentBytes / elapsedTime;
        const remainingBytes = totalBytes - sentBytes;
        const remainingTime = remainingBytes / speed;
        etaText = `ETA: ${formatTime(remainingTime)}`;
    }
    
    updateTransferUI(fileId, {
        percent: percent,
        sizeText: sizeText,
        etaText: etaText
    });
}

/**
 * @param {string} fileId
 */
function cancelReceive(fileId) {
    console.log(`[DEBUG] [cancelReceive] called for ${fileId}`);
    receivingFiles.delete(fileId);
    
    document.getElementById(`transfer-${fileId}`)?.remove();
    
    if (currentConnection && currentConnection.open) {
        try {
            currentConnection.send({ type: 'cancel', fileId: fileId });
        } catch (err) {}
    }
    
    if (receivingFiles.size === 0 && !isSending) {
        transferStatusEl.textContent = '❌ Receive cancelled';
    }
}
// ----- END FILE TRANSFER LOGIC -----


// ----- SHARE & CLIPBOARD -----
function setupShareButton() {
    const canvas = qrEl.querySelector('canvas');
    if (!canvas || typeof navigator.share === 'undefined') {
        nativeShareButton.style.display = 'none';
        copyLinkButton.style.display = 'inline-flex';
        downloadQrButton.style.display = 'inline-flex';
        return;
    }

    canvas.toBlob((blob) => {
        if (!blob) {
            nativeShareButton.style.display = 'none';
            copyLinkButton.style.display = 'inline-flex';
            downloadQrButton.style.display = 'inline-flex';
            return;
        }
        
        const file = new File([blob], 'qr-code.png', { type: 'image/png' });
        const shareData = {
            title: 'QR Send',
            text: 'Scan to connect',
            url: connectUrl,
            files: [file]
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            nativeShareButton.style.display = 'inline-flex';
            copyLinkButton.style.display = 'none';
            downloadQrButton.style.display = 'none';
            nativeShareButton.onclick = async () => {
                try {
                    await navigator.share(shareData);
                } catch (err) {}
            };
        } else {
            nativeShareButton.style.display = 'none';
            copyLinkButton.style.display = 'inline-flex';
            downloadQrButton.style.display = 'inline-flex';
        }
    }, 'image/png');
}

function copyToClipboard(text, element) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        if(element) {
            const originalText = element.textContent;
            element.textContent = '✅ Copied!';
            setTimeout(() => {
                element.textContent = originalText;
            }, 1500);
        }
    } catch (err) {}
    document.body.removeChild(textarea);
}

function downloadQRCode() {
    try {
        const canvas = qrEl.querySelector('canvas');
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'qr-send.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    } catch (e) {}
}
// ----- END SHARE & CLIPBOARD -----


// ----- APP INITIALIZATION -----
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App initialized');
    
    // Pehle saare elements ko assign karein
    assignDOMElements();
    
    // Fir saare event listeners ko setup karein
    
    // CHAT LISTENERS
    chatSendButton.addEventListener('click', sendTextMessage);
    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            sendTextMessage();
        }
    });
    
    // Typing Indicator Logic
    chatInput.addEventListener('input', () => {
        if (!currentConnection || !currentConnection.open) return;
        
        if (!isTypingSent) {
            currentConnection.send({ type: 'chat-typing' });
            isTypingSent = true;
            setTimeout(() => { isTypingSent = false; }, 2000); 
        }
        
        clearTimeout(typingTimer);
        
        typingTimer = setTimeout(() => {
            if (currentConnection && currentConnection.open) {
                currentConnection.send({ type: 'chat-stop-typing' });
            }
        }, 3000);
    });
    
    chatInput.addEventListener('blur', () => {
         if (currentConnection && currentConnection.open) {
            currentConnection.send({ type: 'chat-stop-typing' });
         }
    });

    chatAttachButton.addEventListener('click', () => chatImageInput.click());
    chatImageInput.addEventListener('change', handleImageUpload);

    if (replyContextClose) {
        replyContextClose.addEventListener('click', cancelReply);
    }

    // CALL LISTENERS
    startVideoCallButton.addEventListener('click', () => startCall(true));
    startVoiceCallButton.addEventListener('click', () => startCall(false));
    toggleMicButton.addEventListener('click', toggleMic);
    toggleVideoButton.addEventListener('click', toggleVideo);
    endCallButton.addEventListener('click', endCall);
    acceptCallButton.addEventListener('click', answerCall);
    rejectCallButton.addEventListener('click', rejectCall);
    
    // FILE INPUT LISTENER
    setupFileInputListener();

    // SHARE BUTTON LISTENERS
    copyLinkButton.addEventListener('click', () => {
        if (connectUrl) copyToClipboard(connectUrl, copyLinkButton);
    });
    downloadQrButton.addEventListener('click', downloadQRCode);

    // MODAL LISTENERS
    const imageModalOverlay = document.getElementById('image-modal-overlay');
    if (imageModalOverlay) {
        imageModalOverlay.addEventListener('click', () => closeImageModal());
    }
    const imageModalCloseBtn = document.getElementById('image-modal-close-btn');
    if(imageModalCloseBtn) {
        imageModalCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeImageModal();
        });
    }

    // Start the app
    initializePeer();
});
// ----- END APP INITIALIZATION -----
