/**
 * Study Timer - Pomodoro Productivity Extension
 * 
 * Master Logic Script (popup.js)
 * Implements Pomodoro timer countdown engine, state persistence using chrome.storage.local,
 * session counter tracking, input validation, Web Audio chime synthesis, and Chrome desktop notifications.
 */

// Default Configuration Constants
const DEFAULTS = {
  STUDY_MINUTES: 25,
  BREAK_MINUTES: 5,
  COMPLETED_SESSIONS: 0,
  MODE: 'study'
};

// DOM Element References
const timerDisplay = document.getElementById('timerDisplay');
const modeBadge = document.getElementById('modeBadge');
const sessionCount = document.getElementById('sessionCount');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const studyInput = document.getElementById('studyInput');
const breakInput = document.getElementById('breakInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetCountBtn = document.getElementById('resetCountBtn');
const statusMsg = document.getElementById('statusMsg');

// State Variables
let timerInterval = null;
let currentMode = DEFAULTS.MODE; // 'study' or 'break'
let studyDuration = DEFAULTS.STUDY_MINUTES;
let breakDuration = DEFAULTS.BREAK_MINUTES;
let completedSessions = DEFAULTS.COMPLETED_SESSIONS;
let timeLeftSeconds = DEFAULTS.STUDY_MINUTES * 60;
let isRunning = false;
let timerEndTime = null;

// Initialize Popup when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeExtensionState();
  setupEventListeners();
});

/**
 * Load state from chrome.storage.local or initialize with defaults
 */
function initializeExtensionState() {
  chrome.storage.local.get(
    [
      'studyDuration',
      'breakDuration',
      'completedSessions',
      'currentMode',
      'timeLeftSeconds',
      'isRunning',
      'timerEndTime'
    ],
    (result) => {
      if (result.studyDuration !== undefined) studyDuration = parseInt(result.studyDuration, 10);
      if (result.breakDuration !== undefined) breakDuration = parseInt(result.breakDuration, 10);
      if (result.completedSessions !== undefined) completedSessions = parseInt(result.completedSessions, 10);
      if (result.currentMode !== undefined) currentMode = result.currentMode;

      // Populate input settings fields
      studyInput.value = studyDuration;
      breakInput.value = breakDuration;
      sessionCount.textContent = completedSessions;

      // Evaluate active running state across popup closes
      if (result.isRunning && result.timerEndTime) {
        const remaining = Math.round((result.timerEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          timeLeftSeconds = remaining;
          isRunning = true;
          timerEndTime = result.timerEndTime;
          startTimerCountdown();
        } else {
          // Timer completed while popup window was closed
          handleTimerCompletion();
        }
      } else {
        if (result.timeLeftSeconds !== undefined) {
          timeLeftSeconds = result.timeLeftSeconds;
        } else {
          timeLeftSeconds = (currentMode === 'study' ? studyDuration : breakDuration) * 60;
        }
        isRunning = false;
      }

      updateFullUI();
    }
  );
}

/**
 * Attach UI event listeners
 */
function setupEventListeners() {
  startBtn.addEventListener('click', handleStart);
  pauseBtn.addEventListener('click', handlePause);
  resetBtn.addEventListener('click', handleReset);
  saveSettingsBtn.addEventListener('click', handleSaveSettings);
  resetCountBtn.addEventListener('click', handleResetSessionCount);
}

/**
 * Start or Resume Timer Countdown
 */
function handleStart() {
  if (isRunning) return; // Prevent multiple overlapping intervals

  isRunning = true;
  timerEndTime = Date.now() + (timeLeftSeconds * 1000);

  saveStateToStorage();
  startTimerCountdown();
  updateButtonControls();
}

/**
 * Executes 1-second interval ticking
 */
function startTimerCountdown() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const remaining = Math.round((timerEndTime - Date.now()) / 1000);

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timeLeftSeconds = 0;
      updateTimerDisplay(0);
      handleTimerCompletion();
    } else {
      timeLeftSeconds = remaining;
      updateTimerDisplay(timeLeftSeconds);
    }
  }, 1000);
}

/**
 * Pause active timer and preserve remaining time
 */
function handlePause() {
  if (!isRunning) return;

  isRunning = false;
  clearInterval(timerInterval);
  timerEndTime = null;

  saveStateToStorage();
  updateButtonControls();
}

