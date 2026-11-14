
'use strict';

const Prj = {
  lastFrame: null,
  bridgeBusy: false,
  pending: null,
  writeQueue: Promise.resolve(),
  pollBusy: false,
  historyPage: 1,
  historySize: 10,
  historyTab: 'pump'
};

const ScadaState = {
  serialPort: null,
  serialReader: null,
  readableStreamClosed: null,
  keepReading: false,
  isConnected: false,
  isBootReceived: false,
  lastValidTelemetryAt: null,
  hasLock: false,
  lockResolver: null,
  pendingMode: null,
  pendingRelay: null,
  commandTimeout: null,
  statusPollTimeout: null,
  systemMode: 'AUTO',
  lockReason: 'NONE',
  currentTelemetry: {
    soil: null,
    airHum: null,
    airTemp: null,
    waterPct: null,
    relayOn: false,
    lastRxTime: null
  },
  pingTimer: null,
  clockDriftMs: 0,
  manualStartTime: null,
  thresholds: {},
  isRemoteActive: false,
  remotePollTimer: null,
  laptopCommandPollTimer: null
};

const serialBus = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('ludisia_serial_bus') : null;
if (serialBus) {
  serialBus.onmessage = (e) => {
    if (e.data && e.data.type === 'PORT_ACQUIRED') {
      if (!ScadaState.isConnected) {
        showToast('Serial port acquired by another browser tab.', 'info');
      }
    }
  };
}

const prjValue = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const prjEscape = s => String(s == null ? '--' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showToast(message, type) {
  if (typeof pushSystemNotification === 'function') {
    pushSystemNotification(message, type);
  } else if (typeof triggerBellNotification === 'function') {
    triggerBellNotification(message, type);
  } else {
    console.log('[' + (type || 'INFO').toUpperCase() + '] ' + message);
  }
}

async function prjFetch(path, options) {
  const response = await fetch((window.contextPath || '') + path, Object.assign({
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'ngrok-skip-browser-warning': 'true' }
  }, options || {}));
  let data;
  try { data = await response.json(); } catch (e) { throw new Error('Server did not return JSON.'); }
  if (!response.ok || data.success === false || data.status === 'error') {
    throw new Error(data.message || 'Request failed (' + response.status + ')');
  }
  return data;
}

function prjPost(path, values) {
  return prjFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams(values).toString()
  });
}

function prjForm(path, values) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = (window.contextPath || '') + path;
  Object.entries(values).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value == null ? '' : value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

async function initRealTimeClock() {
  updateClockDisplay();
  setInterval(updateClockDisplay, 1000);
}

function getVNCurrentDate() {
  return new Date();
}

function updateClockDisplay() {
  const vnNow = getVNCurrentDate();

  const timeStr = vnNow.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dateStr = vnNow.toLocaleDateString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  const clockEl = document.getElementById('hud-live-time');
  const dateEl = document.getElementById('hud-live-date');
  if (clockEl) clockEl.textContent = timeStr;
  if (dateEl) dateEl.textContent = dateStr;

  if (ScadaState.systemMode === 'MANUAL' && ScadaState.manualStartTime) {
    const elapsedSec = Math.floor((Date.now() - ScadaState.manualStartTime) / 1000);
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    const durEl = document.getElementById('manual-duration-count');
    if (durEl) {
      durEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
  }
}

async function handleConnectSerialClick() {
  if (ScadaState.isConnected) {
    await disconnectSerial();
  } else {
    await connectSerial();
  }
}

async function connectSerial() {
  if (!('serial' in navigator)) {
    showToast('WebSerial API is not supported in this browser. Running in remote monitoring mode.', 'info');
    return;
  }

  if ('locks' in navigator) {
    navigator.locks.request('ludisia_serial_lock', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        showToast('Another browser tab has active control of the COM port.', 'warning');
        return;
      }
      ScadaState.hasLock = true;
      if (serialBus) serialBus.postMessage({ type: 'PORT_ACQUIRED' });
      const opened = await executeSerialOpen();
      if (opened) {
        await new Promise((resolve) => {
          ScadaState.lockResolver = resolve;
        });
      }
    }).catch(() => {
      executeSerialOpen();
    });
  } else {
    await executeSerialOpen();
  }
}

