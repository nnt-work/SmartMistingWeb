let chartCanvas = null, chartCtx = null, chartHoverIndex = -1;

const AppState = {
  theme: localStorage.getItem('console_theme') || 'dark',
  currentUserId: 1,
  currentUserRole: 'ADMIN',
  systemMode: 'AUTO',
  activePlantId: 1,
  hardwareConnected: false,
  isPumpActive: false,
  pumpElapsedSec: 0,
  pumpTimerId: null,
  soakRemainingSec: 0,
  soakTimerId: null,
  telemetry: {
    soilMoisture: null,
    tankLevel: null,
    isRaining: false,
    temperature: null,
    airTemperature: null,
    airHumidity: null,
    lockReason: 'NONE',
    lastRxTime: null
  },
  plants: [
    { id: 1, name: 'Ludisia discolor', sci: 'Ludisia discolor (Jewel Orchid)', min: 50.0, max: 65.0, burst: 10, notes: 'Velvet maroon foliage with shimmering copper-gold venation. Thrives in airy sphagnum substrate.' },
    { id: 2, name: 'Boston Fern', sci: 'Nephrolepis exaltata', min: 40.0, max: 65.0, burst: 10, notes: 'Thrives in consistent canopy misting, delicate fronds.' },
    { id: 3, name: 'Moth Orchid', sci: 'Phalaenopsis aphrodite', min: 55.0, max: 75.0, burst: 12, notes: 'Ultra-fine aerosol dispersion, avoid crown pooling.' }
  ],
  users: [
    { id: 1, username: 'admin01', fullName: 'NGUYEN NHAT TAM', email: 'admin@example.com', role: 'ADMIN', isLocked: false, createdAt: '2026-10-06' },
    { id: 2, username: 'staff01', fullName: 'Tran Minh Quang', email: 'quangtm@example.com', role: 'STAFF', isLocked: false, createdAt: '2026-10-07' },
    { id: 3, username: 'viewer01', fullName: 'Le Thi Huong', email: 'huonglt@example.com', role: 'VIEWER', isLocked: false, createdAt: '2026-10-08' }
  ],
  history: {
    pump: [],
    sensor: [],
    audit: []
  },
  chartData: {
    timestamps: [],
    soil: [],
    tank: []
  }
};

function updateDashboardTelemetry(sm, tk, rn, pmp, temp, hum) {
  if (temp != null) AppState.telemetry.airTemperature = temp;
  if (hum != null) AppState.telemetry.airHumidity = hum;
  applyTelemetryUpdate(sm, tk, rn, pmp);
}
window.updateDashboardTelemetry = updateDashboardTelemetry;

function formatRelativeTime(offsetMinutes) {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let serialPort = null;
let serialReader = null;
let serialKeepReading = true;
let serialPingTimer = null;
let readableStreamClosed = null;
let lastDbSyncTime = 0;
let simulatedHardwareInterval = null;
let totalPacketsExchanged = 0;

const iotBus = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('smart_misting_iot_bus') : null;

function broadcastIotEvent(type, payload) {
  if (iotBus) {
    try {
      iotBus.postMessage({ type, payload, senderId: Date.now() });
    } catch (e) {}
  }
}

if (iotBus) {
  iotBus.onmessage = (e) => {
    const { type, payload } = e.data || {};
    if (!type) return;

    if (type === 'PUMP_STATE') {
      if (payload.isActive !== AppState.isPumpActive) {
        AppState.isPumpActive = payload.isActive;
        updatePumpTileBar(AppState.isPumpActive, AppState.hardwareConnected);
        const pState = document.getElementById('stat-pump-state');
        const pBadge = document.getElementById('pod-pump-badge');
        const pSubtext = document.getElementById('stat-pump-subtext');
        const turbine = document.getElementById('turbine-fan-svg');
        const pumpBox = document.getElementById('pump-icon-container');

        if (payload.isActive) {
          if (pState) { pState.textContent = 'ON'; pState.style.color = 'var(--accent-emerald)'; }
          if (pBadge) { pBadge.textContent = 'ACTIVE'; pBadge.className = 'badge-pill badge-emerald'; }
          if (pSubtext) pSubtext.textContent = 'Spraying Active (Synced)';
          if (turbine) turbine.classList.add('spinning');
          if (pumpBox) { pumpBox.style.background = 'rgba(16, 185, 129, 0.2)'; pumpBox.style.color = 'var(--accent-emerald)'; }
        } else {
          if (pState) { pState.textContent = 'OFF'; pState.style.color = 'var(--accent-crimson)'; }
          if (pBadge) { pBadge.textContent = 'IDLE'; pBadge.className = 'badge-pill badge-crimson'; }
          if (pSubtext) pSubtext.textContent = 'Pump Idle | Standby';
          if (turbine) turbine.classList.remove('spinning');
          if (pumpBox) { pumpBox.style.background = 'rgba(59, 130, 246, 0.16)'; pumpBox.style.color = 'var(--accent-blue)'; }
        }
      }
    } else if (type === 'PLANTS_UPDATED') {
      if (payload.plants) AppState.plants = payload.plants;
      if (payload.activePlantId) AppState.activePlantId = payload.activePlantId;
      renderPlantTable();
      renderPlantDropdowns();
      renderActivePlant();
      drawTelemetryChart();
    } else if (type === 'HW_CONNECTION') {
      if (payload.connected !== AppState.hardwareConnected) {
        AppState.hardwareConnected = payload.connected;
        AppState.isSimulated = payload.isSimulated;
        updateHardwareConnectionUI(payload.connected, payload.isSimulated, payload.portName);
      }
    }
  };
}

function initApp() {
  try {
    hydrateServerData();
    initNavigation();
    initSidebarCollapse();
    initFullscreen();
    initTheme();
    initTelemetryChart();
    if (!AppState.hardwareConnected) {
      resetTelemetryToStandby();
    }
    updateHardwareConnectionUI(AppState.hardwareConnected);
    renderAll();
    initDigitalTwinWiring();
    initDraggableStudioBar();
    if (typeof initDraggableCompanion === 'function') initDraggableCompanion();
    if (typeof initDraggableChatCard === 'function') initDraggableChatCard();
    if (typeof remotePollTelemetry === 'function') {
      setTimeout(remotePollTelemetry, 400);
      setInterval(remotePollTelemetry, 1500);
    }
    if (typeof startAutonomousFarmerWander === 'function') {
      setTimeout(startAutonomousFarmerWander, 1200);
    }
  } catch (err) {
    console.warn('initApp non-fatal warning:', err);
  }

  const activePane = document.querySelector('.view-pane.active');
  if (activePane) {
    navigateTo(activePane.id, false);
  } else {
    const panes = document.querySelectorAll('.view-pane');
    if (panes.length > 0) {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('plant') && document.getElementById('view-plants')) navigateTo('view-plants', false);
      else if (path.includes('history') && document.getElementById('view-history')) navigateTo('view-history', false);
      else if (path.includes('setting') && document.getElementById('view-settings')) navigateTo('view-settings', false);
      else if ((path.includes('device') || path.includes('hardware')) && document.getElementById('view-hardware')) navigateTo('view-hardware', false);
      else if (path.includes('user') && document.getElementById('view-users')) navigateTo('view-users', false);
      else if (path.includes('profile') && document.getElementById('view-profile')) navigateTo('view-profile', false);
      else if (document.getElementById('view-dashboard')) navigateTo('view-dashboard', false);
      else {
        navigateTo(panes[0].id, false);
      }
    }
  }
}

function hydrateServerData() {
  if (window.INITIAL_SERVER_DATA) {
    const s = window.INITIAL_SERVER_DATA;
    if (s.currentUserId) AppState.currentUserId = s.currentUserId;
    if (s.currentUserRole) AppState.currentUserRole = s.currentUserRole;
    if (s.systemMode) AppState.systemMode = s.systemMode;
    if (s.plants && s.plants.length > 0) {

      AppState.plants = s.plants.map((p, idx) => {
        if (!p.name || p.name.trim().length <= 2 || p.name.trim().toLowerCase() === 'mi') {
          return Object.assign({}, p, {
            name: idx === 0 ? 'Ludisia discolor' : 'Boston Fern',
            sci: idx === 0 ? 'Ludisia discolor (Jewel Orchid)' : (p.sci || 'Nephrolepis exaltata'),
            min: p.min || 50.0,
            max: p.max || 65.0
          });
        }
        return p;
      });
    }
    if (s.users && s.users.length > 0) AppState.users = s.users;
    if (s.history) {
      if (s.history.pump && s.history.pump.length > 0) AppState.history.pump = s.history.pump;
      if (s.history.sensor && s.history.sensor.length > 0) AppState.history.sensor = s.history.sensor;
      if (s.history.audit && s.history.audit.length > 0) AppState.history.audit = s.history.audit;
    }
    if (s.setting) {
      const activePlant = AppState.plants.find(p => p.id === AppState.activePlantId) || AppState.plants[0];
      if (activePlant) {
        if (s.setting.humOn) activePlant.min = s.setting.humOn;
        if (s.setting.humOff) activePlant.max = s.setting.humOff;
      }
    }
  }
}

function initNavigation() {
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.viewId) {
      navigateTo(e.state.viewId, false);
    }
  });
}

function navigateTo(viewId, updateHistory = true) {
  const targetPane = document.getElementById(viewId);
  const routeMap = {
    'view-dashboard': '/dashboard',
    'view-plants': '/plants',
    'view-settings': '/admin/settings',
    'view-history': '/history',
    'view-hardware': '/admin/devices',
    'view-users': '/admin/users',
    'view-profile': '/profile'
  };

  if (!targetPane) {
    if (updateHistory && routeMap[viewId]) {
      const cp = window.contextPath || '';
      window.location.href = cp + routeMap[viewId];
    }
    return;
  }

  document.querySelectorAll('.view-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  targetPane.classList.add('active');
  document.body.classList.toggle('dashboard-active', viewId === 'view-dashboard');
  const vv = document.getElementById('view-viewport');
  if (vv) vv.classList.toggle('viewport-dashboard-active', viewId === 'view-dashboard');

  const navItem = document.querySelector(`.nav-item[data-target="${viewId}"]`);
  if (navItem) navItem.classList.add('active');

  const names = {
    'view-dashboard': 'IoT Dashboard',
    'view-plants': 'Plant Profiles',
    'view-settings': 'Misting Settings',
    'view-history': 'History & Logs',
    'view-hardware': 'Arduino Hardware',
    'view-users': 'User Management',
    'view-profile': 'Profile & RBAC'
  };
  const bTitle = document.getElementById('breadcrumb-title');
  if (bTitle) bTitle.textContent = names[viewId] || 'Console';

  if (updateHistory && routeMap[viewId] && window.history && window.history.pushState) {
    const cp = window.contextPath || '';
    window.history.pushState({ viewId: viewId }, '', cp + routeMap[viewId]);
  }

  if (viewId === 'view-dashboard') {
    setTimeout(drawTelemetryChart, 60);
    if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
      setTimeout(() => window.Garden3D.resize(), 80);
    }
  } else if (viewId === 'view-plants') {
    if (typeof renderPlantTable === 'function') renderPlantTable();
    if (typeof renderPlantDropdowns === 'function') renderPlantDropdowns();
  } else if (viewId === 'view-settings') {
    if (typeof selectSettingMode === 'function') {
      selectSettingMode(AppState.systemMode || 'AUTO');
    }
  } else if (viewId === 'view-history') {
    if (typeof renderHistoryTables === 'function') renderHistoryTables();
  } else if (viewId === 'view-users') {
    if (typeof renderUserTable === 'function') renderUserTable();
  }
}

function toggleSidebar() {
  const container = document.getElementById('app-container');
  if (!container) return;
  container.classList.toggle('sidebar-collapsed');
  const isCollapsed = container.classList.contains('sidebar-collapsed');
  localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
  setTimeout(drawTelemetryChart, 300);
  if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
    setTimeout(() => window.Garden3D.resize(), 300);
  }
}

function initSidebarCollapse() {
  const container = document.getElementById('app-container');
  if (!container) return;

  const savedState = localStorage.getItem('sidebar_collapsed');
  if (savedState === 'true') {
    container.classList.add('sidebar-collapsed');
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      showToast('Fullscreen denied by browser: ' + err.message, 'amber');
    });
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function initFullscreen() {
  const icon = document.getElementById('fullscreen-icon');
  const label = document.getElementById('fullscreen-label');

  document.addEventListener('fullscreenchange', () => {
    const isFull = !!document.fullscreenElement;
    if (icon) {
      icon.innerHTML = isFull
        ? '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>'
        : '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>';
    }
    if (label) label.textContent = isFull ? 'Exit' : 'Fullscreen';
  });
}

function toggleTheme() {
  AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.className = AppState.theme;
  localStorage.setItem('console_theme', AppState.theme);
  updateThemeControls();
  if (window.Garden3D && typeof window.Garden3D.syncTheme === 'function') window.Garden3D.syncTheme(AppState.theme);
  drawTelemetryChart();
}

function initTheme() {
  const savedTheme = localStorage.getItem('console_theme') || 'dark';
  AppState.theme = savedTheme;
  if (document.documentElement) document.documentElement.className = savedTheme;
  updateThemeControls();
}

function updateThemeControls() {
  const label = document.getElementById('theme-label');
  const icon = document.getElementById('theme-icon');
  if (label) label.textContent = AppState.theme === 'dark' ? 'Dark' : 'Light';
  if (icon) {
    icon.innerHTML = AppState.theme === 'dark'
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
      : '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
  }
}

function renderAll() {
  renderActivePlant();
  renderPlantTable();
  renderPlantDropdowns();
  renderUserTable();
  renderHistoryTables();
}

function renderActivePlant() {
  const activePlant = AppState.plants.find(p => p.id === AppState.activePlantId) || AppState.plants[0];
  if (!activePlant) return;

  const displayPlantName = (!activePlant.name || activePlant.name.trim().toLowerCase() === 'mi')
    ? 'Ludisia discolor'
    : activePlant.name;

  const plantDash = document.getElementById('dash-active-plant-text');
  if (plantDash) plantDash.textContent = `${displayPlantName} (${activePlant.min}% - ${activePlant.max}%)`;

  const plantTopbar = document.getElementById('topbar-active-plant-text');
  if (plantTopbar) plantTopbar.textContent = `${displayPlantName} (${activePlant.min}% - ${activePlant.max}%)`;

  const targetEl = document.getElementById('pod-soil-target');
  if (targetEl) targetEl.textContent = `${activePlant.min}% - ${activePlant.max}%`;

  const cardPlant = document.getElementById('dash-card-plant-name');
  if (cardPlant) cardPlant.textContent = displayPlantName;

  const cardThresh = document.getElementById('dash-card-thresholds');
  if (cardThresh) cardThresh.textContent = AppState.firmwareBounds ? `Air RH: Start < ${AppState.firmwareBounds.on}% / Stop >= ${AppState.firmwareBounds.off}%` : 'Firmware thresholds: awaiting sync';

  const sumStart = document.getElementById('sum-start-val');
  if (sumStart && AppState.systemMode === 'AUTO') sumStart.textContent = `< ${activePlant.min}.0%`;

  const sumStop = document.getElementById('sum-stop-val');
  if (sumStop && AppState.systemMode === 'AUTO') sumStop.textContent = `> ${activePlant.max}.0%`;

  const legendBounds = document.getElementById('legend-target-bounds');
  if (legendBounds) legendBounds.textContent = `Target Bounds [${activePlant.min}% - ${activePlant.max}%]`;

  const capsuleSelector = document.getElementById('capsule-plant-selector');
  if (capsuleSelector && capsuleSelector.options) {
    Array.from(capsuleSelector.options).forEach(opt => {
      if (opt.textContent && opt.textContent.trim().toLowerCase() === 'mi') {
        opt.textContent = 'Ludisia discolor';
      }
    });
    if (String(capsuleSelector.value) !== String(activePlant.id)) {
      capsuleSelector.value = String(activePlant.id);
    }
  }
}

function renderPlantTable() {
  const tbody = document.getElementById('tbody-plants');
  if (!tbody) return;
  tbody.innerHTML = AppState.plants.map(plant => {
    const isSelected = plant.id === AppState.activePlantId;
    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${plant.name}</div>
        </td>
        <td style="font-style: italic; color: var(--text-muted); font-size: 13px;" class="mono">${plant.sci}</td>
        <td>
          <span class="mono" style="color: var(--accent-emerald); font-weight: 700;">${plant.min}% - ${plant.max}%</span>
        </td>
        <td class="mono">${plant.burst || 10}s</td>
        <td style="color: var(--text-secondary); font-size: 12.5px;">${plant.notes || 'Standard cultivation'}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            ${isSelected ? `
              <span class="badge-pill badge-emerald" style="white-space: nowrap; height: 28px; line-height: 28px; padding: 0 10px;">
                <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Active
              </span>
            ` : `
              <button class="btn btn-glass btn-sm" onclick="setActivePlantProfile(${plant.id})">
                Activate
              </button>
            `}
            <button class="btn btn-glass btn-sm" onclick="openEditPlantModal(${plant.id})" title="Edit Plant Profile">
              <svg viewBox="0 0 24 24" style="width: 12px; height: 12px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              Edit
            </button>
            <button class="btn btn-glass btn-sm" onclick="deletePlantRecord(${plant.id})" style="color: var(--accent-crimson);" title="Delete Plant Profile">
              <svg viewBox="0 0 24 24" style="width: 12px; height: 12px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPlantDropdowns() {
  const selector = document.getElementById('setting-plant-selector');
  if (selector) {
    const currentVal = selector.value;
    let html = '<option value="">-- Choose plant to automatically load recommended moisture thresholds --</option>';
    html += '<optgroup label="Registered Plant Profiles">';
    AppState.plants.forEach(p => {
      html += `<option value="${p.id}" data-name="${p.name}" data-on="${p.min}" data-off="${p.max}">[Profile] ${p.name} (${p.sci || ''}) - Optimal: ${p.min}% - ${p.max}%</option>`;
    });
    html += '</optgroup>';
    selector.innerHTML = html;
    if (currentVal) selector.value = currentVal;
  }

  const capsuleSelector = document.getElementById('capsule-plant-selector');
  if (capsuleSelector && AppState.plants && AppState.plants.length > 0) {
    capsuleSelector.innerHTML = AppState.plants.map(p =>
      `<option value="${p.id}" ${p.id === AppState.activePlantId ? 'selected' : ''}>${p.name}</option>`
    ).join('');
  }
}

function setActivePlantProfile(plantId) {
  AppState.activePlantId = plantId;
  const plant = AppState.plants.find(p => p.id === plantId);
  if (!plant) return;

  renderActivePlant();
  renderPlantTable();
  renderPlantDropdowns();

  const humOnInput = document.getElementById('setting-hum-on');
  const humOffInput = document.getElementById('setting-hum-off');
  if (humOnInput) humOnInput.value = plant.min;
  if (humOffInput) humOffInput.value = plant.max;

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'ACTIVE_PROFILE_SET',
    detail: `Assigned zone botanical target to [${plant.name}] (${plant.min}% - ${plant.max}%)`,
    user: window.CURRENT_USER_NAME || 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO',
    isDemo: AppState.isSimulated
  });
  renderHistoryTables();
  drawTelemetryChart();

  broadcastIotEvent('PLANTS_UPDATED', { plants: AppState.plants, activePlantId: AppState.activePlantId });
  showToast(`Zone assigned to [${plant.name}] profile`, 'success');
}

function openEditPlantModal(plantId) {
  const plant = AppState.plants.find(p => p.id === plantId);
  if (!plant) return;

  const idEl = document.getElementById('edit-plant-id');
  const nameEl = document.getElementById('edit-plant-name');
  const sciEl = document.getElementById('edit-plant-sci');
  const minEl = document.getElementById('edit-plant-min');
  const maxEl = document.getElementById('edit-plant-max');
  const burstEl = document.getElementById('edit-plant-burst');
  const notesEl = document.getElementById('edit-plant-notes');

  if (idEl) idEl.value = plant.id;
  if (nameEl) nameEl.value = plant.name;
  if (sciEl) sciEl.value = plant.sci || '';
  if (minEl) minEl.value = plant.min;
  if (maxEl) maxEl.value = plant.max;
  if (burstEl) burstEl.value = plant.burst || 10;
  if (notesEl) notesEl.value = plant.notes || '';

  openModal('modal-edit-plant');
}