/**
 * Reset timer for current mode to configured duration
 */
function handleReset() {
  isRunning = false;
  clearInterval(timerInterval);
  timerEndTime = null;

  const targetMinutes = currentMode === 'study' ? studyDuration : breakDuration;
  timeLeftSeconds = targetMinutes * 60;

  saveStateToStorage();
  updateFullUI();
}

/**
 * Handle automatic session completion and switching logic
 */
function handleTimerCompletion() {
  playCompletionSound();

  if (currentMode === 'study') {
    // Study session finished -> switch to Break Mode
    currentMode = 'break';
    timeLeftSeconds = breakDuration * 60;
    showDesktopNotification('Study Session Completed!', 'Great job! Time to take a 5-minute break.');
  } else {
    // Break session finished -> increment counter and switch to Study Mode
    currentMode = 'study';
    completedSessions++;
    sessionCount.textContent = completedSessions;
    timeLeftSeconds = studyDuration * 60;
    showDesktopNotification('Break Time Ended!', 'Break is over. Let\'s get back into focus mode!');
  }

  // Auto-start next timer cycle automatically
  isRunning = true;
  timerEndTime = Date.now() + (timeLeftSeconds * 1000);

  saveStateToStorage();
  updateFullUI();
  startTimerCountdown();
}

/**
 * Validate user input and save custom durations
 */
function handleSaveSettings() {
  const rawStudy = studyInput.value.trim();
  const rawBreak = breakInput.value.trim();

  // 1. Check for empty inputs
  if (rawStudy === '' || rawBreak === '') {
    showStatusMessage('Duration values cannot be empty.', 'error');
    return;
  }

  const newStudy = Number(rawStudy);
  const newBreak = Number(rawBreak);

  // 2. Validate integers and ranges
  if (!Number.isInteger(newStudy) || newStudy < 1 || newStudy > 120) {
    showStatusMessage('Study duration must be between 1 and 120 minutes.', 'error');
    return;
  }

  if (!Number.isInteger(newBreak) || newBreak < 1 || newBreak > 60) {
    showStatusMessage('Break duration must be between 1 and 60 minutes.', 'error');
    return;
  }

  // Apply validated settings
  studyDuration = newStudy;
  breakDuration = newBreak;

  // If timer is currently paused, update remaining time display immediately
  if (!isRunning) {
    timeLeftSeconds = (currentMode === 'study' ? studyDuration : breakDuration) * 60;
  }

  saveStateToStorage();
  updateFullUI();
  showStatusMessage('Settings saved successfully!', 'success');
}

/**
 * Reset completed session counter to zero
 */
function handleResetSessionCount() {
  completedSessions = 0;
  sessionCount.textContent = completedSessions;
  saveStateToStorage();
  showStatusMessage('Session count reset to 0.', 'success');
}

/**
 * Synchronize full extension state to chrome.storage.local
 */
function saveStateToStorage() {
  chrome.storage.local.set({
    studyDuration: studyDuration,
    breakDuration: breakDuration,
    completedSessions: completedSessions,
    currentMode: currentMode,
    timeLeftSeconds: timeLeftSeconds,
    isRunning: isRunning,
    timerEndTime: timerEndTime
  });
}

/**
 * Master UI update function
 */
function updateFullUI() {
  updateTimerDisplay(timeLeftSeconds);
  updateModeBadge();
  updateButtonControls();
  sessionCount.textContent = completedSessions;
}

/**
 * Format seconds into MM:SS format
 */
function updateTimerDisplay(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  timerDisplay.textContent = `${formattedMins}:${formattedSecs}`;
}

/**
 * Update visual badge for Study vs Break session
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
 * Toggle Start / Pause button enabled states
 */
function updateButtonControls() {
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
}

/**
 * Render status and error messages in UI
 */
function showStatusMessage(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg ${type}`;
  
  setTimeout(() => {
    statusMsg.className = 'status-msg hidden';
    statusMsg.textContent = '';
  }, 3000);
}

/**
 * Synthesize offline completion tone using Web Audio API
 */
function playCompletionSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 tone
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5 tone

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (err) {
    console.log('Audio Context playback notice:', err);
  }
}

/**
 * Display Chrome Desktop Notification
 */
function showDesktopNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message,
      priority: 2
    });
  }
}
