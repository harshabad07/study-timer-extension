/**
 * Study Timer Extension - popup.js
 * 
 * Manages the Pomodoro timer logic, user interface updates, session state persistence
 * via chrome.storage.local, Web Audio API sound feedback, and session mode switching.
 */

// Default Configuration Constants
const DEFAULT_STUDY_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const modeBadge = document.getElementById('modeBadge');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const studyInput = document.getElementById('studyInput');
const breakInput = document.getElementById('breakInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveStatus = document.getElementById('saveStatus');

// State Variables
let timerInterval = null;
let currentMode = 'study'; // 'study' or 'break'
let studyDuration = DEFAULT_STUDY_MINUTES;
let breakDuration = DEFAULT_BREAK_MINUTES;
let timeLeftSeconds = DEFAULT_STUDY_MINUTES * 60;
let isRunning = false;
let timerEndTime = null;

// Initialize Extension Popup
document.addEventListener('DOMContentLoaded', () => {
  initializeState();
  setupEventListeners();
});

/**
 * Initialize state from chrome.storage.local or set defaults
 */
function initializeState() {
  chrome.storage.local.get(
    ['studyDuration', 'breakDuration', 'currentMode', 'timeLeftSeconds', 'isRunning', 'timerEndTime'],
    (result) => {
      if (result.studyDuration) studyDuration = parseInt(result.studyDuration, 10);
      if (result.breakDuration) breakDuration = parseInt(result.breakDuration, 10);
      if (result.currentMode) currentMode = result.currentMode;
      
      // Update Settings Inputs
      studyInput.value = studyDuration;
      breakInput.value = breakDuration;

      // Handle Running State across popup close/open
      if (result.isRunning && result.timerEndTime) {
        const remaining = Math.round((result.timerEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          timeLeftSeconds = remaining;
          isRunning = true;
          timerEndTime = result.timerEndTime;
          startTimerInterval();
        } else {
          // Timer finished while popup was closed
          handleSessionCompletion();
        }
      } else {
        if (result.timeLeftSeconds !== undefined) {
          timeLeftSeconds = result.timeLeftSeconds;
        } else {
          timeLeftSeconds = (currentMode === 'study' ? studyDuration : breakDuration) * 60;
        }
        isRunning = false;
      }

      updateUI();
    }
  );
}

/**
 * Set up event listeners for buttons and user actions
 */
function setupEventListeners() {
  startBtn.addEventListener('click', handleStart);
  pauseBtn.addEventListener('click', handlePause);
  resetBtn.addEventListener('click', handleReset);
  saveSettingsBtn.addEventListener('click', handleSaveSettings);
}

/**
 * Handle Start Button Click
 */
function handleStart() {
  if (isRunning) return;
  isRunning = true;
  timerEndTime = Date.now() + (timeLeftSeconds * 1000);
  
  saveState();
  startTimerInterval();
  updateButtonStates();
}

/**
 * Start JavaScript interval to tick down every second
 */
function startTimerInterval() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const remaining = Math.round((timerEndTime - Date.now()) / 1000);
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timeLeftSeconds = 0;
      updateDisplay(0);
      handleSessionCompletion();
    } else {
      timeLeftSeconds = remaining;
      updateDisplay(timeLeftSeconds);
    }
  }, 1000);
}

/**
 * Handle Pause Button Click
 */
function handlePause() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerEndTime = null;
  
  saveState();
  updateButtonStates();
}

/**
 * Handle Reset Button Click
 */
function handleReset() {
  isRunning = false;
  clearInterval(timerInterval);
  timerEndTime = null;
  
  // Reset time to selected mode duration
  const minutes = currentMode === 'study' ? studyDuration : breakDuration;
  timeLeftSeconds = minutes * 60;

  saveState();
  updateUI();
}

/**
 * Handle switching modes when timer hits zero
 */
function handleSessionCompletion() {
  playNotificationSound();
  showDesktopNotification();

  // Switch session mode
  if (currentMode === 'study') {
    currentMode = 'break';
    timeLeftSeconds = breakDuration * 60;
  } else {
    currentMode = 'study';
    timeLeftSeconds = studyDuration * 60;
  }

  isRunning = false;
  timerEndTime = null;
  
  saveState();
  updateUI();
}

/**
 * Save user custom durations and update current timer if idle
 */
function handleSaveSettings() {
  const newStudy = parseInt(studyInput.value, 10);
  const newBreak = parseInt(breakInput.value, 10);

  // Validation
  if (isNaN(newStudy) || newStudy < 1 || newStudy > 120) {
    showStatus('Study time must be 1-120 mins', 'red');
    return;
  }
  if (isNaN(newBreak) || newBreak < 1 || newBreak > 60) {
    showStatus('Break time must be 1-60 mins', 'red');
    return;
  }

  studyDuration = newStudy;
  breakDuration = newBreak;

  // If timer is not running, adjust remaining time immediately
  if (!isRunning) {
    timeLeftSeconds = (currentMode === 'study' ? studyDuration : breakDuration) * 60;
  }

  saveState();
  updateUI();
  showStatus('Settings Saved!', '#16a34a');
}

/**
 * Save current state to chrome.storage.local
 */
function saveState() {
  chrome.storage.local.set({
    studyDuration: studyDuration,
    breakDuration: breakDuration,
    currentMode: currentMode,
    timeLeftSeconds: timeLeftSeconds,
    isRunning: isRunning,
    timerEndTime: timerEndTime
  });
}

/**
 * Update whole UI elements (display, mode badge, button state)
 */
function updateUI() {
  updateDisplay(timeLeftSeconds);
  updateModeBadge();
  updateButtonStates();
}

/**
 * Format remaining seconds into MM:SS format
 */
function updateDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  timerDisplay.textContent = `${formattedMins}:${formattedSecs}`;
}

/**
 * Update the session badge label and CSS styling
 */
function updateModeBadge() {
  if (currentMode === 'study') {
    modeBadge.textContent = 'Study Session';
    modeBadge.className = 'badge mode-study';
  } else {
    modeBadge.textContent = 'Break Session';
    modeBadge.className = 'badge mode-break';
  }
}

/**
 * Update enabled/disabled states for start/pause buttons
 */
function updateButtonStates() {
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
}

/**
 * Display status feedback text for settings save
 */
function showStatus(message, color) {
  saveStatus.textContent = message;
  saveStatus.style.color = color;
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2500);
}

/**
 * Synthesize a completion chime audio using Web Audio API (Offline compatible)
 */
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio playback not supported or blocked:', e);
  }
}

/**
 * Display standard Chrome desktop notification when session finishes
 */
function showDesktopNotification() {
  if (chrome.notifications) {
    const title = currentMode === 'study' ? 'Break Time Over!' : 'Study Session Completed!';
    const message = currentMode === 'study' 
      ? 'Time to get back into focus mode. Start your study session!' 
      : 'Great job staying focused! Take a well-deserved break.';

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message,
      priority: 2
    });
  }
}
