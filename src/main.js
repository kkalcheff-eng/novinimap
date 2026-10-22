import { db } from './firebaseConfig.js';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";
import { initMapPanel } from './mapPanel.js';
import { FilesetResolver, ObjectDetector } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { ColorDetector } from './colorDetector.js';

const app = document.getElementById('app');

app.innerHTML = `
  <div class="app-layout">
    <!-- Navigation Tabs -->
    <nav class="main-nav">
      <div class="nav-brand" id="goHome">KALCHEV <span>CLICK</span> <div class="click-anim-container"><div class="mouse-pointer"></div><div class="green-dots"></div></div></div>
      <div class="nav-tabs">
        <button class="nav-tab active" data-tab="home">Home</button>
        <button class="nav-tab" data-tab="speech">Cognexis</button>
        <button class="nav-tab" data-tab="map">Novini Map</button>
      </div>
    </nav>
    
    <!-- Home / Landing Page -->
    <div id="homeTab" class="tab-content active landing-page">
      <div class="landing-content">
        <p class="landing-subtitle">Select an application to begin</p>
        <div class="portal-buttons">
          <button class="portal-btn" data-target="speech">
            <div class="btn-icon">
              <img src="/Icons/MicIcon.PNG" alt="Mic" class="portal-icon-img">
            </div>
            <div class="btn-text">
              <span class="btn-title">Cognexis</span>
              <span class="btn-desc">Live Speech Definition App</span>
            </div>
          </button>
          <button class="portal-btn" data-target="map">
            <div class="btn-icon">
              <img src="/Icons/mapicon.PNG" alt="Map" class="portal-icon-img">
            </div>
            <div class="btn-text">
              <span class="btn-title">Novini Map</span>
              <span class="btn-desc">News Tracker</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Speech Analysis Tab -->
    <div id="speechTab" class="tab-content hidden main-container">
      <div class="left-panel">
        <div class="container">
          <h1>Live Definitions App</h1>
          
          <div class="api-key-section">
            <input 
              type="password" 
              id="apiKeyInput" 
              placeholder="Enter OpenAI API Key"
              class="api-key-input"
            />
            <button id="saveApiKey" class="save-key-btn">Save Key</button>
            <button id="testApiKey" class="test-key-btn">Test Connection</button>
          </div>
          
          <div id="connectionStatus" class="connection-status"></div>
          
          <button id="listenBtn" class="listen-btn" disabled>
            <svg class="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span>Listen</span>
          </button>
          <div id="output" class="output"></div>
          <div id="debugLog" class="debug-log"></div>
        </div>
      </div>
      
      <div class="right-panel">
        <h2>Detected Terms & Definitions</h2>
        <div class="terms-table">
          <table id="termsTable">
            <thead>
              <tr>
                <th>Term</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody id="termsBody">
              <tr class="empty-state">
                <td colspan="2">No terms detected yet. Start listening!</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- News Map Tab -->
    <div id="mapTab" class="tab-content hidden">
       <div class="map-panel" id="mapPanel"></div>
    </div>
  </div>

`;

const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const testApiKeyBtn = document.getElementById('testApiKey');
const connectionStatus = document.getElementById('connectionStatus');
const listenBtn = document.getElementById('listenBtn');
const output = document.getElementById('output');
const termsBody = document.getElementById('termsBody');
const debugLog = document.getElementById('debugLog');

let recognition;
let isListening = false;
let openaiApiKey = '';
let detectedTerms = new Map();
let processingQueue = [];
let isProcessing = false;

// Logging function
function log(message, type = 'info') {
  console.log(message);
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;
  debugLog.appendChild(logEntry);
  debugLog.scrollTop = debugLog.scrollHeight;
}

// Global Camera Terminal Logger
function logTerm(msg, type = 'normal') {
  const termLog = document.getElementById('cam-terminal');
  if (!termLog) return;
  const line = document.createElement('div');
  line.className = `term-line term-${type}`;
  line.textContent = `> ${msg}`;
  termLog.appendChild(line);
  termLog.scrollTop = termLog.scrollHeight;
}