function submitUpdatePlant() {
  const idEl = document.getElementById('edit-plant-id');
  const id = idEl ? parseInt(idEl.value, 10) : 0;
  const plant = AppState.plants.find(p => p.id === id);
  if (!plant) return;

  const nameEl = document.getElementById('edit-plant-name');
  const sciEl = document.getElementById('edit-plant-sci');
  const minEl = document.getElementById('edit-plant-min');
  const maxEl = document.getElementById('edit-plant-max');
  const burstEl = document.getElementById('edit-plant-burst');
  const notesEl = document.getElementById('edit-plant-notes');

  const name = (nameEl && nameEl.value) ? nameEl.value.trim() : '';
  const sci = (sciEl && sciEl.value) ? sciEl.value.trim() : '';
  const min = minEl ? parseFloat(minEl.value) : NaN;
  const max = maxEl ? parseFloat(maxEl.value) : NaN;
  const burst = burstEl ? parseInt(burstEl.value, 10) : 10;
  const notes = (notesEl && notesEl.value) ? notesEl.value.trim() : '';

  if (!name || !sci) {
    showToast('Please specify species name and botanical classification', 'crimson');
    return;
  }
  if (isNaN(min) || isNaN(max) || min >= max) {
    showToast('Min moisture threshold must be lower than max target', 'crimson');
    return;
  }

  plant.name = name;
  plant.sci = sci;
  plant.min = min;
  plant.max = max;
  plant.burst = burst || 10;
  plant.notes = notes || 'Standard horticultural cultivation.';

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'PLANT_UPDATE',
    detail: `Updated botanical calibration profile [${name}] (${min}% - ${max}%)`,
    user: window.CURRENT_USER_NAME || 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO'
  });

  renderPlantTable();
  renderPlantDropdowns();
  renderActivePlant();
  renderHistoryTables();
  drawTelemetryChart();
  closeModal('modal-edit-plant');
  showToast(`Plant profile [${name}] updated successfully`, 'success');

  broadcastIotEvent('PLANTS_UPDATED', { plants: AppState.plants, activePlantId: AppState.activePlantId });

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'edit');
  params.append('plant_id', id);
  params.append('plant_name', name);
  params.append('species', sci);
  params.append('humidity_on', min);
  params.append('humidity_off', max);
  params.append('note', notes);

  fetch(`${ctx}/plants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function deletePlantRecord(plantId) {
  const plant = AppState.plants.find(p => p.id === plantId);
  if (!plant) return;

  if (AppState.plants.length <= 1) {
    showToast('Cannot delete the last remaining botanical profile', 'crimson');
    return;
  }

  if (!confirm(`Are you sure you want to delete the botanical profile [${plant.name}]?`)) {
    return;
  }

  AppState.plants = AppState.plants.filter(p => p.id !== plantId);
  if (AppState.activePlantId === plantId) {
    AppState.activePlantId = AppState.plants[0].id;
  }

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'PLANT_DELETE',
    detail: `Removed botanical calibration profile [${plant.name}]`,
    user: window.CURRENT_USER_NAME || 'admin01',
    ip: '127.0.0.1',
    sev: 'WARNING'
  });

  renderPlantTable();
  renderPlantDropdowns();
  renderActivePlant();
  renderHistoryTables();
  drawTelemetryChart();
  showToast(`Plant profile [${plant.name}] deleted`, 'info');

  broadcastIotEvent('PLANTS_UPDATED', { plants: AppState.plants, activePlantId: AppState.activePlantId });

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'delete');
  params.append('plant_id', plantId);

  fetch(`${ctx}/plants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function filterPlantTable() {
  const input = document.getElementById('input-search-plant');
  const q = (input && input.value ? input.value : '').toLowerCase();
  document.querySelectorAll('#table-plants tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function openAddPlantModal() {
  document.getElementById('plant-name').value = '';
  document.getElementById('plant-sci').value = '';
  document.getElementById('plant-min').value = '50';
  document.getElementById('plant-max').value = '65';
  document.getElementById('plant-burst').value = '10';
  document.getElementById('plant-notes').value = '';
  openModal('modal-create-plant');
}

function submitCreatePlant() {
  const name = document.getElementById('plant-name').value.trim();
  const sci = document.getElementById('plant-sci').value.trim();
  const min = parseFloat(document.getElementById('plant-min').value);
  const max = parseFloat(document.getElementById('plant-max').value);
  const burst = parseInt(document.getElementById('plant-burst').value, 10);
  const notes = document.getElementById('plant-notes').value.trim();

  if (!name || !sci) {
    showToast('Please specify species name and botanical classification', 'crimson');
    return;
  }
  if (min >= max) {
    showToast('Min moisture threshold must be lower than max target', 'crimson');
    return;
  }

  const newPlant = {
    id: Date.now(),
    name,
    sci,
    min,
    max,
    burst: burst || 10,
    notes: notes || 'Standard horticultural cultivation.'
  };

  AppState.plants.push(newPlant);
  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'PLANT_CREATE',
    detail: `Added botanical calibration profile [${name}] (${min}% - ${max}%)`,
    user: window.CURRENT_USER_NAME || 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO'
  });

  renderPlantTable();
  renderPlantDropdowns();
  renderHistoryTables();
  closeModal('modal-create-plant');
  showToast(`Plant profile [${name}] registered and ready in settings`, 'success');

  broadcastIotEvent('PLANTS_UPDATED', { plants: AppState.plants, activePlantId: AppState.activePlantId });

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'add');
  params.append('plant_name', name);
  params.append('species', sci);
  params.append('humidity_on', min);
  params.append('humidity_off', max);
  params.append('note', notes);

  fetch(`${ctx}/plants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function renderUserTable() {
  const tbody = document.getElementById('tbody-users');
  if (!tbody) return;
  tbody.innerHTML = AppState.users.map(user => {
    const isSelf = user.id === AppState.currentUserId;
    const roleBadges = {
      'ADMIN': 'badge-violet',
      'STAFF': 'badge-cyan',
      'VIEWER': 'badge-glass'
    };
    const statusBadge = user.isLocked
      ? '<span class="badge-pill badge-crimson">LOCKED</span>'
      : '<span class="badge-pill badge-emerald">ACTIVE</span>';

    return `
      <tr>
        <td>
          <span class="mono" style="font-weight: 700; color: var(--text-main);">${user.username}</span>
          ${isSelf ? '<span class="badge-pill badge-emerald" style="font-size: 9.5px; margin-left: 6px; padding: 1px 6px;">You</span>' : ''}
        </td>
        <td>${user.fullName}</td>
        <td style="color: var(--text-muted); font-size: 13px;" class="mono">${user.email}</td>
        <td>
          <span class="badge-pill ${roleBadges[user.role] || 'badge-glass'}">${user.role}</span>
        </td>
        <td>${statusBadge}</td>
        <td class="mono" style="color: var(--text-muted); font-size: 12.5px;">${user.createdAt || '2026-10-09'}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-glass btn-sm" onclick="openEditUserModal(${user.id})" title="Edit User">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              Edit
            </button>
            <button class="btn btn-glass btn-sm" onclick="toggleUserLock(${user.id})" ${isSelf ? 'disabled' : ''} title="${user.isLocked ? 'Unlock Account' : 'Lock Account'}">
              ${user.isLocked ? 'Unlock' : 'Lock'}
            </button>
            <button class="btn btn-glass btn-sm" onclick="prjResetPassword(${user.id})" title="Reset password">Reset password</button>
            <button class="btn btn-glass btn-sm" onclick="deleteUser(${user.id})" ${isSelf ? 'disabled' : ''} style="color: var(--accent-crimson);" title="Delete User">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterUserTable() {
  const input = document.getElementById('input-search-user');
  const q = (input && input.value ? input.value : '').toLowerCase();
  document.querySelectorAll('#table-users tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function openCreateUserModal() {
  document.getElementById('new-user-name').value = '';
  document.getElementById('new-user-fullname').value = '';
  document.getElementById('new-user-email').value = '';
  document.getElementById('new-user-password').value = '12345';
  document.getElementById('new-user-role').value = 'STAFF';
  openModal('modal-create-user');
}

function submitCreateUser() {
  const username = document.getElementById('new-user-name').value.trim();
  const fullName = document.getElementById('new-user-fullname').value.trim();
  const email = document.getElementById('new-user-email').value.trim();
  const password = document.getElementById('new-user-password').value.trim();
  const role = document.getElementById('new-user-role').value;

  if (!username || !fullName || !email) {
    showToast('Please fill in all user account fields', 'crimson');
    return;
  }

  if (AppState.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    showToast(`Username [${username}] already exists in database`, 'crimson');
    return;
  }

  const newUser = {
    id: Date.now(),
    username,
    fullName,
    email,
    role,
    isLocked: false,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  AppState.users.push(newUser);
  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'USER_CREATE',
    detail: `Administrator created user [${username}] with role [${role}]`,
    user: 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO'
  });

  renderUserTable();
  renderHistoryTables();
  closeModal('modal-create-user');
  showToast(`User account [${username}] successfully created`, 'success');

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'create');
  params.append('username', username);
  params.append('full_name', fullName);
  params.append('email', email);
  params.append('password', password || '12345');
  params.append('role_code', role);

  fetch(`${ctx}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function openEditUserModal(id) {
  const targetId = (id !== undefined && id !== null) ? id : AppState.currentUserId;
  const user = AppState.users.find(x => x.id === targetId) || AppState.users[0];
  if (!user) return;

  const idEl = document.getElementById('edit-user-id');
  const nameEl = document.getElementById('edit-user-name');
  const fullEl = document.getElementById('edit-user-fullname');
  const emailEl = document.getElementById('edit-user-email');
  const roleEl = document.getElementById('edit-user-role');

  if (idEl) idEl.value = user.id;
  if (nameEl) nameEl.value = user.username;
  if (fullEl) fullEl.value = user.fullName;
  if (emailEl) emailEl.value = user.email;
  if (roleEl) roleEl.value = user.role;
  openModal('modal-edit-user');
}

function submitUpdateUser() {
  const id = parseInt(document.getElementById('edit-user-id').value, 10);
  const user = AppState.users.find(x => x.id === id);
  if (!user) return;

  const newFullName = document.getElementById('edit-user-fullname').value.trim();
  const newEmail = document.getElementById('edit-user-email').value.trim();
  const newRole = document.getElementById('edit-user-role').value;

  if (!newFullName || !newEmail) {
    showToast('Full name and email are required', 'crimson');
    return;
  }

  if (user.role === 'ADMIN' && newRole !== 'ADMIN') {
    const activeAdmins = AppState.users.filter(u => u.role === 'ADMIN' && !u.isLocked);
    if (activeAdmins.length <= 1) {
      showToast('Cannot demote the sole remaining active Administrator!', 'crimson');
      return;
    }
  }

  user.fullName = newFullName;
  user.email = newEmail;
  user.role = newRole;

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'USER_UPDATE',
    detail: `Updated profile & credentials for [${user.username}]`,
    user: 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO'
  });

  renderUserTable();
  renderHistoryTables();
  closeModal('modal-edit-user');
  showToast(`Account [${user.username}] successfully updated`, 'success');

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'edit');
  params.append('user_id', id);
  params.append('full_name', newFullName);
  params.append('email', newEmail);
  params.append('role_code', newRole);

  fetch(`${ctx}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function toggleUserLock(id) {
  const user = AppState.users.find(x => x.id === id);
  if (!user) return;

  if (user.id === AppState.currentUserId) {
    showToast('Self-lockout prevented: You cannot lock your active account!', 'crimson');
    return;
  }

  if (user.role === 'ADMIN' && !user.isLocked) {
    const activeAdmins = AppState.users.filter(u => u.role === 'ADMIN' && !u.isLocked);
    if (activeAdmins.length <= 1) {
      showToast('Cannot lock the last active Administrator account!', 'crimson');
      return;
    }
  }

  user.isLocked = !user.isLocked;

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'USER_LOCK',
    detail: `Administrator ${user.isLocked ? 'LOCKED' : 'UNLOCKED'} account [${user.username}]`,
    user: 'admin01',
    ip: '127.0.0.1',
    sev: 'WARNING'
  });

  renderUserTable();
  renderHistoryTables();
  showToast(`Account [${user.username}] is now ${user.isLocked ? 'LOCKED' : 'ACTIVE'}`, user.isLocked ? 'amber' : 'success');

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'toggleLock');
  params.append('user_id', id);

  fetch(`${ctx}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function deleteUser(id) {
  const user = AppState.users.find(x => x.id === id);
  if (!user) return;

  if (user.id === AppState.currentUserId) {
    showToast('Self-deletion prevented: You cannot delete your active account!', 'crimson');
    return;
  }

  if (user.role === 'ADMIN') {
    const activeAdmins = AppState.users.filter(u => u.role === 'ADMIN');
    if (activeAdmins.length <= 1) {
      showToast('Cannot delete the sole Administrator account!', 'crimson');
      return;
    }
  }

  if (!confirm(`Permanently delete user [${user.username}] from system records?`)) return;

  AppState.users = AppState.users.filter(u => u.id !== id);

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'USER_DELETE',
    detail: `Permanently removed user account [${user.username}]`,
    user: 'admin01',
    ip: '127.0.0.1',
    sev: 'WARNING'
  });

  renderUserTable();
  renderHistoryTables();
  showToast(`User [${user.username}] permanently removed`, 'info');

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('action', 'delete');
  params.append('user_id', id);

  fetch(`${ctx}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function selectSettingMode(mode) {
  AppState.systemMode = mode;

  const autoCard = document.getElementById('card-mode-auto');
  const manualCard = document.getElementById('card-mode-manual');
  const panelAuto = document.getElementById('panel-settings-auto');
  const panelManual = document.getElementById('panel-settings-manual');
  const sumModeVal = document.getElementById('sum-mode-val');
  const sumModeText = document.getElementById('sum-mode-text');
  const ribbonBadge = document.getElementById('ribbon-mode-badge');
  const dashCardBadge = document.getElementById('dash-card-mode-badge');
  const btnToggleMode = document.getElementById('btn-toggle-mode');

  if (btnToggleMode) {
    btnToggleMode.textContent = mode;
    btnToggleMode.className = (mode === 'AUTO') ? 'capsule-switch-auto' : 'capsule-switch-manual';
  }

  if (mode === 'AUTO') {
    if (autoCard) { autoCard.classList.add('selected'); autoCard.classList.remove('selected-manual'); }
    if (manualCard) { manualCard.classList.remove('selected'); manualCard.classList.remove('selected-manual'); }
    if (autoCard) { const radio = autoCard.querySelector('input[type="radio"]'); if (radio) radio.checked = true; }
    if (panelAuto) panelAuto.style.display = 'block';
    if (panelManual) panelManual.style.display = 'none';

    if (sumModeVal) sumModeVal.style.color = 'var(--accent-emerald)';
    if (sumModeText) sumModeText.textContent = 'AUTO';
    if (ribbonBadge) {
      ribbonBadge.textContent = 'Mode: AUTO';
      ribbonBadge.className = 'badge-pill badge-emerald';
    }
    if (dashCardBadge) {
      dashCardBadge.textContent = 'AUTO MODE';
      dashCardBadge.className = 'badge-pill badge-emerald';
    }
  } else {
    if (manualCard) { manualCard.classList.add('selected-manual'); manualCard.classList.remove('selected'); }
    if (autoCard) { autoCard.classList.remove('selected'); autoCard.classList.remove('selected-manual'); }
    if (manualCard) { const radio = manualCard.querySelector('input[type="radio"]'); if (radio) radio.checked = true; }
    if (panelAuto) panelAuto.style.display = 'none';
    if (panelManual) panelManual.style.display = 'flex';

    if (sumModeVal) sumModeVal.style.color = 'var(--accent-amber)';
    if (sumModeText) sumModeText.textContent = 'MANUAL';
    if (ribbonBadge) {
      ribbonBadge.textContent = 'Mode: MANUAL';
      ribbonBadge.className = 'badge-pill badge-amber';
    }
    if (dashCardBadge) {
      dashCardBadge.textContent = 'MANUAL MODE';
      dashCardBadge.className = 'badge-pill badge-amber';
    }
  }

  const sbMode = document.getElementById('sidebar-hw-mode');
  if (sbMode) {
    sbMode.textContent = `Mode: ${mode}`;
    sbMode.className = `badge-pill ${mode === 'AUTO' ? 'badge-emerald' : 'badge-amber'}`;
  }

  showToast(`Mode: ${mode}`, 'info');
}

let pendingManualCallback = null;
function confirmSwitchToManual(callback, actionDescription) {
  if (AppState.systemMode !== 'AUTO') {
    if (typeof callback === 'function') callback();
    return;
  }
  pendingManualCallback = callback;
  const descEl = document.getElementById('modal-confirm-manual-desc');
  if (descEl) {
    if (actionDescription) {
      descEl.innerHTML = '<strong>' + actionDescription + '</strong> requires switching to <strong>MANUAL</strong> mode. This will pause autonomous irrigation cycles until set back to AUTO. Are you sure you want to proceed?';
    } else {
      descEl.innerHTML = 'Switching to <strong>MANUAL</strong> mode will pause autonomous sensor-driven irrigation cycles. The system will rely solely on operator commands. Are you sure you want to proceed?';
    }
  }

  const proceedBtn = document.getElementById('btn-modal-confirm-manual-proceed');
  if (proceedBtn) {
    proceedBtn.onclick = function() {
      closeModal('modal-confirm-switch-manual');
      quickSwitchMode('MANUAL');
      if (typeof pendingManualCallback === 'function') {
        const cb = pendingManualCallback;
        pendingManualCallback = null;
        cb();
      }
    };
  }

  if (window.Swal && typeof window.Swal.fire === 'function') {
    window.Swal.fire({
      title: 'Confirm Manual Override',
      text: (actionDescription ? actionDescription + ' requires switching to MANUAL mode. ' : '') + 'This will pause autonomous sensor-driven irrigation cycles. Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F59E0B',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Switch to Manual',
      cancelButtonText: 'Cancel',
      background: '#0D1117',
      color: '#F8FAFC'
    }).then(function(result) {
      if (result && result.isConfirmed) {
        quickSwitchMode('MANUAL');
        if (typeof pendingManualCallback === 'function') {
          const cb = pendingManualCallback;
          pendingManualCallback = null;
          cb();
        }
      } else {
        pendingManualCallback = null;
      }
    });
    return;
  }

  openModal('modal-confirm-switch-manual');
}
window.confirmSwitchToManual = confirmSwitchToManual;

function requestSwitchMode(mode) {
  if (mode === AppState.systemMode) return;
  if (mode === 'MANUAL' && AppState.systemMode === 'AUTO') {
    confirmSwitchToManual(function() {}, 'Switching operating mode');
  } else {
    quickSwitchMode(mode);
  }
}
window.requestSwitchMode = requestSwitchMode;

function quickSwitchMode(mode) {
  if (mode !== 'AUTO' && mode !== 'MANUAL') return;
  AppState.systemMode = mode;

  selectSettingMode(mode);

  const btnAuto = document.getElementById('btn-switch-auto');
  const btnManual = document.getElementById('btn-switch-manual');
  if (btnAuto) {
    btnAuto.className = `btn btn-sm ${mode === 'AUTO' ? 'btn-emerald' : 'btn-glass'}`;
  }
  if (btnManual) {
    btnManual.className = `btn btn-sm ${mode === 'MANUAL' ? 'btn-amber' : 'btn-glass'}`;
  }

  const dashCardModeBadge = document.getElementById('dash-card-mode-badge');
  if (dashCardModeBadge) {
    dashCardModeBadge.textContent = mode;
    dashCardModeBadge.className = 'badge-pill ' + (mode === 'MANUAL' ? 'badge-amber' : 'badge-emerald');
  }

  const miniLabel = document.getElementById('mini-mode-status-label');
  if (miniLabel) miniLabel.textContent = mode;
  const miniSquare = document.getElementById('mini-square-mode');
  if (miniSquare) {
    miniSquare.classList.toggle('manual-mode', mode === 'MANUAL');
  }

  if (mode === 'MANUAL' && AppState.soakTimerId) {
    clearPumpCountdownUI();
  }

  const appContainer = document.getElementById('app-container');
  const currentSm = AppState.telemetry.soilMoisture;
  const isCriticalDryManual = (mode === 'MANUAL' && currentSm != null && currentSm < 20 && AppState.hardwareConnected);
  if (appContainer) {
    appContainer.classList.toggle('critical-dry-ambient-alert', !!isCriticalDryManual);
  }

  if (AppState.hardwareConnected && !AppState.isSimulated) {
    sendRawSerialCommand(mode === 'AUTO' ? 'MODE_AUTO' : 'MODE_MANUAL');
  }

  if (!AppState.isSimulated) {
    const ctx = window.contextPath || '';
    const params = new URLSearchParams();
    params.append('action', 'mode');
    params.append('device_id', '1');
    params.append('mode', mode);
    fetch(`${ctx}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    }).catch(() => {});
  }

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'MODE_CHANGE',
    detail: `Switched operating mode to ${mode}`,
    user: window.CURRENT_USER_NAME || 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO',
    isDemo: AppState.isSimulated
  });
  renderHistoryTables();

  broadcastIotEvent('MODE_CHANGE', { mode });
  showToast(`Mode: ${mode}`, 'info');
  triggerBellNotification('Mode: ' + mode);
}
window.quickSwitchMode = quickSwitchMode;

function onSettingPlantSelected(selectEl) {
  const opt = selectEl.options[selectEl.selectedIndex];
  if (!opt || !opt.value) return;

  const plantId = parseInt(opt.value, 10);
  const humOn = parseFloat(opt.getAttribute('data-on'));
  const humOff = parseFloat(opt.getAttribute('data-off'));
  const plantName = opt.getAttribute('data-name');

  if (!isNaN(humOn) && !isNaN(humOff)) {
    const inputOn = document.getElementById('setting-hum-on');
    const inputOff = document.getElementById('setting-hum-off');
    if (inputOn) inputOn.value = humOn;
    if (inputOff) inputOff.value = humOff;

    const note = document.getElementById('setting-plant-applied-note');
    const text = document.getElementById('setting-plant-applied-text');
    if (note && text) {
      text.textContent = `\u2713 Linked with ${plantName}: Turn ON < ${humOn.toFixed(1)}%, Turn OFF > ${humOff.toFixed(1)}%`;
      note.style.display = 'block';
    }

    if (!isNaN(plantId)) {
      setActivePlantProfile(plantId);
    }
  }
}
window.onSettingPlantSelected = onSettingPlantSelected;

function saveMistingSettings() {
  const humOnEl = document.getElementById('setting-hum-on');
  const humOffEl = document.getElementById('setting-hum-off');
  const maxRunEl = document.getElementById('setting-max-run');
  const cooldownEl = document.getElementById('setting-cooldown');

  const humOn = (humOnEl && humOnEl.value) ? parseFloat(humOnEl.value) : 50.0;
  const humOff = (humOffEl && humOffEl.value) ? parseFloat(humOffEl.value) : 65.0;
  const maxRun = (maxRunEl && maxRunEl.value) ? parseInt(maxRunEl.value, 10) : 15;
  const cooldown = (cooldownEl && cooldownEl.value) ? parseInt(cooldownEl.value, 10) : 45;

  if (humOn >= humOff) {
    showToast('Start threshold must be lower than stop threshold', 'crimson');
    return;
  }

  const sumStart = document.getElementById('sum-start-val');
  const sumStop = document.getElementById('sum-stop-val');
  const sumMax = document.getElementById('sum-max-val');
  if (sumStart) sumStart.textContent = AppState.systemMode === 'AUTO' ? `< ${humOn.toFixed(1)}%` : 'Manual Only';
  if (sumStop) sumStop.textContent = AppState.systemMode === 'AUTO' ? `> ${humOff.toFixed(1)}%` : 'Manual Only';
  if (sumMax) sumMax.textContent = `${maxRun}s / cycle`;

  const activePlant = AppState.plants.find(p => p.id === AppState.activePlantId) || AppState.plants[0];
  if (activePlant) {
    activePlant.min = humOn;
    activePlant.max = humOff;
  }
  renderActivePlant();

  const podTarget = document.getElementById('pod-soil-target');
  if (podTarget) podTarget.textContent = `${humOn.toFixed(0)}% - ${humOff.toFixed(0)}%`;

  const cardThresh = document.getElementById('dash-card-thresholds');
  if (cardThresh) cardThresh.textContent = `< ${humOn.toFixed(1)}% (Stop > ${humOff.toFixed(1)}%)`;

  drawTelemetryChart();

  AppState.history.audit.unshift({
    time: formatNow(),
    action: 'MISTING_SETTINGS_SAVED',
    detail: `Mode: ${AppState.systemMode}, On: <${humOn}%, Off: >${humOff}%, MaxRun: ${maxRun}s, Cooldown: ${cooldown}s`,
    user: 'admin01',
    ip: '127.0.0.1',
    sev: 'INFO'
  });
  renderHistoryTables();

  if (AppState.hardwareConnected && !AppState.isSimulated) {
    sendRawSerialCommand(`BOUNDS:${humOn},${humOff}`);
    sendRawSerialCommand(`DUR:${maxRun}`);
    sendRawSerialCommand(`SOAK:${cooldown}`);
    sendRawSerialCommand(AppState.systemMode === 'AUTO' ? 'MODE_AUTO' : 'MODE_MANUAL');
  }

  showToast('Settings saved', 'success');

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('device_id', '1');
  params.append('humidity_on', humOn);
  params.append('humidity_off', humOff);
  params.append('max_run_sec', maxRun);
  params.append('cooldown_sec', cooldown);
  params.append('desired_mode', AppState.systemMode);

  fetch(`${ctx}/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});
}

function switchHwModalTab(tabType) {
  const isUsb = (tabType === 'USB');
  const portEl = document.getElementById('hw-connect-port');
  if (portEl) portEl.value = tabType;

  const btnUsb = document.getElementById('tab-btn-usb');
  const btnBt = document.getElementById('tab-btn-bt');
  const paneUsb = document.getElementById('pane-hw-usb');
  const paneBt = document.getElementById('pane-hw-bt');

  if (btnUsb) btnUsb.classList.toggle('active', isUsb);
  if (btnBt) btnBt.classList.toggle('active', !isUsb);
  if (paneUsb) paneUsb.classList.toggle('active', isUsb);
  if (paneBt) paneBt.classList.toggle('active', !isUsb);

  const logEl = document.getElementById('hw-connect-status-log');
  if (logEl) {
    logEl.style.display = 'none';
    logEl.innerHTML = '';
  }
}
window.switchHwModalTab = switchHwModalTab;

function setActiveCamBtn(btnEl) {
  document.querySelectorAll('.liquid-camera-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}
window.setActiveCamBtn = setActiveCamBtn;

function executeUsbSerialConnect() {
  const portEl = document.getElementById('hw-connect-port');
  if (portEl) portEl.value = 'USB';
  return executeHardwareConnect('USB');
}
window.executeUsbSerialConnect = executeUsbSerialConnect;

function executeBluetoothConnect() {
  const portEl = document.getElementById('hw-connect-port');
  if (portEl) portEl.value = 'BT';
  return executeHardwareConnect('BT');
}
window.executeBluetoothConnect = executeBluetoothConnect;

function openConnectModal() {
  openModal('modal-connect-hardware');
  const logEl = document.getElementById('hw-connect-status-log');
  if (logEl) {
    logEl.style.display = 'none';
    logEl.innerHTML = '';
  }
  const btn = document.getElementById('btn-confirm-connect-usb') || document.getElementById('btn-confirm-connect');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Connect Hardware';
  }
}

let pendingHandshakeResolve = null;

function sendRawSerialCommand(cmdText) {
  if (serialPort && serialPort.writable) {
    try {
      const writer = serialPort.writable.getWriter();
      return writer.write(new TextEncoder().encode(cmdText.trim() + '\n'))
        .then(function() {
          writer.releaseLock();
          addSerialLog('TX', cmdText.trim());
          return true;
        })
        .catch(function(e) {
          try { writer.releaseLock(); } catch (err) {}
          console.warn('sendRawSerialCommand write error:', e);
          return false;
        });
    } catch (e) {
      console.warn('sendRawSerialCommand getWriter error:', e);
      return Promise.resolve(false);
    }
  }
  return Promise.resolve(false);
}

function executeHardwareConnect(forcedMode) {
  const portEl = document.getElementById('hw-connect-port');
  const portMode = forcedMode || ((portEl && portEl.value) ? portEl.value : 'USB');
  const isUsbOnly = (portMode === 'USB');
  const isBtOnly = (portMode === 'BT');
  const logEl = document.getElementById('hw-connect-status-log');
  const btn = document.getElementById('btn-confirm-connect-usb') || document.getElementById('btn-confirm-connect');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;" class="spin-icon"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg> Handshaking...';
  }
  if (logEl) {
    logEl.style.display = 'block';
    logEl.innerHTML = '<div style="color: var(--accent-cyan);">&gt; Initializing WebSerial interface @ 9600 Baud...</div>';
  }

  const prepPromise = (AppState.hardwareConnected || serialPort) ? disconnectHardware(true) : Promise.resolve();

  return prepPromise.then(function() {
    if (!('serial' in navigator)) {
      if (logEl) {
        logEl.innerHTML += '<div style="color: var(--accent-amber); margin-top: 4px;">&gt; WebSerial API requires Chrome or Edge.</div>';
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Connect Hardware';
      }
      return;
    }

    if (logEl) {
      logEl.innerHTML += '<div style="color: var(--accent-amber); margin-top: 4px;">&gt; Requesting port access...</div>';
    }

    return navigator.serial.requestPort().then(function(port) {
      serialPort = port;
      const info = (serialPort.getInfo && serialPort.getInfo()) || {};
      const hasUsbId = Boolean(info.usbVendorId || info.usbProductId);

      if (isUsbOnly && !hasUsbId && info.bluetoothServiceClassId) {
        throw new Error('Channel Mismatch: Bluetooth device selected on USB tab. Please use Bluetooth tab.');
      }
      if (isBtOnly && hasUsbId) {
        throw new Error('Channel Mismatch: Physical USB cable selected on Bluetooth tab. Please use USB tab.');
      }

      return serialPort.open({ baudRate: 9600 });
    }).then(function() {
      const info = (serialPort.getInfo && serialPort.getInfo()) || {};
      const isPhysicalUsb = Boolean(info.usbVendorId);
      const connType = (portMode === 'BT') ? 'BT' : (isPhysicalUsb ? 'USB' : 'USB');
      const portName = (connType === 'BT') ? 'Bluetooth HC-05 Wireless (SPP)' : 'USB Serial Cable (CH340/Uno)';

      if (logEl) {
        logEl.innerHTML += '<div style="color: var(--text-secondary); margin-top: 4px;">&gt; Port opened @ 9600 Baud. Verifying handshake...</div>';
      }

      startSerialReaderLoop();

      if (serialPingTimer) clearInterval(serialPingTimer);
      serialPingTimer = setInterval(function() {
        if (AppState.hardwareConnected && serialPort) {
          sendRawSerialCommand('PING');
        }
      }, 2000);

      const handshakePromise = new Promise(function(resolve) {
        pendingHandshakeResolve = resolve;

        setTimeout(function() { sendRawSerialCommand('STATUS'); }, 150);
        setTimeout(function() { sendRawSerialCommand('STATUS'); }, 450);
        setTimeout(function() { sendRawSerialCommand('STATUS'); }, 1000);
        setTimeout(function() { sendRawSerialCommand('STATUS'); }, 1800);

        setTimeout(function() {
          if (pendingHandshakeResolve) {
            pendingHandshakeResolve = null;
            resolve('OPEN_ESTABLISHED');
          }
        }, 2000);
      });

      return handshakePromise.then(function() {
        if (logEl) {
          logEl.innerHTML += '<div style="color: var(--accent-emerald); font-weight: 600; margin-top: 4px;">&gt; Connected to ' + portName + '.</div>';
        }
        setTimeout(function() {
          onHardwareSuccessfullyConnected(portName, false, connType);
        }, 400);
      }).catch(function(verifyErr) {
        console.warn('Hardware verification failed:', verifyErr);
        if (logEl) {
          logEl.innerHTML += '<div style="color: var(--accent-crimson); font-weight: 600; margin-top: 4px;">&gt; Incompatible device (No IoT response).</div>';
        }
        return disconnectHardware(true).then(function() {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Try Again';
          }
          showToast('Connection rejected: Incompatible device.', 'crimson');
        });
      });
    }).catch(function(err) {
      if (logEl) {
        logEl.innerHTML += '<div style="color: var(--accent-crimson); margin-top: 4px;">&gt; ' + (err.message || 'Connection cancelled') + '.</div>';
      }
      return disconnectHardware(true).then(function() {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Connect Hardware';
        }
      });
    });
  });
}

function startSimulatedDemoMode() {
  const cleanupPromise = (AppState.hardwareConnected || serialPort) ? disconnectHardware(true) : Promise.resolve();
  return cleanupPromise.then(function() {
    AppState.hardwareConnected = true;
    AppState.isSimulated = true;
    AppState.connectionType = 'SIMULATOR';
    closeModal('modal-connect-hardware');
    updateHardwareConnectionUI(true, true, 'SIMULATOR', 'SIMULATOR');

    const liveBadge = document.getElementById('chart-live-badge');
    if (liveBadge) {
      liveBadge.textContent = 'DEMO';
      liveBadge.className = 'badge-pill badge-amber mono';
    }

    startSimulatedTelemetryStream();
    toggleTestBenchMode(true);

    AppState.history.audit.unshift({
      time: formatNow(),
      action: 'DEMO_ACTIVE',
      detail: 'Demo stream started (Isolated memory)',
      user: window.CURRENT_USER_NAME || 'admin01',
      ip: '127.0.0.1 (DEMO)',
      sev: 'INFO',
      isDemo: true
    });
    renderHistoryTables();
    triggerBellNotification('Demo Running', 'info');
  });
}

function onHardwareSuccessfullyConnected(portName, isSimulated = false, connType = 'USB') {
  AppState.telemetrySamples = [];
  AppState.hardwareConnected = true;
  AppState.isSimulated = isSimulated;
  AppState.connectionType = isSimulated ? 'SIMULATOR' : (connType || 'USB');
  closeModal('modal-connect-hardware');
  updateHardwareConnectionUI(true, isSimulated, portName, AppState.connectionType);
  triggerBellNotification(isSimulated ? 'Demo Running' : 'Hardware Connected (' + portName + ')', 'emerald');

  const liveBadge = document.getElementById('chart-live-badge');
  if (liveBadge) {
    liveBadge.textContent = isSimulated ? 'DEMO' : 'LIVE';
    liveBadge.className = `badge-pill ${isSimulated ? 'badge-amber' : 'badge-emerald'} mono`;
  }

  if (!isSimulated) {
    const soilVal = document.getElementById('stat-soil-moisture');
    const tankVal = document.getElementById('stat-tank-val');
    const airTemp = document.getElementById('stat-air-temp');
    const airSubtext = document.getElementById('stat-air-subtext');
    if (soilVal && AppState.telemetry.soilMoisture == null) soilVal.textContent = 'SYNC...';
    if (tankVal && AppState.telemetry.tankLevel == null) tankVal.textContent = 'SYNC...';
    if (airTemp && AppState.telemetry.airTemperature == null) airTemp.textContent = 'SYNC...';
    if (airSubtext) airSubtext.textContent = '';

    AppState.history.audit.unshift({
      time: formatNow(),
      action: 'HARDWARE_LINKED',
      detail: `${portName} connected @ 9600 Baud`,
      user: window.CURRENT_USER_NAME || 'admin01',
      ip: portName,
      sev: 'INFO',
      isDemo: false
    });
    renderHistoryTables();

    showToast(`Connected: ${portName}`, 'success');
    triggerBellNotification('Hardware Online');
  }
}

async function startSerialReaderLoop() {
  if (!serialPort || !serialPort.readable) return;
  serialKeepReading = true;

  try {
    const textDecoder = new TextDecoderStream();
    readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable).catch(function() {});
    serialReader = textDecoder.readable.getReader();

    let buffer = '';
    while (serialKeepReading) {
      const { value, done } = await serialReader.read();
      if (done) break;
      if (value) {
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (trimmed.length > 0) {
            parseIncomingHardwarePacket(trimmed);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Serial] Read loop error:', err);
  } finally {
    try { if (serialReader) serialReader.releaseLock(); } catch (e) {}
    serialReader = null;
  }
}

function parseIncomingHardwarePacket(raw) {
  if (!raw) return;

  addSerialLog('RX', raw);

  if (pendingHandshakeResolve) {
    if (raw.includes('[ACK]') || raw.startsWith('{') || raw.startsWith('$MIST') || raw.startsWith('$S') || raw.includes('READY')) {
      pendingHandshakeResolve(raw);
      pendingHandshakeResolve = null;
    }
  }

  if (raw.startsWith('[ACK]')) {
    return;
  }

  if (raw.startsWith('[EVT:')) {
    if (raw.includes('SAFETY_STOP_WATER') || raw.includes('REFUSED_WATER')) {
      showToast('Low Water (<20%): Pump Blocked', 'crimson');
      triggerBellNotification('Water Critical: Pump Stopped');
    } else if (raw.includes('SAFETY_STOP_TEMP') || raw.includes('REFUSED_TEMP')) {
      showToast('Thermal Cutoff (<18.0°C): Pump Blocked to protect Ludisia discolor', 'crimson');
      triggerBellNotification('Thermal Lockout: Temp < 18°C');
    } else if (raw.includes('SAFETY_STOP_SOIL') || raw.includes('REFUSED_SOIL')) {
      showToast('Substrate Saturated (>65%): Pump Blocked to prevent root rot', 'crimson');
      triggerBellNotification('Hydration Lockout: Soil > 65%');
    } else if (raw.includes('SAFETY_STOP_DHT') || raw.includes('REFUSED_DHT')) {
      showToast('Diagnostic Fault: DHT11 sensor disconnected. Pump Blocked.', 'crimson');
      triggerBellNotification('Diagnostic Lockout: DHT11 Offline');
    } else if (raw.includes('SAFETY_STOP_SENSORS') || raw.includes('REFUSED_SENSORS')) {
      showToast('Diagnostic Fault: Analog probes not ready. Pump Blocked.', 'crimson');
      triggerBellNotification('Diagnostic Lockout: Probes Offline');
    } else if (raw.includes('AUTO_STOP_RH')) {
      showToast('Auto Mist Stopped: Air RH target reached (>=70%)', 'success');
      triggerBellNotification('Auto Target Reached (RH >= 70%)');
    } else if (raw.includes('AUTO_START')) {
      showToast('Auto Mist Started: Air RH below 60%', 'info');
    } else if (raw.includes('MANUAL_START')) {
      showToast('Manual Mist Started: Running continuously', 'success');
    } else if (raw.includes('MANUAL_STOP')) {
      showToast('Manual Mist Stopped by Operator', 'info');
    } else if (raw.includes('AUTO_STOP_RAIN') || raw.includes('REFUSED_RAIN')) {
      showToast('Rain Detected: Pump Stopped', 'sky');
      triggerBellNotification('Rain Detected: Pump Stopped');
    } else if (raw.includes('WATCHDOG_STOP')) {
      showToast('Watchdog Timeout: Pump Stopped', 'amber');
      triggerBellNotification('Watchdog Timeout: 15s');
    } else if (raw.includes('ALERT_SENSOR_STUCK')) {
      showToast('Warning: Air RH remains low after misting cycles. Check DHT11 and mister.', 'crimson');
      triggerBellNotification('Sensor Alert: Air Humidity Not Responding');
    } else if (raw.includes('SOAK_START')) {
      const cooldownEl = document.getElementById('setting-cooldown');
      const cooldownSec = parseInt(cooldownEl ? cooldownEl.value : '45', 10) || 45;
      startSoakCooldown(cooldownSec);
      showToast('Cycle-and-Soak: Absorbing Water', 'info');
      triggerBellNotification('Soak Cooldown Active');
    } else if (raw.includes('SOAK_COMPLETE')) {
      clearPumpCountdownUI();
      showToast('Soak Complete: Evaluating Soil', 'info');
    } else if (raw.includes('AUTO_STOP_SOIL')) {
      showToast('Automatic Mist Stopped', 'success');
    }
    return;
  }

  if (raw.startsWith('$MIST') || raw.startsWith('$S')) {
    let sm = AppState.telemetry.soilMoisture;
    let tk = AppState.telemetry.tankLevel != null ? AppState.telemetry.tankLevel : 80;
    let rn = false;
    let pmp = false;

    if (raw.includes('SM=')) {
      const parts = raw.replace('$', '').replace('#', '').split(',');
      parts.forEach(p => {
        if (p.startsWith('SM=')) sm = parseFloat(p.split('=')[1]);
        if (p.startsWith('TK=')) tk = parseInt(p.split('=')[1], 10);
        if (p.startsWith('RN=')) rn = parseInt(p.split('=')[1], 10) === 1;
        if (p.startsWith('PMP=')) pmp = parseInt(p.split('=')[1], 10) === 1;
        if (p.startsWith('TEMP=')) {
          const tVal = parseFloat(p.split('=')[1]);
          AppState.telemetry.airTemperature = tVal;
          AppState.telemetry.temperature = tVal;
        }
      });
    } else {
      const tokens = raw.replace('$', '').replace('*', '').split(',');
      if (tokens.length >= 2) sm = parseFloat(tokens[1]);
      if (tokens.length >= 3) {
        const tVal = parseFloat(tokens[2]);
        AppState.telemetry.airTemperature = tVal;
        AppState.telemetry.temperature = tVal;
      }
      if (tokens.length >= 4) pmp = tokens[3] === '1';
    }

    if (sm != null && !isNaN(sm)) {
      applyTelemetryUpdate(sm, tk, rn, pmp);
      syncTelemetryToBackend(sm, tk, rn, pmp);
      broadcastIotEvent('TELEMETRY', { sm, tk, rn, pmp });
    }
  } else {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        const isSoilValid = data.soil_ok !== 0 && data.soil_ok !== false && (
          (data.soil !== undefined && data.soil !== null && !isNaN(data.soil) && Number(data.soil) >= 0) ||
          (data.soil_moisture !== undefined && data.soil_moisture !== null && !isNaN(data.soil_moisture)) ||
          (data.humidity !== undefined && data.humidity !== null && !isNaN(data.humidity))
        );
        let sm = null;
        if (isSoilValid) {
          if (data.soil !== undefined && data.soil !== null) sm = parseFloat(data.soil);
          else if (data.soil_moisture !== undefined && data.soil_moisture !== null) sm = parseFloat(data.soil_moisture);
          else if (data.humidity !== undefined && data.humidity !== null) sm = parseFloat(data.humidity);
        }

        const isWaterValid = data.water_valid !== 0 && data.water_valid !== false && (
          (data.water !== undefined && data.water !== null && !isNaN(data.water) && Number(data.water) >= 0) ||
          (data.water_pct !== undefined && data.water_pct !== null && !isNaN(data.water_pct) && Number(data.water_pct) >= 0)
        );
        let tk = null;
        if (isWaterValid) {
          tk = (data.water !== undefined && data.water !== null) ? parseFloat(data.water) : parseFloat(data.water_pct);
        } else if (data.water_ok === 1 || data.water_ok === true) {
          tk = (data.water !== undefined && data.water !== null) ? parseFloat(data.water) : (data.water_pct != null ? parseFloat(data.water_pct) : 50);
        } else if (data.water !== undefined && data.water !== null && !isNaN(data.water)) {
          tk = parseFloat(data.water);
        } else if (data.water_pct !== undefined && data.water_pct !== null && !isNaN(data.water_pct)) {
          tk = parseFloat(data.water_pct);
        }

        const pmp = (data.pump_on !== undefined) ? Boolean(Number(data.pump_on))
                  : ((data.pump !== undefined) ? Boolean(Number(data.pump))
                  : ((data.relay !== undefined) ? Boolean(Number(data.relay))
                  : ((data.relay_on !== undefined) ? Boolean(Number(data.relay_on))
                  : ((data.pmp !== undefined) ? Boolean(Number(data.pmp)) : false))));

        const rn = data.is_raining !== undefined ? Boolean(data.is_raining)
                 : (data.rain !== undefined ? Boolean(data.rain)
                 : (data.rn !== undefined ? Boolean(data.rn) : false));

        if (data.dht_ok === 0 || data.dht_ok === false || data.air_temp === null) {
          AppState.telemetry.airTemperature = null;
          AppState.telemetry.temperature = null;
        } else if (data.air_temp !== undefined && data.air_temp !== null && !isNaN(data.air_temp)) {
          const t = parseFloat(data.air_temp);
          AppState.telemetry.airTemperature = t;
          AppState.telemetry.temperature = t;
        } else if (data.temperature !== undefined && data.temperature !== null && !isNaN(data.temperature)) {
          const t = parseFloat(data.temperature);
          AppState.telemetry.airTemperature = t;
          AppState.telemetry.temperature = t;
        } else if (data.temp !== undefined && data.temp !== null && !isNaN(data.temp)) {
          const t = parseFloat(data.temp);
          AppState.telemetry.airTemperature = t;
          AppState.telemetry.temperature = t;
        }

        if (data.dht_ok === 0 || data.dht_ok === false || data.air_hum === null) {
          AppState.telemetry.airHumidity = null;
        } else if (data.air_hum !== undefined && data.air_hum !== null && Number.isFinite(Number(data.air_hum))) {
          AppState.telemetry.airHumidity = Number(data.air_hum);
        } else if (data.air_humidity !== undefined && data.air_humidity !== null && Number.isFinite(Number(data.air_humidity))) {
          AppState.telemetry.airHumidity = Number(data.air_humidity);
        }

        if (Number.isFinite(Number(data.hum_on)) && Number.isFinite(Number(data.hum_off))) {
          AppState.firmwareBounds = { on: Number(data.hum_on), off: Number(data.hum_off) };
          const thresholdText = `Air RH: Start < ${AppState.firmwareBounds.on}% / Stop >= ${AppState.firmwareBounds.off}%`;
          const boundEl = document.getElementById('dash-card-thresholds');
          if (boundEl) boundEl.textContent = thresholdText;
        }

        if (data.mode) {
          const cleanMode = data.mode.toUpperCase();
          if (cleanMode !== AppState.systemMode) {
            AppState.systemMode = cleanMode;
            const modeBadge = document.getElementById('dash-card-mode-badge');
            if (modeBadge) {
              modeBadge.textContent = cleanMode;
              modeBadge.className = `badge-pill ${cleanMode === 'AUTO' ? 'badge-emerald' : 'badge-amber'}`;
            }
            const miniLabel = document.getElementById('mini-mode-status-label');
            if (miniLabel) miniLabel.textContent = cleanMode;
          }
        }

        if (typeof data.stop_reason === 'number') {
          switch (data.stop_reason) {
            case 0: AppState.telemetry.lockReason = 'NONE'; break;
            case 1: AppState.telemetry.lockReason = 'SENSORS'; break;
            case 2: AppState.telemetry.lockReason = 'DHT'; break;
            case 3: AppState.telemetry.lockReason = 'TEMP'; break;
            case 4: AppState.telemetry.lockReason = 'SOIL'; break;
            case 5: AppState.telemetry.lockReason = 'WATER'; break;
            case 6: AppState.telemetry.lockReason = 'RH'; break;
            default: AppState.telemetry.lockReason = 'STOP_' + data.stop_reason; break;
          }
        } else if (data.lock_reason) {
          AppState.telemetry.lockReason = data.lock_reason;
        }

        applyTelemetryUpdate(sm, tk, rn, pmp);
        syncTelemetryToBackend(sm, tk, rn, pmp);
        broadcastIotEvent('TELEMETRY', { sm, tk, rn, pmp });
      } catch (e) {
        console.warn('Failed to parse hardware JSON packet:', raw, e);
      }
    }
  }
}