async function executeSerialOpen() {
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });

    ScadaState.serialPort = port;
    window.serialPort = port;
    ScadaState.keepReading = true;
    ScadaState.isConnected = true;
    ScadaState.isBootReceived = false;
    if (typeof AppState !== 'undefined') {
      AppState.hardwareConnected = true;
    }

    updateConnectionUI(true, 'ONLINE');

    readSerialLoop(port);

    setTimeout(() => { if (ScadaState.isConnected) sendSerialCommand('STATUS'); }, 150);
    setTimeout(() => { if (ScadaState.isConnected) sendSerialCommand('STATUS'); }, 450);
    setTimeout(() => { if (ScadaState.isConnected) sendSerialCommand('STATUS'); }, 1000);
    setTimeout(() => { if (ScadaState.isConnected) sendSerialCommand('STATUS'); }, 1800);

    if (ScadaState.pingTimer) clearInterval(ScadaState.pingTimer);
    ScadaState.pingTimer = setInterval(sendPingCommand, 2000);
    startLaptopCommandBridge();

    showToast('Serial port opened @ 9600 baud. Synchronizing telemetry...', 'info');
    return true;
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      showToast('Serial connection failed: ' + err.message, 'error');
    }
    updateConnectionUI(false);
    if (ScadaState.lockResolver) {
      ScadaState.lockResolver();
      ScadaState.lockResolver = null;
    }
    return false;
  }
}

async function disconnectSerial() {
  if (!ScadaState.isConnected && !ScadaState.serialPort) return;

  ScadaState.keepReading = false;
  ScadaState.isConnected = false;
  if (typeof AppState !== 'undefined') {
    AppState.hardwareConnected = false;
  }
  stopLaptopCommandBridge();

  if (ScadaState.pingTimer) {
    clearInterval(ScadaState.pingTimer);
    ScadaState.pingTimer = null;
  }
  if (ScadaState.commandTimeout) {
    clearTimeout(ScadaState.commandTimeout);
    ScadaState.commandTimeout = null;
  }
  if (ScadaState.statusPollTimeout) {
    clearTimeout(ScadaState.statusPollTimeout);
    ScadaState.statusPollTimeout = null;
  }

  try {
    if (ScadaState.serialReader) {
      await ScadaState.serialReader.cancel().catch(() => {});
      if (ScadaState.readableStreamClosed) {
        await ScadaState.readableStreamClosed.catch(() => {});
      }
      ScadaState.serialReader = null;
      ScadaState.readableStreamClosed = null;
    }
    if (ScadaState.serialPort) {
      await ScadaState.serialPort.close().catch(() => {});
      ScadaState.serialPort = null;
      window.serialPort = null;
    }
  } catch (err) {
    console.warn('[Serial] Disconnect error:', err);
  }

  if (ScadaState.lockResolver) {
    ScadaState.lockResolver();
    ScadaState.lockResolver = null;
  }

  ScadaState.hasLock = false;
  ScadaState.lastValidTelemetryAt = null;
  ScadaState.pendingMode = null;
  ScadaState.pendingRelay = null;

  resetTelemetryDisplay();
  updateConnectionUI(false);

  showToast('Hardware controller disconnected. System returned to standby.', 'info');
}

async function readSerialLoop(port) {
  const textDecoder = new TextDecoderStream();
  ScadaState.readableStreamClosed = port.readable.pipeTo(textDecoder.writable).catch(() => {});
  const reader = textDecoder.readable.getReader();
  ScadaState.serialReader = reader;

  let buffer = '';

  try {
    while (ScadaState.keepReading) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length === 0) continue;
          handleSerialLine(trimmed);
        }
      }
    }
  } catch (err) {
    console.error('[Serial] Read loop error:', err);
  } finally {
    try { reader.releaseLock(); } catch (e) {}
    if (ScadaState.keepReading) {
      disconnectSerial();
    }
  }
}