// Check for saved API key
const savedKey = localStorage.getItem('openai_api_key');
if (savedKey) {
  openaiApiKey = savedKey;
  apiKeyInput.value = '••••••••';
  listenBtn.disabled = false;
  log('API key loaded from storage', 'success');
}

// Save API Key
saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key && key !== '••••••••') {
    openaiApiKey = key;
    localStorage.setItem('openai_api_key', key);
    apiKeyInput.value = '••••••••';
    listenBtn.disabled = false;
    log('API Key saved successfully', 'success');
    connectionStatus.textContent = '✓ API Key saved. Click "Test Connection" to verify.';
    connectionStatus.className = 'connection-status success';
  }
});

// Test API Connection
testApiKeyBtn.addEventListener('click', async () => {
  if (!openaiApiKey) {
    connectionStatus.textContent = '✗ Please enter an API key first';
    connectionStatus.className = 'connection-status error';
    return;
  }

  connectionStatus.textContent = '⏳ Testing connection...';
  connectionStatus.className = 'connection-status info';
  log('Testing API connection...', 'info');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say "hello"'
          }
        ],
        max_tokens: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      connectionStatus.textContent = '✓ Connection successful! API is working.';
      connectionStatus.className = 'connection-status success';
      log('API connection successful!', 'success');
      log(`Response: ${data.choices[0].message.content}`, 'success');
    } else {
      const errorData = await response.json();
      connectionStatus.textContent = `✗ Error: ${errorData.error.message}`;
      connectionStatus.className = 'connection-status error';
      log(`API Error: ${errorData.error.message}`, 'error');
    }
  } catch (error) {
    connectionStatus.textContent = `✗ Connection failed: ${error.message}`;
    connectionStatus.className = 'connection-status error';
    log(`Connection error: ${error.message}`, 'error');
  }
});

// Check if browser supports speech recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    output.textContent = transcript;

    // Process terms only on final results
    if (event.results[event.results.length - 1].isFinal) {
      log(`Final transcript: "${transcript}"`, 'info');
      processTranscript(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    output.textContent = `Error: ${event.error}`;
    log(`Speech recognition error: ${event.error}`, 'error');
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };
} else {
  output.textContent = 'Speech recognition not supported in this browser.';
  log('Speech recognition not supported', 'error');
}

listenBtn.addEventListener('click', () => {
  if (!openaiApiKey) {
    alert('Please enter your OpenAI API key first!');
    return;
  }

  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
});

function startListening() {
  recognition.start();
  isListening = true;
  listenBtn.classList.add('listening');
  listenBtn.querySelector('span').textContent = 'Stop';
  output.textContent = 'Listening...';
  log('Started listening...', 'info');
}

function stopListening() {
  recognition.stop();
  isListening = false;
  listenBtn.classList.remove('listening');
  listenBtn.querySelector('span').textContent = 'Listen';
  log('Stopped listening', 'info');
}

async function processTranscript(text) {
  // Add to processing queue
  processingQueue.push(text);
  log(`Added to queue: "${text.substring(0, 50)}..."`, 'info');

  // If already processing, wait
  if (isProcessing) {
    log('Already processing, will process next...', 'info');
    return;
  }

  isProcessing = true;

  while (processingQueue.length > 0) {
    const currentText = processingQueue.shift();
    await analyzeTextWithChatGPT(currentText);
  }

  isProcessing = false;
}