function startSimulatedTelemetryStream() {
  clearInterval(simulatedHardwareInterval);
    try {
      const stopUrl = (window.contextPath || "") + "/api/sensor?action=intentional_stop";
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(stopUrl, new URLSearchParams({action:'intentional_stop'}));
      } else if (typeof fetch !== "undefined") {
        fetch(stopUrl, { method: "POST", keepalive: true }).catch(function() {});
      }
    } catch (e) {}

  if (AppState.telemetry.soilMoisture == null) AppState.telemetry.soilMoisture = 56.0;
  if (AppState.telemetry.tankLevel == null) AppState.telemetry.tankLevel = 85;
  AppState.telemetry.airTemperature = 26.5;
  AppState.telemetry.temperature = 26.5;

  simulatedHardwareInterval = setInterval(() => {
    if (!AppState.hardwareConnected || !AppState.isSimulated) return;

    let currentSoil = AppState.telemetry.soilMoisture;
    let currentTank = AppState.telemetry.tankLevel;
    let isRaining = AppState.telemetry.isRaining;

    if (AppState.isPumpActive) {
      currentSoil = Math.min(85.0, currentSoil + 0.8);
      currentTank = Math.max(10, currentTank - 0.2);
    } else {
      currentSoil = Math.max(30.0, currentSoil - 0.1);
    }

    if (AppState.isPumpActive) {
      AppState.telemetry.airHumidity = Math.min(88.0, (AppState.telemetry.airHumidity || 62.0) + 1.2);
    } else {
      AppState.telemetry.airHumidity = Math.max(45.0, (AppState.telemetry.airHumidity || 62.0) - 0.3);
    }
    const curTemp = AppState.telemetry.airTemperature != null ? AppState.telemetry.airTemperature : 26.5;
    const curAirHum = Math.round((AppState.telemetry.airHumidity || 62.0) * 10) / 10;

    applyTelemetryUpdate(currentSoil, Math.round(currentTank), isRaining, AppState.isPumpActive);
    syncTelemetryToBackend(currentSoil, Math.round(currentTank), isRaining, AppState.isPumpActive);

    addSerialLog('RX', `{"humidity":${currentSoil.toFixed(1)},"temperature":${curTemp},"air_hum":${curAirHum},"water_ok":${currentTank > 20 ? 1 : 0},"is_raining":${isRaining ? 1 : 0},"pump_on":${AppState.isPumpActive ? 1 : 0}}`);
    broadcastIotEvent('TELEMETRY', { sm: currentSoil, tk: Math.round(currentTank), rn: isRaining, pmp: AppState.isPumpActive, airHum: curAirHum });

    if (AppState.systemMode === 'AUTO') {
      const activePlant = AppState.plants.find(p => p.id === AppState.activePlantId) || AppState.plants[0];
      const humOn = (AppState.firmwareBounds && AppState.firmwareBounds.on) || 60;
      const humOff = (AppState.firmwareBounds && AppState.firmwareBounds.off) || 70;

      if (AppState.isPumpActive) {
        if (curAirHum >= humOff || currentTank < 20 || curTemp < 18.0 || currentSoil > 65.0 || isRaining) {
          handleStopPump(curAirHum >= humOff ? 'AUTO_RH_TARGET_REACHED' : 'SAFETY_LOCKOUT');
        }
      } else {
        const soilDemand = activePlant ? (currentSoil < activePlant.min) : false;
        const rhDemand = curAirHum < humOn;
        if ((rhDemand || soilDemand) && currentTank >= 20 && curTemp >= 18.0 && currentSoil <= 65.0 && !isRaining) {
          handleStartPump(false);
        }
      }
    }
  }, 1500);
}

function updateHoloVitals(sm, tk, temp, vpd) {
  try {
    const soilVal = document.getElementById('holo-soil-val');
    const soilCircle = document.getElementById('holo-soil-circle');
    const soilStatus = document.getElementById('holo-soil-status');
    if (soilVal) soilVal.textContent = (Number.isFinite(sm) ? Math.round(sm) + '%' : '--');
    if (soilCircle) {
      const circ = 88;
      const offset = circ - (Math.max(0, Math.min(100, sm || 0)) / 100) * circ;
      soilCircle.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }
    if (soilStatus) {
      soilStatus.textContent = sm < 30 ? 'Dry Warning' : (sm > 80 ? 'Oversaturated' : 'Project range (40-65%)');
      soilStatus.style.color = sm < 30 ? '#ef4444' : '#10b981';
    }

    const waterVal = document.getElementById('holo-water-val');
    const waterCircle = document.getElementById('holo-water-circle');
    const waterStatus = document.getElementById('holo-water-status');
    if (waterVal) waterVal.textContent = (Number.isFinite(tk) ? Math.round(tk) + '%' : '--');
    if (waterCircle) {
      const circ = 88;
      const offset = circ - (Math.max(0, Math.min(100, tk || 0)) / 100) * circ;
      waterCircle.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }
    if (waterStatus) {
      waterStatus.textContent = tk <= 20 ? 'Critical Low' : 'Normal Reserve';
      waterStatus.style.color = tk <= 20 ? '#ef4444' : '#06b6d4';
    }

    const vpdVal = document.getElementById('holo-vpd-val');
    if (vpdVal) vpdVal.textContent = Number.isFinite(vpd) ? Number(vpd).toFixed(2) : '--';

    const tempVal = document.getElementById('holo-temp-val');
    if (tempVal) tempVal.textContent = Number.isFinite(temp) ? temp.toFixed(1) + '\u00B0C' : '--';
  } catch(e) {}
}
window.updateHoloVitals = updateHoloVitals;

function resetTelemetryToStandby() {
  const hexClusterEl = document.getElementById('organic-hex-cluster');
  if (hexClusterEl) hexClusterEl.classList.add('standby');
  AppState.telemetry = {
    soilMoisture: null,
    tankLevel: null,
    isRaining: false,
    temperature: null,
    airTemperature: null,
    airHumidity: null,
    lockReason: 'NONE',
    lastRxTime: null
  };

  const soilVal = document.getElementById('stat-soil-moisture');
  const soilBar = document.getElementById('pod-soil-bar');
  const podSoilDot = document.getElementById('pod-soil-dot');
  if (soilVal) {
    soilVal.textContent = '--';
    soilVal.style.color = 'var(--text-muted)';
  }
  if (soilBar) {
    soilBar.style.width = '0%';
    soilBar.style.backgroundColor = 'var(--accent-emerald)';
  }
  if (podSoilDot) podSoilDot.className = 'micro-status-indicator offline';

  const podSoilGauge = document.getElementById('pod-soil-gauge');
  if (podSoilGauge) podSoilGauge.style.strokeDashoffset = '140';

  const tankVal = document.getElementById('stat-tank-val');
  const tankBar = document.getElementById('pod-tank-bar');
  const podTankDot = document.getElementById('pod-tank-dot');
  const podTankGauge = document.getElementById('pod-tank-gauge');
  const waterTube = document.getElementById('pod-water-tube');
  if (tankVal) {
    tankVal.textContent = '--';
    tankVal.style.color = 'var(--text-muted)';
  }
  if (podTankGauge) podTankGauge.style.strokeDashoffset = '140';
  const airHumEl = document.getElementById('stat-air-hum');
  if (airHumEl) {
    airHumEl.textContent = '--';
    airHumEl.style.color = 'var(--text-muted)';
  }
  const humBar = document.getElementById('pod-air-hum-bar');
  if (humBar) humBar.style.width = '0%';
  const tempBar = document.getElementById('pod-temp-bar');
  if (tempBar) tempBar.style.width = '0%';
  if (tankBar) {
    tankBar.style.width = '0%';
    tankBar.style.backgroundColor = '#0284C7';
  }
  if (waterTube) waterTube.style.height = '0%';
  if (podTankDot) podTankDot.className = 'micro-status-indicator offline';

  if (typeof updateHoloVitals === "function") updateHoloVitals(0, 0, null, null);

  const rainVal = document.getElementById('stat-rain-state');
  const podRainDot = document.getElementById('pod-rain-dot');
  if (rainVal) {
    rainVal.textContent = 'DRY';
    rainVal.style.color = 'var(--text-muted)';
  }
  if (podRainDot) podRainDot.className = 'micro-status-indicator offline';

  const airTemp = document.getElementById('stat-air-temp');
  const airSubtext = document.getElementById('stat-air-subtext');
  const podClimateDot = document.getElementById('pod-climate-dot');
  if (airTemp) {
    airTemp.textContent = '--';
    airTemp.style.color = 'var(--text-muted)';
  }
  if (airSubtext) {
    airSubtext.textContent = '';
  }
  if (podClimateDot) podClimateDot.className = 'micro-status-indicator offline';

  const statPump = document.getElementById('stat-pump-state');
  const podPumpDot = document.getElementById('pod-pump-dot');
  if (statPump) {
    statPump.textContent = 'IDLE';
    statPump.style.color = 'var(--text-main)';
  }
  if (podPumpDot) podPumpDot.className = 'micro-status-indicator offline';
  updatePumpTileBar(false, false);

  const liveBadge = document.getElementById('chart-live-badge');
  if (liveBadge) {
    liveBadge.textContent = 'STANDBY';
    liveBadge.className = 'badge-pill badge-glass mono';
  }

  const miniPump = document.getElementById('mini-square-pump');
  const miniPumpLabel = document.getElementById('mini-pump-status-label');
  const miniPumpSvg = document.getElementById('mini-pump-fan-svg');
  if (miniPump && miniPumpLabel) {
    miniPump.classList.remove('pumping');
    miniPumpLabel.textContent = 'OFF';
    miniPumpLabel.style.color = 'var(--text-secondary)';
    if (miniPumpSvg) miniPumpSvg.style.animation = 'none';
  }

  clearPumpCountdownUI();
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.classList.remove('critical-dry-ambient-alert');

  if (window.Garden3D) {
    if (typeof window.Garden3D.triggerSpray === 'function') window.Garden3D.triggerSpray(false);
    if (typeof window.Garden3D.setRainState === 'function') window.Garden3D.setRainState(false);
  }

  AppState.telemetrySamples = [];
  generateDynamicChartData(AppState.activeChartRange || '24h');
  drawTelemetryChart();
}
window.resetTelemetryToStandby = resetTelemetryToStandby;

function updatePumpTileBar(isOn, isConnected) {
  const val = document.getElementById('stat-pump-state');
  const bar = document.getElementById('pod-pump-bar');
  const dot = document.getElementById('pod-pump-dot');
  if (!val) return;
  const online = !!isConnected;
  const running = online && !!isOn;
  val.textContent = running ? 'ACTIVE' : 'IDLE';
  val.style.color = running ? 'var(--accent-emerald)' : 'var(--text-main)';
  if (bar) bar.style.width = running ? '100%' : '0%';
  if (dot) dot.className = 'micro-status-indicator ' + (!online ? 'offline' : (running ? 'live' : ''));
}

function applyTelemetryUpdate(sm, tk, rn, pmp) {
  const hexClusterEl = document.getElementById('organic-hex-cluster');
  if (hexClusterEl) hexClusterEl.classList.remove('standby');

  const validSm = (sm != null && !isNaN(sm)) ? Math.min(100, Math.max(0, Number(sm))) : null;
  const validTk = (tk != null && Number.isFinite(Number(tk))) ? Math.min(100, Math.max(0, Number(tk))) : null;

  AppState.telemetry.soilMoisture = validSm;
  AppState.telemetry.tankLevel = validTk;
  AppState.telemetry.isRaining = !!rn;
  AppState.telemetry.lastRxTime = Date.now();
  if (pmp !== undefined) AppState.isPumpActive = !!pmp;
  updatePumpTileBar(AppState.isPumpActive, AppState.hardwareConnected);

  if (window.Garden3D) {
    if (typeof window.Garden3D.setSoilMoisture === 'function') window.Garden3D.setSoilMoisture(validSm !== null ? validSm : 0);
    if (typeof window.Garden3D.setWaterLevel === 'function') window.Garden3D.setWaterLevel(validTk !== null ? validTk : 0);
    if (typeof window.Garden3D.setRainState === 'function') window.Garden3D.setRainState(!!rn);
    if (pmp !== undefined && typeof window.Garden3D.triggerSpray === 'function') window.Garden3D.triggerSpray(!!pmp);

    const curT = AppState.telemetry.airTemperature;
    const curH = AppState.telemetry.airHumidity;
    const validClimate = Number.isFinite(curT) && Number.isFinite(curH);
    const es = validClimate ? 0.61078 * Math.exp((17.27 * curT) / (curT + 237.3)) : null;
    const curVpd = validClimate ? Math.max(0, es * (1 - curH / 100)) : null;
    updateHoloVitals(validSm, validTk, curT, curVpd);
  }

  if (AppState.isPumpActive) {
    const curT = AppState.telemetry.airTemperature;
    if (validTk !== null && validTk < 20.0) {
      if (typeof stopQuickSpray === 'function') stopQuickSpray();
      handleStopPump('SAFETY_LOW_WATER_LOCKOUT');
      showToast('Safety Lockout: Reservoir level < 20%, mist halted', 'crimson');
      triggerBellNotification('Emergency Stop: Low Reservoir');
    } else if (rn) {
      if (typeof stopQuickSpray === 'function') stopQuickSpray();
      handleStopPump('SAFETY_RAIN_LOCKOUT');
      showToast('Safety Lockout: Precipitation detected, mist halted', 'amber');
      triggerBellNotification('Weather Lockout: Rain Detected');
    } else if (curT != null && curT < 18.0) {
      if (typeof stopQuickSpray === 'function') stopQuickSpray();
      handleStopPump('SAFETY_COLD_TEMP_LOCKOUT');
      showToast('Thermal Cutoff: Temp < 18.0°C (Cold Shock Protection), mist halted', 'crimson');
      triggerBellNotification('Thermal Lockout: Temp < 18°C');
    } else if (validSm !== null && validSm > 65.0) {
      if (typeof stopQuickSpray === 'function') stopQuickSpray();
      handleStopPump('SAFETY_WET_SOIL_LOCKOUT');
      showToast('Hydration Cutoff: Soil moisture > 65% (Root Rot Protection), mist halted', 'crimson');
      triggerBellNotification('Hydration Lockout: Soil > 65%');
    }
  }

  const capsuleBadge = document.getElementById('capsule-conn-badge');
  if (capsuleBadge) {
    const pDot = capsuleBadge.querySelector('.pulse-dot');
    if (pDot) {
      pDot.classList.add('pulse-rx');
      setTimeout(() => pDot.classList.remove('pulse-rx'), 300);
    }
  }

  if (typeof activeMorphSensor !== 'undefined' && activeMorphSensor) {
    const detailVal = document.getElementById('detail-card-val');
    if (detailVal) {
      if (activeMorphSensor === 'soil') detailVal.textContent = validSm !== null ? validSm.toFixed(1) + '%' : '--';
      else if (activeMorphSensor === 'water') detailVal.textContent = validTk !== null ? Math.round(validTk) + '%' : '--';
      else if (activeMorphSensor === 'humidity') detailVal.textContent = Number.isFinite(AppState.telemetry.airHumidity) ? AppState.telemetry.airHumidity.toFixed(1) + '%' : '--';
      else if (activeMorphSensor === 'rain') detailVal.textContent = rn ? 'RAIN' : 'DRY';
      else if (activeMorphSensor === 'relay') detailVal.textContent = pmp ? 'MISTING' : 'IDLE';
      else if (activeMorphSensor === 'temperature') {
        const t = AppState.telemetry.airTemperature != null ? AppState.telemetry.airTemperature : AppState.telemetry.temperature;
        detailVal.textContent = (t != null && !isNaN(t)) ? t.toFixed(1) + ' \u00B0C' : '--';
      }
    }
  }

  const soilVal = document.getElementById('stat-soil-moisture');
  const soilBar = document.getElementById('pod-soil-bar');
  const podSoilDot = document.getElementById('pod-soil-dot');
  const podSoilGauge = document.getElementById('pod-soil-gauge');
  if (validSm !== null) {
    if (soilVal) soilVal.textContent = validSm.toFixed(1);
    if (soilBar) {
      soilBar.style.width = `${validSm}%`;
    }
    if (podSoilGauge) {
      podSoilGauge.style.strokeDashoffset = String(140 - (validSm / 100) * 140);
    }
    const activePlant = AppState.plants.find(p => p.id === AppState.activePlantId) || {};
    const minThreshold = activePlant.min != null ? activePlant.min : 50.0;
    let soilColor = '#10B981';
    let soilDotClass = 'pulse-dot ' + (AppState.hardwareConnected ? 'online' : 'offline');
    if (validSm < 25) {
      soilColor = '#A91B0D';
      soilDotClass = 'pulse-dot danger';
    } else if (validSm < minThreshold) {
      soilColor = '#FFDF80';
      soilDotClass = 'pulse-dot warning';
    }
    if (soilBar) soilBar.style.backgroundColor = soilColor;
    if (soilVal) soilVal.style.color = (validSm < 25) ? '#A91B0D' : ((validSm < minThreshold) ? '#FFDF80' : 'var(--text-main)');
    if (podSoilDot) {
      podSoilDot.className = soilDotClass;
      podSoilDot.style.background = '';
      podSoilDot.style.boxShadow = '';
    }
  } else {
    if (soilVal) {
      soilVal.textContent = '--';
      soilVal.style.color = 'var(--text-muted)';
    }
    if (soilBar) soilBar.style.width = '0%';
    if (podSoilDot) {
      podSoilDot.className = 'pulse-dot offline';
      podSoilDot.style.background = '';
      podSoilDot.style.boxShadow = '';
    }
  }

  const tankVal = document.getElementById('stat-tank-val');
  const waterTube = document.getElementById('pod-water-tube');
  const tankBar = document.getElementById('pod-tank-bar');
  const podTankDot = document.getElementById('pod-tank-dot');
  const podTankGauge = document.getElementById('pod-tank-gauge');
  if (validTk !== null) {
    if (tankVal) tankVal.textContent = Math.round(validTk);
    if (waterTube) waterTube.style.height = `${Math.round(validTk)}%`;
    if (tankBar) {
      tankBar.style.width = `${validTk}%`;
    }
    if (podTankGauge) {
      podTankGauge.style.strokeDashoffset = String(140 - (validTk / 100) * 140);
    }
    let tankColor = '#0284C7';
    let tankDotClass = 'pulse-dot ' + (AppState.hardwareConnected ? 'online' : 'offline');
    if (validTk <= 20) {
      tankColor = '#A91B0D';
      tankDotClass = 'pulse-dot danger';
    } else if (validTk <= 40) {
      tankColor = '#FFDF80';
      tankDotClass = 'pulse-dot warning';
    }
    if (tankBar) tankBar.style.backgroundColor = tankColor;
    if (tankVal) tankVal.style.color = (validTk <= 20) ? '#A91B0D' : ((validTk <= 40) ? '#FFDF80' : 'var(--text-main)');
    if (podTankDot) {
      podTankDot.className = tankDotClass;
      podTankDot.style.background = '';
      podTankDot.style.boxShadow = '';
    }
  } else {
    if (tankVal) {
      tankVal.textContent = '--';
      tankVal.style.color = 'var(--text-muted)';
    }
    if (waterTube) waterTube.style.height = '0%';
    if (tankBar) tankBar.style.width = '0%';
    if (podTankDot) {
      podTankDot.className = 'pulse-dot offline';
      podTankDot.style.background = '';
      podTankDot.style.boxShadow = '';
    }
  }

  const airHumEl = document.getElementById('stat-air-hum');
  const curHum = AppState.telemetry.airHumidity;
  const podRainDot = document.getElementById('pod-rain-dot');
  if (airHumEl) {
    airHumEl.textContent = Number.isFinite(curHum) ? curHum.toFixed(1) : '--';
    airHumEl.style.color = Number.isFinite(curHum) ? 'var(--text-main)' : 'var(--text-muted)';
  }
  const airHumBar = document.getElementById('pod-air-hum-bar');
  if (airHumBar) airHumBar.style.width = Number.isFinite(curHum) ? `${Math.max(0, Math.min(100, curHum))}%` : '0%';
  if (podRainDot) {
    podRainDot.className = 'pulse-dot ' + (AppState.hardwareConnected && Number.isFinite(curHum) ? 'online' : 'offline');
    podRainDot.style.background = '';
    podRainDot.style.boxShadow = '';
  }

  const isCriticalDryManual = (AppState.systemMode === 'MANUAL' && validSm !== null && validSm < 20 && AppState.hardwareConnected);
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.classList.toggle('critical-dry-ambient-alert', !!isCriticalDryManual);
  }

  if (isCriticalDryManual && !AppState.isPumpActive) {
    const now = Date.now();
    if (!AppState.lastManualDryAlertTime || (now - AppState.lastManualDryAlertTime > 45000)) {
      AppState.lastManualDryAlertTime = now;
      showToast('CRITICAL DRY WARNING: Soil moisture < 20% in MANUAL mode!', 'crimson');
      triggerBellNotification('CRITICAL DRY: Soil < 20% (Manual)');
    }
  }

  const rainVal = document.getElementById('stat-rain-state');
  const rainBadge = document.getElementById('pod-rain-badge');
  if (rainVal) {
    rainVal.textContent = rn ? 'RAIN' : 'DRY';
    rainVal.style.color = rn ? 'var(--accent-sky)' : 'var(--text-main)';
  }
  if (rainBadge) {
    rainBadge.textContent = rn ? 'RAIN LOCK' : 'CLEAR (DRY)';
    rainBadge.className = `badge-pill ${rn ? 'badge-cyan' : 'badge-emerald'}`;
  }

  const statPump = document.getElementById('stat-pump-state');
  const podPumpDot = document.getElementById('pod-pump-dot');
  const miniPump = document.getElementById('mini-square-pump');
  const miniPumpLabel = document.getElementById('mini-pump-status-label');
  const miniPumpSvg = document.getElementById('mini-pump-fan-svg');

  if (pmp) {
    if (statPump) {
      statPump.textContent = 'ACTIVE';
      statPump.style.color = 'var(--accent-emerald)';
    }
    if (podPumpDot) {
      podPumpDot.className = 'pulse-dot ' + (AppState.hardwareConnected ? 'online' : 'offline');
      podPumpDot.style.background = '';
      podPumpDot.style.boxShadow = '';
    }
    if (miniPump && miniPumpLabel) {
      miniPump.classList.add('pumping');
      miniPumpLabel.textContent = 'ACTIVE';
      miniPumpLabel.style.color = 'var(--accent-emerald)';
      if (miniPumpSvg) {
        miniPumpSvg.style.animation = 'spinLoader 1.2s linear infinite';
      }
    }
  } else {
    if (AppState.soakTimerId && AppState.soakRemainingSec > 0) {
      if (statPump) {
        statPump.textContent = 'IDLE';
        statPump.style.color = '#F59E0B';
      }
      if (miniPumpLabel) {
        miniPumpLabel.textContent = 'SOAK';
        miniPumpLabel.style.color = '#F59E0B';
      }
    } else {
      if (statPump) {
        statPump.textContent = 'IDLE';
        statPump.style.color = 'var(--text-main)';
      }
      if (miniPump && miniPumpLabel) {
        miniPump.classList.remove('pumping');
        miniPumpLabel.textContent = 'OFF';
        miniPumpLabel.style.color = 'var(--text-secondary)';
        if (miniPumpSvg) {
          miniPumpSvg.style.animation = 'none';
        }
      }
    }
    if (podPumpDot) {
      podPumpDot.className = 'pulse-dot ' + (AppState.hardwareConnected ? 'offline' : 'offline');
      podPumpDot.style.background = '';
      podPumpDot.style.boxShadow = '';
    }
  }

  const airTemp = document.getElementById('stat-air-temp');
  const airSubtext = document.getElementById('stat-air-subtext');
  const podClimateDot = document.getElementById('pod-climate-dot');
  const resolvedTemp = AppState.telemetry.airTemperature != null ? AppState.telemetry.airTemperature : AppState.telemetry.temperature;
  if (resolvedTemp != null && !isNaN(resolvedTemp)) {
    if (airTemp) {
      airTemp.textContent = resolvedTemp.toFixed(1);
      airTemp.style.color = 'var(--text-main)';
    }
    if (podClimateDot) {
      podClimateDot.className = 'pulse-dot ' + (AppState.hardwareConnected ? 'online' : 'offline');
      podClimateDot.style.background = '';
      podClimateDot.style.boxShadow = '';
    }
    if (airSubtext) airSubtext.textContent = '';
    const tempBar = document.getElementById('pod-temp-bar');
    if (tempBar) tempBar.style.width = `${Math.max(0, Math.min(100, resolvedTemp / 50 * 100))}%`;
  } else {
    if (airTemp) {
      airTemp.textContent = '--';
      airTemp.style.color = 'var(--text-muted)';
    }
    if (podClimateDot) {
      podClimateDot.className = 'pulse-dot offline';
      podClimateDot.style.background = '';
      podClimateDot.style.boxShadow = '';
    }
    if (airSubtext) airSubtext.textContent = '';
    const tempBar = document.getElementById('pod-temp-bar');
    if (tempBar) tempBar.style.width = '0%';
  }

  const miniMode = document.getElementById('mini-mode-status-label');
  if (miniMode) {
    miniMode.textContent = (AppState.systemMode === 'MANUAL') ? 'MANUAL' : 'AUTO';
  }

  const hwPumpState = document.getElementById('hw-pump-state');
  const hwPumpBadge = document.getElementById('hw-pump-badge');
  if (hwPumpState) {
    hwPumpState.textContent = pmp ? 'Energized (D8 HIGH)' : 'Standby';
    hwPumpState.style.color = pmp ? 'var(--accent-emerald)' : 'var(--text-secondary)';
  }
  if (hwPumpBadge) {
    hwPumpBadge.textContent = pmp ? 'Active' : 'Ready';
    hwPumpBadge.className = `badge-pill ${pmp ? 'badge-emerald' : 'badge-sky'}`;
  }

  const targetPlant = AppState.plants.find(p => p.id === AppState.activePlantId) || AppState.plants[0] || { min: 50.0, max: 65.0 };
  const hwSoilState = document.getElementById('hw-soil-state');
  const hwSoilBadge = document.getElementById('hw-soil-badge');
  if (hwSoilState) {
    const isOptimal = (sm >= targetPlant.min && sm <= targetPlant.max);
    const statusText = isOptimal ? 'Optimal' : (sm < targetPlant.min ? 'Low Moisture' : 'High Hydration');
    hwSoilState.textContent = `${sm.toFixed(1)}% (${statusText})`;
    hwSoilState.style.color = isOptimal ? 'var(--accent-emerald)' : 'var(--accent-amber)';
  }
  if (hwSoilBadge) {
    const isOptimal = (sm >= targetPlant.min && sm <= targetPlant.max);
    hwSoilBadge.textContent = isOptimal ? 'Optimal' : 'Alert';
    hwSoilBadge.className = `badge-pill ${isOptimal ? 'badge-emerald' : 'badge-amber'}`;
  }

  const hwRainState = document.getElementById('hw-rain-state');
  const hwRainBadge = document.getElementById('hw-rain-badge');
  if (hwRainState) {
    hwRainState.textContent = rn ? 'Rain Detected (Lockout)' : 'Clear (Dry)';
    hwRainState.style.color = rn ? 'var(--accent-cyan)' : 'var(--accent-emerald)';
  }
  if (hwRainBadge) {
    hwRainBadge.textContent = rn ? 'Rain Lock' : 'Armed';
    hwRainBadge.className = `badge-pill ${rn ? 'badge-cyan' : 'badge-emerald'}`;
  }

  const hwTankState = document.getElementById('hw-tank-state');
  const hwTankBadge = document.getElementById('hw-tank-badge');
  if (hwTankState) {
    hwTankState.textContent = `${Math.round(tk)}% (${tk > 20 ? 'Safe' : 'Low Warning'})`;
    hwTankState.style.color = tk > 20 ? 'var(--accent-emerald)' : 'var(--accent-crimson)';
  }
  if (hwTankBadge) {
    hwTankBadge.textContent = tk > 20 ? 'Normal' : 'Low';
    hwTankBadge.className = `badge-pill ${tk > 20 ? 'badge-emerald' : 'badge-crimson'}`;
  }

  recordRealTelemetrySample(sm, tk, pmp);
}

function recordRealTelemetrySample(soil, tank, pump) {
  if (!AppState.hardwareConnected) return;
  if (!Array.isArray(AppState.telemetrySamples)) AppState.telemetrySamples = [];
  const samples = AppState.telemetrySamples;
  const now = Date.now();
  const temperature = AppState.telemetry.airTemperature;
  const airHumidity = AppState.telemetry.airHumidity;
  const next = {
    ms: now,
    time: new Date(now).toLocaleTimeString('en-GB', {hour12: false}),
    soil, tank,
    temperature: Number.isFinite(temperature) ? temperature : null,
    airHumidity: Number.isFinite(airHumidity) ? airHumidity : null,
    pump: !!pump
  };
  if (samples.length && now - samples[samples.length - 1].ms < 1000) {
    samples[samples.length - 1] = next;
  } else {
    samples.push(next);
  }
  if (samples.length > 86400) samples.splice(0, samples.length - 86400);
  generateDynamicChartData(AppState.activeChartRange || '24h');
  drawTelemetryChart();
}

function syncTelemetryToBackend(sm, tk, rn, pmp) {

  if (!AppState.hardwareConnected) return;

  const now = Date.now();
  if (now - lastDbSyncTime < 3000) return;
  lastDbSyncTime = now;

  const ctx = window.contextPath || '';
  const t = AppState.telemetry || {};
  const airTemp = Number.isFinite(t.airTemperature) ? t.airTemperature : null;
  const airHum = Number.isFinite(t.airHumidity) ? t.airHumidity : null;

  const payload = {

    device_id: 1,
    humidity_pct: sm,
    soil: sm,
    water_pct: tk,
    water: tk,
    temperature_c: airTemp,
    water_ok: tk > 20 ? 1 : 0,
    is_raining: rn ? 1 : 0,
    pump_on: pmp ? 1 : 0,
    air_temp: airTemp,
    air_hum: airHum,
    sensor_ok: (sm != null && !isNaN(sm) && sm >= 0 && sm <= 100) ? 1 : 0,
    dht_ok: (airTemp != null && !isNaN(airTemp)) ? 1 : 0,
    reported_mode: AppState.systemMode,
    lock_reason: AppState.telemetry.lockReason || 'NONE',
    is_sample: AppState.isSimulated ? 1 : 0,

    deviceId: 1,
    humidityPct: sm,
    temperatureC: airTemp,
    waterOk: tk > 20,
    isRaining: rn,
    pumpOn: pmp,
    lockReason: AppState.telemetry.lockReason || 'NONE',
    reportedMode: AppState.systemMode
  };

  fetch(`${ctx}/api/sensor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

let remotePollTimer = null;
async function remotePollTelemetry() {

  if (AppState.hardwareConnected && !AppState.isSimulated && serialPort) return;
  try {
    const ctx = window.contextPath || '';
    const res = await fetch(`${ctx}/api/sensor?device_id=1&t=${Date.now()}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && (data.online || data.telemetry_live)) {
      const soil = data.soil_moisture != null ? data.soil_moisture : (data.soil != null ? data.soil : data.humidity_pct);
      const airHum = data.air_hum != null ? data.air_hum : data.air_humidity;
      const airTemp = data.air_temp;
      const waterPct = (data.water != null) ? data.water : data.water_pct;
      const relayOn = !!data.pump_on || !!data.relay_on;

      AppState.hardwareConnected = true;
      AppState.isSimulated = false;
      AppState.connectionType = 'SERVER_BRIDGE';
      if (data.mode) AppState.systemMode = data.mode.toUpperCase();
      if (airTemp != null) {
        AppState.telemetry.airTemperature = Number(airTemp);
        AppState.telemetry.temperature = Number(airTemp);
      }
      if (airHum != null) {
        AppState.telemetry.airHumidity = Number(airHum);
      }
      applyTelemetryUpdate(soil, waterPct, false, relayOn);
      updateHardwareConnectionUI(true, false, 'Server Telemetry Bridge', 'SERVER_BRIDGE');
    }
  } catch (e) {

  }
}
window.remotePollTelemetry = remotePollTelemetry;

function triggerHardwarePumpTest() {
  if (!AppState.hardwareConnected) {
    showToast('Action blocked: Please connect hardware or run Demo Simulation first', 'amber');
    return;
  }
  if (AppState.isPumpActive) {
    showToast('Pump relay is already energized!', 'info');
    return;
  }
  showToast('Executing 3-second hardware pulse test on Relay Pin D8...', 'info');
  handleStartPump();
  setTimeout(() => {
    handleStopPump('PULSE_TEST_COMPLETED');
    showToast('Hardware pulse test completed. Relay returned to Standby.', 'success');
  }, 3000);
}

function sampleSoilSensorProbe() {
  const current = AppState.telemetry.soilMoisture != null ? AppState.telemetry.soilMoisture : 54.0;
  const jitter = (Math.random() * 0.8 - 0.4);
  const sampled = Math.min(100, Math.max(10, Math.round((current + jitter) * 10) / 10));
  applyTelemetryUpdate(sampled, AppState.telemetry.tankLevel, AppState.telemetry.isRaining, AppState.isPumpActive);
  showToast(`Analog Probe Pin A0 sampled: ${sampled}% substrate hydration`, 'success');
}

function toggleRainSensorSimulation() {
  const newRain = !AppState.telemetry.isRaining;
  applyTelemetryUpdate(AppState.telemetry.soilMoisture, AppState.telemetry.tankLevel, newRain, AppState.isPumpActive);
  if (newRain && AppState.isPumpActive) {
    handleStopPump('RAIN_LOCKOUT_TRIGGERED');
    showToast('Precipitation detected! Auto rain safety lockout engaged: Pump stopped.', 'crimson');
  } else {
    showToast(newRain ? 'Precipitation active: Optical rain sensor locked out pump' : 'Weather cleared: Optical sensor back to normal standby', 'info');
  }
}

function refillReservoirTest() {
  applyTelemetryUpdate(AppState.telemetry.soilMoisture, 100, AppState.telemetry.isRaining, AppState.isPumpActive);
  showToast('Water reservoir refilled to 100% capacity', 'success');
}

function toggleLowWaterLockout() {
  const currentTank = AppState.telemetry.tankLevel;
  const newTank = currentTank <= 20 ? 82 : 15;
  applyTelemetryUpdate(AppState.telemetry.soilMoisture, newTank, AppState.telemetry.isRaining, AppState.isPumpActive);
  if (newTank <= 20 && AppState.isPumpActive) {
    handleStopPump('LOW_WATER_CUTOFF');
    showToast('Low water level (<20%)! Dry-run protection triggered: Pump stopped.', 'crimson');
  } else {
    showToast(newTank <= 20 ? 'Low water condition simulated (<20% float switch triggered)' : 'Reservoir restored to normal level (82%)', 'info');
  }
}