function handleSerialLine(line) {
  if (typeof addSerialLog === 'function') addSerialLog('RX', line);

  if (line.includes('BOOT') || line.includes('SYSTEM READY')) {
    ScadaState.isBootReceived = true;
    showToast('Arduino boot detected. Synchronizing telemetry...', 'info');
    sendPingCommand();
    return;
  }

  if (line.startsWith('[EVT:ALERT_SENSOR_STUCK]')) {
    showToast('Safety Alert: 3 continuous misting cycles failed to elevate humidity.', 'warning');
    return;
  }

  if (line.startsWith('[ACK] SENSOR FAULT ALERT RESET')) {
    showToast('Sensor fault alarm reset successfully.', 'success');
    return;
  }

  if (line.startsWith('[EVT:REFUSED_')) {
    showToast('Actuation refused: ' + line.replace(/^\[EVT:[^\]]+\]\s*/, ''), 'warning');
    return;
  }

  if (line.startsWith('{') && line.endsWith('}')) {
    try {
      const packet = JSON.parse(line);
      if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return;
      if (typeof packet.mode !== 'string'
        || !('pump_on' in packet && ('stop_reason' in packet || 'lock_reason' in packet))
        || !('air_hum' in packet && 'water' in packet)) return;

      if (!ScadaState.isBootReceived) ScadaState.isBootReceived = true;
      ScadaState.lastValidTelemetryAt = Date.now();
      updateConnectionUI(true, 'ONLINE');
      processTelemetryPacket(packet);
    } catch (e) {}
  }
}

function processTelemetryPacket(packet) {
  const isSoilValid = packet && packet.soil_ok !== 0 && typeof packet.soil === 'number' && packet.soil >= 0;
  const isWaterValid = packet && packet.water_valid !== 0 && ((typeof packet.water === 'number' && packet.water >= 0) || (typeof packet.water_pct === 'number' && packet.water_pct >= 0));
  const isDhtValid = packet && packet.dht_ok !== 0 && typeof packet.air_hum === 'number' && typeof packet.air_temp === 'number';

  const soil = isSoilValid ? packet.soil : null;
  const airHum = (isDhtValid && typeof packet.air_hum === 'number') ? packet.air_hum : null;
  const airTemp = (isDhtValid && typeof packet.air_temp === 'number') ? packet.air_temp : null;
  const waterPct = isWaterValid ? (typeof packet.water === 'number' ? packet.water : packet.water_pct) : null;
  const relayOn = packet.pump_on === 1 || packet.pump === 1 || packet.relay === 1 || packet.relay === true;
  const mode = packet.mode === 'MANUAL' ? 'MANUAL' : packet.mode === 'AUTO' ? 'AUTO' : ScadaState.systemMode;

  let lock = 'NONE';
  if (typeof packet.stop_reason === 'number') {
    switch (packet.stop_reason) {
      case 0: lock = 'NONE'; break;
      case 1: lock = 'SENSORS'; break;
      case 2: lock = 'DHT'; break;
      case 3: lock = 'TEMP'; break;
      case 4: lock = 'SOIL'; break;
      case 5: lock = 'WATER'; break;
      case 6: lock = 'RH'; break;
      default: lock = 'STOP_' + packet.stop_reason; break;
    }
  } else if (packet.lock) {
    lock = packet.lock;
  } else if (packet.lock_reason) {
    lock = packet.lock_reason;
  }

  ScadaState.currentTelemetry = {
    soil,
    airHum,
    airTemp,
    waterPct,
    relayOn,
    lastRxTime: Date.now()
  };
  ScadaState.systemMode = mode;
  ScadaState.lockReason = lock;
  Prj.lastFrame = packet;

  if (typeof AppState !== 'undefined') {
    AppState.hardwareConnected = true;
    AppState.systemMode = mode;
    AppState.isPumpActive = relayOn;
    AppState.telemetry = {
      soilMoisture: soil,
      tankLevel: waterPct,
      airHumidity: airHum,
      airTemperature: airTemp,
      temperature: airTemp,
      sensorOk: isSoilValid && isWaterValid,
      dhtOk: isDhtValid,
      lastRxTime: Date.now(),
      lockReason: lock
    };
  }

  if (window.Garden3D && typeof window.Garden3D.triggerSpray === 'function') {
    window.Garden3D.triggerSpray(relayOn);
  }

  resolvePendingCommands(relayOn, mode, lock);
  renderTelemetryUI(soil, airHum, airTemp, waterPct, relayOn, mode, lock, packet);
  syncTelemetryToServer(soil, airHum, airTemp, waterPct, relayOn, mode, lock, packet);
}