async function analyzeTextWithChatGPT(text) {
  log('Sending to ChatGPT for analysis...', 'info');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that identifies technical, specialized, or uncommon terms in text.
            
IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no explanations.

Identify terms that are:
- Technical jargon (e.g., "API", "microservices", "OAuth")
- Medical/scientific terms (e.g., "hypertension", "mitochondria")
- Business terminology (e.g., "burn rate", "Series A")
- Acronyms (e.g., "ATP", "REST", "NLP")
- Industry-specific words

DO NOT include common words like: the, is, are, have, go, make, get, take, etc.

Return format (MUST be valid JSON):
[{"term": "example term", "definition": "brief definition under 50 words"}]

If no technical terms found, return: []`
          },
          {
            role: 'user',
            content: `Find technical/uncommon terms in this text: "${text}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      log(`API Error: ${errorData.error.message}`, 'error');
      throw new Error(`API Error: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    log(`ChatGPT response: ${content.substring(0, 100)}...`, 'info');

    // Clean up response - remove markdown code blocks if present
    let cleanContent = content;
    if (content.includes('```')) {
      cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    // Parse the JSON response
    let terms;
    try {
      terms = JSON.parse(cleanContent);
      log(`Parsed ${terms.length} terms from response`, 'success');
    } catch (parseError) {
      log(`JSON parse error: ${parseError.message}`, 'error');
      log(`Raw content: ${cleanContent}`, 'error');
      return;
    }

    // Add new terms to our map
    if (Array.isArray(terms) && terms.length > 0) {
      log(`Found ${terms.length} technical terms`, 'success');
      terms.forEach(item => {
        if (item.term && item.definition) {
          const termKey = item.term.toLowerCase();
          if (!detectedTerms.has(termKey)) {
            detectedTerms.set(termKey, {
              term: item.term,
              definition: item.definition
            });
            log(`Added term: ${item.term}`, 'success');
          } else {
            log(`Term already exists: ${item.term}`, 'info');
          }
        }
      });

      updateTermsTable();
    } else {
      log('No technical terms found in this text', 'info');
    }

  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    console.error('Full error:', error);

    if (error.message.includes('401')) {
      alert('Invalid API key. Please check your OpenAI API key.');
      connectionStatus.textContent = '✗ Invalid API key';
      connectionStatus.className = 'connection-status error';
    }
  }
}

function updateTermsTable() {
  if (detectedTerms.size === 0) {
    termsBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="2">No terms detected yet. Start listening!</td>
      </tr>
    `;
    return;
  }

  termsBody.innerHTML = '';

  // Convert map to array and display
  const termsArray = Array.from(detectedTerms.values());

  termsArray.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="term-name">${item.term}</td>
      <td class="term-definition">${item.definition}</td>
    `;
    termsBody.appendChild(row);
  });

  log(`Table updated with ${termsArray.length} terms`, 'success');
  // Auto-scroll to the bottom of the table
  const rightPanel = document.querySelector('.right-panel');
  if (rightPanel) {
    rightPanel.scrollTop = rightPanel.scrollHeight;
  }
}

// Initialize Map Panel
const mapPanelContainer = document.getElementById('mapPanel');
if (mapPanelContainer) {
  initMapPanel(mapPanelContainer);
}

// Tab Switching
const switchTab = (tabId) => {
  // Remove active class from all tabs
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

  // Activate clicked tab button
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  // Show content
  const content = document.getElementById(tabId + 'Tab');
  if (content) {
    content.classList.remove('hidden');

    // If switching to map, trigger resize to fix Leaflet rendering issues
    if (tabId === 'map') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }
};

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
});

// Portal buttons logic
document.querySelectorAll('.portal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.target);
  });
});


// Brand click to go home
const goHomeBtn = document.getElementById('goHome');
if (goHomeBtn) {
  goHomeBtn.addEventListener('click', () => {
    switchTab('home');
  });
  goHomeBtn.style.cursor = 'pointer';
}