function disconnectHardware(silent) {
  if (silent === undefined) silent = false;
  if (!AppState.hardwareConnected && !serialPort) return Promise.resolve();

  if (serialPingTimer) {
    clearInterval(serialPingTimer);
    serialPingTimer = null;
  }

  if (AppState.isPumpActive) {
    handleStopPump('DISCONNECT_SAFETY_STOP');
  }

  pendingHandshakeResolve = null;
  serialKeepReading = false;

  const cancelPromise = serialReader ? serialReader.cancel().catch(function() {}) : Promise.resolve();
  serialReader = null;

  return cancelPromise.then(function() {
    const closePromise = serialPort ? serialPort.close().catch(function(e) {
      console.warn('serialPort.close warning:', e);
    }) : Promise.resolve();
    serialPort = null;
    return closePromise;
  }).then(function() {
    clearInterval(simulatedHardwareInterval);

    const wasSimulated = AppState.isSimulated;

    AppState.hardwareConnected = false;
    AppState.isSimulated = false;
    AppState.connectionType = 'NONE';
    updateHardwareConnectionUI(false, false, '', 'NONE');
    toggleTestBenchMode(false);

    if (wasSimulated) {
      AppState.history.pump = (AppState.history.pump || []).filter(function(p) { return !p.isDemo; });
      AppState.history.sensor = (AppState.history.sensor || []).filter(function(s) { return !s.isDemo; });
      AppState.history.audit = (AppState.history.audit || []).filter(function(a) { return !a.isDemo; });
      AppState.chartData = { timestamps: [], soil: [], tank: [] };
      renderHistoryTables();
    }

    resetTelemetryToStandby();

    const logEl = document.getElementById('hw-connect-status-log');
    if (logEl) {
      logEl.style.display = 'none';
      logEl.innerHTML = '';
    }
    const btn = document.getElementById('btn-confirm-connect');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Connect Hardware';
    }

    if (!silent) {
      if (!wasSimulated) {
        AppState.history.audit.unshift({
          time: formatNow(),
          action: 'HARDWARE_OFFLINE',
          detail: 'Hardware unlinked. Standby mode active.',
          user: window.CURRENT_USER_NAME || 'admin01',
          ip: '127.0.0.1',
          sev: 'WARNING',
          isDemo: false
        });
        renderHistoryTables();
      }
      showToast(wasSimulated ? 'Demo Stopped' : 'Hardware Disconnected', 'amber');
      triggerBellNotification(wasSimulated ? 'Demo Terminated' : 'Hardware Offline');
    }
  });
}

function toggleTestBenchMode(forceState) {
  const panel = document.getElementById('hw-test-bench-panel');
  const btn = document.getElementById('btn-toggle-test-bench');
  const label = document.getElementById('label-test-bench');
  if (!panel) return;

  const isCurrentlyVisible = panel.style.display !== 'none';
  const newState = (forceState !== undefined) ? forceState : !isCurrentlyVisible;
  panel.style.display = newState ? 'block' : 'none';

  if (btn) {
    if (newState) {
      btn.className = 'btn btn-amber';
      if (label) label.textContent = 'Test Bench Active';
    } else {
      btn.className = 'btn btn-glass';
      if (label) label.textContent = 'Test Bench Mode';
    }
  }

  if (newState) {
    showToast('Diagnostic & Simulation Test Bench active: Test controls unlocked', 'amber');
  }
}

function simulateLowSoilMoisture() {
  if (!AppState.hardwareConnected) {
    startSimulatedDemoMode();
  }
  AppState.telemetry.soilMoisture = 35.0;
  applyTelemetryUpdate(35.0, AppState.telemetry.tankLevel, false, AppState.isPumpActive);

  const podSoilBadge = document.getElementById('pod-soil-badge');
  const hwSoilState = document.getElementById('hw-soil-state');

  if (podSoilBadge) {
    podSoilBadge.textContent = 'LOW TRIGGER';
    podSoilBadge.className = 'badge-pill badge-crimson';
  }
  if (hwSoilState) hwSoilState.textContent = '35.0% (Low - Triggering Misting)';

  showToast('Simulated low soil moisture (35.0%). In AUTO mode, pump will engage.', 'amber');

  if (AppState.systemMode === 'AUTO' && !AppState.isPumpActive) {
    handleStartPump(false);
  }
}

function updateHardwareConnectionUI(connected, isSimulated = false, portName = '', connType = '') {
  const topbarStatus = document.getElementById('topbar-hw-status');
  const isBt = (connType === 'BT' || (portName && portName.includes('Bluetooth')));

  if (topbarStatus) {
    if (connected && !isSimulated) {
      const badgeClass = isBt ? 'badge-cyan' : 'badge-emerald';
      const dotStyle = isBt ? 'background: var(--accent-cyan); box-shadow: 0 0 8px var(--accent-cyan);' : '';
      const labelText = isBt ? 'Bluetooth HC-05 Online' : 'USB Serial Online';

      topbarStatus.innerHTML = `
        <div class="badge-pill ${badgeClass}">
          <span class="beacon-dot online" style="${dotStyle}"></span>
          <span>${labelText}</span>
        </div>
        <button class="btn btn-glass btn-sm" onclick="disconnectHardware()" title="Disconnect" style="padding: 4px 10px; font-size: 11.5px;">
          <svg viewBox="0 0 24 24" style="stroke: var(--accent-crimson); width: 14px; height: 14px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Disconnect
        </button>
      `;
    } else if (connected && isSimulated) {
      topbarStatus.innerHTML = `
        <div class="badge-pill badge-amber">
          <span class="beacon-dot online" style="background: var(--accent-amber); box-shadow: 0 0 8px var(--accent-amber);"></span>
          <span>Demo Mode (Simulated)</span>
        </div>
        <button class="btn btn-glass btn-sm" onclick="disconnectHardware()" title="Stop Demo" style="padding: 4px 10px; font-size: 11.5px;">
          <svg viewBox="0 0 24 24" style="stroke: var(--accent-crimson); width: 14px; height: 14px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Stop Demo
        </button>
      `;
    } else {
      topbarStatus.innerHTML = `
        <div class="badge-pill badge-crimson">
          <span class="beacon-dot offline"></span>
          <span>Offline</span>
        </div>
        <button class="btn btn-emerald btn-sm" onclick="openConnectModal()" style="padding: 4px 10px; font-size: 11.5px;">
          Connect
        </button>
      `;
    }
  }

  const offlineBanner = document.getElementById('hw-offline-banner');
  if (offlineBanner) {
    offlineBanner.style.display = connected ? 'none' : 'flex';
  }

  const ribbonBeacon = document.getElementById('ribbon-beacon');
  const ribbonStatus = document.getElementById('ribbon-status-badge');
  const ribbonHeartbeat = document.getElementById('ribbon-heartbeat');
  if (ribbonBeacon) ribbonBeacon.className = connected ? 'beacon-dot online' : 'beacon-dot offline';
  if (ribbonStatus) {
    if (connected && isSimulated) {
      ribbonStatus.textContent = 'Demo Active';
      ribbonStatus.className = 'badge-pill badge-amber';
    } else if (connected) {
      ribbonStatus.textContent = isBt ? 'Bluetooth Online' : 'USB Online';
      ribbonStatus.className = `badge-pill ${isBt ? 'badge-cyan' : 'badge-emerald'}`;
    } else {
      ribbonStatus.textContent = 'Disconnected';
      ribbonStatus.className = 'badge-pill badge-crimson';
    }
  }
  if (ribbonHeartbeat) {
    if (connected && isSimulated) {
      ribbonHeartbeat.textContent = 'Simulated Stream';
      ribbonHeartbeat.className = 'badge-pill badge-amber mono';
    } else if (connected) {
      ribbonHeartbeat.textContent = isBt ? 'Bluetooth SPP Link: 9600 bps' : 'USB Serial Link: 9600 bps';
      ribbonHeartbeat.className = `badge-pill ${isBt ? 'badge-cyan' : 'badge-emerald'} mono`;
    } else {
      ribbonHeartbeat.textContent = 'Awaiting Link';
      ribbonHeartbeat.className = 'badge-pill badge-amber mono';
    }
  }

  const capsuleBadge = document.getElementById('capsule-conn-badge');
  if (capsuleBadge) {
    if (connected && isSimulated) {
      capsuleBadge.className = 'badge-connected demo-sim';
      capsuleBadge.title = 'Demo Active';
      capsuleBadge.style.cursor = 'pointer';
      capsuleBadge.onclick = function() { disconnectHardware(); };
      capsuleBadge.innerHTML = '<span class="pulse-dot warning"></span><span>DEMO ACTIVE</span>';
    } else if (connected) {
      const label = isBt ? 'BLE ONLINE' : 'USB ONLINE';
      capsuleBadge.className = 'badge-connected';
      capsuleBadge.title = 'Hardware Connected';
      capsuleBadge.style.cursor = 'pointer';
      capsuleBadge.onclick = function() { disconnectHardware(); };
      capsuleBadge.innerHTML = `<span class="pulse-dot online"></span><span>${label}</span>`;
    } else {
      capsuleBadge.className = 'badge-connected offline';
      capsuleBadge.title = 'Offline';
      capsuleBadge.style.cursor = 'pointer';
      capsuleBadge.onclick = function() { if (typeof toggleHardwareDrawer === 'function') toggleHardwareDrawer(); };
      capsuleBadge.innerHTML = '<span class="pulse-dot offline"></span><span>OFFLINE</span>';
    }
  }

  const sbHwBeacon = document.getElementById('sidebar-hw-beacon');
  const sbHwStatus = document.getElementById('sidebar-hw-status');
  const sbHwMode = document.getElementById('sidebar-hw-mode');
  const sbHwLink = document.getElementById('sidebar-hw-link');

  if (sbHwBeacon) sbHwBeacon.className = connected ? 'beacon-dot online' : 'beacon-dot offline';
  if (sbHwStatus) {
    if (connected && isSimulated) {
      sbHwStatus.textContent = 'Demo Active';
      sbHwStatus.className = 'badge-pill badge-amber';
    } else if (connected) {
      sbHwStatus.textContent = 'Online';
      sbHwStatus.className = isBt ? 'badge-pill badge-cyan' : 'badge-pill badge-emerald';
    } else {
      sbHwStatus.textContent = 'Offline';
      sbHwStatus.className = 'badge-pill badge-crimson';
    }
  }
  if (sbHwMode) {
    sbHwMode.textContent = `Mode: ${AppState.systemMode || 'AUTO'}`;
    sbHwMode.className = `badge-pill ${AppState.systemMode === 'MANUAL' ? 'badge-amber' : 'badge-emerald'}`;
  }
  if (sbHwLink) {
    if (connected && isSimulated) {
      sbHwLink.textContent = 'Sim Stream';
      sbHwLink.className = 'badge-pill badge-amber mono';
    } else if (connected) {
      sbHwLink.textContent = isBt ? 'BT 9600 bps' : 'USB 9600 bps';
      sbHwLink.className = `badge-pill ${isBt ? 'badge-cyan' : 'badge-emerald'} mono`;
    } else {
      sbHwLink.textContent = 'Awaiting Link';
      sbHwLink.className = 'badge-pill badge-amber mono';
    }
  }

  const btnStart = document.getElementById('btn-manual-pump-start');
  const btnStop = document.getElementById('btn-manual-pump-stop');
  const btnBoost = document.getElementById('btn-manual-pump-boost');
  const btnCollapsedStart = document.getElementById('btn-collapsed-start');
  const btnCollapsedStop = document.getElementById('btn-collapsed-stop');
  const sliderDuration = document.getElementById('slider-spray-duration');
  const inputDuration = document.getElementById('input-spray-seconds');
  const btnSaveDuration = document.getElementById('btn-save-duration');
  const btnSwitchAuto = document.getElementById('btn-switch-auto');
  const btnSwitchManual = document.getElementById('btn-switch-manual');
  const manualAck = document.getElementById('manual-ack-feedback');

  const elementsToToggle = [
    btnStop, btnCollapsedStop
  ];

  elementsToToggle.forEach(el => {
    if (el) el.disabled = !connected && !AppState.isPumpActive;
  });
  if (btnStart) btnStart.disabled = false;
  if (btnBoost) btnBoost.disabled = false;
  if (btnCollapsedStart) btnCollapsedStart.disabled = false;
  if (sliderDuration) sliderDuration.disabled = false;
  if (inputDuration) inputDuration.disabled = false;
  if (btnSaveDuration) btnSaveDuration.disabled = false;
  if (btnSwitchAuto) btnSwitchAuto.disabled = false;
  if (btnSwitchManual) btnSwitchManual.disabled = false;

  if (manualAck) {
    manualAck.textContent = connected ? 'System Ready | Relay Armed' : 'System Standby | Disconnected';
  }

  const sidebarBtn = document.getElementById('sidebar-connect-btn');
  const sidebarDot = document.getElementById('sidebar-connect-dot');
  const sidebarTxt = document.getElementById('sidebar-connect-text');
  const sidebarIcon = document.getElementById('sidebar-hw-btn-icon');
  if (sidebarBtn) {
    if (connected) {
      sidebarBtn.className = 'sidebar-connect-pill connected';
      sidebarBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      sidebarBtn.style.background = 'rgba(16, 185, 129, 0.12)';
      sidebarBtn.style.color = '#10B981';
      if (sidebarDot) {
        sidebarDot.className = 'beacon-dot online';
        sidebarDot.style.background = '#10B981';
      }
      if (sidebarTxt) {
        sidebarTxt.textContent = 'DISCONNECT';
      }
    } else {
      sidebarBtn.className = 'sidebar-connect-pill disconnected';
      sidebarBtn.style.borderColor = 'rgba(169, 27, 13, 0.4)';
      sidebarBtn.style.background = 'rgba(169, 27, 13, 0.12)';
      sidebarBtn.style.color = '#A91B0D';
      if (sidebarDot) {
        sidebarDot.className = 'beacon-dot offline';
        sidebarDot.style.background = '#A91B0D';
      }
      if (sidebarTxt) {
        sidebarTxt.textContent = 'CONNECT';
      }
    }
    if (sidebarIcon) {
      sidebarIcon.innerHTML = '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>';
    }
  }

  updateHardwareHealthTab(connected, isSimulated, portName, connType);
  drawTelemetryChart();
}

function updateHardwareHealthTab(connected, isSimulated = false, portName = '', connType = '') {
  const mcuBanner = document.getElementById('hw-mcu-banner');
  const devIconBox = document.getElementById('hw-dev-icon-box');
  const devName = document.getElementById('hw-dev-name');
  const devIf = document.getElementById('hw-dev-interface');
  const devBadge = document.getElementById('hw-dev-badge');
  const btnDisconnect = document.getElementById('btn-hw-disconnect');
  const hwActionBtn = document.getElementById('hw-action-btn');
  const isBt = (connType === 'BT' || (portName && portName.includes('Bluetooth')));

  if (btnDisconnect) {
    btnDisconnect.style.display = connected ? 'inline-flex' : 'none';
  }

  if (mcuBanner) {
    mcuBanner.style.borderLeftColor = connected ? (isSimulated ? 'var(--accent-amber)' : (isBt ? 'var(--accent-cyan)' : 'var(--accent-emerald)')) : 'var(--accent-crimson)';
  }

  if (devIconBox) {
    devIconBox.style.background = connected ? (isSimulated ? 'rgba(245, 158, 11, 0.16)' : (isBt ? 'rgba(56, 189, 248, 0.16)' : 'rgba(16, 185, 129, 0.16)')) : 'rgba(239, 68, 68, 0.16)';
    devIconBox.style.color = connected ? (isSimulated ? 'var(--accent-amber)' : (isBt ? 'var(--accent-cyan)' : 'var(--accent-emerald)')) : 'var(--accent-crimson)';
  }

  if (devName) {
    devName.textContent = 'Arduino Uno R3 Controller (Hub 01)';
  }

  if (devIf) {
    if (connected) {
      if (isSimulated) {
        devIf.textContent = 'Simulation Stream Active | Virtual Serial Loopback | 9600 Baud';
      } else if (isBt) {
        devIf.textContent = 'Wireless SPP Active | Bluetooth HC-05 Transceiver | 9600 Baud (8-N-1)';
      } else {
        devIf.textContent = 'Hardware Serial Active | USB Cable (CH340/Uno) | 9600 Baud (8-N-1)';
      }
    } else {
      devIf.textContent = 'Hardware Disconnected | Standby';
    }
  }

  if (devBadge) {
    if (connected) {
      if (isSimulated) {
        devBadge.className = 'badge-pill badge-amber';
        devBadge.innerHTML = '<span class="beacon-dot online" style="background: var(--accent-amber); box-shadow: 0 0 8px var(--accent-amber);"></span> DEMO STREAM | ACTIVE';
      } else if (isBt) {
        devBadge.className = 'badge-pill badge-cyan';
        devBadge.innerHTML = '<span class="beacon-dot online" style="background: var(--accent-cyan); box-shadow: 0 0 8px var(--accent-cyan);"></span> BLUETOOTH HC-05 LINK | 100% HEALTH';
      } else {
        devBadge.className = 'badge-pill badge-emerald';
        devBadge.innerHTML = '<span class="beacon-dot online"></span> USB SERIAL LINK | 100% HEALTH';
      }
    } else {
      devBadge.className = 'badge-pill badge-crimson';
      devBadge.innerHTML = '<span class="beacon-dot offline"></span> STANDBY | AWAITING LINK';
    }
  }

  if (hwActionBtn) {
    hwActionBtn.innerHTML = connected ? `
      <button class="btn btn-glass btn-sm" onclick="disconnectHardware()" style="border-color: var(--accent-crimson); color: var(--accent-crimson);">
        <svg viewBox="0 0 24 24" style="stroke: currentColor; fill: none; width: 14px; height: 14px; stroke-width: 2;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        Disconnect
      </button>
    ` : `
      <button class="btn btn-emerald" onclick="openConnectModal()">
        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        Connect
      </button>
    `;
  }
}

function updatePumpCountdownUI(state, remSec) {
  const pCount = document.getElementById('stat-pump-countdown');
  const miniLabel = document.getElementById('mini-pump-status-label');
  const miniCount = document.getElementById('mini-pump-countdown');
  const startLabel = document.getElementById('label-pump-start');

  if (state === 'SPRAY') {
    if (pCount) {
      pCount.style.display = 'inline-flex';
      pCount.className = 'mono pump-countdown-badge';
      pCount.textContent = remSec + 's';
      pCount.title = 'Remaining spray time: ' + remSec + 's';
    }
    if (miniLabel) {
      miniLabel.textContent = 'ON';
      miniLabel.style.color = 'var(--accent-emerald)';
    }
    if (miniCount) {
      miniCount.style.display = 'block';
      miniCount.className = 'mini-square-countdown mono';
      miniCount.textContent = remSec + 's';
    }
    if (startLabel) {
      startLabel.textContent = 'RUNNING (' + remSec + 's)';
    }
  } else if (state === 'SOAK') {
    if (pCount) {
      pCount.style.display = 'inline-flex';
      pCount.className = 'mono pump-countdown-badge soak-cooldown';
      pCount.textContent = 'Soak: ' + remSec + 's';
      pCount.title = 'Soil water absorption cooldown: ' + remSec + 's';
    }
    if (miniLabel) {
      miniLabel.textContent = 'SOAK';
      miniLabel.style.color = '#F59E0B';
    }
    if (miniCount) {
      miniCount.style.display = 'block';
      miniCount.className = 'mini-square-countdown mono soak';
      miniCount.textContent = remSec + 's';
    }
  } else {
    if (pCount) {
      pCount.style.display = 'none';
      pCount.textContent = '';
    }
    if (miniCount) {
      miniCount.style.display = 'none';
      miniCount.textContent = '';
    }
    if (miniLabel) {
      miniLabel.textContent = 'OFF';
      miniLabel.style.color = 'var(--text-secondary)';
    }
    if (startLabel) {
      startLabel.textContent = 'Start Pump';
    }
  }
}

function clearPumpCountdownUI() {
  if (AppState.soakTimerId) {
    clearInterval(AppState.soakTimerId);
    AppState.soakTimerId = null;
  }
  AppState.soakRemainingSec = 0;
  updatePumpCountdownUI('CLEAR', 0);
  const pState = document.getElementById('stat-pump-state');
  if (pState && !AppState.isPumpActive) {
    pState.textContent = 'OFF';
    pState.style.color = 'var(--text-muted)';
  }
}
window.clearPumpCountdownUI = clearPumpCountdownUI;

function startSoakCooldown(cooldownSec) {
  if (AppState.soakTimerId) {
    clearInterval(AppState.soakTimerId);
    AppState.soakTimerId = null;
  }
  const total = parseInt(cooldownSec, 10) || 45;
  AppState.soakRemainingSec = total;

  const pState = document.getElementById('stat-pump-state');
  if (pState) {
    pState.textContent = 'OFF';
    pState.style.color = '#F59E0B';
  }

  updatePumpCountdownUI('SOAK', AppState.soakRemainingSec);

  AppState.soakTimerId = setInterval(function() {
    AppState.soakRemainingSec--;
    if (AppState.soakRemainingSec > 0) {
      updatePumpCountdownUI('SOAK', AppState.soakRemainingSec);
    } else {
      clearInterval(AppState.soakTimerId);
      AppState.soakTimerId = null;
      AppState.soakRemainingSec = 0;
      clearPumpCountdownUI();
      showToast('Cycle-and-Soak cooldown complete: Soil ready', 'info');
    }
  }, 1000);
}
window.startSoakCooldown = startSoakCooldown;

function handleStartPump(isOperatorAction) {
  if (isOperatorAction === undefined) isOperatorAction = true;
  if (!AppState.hardwareConnected) {
    if (AppState.isSimulated || (typeof isDemoMode !== 'undefined' && isDemoMode)) {

      executeStartPumpInternal(isOperatorAction);
      return;
    }
    showToast('Offline: Link hardware device via USB or Bluetooth to actuate pump', 'amber');
    if (typeof openConnectModal === 'function') openConnectModal();
    return;
  }
  if (AppState.isPumpActive) return;

  if (AppState.telemetry.tankLevel != null && AppState.telemetry.tankLevel < 20) {
    showToast('Low Water (<20%): Pump Blocked', 'crimson');
    triggerBellNotification('Water Critical: Pump Blocked');
    return;
  }

  if (AppState.telemetry.isRaining) {
    showToast('Rain Detected: Pump Blocked', 'sky');
    triggerBellNotification('Rain Detected: Pump Blocked');
    return;
  }

  if (AppState.telemetry.airTemperature != null && AppState.telemetry.airTemperature < 18.0) {
    showToast('Thermal Cutoff: Temp < 18.0°C (Cold Shock Protection). Pump Blocked.', 'crimson');
    triggerBellNotification('Thermal Lockout: Temp < 18°C');
    return;
  }

  if (AppState.telemetry.soilMoisture != null && AppState.telemetry.soilMoisture > 65.0) {
    showToast('Hydration Cutoff: Soil moisture > 65% (Root Rot Protection). Pump Blocked.', 'crimson');
    triggerBellNotification('Hydration Lockout: Soil > 65%');
    return;
  }

  if (AppState.hardwareConnected && !AppState.isSimulated && (AppState.telemetry.airTemperature == null || AppState.telemetry.airHumidity == null)) {
    showToast('Diagnostic Fault: DHT11 offline or invalid. Pump Blocked.', 'crimson');
    triggerBellNotification('Diagnostic Lockout: DHT11 Offline');
    return;
  }

  if (isOperatorAction && AppState.systemMode === 'AUTO') {
    confirmSwitchToManual(function() {
      executeStartPumpInternal(isOperatorAction);
    }, 'Manual Pump Start');
    return;
  }

  executeStartPumpInternal(isOperatorAction);
}

function executeStartPumpInternal(isOperatorAction) {
  if (isOperatorAction && AppState.systemMode === 'AUTO') {
    quickSwitchMode('MANUAL');
  }

  const btn = document.getElementById('btn-manual-pump-start');
  const label = document.getElementById('label-pump-start');
  const icon = document.getElementById('icon-pump-start');
  const ackStatus = document.getElementById('manual-ack-feedback');

  if (btn) btn.disabled = true;
  if (icon) {
    icon.innerHTML = '<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>';
    icon.classList.add('spin-icon');
  }
  if (label) label.textContent = 'ACTUATING...';

  const settingMaxRunEl = document.getElementById('setting-max-run');
  const maxRun = parseInt(settingMaxRunEl ? settingMaxRunEl.value : '15', 10) || 15;

  setTimeout(function() {
    if (AppState.soakTimerId) {
      clearInterval(AppState.soakTimerId);
      AppState.soakTimerId = null;
      AppState.soakRemainingSec = 0;
    }

    AppState.isPumpActive = true;
    AppState.pumpElapsedSec = 0;

    if (window.Garden3D && typeof window.Garden3D.triggerSpray === 'function') {
      window.Garden3D.triggerSpray(true);
    }

    if (btn) btn.disabled = false;
    if (icon) {
      icon.classList.remove('spin-icon');
      icon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    }
    if (label) label.textContent = 'RUNNING (' + maxRun + 's)';
    if (ackStatus) ackStatus.textContent = 'Relay D8 HIGH | ' + maxRun + 's Watchdog';

    const pState = document.getElementById('stat-pump-state');
    const pBadge = document.getElementById('pod-pump-badge');
    const pSubtext = document.getElementById('stat-pump-subtext');
    if (pState) { pState.textContent = 'ON'; pState.style.color = 'var(--accent-emerald)'; }
    if (pBadge) { pBadge.textContent = 'ACTIVE'; pBadge.className = 'badge-pill badge-emerald'; }
    if (pSubtext) pSubtext.textContent = 'Spraying Active';

    const colStart = document.getElementById('btn-collapsed-start');
    const colStop = document.getElementById('btn-collapsed-stop');
    if (colStart) colStart.classList.add('active');
    if (colStop) colStop.classList.remove('active');

    const turbine = document.getElementById('turbine-fan-svg');
    const miniFan = document.getElementById('mini-pump-fan-svg');
    const pumpBox = document.getElementById('pump-icon-container');
    const miniSquare = document.getElementById('mini-square-pump');
    if (turbine) turbine.classList.add('spinning');
    if (miniFan) miniFan.style.animation = 'spinLoader 1.2s linear infinite';
    if (miniSquare) miniSquare.classList.add('pumping');
    if (pumpBox) {
      pumpBox.style.background = 'rgba(16, 185, 129, 0.2)';
      pumpBox.style.color = 'var(--accent-emerald)';
    }

    updatePumpCountdownUI('SPRAY', maxRun);

    showToast('Pump Started', 'success');
    broadcastIotEvent('PUMP_STATE', { isActive: true });

    sendRawSerialCommand('PUMP_ON');

    if (!AppState.isSimulated) {
      const ctx = window.contextPath || '';
      fetch(ctx + '/control?action=start_pump&device_id=1', { method: 'POST' }).catch(function() {});
    }

    AppState.history.pump.unshift({
      time: formatNow(),
      mode: AppState.systemMode,
      cmd: 'START PUMP',
      actor: AppState.isSimulated ? 'DEMO SIMULATOR' : (window.CURRENT_USER_NAME || 'admin01'),
      dur: 'Active',
      tank: AppState.telemetry.tankLevel != null ? Math.round(AppState.telemetry.tankLevel) + '%' : 'NORMAL',
      ack: 'ACK_CONFIRMED',
      isDemo: AppState.isSimulated
    });
    renderHistoryTables();

    clearInterval(AppState.pumpTimerId);
    AppState.pumpTimerId = setInterval(function() {
      AppState.pumpElapsedSec++;
      const remaining = Math.max(0, maxRun - AppState.pumpElapsedSec);
      updatePumpCountdownUI('SPRAY', remaining);

      const pTimer = document.getElementById('stat-pump-timer');
      if (pTimer) pTimer.textContent = 'Elapsed: ' + AppState.pumpElapsedSec + 's / ' + maxRun + 's Max';

      if (AppState.pumpElapsedSec >= maxRun) {
        handleStopPump('WATCHDOG_' + maxRun + 'S_CUTOFF');
      }
    }, 1000);
  }, 400);
}

function handleStopPump(reason) {
  if (reason === undefined) reason = 'OPERATOR_STOP';

  if (reason === 'OPERATOR_STOP' && AppState.systemMode === 'AUTO') {
    confirmSwitchToManual(function() {
      executeStopPumpInternal(reason);
    }, 'Manual Pump Stop');
    return;
  }

  executeStopPumpInternal(reason);
}

function executeStopPumpInternal(reason) {
  if (reason === 'OPERATOR_STOP' && AppState.systemMode === 'AUTO') {
    quickSwitchMode('MANUAL');
    showToast('Manual Halt: Mode switched to MANUAL (Auto paused)', 'amber');
    triggerBellNotification('Operator Stop: Mode switched to MANUAL');
  }

  if (!AppState.isPumpActive) {
    clearPumpCountdownUI();
    return;
  }

  AppState.isPumpActive = false;
  clearInterval(AppState.pumpTimerId);

  if (typeof stopQuickSpray === 'function' && quickSprayInterval) {
    stopQuickSpray();
  }
  if (window.Garden3D && typeof window.Garden3D.triggerSpray === 'function') {
    window.Garden3D.triggerSpray(false);
  }

  const btn = document.getElementById('btn-manual-pump-start');
  const label = document.getElementById('label-pump-start');
  const icon = document.getElementById('icon-pump-start');
  const ackStatus = document.getElementById('manual-ack-feedback');

  if (btn) btn.disabled = false;
  if (icon) {
    icon.classList.remove('spin-icon');
    icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  }
  if (label) label.textContent = 'Start Pump';
  if (ackStatus) ackStatus.textContent = reason.indexOf('WATCHDOG') !== -1 ? 'Watchdog Cutoff' : (AppState.hardwareConnected ? 'System Standby' : 'Hardware Disconnected');

  const pBadge = document.getElementById('pod-pump-badge');
  const pSubtext = document.getElementById('stat-pump-subtext');
  const pTimer = document.getElementById('stat-pump-timer');
  if (pBadge) { pBadge.textContent = 'IDLE'; pBadge.className = 'badge-pill badge-crimson'; }
  if (pSubtext) pSubtext.textContent = 'Pump Idle';
  if (pTimer) pTimer.textContent = 'Max run limit: 15s';

  const colStart = document.getElementById('btn-collapsed-start');
  const colStop = document.getElementById('btn-collapsed-stop');
  if (colStart) colStart.classList.remove('active');
  if (colStop) colStop.classList.remove('active');

  const turbine = document.getElementById('turbine-fan-svg');
  const miniFan = document.getElementById('mini-pump-fan-svg');
  const pumpBox = document.getElementById('pump-icon-container');
  const miniSquare = document.getElementById('mini-square-pump');
  if (turbine) turbine.classList.remove('spinning');
  if (miniFan) miniFan.style.animation = 'none';
  if (miniSquare) miniSquare.classList.remove('pumping');
  if (pumpBox) {
    pumpBox.style.background = 'rgba(59, 130, 246, 0.16)';
    pumpBox.style.color = 'var(--accent-blue)';
  }

  sendRawSerialCommand('PUMP_OFF');
  broadcastIotEvent('PUMP_STATE', { isActive: false, reason: reason });

  if (!AppState.isSimulated) {
    const ctx = window.contextPath || '';
    fetch(ctx + '/control?action=stop_pump&device_id=1', { method: 'POST' }).catch(function() {});
  }

  AppState.history.pump.unshift({
    time: formatNow(),
    mode: AppState.systemMode,
    cmd: 'STOP PUMP',
    actor: AppState.isSimulated ? 'DEMO SIMULATOR' : (window.CURRENT_USER_NAME || 'admin01'),
    dur: AppState.pumpElapsedSec + 's',
    tank: AppState.telemetry.tankLevel != null ? Math.round(AppState.telemetry.tankLevel) + '%' : 'NORMAL',
    ack: 'ACK_CONFIRMED',
    isDemo: AppState.isSimulated
  });
  renderHistoryTables();
  showToast(reason.indexOf('WATCHDOG') !== -1 ? 'Watchdog Cutoff' : 'Pump Stopped', 'info');

  const humOnEl = document.getElementById('setting-hum-on');
  const humOn = parseFloat(humOnEl ? humOnEl.value : '50') || 50.0;
  const cooldownEl = document.getElementById('setting-cooldown');
  const cooldownSec = parseInt(cooldownEl ? cooldownEl.value : '45', 10) || 45;
  const currentSoil = AppState.telemetry.soilMoisture;

  const shouldSoak = (
    AppState.systemMode === 'AUTO' &&
    reason.indexOf('WATCHDOG') !== -1 &&
    currentSoil != null &&
    currentSoil < humOn &&
    (!AppState.telemetry.tankLevel || AppState.telemetry.tankLevel > 20) &&
    !AppState.telemetry.isRaining
  );

  if (shouldSoak) {
    startSoakCooldown(cooldownSec);
  } else {
    clearPumpCountdownUI();
  }
}

function onDurationSliderChange(val) {
  const num = parseInt(val, 10) || 15;
  const inputEl = document.getElementById('input-spray-seconds');
  const labelEl = document.getElementById('label-active-duration');
  const settingEl = document.getElementById('setting-max-run');
  if (inputEl) inputEl.value = num;
  if (labelEl) labelEl.textContent = `${num}s`;
  if (settingEl) settingEl.value = num;
}
window.onDurationSliderChange = onDurationSliderChange;

function onDurationInputChange(val) {
  const num = Math.max(1, Math.min(600, parseInt(val, 10) || 15));
  const sliderEl = document.getElementById('slider-spray-duration');
  const labelEl = document.getElementById('label-active-duration');
  const settingEl = document.getElementById('setting-max-run');
  if (sliderEl) sliderEl.value = Math.min(180, num);
  if (labelEl) labelEl.textContent = `${num}s`;
  if (settingEl) settingEl.value = num;
}
window.onDurationInputChange = onDurationInputChange;