function isTelemetryFresh() {
  return ScadaState.lastValidTelemetryAt != null
    && Date.now() - ScadaState.lastValidTelemetryAt < 10000;
}

function renderTelemetryUI(soil, airHum, airTemp, waterPct, relayOn, mode, lock, packet) {
  const isFresh = isTelemetryFresh();
  const pkt = packet || {};

  const soilOk = isFresh && (soil != null) && (pkt.soil_ok !== 0);
  const roundedSoil = soilOk ? Math.round(soil) : null;
  const soilValEl = document.getElementById('stat-soil-moisture');
  const soilBarEl = document.getElementById('pod-soil-bar');
  const soilDotEl = document.getElementById('pod-soil-dot');
  if (soilValEl) soilValEl.textContent = (roundedSoil != null) ? roundedSoil : '--';
  if (soilBarEl) soilBarEl.style.width = (roundedSoil != null) ? Math.min(100, Math.max(0, roundedSoil)) + '%' : '0%';
  if (soilDotEl) soilDotEl.className = 'pulse-dot ' + (soilOk ? 'online' : 'offline');

  const waterOk = isFresh && (waterPct != null) && (pkt.water_valid !== 0);
  const roundedWater = waterOk ? Math.round(waterPct) : null;
  const tankValEl = document.getElementById('stat-tank-val');
  const tankBarEl = document.getElementById('pod-tank-bar');
  const tankDotEl = document.getElementById('pod-tank-dot');
  if (tankValEl) tankValEl.textContent = (roundedWater != null) ? roundedWater : '--';
  if (tankBarEl) tankBarEl.style.width = (roundedWater != null) ? Math.min(100, Math.max(0, roundedWater)) + '%' : '0%';
  if (tankDotEl) tankDotEl.className = 'pulse-dot ' + (waterOk ? 'online' : 'offline');

  const dhtOk = isFresh && (pkt.dht_ok !== 0);
  const rhOk = dhtOk && (airHum != null);
  const rhValEl = document.getElementById('stat-air-hum');
  const rhBarEl = document.getElementById('pod-air-hum-bar');
  const rhDotEl = document.getElementById('pod-rain-dot');
  if (rhValEl) rhValEl.textContent = rhOk ? airHum.toFixed(1) : '--';
  if (rhBarEl) rhBarEl.style.width = rhOk ? Math.min(100, Math.max(0, airHum)) + '%' : '0%';
  if (rhDotEl) rhDotEl.className = 'pulse-dot ' + (rhOk ? 'online' : 'offline');

  const tempOk = dhtOk && (airTemp != null);
  const tempValEl = document.getElementById('stat-air-temp');
  const tempBarEl = document.getElementById('pod-temp-bar');
  const tempDotEl = document.getElementById('pod-climate-dot');
  if (tempValEl) tempValEl.textContent = tempOk ? airTemp.toFixed(1) : '--';
  if (tempBarEl) tempBarEl.style.width = tempOk ? Math.min(100, Math.max(0, airTemp)) + '%' : '0%';
  if (tempDotEl) tempDotEl.className = 'pulse-dot ' + (tempOk ? 'online' : 'offline');

  const mistOnline = isFresh && (ScadaState.isConnected || ScadaState.isRemoteActive);
  const pumpStateEl = document.getElementById('stat-pump-state');
  const mistStateEl = document.getElementById('stat-mist-state');
  const pumpBarEl = document.getElementById('pod-pump-bar');
  const pumpDotEl = document.getElementById('pod-pump-dot');

  const pumpText = relayOn ? 'ACTIVE' : 'IDLE';
  if (pumpStateEl) {
    pumpStateEl.textContent = pumpText;
    pumpStateEl.style.color = relayOn ? '#10b981' : 'var(--text-main)';
  }
  if (mistStateEl) {
    mistStateEl.textContent = pumpText;
  }
  if (pumpBarEl) pumpBarEl.style.width = (mistOnline && relayOn) ? '100%' : '0%';
  if (pumpDotEl) pumpDotEl.className = 'pulse-dot ' + (mistOnline ? (relayOn ? 'active' : 'online') : 'offline');

  const btnToggleMode = document.getElementById('btn-toggle-mode');
  const manualBanner = document.getElementById('manual-mode-banner');

  if (mode === 'MANUAL') {
    if (btnToggleMode) {
      btnToggleMode.textContent = 'MANUAL';
      btnToggleMode.classList.add('mode-manual-active');
    }
    if (manualBanner) manualBanner.style.display = 'block';
    if (!ScadaState.manualStartTime) ScadaState.manualStartTime = Date.now();
  } else {
    if (btnToggleMode) {
      btnToggleMode.textContent = 'AUTO';
      btnToggleMode.classList.remove('mode-manual-active');
    }
    if (manualBanner) manualBanner.style.display = 'none';
    ScadaState.manualStartTime = null;
  }

  const isManual = (mode === 'MANUAL');
  const telemetryFresh = isTelemetryFresh();
  const canOperate = (ScadaState.isConnected || ScadaState.isRemoteActive) && telemetryFresh && ScadaState.pendingMode == null && ScadaState.pendingRelay == null;

  const btnStart = document.getElementById('capsule-btn-start');
  const btnStop = document.getElementById('capsule-btn-stop');

  if (btnStart) {
    btnStart.disabled = !canOperate || !isManual || relayOn;
    btnStart.classList.toggle('disabled-lock', btnStart.disabled);
    btnStart.title = !telemetryFresh
      ? 'Awaiting fresh telemetry...'
      : (!isManual ? 'Switch to MANUAL mode to actuate misting' : (relayOn ? 'Misting pump is currently ON' : 'Send START misting command'));
  }
  if (btnStop) {
    btnStop.disabled = !canOperate || !isManual || !relayOn;
    btnStop.classList.toggle('disabled', btnStop.disabled);
    btnStop.title = !telemetryFresh
      ? 'Awaiting fresh telemetry...'
      : (!isManual ? 'Switch to MANUAL mode to actuate misting' : (!relayOn ? 'Misting pump is currently OFF' : 'Send STOP misting command'));
  }
}