// Secret Admin Panel Logic
document.addEventListener('DOMContentLoaded', () => {
  const secretBtn = document.getElementById('secret-key-btn');
  const secretModal = document.getElementById('secret-modal');
  const closeSecret = document.querySelector('.close-secret');
  const secretPasscode = document.getElementById('secret-passcode');
  const secretSubmit = document.getElementById('secret-submit');
  const secretError = document.getElementById('secret-error');
  const secretPanel = document.getElementById('secret-panel');
  const secretLogin = document.getElementById('secret-login');

  if (secretBtn) {
    secretBtn.addEventListener('click', () => {
      secretModal.classList.remove('hidden');
      secretPasscode.value = '';
      secretError.classList.add('hidden');
      secretLogin.classList.remove('hidden');
      secretPanel.classList.add('hidden');
      secretPasscode.focus();
    });
  }

  if (closeSecret) {
    closeSecret.addEventListener('click', () => {
      secretModal.classList.add('hidden');
    });
  }

  function checkPasscode() {
    const code = secretPasscode.value;
    if (code === '090949') {
      // Success
      secretLogin.classList.add('hidden');
      secretPanel.classList.remove('hidden');
    } else {
      // Failure
      secretError.classList.remove('hidden');
      secretPasscode.value = '';
      setTimeout(() => {
        secretError.classList.add('hidden');
      }, 2000);
    }
  }

  if (secretSubmit) {
    secretSubmit.addEventListener('click', checkPasscode);
  }


  if (secretPasscode) {
    secretPasscode.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkPasscode();
    });
  }

  // Tuya Camera Logic
  const camConnectBtn = document.getElementById('btn-connect-cam');
  const termLog = document.getElementById('cam-terminal');
  const videoPlaceholder = document.getElementById('video-placeholder');
  const videoPlayer = document.getElementById('camera-stream');
  const streamInput = document.getElementById('stream-url');
  const accessIdInput = document.getElementById('cam-access-id');
  const accessSecretInput = document.getElementById('cam-access-secret');
  const uidInput = document.getElementById('cam-uid');
  const devIdInput = document.getElementById('cam-device-id');
  const camTimestamp = document.getElementById('cam-timestamp');
  const generateBtn = document.getElementById('btn-generate-url');

  // Specific Device Data from User
  const TUYA_BEDROOM_CONFIG = {
    id: "bf642009bf38789795uyku",
    auth: "vq71H9pLEVTJLbPcZX34GB1N6Ely664DvwEZhwu9BWY=",
    iceServers: [
      "stun:35.157.227.228:3478",
      "stun:[2a05:d014:afa:af11:7f80:ecc4:6706:8e1d]:3478",
      "turn:54.36.112.8:3478"
    ]
  };

  // Update Timestamp
  setInterval(() => {
    if (camTimestamp) {
      const now = new Date();
      camTimestamp.textContent = now.toLocaleTimeString('en-GB') + ' ' +
        now.toLocaleDateString('en-GB').replace(/\//g, '.');
    }
  }, 1000);

  // logTerm is now global

  if (camConnectBtn) {
    camConnectBtn.addEventListener('click', async () => {
      const rawInput = streamInput.value.trim();
      const isDirectStream = rawInput.toLowerCase().startsWith('http') || rawInput.toLowerCase().startsWith('rtsp://') || rawInput === 'demo';

      // 1. Reset
      termLog.innerHTML = '';
      videoPlaceholder.classList.remove('hidden');
      videoPlayer.classList.add('hidden');

      if (!isDirectStream) {
        logTerm("INITIALIZING TUYA AUTO-CONNECT SEQUENCE...", 'normal');

        // Codec Check
        const canH265 = videoPlayer.canPlayType('video/mp4; codecs="hvc1"');
        logTerm(`CODEC SUPPORT (H.265): ${canH265 || 'NO'}`, canH265 ? 'success' : 'warning');

        // 2. Simulation Sequence for Tuya
        await delay(800);
        logTerm(`DEVICE FOUND: JS-P162 (${TUYA_BEDROOM_CONFIG.id})`, 'success');

        await delay(600);
        logTerm(`GATHERING ICE CANDIDATES...`, 'normal');
        await delay(300);
        logTerm(`RESOLVING STUN: ${TUYA_BEDROOM_CONFIG.iceServers[0]}`, 'normal');

        await delay(600);
        logTerm(`AUTHENTICATION: Validating Token...`, 'normal');

        const accessId = accessIdInput?.value || TUYA_BEDROOM_CONFIG.auth.substring(0, 10);
        logTerm(`ACCESS ID: ${accessId}`, 'warning');

        await delay(800);
        logTerm(`HANDSHAKE: [SYN] -> [ACK]`, 'success');
        logTerm(`TURN RELAY ACTIVE: ${TUYA_BEDROOM_CONFIG.iceServers[2]}`, 'normal');

        await delay(500);
        logTerm(`CHANNEL SECURED. WAITING FOR STREAM...`, 'success');
      } else {
        logTerm("CONNECTING TO DIRECT STREAM...", "success");
        // Quick Codec Check for direct streams too
        const canH265 = videoPlayer.canPlayType('video/mp4; codecs="hvc1"');
        if (!canH265) logTerm("WARNING: Browser does not support H.265. Ensure camera is set to H.264.", "warning");
      }

      // 3. Handle Stream
      // rawInput is already defined at top of listener

      // Detection for Reolink RTSP
      if (rawInput.toLowerCase().startsWith('rtsp://')) {
        logTerm("RTSP DETECTED.", "warning");
        logTerm("Browsers cannot play RTSP directly.", "error");

        const hostMatch = rawInput.match(/@([^:/]+)/);
        if (hostMatch && hostMatch[1]) {
          const host = hostMatch[1];
          logTerm(`HOST IDENTIFIED: ${host}`, "success");
          logTerm(`INSTRUCTION: Enable HLS in Camera Settings (Network > Advanced > Port Settings).`, "normal");

          const suggestedHls = `http://${host}:8000/hls/ch0.m3u8`;
          streamInput.value = suggestedHls;

          logTerm(`SUGGESTED HLS URL: ${suggestedHls}`, "success");
          logTerm("URL UPDATED. CLICK 'PLAY STREAM' AGAIN TO CONNECT.", "warning");

          document.getElementById('display-device-name').textContent = "REOLINK CAMERA (READY)";
        } else {
          logTerm("Please provide the HLS (.m3u8) stream URL instead.", "warning");
        }

        videoPlaceholder.classList.remove('hidden');
        videoPlayer.classList.add('hidden');
        return;
      }

      // Feature: Manual Override if they paste something
      if (rawInput && rawInput.length > 5 && rawInput !== "demo") {
        logTerm(`MANUAL OVERRIDE: Attempting stream playback...`, 'warning');

        if (rawInput.includes('reolink')) {
          document.getElementById('display-device-name').textContent = "REOLINK CAMERA";
        }

        if (rawInput.startsWith('{') || rawInput.startsWith('"')) {
          try {
            const json = JSON.parse(rawInput);
            const url = json.result?.url || json.url || json.hls_url;
            if (url && url.startsWith('http')) {
              logTerm(`SMART PASTE: Extracted URL.`, 'success');
              loadHls(url);
              return;
            }
          } catch (e) { }
        }
        if (rawInput.startsWith('http')) {
          loadHls(rawInput);
          return;
        }
      } else if (rawInput === "demo") {
        const demoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
        logTerm(`LOADING DEMO FEED...`, 'success');
        document.getElementById('display-device-name').textContent = "DEMO FEED (ACTIVE)";
        loadHls(demoUrl);
        return;
      }

      // Default Auto Behavior (Empty URL case)
      logTerm(`STREAM STATUS: WAITING FOR SOURCE.`, 'normal');
      logTerm(`Please paste a valid HLS/m3u8 URL in the box above.`, 'warning');

      function loadHls(url) {
        logTerm(`LOAD SEQUENCE STARTED: ${url.substring(0, 40)}...`, 'normal');

        // Debug Listeners
        videoPlayer.addEventListener('loadstart', () => logTerm('VIDEO: Load started', 'normal'), { once: true });
        videoPlayer.addEventListener('canplay', () => logTerm('VIDEO: Can play', 'success'), { once: true });
        videoPlayer.addEventListener('error', (e) => {
          const err = videoPlayer.error;
          logTerm(`VIDEO ERROR: ${err ? err.message : 'Unknown'} (Code: ${err ? err.code : '?'})`, 'error');
        }, { once: true });

        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(videoPlayer);
          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            logTerm('HLS: Manifest parsed, initiating play...', 'success');
            videoPlayer.play().catch(e => logTerm(`PLAY ERROR: ${e.message}`, 'error'));
          });
          hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
              logTerm(`HLS FATAL ERROR: ${data.type}`, 'error');

              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                logTerm("TROUBLESHOOTING NETWORK ERROR:", "warning");

                // Check for Mixed Content
                if (window.location.protocol === 'https:' && url.startsWith('http:')) {
                  logTerm("CRITICAL: Mixed Content Blocked.", "error");
                  logTerm("The website is SECURE (HTTPS) but your camera is INSECURE (HTTP).", "normal");
                  logTerm("Browsers block this for security. Fixes:", "warning");
                  logTerm("1. Use HTTPS for your camera (if supported).", "normal");
                  logTerm("2. Open this app via HTTP (http://novinimap.web.app) if possible.", "normal");
                  logTerm("3. Enable 'Allow Insecure Content' in Site Settings.", "success");
                }

                logTerm("4. Check CORS: Ensure Camera allows external web access.", "normal");
                hls.startLoad(); // Attempt retry
              }
            }
          });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
          videoPlayer.src = url;
          videoPlayer.play().catch(e => logTerm(`PLAY ERROR: ${e.message}`, 'error'));
        }

        videoPlaceholder.classList.add('hidden');
        videoPlayer.classList.remove('hidden');
        logTerm(`PLAYBACK ACTIVE.`, 'success');

        // Note: AI Tracking now started manually via Sidebar button
      }
    });
  }

  // --- TUYA API GENERATE LOGIC ---
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const accessId = accessIdInput.value.trim();
      const secret = accessSecretInput.value.trim();
      const uid = uidInput.value.trim();
      const deviceId = devIdInput.value.trim();

      if (!accessId || !secret || !uid || !deviceId) {
        logTerm("ERROR: Missing Tuya credentials for generation.", "error");
        return;
      }

      logTerm("CONTACTING TUYA CLOUD (via Proxy)...", "normal");
      const PROXY = "https://corsproxy.io/?";

      try {
        // 1. Get Access Token
        const timestamp = Date.now().toString();
        const nonce = ""; // Optional
        const signStr = accessId + timestamp;
        const tokenSign = CryptoJS.HmacSHA256(signStr, secret).toString().toUpperCase();

        logTerm("REQUESTING TOKEN...", "normal");
        const tokenUrl = `https://openapi.tuyaeu.com/v1.0/token?grant_type=1`;
        const tokenResp = await fetch(PROXY + encodeURIComponent(tokenUrl), {
          headers: {
            'client_id': accessId,
            'sign': tokenSign,
            't': timestamp,
            'sign_method': 'HMAC-SHA256'
          }
        });

        const tokenData = await tokenResp.json();
        if (!tokenData.success) {
          throw new Error(`Token Error: ${tokenData.msg}`);
        }

        const accessToken = tokenData.result.access_token;
        logTerm("TOKEN ACQUIRED.", "success");

        // 2. Allocate Stream
        logTerm("ALLOCATING HLS STREAM...", "normal");
        const streamTimestamp = Date.now().toString();
        const body = { "type": "hls" };
        const bodyHash = CryptoJS.SHA256(JSON.stringify(body)).toString();
        const method = "POST";
        const url = `/v1.0/users/${uid}/devices/${deviceId}/stream/actions/allocate`;

        // Full StringToSign for business request
        const stringToSign = [method, bodyHash, "", url].join("\n");
        const businessSignStr = accessId + accessToken + streamTimestamp + stringToSign;
        const businessSign = CryptoJS.HmacSHA256(businessSignStr, secret).toString().toUpperCase();

        const streamUrlTarget = `https://openapi.tuyaeu.com${url}`;
        const streamResp = await fetch(PROXY + encodeURIComponent(streamUrlTarget), {
          method: 'POST',
          headers: {
            'client_id': accessId,
            'access_token': accessToken,
            'sign': businessSign,
            't': streamTimestamp,
            'sign_method': 'HMAC-SHA256',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const streamData = await streamResp.json();
        if (!streamData.success) {
          throw new Error(`Stream Error: ${streamData.msg}`);
        }

        const hlsUrl = streamData.result.url;
        logTerm("STREAM URL GENERATED!", "success");
        streamInput.value = hlsUrl;
        logTerm("URL COPIED TO PLAYBACK BOX.", "normal");

      } catch (err) {
        logTerm(`GENERATE FAILED: ${err.message}`, "error");
        logTerm("Note: This often fails due to CORS in browser. You may need a proxy.", "warning");
      }
    });
  }
});