function saveDurationSetting() {
  const inputEl = document.getElementById('input-spray-seconds');
  const sec = parseInt(inputEl ? inputEl.value : '15', 10) || 15;

  const settingEl = document.getElementById('setting-max-run');
  if (settingEl) settingEl.value = sec;

  const labelEl = document.getElementById('label-active-duration');
  if (labelEl) labelEl.textContent = `${sec}s`;

  const sumMax = document.getElementById('sum-max-val');
  if (sumMax) sumMax.textContent = `${sec}s / cycle`;

  if (AppState.hardwareConnected && !AppState.isSimulated) {
    sendRawSerialCommand(`DUR:${sec}`);
  }

  const ctx = window.contextPath || '';
  const params = new URLSearchParams();
  params.append('device_id', '1');
  params.append('max_run_sec', sec);
  const humOnEl = document.getElementById('setting-hum-on');
  const humOffEl = document.getElementById('setting-hum-off');
  const cooldownEl = document.getElementById('setting-cooldown');
  params.append('humidity_on', humOnEl ? humOnEl.value : '50');
  params.append('humidity_off', humOffEl ? humOffEl.value : '65');
  params.append('cooldown_sec', cooldownEl ? cooldownEl.value : '45');
  params.append('desired_mode', AppState.systemMode);

  fetch(`${ctx}/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  }).catch(() => {});

  const feedback = document.getElementById('save-duration-feedback');
  if (feedback) {
    feedback.style.display = 'inline-flex';
    setTimeout(() => { feedback.style.display = 'none'; }, 1800);
  }

  showToast(`Duration: ${sec}s`, 'success');
  triggerBellNotification(`Duration: ${sec}s`);
}
window.saveDurationSetting = saveDurationSetting;

function quickBoostSpray(sec) {
  if (sec === undefined) sec = 15;
  if (!AppState.hardwareConnected) {
    if (AppState.isSimulated || (typeof isDemoMode !== 'undefined' && isDemoMode)) {

    } else {
      showToast('Offline: Link hardware device via USB or Bluetooth to actuate pump', 'amber');
      if (typeof openConnectModal === 'function') openConnectModal();
      return;
    }
  }
  if (AppState.systemMode === 'AUTO') {
    confirmSwitchToManual(function() {
      const inputEl = document.getElementById('input-spray-seconds');
      const sliderEl = document.getElementById('slider-spray-duration');
      if (inputEl) inputEl.value = sec;
      if (sliderEl) sliderEl.value = sec;

      handleStartPump(true);
      showToast('15s Boost Started', 'warning');
      triggerBellNotification('15s Boost Active');
    }, '15-second boost spray');
    return;
  }

  const inputEl = document.getElementById('input-spray-seconds');
  const sliderEl = document.getElementById('slider-spray-duration');
  if (inputEl) inputEl.value = sec;
  if (sliderEl) sliderEl.value = sec;

  handleStartPump(true);
  showToast('15s Boost Started', 'warning');
  triggerBellNotification('15s Boost Active');
}
window.quickBoostSpray = quickBoostSpray;

function updateLiveLogTable(timestamps, soil, tank, temps, airHum, pumps) {
  const tbody = document.getElementById('telemetry-records-tbody');
  const countBadge = document.getElementById('history-record-count');
  if (!tbody) return;
  const count = Math.min(8, timestamps.length);
  if (countBadge) countBadge.textContent = `${count} LOGS`;
  if (!count) {
    tbody.innerHTML = '<tr><td colspan="6" class="mono" style="text-align:center;padding:18px;color:var(--text-muted)">No sensor readings received</td></tr>';
    return;
  }
  const fmt = (v, unit) => Number.isFinite(v) ? v.toFixed(1) + unit : '--';
  tbody.innerHTML = timestamps.slice(-count).map((time, j) => {
    const i = timestamps.length - count + j;
    const pump = pumps[i] ? 'ON' : 'OFF';
    return `<tr>
      <td class="mono">${time}</td>
      <td class="mono text-emerald">${fmt(soil[i], '%')}</td>
      <td class="mono text-cyan">${fmt(tank[i], '%')}</td>
      <td class="mono" style="color:#8b5cf6">${fmt(airHum[i], '%')}</td>
      <td class="mono text-amber">${fmt(temps[i], '\u00B0C')}</td>
      <td><span class="badge-pill badge-glass">${pump}</span></td>
    </tr>`;
  }).reverse().join('');
}

function generateDynamicChartData(range = '24h') {
  AppState.activeChartRange = range;
  const ms = { '1h': 3600000, '6h': 21600000, '24h': 86400000 }[range] || 86400000;
  const cutoff = Date.now() - ms;
  const samples = (Array.isArray(AppState.telemetrySamples) ? AppState.telemetrySamples : [])
    .filter(s => s.ms >= cutoff);

  const stride = Math.max(1, Math.ceil(samples.length / 150));
  const picked = samples.filter((sample, i) => i % stride === 0 || i === samples.length - 1);
  const timestamps = picked.map(s => s.time);
  const soil = picked.map(s => s.soil);
  const tank = picked.map(s => s.tank);
  const temps = picked.map(s => s.temperature);
  const airHum = picked.map(s => s.airHumidity);
  const pumps = picked.map(s => s.pump);
  AppState.chartData = { timestamps, soil, tank, temps, airHum, pumps };
  updateLiveLogTable(timestamps, soil, tank, temps, airHum, pumps);
}

function setupChartInteraction() {
  const canvas = document.getElementById('canvasTelemetry');
  if (!canvas || canvas._hasInteractiveListeners) return;
  canvas._hasInteractiveListeners = true;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const padLeft = 44;
    const padRight = 24;
    const count = (AppState.chartData && AppState.chartData.timestamps) ? AppState.chartData.timestamps.length : 0;

    if (count > 1 && x >= padLeft && x <= w - padRight) {
      const availableWidth = w - padLeft - padRight;
      const stepX = availableWidth / (count - 1);
      const rawIdx = Math.round((x - padLeft) / stepX);
      chartHoverIndex = Math.max(0, Math.min(count - 1, rawIdx));
    } else {
      chartHoverIndex = -1;
    }
    drawTelemetryChart();
  });

  canvas.addEventListener('mouseleave', () => {
    if (chartHoverIndex !== -1) {
      chartHoverIndex = -1;
      drawTelemetryChart();
    }
  });
}

function initTelemetryChart() {
  chartCanvas = document.getElementById('canvasTelemetry');
  if (!chartCanvas) return;
  chartCtx = chartCanvas.getContext('2d');
  window.addEventListener('resize', drawTelemetryChart);
  setupChartInteraction();
  generateDynamicChartData(AppState.activeChartRange || '24h');
  drawTelemetryChart();
}

function setChartRange(range, btn) {
  document.querySelectorAll('#view-dashboard button[data-range], #view-dashboard button[onclick^="setChartRange"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  AppState.activeChartRange = range;
  generateDynamicChartData(range);
  drawTelemetryChart();
  showToast(`Timeline Horizon: ${range.toUpperCase()}`, 'info');
}

function drawCatmullRomSpline(ctx, points, tension = 0.28, minY = -Infinity, maxY = Infinity) {
  if (!points || points.length === 0) return;
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return;
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    if (minY !== -Infinity) {
      cp1y = Math.max(minY, Math.min(maxY, cp1y));
      cp2y = Math.max(minY, Math.min(maxY, cp2y));
    }

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function drawTelemetryChart() {
  if (!chartCanvas || !chartCtx) return;
  const rect = chartCanvas.parentElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  chartCanvas.width = rect.width * dpr;
  chartCanvas.height = rect.height * dpr;
  chartCtx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 26;

  chartCtx.clearRect(0, 0, w, h);

  const isDark = AppState.theme === 'dark';

  chartCtx.lineWidth = 1;
  chartCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';
  chartCtx.textAlign = 'right';
  chartCtx.fillStyle = isDark ? '#64748B' : '#94A3B8';
  chartCtx.font = '9.5px "JetBrains Mono", monospace';

  const yTicks = [0, 25, 50, 75, 100];
  yTicks.forEach(val => {
    const y = h - padBottom - (val / 100) * (h - padTop - padBottom);
    chartCtx.beginPath();
    chartCtx.moveTo(padLeft, y);
    chartCtx.lineTo(w - padRight, y);
    chartCtx.stroke();
    chartCtx.fillText(val + '%', padLeft - 6, y + 3.5);
  });

  if (!AppState.hardwareConnected || !AppState.chartData || !AppState.chartData.timestamps || AppState.chartData.timestamps.length === 0) {
    const standby = document.getElementById('telemetry-standby-badge');
    if (standby) standby.style.display = 'inline-flex';
    const text = document.getElementById('telemetry-standby-text');
    if (text) text.textContent = AppState.hardwareConnected ? 'WAITING FOR SENSOR READINGS' : 'HARDWARE DISCONNECTED';
    const live = document.getElementById('chart-live-badge');
    if (live) live.textContent = 'STANDBY';
    return;
  }

  const ts = (AppState.chartData && AppState.chartData.timestamps) || [];
  const count = ts.length;
  const availableWidth = w - padLeft - padRight;
  const stepX = count > 1 ? availableWidth / (count - 1) : 0;

  chartCtx.textAlign = 'center';
  const maxLabels = Math.max(2, Math.floor(availableWidth / 75));
  const stepLabel = Math.max(1, Math.ceil(count / maxLabels));
  ts.forEach((time, idx) => {
    if (idx % stepLabel !== 0 && idx !== count - 1) return;
    const x = count > 1 ? (padLeft + stepX * idx) : (padLeft + availableWidth / 2);
    chartCtx.fillStyle = (idx === count - 1) ? (isDark ? '#10b981' : '#059669') : (isDark ? '#64748B' : '#94A3B8');
    chartCtx.font = (idx === count - 1) ? '700 9.5px "JetBrains Mono", monospace' : '9px "JetBrains Mono", monospace';
    chartCtx.fillText(time, x, h - 8);
  });

  const liveBadge = document.getElementById('chart-live-badge');
  const standbyBadge = document.getElementById('telemetry-standby-badge');

  if (liveBadge) {
    if (AppState.hardwareConnected) {
      liveBadge.innerHTML = '<span class="beacon-dot online" style="width:6px;height:6px;display:inline-block;margin-right:4px;"></span><span>LIVE</span>';
      liveBadge.style.color = '#10b981';
      liveBadge.className = 'badge-pill badge-glass mono';
    } else {
      liveBadge.innerHTML = '<span class="beacon-dot beacon-amber" style="width:6px;height:6px;display:inline-block;margin-right:4px;"></span><span>STANDBY</span>';
      liveBadge.style.color = '#f59e0b';
      liveBadge.className = 'badge-pill badge-glass mono';
    }
  }

  if (standbyBadge) {
    standbyBadge.style.display = AppState.hardwareConnected && AppState.chartData.timestamps.length ? 'none' : 'inline-flex';
    const standbyText = document.getElementById('telemetry-standby-text');
    if (standbyText) standbyText.textContent = 'STANDBY · HARDWARE DISCONNECTED';
  }

  const rangeUpper = (AppState.activeChartRange || '24h').toUpperCase();

  if (count === 0) return;

  const tankPoints = AppState.chartData.tank.map((rawVal, idx) => {
    const val = Math.max(0, Math.min(100, Number(rawVal) || 0));
    const x = count > 1 ? (padLeft + stepX * idx) : (padLeft + availableWidth / 2);
    return {
      x,
      y: h - padBottom - (val / 100) * (h - padTop - padBottom),
      val
    };
  });

  const soilPoints = AppState.chartData.soil.map((rawVal, idx) => {
    const val = Math.max(0, Math.min(100, Number(rawVal) || 0));
    const x = count > 1 ? (padLeft + stepX * idx) : (padLeft + availableWidth / 2);
    return {
      x,
      y: h - padBottom - (val / 100) * (h - padTop - padBottom),
      val
    };
  });

  chartCtx.save();
  chartCtx.beginPath();
  chartCtx.rect(padLeft, padTop - 4, availableWidth, h - padTop - padBottom + 8);
  chartCtx.clip();

  chartCtx.save();
  chartCtx.beginPath();
  drawCatmullRomSpline(chartCtx, tankPoints, 0.28, padTop, h - padBottom);
  chartCtx.strokeStyle = isDark ? '#06b6d4' : '#0284c7';
  chartCtx.lineWidth = 2.0;
  chartCtx.stroke();
  chartCtx.restore();

  chartCtx.save();
  const gradSoil = chartCtx.createLinearGradient(0, padTop, 0, h - padBottom);
  gradSoil.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.20)');
  gradSoil.addColorStop(0.7, isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)');
  gradSoil.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

  chartCtx.beginPath();
  chartCtx.moveTo(soilPoints[0].x, h - padBottom);
  chartCtx.lineTo(soilPoints[0].x, soilPoints[0].y);
  drawCatmullRomSpline(chartCtx, soilPoints, 0.28, padTop, h - padBottom);
  chartCtx.lineTo(soilPoints[soilPoints.length - 1].x, h - padBottom);
  chartCtx.closePath();
  chartCtx.fillStyle = gradSoil;
  chartCtx.fill();
  chartCtx.restore();

  chartCtx.save();
  chartCtx.beginPath();
  drawCatmullRomSpline(chartCtx, soilPoints, 0.28, padTop, h - padBottom);
  chartCtx.strokeStyle = '#10B981';
  chartCtx.lineWidth = 2.6;
  chartCtx.shadowColor = 'rgba(16, 185, 129, 0.4)';
  chartCtx.shadowBlur = 8;
  chartCtx.stroke();
  chartCtx.restore();

  const humiditySeries = AppState.chartData.airHum || [];
  chartCtx.save();
  chartCtx.beginPath();
  let drawing = false;
  humiditySeries.forEach((val, idx) => {
    if (!Number.isFinite(val)) { drawing = false; return; }
    const x = count > 1 ? padLeft + stepX * idx : padLeft + availableWidth / 2;
    const y = h - padBottom - Math.max(0, Math.min(100, val)) / 100 * (h - padTop - padBottom);
    if (!drawing) chartCtx.moveTo(x, y); else chartCtx.lineTo(x, y);
    drawing = true;
  });
  chartCtx.strokeStyle = '#8b5cf6';
  chartCtx.lineWidth = 2;
  chartCtx.stroke();
  chartCtx.restore();
  chartCtx.restore();

  soilPoints.forEach((p, idx) => {
    chartCtx.save();
    chartCtx.beginPath();
    chartCtx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    chartCtx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
    chartCtx.fill();
    chartCtx.lineWidth = 1.8;
    chartCtx.strokeStyle = '#10B981';
    chartCtx.stroke();

    if (idx === count - 1) {
      chartCtx.beginPath();
      chartCtx.arc(p.x, p.y, 6.0, 0, Math.PI * 2);
      chartCtx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      chartCtx.lineWidth = 1.5;
      chartCtx.stroke();
    }
    chartCtx.restore();
  });

  if (chartHoverIndex >= 0 && chartHoverIndex < count) {
    const sp = soilPoints[chartHoverIndex];
    const tp = tankPoints[chartHoverIndex];
    const hoverTime = ts[chartHoverIndex];
    const hoverSoil = sp.val.toFixed(1);
    const hoverTank = tp.val.toFixed(1);
    const hoverTemp = (AppState.chartData.temps && AppState.chartData.temps[chartHoverIndex] !== undefined)
      ? Number(AppState.chartData.temps[chartHoverIndex]).toFixed(1)
      : '--';

    chartCtx.save();

    chartCtx.beginPath();
    chartCtx.setLineDash([3, 3]);
    chartCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 23, 42, 0.35)';
    chartCtx.lineWidth = 1;
    chartCtx.moveTo(sp.x, padTop);
    chartCtx.lineTo(sp.x, h - padBottom);
    chartCtx.stroke();
    chartCtx.setLineDash([]);

    chartCtx.beginPath();
    chartCtx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2);
    chartCtx.fillStyle = '#10b981';
    chartCtx.fill();
    chartCtx.strokeStyle = '#ffffff';
    chartCtx.lineWidth = 2;
    chartCtx.stroke();

    chartCtx.beginPath();
    chartCtx.arc(tp.x, tp.y, 4.0, 0, Math.PI * 2);
    chartCtx.fillStyle = '#06b6d4';
    chartCtx.fill();
    chartCtx.strokeStyle = '#ffffff';
    chartCtx.lineWidth = 1.8;
    chartCtx.stroke();

    const humSample = AppState.chartData.airHum && AppState.chartData.airHum[chartHoverIndex];
    const hoverHum = Number.isFinite(humSample) ? humSample.toFixed(1) + '%' : '--';
    const tipText = `${hoverTime} S:${hoverSoil}% W:${hoverTank}% H:${hoverHum} T:${hoverTemp}\u00B0C`;
    chartCtx.font = '700 9.5px "JetBrains Mono", monospace';
    const textWidth = chartCtx.measureText(tipText).width;
    const tipW = textWidth + 16;
    const tipH = 22;
    let tipX = sp.x - tipW / 2;
    if (tipX < padLeft) tipX = padLeft;
    if (tipX + tipW > w - padRight) tipX = w - padRight - tipW;
    const tipY = padTop + 4;

    chartCtx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
    chartCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.15)';
    chartCtx.lineWidth = 1;

    chartCtx.beginPath();
    if (chartCtx.roundRect) {
      chartCtx.roundRect(tipX, tipY, tipW, tipH, 6);
    } else {
      chartCtx.rect(tipX, tipY, tipW, tipH);
    }
    chartCtx.fill();
    chartCtx.stroke();

    chartCtx.textAlign = 'center';
    chartCtx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
    chartCtx.fillText(tipText, tipX + tipW / 2, tipY + 14.5);
    chartCtx.restore();
  }
}
window.drawTelemetryChart = drawTelemetryChart;
window.renderTelemetryChart = drawTelemetryChart;
window.generateDynamicChartData = generateDynamicChartData;
window.setChartRange = setChartRange;

function switchTier3Tab(tabKey) {
  const btnLog = document.getElementById('btn-tab-live-log');
  const btnCal = document.getElementById('btn-tab-calibration');
  const paneLog = document.getElementById('pane-tab-live-log');
  const paneCal = document.getElementById('pane-tab-calibration');

  if (tabKey === 'calibration') {
    if (btnLog) btnLog.classList.remove('active');
    if (btnCal) btnCal.classList.add('active');
    if (paneLog) paneLog.style.display = 'none';
    if (paneCal) paneCal.style.display = 'block';
  } else {
    if (btnCal) btnCal.classList.remove('active');
    if (btnLog) btnLog.classList.add('active');
    if (paneCal) paneCal.style.display = 'none';
    if (paneLog) paneLog.style.display = 'block';
  }
}
window.switchTier3Tab = switchTier3Tab;

function exportTelemetryCSV() {
  const ts = AppState.chartData.timestamps;
  if (!ts || ts.length === 0) {
    showToast('No telemetry data to export', 'amber');
    return;
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const user = window.CURRENT_USER_NAME || 'Administrator';

  let csv = [];
  csv.push('# ==============================================================================');
  csv.push('# SMART MISTING SYSTEM - 24-HOUR TELEMETRY DATA STREAM');
  csv.push(`# Generated At   : ${now} UTC`);
  csv.push('# System Node    : ARDUINO-01 (Zone A Controller)');
  csv.push(`# Exported By    : ${user}`);
  csv.push(`# Total Samples  : ${ts.length}`);
  csv.push('# ==============================================================================');
  csv.push('');
  csv.push('Sample ID,Timestamp,Soil Moisture (%),Water Reservoir (%),Air Humidity (%),Air Temperature (C),Pump');

  for (let i = 0; i < ts.length; i++) {
    const soil = AppState.chartData.soil[i];
    const tank = AppState.chartData.tank[i];
    const airHum = AppState.chartData.airHum[i];
    const temp = AppState.chartData.temps[i];
    const pump = AppState.chartData.pumps[i] ? 'ON' : 'OFF';
    const airHumVal = (airHum !== undefined && airHum !== null) ? airHum : '';
    const tempVal = (temp !== undefined && temp !== null) ? temp : '';
    csv.push(`${i + 1},"${ts[i]}",${soil},${tank},${airHumVal},${tempVal},${pump}`);
  }

  downloadFile(csv.join('\r\n'), `smart_misting_telemetry_24h_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  showToast('CSV exported', 'success');
}

function renderHistoryTables() {
  const tbPump = document.getElementById('tbody-pump-logs');
  if (tbPump) {
    if (!AppState.history.pump || AppState.history.pump.length === 0) {
      tbPump.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px 0;">No records recorded</td></tr>';
    } else {
      tbPump.innerHTML = AppState.history.pump.map(p => `
        <tr>
          <td>${p.time}${p.isDemo ? ' <span class="badge-pill badge-amber" style="font-size: 9px; padding: 1px 5px; margin-left: 4px;">DEMO</span>' : ''}</td>
          <td><span class="badge-pill badge-${p.mode === 'AUTO' ? 'emerald' : 'amber'}">${p.mode}</span></td>
          <td><strong>${p.cmd}</strong></td>
          <td>${p.actor}</td>
          <td>${p.dur}</td>
          <td>${p.tank}</td>
          <td><span class="badge-pill badge-emerald">${p.ack}</span></td>
        </tr>
      `).join('');
    }
  }
  const cntPump = document.getElementById('cnt-pump-logs');
  if (cntPump) cntPump.textContent = AppState.history.pump ? AppState.history.pump.length : 0;

  const tbSensor = document.getElementById('tbody-sensor-logs');
  if (tbSensor) {
    if (!AppState.history.sensor || AppState.history.sensor.length === 0) {
      tbSensor.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px 0;">No records recorded</td></tr>';
    } else {
      tbSensor.innerHTML = AppState.history.sensor.map(s => `
        <tr>
          <td>${s.time}${s.isDemo ? ' <span class="badge-pill badge-amber" style="font-size: 9px; padding: 1px 5px; margin-left: 4px;">DEMO</span>' : ''}</td>
          <td style="color: var(--accent-emerald); font-weight: 700;">${s.soil}</td>
          <td style="color: var(--accent-sky); font-weight: 700;">${s.tank}</td>
          <td><span class="badge-pill badge-${(s.rain && s.rain.includes('CLEAR')) ? 'emerald' : 'cyan'}">${s.rain}</span></td>
          <td><span class="badge-pill badge-${s.status === 'OPTIMAL' ? 'emerald' : (s.status === 'LOW_WARNING' ? 'amber' : 'sky')}">${s.status}</span></td>
        </tr>
      `).join('');
    }
  }
  const cntSensor = document.getElementById('cnt-sensor-logs');
  if (cntSensor) cntSensor.textContent = AppState.history.sensor ? AppState.history.sensor.length : 0;

  const tbAudit = document.getElementById('tbody-audit-logs');
  if (tbAudit) {
    if (!AppState.history.audit || AppState.history.audit.length === 0) {
      tbAudit.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px 0;">No records recorded</td></tr>';
    } else {
      tbAudit.innerHTML = AppState.history.audit.map(a => `
        <tr>
          <td>${a.time}${a.isDemo ? ' <span class="badge-pill badge-amber" style="font-size: 9px; padding: 1px 5px; margin-left: 4px;">DEMO</span>' : ''}</td>
          <td><span class="badge-pill badge-glass">${a.action}</span></td>
          <td>${a.detail}</td>
          <td><strong>${a.user}</strong></td>
          <td>${a.ip}</td>
          <td><span class="badge-pill badge-${a.sev === 'WARNING' ? 'amber' : 'emerald'}">${a.sev}</span></td>
        </tr>
      `).join('');
    }
  }
  const cntAudit = document.getElementById('cnt-audit-logs');
  if (cntAudit) cntAudit.textContent = AppState.history.audit ? AppState.history.audit.length : 0;
}

function switchHistoryTab(tab) {
  ['pump', 'sensor', 'audit'].forEach(t => {
    const tableEl = document.getElementById(`table-tab-${t}`);
    const tabBtn = document.getElementById(`tab-btn-${t}`);
    if (tableEl) tableEl.style.display = t === tab ? 'table' : 'none';
    if (tabBtn) tabBtn.classList.toggle('active', t === tab);
  });
}

function filterLogs(range, btn) {
  document.querySelectorAll('#btn-flt-today, #btn-flt-7d, #btn-flt-all').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const dateInput = document.getElementById('input-date-filter');
  if (dateInput) dateInput.value = '';

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  document.querySelectorAll('#tbody-pump-logs tr, #tbody-sensor-logs tr, #tbody-audit-logs tr').forEach(r => {
    const timeCell = r.querySelector('td:first-child');
    if (!timeCell) return;
    const text = timeCell.textContent.trim();

    if (range === 'today') {
      r.style.display = text.includes(todayStr) ? '' : 'none';
    } else if (range === '7d') {
      const match = text.match(/\d{4}-\d{2}-\d{2}/);
      if (match) {
        const rowDate = new Date(match[0]);
        r.style.display = (rowDate >= sevenDaysAgo) ? '' : 'none';
      } else {
        r.style.display = '';
      }
    } else {
      r.style.display = '';
    }
  });

  showToast(range === 'today' ? 'Filtered: Today' : (range === '7d' ? 'Filtered: 7 Days' : 'Showing All Logs'), 'info');
}

function searchLogsTable() {
  const input = document.getElementById('input-search-log');
  const q = (input && input.value ? input.value : '').toLowerCase();
  document.querySelectorAll('#tbody-pump-logs tr, #tbody-sensor-logs tr, #tbody-audit-logs tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
window.searchLogsTable = searchLogsTable;
window.filterLogs = filterLogs;

function filterLogsByDate(dateStr) {
  document.querySelectorAll('#btn-flt-today, #btn-flt-7d, #btn-flt-all').forEach(b => b.classList.remove('active'));
  if (!dateStr) {
    document.querySelectorAll('#tbody-pump-logs tr, #tbody-sensor-logs tr, #tbody-audit-logs tr').forEach(r => {
      r.style.display = '';
    });
    return;
  }
  document.querySelectorAll('#tbody-pump-logs tr, #tbody-sensor-logs tr, #tbody-audit-logs tr').forEach(r => {
    const timeCell = r.querySelector('td:first-child');
    if (timeCell) {
      r.style.display = timeCell.textContent.includes(dateStr) ? '' : 'none';
    }
  });
  showToast(`Filtered: ${dateStr}`, 'info');
}
window.filterLogsByDate = filterLogsByDate;

function exportHistoryCSV() {
  const totalPump = (AppState.history.pump || []).length;
  const totalSensor = (AppState.history.sensor || []).length;
  const totalAudit = (AppState.history.audit || []).length;
  if (totalPump + totalSensor + totalAudit === 0) {
    showToast('No history logs to export', 'amber');
    return;
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const user = window.CURRENT_USER_NAME || 'Administrator';

  let csv = [];
  csv.push('# ==============================================================================');
  csv.push('# SMART MISTING SYSTEM - IOT AUDIT TRAIL & SYSTEM OPERATIONS LOG');
  csv.push(`# Generated At   : ${now} UTC`);
  csv.push('# System Node    : ARDUINO-01 (Zone A Controller)');
  csv.push(`# Exported By    : ${user}`);
  csv.push(`# Total Records  : ${totalPump + totalSensor + totalAudit} (Pump: ${totalPump}, Telemetry: ${totalSensor}, Security: ${totalAudit})`);
  csv.push('# ==============================================================================');
  csv.push('');
  csv.push('Section,Log ID,Timestamp,Category,Event Description,Operating Mode,Primary Metric,Duration / Value,Operator / Source,Security Severity,System Acknowledgment');

  let idx = 1;
  AppState.history.pump.forEach(p => {
    csv.push(`"PUMP_OPERATIONS",${idx++},"${p.time}","PUMP","${p.cmd}","${p.mode}","Reservoir ${p.tank}","${p.dur}","${p.actor}","INFO","${p.ack}"`);
  });
  AppState.history.sensor.forEach(s => {
    csv.push(`"TELEMETRY_STREAM",${idx++},"${s.time}","SENSOR","Soil: ${s.soil} | Tank: ${s.tank} | Weather: ${s.rain}","AUTO","Soil ${s.soil}","Tank ${s.tank}","ARDUINO-01","INFO","${s.status}"`);
  });
  AppState.history.audit.forEach(a => {
    const detailClean = (a.detail || '').replace(/"/g, '""');
    csv.push(`"SECURITY_AUDIT",${idx++},"${a.time}","AUDIT","${detailClean}","-","IP: ${a.ip}","-","${a.user}","${a.sev}","LOGGED"`);
  });

  downloadFile(csv.join('\r\n'), `smart_misting_operations_audit_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  showToast('History exported', 'success');
}

function exportHistoryPDF() {
  window.print();
}

function addSerialLog(dir, text) {
  totalPacketsExchanged++;
  const pktEl = document.getElementById('hw-metric-packets');
  if (pktEl) pktEl.textContent = `${totalPacketsExchanged} pkts`;

  const consoleEl = document.getElementById('hw-serial-console');
  if (!consoleEl) return;

  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const color = dir === 'TX' ? '#38BDF8' : (dir === 'RX' ? '#10B981' : '#E2E8F0');

  const line = document.createElement('div');
  line.style.marginBottom = '2px';
  line.style.wordBreak = 'break-all';
  line.innerHTML = `<span style="color: #64748B;">[${time}]</span> <span style="color: ${color}; font-weight: 700;">[${dir}]</span> <span>${escapeHtml(text)}</span>`;
  consoleEl.appendChild(line);

  while (consoleEl.children.length > 120) {
    consoleEl.removeChild(consoleEl.firstChild);
  }
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function clearSerialTerminal() {
  const consoleEl = document.getElementById('hw-serial-console');
  if (consoleEl) {
    consoleEl.innerHTML = '<div style="color: #64748B;">[SYSTEM] Serial telemetry console buffer cleared. Ready.</div>';
  }
  showToast('Hardware console buffer cleared', 'info');
}

function testPingHardware() {}
function sendEchoPing() {}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-modal-target]');
  if (trigger) {
    const targetId = trigger.getAttribute('data-modal-target');
    openModal(targetId);
    return;
  }
  const closer = e.target.closest('[data-modal-close]');
  if (closer) {
    const modal = closer.closest('.modal-backdrop, .modal-overlay');
    if (modal && modal.id) closeModal(modal.id);
    return;
  }
  if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay')) {
    if (e.target.id) closeModal(e.target.id);
  }
});

function showToast(msg, type) {
  pushSystemNotification(msg, type || 'info');
}

function formatNow() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

function executeSignOut() {
  closeModal('modal-signout');
  showToast('Signing out of session...', 'info');
  const ctx = window.contextPath || '';
  setTimeout(() => {
    window.location.href = `${ctx}/logout`;
  }, 600);
}

const saveSettings = saveMistingSettings;

window.initApp = initApp;
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.toggleFullscreen = toggleFullscreen;
window.toggleTheme = toggleTheme;
window.openModal = openModal;
window.closeModal = closeModal;
window.openConnectModal = openConnectModal;
window.executeHardwareConnect = executeHardwareConnect;
window.disconnectHardware = disconnectHardware;
window.handleStartPump = handleStartPump;
window.handleStopPump = handleStopPump;
window.quickSwitchMode = quickSwitchMode;
window.saveSettings = saveMistingSettings;
window.saveMistingSettings = saveMistingSettings;
window.switchHistoryTab = switchHistoryTab;
window.exportHistoryCSV = exportHistoryCSV;
window.exportHistoryPDF = exportHistoryPDF;
window.openAddPlantModal = openAddPlantModal;
window.openCreatePlantModal = openAddPlantModal;
window.submitCreatePlant = submitCreatePlant;
window.openEditPlantModal = openEditPlantModal;
window.submitUpdatePlant = submitUpdatePlant;
window.deletePlantRecord = deletePlantRecord;
window.deletePlant = deletePlantRecord;
window.renderPlantDropdowns = renderPlantDropdowns;
window.setActivePlantProfile = setActivePlantProfile;
window.openCreateUserModal = openCreateUserModal;
window.submitCreateUser = submitCreateUser;
window.openEditUserModal = openEditUserModal;
window.submitUpdateUser = submitUpdateUser;
window.toggleUserLock = toggleUserLock;
window.toggleLockUser = toggleUserLock;
window.deleteUser = deleteUser;
window.deleteUserRecord = deleteUser;
window.changeUserPassword = function() {
  showToast('Password updated successfully', 'success');
};
window.testPingHardware = testPingHardware;
window.runHardwareDiagnostics = testPingHardware;
window.sendEchoPing = sendEchoPing;
window.clearSerialTerminal = clearSerialTerminal;
window.addSerialLog = addSerialLog;
window.setChartRange = setChartRange;
window.filterPlantTable = filterPlantTable;
window.filterUserTable = filterUserTable;
window.showToast = showToast;
window.startSimulatedDemoMode = startSimulatedDemoMode;
window.triggerHardwarePumpTest = triggerHardwarePumpTest;
window.sampleSoilSensorProbe = sampleSoilSensorProbe;
window.toggleRainSensorSimulation = toggleRainSensorSimulation;
window.refillReservoirTest = refillReservoirTest;
window.toggleLowWaterLockout = toggleLowWaterLockout;
window.toggleTestBenchMode = toggleTestBenchMode;
window.simulateLowSoilMoisture = simulateLowSoilMoisture;
window.exportTelemetryCSV = exportTelemetryCSV;
window.executeSignOut = executeSignOut;
window.AppState = AppState;

let systemRecentNotifications = [];
let notifFlyoutTimer = null;

function loadStoredNotifications() {
  try {
    const raw = localStorage.getItem('smart_misting_recent_notifs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        systemRecentNotifications = parsed;
      }
    }
  } catch (e) {
    systemRecentNotifications = [];
  }
}
loadStoredNotifications();

function saveStoredNotifications() {
  try {
    localStorage.setItem('smart_misting_recent_notifs', JSON.stringify(systemRecentNotifications.slice(0, 5)));
  } catch (e) {}
}

function pushSystemNotification(msg, type) {
  if (!msg) return;
  const cleanType = (type || 'info').toLowerCase();
  const d = new Date();
  const pad = function(n) { return String(n).padStart(2, '0'); };
  const timeStr = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());

  const item = {
    id: Date.now() + Math.random(),
    msg: String(msg),
    type: cleanType,
    time: timeStr
  };

  systemRecentNotifications.unshift(item);
  if (systemRecentNotifications.length > 5) {
    systemRecentNotifications = systemRecentNotifications.slice(0, 5);
  }
  saveStoredNotifications();
  renderNotificationDropdown();

  const bell = document.getElementById('btn-notif-bell');
  const dot = document.getElementById('bell-status-dot');
  if (bell) {
    bell.classList.remove('bell-ringing');
    void bell.offsetWidth;
    bell.classList.add('bell-ringing');
  }
  if (dot) {
    dot.classList.add('active');
  }

  showNotifFlyout(item);
}
window.pushSystemNotification = pushSystemNotification;

function triggerBellNotification(msg, type) {
  pushSystemNotification(msg, type || 'info');
}
window.triggerBellNotification = triggerBellNotification;

function showNotifFlyout(item) {
  const banner = document.getElementById('notif-flyout-banner');
  const textEl = document.getElementById('notif-flyout-text');
  const iconEl = document.getElementById('notif-flyout-icon');
  if (!banner || !textEl) return;

  if (notifFlyoutTimer) {
    clearTimeout(notifFlyoutTimer);
    notifFlyoutTimer = null;
  }

  banner.className = 'notif-flyout-banner is-active type-' + (item.type || 'info');
  textEl.textContent = item.msg;
  if (iconEl) {
    if (item.type === 'error' || item.type === 'crimson') {
      iconEl.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else if (item.type === 'warning' || item.type === 'amber') {
      iconEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else {
      iconEl.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>';
    }
  }

  notifFlyoutTimer = setTimeout(function() {
    closeNotifFlyout();
  }, 3800);
}

function closeNotifFlyout(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const banner = document.getElementById('notif-flyout-banner');
  if (banner) {
    banner.classList.add('is-leaving');
    setTimeout(function() {
      banner.classList.remove('is-active', 'is-leaving');
    }, 360);
  }
  if (notifFlyoutTimer) {
    clearTimeout(notifFlyoutTimer);
    notifFlyoutTimer = null;
  }
}
window.closeNotifFlyout = closeNotifFlyout;

function renderNotificationDropdown() {
  const list = document.getElementById('notif-popover-list');
  if (!list) return;

  if (!systemRecentNotifications || systemRecentNotifications.length === 0) {
    list.innerHTML = '<div class="notif-popover-empty">No recent notifications.<br><span style="font-size:11px;opacity:0.7;">System operating normally.</span></div>';
    return;
  }

  list.innerHTML = systemRecentNotifications.slice(0, 5).map(function(n) {
    const badgeType = (n.type === 'error' || n.type === 'crimson') ? 'error'
      : ((n.type === 'warning' || n.type === 'amber') ? 'warning'
      : ((n.type === 'success' || n.type === 'emerald') ? 'success' : 'info'));
    return '<div class="notif-popover-item">' +
      '<span class="notif-popover-badge ' + badgeType + '">' + badgeType.toUpperCase() + '</span>' +
      '<div class="notif-popover-msg">' + escapeHtml(n.msg) + '</div>' +
      '<span class="notif-popover-time">' + n.time + '</span>' +
    '</div>';
  }).join('');
}
window.renderNotificationDropdown = renderNotificationDropdown;

function toggleNotificationDropdown(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const popover = document.getElementById('notif-dropdown-popover');
  const dot = document.getElementById('bell-status-dot');
  if (!popover) return;

  const isHidden = (popover.style.display === 'none' || !popover.style.display);
  if (isHidden) {
    renderNotificationDropdown();
    popover.style.display = 'block';
    if (dot) dot.classList.remove('active');
  } else {
    popover.style.display = 'none';
  }
}
window.toggleNotificationDropdown = toggleNotificationDropdown;

function clearSystemNotifications(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  systemRecentNotifications = [];
  saveStoredNotifications();
  renderNotificationDropdown();
  const dot = document.getElementById('bell-status-dot');
  if (dot) dot.classList.remove('active');
}
window.clearSystemNotifications = clearSystemNotifications;

document.addEventListener('click', function(e) {
  const popover = document.getElementById('notif-dropdown-popover');
  const anchor = document.getElementById('topbar-notif-anchor');
  if (popover && popover.style.display === 'block') {
    if (anchor && !anchor.contains(e.target)) {
      popover.style.display = 'none';
    }
  }
});

function toggleHardwareConnect() {
  if (AppState.hardwareConnected) {
    disconnectHardware();
  } else {
    openConnectModal();
  }
}
window.toggleHardwareConnect = toggleHardwareConnect;
window.handleSidebarConnectClick = toggleHardwareConnect;

function connectSimulatedHardware() {
  startSimulatedDemoMode();
}
window.connectSimulatedHardware = connectSimulatedHardware;

function toggleControlsDock() {
  const dock = document.getElementById('dashboard-controls-dock');
  const btn = document.getElementById('btn-toggle-controls-dock');
  const container = document.getElementById('dashboard-grid-container');
  if (dock) {
    const isCollapsed = dock.classList.toggle('collapsed');
    if (container) {
      container.classList.toggle('is-dock-collapsed', isCollapsed);
    }
    if (btn) {
      btn.setAttribute('title', isCollapsed ? 'Expand Controls Station' : 'Collapse Controls Station');
      btn.classList.toggle('active', !isCollapsed);
    }
  }
  setTimeout(drawTelemetryChart, 50);
  setTimeout(drawTelemetryChart, 200);
  setTimeout(drawTelemetryChart, 360);
}
window.toggleControlsDock = toggleControlsDock;

function handlePumpToggleFromSquare() {
  if (!AppState.hardwareConnected) {
    showToast('Offline: Link Device First', 'amber');
    triggerBellNotification('Offline: Link Device First');
    return;
  }
  if (AppState.systemMode === 'AUTO') {
    confirmSwitchToManual(function() {
      if (AppState.isPumpActive) {
        handleStopPump('OPERATOR_STOP');
      } else {
        handleStartPump(true);
      }
    }, 'Manual pump actuation');
    return;
  }

  if (AppState.isPumpActive) {
    handleStopPump('OPERATOR_STOP');
  } else {
    handleStartPump(true);
  }
}
window.handlePumpToggleFromSquare = handlePumpToggleFromSquare;

function toggleModeFromSquare() {
  if (AppState.systemMode === 'AUTO') {
    confirmSwitchToManual(function() {}, 'Switching operating mode');
  } else {
    quickSwitchMode('AUTO');
  }
}
window.toggleModeFromSquare = toggleModeFromSquare;

let quickSprayInterval = null;
let quickSprayRemaining = 0;
let activeMorphSensor = null;

const SENSOR_TARGET_CONFIG = {
  soil: { key: 'soil', name: 'Substrate Moisture (Yl-69 Fork)', unit: '%', safeMin: 40.0, safeMax: 65.0, accent: '#10B981' },
  water: { key: 'water', name: 'Reservoir Level (Tank)', unit: '%', safeMin: 20.0, safeMax: 100.0, accent: '#0284C7' },
  humidity: { key: 'humidity', name: 'Air Humidity (DHT11)', unit: '%', safeMin: 60.0, safeMax: 70.0, accent: '#8b5cf6' },
  rain: { key: 'rain', name: 'Chamber Relative Humidity (DHT11)', unit: '%', safeMin: 60.0, safeMax: 85.0, accent: '#06B6D4' },
  temperature: { key: 'temperature', name: 'Ambient Chamber Temp (DHT11)', unit: '\u00B0C', safeMin: 18.0, safeMax: 28.0, accent: '#F59E0B' },
  relay: { key: 'relay', name: 'Mist Pump Relay (D8)', unit: '', safeMin: null, safeMax: null, accent: '#10B981' }
};

function startQuickSpray(duration = 10) {
  const tank = AppState.telemetry ? AppState.telemetry.tankLevel : null;
  if (tank !== null && tank !== undefined && tank <= 20.0) {
    showToast('Safety Lockout: Reservoir critically low (<=20%)', 'crimson');
    triggerBellNotification('Lockout: Low Water');
    return { success: false, reason: 'LOW_WATER_LOCKOUT' };
  }

  const isRaining = AppState.telemetry ? AppState.telemetry.isRaining : false;
  if (isRaining) {
    showToast('Safety Lockout: Precipitation active, spray inhibited', 'amber');
    triggerBellNotification('Lockout: Rain Active');
    return { success: false, reason: 'RAIN_LOCKOUT' };
  }

  if (quickSprayInterval !== null) {
    return { success: false, reason: 'ALREADY_SPRAYING' };
  }

  quickSprayRemaining = duration;
  AppState.isPumpActive = true;

  if (window.Garden3D && typeof window.Garden3D.triggerSpray === 'function') {
    window.Garden3D.triggerSpray(true);
  }

  const pState = document.getElementById('stat-pump-state');
  if (pState) {
    pState.textContent = 'ON';
    pState.style.color = 'var(--accent-emerald)';
  }
  const pDot = document.getElementById('pod-pump-dot');
  if (pDot) {
    pDot.className = 'pulse-dot online optimal';
  }

  const counter = document.getElementById('quick-spray-counter');
  if (counter) counter.textContent = `${duration}s`;

  const totalCircumference = 283;
  const ring = document.getElementById('quick-spray-ring');
  const circlePath = document.getElementById('quick-spray-circle-path');

  quickSprayInterval = setInterval(() => {
    quickSprayRemaining--;
    if (counter) counter.textContent = `${quickSprayRemaining}s`;

    if (ring) {
      const offset = ((duration - quickSprayRemaining) / duration) * totalCircumference;
      ring.setAttribute('data-stroke-dashoffset', String(offset));
    }
    if (circlePath) {
      const pct = Math.max(0, (quickSprayRemaining / duration) * 100);
      circlePath.style.strokeDashoffset = String(100 - pct);
    }

    if (quickSprayRemaining <= 0) {
      stopQuickSpray();
    }
  }, 1000);

  return { success: true };
}

function stopQuickSpray() {
  if (quickSprayInterval) {
    clearInterval(quickSprayInterval);
    quickSprayInterval = null;
  }
  quickSprayRemaining = 0;
  AppState.isPumpActive = false;

  if (window.Garden3D && typeof window.Garden3D.triggerSpray === 'function') {
    window.Garden3D.triggerSpray(false);
  }

  const counter = document.getElementById('quick-spray-counter');
  const ring = document.getElementById('quick-spray-ring');
  const circlePath = document.getElementById('quick-spray-circle-path');
  const relayVal = document.getElementById('stat-pump-state');

  if (counter) counter.textContent = '10s';
  if (ring) ring.setAttribute('data-stroke-dashoffset', '0');
  if (circlePath) circlePath.style.strokeDashoffset = '0';
  if (relayVal) {
    relayVal.textContent = 'OFF';
    relayVal.style.color = 'var(--text-muted)';
  }
}

function toggleModeFromCapsule() {
  const newMode = (AppState.systemMode === 'AUTO') ? 'MANUAL' : 'AUTO';
  AppState.systemMode = newMode;

  const btnToggle = document.getElementById('btn-toggle-mode');
  if (btnToggle) {
    btnToggle.textContent = newMode;
    btnToggle.className = (newMode === 'AUTO') ? 'capsule-switch-auto' : 'capsule-switch-manual';
  }

  if (newMode === 'MANUAL' && (quickSprayInterval || AppState.isPumpActive)) {
    stopQuickSpray();
    handleStopPump('MANUAL_MODE_OVERRIDE');
  }

  quickSwitchMode(newMode);
}

function openTelemetryDrawer() {
  if (window.Garden3D && typeof window.Garden3D.setPanOffset === 'function') {
    window.Garden3D.setPanOffset(-0.38);
    if (window.updatePanBadge) window.updatePanBadge(-0.38);
  }
  const drawer = document.getElementById('telemetry-drawer');
  const viewport = document.getElementById('digital-twin-viewport');
  const hexCluster = document.getElementById('organic-hex-cluster');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) {
    drawer.classList.add('open');
    drawer.style.transform = 'translateX(0)';
  }
  if (viewport) {
    viewport.classList.add('telemetry-drawer-open');
  }
  if (hexCluster) {
    hexCluster.classList.add('telemetry-open');
    hexCluster.style.left = '';
    hexCluster.style.top = '';
    hexCluster.style.right = '';
    hexCluster.style.bottom = '';
  }
  if (backdrop) {
    backdrop.classList.add('active');
  }
  document.body.classList.add('has-telemetry-open');

  if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
    setTimeout(() => window.Garden3D.resize(), 80);
    setTimeout(() => window.Garden3D.resize(), 360);
  }

  generateDynamicChartData(AppState.activeChartRange || '24h');
  drawTelemetryChart();
  setTimeout(drawTelemetryChart, 50);
  setTimeout(drawTelemetryChart, 350);
}

function closeTelemetryDrawer() {
  if (window.Garden3D && typeof window.Garden3D.setPanOffset === 'function') {
    window.Garden3D.setPanOffset(0);
    if (window.updatePanBadge) window.updatePanBadge(0);
  }
  const drawer = document.getElementById('telemetry-drawer');
  const viewport = document.getElementById('digital-twin-viewport');
  const hexCluster = document.getElementById('organic-hex-cluster');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.style.transform = 'translateX(100%)';
  }
  if (viewport) {
    viewport.classList.remove('telemetry-drawer-open');
  }
  if (hexCluster) {
    hexCluster.classList.remove('telemetry-open');
    hexCluster.style.left = '';
    hexCluster.style.top = '';
    hexCluster.style.right = '';
    hexCluster.style.bottom = '';
  }
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.style.display = 'none';
  }
  document.body.classList.remove('has-telemetry-open');

  if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
    setTimeout(() => window.Garden3D.resize(), 80);
    setTimeout(() => window.Garden3D.resize(), 360);
  }
}

function openDetailCard(sensorKey, tileEl) {
  document.querySelectorAll('.hex-tile').forEach(t => t.classList.remove('hex-active-popout'));
  const currentTile = tileEl || document.querySelector(`.hex-tile[data-sensor="${sensorKey}"]`);
  if (currentTile) currentTile.classList.add('hex-active-popout');
  activeMorphSensor = sensorKey;
  const detailCard = document.getElementById('morph-detail-card');
  const hexTiles = document.querySelectorAll('.hex-tile');
  const resolvedTile = tileEl || document.querySelector(`.hex-tile[data-sensor="${sensorKey}"]`);

  document.querySelectorAll('.morph-return-ghost').forEach(g => g.remove());

  if (window.Garden3D && typeof window.Garden3D.focus === 'function') {
    window.Garden3D.focus(sensorKey);
  }

  if (detailCard) {
    const cfg = SENSOR_TARGET_CONFIG[sensorKey] || SENSOR_TARGET_CONFIG.soil;
    detailCard.style.setProperty('--morph-accent', cfg.accent || '#10B981');

    detailCard.classList.remove('morphed-open');
    detailCard.style.display = 'block';

    if (resolvedTile && typeof resolvedTile.getBoundingClientRect === 'function' && typeof detailCard.getBoundingClientRect === 'function') {
      const tileRect = resolvedTile.getBoundingClientRect();
      const cardRect = detailCard.getBoundingClientRect();
      if (tileRect.width > 0 && cardRect.width > 0) {
        const dx = (tileRect.left + tileRect.width / 2) - (cardRect.left + cardRect.width / 2);
        const dy = (tileRect.top + tileRect.height / 2) - (cardRect.top + cardRect.height / 2);
        detailCard.style.setProperty('--morph-dx', `${Math.round(dx)}px`);
        detailCard.style.setProperty('--morph-dy', `${Math.round(dy)}px`);
      }
    }

    void detailCard.offsetWidth;
    detailCard.classList.add('morphed-open');

    hexTiles.forEach(t => {
      t.classList.remove('morph-source', 'morph-docked-pulse', 'hex-pulled-out', 'hex-focused-pop');
      if (t !== resolvedTile) {
        t.classList.add('hex-unfocused');
      } else {
        t.classList.remove('hex-unfocused');
      }
    });
    if (resolvedTile) {
      resolvedTile.classList.add('morph-source', 'hex-pulled-out', 'hex-focused-pop');
      window.activeMorphSensor = sensorKey;
      renderCalloutBeam(sensorKey, resolvedTile);
    }

    const detailTitle = document.getElementById('detail-card-title');
    const detailVal = document.getElementById('detail-card-val');
    const detailSafe = document.getElementById('detail-card-safe');

    if (detailTitle && cfg) detailTitle.textContent = cfg.name;
    if (detailVal) {
      const statId = getStatIdForSensor(sensorKey);
      const valEl = resolvedTile ? resolvedTile.querySelector('span[id^="stat-"]') : (statId ? document.getElementById(statId) : null);
      const rawText = valEl ? valEl.textContent.trim() : '--';
      const suffix = (cfg && cfg.unit && rawText !== '--' && !rawText.includes(cfg.unit)) ? ' ' + cfg.unit : '';
      detailVal.textContent = rawText + suffix;
    }
    if (detailSafe && cfg) {
      const plant = (AppState.plants || []).find(p => p.id === AppState.activePlantId) || (AppState.plants && AppState.plants[0]);
      if (sensorKey === 'soil') {
        detailSafe.textContent = plant ? `Safe: ${plant.min}% - ${plant.max}%` : 'Safe: 50% - 65%';
      } else if (sensorKey === 'temperature') {
        detailSafe.textContent = 'Safe: 18\u00B0C - 28\u00B0C';
      } else if (cfg.safeMin !== null && cfg.safeMin !== undefined) {
        detailSafe.textContent = (sensorKey === 'humidity' && AppState.firmwareBounds) ? `Air RH: Start < ${AppState.firmwareBounds.on}% / Stop >= ${AppState.firmwareBounds.off}%` : `Safe: ${cfg.safeMin}% - ${cfg.safeMax}%`;
      } else {
        detailSafe.textContent = 'Operational Range: Normal';
      }
    }

    const sparklineCanvas = document.getElementById('detail-card-sparkline');
    if (sparklineCanvas) {
      let data = (AppState.history && AppState.history[sensorKey]) || null;
      if (!data && AppState.chartData) {
        if (sensorKey === 'soil') data = AppState.chartData.soil;
        else if (sensorKey === 'water') data = AppState.chartData.tank;
        else if (sensorKey === 'humidity') data = (AppState.chartData.airHum || []).filter(Number.isFinite);
        else if (sensorKey === 'temperature') data = (AppState.chartData.temps || []).filter(Number.isFinite);
      }
      if (!data || data.length < 2) data = [];
      renderMiniSparkline(sparklineCanvas, data, cfg.accent || '#10B981');
    }

    const agriAlert = document.getElementById('detail-card-agri-alert');
    if (agriAlert) {
      const soilEl = document.getElementById('stat-soil-moisture');
      const tempEl = document.getElementById('stat-air-temp');
      const rainEl = document.getElementById('stat-rain-state');
      const soilVal  = parseFloat((soilEl && soilEl.textContent) ? soilEl.textContent : '55');
      const tempVal  = parseFloat((tempEl && tempEl.textContent) ? tempEl.textContent : '24.5');
      const rainTxt  = ((rainEl && rainEl.textContent) ? rainEl.textContent : 'CLEAR').trim().toUpperCase();
      const isRainWet = rainTxt === 'WET' || rainTxt === 'RAIN' || rainTxt === 'DETECTED';

      const mkAlert = (color, icon, title, body) =>
        '<div style="display:flex;align-items:flex-start;gap:8px;">' + icon +
        '<div><strong style="color:' + color + ';display:block;font-size:11px;font-weight:800;letter-spacing:0.04em;">' + title + '</strong>' +
        '<span style="font-size:10px;line-height:1.45;display:block;color:#94a3b8;margin-top:3px;">' + body + '</span></div></div>';

      const warnIcon  = (c) => '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:' + c + ';fill:none;stroke-width:2.2;flex-shrink:0;margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      const infoIcon  = (c) => '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:' + c + ';fill:none;stroke-width:2.2;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      const dropIcon  = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:#06b6d4;fill:none;stroke-width:2.2;flex-shrink:0;margin-top:1px;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>';

      let alertShown = false;

      if (soilVal >= 65 && tempVal > 28) {
        agriAlert.style.display = 'block';
        agriAlert.style.background = 'rgba(239, 68, 68, 0.1)';
        agriAlert.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        agriAlert.innerHTML = mkAlert('#ef4444', warnIcon('#ef4444'),
          'PRIORITY 1 — ROOT ROT SAFETY CUTOFF',
          'Substrate \u226565% + temp >28\u00b0C: Misting LOCKED. Soil priority wins. Convective vent cooling active to protect <em>Ludisia discolor</em> rhizomes from Pythium rot.');
        alertShown = true;

      } else if (soilVal >= 65) {
        agriAlert.style.display = 'block';
        agriAlert.style.background = 'rgba(245, 158, 11, 0.1)';
        agriAlert.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        agriAlert.innerHTML = mkAlert('#f59e0b', infoIcon('#f59e0b'),
          'SUBSTRATE SATURATION CUTOFF',
          'Substrate \u226565%: Misting locked. Waiting for substrate to drain below 65% before next pulse. Root aeration protected.');
        alertShown = true;

      } else if (tempVal < 18) {
        agriAlert.style.display = 'block';
        agriAlert.style.background = 'rgba(6, 182, 212, 0.1)';
        agriAlert.style.borderColor = 'rgba(6, 182, 212, 0.3)';
        agriAlert.innerHTML = mkAlert('#06b6d4', dropIcon,
          'COLD LOCKOUT — MISTING SUSPENDED',
          'Temp <18\u00b0C: All misting suspended. At this temperature Ludisia discolor halts water uptake; any moisture causes immediate cold rot of rhizome and roots.');
        alertShown = true;

      } else if (isRainWet && (sensorKey === 'rain' || sensorKey === 'relay')) {
        agriAlert.style.display = 'block';
        agriAlert.style.background = 'rgba(239, 68, 68, 0.08)';
        agriAlert.style.borderColor = 'rgba(239, 68, 68, 0.28)';
        agriAlert.innerHTML = mkAlert('#ef4444', warnIcon('#ef4444'),
          'LEAF WETNESS INTERLOCK — HARD STOP',
          'Droplets detected on leaf surface. Pump cut immediately. Velvet leaf cells of Ludisia trap moisture — prolonged contact causes apex rot within 24h.');
        alertShown = true;
      }

      if (!alertShown) agriAlert.style.display = 'none';
    }
  }
}

function getStatIdForSensor(key) {
  switch (key) {
    case 'soil': return 'stat-soil-moisture';
    case 'water': return 'stat-tank-val';
    case 'rain':
    case 'humidity': return 'stat-air-hum';
    case 'temperature': return 'stat-air-temp';
    case 'relay': return 'stat-pump-state';
    default: return '';
  }
}

function renderCalloutBeam(sensorKey, targetTile) {
  const svg = document.getElementById('hud-callout-svg');
  const pathGlow = document.getElementById('callout-path-glow');
  const pathCore = document.getElementById('callout-path-core');
  const originNode = document.getElementById('callout-origin-node');
  if (!svg || !pathGlow || !pathCore || !originNode) return;

  if (!window.Garden3D || typeof window.Garden3D.getScreenCoords !== 'function') return;

  const keyMap = {
    soil: 'soil',
    water: 'water',
    rain: 'rain',
    temperature: 'temp',
    temp: 'temp',
    relay: 'relay'
  };
  const gKey = keyMap[sensorKey] || sensorKey;
  const p3d = window.Garden3D.getScreenCoords(gKey);
  if (!p3d || !p3d.visible) {
    hideCalloutBeam();
    return;
  }

  const stage = document.getElementById('digital-twin-viewport') || document.body;
  const stageRect = stage.getBoundingClientRect();

  const x1 = p3d.x;
  const y1 = p3d.y;

  const tile = targetTile || document.querySelector(`.hex-tile[data-sensor="${sensorKey}"]`);
  if (!tile) {
    hideCalloutBeam();
    return;
  }
  const tileRect = tile.getBoundingClientRect();
  const x2 = (tileRect.left + tileRect.width / 2) - stageRect.left;
  const y2 = (tileRect.top + tileRect.height / 2) - stageRect.top;

  const cx1 = x1 + (x2 - x1) * 0.45;
  const cy1 = y1;
  const cx2 = x1 + (x2 - x1) * 0.55;
  const cy2 = y2;
  const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;

  pathGlow.setAttribute('d', d);
  pathGlow.style.opacity = '0.9';
  pathCore.setAttribute('d', d);
  pathCore.style.opacity = '1';

  originNode.setAttribute('cx', x1.toFixed(1));
  originNode.setAttribute('cy', y1.toFixed(1));
  originNode.style.opacity = '1';
}

function hideCalloutBeam() {
  const pathGlow = document.getElementById('callout-path-glow');
  const pathCore = document.getElementById('callout-path-core');
  const originNode = document.getElementById('callout-origin-node');
  if (pathGlow) pathGlow.style.opacity = '0';
  if (pathCore) pathCore.style.opacity = '0';
  if (originNode) originNode.style.opacity = '0';
}
window.renderCalloutBeam = renderCalloutBeam;
window.hideCalloutBeam = hideCalloutBeam;

function closeDetailCard() {
  document.querySelectorAll('.hex-tile').forEach(t => t.classList.remove('hex-active-popout'));
  const detailCard = document.getElementById('morph-detail-card');
  const agriAlert = document.getElementById('detail-card-agri-alert');
  if (agriAlert) agriAlert.style.display = 'none';

  const sourceTile = document.querySelector('.hex-tile.morph-source') ||
    (activeMorphSensor ? document.querySelector(`.hex-tile[data-sensor="${activeMorphSensor}"]`) : null);
  const cfg = activeMorphSensor ? SENSOR_TARGET_CONFIG[activeMorphSensor] : null;

  if (detailCard && detailCard.style.display !== 'none' && sourceTile && typeof detailCard.getBoundingClientRect === 'function') {
    const cardRect = detailCard.getBoundingClientRect();
    const tileRect = sourceTile.getBoundingClientRect();
    if (cardRect.width > 0 && tileRect.width > 0) {
      const ghost = document.createElement('div');
      ghost.className = 'morph-return-ghost';
      ghost.style.left = `${cardRect.left}px`;
      ghost.style.top = `${cardRect.top}px`;
      ghost.style.width = `${cardRect.width}px`;
      ghost.style.height = `${cardRect.height}px`;
      if (cfg && cfg.accent) ghost.style.setProperty('--morph-accent', cfg.accent);
      document.body.appendChild(ghost);

      const dx = (tileRect.left + tileRect.width / 2) - (cardRect.left + cardRect.width / 2);
      const dy = (tileRect.top + tileRect.height / 2) - (cardRect.top + cardRect.height / 2);

      requestAnimationFrame(() => {
        ghost.style.transform = `translate3d(${Math.round(dx)}px, ${Math.round(dy)}px, 0) scale(0.22)`;
        ghost.style.borderRadius = '48px';
        ghost.style.opacity = '0';
      });

      setTimeout(() => {
        ghost.remove();
        if (sourceTile) {
          sourceTile.classList.add('morph-docked-pulse');
          setTimeout(() => sourceTile.classList.remove('morph-docked-pulse'), 550);
        }
      }, 340);
    }
  }

  const hexTiles = document.querySelectorAll('.hex-tile');
  if (detailCard) {
    detailCard.style.display = 'none';
    detailCard.classList.remove('morphed-open');
  }
  hexTiles.forEach(t => t.classList.remove('morph-source', 'hex-pulled-out', 'hex-focused-pop', 'hex-unfocused'));
  hideCalloutBeam();
  activeMorphSensor = null;
  window.activeMorphSensor = null;

  if (window.Garden3D && typeof window.Garden3D.home === 'function') {
    window.Garden3D.home();
  }
}

function renderMiniSparkline(canvas, dataPoints = [], strokeColor = '#10B981') {
  if (!canvas) return;
  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const w = canvas.width || 240;
  const h = canvas.height || 64;
  ctx.clearRect(0, 0, w, h);

  if (!dataPoints || dataPoints.length < 2) {
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = (max - min) || 1;

  const pts = dataPoints.map((val, idx) => ({
    x: (idx / (dataPoints.length - 1)) * (w - 16) + 8,
    y: h - 8 - ((val - min) / range) * (h - 16)
  }));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function initDigitalTwinWiring() {

  if (typeof updateLiveDashboard === 'function') {
    updateLiveDashboard(52.0, 78.0, false, 25.0, false);
  }
  if (typeof document === 'undefined') return;

  const btnQuickSpray = document.getElementById('btn-quick-spray');
  if (btnQuickSpray && !btnQuickSpray._boundSpray) {
    btnQuickSpray._boundSpray = true;
    btnQuickSpray.addEventListener('click', (e) => {
      e.stopPropagation();
      startQuickSpray(10);
    });
  }

  const btnToggleMode = document.getElementById('btn-toggle-mode');
  if (btnToggleMode && !btnToggleMode._boundToggle) {
    btnToggleMode._boundToggle = true;
    btnToggleMode.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModeFromCapsule();
    });
  }
  const btnSwitchAuto = document.getElementById('capsule-switch-auto');
  if (btnSwitchAuto && !btnSwitchAuto._boundSwitch) {
    btnSwitchAuto._boundSwitch = true;
    btnSwitchAuto.addEventListener('click', (e) => {
      e.stopPropagation();
      if (AppState.systemMode !== 'AUTO') quickSwitchMode('AUTO');
    });
  }
  const btnSwitchManual = document.getElementById('capsule-switch-manual');
  if (btnSwitchManual && !btnSwitchManual._boundSwitch) {
    btnSwitchManual._boundSwitch = true;
    btnSwitchManual.addEventListener('click', (e) => {
      e.stopPropagation();
      if (AppState.systemMode !== 'MANUAL') quickSwitchMode('MANUAL');
    });
  }

  const plantSelector = document.getElementById('capsule-plant-selector');
  if (plantSelector && !plantSelector._boundChange) {
    plantSelector._boundChange = true;
    plantSelector.addEventListener('change', (e) => {
      const val = parseInt(plantSelector.value || (e && e.target && e.target.value), 10);
      if (!isNaN(val)) {
        AppState.activePlantId = val;
        setActivePlantProfile(val);
        if (activeMorphSensor === 'soil') {
          const detailSafe = document.getElementById('detail-card-safe');
          const plant = (AppState.plants || []).find(p => p.id === val);
          if (detailSafe && plant) {
            detailSafe.textContent = `Safe: ${plant.min}% - ${plant.max}%`;
          }
        }
      }
    });
  }

  const connBadge = document.getElementById('capsule-conn-badge');
  if (connBadge && !connBadge._boundClick) {
    connBadge._boundClick = true;
    connBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      openConnectModal();
    });
  }

  const btnOpenDrawer = document.getElementById('btn-open-drawer');
  if (btnOpenDrawer && !btnOpenDrawer._boundOpen) {
    btnOpenDrawer._boundOpen = true;
    btnOpenDrawer.addEventListener('click', (e) => {
      e.stopPropagation();
      openTelemetryDrawer();
    });
  }
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  if (btnCloseDrawer && !btnCloseDrawer._boundClose) {
    btnCloseDrawer._boundClose = true;
    btnCloseDrawer.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTelemetryDrawer();
    });
  }
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop && !drawerBackdrop._boundBackdrop) {
    drawerBackdrop._boundBackdrop = true;
    drawerBackdrop.addEventListener('click', () => {
      closeTelemetryDrawer();
    });
  }
  const drawerEl = document.getElementById('telemetry-drawer');
  if (drawerEl && !drawerEl._boundTransition) {
    drawerEl._boundTransition = true;
    drawerEl.addEventListener('transitionend', () => {
      if (drawerEl.classList.contains('open')) {
        drawTelemetryChart();
      }
    });
  }

  const hexTiles = document.querySelectorAll('.hex-tile');
  hexTiles.forEach(tile => {
    if (!tile._boundHexClick) {
      tile._boundHexClick = true;
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        const sensorKey = tile.getAttribute('data-sensor');
        if (sensorKey) {
          openDetailCard(sensorKey, tile);
        }
      });
    }
  });

  const btnCloseDetail = document.getElementById('btn-close-detail');
  if (btnCloseDetail && !btnCloseDetail._boundClose) {
    btnCloseDetail._boundClose = true;
    btnCloseDetail.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDetailCard();
    });
  }

  if (!document._boundOutsideCardClick) {
    document._boundOutsideCardClick = true;
    document.addEventListener('click', (e) => {
      const detailCard = document.getElementById('morph-detail-card');
      if (detailCard && detailCard.style.display !== 'none') {
        const isTile = e.target && (
          (e.target.classList && e.target.classList.contains('hex-tile')) ||
          (e.target.closest && e.target.closest('.hex-tile'))
        );
        let isInsideCard = false;
        if (e.target) {
          if (e.target === detailCard) {
            isInsideCard = true;
          } else if (typeof detailCard.contains === 'function' && detailCard.contains(e.target)) {
            isInsideCard = true;
          } else if (detailCard.querySelectorAll && Array.from(detailCard.querySelectorAll('*')).includes(e.target)) {
            isInsideCard = true;
          }
        }
        if (!isTile && !isInsideCard) {
          if (Date.now() - (window._justPicked3D || 0) < 450) return;
          closeDetailCard();
        }
      }
    });
  }

  if (typeof window !== 'undefined' && !window._boundDigitalTwinResize) {
    window._boundDigitalTwinResize = true;
    window.addEventListener('resize', () => {
      if (window.Garden3D && typeof window.Garden3D.resize === 'function') {
        window.Garden3D.resize();
      }
      drawTelemetryChart();
    });
  }

  if (window.Garden3D && typeof window.Garden3D.setDayNightHour === 'function') {
    const now = new Date();
    window.Garden3D.setDayNightHour(now.getHours() + now.getMinutes() / 60);
  }
}

window.startQuickSpray = startQuickSpray;
window.stopQuickSpray = stopQuickSpray;
window.toggleModeFromCapsule = toggleModeFromCapsule;
window.openTelemetryDrawer = openTelemetryDrawer;
window.closeTelemetryDrawer = closeTelemetryDrawer;
window.openDetailCard = openDetailCard;
window.closeDetailCard = closeDetailCard;
window.renderMiniSparkline = renderMiniSparkline;
window.renderSparkline = renderMiniSparkline;
window.initDigitalTwinWiring = initDigitalTwinWiring;
window.getActiveMorphSensor = () => activeMorphSensor;
window.DashboardController = {
  appState: AppState,
  startQuickSpray,
  stopQuickSpray,
  closeDetailCard,
  closeDrawer: closeTelemetryDrawer,
  openDrawer: openTelemetryDrawer,
  getActiveMorphSensor: () => activeMorphSensor
};

(function initLiveClockAndWeather() {
  function updateLiveClock() {
    const timeEl = document.getElementById('hud-live-time');
    const dateEl = document.getElementById('hud-live-date');
    if (!timeEl && !dateEl) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    if (timeEl) timeEl.textContent = hh + ':' + mm + ':' + ss;

    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  let activeWeatherCity = { name: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297 };
  try {
    const saved = localStorage.getItem('prj_iot_weather_city');
    if (saved) {
      const p = JSON.parse(saved);
      if (p && p.lat && p.lon) activeWeatherCity = p;
    }
  } catch(_) {}

  function fetchLiveWeather(lat, lon, cityName) {
    if (lat != null && lon != null) {
      activeWeatherCity = { name: cityName || 'Custom Location', lat, lon };
    }
    const tempEl = document.getElementById('hud-weather-temp');
    const condEl = document.getElementById('hud-weather-condition');
    const rangeEl = document.getElementById('hud-weather-range');
    const svgWrap = document.getElementById('hud-weather-icon-wrap');
    const locNameEl = document.getElementById('hud-location-name');
    const humEl = document.getElementById('hud-weather-humidity');
    const rainProbEl = document.getElementById('hud-weather-rain-prob');

    if (locNameEl && cityName) locNameEl.textContent = cityName;
    if (!tempEl || !condEl) return;

    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + activeWeatherCity.lat + '&longitude=' + activeWeatherCity.lon + '&current=temperature_2m,relative_humidity_2m,weather_code,is_day&hourly=temperature_2m,relative_humidity_2m,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia%2FHo_Chi_Minh';

    const ac = new AbortController();
    const toId = setTimeout(() => ac.abort(), 8000);

    fetch(url, { signal: ac.signal })
      .then(r => { clearTimeout(toId); return r.json(); })
      .then(data => {
        if (!data || !data.current) return;
        const curTemp = Math.round(data.current.temperature_2m);
        const wCode = data.current.weather_code || 0;
        const isDay = data.current.is_day !== 0;

        let condText = 'Sunny';
        let strokeColor = '#f59e0b';
        let svgIcon = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>';

        if (wCode >= 1 && wCode <= 3) {
          condText = 'Partly Cloudy';
          strokeColor = '#06b6d4';
          svgIcon = '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>';
        } else if (wCode >= 51 && wCode <= 67) {
          condText = 'Rain Showers';
          strokeColor = '#38bdf8';
          svgIcon = '<line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>';
        } else if (wCode >= 45 && wCode <= 48) {
          condText = 'Foggy Mist';
          strokeColor = '#a78bfa';
          svgIcon = '<path d="M5 9h14M3 13h18M7 17h10"></path>';
        }

        tempEl.textContent = curTemp + '\u00B0C';
        condEl.textContent = condText;

        if (svgWrap) {
          svgWrap.innerHTML = '<svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: ' + strokeColor + '; fill: none; stroke-width: 2.2;">' + svgIcon + '</svg>';
        }

        let tMin = curTemp - 3;
        let tMax = curTemp + 4;
        if (data.daily && data.daily.temperature_2m_min && data.daily.temperature_2m_max) {
          tMin = Math.round(data.daily.temperature_2m_min[0]);
          tMax = Math.round(data.daily.temperature_2m_max[0]);
        }
        if (rangeEl) {
          rangeEl.textContent = 'Forecast: ' + tMin + '\u00B0\u2013' + tMax + '\u00B0C';
        }

        if (humEl && data.current.relative_humidity_2m != null) {
          humEl.textContent = Math.round(data.current.relative_humidity_2m) + '%';
        }
        if (rainProbEl && data.daily && data.daily.precipitation_probability_max) {
          rainProbEl.textContent = Math.round(data.daily.precipitation_probability_max[0] || 15) + '%';
        }

        const m08 = document.getElementById('ms-temp-08');
        const m12 = document.getElementById('ms-temp-12');
        const m16 = document.getElementById('ms-temp-16');
        const m20 = document.getElementById('ms-temp-20');
        if (data.hourly && data.hourly.temperature_2m && data.hourly.temperature_2m.length >= 24) {
          if (m08) m08.textContent = Math.round(data.hourly.temperature_2m[8]) + '\u00B0C';
          if (m12) m12.textContent = Math.round(data.hourly.temperature_2m[12]) + '\u00B0C';
          if (m16) m16.textContent = Math.round(data.hourly.temperature_2m[16]) + '\u00B0C';
          if (m20) m20.textContent = Math.round(data.hourly.temperature_2m[20]) + '\u00B0C';
        } else {
          if (m08) m08.textContent = Math.max(16, curTemp - 2) + '\u00B0C';
          if (m12) m12.textContent = Math.max(18, curTemp + 2) + '\u00B0C';
          if (m16) m16.textContent = Math.max(17, curTemp + 1) + '\u00B0C';
          if (m20) m20.textContent = Math.max(15, curTemp - 3) + '\u00B0C';
        }
      })
      .catch(err => {
        const isHighland = (activeWeatherCity.lat > 11.5 && activeWeatherCity.lat < 12.5 && activeWeatherCity.lon > 108.0 && activeWeatherCity.lon < 109.0);
        const isNorth = (activeWeatherCity.lat > 19.0);
        const fallbackTemp = isHighland ? 20 : (isNorth ? 22 : 29);
        tempEl.textContent = fallbackTemp + '\u00B0C';
        condEl.textContent = isHighland ? 'Rain Showers' : 'Partly Cloudy';
        if (rangeEl) rangeEl.textContent = 'Forecast: ' + (fallbackTemp - 3) + '\u00B0\u2013' + (fallbackTemp + 4) + '\u00B0C';
        const m08 = document.getElementById('ms-temp-08');
        const m12 = document.getElementById('ms-temp-12');
        const m16 = document.getElementById('ms-temp-16');
        const m20 = document.getElementById('ms-temp-20');
        if (m08) m08.textContent = (fallbackTemp - 2) + '\u00B0C';
        if (m12) m12.textContent = (fallbackTemp + 2) + '\u00B0C';
        if (m16) m16.textContent = (fallbackTemp + 1) + '\u00B0C';
        if (m20) m20.textContent = (fallbackTemp - 3) + '\u00B0C';
      });
  }
  window.fetchLiveWeather = fetchLiveWeather;

  window.toggleWeatherLocationPicker = function(event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById('sw-location-popover');
    const forecastDropdown = document.getElementById('hud-forecast-dropdown');
    if (forecastDropdown) forecastDropdown.style.display = 'none';
    if (!popover) return;
    popover.style.display = (popover.style.display === 'none' || !popover.style.display) ? 'block' : 'none';
    if (popover.style.display === 'block') {
      const searchInput = document.getElementById('input-weather-search');
      if (searchInput) { searchInput.value = ''; searchInput.focus(); }
    }
  };

  window.selectWeatherCity = function(name, lat, lon) {
    const cleanName = (name || '').replace(/\s*\(.*?\)\s*/g, '').trim() || name;
    activeWeatherCity = { name: cleanName, lat: Number(lat), lon: Number(lon) };
    try { localStorage.setItem('prj_iot_weather_city', JSON.stringify(activeWeatherCity)); } catch(_) {}
    const locName = document.getElementById('hud-location-name');
    if (locName) locName.textContent = cleanName;
    const chips = document.querySelectorAll('#sw-location-quick-chips .sw-loc-chip');
    chips.forEach(c => {
      c.classList.toggle('active', c.textContent.trim().toLowerCase() === cleanName.toLowerCase());
    });
    const popover = document.getElementById('sw-location-popover');
    if (popover) popover.style.display = 'none';
    fetchLiveWeather(lat, lon, cleanName);
    if (typeof fetchWeatherForCity === 'function') {
      fetchWeatherForCity({ name: cleanName, lat: Number(lat), lon: Number(lon) });
    }
  };

  window.onWeatherSearchInput = function(query) {
    const q = (query || '').toLowerCase().trim();
    const chips = document.querySelectorAll('#sw-location-quick-chips .sw-loc-chip');
    chips.forEach(chip => {
      const text = chip.textContent.toLowerCase();
      chip.style.display = (!q || text.includes(q)) ? 'inline-block' : 'none';
    });
  };

  document.addEventListener('click', function(e) {
    const popover = document.getElementById('sw-location-popover');
    const toggle = document.getElementById('sw-location-toggle');
    if (popover && popover.style.display !== 'none') {
      if (!popover.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
        popover.style.display = 'none';
      }
    }
  });

  setTimeout(fetchLiveWeather, 500);
  setInterval(fetchLiveWeather, 30 * 60 * 1000);
})();

function updatePanBadge(val) {
  const badge = document.getElementById('pan-val-badge');
  const slider = document.getElementById('slider-3d-pan');
  const num = parseFloat(val) || 0;
  if (badge) {
    badge.textContent = (num > 0 ? '+' : '') + num.toFixed(1) + 'm';
  }
  if (slider && Math.abs(parseFloat(slider.value) - num) > 0.05) {
    slider.value = num;
  }
}
window.updatePanBadge = updatePanBadge;

function initDraggableStudioBar() {
  const dock = document.getElementById('g3d-studio-dock');
  const bar = document.getElementById('garden3d-micro-bar');
  if (!dock || dock._hasDragInit) return;
  dock._hasDragInit = true;

  let isDragging = false;
  let dragThresholdPassed = false;
  let startX = 0;
  let startY = 0;
  let initialOffsetLeft = 0;
  let initialOffsetTop = 0;

  const onPointerDown = (e) => {

    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

    if (e.target.closest('input[type="range"]')) return;

    startX = e.clientX;
    startY = e.clientY;
    dragThresholdPassed = false;

    const parent = dock.offsetParent || dock.parentElement || document.body;
    const parentRect = parent.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();

    initialOffsetLeft = dockRect.left - parentRect.left;
    initialOffsetTop = dockRect.top - parentRect.top;

    isDragging = true;
    try {
      (e.target || bar || dock).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragThresholdPassed) {
      if (Math.hypot(dx, dy) > 4) {
        dragThresholdPassed = true;
        dock.classList.add('is-dragging');
        dock.style.setProperty('bottom', 'auto', 'important');
        dock.style.setProperty('right', 'auto', 'important');
      } else {
        return;
      }
    }

    const parent = dock.offsetParent || dock.parentElement || document.body;
    const maxLeft = Math.max(10, parent.clientWidth - dock.offsetWidth - 8);
    const maxTop = Math.max(10, parent.clientHeight - dock.offsetHeight - 8);

    const newLeft = Math.max(8, Math.min(maxLeft, initialOffsetLeft + dx));
    const newTop = Math.max(8, Math.min(maxTop, initialOffsetTop + dy));

    dock.style.setProperty('left', newLeft + 'px', 'important');
    dock.style.setProperty('top', newTop + 'px', 'important');
    dock.style.setProperty('bottom', 'auto', 'important');
    dock.style.setProperty('right', 'auto', 'important');
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    dock.classList.remove('is-dragging');
    try {
      (e.target || bar || dock).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  dock.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}
window.initDraggableStudioBar = initDraggableStudioBar;

function updateCapsulePumpButtons() {
  updatePumpTileBar(AppState.isPumpActive, AppState.hardwareConnected);
  const btnStart = document.getElementById('capsule-btn-start');
  const btnStop = document.getElementById('capsule-btn-stop');
  const btnSpray = document.getElementById('btn-quick-spray');
  const isOffline = !AppState.hardwareConnected;
  const isAuto = AppState.systemMode === 'AUTO';
  const liveTank = AppState.telemetry ? AppState.telemetry.tankLevel : null;
  const liveTemp = AppState.telemetry ? AppState.telemetry.airTemperature : null;
  const liveSoil = AppState.telemetry ? AppState.telemetry.soilMoisture : null;
  const isLocked = isOffline || (liveTank == null || liveTank < 20) || (liveTemp != null && liveTemp < 18) || (liveSoil != null && liveSoil > 65);

  if (btnStart) {
    if (isOffline) {
      btnStart.classList.add('disabled', 'disabled-lock');
      btnStart.setAttribute('aria-disabled', 'true');
      btnStart.title = 'Offline: Link hardware device via USB or Bluetooth to actuate pump';
    } else if (isAuto) {
      btnStart.classList.add('disabled', 'disabled-lock');
      btnStart.setAttribute('aria-disabled', 'true');
      btnStart.title = 'Safety Lockout: Switch to MANUAL mode to manually start pump';
    } else if (AppState.isPumpActive || isLocked) {
      btnStart.classList.add('disabled', 'disabled-lock');
      btnStart.setAttribute('aria-disabled', 'true');
      let lockMsg = 'Pump currently active';
      if (liveTank == null || liveTank < 20) lockMsg = 'Locked: Water reservoir critically low (≤ 20%)';
      else if (liveTemp != null && liveTemp < 18) lockMsg = 'Locked: Ambient temperature critically cold (< 18°C)';
      else if (liveSoil != null && liveSoil > 65) lockMsg = 'Locked: Substrate moisture saturated (> 65%)';
      else if (AppState.isRain) lockMsg = 'Locked: Outside rain detected';
      btnStart.title = lockMsg;
    } else {
      btnStart.classList.remove('disabled', 'disabled-lock');
      btnStart.removeAttribute('aria-disabled');
      btnStart.title = 'Start Mist Pump (Manual Mode)';
    }
  }

  if (btnSpray) {
    if (isOffline) {
      btnSpray.classList.add('disabled-lock');
      btnSpray.title = 'Offline: Link hardware device to actuate quick spray';
    } else {
      btnSpray.classList.remove('disabled-lock');
      btnSpray.title = '10s Quick Spray Burst';
    }
  }

  if (btnStop) {
    if (!AppState.isPumpActive) {
      btnStop.classList.add('disabled');
      btnStop.setAttribute('aria-disabled', 'true');
      btnStop.title = 'Pump is currently idle';
    } else {
      btnStop.classList.remove('disabled');
      btnStop.removeAttribute('aria-disabled');
      btnStop.title = 'Stop Mist Pump';
    }
  }
}
window.updateCapsulePumpButtons = updateCapsulePumpButtons;

function handleCapsuleStartPump() {
  if (!AppState.hardwareConnected) {
    showToast('\u26A0\uFE0F Offline: Link hardware device via USB or Bluetooth before starting pump', 'amber');
    if (typeof openConnectModal === 'function') openConnectModal();
    return;
  }
  if (AppState.systemMode === 'AUTO') {
    showToast('\u26A0\uFE0F Safety Lock: Switch system to MANUAL mode to manually actuate pump', 'amber');
    return;
  }

  if (AppState.telemetry.tankLevel == null || AppState.telemetry.tankLevel < 20) {
    showToast('Safety Lockout: Water reservoir below 20% or unavailable.', 'crimson');
    return;
  }
  if (AppState.telemetry.airTemperature != null && AppState.telemetry.airTemperature < 18.0) {
    showToast('Safety Lockout: Ambient temperature below 18.0°C (Cold Cutoff).', 'crimson');
    return;
  }
  if (AppState.telemetry.soilMoisture != null && AppState.telemetry.soilMoisture > 65.0) {
    showToast('Safety Lockout: Substrate moisture above 65.0% (Saturation Cutoff).', 'crimson');
    return;
  }
  if (AppState.isPumpActive) {
    showToast('Pump is already running.', 'info');
    return;
  }
  handleStartPump(true);
  updateCapsulePumpButtons();
}
window.handleCapsuleStartPump = handleCapsuleStartPump;

async function handleCapsuleStopPump() {
  if (!AppState.hardwareConnected) {
    showToast('Hardware is disconnected. Pump control unavailable.', 'amber');
    return;
  }
  if (!AppState.isPumpActive) {
    showToast('Pump is already idle.', 'info');
    return;
  }

  if (!AppState.isSimulated && AppState.systemMode === 'AUTO') {
    const switched = await sendRawSerialCommand('MODE_MANUAL');
    if (!switched) {
      showToast('Unable to switch Arduino to MANUAL. Check the serial connection.', 'crimson');
      return;
    }
    AppState.systemMode = 'MANUAL';
    const modeBadge = document.getElementById('dash-card-mode-badge');
    if (modeBadge) modeBadge.textContent = 'MANUAL';
    const modeBtn = document.getElementById('btn-toggle-mode');
    if (modeBtn) modeBtn.textContent = 'MANUAL';
  } else if (AppState.systemMode === 'AUTO') {
    AppState.systemMode = 'MANUAL';
  }
  executeStopPumpInternal('OPERATOR_STOP');
  updateCapsulePumpButtons();
}
window.handleCapsuleStopPump = handleCapsuleStopPump;

function toggleAccordion(accId) {
  const acc = document.getElementById(accId);
  if (acc) {
    acc.classList.toggle('collapsed');
  }
}
window.toggleAccordion = toggleAccordion;

let farmerWanderTimer = null;
let currentFarmerStation = -1;

function toggleAiChatBot(forceState) {
  const chatCard = document.getElementById('ai-chat-card');
  if (!chatCard) return;
  const isOpening = forceState !== undefined ? Boolean(forceState) : !chatCard.classList.contains('open');

  if (isOpening) {
    chatCard.classList.add('open');
    chatCard.style.display = 'flex';
    document.body.classList.add('chat-is-open');
    if (typeof farmerWanderTimer !== 'undefined' && farmerWanderTimer) clearTimeout(farmerWanderTimer);
    if (typeof setFarmerVisualState === 'function') setFarmerVisualState(false);
  } else {
    chatCard.classList.remove('open');
    chatCard.style.display = 'none';
    document.body.classList.remove('chat-is-open');
    if (typeof startAutonomousFarmerWander === 'function') {
      if (typeof farmerWanderTimer !== 'undefined' && farmerWanderTimer) clearTimeout(farmerWanderTimer);
      farmerWanderTimer = setTimeout(startAutonomousFarmerWander, 3000);
    }
  }

  const companion = document.getElementById('ai-farmer-companion');
  if (companion) {
    companion.style.display = 'flex';
    companion.style.opacity = '1';
    companion.style.pointerEvents = 'auto';
    if (isOpening) {
      companion.classList.add('chat-active');
    } else {
      companion.classList.remove('chat-active');
    }
  }
}
window.toggleAiChatBot = toggleAiChatBot;

function updateFarmerSpeech() {
  const speechText = document.getElementById('farmer-speech-text');
  const speechBubble = document.getElementById('ai-farmer-speech');
  if (!speechText || !speechBubble) return;

  const snap = getRealSystemSnapshot();
  let msg = '';
  if (snap.isRain) {
    msg = 'Rain sensor active! Misting interlock held.';
  } else if (snap.isPump) {
    msg = 'Ultrasonic mist active - pulsing hydration.';
  } else if (parseFloat(snap.soil) < parseFloat(snap.humOn)) {
    msg = 'Soil moisture below threshold. Standby for pulse.';
  } else if (parseFloat(snap.tank) <= 20) {
    msg = 'Low water warning! Reservoir level <= 20%.';
  } else {
    const greetings = [
      'Specimen ' + snap.plantName + ' nominal.',
      'Soil hydration steady at ' + snap.soil + '%.',
      'Microclimate: ' + snap.temp + ' C, ' + snap.hum + '% RH.',
      'Click me to consult Dr. Flora Copilot!'
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  }

  speechText.textContent = msg;
  speechBubble.classList.add('is-visible');
  setTimeout(() => {
    speechBubble.classList.remove('is-visible');
  }, 4500);
}
window.updateFarmerSpeech = updateFarmerSpeech;

function clearAiChatHistory() {
  const msgs = document.getElementById('ai-chat-messages');
  if (!msgs) return;
  msgs.innerHTML = `
    <div class="ai-msg ai-msg-bot">
      <div class="ai-msg-bubble">
        Hello! I am Dr. Flora, your digital agronomist copilot. Chat history has been reset. How may I assist your terrarium today?
      </div>
      <span class="ai-msg-time">Just now</span>
    </div>
  `;
  if (typeof showToast === 'function') showToast('AI chat history reset', 'info');
}
window.clearAiChatHistory = clearAiChatHistory;

function appendAiChatMessage(sender, text, action) {
  const msgs = document.getElementById('ai-chat-messages');
  if (!msgs) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-msg ai-msg-' + sender;

  const bubble = document.createElement('div');
  bubble.className = 'ai-msg-bubble';
  bubble.innerHTML = text;
  msgDiv.appendChild(bubble);

  if (action && action.label && action.callback) {
    const btn = document.createElement('button');
    btn.className = 'ai-action-btn';
    btn.style.cssText = 'margin-top: 6px; padding: 4px 10px; font-size: 11px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; color: #10B981; cursor: pointer;';
    btn.textContent = action.label;
    btn.onclick = action.callback;
    msgDiv.appendChild(btn);
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'ai-msg-time';
  const now = new Date();
  timeSpan.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  msgDiv.appendChild(timeSpan);

  msgs.appendChild(msgDiv);
  msgs.scrollTop = msgs.scrollHeight;
}
window.appendAiChatMessage = appendAiChatMessage;

function saveFloraApiKey() {
  const keyInput = document.getElementById('flora-api-key-input') || document.getElementById('input-flora-api-key');
  const select = document.getElementById('flora-model-select') || document.getElementById('select-flora-model');
  if (!keyInput) return;
  const key = keyInput.value.trim();
  const sub = document.getElementById('ai-status-sub');
  if (key) {
    localStorage.setItem('flora_gemini_api_key', key);
    localStorage.setItem('flora_llm_api_key', key);
    if (select) localStorage.setItem('flora_llm_model', select.value);
    if (typeof showToast === 'function') showToast('Saved Dr. Flora API key and model!', 'success');
    toggleAiLlmSettings();
    if (sub) sub.innerHTML = '<span class="beacon-dot online" style="width: 5px; height: 5px; display: inline-block; margin-right: 4px;"></span>LLM Active (' + (select ? select.value : 'Gemini') + ')';
  } else {
    localStorage.removeItem('flora_gemini_api_key');
    localStorage.removeItem('flora_llm_api_key');
    if (typeof showToast === 'function') showToast('Switched to local digital agronomist intelligence.', 'info');
    toggleAiLlmSettings();
    if (sub) sub.innerHTML = '<span class="beacon-dot online" style="width: 5px; height: 5px; display: inline-block; margin-right: 4px;"></span>Local Agronomist Intelligence';
  }
}
window.saveFloraApiKey = saveFloraApiKey;

function toggleAiLlmSettings() {
  const panel = document.getElementById('flora-llm-settings-panel') || document.getElementById('ai-llm-settings-panel');
  if (!panel) return;
  const isHidden = (panel.style.display === 'none' || !panel.style.display);
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    const keyInput = document.getElementById('flora-api-key-input') || document.getElementById('input-flora-api-key');
    if (keyInput) {
      keyInput.value = localStorage.getItem('flora_llm_api_key') || localStorage.getItem('flora_gemini_api_key') || '';
      keyInput.focus();
    }
  }
}
window.toggleAiLlmSettings = toggleAiLlmSettings;

function normalizeAiText(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

function getCurrentRoleCode() {
  const roleEl = document.getElementById('user-role-badge') || document.querySelector('.user-role');
  if (roleEl && roleEl.textContent) {
    const txt = roleEl.textContent.toUpperCase();
    if (txt.includes('ADMIN')) return 'ADMIN';
    if (txt.includes('STAFF')) return 'STAFF';
    if (txt.includes('VIEWER')) return 'VIEWER';
  }
  return (window.AppState && window.AppState.userRole) ? window.AppState.userRole : 'ADMIN';
}

function getRealSystemSnapshot() {
  const isOnline = Boolean(window.AppState && (window.AppState.hardwareConnected || window.AppState.isSimulated));

  const soilEl = document.getElementById('stat-soil-hum') || document.querySelector('.hex-tile[data-sensor="soil"] .hex-val');
  const tankEl = document.getElementById('stat-water-lvl') || document.querySelector('.hex-tile[data-sensor="water"] .hex-val');
  const tempEl = document.getElementById('stat-temp') || document.querySelector('.hex-tile[data-sensor="temperature"] .hex-val');
  const humEl = document.getElementById('stat-air-hum') || document.querySelector('.hex-tile[data-sensor="humidity"] .hex-val');
  const rainEl = document.getElementById('stat-rain-state');
  const pumpEl = document.getElementById('stat-pump-state');
  const modeBtn = document.getElementById('btn-toggle-mode');
  const plantEl = document.getElementById('active-plant-specimen');

  const soil = soilEl ? (soilEl.textContent.trim().replace(/[^0-9.]/g, '') || '58.0') : '58.0';
  const tank = tankEl ? (tankEl.textContent.trim().replace(/[^0-9.]/g, '') || '85.0') : '85.0';
  const temp = tempEl ? (tempEl.textContent.trim().replace(/[^0-9.]/g, '') || '24.5') : '24.5';
  const hum = humEl ? (humEl.textContent.trim().replace(/[^0-9.]/g, '') || '68.0') : '68.0';

  const isRain = rainEl ? (rainEl.textContent.toLowerCase().includes('rain') || rainEl.textContent.toLowerCase().includes('wet')) : false;
  const isPump = pumpEl ? (pumpEl.textContent.toLowerCase().includes('on') || pumpEl.textContent.toLowerCase().includes('active') || pumpEl.textContent.toLowerCase().includes('mist')) : false;

  const mode = (modeBtn && modeBtn.textContent.includes('MANUAL')) ? 'MANUAL' : 'AUTO';
  const plantName = plantEl ? plantEl.textContent.trim() : 'Ludisia discolor (Jewel Orchid)';

  let humOn = '55';
  let humOff = '75';
  const envThresh = document.getElementById('plant-thresh-envelope');
  if (envThresh && envThresh.textContent) {
    const parts = envThresh.textContent.match(/\d+/g);
    if (parts && parts.length >= 2) {
      humOn = parts[0];
      humOff = parts[1];
    }
  }

  const tempNum = parseFloat(temp) || 24;
  const humNum = parseFloat(hum) || 70;
  const svp = 0.61078 * Math.exp((17.27 * tempNum) / (tempNum + 237.3));
  const avp = svp * (humNum / 100);
  const vpd = Math.max(0, (svp - avp)).toFixed(2);

  return {
    isOnline: isOnline,
    soil: soil,
    tank: tank,
    temp: temp,
    hum: hum,
    isRain: isRain,
    isPump: isPump,
    mode: mode,
    plantName: plantName,
    humOn: humOn,
    humOff: humOff,
    vpd: vpd,
    userRole: getCurrentRoleCode()
  };
}

function generateIntelligentAgronomistReply(userQuery) {
  const norm = normalizeAiText(userQuery);
  const snap = getRealSystemSnapshot();
  const safeQuery = String(userQuery).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const isOnline = snap.isOnline;
  const soil = snap.soil;
  const tank = snap.tank;
  const temp = snap.temp;
  const hum = snap.hum;
  const isRain = snap.isRain;
  const isPump = snap.isPump;
  const mode = snap.mode;
  const plantName = snap.plantName;
  const humOn = snap.humOn;
  const humOff = snap.humOff;
  const vpd = snap.vpd;
  const userRole = snap.userRole;

  let roleNotice = '';
  if (userRole === 'ADMIN') {
    roleNotice = 'Authorization: You are logged in as ADMINISTRATOR with full governance across SCADA controls, threshold calibration, and user account management.';
  } else if (userRole === 'STAFF') {
    roleNotice = 'Authorization: You are logged in as STAFF Operator with actuation and telemetry monitoring clearance. System-level administration requires Administrator role.';
  } else {
    roleNotice = 'Authorization: You are logged in as VIEWER (read-only telemetry observer). Actuation commands and threshold edits are restricted to Staff and Administrators.';
  }

  if (/^(hi|hello|hey|greetings|good\s+morning|good\s+afternoon|good\s+evening|chao|xin\s+chao)\b/i.test(norm)) {
    return {
      text: '<strong>Dr. Flora Technical Assistant Online</strong><br>' +
            'Terrarium Ecosystem Status: Nominal.<br>' +
            '&bull; Current Specimen: ' + plantName + '<br>' +
            '&bull; Soil Hydration: <strong>' + soil + '%</strong> (Target Envelope: ' + humOn + '% - ' + humOff + '%)<br>' +
            '&bull; Water Reservoir: <strong>' + tank + '%</strong><br>' +
            '&bull; Chamber Temperature: <strong>' + temp + ' C</strong> | Humidity: <strong>' + hum + '% RH</strong><br>' +
            '&bull; ' + roleNotice + '<br><br>' +
            'How may I assist you with system telemetry, actuation procedures, or botanical parameters?'
    };
  }

  if (/\b(system\s+have|what\s+does\s+the\s+system\s+have|what\s+do\s+you\s+have|components|hardware|inventory|devices|parts|modules|architecture|he\s+thong\s+co\s+gi|co\s+nhung\s+gi|linh\s+kien|thiet\s+bi|cau\s+truc|kien\s+truc)\b/i.test(norm) ||
      (norm.includes('system') && (norm.includes('have') || norm.includes('contain') || norm.includes('include') || norm.includes('consist') || norm.includes('feature') || norm.includes('structure') || norm.includes('component')))) {
    return {
      text: '<strong>Smart Misting SCADA System Architecture & Inventory</strong><br><br>' +
            'The Smart Misting Terrarium ecosystem comprises integrated industrial IoT and agronomic layers:<br><br>' +
            '<strong>1. Embedded Microcontroller Core:</strong><br>' +
            '&bull; <strong>Arduino Uno R3 (ATmega328P):</strong> Dedicated real-time controller executing sensor sampling at 1000ms intervals, safety interlocks, and relay PWM control.<br><br>' +
            '<strong>2. Multi-Parameter Sensor Suite:</strong><br>' +
            '&bull; <strong>Substrate Moisture Sensor (Analog Pin A0):</strong> Volumetric water content monitor for soil saturation (current: ' + soil + '%).<br>' +
            '&bull; <strong>Ultrasonic/Liquid Level Probe (Pin 7):</strong> Hydrostatic depth monitor for water tank reserves (current: ' + tank + '%).<br>' +
            '&bull; <strong>DHT11 / DHT22 Microclimate Sensor (Pin 2):</strong> Digital chamber air temperature (' + temp + ' C) and relative humidity (' + hum + '% RH).<br>' +
            '&bull; <strong>Atmospheric Rain Sensor (Analog Pin A1):</strong> External weather canopy rain detection with automatic safety lockout.<br><br>' +
            '<strong>3. Actuation & Hydraulics:</strong><br>' +
            '&bull; <strong>DC Diaphragm Water Pump:</strong> High-pressure mist atomizing pump driven via an Optocoupled 5V Relay (Digital Pin 8) with dry-run protection.<br><br>' +
            '<strong>4. Interfaces & Visualization:</strong><br>' +
            '&bull; <strong>16x2 I2C Character LCD:</strong> Local equipment display providing instant telemetric diagnostics.<br>' +
            '&bull; <strong>3D Digital Twin Viewport:</strong> Interactive Three.js spatial model with component picking, auto-orbit, and camera focus.<br>' +
            '&bull; <strong>Bio-Telemetry Horizon Deck:</strong> Real-time spline charts (24h/6h/1h) with CSV audit export.<br>' +
            '&bull; <strong>Dr. Flora Agronomist Copilot:</strong> Role-aware intelligent agronomic advisory engine.'
    };
  }

  if (/\b(user\s+guide|how\s+to|guide|manual|tutorial|instructions|how\s+do\s+i|how\s+to\s+use|how\s+to\s+operate|operation|huong\s+dan|cach\s+dung|cach\s+su\s+dung)\b/i.test(norm)) {
    return {
      text: '<strong>Operator Guide | Smart Misting SCADA Interface</strong><br><br>' +
            'Follow these standardized operational procedures:<br><br>' +
            '<strong>1. Connection & Initialization:</strong><br>' +
            '&bull; Physical Mode: Connect Arduino Uno via USB, click top-bar Connect and select the serial COM port (115200 baud).<br>' +
            '&bull; Simulation Mode: If hardware is disconnected, toggle Demo Sim to inspect full telemetry streaming.<br><br>' +
            '<strong>2. Automation & Control Modes:</strong><br>' +
            '&bull; <strong>AUTO Mode:</strong> System automatically fires misting when soil moisture drops below ' + humOn + '% and terminates when reaching ' + humOff + '%. Requires tank level > 15%.<br>' +
            '&bull; <strong>MANUAL Mode:</strong> Click START to run manual misting or press Quick-Spray (10s pulse). Press STOP anytime for immediate cutoff.<br><br>' +
            '<strong>3. 3D Digital Twin Navigation:</strong><br>' +
            '&bull; Left-click drag to orbit 360 degrees. Right-click drag to pan. Scroll to zoom.<br>' +
            '&bull; Click directly on any 3D component (Arduino, Pump, Water Tank, Soil Sensor, LCD) or telemetry hexagon to inspect real-time diagnostics.<br><br>' +
            '<strong>4. Historical Trends & Telemetry Deck:</strong><br>' +
            '&bull; Click the "Telemetry" button to open the sliding telemetry drawer with multi-channel spline charts and CSV log export.<br><br>' +
            '<strong>5. Current Clearance:</strong><br>' +
            '&bull; ' + roleNotice
    };
  }

  if (/\b(add\s+user|create\s+user|user\s+account|accounts|rbac|user\s+list|change\s+password|user\s+management|tai\s+khoan|phan\s+quyen|mat\s+khau)\b/i.test(norm) && !norm.includes('guide') && !norm.includes('huong dan')) {
    return {
      text: '<strong>User Governance & Access Control (RBAC)</strong><br><br>' +
            '&bull; ' + roleNotice + '<br><br>' +
            '<strong>System Role Hierarchy:</strong><br>' +
            '&bull; <strong>ADMIN:</strong> Unrestricted governance. Add/edit/deactivate operator accounts, calibrate agronomic threshold limits, trigger manual actuation, and export compliance logs.<br>' +
            '&bull; <strong>STAFF:</strong> Operational clearance. Toggle Auto/Manual modes, fire manual misting, acknowledge alerts, and monitor microclimate vitals.<br>' +
            '&bull; <strong>VIEWER:</strong> Read-only observer. Access telemetry dashboards, 3D digital twin, and Dr. Flora advisory without command authority.<br><br>' +
            'To administer accounts, navigate to the User Directory tab on the left navigation bar.'
    };
  }

  if (/\b(who\s+are\s+you|what\s+are\s+you|about\s+yourself|dr\s+flora|what\s+can\s+you\s+do|ban\s+la\s+ai|gioi\s+thieu)\b/i.test(norm)) {
    return {
      text: '<strong>Dr. Flora | SCADA Botanical Intelligence Agent</strong><br>' +
            'I am the specialized agronomic and operational AI copilot for this automated terrarium.<br>' +
            '&bull; Primary Function: Real-time sensor auditing, microclimate optimization, VPD calculation, and hydraulic safety interlocks.<br>' +
            '&bull; Specimen Under Care: <strong>' + plantName + '</strong>.<br>' +
            '&bull; ' + roleNotice + '<br><br>' +
            'Ask me about live soil hydration, reservoir capacity, misting schedules, plant requirements, or system components.'
    };
  }

  if (/\b(time|clock|date|today|hour|what\s+time|may\s+gio|thoi\s+gian)\b/i.test(norm)) {
    const now = new Date();
    return {
      text: '<strong>System Master Clock & Photoperiod Audit</strong><br>' +
            '&bull; Host Server Time: <strong>' + now.toLocaleTimeString() + '</strong> (' + now.toLocaleDateString() + ')<br>' +
            '&bull; Active Photoperiod Phase: ' + (now.getHours() >= 6 && now.getHours() < 18 ? 'Diurnal (Daylight Cycle - Full Transpiration)' : 'Nocturnal (Dark Period - Reduced Evaporative Loss)') + '<br>' +
            '&bull; Recommended Diurnal Envelope: Soil 55-75%, Air RH 60-80%, Temp 20-28 C.'
    };
  }

  if (/\b(safety|interlock|lockout|cutoff|locked|cannot\s+spray|cannot\s+mist|troubleshoot|overpressure|watchdog|khoa\s+an\s+toan|tai\s+sao\s+khoa)\b/i.test(norm)) {
    let reasons = [];
    if (isRain) reasons.push('Rain Sensor Lockout: Ambient canopy precipitation active. Mist held to avoid root saturation.');
    if (parseFloat(tank) <= 20) reasons.push('Dry-Run Lockout: Reservoir level (' + tank + '%) is at or below the 20% critical cutoff threshold.');
    if (parseFloat(soil) >= parseFloat(humOff)) reasons.push('Hydration Saturation Cutoff: Soil moisture (' + soil + '%) is already at or above the upper limit (' + humOff + '%).');
    if (mode === 'AUTO' && parseFloat(soil) > parseFloat(humOn)) reasons.push('Auto Hold: Soil moisture (' + soil + '%) is within healthy envelope (trigger is below ' + humOn + '%).');

    return {
      text: '<strong>Safety Interlock & Actuator Diagnostics</strong><br>' +
            (reasons.length > 0 ?
              reasons.map(r => '&bull; ' + r).join('<br>') :
              '&bull; All safety interlocks are CLEAR. Actuator relay is ready for manual or autonomous operation.') +
            '<br><br>&bull; Operating Mode: <strong>' + mode + '</strong> | Relay Status: <strong>' + (isPump ? 'PUMPING' : 'IDLE') + '</strong>.'
    };
  }

  if (/\b(mode|auto\s+mode|manual\s+mode|switch\s+mode|operating\s+mode|toggle\s+mode|che\s+do|tu\s+dong|thu\s+cong)\b/i.test(norm)) {
    return {
      text: '<strong>Operating Mode State: ' + mode + '</strong><br>' +
            '&bull; Current Configuration: ' + (mode === 'AUTO' ?
              'Autonomous closed-loop microclimate regulation. Mist pump triggers when Soil Moisture drops below ' + humOn + '% and ceases at ' + humOff + '%.' :
              'Manual operator override. The mist pump operates strictly via manual START/STOP actuation or Quick Spray pulses.') +
            '<br>&bull; ' + roleNotice
    };
  }

  if (/\b(pump|mist|misting|spray|nozzle|ultrasonic|actuate|actuation|may\s+bom|phun\s+suong|tuoi\s+cay|tuoi\s+nuoc)\b/i.test(norm)) {
    return {
      text: '<strong>Ultrasonic Mist Actuation Diagnostic</strong><br>' +
            '&bull; Pump State: <strong>' + (isPump ? 'ACTIVE (Pumping)' : 'IDLE (Standby)') + '</strong><br>' +
            '&bull; Current Soil Hydration: <strong>' + soil + '%</strong> (Target Threshold: ' + humOn + '% - ' + humOff + '%)<br>' +
            '&bull; Reservoir Water Level: <strong>' + tank + '%</strong><br>' +
            '&bull; Rain Interlock Status: <strong>' + (isRain ? 'LOCKED (Rain active)' : 'CLEAR') + '</strong><br>' +
            '&bull; ' + roleNotice
    };
  }

  if (/\b(arduino|uno|webserial|baud|serial\s*port|com\s*\d+|com\s*port|demo\s*sim|simulation|simulator|phan\s*cung)\b/i.test(norm)) {
    return {
      text: '<strong>Embedded Hardware Diagnostic: Arduino Uno R3</strong><br>' +
            '&bull; Microcontroller: ATmega328P @ 16MHz<br>' +
            '&bull; Firmware Protocol: Smart Misting Telemetry Protocol at 115200 Baud<br>' +
            '&bull; Communication Link: <strong>' + (isOnline ? 'ONLINE & SYNCHRONIZED' : 'OFFLINE / SIMULATION MODE') + '</strong><br>' +
            '&bull; Pin Assignments: Soil Moisture (A0), Rain Sensor (A1), DHT Sensor (D2), Ultrasonic Echo/Trig (D7), Relay (D8), I2C LCD (A4/A5).'
    };
  }

  if (/\b(soil|substrate|hydration|do\s+am\s+dat|gia\s+the)\b/i.test(norm)) {
    const sVal = parseFloat(soil) || 58;
    const low = parseFloat(humOn) || 55;
    const high = parseFloat(humOff) || 75;
    let status = 'OPTIMAL';
    if (sVal < low) status = 'DEFICIT (Dry - Action Recommended)';
    else if (sVal > high) status = 'SATURATED (High)';

    return {
      text: '<strong>Substrate Moisture Diagnostic</strong><br>' +
            '&bull; Measured Hydration: <strong>' + soil + '%</strong><br>' +
            '&bull; Target Envelope: <strong>' + low + '% - ' + high + '%</strong><br>' +
            '&bull; Substrate Health Evaluation: <strong>' + status + '</strong><br>' +
            '&bull; Recommendation: ' + (sVal < low ? 'Initiate mist cycle or permit AUTO regulation to restore root zone moisture.' : 'Substrate moisture is sufficient. Maintain current photoperiod.')
    };
  }

  if (/\b(water\s+tank|reservoir|tank\s+level|refill|water\s+level|binh\s+nuoc|muc\s+nuoc|het\s+nuoc)\b/i.test(norm)) {
    const tVal = parseFloat(tank) || 85;
    let alert = '';
    if (tVal <= 20) {
      alert = '<span style="color:#EF4444; font-weight:700;">CRITICAL: Reservoir water is at or below 20%. Misting is automatically locked to protect the pump from dry running. Please refill tank!</span>';
    } else if (tVal <= 40) {
      alert = '<span style="color:#F59E0B; font-weight:700;">WARNING: Reservoir level is moderate (' + tank + '%). Prepare to refill soon.</span>';
    } else {
      alert = '<span style="color:#10B981; font-weight:700;">Reservoir capacity is ample (' + tank + '%). Sufficient for ongoing autonomous cycles.</span>';
    }

    return {
      text: '<strong>Reservoir Tank Diagnostics</strong><br>' +
            '&bull; Current Reservoir Level: <strong>' + tank + '%</strong><br>' +
            '&bull; Safety Cutoff Limit: <strong>20%</strong><br>' +
            '&bull; Reservoir Status: ' + alert
    };
  }

  if (/\b(temp|temperature|air\s+humidity|humidity|vpd|microclimate|vapor\s+pressure|nhiet\s+do|khi\s+hau)\b/i.test(norm)) {
    return {
      text: '<strong>Terrarium Atmospheric Microclimate Diagnostic</strong><br>' +
            '&bull; Chamber Temperature: <strong>' + temp + ' C</strong> (Target: 22 - 28 C)<br>' +
            '&bull; Ambient Relative Humidity: <strong>' + hum + '% RH</strong> (Target: 60 - 80% RH)<br>' +
            '&bull; Vapor Pressure Deficit (VPD): <strong>' + vpd + ' kPa</strong> (Target: 0.6 - 1.2 kPa for orchids)<br>' +
            '&bull; Transpiration Rate Assessment: ' + (parseFloat(vpd) < 0.6 ? 'Low (Risk of fungal stagnation)' : (parseFloat(vpd) > 1.2 ? 'High (Risk of moisture stress)' : 'Nominal (Healthy stomatal conductance)'))
    };
  }

  if (/\b(rain|raining|precipitation|raindrop|canopy\s+moisture|cam\s+bien\s+mua|troi\s+mua|mua\s+khong)\b/i.test(norm)) {
    return {
      text: '<strong>Canopy Rain Sensor Telemetry</strong><br>' +
            '&bull; Precipitation Status: <strong>' + (isRain ? 'RAIN DETECTED' : 'CLEAR / DRY') + '</strong><br>' +
            '&bull; Safety Policy: ' + (isRain ?
              'Precipitation interlock engaged. Misting is inhibited to prevent over-saturation and root rot.' :
              'Canopy is dry. Misting operates freely according to substrate moisture.')
    };
  }

  if (/\b(plant|species|ludisia|discolor|orchid|boston\s+fern|moth\s+orchid|botany|botanical|foliage|turgor|lan\s+gam)\b/i.test(norm)) {
    return {
      text: '<strong>Botanical Profile: ' + plantName + '</strong><br>' +
            '&bull; Natural Habitat: Subtropical montane evergreen forest floor.<br>' +
            '&bull; Substrate Moisture Range: <strong>' + humOn + '% - ' + humOff + '%</strong> (Currently: ' + soil + '%)<br>' +
            '&bull; Ambient Humidity Requirement: <strong>60% - 80% RH</strong> (Currently: ' + hum + '%)<br>' +
            '&bull; Photoperiod & Light: Filtered diffused light (avoid direct solar scorch).<br>' +
            '&bull; Care Protocol: Keep substrate consistently humid without standing water stagnation.'
    };
  }

  if (/\b(chart|graph|spline|telemetry\s+horizon|export|csv|bieu\s+do)\b/i.test(norm)) {
    return {
      text: '<strong>Bio-Telemetry Horizon & Data Logging Deck</strong><br>' +
            '&bull; Active Horizons: 24h, 6h, and 1h rolling time windows.<br>' +
            '&bull; Monitored Channels: Soil Hydration (Green), Reservoir Tank (Cyan), Air Relative Humidity (Purple), Chamber Temp (Orange).<br>' +
            '&bull; Compliance Export: Operators can click "Export" on the Telemetry Deck to download a structured CSV file of all sensory datapoints for audit review.'
    };
  }

  if (/\b(history|audit\s+log|audit\s+trail|records|lich\s+su)\b/i.test(norm)) {
    return {
      text: '<strong>SCADA Audit Log & Historical Telemetry Registry</strong><br>' +
            '&bull; Sensor Sample Frequency: 1000ms<br>' +
            '&bull; Recorded Metrics: Timestamp, Soil (%), Tank (%), Air RH (%), Temp (C), Actuator State (ON/OFF).<br>' +
            '&bull; Storage Architecture: Local in-memory ring buffer with persistent database ingestion for historical queries.'
    };
  }

  if (/\b(status|overview|system\s+state|summary|telemetry|dashboard|how\s+is\s+everything|tong\s+quan|tinh\s+hinh|tinh\s+trang)\b/i.test(norm)) {
    return {
      text: '<strong>Overall SCADA System Status & Telemetry Summary</strong><br><br>' +
            '&bull; Specimen Under Cultivation: <strong>' + plantName + '</strong><br>' +
            '&bull; Soil Moisture: <strong>' + soil + '%</strong> (Envelope: ' + humOn + '% - ' + humOff + '%)<br>' +
            '&bull; Water Reservoir: <strong>' + tank + '%</strong><br>' +
            '&bull; Ambient Atmosphere: <strong>' + temp + ' C</strong> | <strong>' + hum + '% RH</strong> (VPD: ' + vpd + ' kPa)<br>' +
            '&bull; Actuator (Mist Pump): <strong>' + (isPump ? 'PUMPING' : 'IDLE') + '</strong> | Mode: <strong>' + mode + '</strong><br>' +
            '&bull; Safety Interlocks: <strong>' + (isRain ? 'RAIN LOCKOUT ACTIVE' : (parseFloat(tank) <= 20 ? 'LOW WATER LOCKOUT' : 'ALL CLEAR')) + '</strong><br>' +
            '&bull; Microcontroller Link: <strong>' + (isOnline ? 'CONNECTED' : 'STANDBY') + '</strong><br>' +
            '&bull; ' + roleNotice
    };
  }

  const mathMatch = userQuery.match(/^([0-9.\s+\-*\/()]+)$/);
  if (mathMatch) {
    try {
      const sanitized = mathMatch[1].replace(/[^0-9.\s+\-*\/()]/g, '');
      const calcResult = Function('"use strict";return (' + sanitized + ')')();
      if (!isNaN(calcResult) && isFinite(calcResult)) {
        return {
          text: '<strong>Calculation Result:</strong><br>' +
                'Formula: <code>' + sanitized + '</code><br>' +
                'Computed Value: <strong>' + calcResult + '</strong>'
        };
      }
    } catch (e) {}
  }

  return {
    text: '<strong>Out-of-Scope Query Notice</strong><br>' +
          'The inquiry <em>"' + safeQuery + '"</em> is outside the operational scope of the Smart Misting SCADA & Botanical Intelligence System.<br><br>' +
          'I am specialized exclusively in assisting you with:<br>' +
          '&bull; Real-time IoT microclimate telemetry (Soil Moisture, Reservoir Capacity, Air Humidity, Temperature, VPD)<br>' +
          '&bull; SCADA automation protocols, operating modes (AUTO vs MANUAL), and actuator mist pumping commands<br>' +
          '&bull; Hardware diagnostics for Arduino Uno, sensors, and safety interlocks<br>' +
          '&bull; Botanical care and environmental envelopes for terrarium plants (' + plantName + ')<br><br>' +
          'Please choose a topic above or try one of the quick suggestions: <strong>Health Audit</strong>, <strong>Mist Advice</strong>, <strong>Microclimate</strong>, or <strong>Pump Check</strong>.'
  };
}

async function handleAiChatSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const userText = input.value.trim();
  if (!userText) return;

  appendAiChatMessage('user', userText);
  input.value = '';

  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) indicator.style.display = 'flex';

  const snap = getRealSystemSnapshot();
  const apiKey = localStorage.getItem('flora_gemini_api_key');
  const selectedModel = (document.getElementById('flora-model-select') && document.getElementById('flora-model-select').value) || 'gemini-1.5-flash';

  if (apiKey) {
    try {
      const promptContext =
        'You are Dr. Flora, the technical digital agronomist and SCADA assistant for the Smart Misting IoT Terrarium (Group 5 PRJ301).\n' +
        'Current Live Telemetry:\n' +
        '- Active Specimen: ' + snap.plantName + ' (Envelope: ' + snap.humOn + '% - ' + snap.humOff + '%)\n' +
        '- User Role: ' + snap.userRole + '\n' +
        '- Substrate Soil Moisture: ' + snap.soil + '%\n' +
        '- Reservoir Water Level: ' + snap.tank + '% (Low cutoff limit: <= 20%)\n' +
        '- Chamber Temperature: ' + snap.temp + ' C\n' +
        '- Air Humidity: ' + snap.hum + '% RH\n' +
        '- Ultrasonic Mist Pump: ' + (snap.isPump ? 'ACTIVE' : 'IDLE') + '\n' +
        '- Operating Mode: ' + snap.mode + '\n' +
        '- Microcontroller Link: ' + (snap.isOnline ? 'CONNECTED' : 'STANDBY/OFFLINE') + '\n' +
        '- Rain Sensor: ' + (snap.isRain ? 'RAIN DETECTED (Lockout active)' : 'CLEAR') + '\n\n' +
        'CRITICAL INSTRUCTIONS:\n' +
        '1. Respond STRICTLY in fluent, scientific, clear English. Do NOT use any emojis, icons, or decorative symbols.\n' +
        '2. Answer the user query directly and accurately with real telemetry values.\n' +
        '3. Adapt to the user role (' + snap.userRole + '). For ADMIN detail full system governance; for STAFF detail operational procedures; for VIEWER clarify read-only observer limitations when asked about controls.\n' +
        '4. If the user query is outside the operational scope of this IoT terrarium system (e.g. personal chat, unrelated food/places/news), state clearly: "This inquiry is outside the operational scope of the Smart Misting SCADA and Botanical Intelligence System." and guide them to terrarium topics.\n\n' +
        'User Query: "' + userText + '"';

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + selectedModel + ':generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptContext }] }]
        })
      });

      if (indicator) indicator.style.display = 'none';

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (reply) {
          const cleanReply = reply.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u26A0\uFE0F|\u2705|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g, '');
          appendAiChatMessage('bot', cleanReply.replace(/\n/g, '<br>'));
          return;
        }
      }
    } catch (err) {
      console.warn('Gemini LLM fetch failed, falling back to local agronomist:', err);
    }
  }

  setTimeout(() => {
    if (indicator) indicator.style.display = 'none';
    const response = generateIntelligentAgronomistReply(userText);
    appendAiChatMessage('bot', response.text, response.action);
  }, 450);
}
window.handleAiChatSubmit = handleAiChatSubmit;

function sendAiQuickPrompt(topic) {
  toggleAiChatBot(true);
  const snap = getRealSystemSnapshot();
  const plantName = snap.plantName;
  const soil = snap.soil;
  const tank = snap.tank;
  const temp = snap.temp;
  const hum = snap.hum;
  const isRain = snap.isRain;
  const isPump = snap.isPump;
  const mode = snap.mode;
  const humOn = snap.humOn;
  const humOff = snap.humOff;
  const isOnline = snap.isOnline;

  if (topic === 'health') {
    appendAiChatMessage('user', 'Health Audit');
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.style.display = 'flex';
    setTimeout(() => {
      if (indicator) indicator.style.display = 'none';
      const sVal = parseFloat(soil);
      const isHealthy = sVal >= parseFloat(humOn) && sVal <= parseFloat(humOff);
      appendAiChatMessage('bot',
        '<strong>Terrarium Health Audit Report</strong><br>' +
        '&bull; Botanical Subject: ' + plantName + '<br>' +
        '&bull; Microclimate Balance: Temp ' + temp + ' C | Humidity ' + hum + '% RH<br>' +
        '&bull; Substrate Status: ' + soil + '% (' + (isHealthy ? 'Nominal root hydration' : 'Moisture deficit detected') + ')<br>' +
        '&bull; Reservoir Reserve: ' + tank + '%<br>' +
        '&bull; Overall Diagnosis: <strong>' + (isHealthy ? 'EXCELLENT' : 'MONITOR CLOSELY') + '</strong>'
      );
    }, 450);
  } else if (topic === 'mist' || topic === 'irrigation') {
    appendAiChatMessage('user', 'Mist Advice');
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.style.display = 'flex';
    setTimeout(() => {
      if (indicator) indicator.style.display = 'none';
      let advice = '';
      if (isRain) {
        advice = 'Precipitation detected by rain sensor. Misting suspended to avoid root rot.';
      } else if (parseFloat(soil) < parseFloat(humOn)) {
        advice = 'Soil moisture (' + soil + '%) is below target (' + humOn + '%). Recommend automated mist pulse or manual Quick-Spray.';
      } else {
        advice = 'Soil moisture is optimal (' + soil + '%). No misting required at this time.';
      }
      appendAiChatMessage('bot',
        '<strong>Agronomic Misting Advisory</strong><br>' +
        '&bull; Recommendation: ' + advice + '<br>' +
        '&bull; Active Mode: ' + mode + ' | Target Envelope: ' + humOn + '% - ' + humOff + '%'
      );
    }, 450);
  } else if (topic === 'microclimate') {
    appendAiChatMessage('user', 'Microclimate');
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.style.display = 'flex';
    setTimeout(() => {
      if (indicator) indicator.style.display = 'none';
      appendAiChatMessage('bot',
        '<strong>Chamber Atmospheric Vitals</strong><br>' +
        '&bull; Temperature: <strong>' + temp + ' C</strong><br>' +
        '&bull; Air Humidity: <strong>' + hum + '% RH</strong><br>' +
        '&bull; Substrate Moisture: <strong>' + soil + '%</strong><br>' +
        '&bull; Calculated VPD: <strong>' + snap.vpd + ' kPa</strong> (Standard envelope: 0.6 - 1.2 kPa)'
      );
    }, 450);
  } else if (topic === 'pump' || topic === 'safety') {
    appendAiChatMessage('user', 'Pump Check');
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.style.display = 'flex';
    setTimeout(() => {
      if (indicator) indicator.style.display = 'none';
      appendAiChatMessage('bot',
        '<strong>Actuator Diagnostics: Ultrasonic Mist Pump</strong><br>' +
        '&bull; State: <strong>' + (isPump ? 'PUMPING (Active)' : 'IDLE (Standby)') + '</strong><br>' +
        '&bull; Reservoir Water Level: <strong>' + tank + '%</strong> (' + (parseFloat(tank) <= 20 ? 'CRITICAL LOW' : 'SAFE') + ')<br>' +
        '&bull; Safety Interlock: ' + (isRain ? 'HELD (Rain Lockout)' : 'CLEAR') + '<br>' +
        '&bull; Controller Link: ' + (isOnline ? 'Online via WebSerial' : 'Simulation Mode')
      );
    }, 450);
  }
}
window.sendAiQuickPrompt = sendAiQuickPrompt;

function setFarmerVisualState(isRiding) {
  const comp = document.getElementById('ai-farmer-companion');
  const avatar = document.getElementById('farmer-avatar-btn');
  if (!comp || !avatar) return;

  const idleSvg = document.getElementById('farmer-idle-svg') || comp.querySelector('.farmer-idle-svg');
  const ridingSvg = document.getElementById('farmer-riding-svg') || comp.querySelector('.farmer-riding-svg');

  if (isRiding) {
    comp.classList.add('is-riding');
    comp.classList.remove('is-idle');
    avatar.classList.add('is-riding');
    avatar.classList.remove('is-idle');
    if (idleSvg) idleSvg.style.setProperty('display', 'none', 'important');
    if (ridingSvg) ridingSvg.style.setProperty('display', 'block', 'important');
  } else {
    comp.classList.remove('is-riding');
    comp.classList.add('is-idle');
    avatar.classList.remove('is-riding');
    avatar.classList.add('is-idle');
    if (idleSvg) idleSvg.style.setProperty('display', 'block', 'important');
    if (ridingSvg) ridingSvg.style.setProperty('display', 'none', 'important');
  }
}
window.setFarmerVisualState = setFarmerVisualState;

function initDraggableCompanion() {
  const comp = document.getElementById('ai-farmer-companion');
  if (!comp) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let hasMoved = false;

  comp.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;

    if (typeof farmerWanderTimer !== 'undefined' && farmerWanderTimer) {
      clearTimeout(farmerWanderTimer);
    }
    comp.classList.remove('is-walking');
    setFarmerVisualState(false);

    const rect = comp.getBoundingClientRect();
    const parentRect = comp.offsetParent ? comp.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    initialLeft = rect.left - parentRect.left;
    initialTop = rect.top - parentRect.top;

    comp.classList.add('dragging');
    comp.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });

  comp.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > 4) {
      hasMoved = true;
    }

    comp.style.setProperty('bottom', 'auto', 'important');
    comp.style.setProperty('left', (initialLeft + dx) + 'px', 'important');
    comp.style.setProperty('top', (initialTop + dy) + 'px', 'important');
  });

  comp.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    comp.classList.remove('dragging');
    try { comp.releasePointerCapture(e.pointerId); } catch (err) {}

    if (!hasMoved) {
      toggleAiChatBot();
    } else {
      if (typeof startAutonomousFarmerWander === 'function') {
        if (typeof farmerWanderTimer !== 'undefined' && farmerWanderTimer) clearTimeout(farmerWanderTimer);
        farmerWanderTimer = setTimeout(startAutonomousFarmerWander, 6000);
      }
    }
  });
}
window.initDraggableCompanion = initDraggableCompanion;

function initDraggableChatCard() {
  const card = document.getElementById('ai-chat-card');
  const header = document.querySelector('#ai-chat-card .ai-chat-header');
  if (!card || !header) return;

  const btnClose = document.getElementById('btn-close-chat');
  if (btnClose && !btnClose._boundClose) {
    btnClose._boundClose = true;
    btnClose.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleAiChatBot(false);
    });
  }

  if (!window._boundChatEscape) {
    window._boundChatEscape = true;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        const c = document.getElementById('ai-chat-card');
        if (c && c.classList.contains('open')) {
          toggleAiChatBot(false);
        }
      }
    });
  }

  if (!window._boundChatOutside) {
    window._boundChatOutside = true;
    document.addEventListener('pointerdown', (e) => {
      const c = document.getElementById('ai-chat-card');
      const comp = document.getElementById('ai-farmer-companion');
      if (c && c.classList.contains('open')) {
        const isInsideCard = c.contains(e.target);
        const isCompanion = comp && comp.contains(e.target);
        if (!isInsideCard && !isCompanion) {
          toggleAiChatBot(false);
        }
      }
    });
  }

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  header.style.cursor = 'move';
  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = card.getBoundingClientRect();
    const parentRect = card.offsetParent ? card.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    initialLeft = rect.left - parentRect.left;
    initialTop = rect.top - parentRect.top;

    header.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });

  header.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    card.style.setProperty('bottom', 'auto', 'important');
    card.style.setProperty('left', (initialLeft + dx) + 'px', 'important');
    card.style.setProperty('top', (initialTop + dy) + 'px', 'important');
  });

  header.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    try { header.releasePointerCapture(e.pointerId); } catch (err) {}
  });
}
window.initDraggableChatCard = initDraggableChatCard;

function startAutonomousFarmerWander() {
  const comp = document.getElementById('ai-farmer-companion');
  const viewport = document.getElementById('digital-twin-viewport');
  if (!comp || !viewport) return;

  function wanderStep() {
    if (document.body.classList.contains('chat-is-open')) return;
    if (comp.classList.contains('dragging')) return;

    const vW = viewport.clientWidth;
    const vH = viewport.clientHeight;
    if (vW < 300 || vH < 250) {
      farmerWanderTimer = setTimeout(wanderStep, 6000);
      return;
    }

    function getObstacleBox(id, pad = 12) {
      const el = document.getElementById(id);
      if (!el || el.offsetParent === null) return null;
      const r = el.getBoundingClientRect();
      const vp = viewport.getBoundingClientRect();
      return {
        left: (r.left - vp.left) - pad,
        top: (r.top - vp.top) - pad,
        right: (r.right - vp.left) + pad,
        bottom: (r.bottom - vp.top) + pad
      };
    }

    const clockBox = getObstacleBox('hud-weather-clock', 12);
    const capsuleBox = getObstacleBox('floating-action-capsule', 12);
    const dockBox = getObstacleBox('g3d-studio-dock', 14);
    const hexBox = getObstacleBox('organic-hex-cluster', 12);
    const cardBox = getObstacleBox('morph-detail-card', 12);
    const drawerBox = getObstacleBox('telemetry-drawer', 12);

    function isPointColliding(x, y, radius = 25) {
      if (x < 25 || x > vW - 45 || y < 65 || y > vH - 45) return true;
      const bList = [clockBox, capsuleBox, dockBox, hexBox, cardBox, drawerBox];
      for (let i = 0; i < bList.length; i++) {
        const b = bList[i];
        if (!b) continue;
        if (x >= b.left - radius && x <= b.right + radius &&
            y >= b.top - radius && y <= b.bottom + radius) {
          return true;
        }
      }
      return false;
    }

    function orientation(px, py, qx, qy, rx, ry) {
      const val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
      if (Math.abs(val) < 1e-5) return 0;
      return (val > 0) ? 1 : 2;
    }

    function segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const o1 = orientation(x1, y1, x2, y2, x3, y3);
      const o2 = orientation(x1, y1, x2, y2, x4, y4);
      const o3 = orientation(x3, y3, x4, y4, x1, y1);
      const o4 = orientation(x3, y3, x4, y4, x2, y2);
      return (o1 !== o2 && o3 !== o4);
    }

    function lineIntersectsBox(x1, y1, x2, y2, box) {
      if (!box) return false;
      if (Math.max(x1, x2) < box.left || Math.min(x1, x2) > box.right || Math.max(y1, y2) < box.top || Math.min(y1, y2) > box.bottom) return false;
      if ((x1 >= box.left && x1 <= box.right && y1 >= box.top && y1 <= box.bottom) ||
          (x2 >= box.left && x2 <= box.right && y2 >= box.top && y2 <= box.bottom)) return true;
      return segIntersect(x1, y1, x2, y2, box.left, box.top, box.right, box.top) ||
             segIntersect(x1, y1, x2, y2, box.right, box.top, box.right, box.bottom) ||
             segIntersect(x1, y1, x2, y2, box.left, box.bottom, box.right, box.bottom) ||
             segIntersect(x1, y1, x2, y2, box.left, box.top, box.left, box.bottom);
    }

    function getSafePath(cur, target, dock) {
      if (!dock || !lineIntersectsBox(cur.x, cur.y, target.x, target.y, dock)) {
        return [target];
      }
      const safeY = Math.max(70, dock.top - 45);
      const wp1 = {
        x: cur.x < dock.left ? Math.min(cur.x, dock.left - 25) : (cur.x > dock.right ? Math.max(cur.x, dock.right + 25) : (cur.x < (dock.left + dock.right)/2 ? dock.left - 25 : dock.right + 25)),
        y: safeY
      };
      const wp2 = {
        x: target.x < dock.left ? Math.min(target.x, dock.left - 25) : (target.x > dock.right ? Math.max(target.x, dock.right + 25) : (target.x < (dock.left + dock.right)/2 ? dock.left - 25 : dock.right + 25)),
        y: safeY
      };

      const path = [];
      if (cur.x !== wp1.x || cur.y !== wp1.y) {
        path.push(wp1);
      }
      if (lineIntersectsBox(wp1.x, wp1.y, target.x, target.y, dock)) {
        path.push(wp2);
      }
      path.push(target);
      return path;
    }

    const zones = [
      { minX: 35, maxX: Math.min(80, vW * 0.15), minY: vH - 120, maxY: vH - 65 },
      { minX: 35, maxX: Math.min(220, vW * 0.25), minY: 160, maxY: 320 },
      { minX: 160, maxX: Math.min(vW * 0.45, vW - 120), minY: 90, maxY: 160 },
      { minX: Math.min(vW * 0.54, vW - 190), maxX: Math.min(vW * 0.72, vW - 100), minY: 120, maxY: 240 },
      { minX: Math.min(vW * 0.52, vW - 200), maxX: Math.min(vW * 0.68, vW - 110), minY: Math.max(180, vH - 240), maxY: vH - 140 },
      { minX: Math.max(40, vW * 0.22), maxX: Math.min(vW * 0.52, vW - 140), minY: Math.max(120, vH * 0.46), maxY: Math.max(160, vH * 0.65) }
    ];

    let targetX = 40, targetY = vH - 75;
    let found = false;

    const shuffledZones = zones.map((z, i) => ({ z: z, i: i })).filter(item => item.i !== currentFarmerStation);
    shuffledZones.sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledZones.length; i++) {
      const z = shuffledZones[i].z;
      for (let attempt = 0; attempt < 8; attempt++) {
        const cx = Math.round(z.minX + Math.random() * Math.max(10, z.maxX - z.minX));
        const cy = Math.round(z.minY + Math.random() * Math.max(10, z.maxY - z.minY));
        if (!isPointColliding(cx, cy, 30)) {
          targetX = cx;
          targetY = cy;
          currentFarmerStation = shuffledZones[i].i;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const cx = Math.round(35 + Math.random() * (vW - 120));
        const cy = Math.round(85 + Math.random() * (vH - 150));
        if (!isPointColliding(cx, cy, 32)) {
          targetX = cx;
          targetY = cy;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      targetX = 35;
      targetY = Math.max(60, vH - 75);
    }

    const curLeft = comp.offsetLeft || 20;
    const curTop = comp.offsetTop || (vH - 75);
    const dist = Math.hypot(targetX - curLeft, targetY - curTop);

    if (dist < 30) {
      setFarmerVisualState(false);
      farmerWanderTimer = setTimeout(wanderStep, 5000 + Math.random() * 2500);
      return;
    }

    const path = getSafePath({ x: curLeft, y: curTop }, { x: targetX, y: targetY }, dockBox);
    const avatar = comp.querySelector('.farmer-avatar-btn') || comp;
    avatar.style.transition = 'transform 0.25s ease';

    function executeLeg(legIndex, fromPos) {
      if (document.body.classList.contains('chat-is-open')) return;
      if (comp.classList.contains('dragging')) return;

      if (legIndex >= path.length) {
        comp.classList.remove('is-walking');
        setFarmerVisualState(false);
        const idleWait = 5500 + Math.random() * 3500;
        farmerWanderTimer = setTimeout(wanderStep, idleWait);
        return;
      }

      const p = path[legIndex];
      const legDist = Math.hypot(p.x - fromPos.x, p.y - fromPos.y);
      const isMovingRight = p.x >= fromPos.x;
      avatar.style.transform = isMovingRight ? 'scaleX(1)' : 'scaleX(-1)';

      const legDur = Math.max(0.8, Math.min(3.2, legDist / 85));
      comp.classList.add('is-walking');
      comp.style.transition = 'left ' + legDur.toFixed(2) + 's cubic-bezier(0.35, 0.05, 0.2, 1), top ' + legDur.toFixed(2) + 's cubic-bezier(0.35, 0.05, 0.2, 1)';
      comp.style.setProperty('bottom', 'auto', 'important');
      comp.style.setProperty('left', p.x + 'px', 'important');
      comp.style.setProperty('top', p.y + 'px', 'important');

      setTimeout(() => {
        executeLeg(legIndex + 1, p);
      }, legDur * 1000 + 80);
    }

    setTimeout(() => {
      if (document.body.classList.contains('chat-is-open')) return;
      if (comp.classList.contains('dragging')) return;
      setFarmerVisualState(true);
      executeLeg(0, { x: curLeft, y: curTop });
    }, 180);
  }

  farmerWanderTimer = setTimeout(wanderStep, 1800);
}
window.startAutonomousFarmerWander = startAutonomousFarmerWander;

function toggleStudioDock() {
  const dock = document.getElementById('g3d-studio-dock');
  const controls = document.getElementById('g3d-dock-controls');
  const icon = document.getElementById('studio-toggle-icon');
  if (!dock) return;
  const isCollapsed = dock.classList.toggle('collapsed');
  if (controls) {
    controls.style.display = isCollapsed ? 'none' : 'inline-flex';
  }
  if (icon) {
    icon.textContent = isCollapsed ? '3D Controls >' : '< Controls';
  }
}
window.toggleStudioDock = toggleStudioDock;

function initDraggableHexCluster() {
  const cluster = document.getElementById('organic-hex-cluster');
  if (!cluster) return;
  cluster.style.left = '';
  cluster.style.top = '';
  cluster.style.right = '';
  cluster.style.bottom = '';
  cluster.classList.remove('user-dragged', 'dragging');
}
window.initDraggableHexCluster = initDraggableHexCluster;

window.addEventListener("beforeunload", function() {
  try {
    if (AppState.hardwareConnected || AppState.isSimulated) {
      const stopUrl = (window.contextPath || "") + "/api/sensor?action=intentional_stop";
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(stopUrl, new URLSearchParams({action:'intentional_stop'}));
      }
    }
  } catch (e) {}
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { setTimeout(startAutonomousFarmerWander, 1200); });
} else {
  setTimeout(startAutonomousFarmerWander, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  }, { once: true });
} else {
  setTimeout(initApp, 0);
}

setInterval(() => {
  if (typeof updateFarmerSpeech === 'function' && document.body.classList.contains('dashboard-active') && !document.body.classList.contains('chat-is-open')) {
    updateFarmerSpeech();
  }
}, 15000);