function updateConnectionUI(connected, label) {
  const beacon = document.getElementById('ribbon-beacon');
  const connText = document.getElementById('capsule-conn-text');
  const pulseDot = document.getElementById('capsule-pulse-dot');
  const badge = document.getElementById('capsule-conn-badge');

  if (connected) {
    if (beacon) beacon.className = 'beacon-dot online';
    if (connText) connText.textContent = label || 'ONLINE';
    if (pulseDot) pulseDot.className = 'pulse-dot online';
    if (badge) badge.classList.add('connected');
  } else {
    if (beacon) beacon.className = 'beacon-dot offline';
    if (connText) connText.textContent = 'OFFLINE';
    if (pulseDot) pulseDot.className = 'pulse-dot offline';
    if (badge) badge.classList.remove('connected');
  }
}

function resetTelemetryDisplay() {
  ScadaState.lastValidTelemetryAt = null;
  ScadaState.systemMode = null;
  ScadaState.lockReason = null;
  ScadaState.currentTelemetry = { soil: null, airHum: null, airTemp: null, waterPct: null, relayOn: false, lastRxTime: null };
  renderTelemetryUI(null, null, null, null, false, null, null, {});
}

async function sendSerialCommand(cmd) {
  if (!ScadaState.serialPort || !ScadaState.isConnected || !ScadaState.serialPort.writable) return false;

  if (ScadaState.serialPort.writable.locked) {
    await new Promise((r) => setTimeout(r, 50));
    if (!ScadaState.serialPort || !ScadaState.serialPort.writable || ScadaState.serialPort.writable.locked) {
      return false;
    }
  }

  let writer;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(cmd + '\n');
    writer = ScadaState.serialPort.writable.getWriter();
    await writer.write(data);
    if (typeof addSerialLog === 'function') addSerialLog('TX', cmd);
    return true;
  } catch (err) {
    console.error('[Serial TX] Send error:', err);
    return false;
  } finally {
    if (writer) {
      try { writer.releaseLock(); } catch (e) {}
    }
  }
}

function sendPingCommand() {
  if (!ScadaState.isConnected) return;
  sendSerialCommand('PING');
}