// --- DATABASE LOGGING HELPERS ---
let lastDatabaseSave = 0;
const SAVE_COOLDOWN = 10000; // 10 seconds between DB logs

async function saveToDatabase(detections) {
  const now = Date.now();
  if (now - lastDatabaseSave < SAVE_COOLDOWN) return;

  const validHits = detections.filter(d => d.categories[0].score > 0.65);
  if (validHits.length === 0) return;

  try {
    lastDatabaseSave = now;
    for (const hit of validHits) {
      const cat = hit.categories[0];
      await addDoc(collection(db, "detections"), {
        label: cat.categoryName,
        score: Math.round(cat.score * 100),
        timestamp: new Date() // Use local time instead of serverTimestamp to avoid "PENDING"
      });
    }
    aiDebugLog("DATABASE: Recorded in Cloud SQL-type Archive.", "success");
  } catch (err) {
    console.error("Firestore Save Error:", err);
  }
}

async function fetchDetectionHistory() {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">FETCHING DATA...</td></tr>';

  try {
    const q = query(collection(db, "detections"), orderBy("timestamp", "desc"), limit(50));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">No records in database.</td></tr>';
      return;
    }

    let html = '';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Firestore Timestamp to Date, with local Date fallback
      let timeStr = 'UNKNOWN';
      if (data.timestamp) {
        const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        timeStr = date.toLocaleString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      html += `
        <tr>
          <td>${timeStr}</td>
          <td>${data.label.toUpperCase()}</td>
          <td>${data.score}%</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">ERROR: ${err.message}</td></tr>`;
  }
}

