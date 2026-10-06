<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Dashboard Giám Sát &amp; Điều Khiển" />
    <jsp:param name="pageSubtitle" value="Hệ thống phun sương tự động - Kết nối Bluetooth Arduino" />
    <jsp:param name="activeNav" value="dashboard" />
</jsp:include>

<style>
    .kpi-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px;
        margin-bottom: 24px;
    }
    .kpi-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        padding: 20px;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        display: flex;
        align-items: center;
        gap: 16px;
        transition: var(--transition);
    }
    .kpi-card:hover { border-color: var(--border-glow); box-shadow: var(--shadow-glow); }
    .kpi-icon {
        width: 56px; height: 56px; border-radius: var(--radius-md);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem; flex-shrink: 0;
    }
    .kpi-icon.moisture { background: rgba(16,185,129,0.15); color: #10B981; }
    .kpi-icon.pump     { background: rgba(59,130,246,0.15);  color: #3B82F6; }
    .kpi-icon.tank     { background: rgba(245,158,11,0.15);  color: #F59E0B; }
    .kpi-icon.rain     { background: rgba(6,182,212,0.15);   color: #06B6D4; }
    .kpi-label  { font-size: 0.82rem; color: var(--text-muted); font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value  { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .kpi-value.ok   { color: #10B981; }
    .kpi-value.warn { color: #EF4444; }
    .kpi-value.blue { color: #3B82F6; }

    .control-panel {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: var(--shadow-sm);
        margin-bottom: 24px;
    }
    .panel-title {
        font-size: 1.05rem; font-weight: 700; color: var(--text-primary);
        margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
    }
    .panel-title i { color: var(--primary); }

    /* Control Buttons */
    .control-btn {
        padding: 12px 24px; border-radius: var(--radius-sm);
        font-weight: 700; border: none; cursor: pointer; transition: var(--transition);
        display: inline-flex; align-items: center; gap: 10px; font-size: 1rem;
    }
    .control-btn.start { background: #10B981; color: white; }
    .control-btn.start:hover:not(:disabled) { background: #059669; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
    .control-btn.stop  { background: #EF4444; color: white; }
    .control-btn.stop:hover:not(:disabled)  { background: #DC2626; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239,68,68,0.4); }
    .control-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }

    /* Device Status Bar */
    .device-bar {
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 12px; padding: 14px 20px;
        background: var(--bg-card); border: 1px solid var(--border-color);
        border-radius: var(--radius-md); margin-bottom: 20px;
    }
    .device-bar.offline { border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.05); }
    .status-dot {
        width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        animation: pulse-green 2s infinite;
    }
    .status-dot.online  { background: #10B981; box-shadow: 0 0 8px #10B981; }
    .status-dot.offline { background: #EF4444; box-shadow: 0 0 8px #EF4444; animation: pulse-red 1s infinite; }
    @keyframes pulse-green { 0%,100%{opacity:1} 50%{opacity:0.6} }
    @keyframes pulse-red   { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Flash messages */
    .flash-alert {
        padding: 14px 20px; border-radius: var(--radius-sm);
        font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
    }
    .flash-success { background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
    .flash-error   { background: rgba(239,68,68,0.15);  color: #EF4444;  border: 1px solid rgba(239,68,68,0.3); }

    /* Bluetooth input form */
    .bt-form-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 14px;
        margin-bottom: 16px;
    }
    .bt-input-group { display: flex; flex-direction: column; gap: 6px; }
    .bt-label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .bt-input {
        background: var(--bg-secondary); border: 1px solid var(--border-color);
        border-radius: var(--radius-sm); padding: 10px 14px; color: var(--text-primary);
        font-size: 1rem; font-weight: 600; outline: none; transition: var(--transition);
    }
    .bt-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
    .bt-submit {
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white; border: none; border-radius: var(--radius-sm);
        padding: 12px 28px; font-weight: 700; cursor: pointer;
        transition: var(--transition); display: inline-flex; align-items: center; gap: 10px;
    }
    .bt-submit:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--shadow-glow); }
    .bt-note { font-size: 0.82rem; color: var(--text-muted); margin-top: 10px; }
</style>

<%-- Flash Messages --%>
<c:if test="${not empty sessionScope.flashSuccess}">
    <div class="flash-alert flash-success"><i class="fa-solid fa-circle-check"></i> ${sessionScope.flashSuccess}</div>
    <% session.removeAttribute("flashSuccess"); %>
</c:if>
<c:if test="${not empty sessionScope.flashError}">
    <div class="flash-alert flash-error"><i class="fa-solid fa-triangle-exclamation"></i> ${sessionScope.flashError}</div>
    <% session.removeAttribute("flashError"); %>
</c:if>

<%-- Device Status Bar --%>
<div class="device-bar ${alertOffline ? 'offline' : ''}">
    <div style="display:flex; align-items:center; gap:12px;">
        <div class="status-dot ${alertOffline ? 'offline' : 'online'}"></div>
        <div>
            <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">
                ${device != null ? device.deviceName : 'Arduino Misting System'}
                <span style="font-size:0.8rem; font-weight:500; color:var(--text-muted); margin-left:6px;">
                    (${device != null ? device.deviceCode : 'Arduino-BT-01'})
                </span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                <i class="fa-solid fa-bluetooth"></i>
                <c:choose>
                    <c:when test="${alertOffline}">
                        <span style="color:#EF4444; font-weight:600;"> MẤT KẾT NỐI BLUETOOTH</span>
                        — Cập nhật cuối: ${latestReading.receivedAt != null ? latestReading.receivedAt : 'Chưa có dữ liệu'}
                    </c:when>
                    <c:otherwise>
                        Kết nối Bluetooth · Cập nhật: ${latestReading.receivedAt != null ? latestReading.receivedAt : 'N/A'}
                    </c:otherwise>
                </c:choose>
            </div>
        </div>
    </div>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <c:if test="${alertOffline}">
            <span style="background:rgba(239,68,68,0.15); color:#EF4444; padding:5px 12px; border-radius:20px; font-size:0.8rem; font-weight:700;">
                <i class="fa-solid fa-wifi-slash"></i> OFFLINE &gt;5 phút
            </span>
        </c:if>
        <span style="background:var(--bg-secondary); color:var(--text-secondary); padding:5px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; border:1px solid var(--border-color);">
            Chế độ: <strong style="color:var(--accent);">${setting.desiredMode}</strong>
        </span>
    </div>
</div>

<%-- KPI Row --%>
<div class="kpi-row">
    <div class="kpi-card">
        <div class="kpi-icon moisture"><i class="fa-solid fa-droplet"></i></div>
        <div>
            <div class="kpi-label">Độ Ẩm Đất</div>
            <div class="kpi-value" id="val-humidity">
                ${latestReading.humidityPct != null ? latestReading.humidityPct : '--'}<span style="font-size:1rem;">%</span>
            </div>
        </div>
    </div>
    <div class="kpi-card">
        <div class="kpi-icon pump"><i class="fa-solid fa-power-off"></i></div>
        <div>
            <div class="kpi-label">Máy Bơm</div>
            <div class="kpi-value ${latestReading.pumpOn ? 'blue' : ''}" id="val-pump">
                ${latestReading.pumpOn ? 'ĐANG CHẠY' : 'ĐÃ TẮT'}
            </div>
        </div>
    </div>
    <div class="kpi-card">
        <div class="kpi-icon tank"><i class="fa-solid fa-glass-water"></i></div>
        <div>
            <div class="kpi-label">Bể Nước</div>
            <div class="kpi-value ${latestReading.waterOk ? 'ok' : 'warn'}" id="val-water">
                ${latestReading.waterOk ? 'ĐỦ NƯỚC' : 'CẠN NƯỚC'}
            </div>
        </div>
    </div>
    <div class="kpi-card">
        <div class="kpi-icon rain"><i class="fa-solid ${latestReading.isRaining ? 'fa-cloud-showers-heavy' : 'fa-sun'}"></i></div>
        <div>
            <div class="kpi-label">Cảm Biến Mưa</div>
            <div class="kpi-value ${latestReading.isRaining ? 'warn' : 'ok'}" id="val-rain">
                ${latestReading.isRaining ? 'ĐANG MƯA' : 'TẠNH RÁO'}
            </div>
        </div>
    </div>
</div>



<%-- Manual Pump Control --%>
<div class="control-panel">
    <div class="panel-title"><i class="fa-solid fa-gamepad"></i> Điều Khiển Thủ Công</div>
    <c:choose>
        <c:when test="${sessionScope.user.roleCode eq 'VIEWER'}">
            <div style="padding:14px; background:rgba(245,158,11,0.1); color:#F59E0B; border-radius:var(--radius-sm); font-weight:600; border:1px solid rgba(245,158,11,0.3);">
                <i class="fa-solid fa-lock"></i> Tài khoản VIEWER không có quyền điều khiển thiết bị.
            </div>
        </c:when>
        <c:otherwise>
            <c:if test="${alertOffline}">
                <div style="padding:10px 16px; background:rgba(239,68,68,0.1); color:#EF4444; border-radius:var(--radius-sm); font-weight:600; border:1px solid rgba(239,68,68,0.3); margin-bottom:16px; font-size:0.85rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Cảnh báo: Thiết bị đang OFFLINE. Lệnh sẽ được lưu vào hàng đợi.
                </div>
            </c:if>
            <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
                <button type="button" class="control-btn start"
                    id="btnStart"
                    onclick="sendCommand('start_pump')"
                    ${latestReading.pumpOn ? 'disabled' : ''}>
                    <i class="fa-solid fa-play"></i> BẬT BƠM
                </button>
                <button type="button" class="control-btn stop"
                    id="btnStop"
                    onclick="sendCommand('stop_pump')"
                    ${!latestReading.pumpOn ? 'disabled' : ''}>
                    <i class="fa-solid fa-stop"></i> TẮT BƠM
                </button>
                <c:if test="${sessionScope.user.roleCode eq 'ADMIN' || sessionScope.user.roleCode eq 'STAFF'}">
                    <a href="${pageContext.request.contextPath}/admin/settings"
                        style="padding:10px 20px; border-radius:var(--radius-sm); border:1px solid var(--border-color); color:var(--text-secondary); text-decoration:none; font-weight:600; font-size:0.9rem; display:inline-flex; align-items:center; gap:8px; transition:var(--transition);">
                        <i class="fa-solid fa-sliders"></i> Chỉnh Ngưỡng
                    </a>
                </c:if>
            </div>
            <div id="cmdResult" style="margin-top:12px; display:none;"></div>
            <div style="margin-top:12px; font-size:0.82rem; color:var(--text-muted);">
                <i class="fa-solid fa-circle-info"></i> Lệnh sẽ được ghi lại vào Lịch sử điều khiển.
            </div>
        </c:otherwise>
    </c:choose>
</div>

<%-- Moisture Chart --%>
<div class="control-panel">
    <div class="panel-title"><i class="fa-solid fa-chart-line"></i> Biểu Đồ Độ Ẩm Đất (15 lần gần nhất)</div>
    <div style="position:relative; height:260px; width:100%;">
        <canvas id="moistureChart"></canvas>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
// ===================== CHART.JS =====================
(function() {
    const labels = [];
    const humData = [];
    <%-- Build data safely from JSTL --%>
    <c:forEach var="r" items="${recentReadings}" varStatus="loop">
        <c:if test="${loop.index < 15 && r.humidityPct != null}">
        labels.unshift('<c:out value="${r.measuredAt}"/>'.substring(11, 16));
        humData.unshift(parseFloat('<c:out value="${r.humidityPct}"/>') || 0);
        </c:if>
    </c:forEach>

    const ctx = document.getElementById('moistureChart');
    if (ctx && humData.length > 0) {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Độ Ẩm Đất (%)',
                    data: humData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10B981',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#94a3b8' } },
                    tooltip: { backgroundColor: '#1e2d4f', titleColor: '#f8fafc', bodyColor: '#94a3b8' }
                },
                scales: {
                    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    y: {
                        beginAtZero: true, max: 100,
                        ticks: { color: '#64748b', callback: v => v + '%' },
                        grid: { color: 'rgba(148,163,184,0.1)' }
                    }
                }
            }
        });
    } else if (ctx) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:60px 0;"><i class="fa-solid fa-chart-line" style="font-size:2rem; opacity:0.3;"></i><br><br>Chưa có dữ liệu. Hãy nhập số liệu Bluetooth đầu tiên.</p>';
    }
})();

// ===================== AJAX POLLING (AUTO REFRESH) =====================
function fetchLatestData() {
    fetch('${pageContext.request.contextPath}/api/sensor?device_id=1')
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            // Update KPIs
            document.getElementById('val-humidity').innerHTML = (data.humidity_pct !== null ? data.humidity_pct : '--') + '<span style="font-size:1rem;">%</span>';
            
            const pumpEl = document.getElementById('val-pump');
            pumpEl.textContent = data.pump_on ? 'ĐANG CHẠY' : 'ĐÃ TẮT';
            pumpEl.className = 'kpi-value ' + (data.pump_on ? 'blue' : '');
            
            const waterEl = document.getElementById('val-water');
            waterEl.textContent = data.water_ok ? 'ĐỦ NƯỚC' : 'CẠN NƯỚC';
            waterEl.className = 'kpi-value ' + (data.water_ok ? 'ok' : 'warn');

            const rainEl = document.getElementById('val-rain');
            // Mưa thì cảnh báo (warn), tạnh thì ok
            rainEl.textContent = data.is_raining ? 'ĐANG MƯA' : 'TẠNH RÁO';
            rainEl.className = 'kpi-value ' + (data.is_raining ? 'warn' : 'ok');

            // Update Control Buttons based on pump state
            const btnStart = document.getElementById('btnStart');
            const btnStop  = document.getElementById('btnStop');
            if (btnStart && btnStop) {
                btnStart.disabled = data.pump_on;
                btnStop.disabled = !data.pump_on;
            }
        }
    })
    .catch(err => console.error("Polling error:", err));
}
// Chạy Auto-refresh mỗi 5 giây
setInterval(fetchLatestData, 5000);

// ===================== AJAX COMMAND =====================
function sendCommand(action) {
    const btnStart = document.getElementById('btnStart');
    const btnStop  = document.getElementById('btnStop');
    if (btnStart) btnStart.disabled = true;
    if (btnStop)  btnStop.disabled  = true;

    const result = document.getElementById('cmdResult');

    fetch('${pageContext.request.contextPath}/control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'action=' + encodeURIComponent(action) + '&device_id=1'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            Swal.fire({ icon:'success', title:'Thành công!', text: data.message, timer:2200, showConfirmButton:false });
            if (result) {
                result.style.display = 'block';
                result.innerHTML = '<span style="color:#10B981; font-weight:600;"><i class="fa-solid fa-circle-check"></i> ' + data.message + '</span>';
            }
            fetchLatestData(); // Update UI immediately
        } else {
            Swal.fire({ icon:'warning', title:'Cảnh báo!', text: data.message, confirmButtonColor:'#10B981' });
            if (btnStart) btnStart.disabled = false;
            if (btnStop)  btnStop.disabled  = false;
        }
    })
    .catch(() => {
        Swal.fire({ icon:'error', title:'Lỗi kết nối!', text:'Không thể kết nối tới server.', confirmButtonColor:'#10B981' });
        if (btnStart) btnStart.disabled = false;
        if (btnStop)  btnStop.disabled  = false;
    });
}


</script>

<jsp:include page="/views/layout/footer.jsp" />