function toggleModeAutoManual() {
  const current = ScadaState.systemMode || 'AUTO';
  const target = (current === 'MANUAL') ? 'AUTO' : 'MANUAL';
  setSystemMode(target);
}

async function setSystemMode(mode) {
  const hasConnection = ScadaState.isConnected || ScadaState.isRemoteActive;
  if (!hasConnection || !isTelemetryFresh()) {
    showToast('Awaiting live telemetry stream before toggling mode.', 'warning');
    return;
  }

  const targetMode = (mode === 'MANUAL') ? 'MANUAL' : 'AUTO';
  if (targetMode === ScadaState.systemMode) return;
  if (ScadaState.pendingMode != null || ScadaState.pendingRelay != null) return;

  if (targetMode === 'MANUAL' && ScadaState.systemMode !== 'MANUAL') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Switch to MANUAL Control Mode?',
        text: 'Automated closed-loop microclimate regulation will be paused. You can directly actuate misting on demand.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Confirm Switch',
        cancelButtonText: 'Cancel',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          if (ScadaState.isConnected) {
            executeModeChange('MANUAL');
          } else {
            sendRemoteCommand('MANUAL');
          }
        }
      });
      return;
    }
  }

  if (ScadaState.isConnected) {
    executeModeChange(targetMode);
  } else {
    sendRemoteCommand(targetMode);
  }
}

function executeModeChange(targetMode) {
  ScadaState.pendingMode = targetMode;
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  if (btnToggleMode) {
    btnToggleMode.disabled = true;
    btnToggleMode.textContent = 'SYNC...';
  }

  sendSerialCommand(targetMode);

  if (ScadaState.commandTimeout) clearTimeout(ScadaState.commandTimeout);
  ScadaState.commandTimeout = setTimeout(() => {
    if (ScadaState.pendingMode) {
      ScadaState.pendingMode = null;
      renderTelemetryUI(
        ScadaState.currentTelemetry.soil,
        ScadaState.currentTelemetry.airHum,
        ScadaState.currentTelemetry.airTemp,
        ScadaState.currentTelemetry.waterPct,
        ScadaState.currentTelemetry.relayOn,
        ScadaState.systemMode,
        ScadaState.lockReason
      );
      showToast('Mode change timed out. Reverting.', 'warning');
    }
  }, 4000);

  showToast('Awaiting Arduino mode confirmation...', 'info');
}

function handleStartMist() {
  if (!ScadaState.isConnected && !ScadaState.isRemoteActive) {
    showToast('Please connect COM port or wait for server sync.', 'warning');
    return;
  }
  if (!isTelemetryFresh()) {
    showToast('Awaiting fresh telemetry from hardware controller.', 'warning');
    return;
  }
  if (ScadaState.systemMode !== 'MANUAL') {
    showToast('System is currently in AUTO mode. Please switch to MANUAL mode first.', 'warning');
    return;
  }
  if (ScadaState.currentTelemetry.relayOn) {
    showToast('Misting pump is already active.', 'info');
    return;
  }

  const lock = ScadaState.lockReason;
  if (lock && lock !== 'NONE' && lock !== '0') {
    let msg = 'Misting blocked by interlock: ' + lock;
    if (lock === 'WATER' || lock === '5') msg = 'Misting blocked: Water reservoir level is low (< 20%).';
    else if (lock === 'SOIL' || lock === '4') msg = 'Misting blocked: Substrate moisture is saturated (> 65%).';
    else if (lock === 'TEMP' || lock === 'COLD' || lock === '3') msg = 'Misting blocked: Ambient temperature is low (< 18.0°C).';
    else if (lock === 'DHT' || lock === '2' || lock === 'SENSORS' || lock === '1') msg = 'Misting blocked: Environmental sensor channel fault.';
    showToast(msg, 'warning');
    return;
  }

  if (ScadaState.isConnected) {
    executeRelayActuation('START');
  } else {
    sendRemoteCommand('START');
  }
}