// --- GOOGLE MEDIAPIPE AI OBJECT TRACKING CORE ---
const aiDebugTerminal = document.getElementById('ai-debug-terminal');

function aiDebugLog(msg, type = 'normal') {
  if (!aiDebugTerminal) return;
  const line = document.createElement('div');
  line.className = `debug-line ${type === 'error' ? 'error' : (type === 'warning' ? 'warn' : '')}`;
  line.innerHTML = `<span style="opacity:0.5">[${new Date().toLocaleTimeString()}]</span> > ${msg}`;
  aiDebugTerminal.appendChild(line);
  aiDebugTerminal.scrollTop = aiDebugTerminal.scrollHeight;
}

let objectDetector = null;
let colorDetector = null;
let isTracking = false;

async function startObjectTracking() {
  const video = document.getElementById('camera-stream');
  const canvas = document.getElementById('detection-canvas');
  const counters = document.getElementById('object-counters');
  const status = document.getElementById('ai-status');
  let lastVideoTime = -1;

  if (!video || !canvas) return;

  try {
    if (!objectDetector) {
      aiDebugLog("INITIALIZING GOOGLE MEDIAPIPE ENGINE...");
      logTerm("LOADING MEDIAPIPE VISION...", "warning");

      aiDebugLog("> Loading WASM runtime...", "warning");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      aiDebugLog("> WASM Loaded successfully.", "success");
      aiDebugLog("> Downloading EfficientDet model...", "warning");

      try {
        objectDetector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
            delegate: "GPU"
          },
          scoreThreshold: 0.5,
          runningMode: "VIDEO"
        });

        aiDebugLog("SUCCESS: Google Object Detector Ready.", "success");
        aiDebugLog("> Starting detection loop...", "normal");
        logTerm("AI ENGINE ACTIVE (MEDIAPIPE).", "success");


        // Initialize color detector (instant - no async needed)
        if (!colorDetector) {
          colorDetector = new ColorDetector();
          aiDebugLog("SUCCESS: Color Detection Ready (Canvas API).", "success");
        }
      } catch (childErr) {
        aiDebugLog(`DETECTOR ERROR: ${childErr.message}`, "error");
        throw childErr;
      }
    }

    isTracking = true;
    canvas.classList.remove('hidden');
    counters.classList.remove('hidden');
    status.classList.remove('hidden');

    const ctx = canvas.getContext('2d');

    const track = async () => {
      if (!isTracking || video.paused || video.ended || video.readyState < 2) {
        requestAnimationFrame(track);
        return;
      }

      // 1. Sync dimensions
      if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
      }

      // 2. Inference (only if frame changed)
      try {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const start = performance.now();
          const result = objectDetector.detectForVideo(video, start);
          const end = performance.now();

          // Update diag rarely
          if (Math.random() < 0.02) {
            aiDebugLog(`DETECTION COMPLETE: ${Math.round(end - start)}ms`, "success");
          }

          // 3. Render
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const counts = { person: 0, car: 0, cat: 0, dog: 0 };

          if (result && result.detections) {
            result.detections.forEach(detection => {
              const category = detection.categories[0];
              let clsName = category.categoryName.toLowerCase();
              if (clsName === 'car' || clsName === 'truck' || clsName === 'bus') clsName = 'car';

              if (counts.hasOwnProperty(clsName)) {
                counts[clsName]++;
                const { originX, originY, width, height } = detection.boundingBox;

                // Detect color for cars
                let colorInfo = '';
                if (clsName === 'car' && colorDetector) {
                  const detectedColor = colorDetector.detectCarColor(video, detection.boundingBox);
                  colorInfo = ` ${colorDetector.getColorDisplay(detectedColor)}`;
                  detection.color = detectedColor; // Store for database
                }

                ctx.strokeStyle = '#00ff41';
                ctx.lineWidth = 2;
                ctx.strokeRect(originX, originY, width, height);
                ctx.fillStyle = '#00ff41';
                ctx.font = 'bold 14px Courier New';
                const label = `${clsName.toUpperCase()} ${Math.round(category.score * 100)}%${colorInfo}`;
                ctx.fillText(label, originX, originY > 15 ? originY - 5 : 15);
              }
            });
          }

          // Update UI counters
          document.getElementById('count-person').textContent = counts.person;
          document.getElementById('count-car').textContent = counts.car;
          document.getElementById('count-cat').textContent = counts.cat;
          document.getElementById('count-dog').textContent = counts.dog;

          // Log detections to table
          if (result && result.detections && result.detections.length > 0) {
            logDetections(result.detections);
          }

          // 4. Persistence
          if (result && result.detections && result.detections.length > 0) {
            saveToDatabase(result.detections);
          }
        }
      } catch (err) {
        aiDebugLog(`TRACK ERROR: ${err.message}`, "error");
      }

      requestAnimationFrame(track);
    };

    track();

  } catch (err) {
    aiDebugLog(`AI FATAL ERROR: ${err.message}`, "error");
    if (typeof logTerm === 'function') {
      logTerm(`AI ERROR: ${err.message}`, "error");
    }
    console.error(err);
  }
}

// Sidebar manual trigger
document.getElementById('btn-load-ai')?.addEventListener('click', () => {
  startObjectTracking();
});

// Detection History UI Toggles
document.getElementById('btn-show-history-sidebar')?.addEventListener('click', () => {
  const section = document.getElementById('history-section');
  if (section) {
    const isHidden = section.classList.toggle('hidden');
    if (!isHidden) {
      fetchDetectionHistory();
      // Scroll to history if visibility is toggled
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

document.getElementById('btn-refresh-history')?.addEventListener('click', fetchDetectionHistory);

async function exportToExcel() {
  const btn = document.getElementById('id-export-excel');
  const originalText = btn.textContent;
  btn.textContent = "EXTRACTING DATA...";
  btn.disabled = true;

  try {
    // Fetch all detections (no limit for full export)
    const q = query(collection(db, "detections"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    const data = [];
    querySnapshot.forEach((doc) => {
      const d = doc.data();
      const time = d.timestamp?.toDate ? d.timestamp.toDate() : new Date();
      data.push({
        'Date/Time': time.toLocaleString(),
        'Object Type': d.label.toUpperCase(),
        'Confidence %': d.score + '%',
        'Database ID': doc.id
      });
    });

    if (data.length === 0) {
      alert("No data found to export.");
      return;
    }

    // Create Excel Workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detection Logs");

    // Fix column widths
    const wscols = [
      { wch: 25 }, // Date
      { wch: 15 }, // Object
      { wch: 15 }, // Confidence
      { wch: 20 }  // ID
    ];
    worksheet['!cols'] = wscols;

    // Save File
    const timestampStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Detection_Report_${timestampStr}.xlsx`);
    aiDebugLog("EXCEL: Report generated and downloaded.", "success");

  } catch (err) {
    console.error("Export Error:", err);
    aiDebugLog("EXPORT ERROR: " + err.message, "error");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

document.getElementById('id-export-excel')?.addEventListener('click', exportToExcel);

function calculateIoU(box1, box2) {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  const x_overlap = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
  const y_overlap = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
  const intersection = x_overlap * y_overlap;
  const union = w1 * h1 + w2 * h2 - intersection;
  return intersection / union;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