function handleStopMist() {
  if (!ScadaState.isConnected && !ScadaState.isRemoteActive) {
    showToast('Please connect COM port or wait for server sync.', 'warning');
    return;
  }
  if (!isTelemetryFresh()) {
    showToast('Awaiting fresh telemetry from hardware controller.', 'warning');
    return;
  }
  if (ScadaState.systemMode !== 'MANUAL') {
    showToast('System is currently in AUTO mode. Please switch to MANUAL mode first.', 'warning');
    return;
  }
  if (!ScadaState.currentTelemetry.relayOn) {
    showToast('Misting pump is already idle.', 'info');
    return;
  }

  if (ScadaState.isConnected) {
    executeRelayActuation('STOP');
  } else {
    sendRemoteCommand('STOP');
  }
}

function executeRelayActuation(cmd) {
  const targetRelay = (cmd === 'START');
  ScadaState.pendingRelay = targetRelay;

  const btnStart = document.getElementById('capsule-btn-start');
  const btnStop = document.getElementById('capsule-btn-stop');
  if (targetRelay && btnStart) {
    btnStart.textContent = 'SENDING...';
    btnStart.disabled = true;
  }
  if (!targetRelay && btnStop) {
    btnStop.textContent = 'SENDING...';
    btnStop.disabled = true;
  }

  sendSerialCommand(cmd);

  if (ScadaState.commandTimeout) clearTimeout(ScadaState.commandTimeout);
  ScadaState.commandTimeout = setTimeout(() => {
    if (ScadaState.pendingRelay !== null) {
      ScadaState.pendingRelay = null;
      renderTelemetryUI(
        ScadaState.currentTelemetry.soil,
        ScadaState.currentTelemetry.airHum,
        ScadaState.currentTelemetry.airTemp,
        ScadaState.currentTelemetry.waterPct,
        ScadaState.currentTelemetry.relayOn,
        ScadaState.systemMode,
        ScadaState.lockReason
      );
      showToast('Relay actuation command timed out.', 'warning');
    }
  }, 4000);

  showToast('Awaiting Arduino relay status confirmation...', 'info');
}

function resolvePendingCommands(relayOn, mode, lock) {
  if (ScadaState.pendingMode !== null) {
    if (mode === ScadaState.pendingMode) {
      const confirmed = ScadaState.pendingMode;
      ScadaState.pendingMode = null;
      if (ScadaState.commandTimeout) clearTimeout(ScadaState.commandTimeout);
      const message = (confirmed === 'MANUAL')
        ? 'Confirmed: System switched to MANUAL mode.'
        : 'Confirmed: System switched to AUTO mode.';
      showToast(message, 'success');
    }
  }

  if (ScadaState.pendingRelay !== null) {
    const success = (relayOn === ScadaState.pendingRelay);
    if (success) {
      const active = ScadaState.pendingRelay;
      ScadaState.pendingRelay = null;
      if (ScadaState.commandTimeout) clearTimeout(ScadaState.commandTimeout);
      const message = active ? 'Confirmed: Misting spray started.' : 'Confirmed: Misting spray stopped.';
      showToast(message, 'success');
    }
  }
}

let lastServerSyncMs = 0;

async function syncTelemetryToServer(soil, airHum, airTemp, waterPct, relayOn, mode, lock, packet) {
  const now = Date.now();
  if (now - lastServerSyncMs < 1800) return;
  lastServerSyncMs = now;

  const waterOkVal = (packet && packet.water_ok !== undefined)
    ? (packet.water_ok ? 1 : 0)
    : ((waterPct != null && waterPct >= 20) ? 1 : 0);

  const dhtOkVal = (packet && packet.dht_ok !== undefined)
    ? (packet.dht_ok ? 1 : 0)
    : ((airTemp != null && airHum != null) ? 1 : 0);

  const sensorOkVal = (packet && packet.sensor_ok !== undefined)
    ? (packet.sensor_ok ? 1 : 0)
    : ((soil != null && waterPct != null && dhtOkVal === 1) ? 1 : 0);

  const payload = {
    device_id: 1,
    soil: (soil != null) ? soil : null,
    humidity_pct: (soil != null) ? soil : null,
    air_hum: (airHum != null) ? airHum : null,
    air_temp: (airTemp != null) ? airTemp : null,
    water: (waterPct != null) ? waterPct : null,
    water_pct: (waterPct != null) ? waterPct : null,
    water_ok: waterOkVal,
    dht_ok: dhtOkVal,
    sensor_ok: sensorOkVal,
    pump_on: relayOn ? 1 : 0,
    relay_on: relayOn ? 1 : 0,
    mode: mode || 'AUTO',
    reported_mode: mode || 'AUTO',
    lock_reason: lock || 'NONE',
    is_sample: 0
  };

  try {
    const response = await fetch((window.contextPath || '') + '/api/sensor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      try {
        const respJson = await response.json();
        if (respJson && respJson.command) {
          handleIncomingRemoteCommand(respJson.command);
        }
      } catch (ignored) {}
    }
  } catch (err) {}
}

function startLaptopCommandBridge() {
  if (ScadaState.laptopCommandPollTimer) clearInterval(ScadaState.laptopCommandPollTimer);
  ScadaState.laptopCommandPollTimer = setInterval(async () => {
    if (!ScadaState.isConnected) return;
    try {
      const res = await fetch((window.contextPath || '') + '/api/sensor?action=poll_command', {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.command) {
          handleIncomingRemoteCommand(data.command);
        }
      }
    } catch (e) {}
  }, 750);
}

function stopLaptopCommandBridge() {
  if (ScadaState.laptopCommandPollTimer) {
    clearInterval(ScadaState.laptopCommandPollTimer);
    ScadaState.laptopCommandPollTimer = null;
  }
}

function handleIncomingRemoteCommand(cmd) {
  const cleanCmd = cmd.trim().toUpperCase();
  if (cleanCmd === 'START' || cleanCmd === 'STOP' || cleanCmd === 'AUTO' || cleanCmd === 'MANUAL') {
    sendSerialCommand(cleanCmd);
    showToast('Remote SCADA command relayed to hardware: ' + cleanCmd, 'info');
  }
}

function initRemoteClientSync() {
  if (ScadaState.remotePollTimer) clearInterval(ScadaState.remotePollTimer);
  ScadaState.remotePollTimer = setInterval(async () => {
    if (ScadaState.isConnected) return;
    try {
      const res = await fetch((window.contextPath || '') + '/api/sensor', {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || data.status === 'offline') return;

      const isLive = Boolean(data.telemetry_live || data.online);
      ScadaState.isRemoteActive = isLive;
      updateConnectionUI(isLive, isLive ? 'ONLINE' : 'OFFLINE');

      if (isLive) {
        ScadaState.lastValidTelemetryAt = Date.now();
        const relayOn = Boolean(data.pump_on || data.relay_on);
        const mode = data.mode || data.reported_mode || 'AUTO';
        const lock = data.lock_reason || 'NONE';

        ScadaState.currentTelemetry = {
          soil: data.soil || data.soil_moisture || data.humidity_pct,
          airHum: data.air_hum || data.air_humidity,
          airTemp: data.air_temp || data.temperature_c,
          waterPct: data.water || data.water_pct,
          relayOn,
          lastRxTime: Date.now()
        };
        ScadaState.systemMode = mode;
        ScadaState.lockReason = lock;

        if (window.Garden3D && typeof window.Garden3D.triggerSpray === 'function') {
          window.Garden3D.triggerSpray(relayOn);
        }

        renderTelemetryUI(
          ScadaState.currentTelemetry.soil,
          ScadaState.currentTelemetry.airHum,
          ScadaState.currentTelemetry.airTemp,
          ScadaState.currentTelemetry.waterPct,
          relayOn,
          mode,
          lock,
          data
        );
      }
    } catch (e) {}
  }, 3000);
}

async function sendRemoteCommand(cmd) {
  try {
    showToast('Relaying command ' + cmd + ' to SCADA host...', 'info');
    const res = await fetch((window.contextPath || '') + '/api/sensor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ action: 'send_command', command: cmd })
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      showToast('Command ' + cmd + ' queued on SCADA host.', 'success');
    } else {
      showToast('Command queue failed: ' + (data ? data.message : 'Network error'), 'error');
    }
  } catch (err) {
    showToast('Command transmission error: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initRemoteClientSync();
});

Object.assign(window, {
  handleConnectSerialClick,
  connectSerial,
  disconnectSerial,
  toggleModeAutoManual,
  setSystemMode,
  executeModeChange,
  sendSerialCommand,
  sendRemoteCommand,
  ScadaState,
  handleStartMist,
  handleStopMist
});
