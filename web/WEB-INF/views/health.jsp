<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health &amp; Watchdog Status - Smart Misting System</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
    <style>
        .health-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
        }
        .health-card {
            width: 100%;
            max-width: 760px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 36px;
            box-shadow: var(--shadow-lg);
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        .status-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 12px 16px;
        }
        .status-title {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            margin-bottom: 4px;
        }
        .status-val {
            font-size: 0.92rem;
            font-weight: 700;
            color: var(--text-primary);
        }

</style>
</head>
<body>
<div class="health-wrapper">
    <div class="health-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 18px;">
            <div>
                <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">System Health &amp; SCADA Watchdog</h2>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">PRJ301 &bull; Smart Misting SCADA &bull; Specimen: <em>Ludisia discolor</em></p>
            </div>
            <div>
                <c:choose>
                    <c:when test="${dbConnected}">
                        <span class="badge badge-success" style="font-size: 0.88rem; padding: 6px 14px;">
                            <span class="pulse-indicator active"></span> CONNECTED
                        </span>
                    </c:when>
                    <c:otherwise>
                        <span class="badge badge-danger" style="font-size: 0.88rem; padding: 6px 14px;">
                            <span class="pulse-indicator danger"></span> DB OFFLINE
                        </span>
                    </c:otherwise>
                </c:choose>
            </div>
        </div>

        <c:choose>
            <c:when test="${dbConnected}">
                <div class="alert alert-success" style="margin-bottom: 20px;">
                    <svg style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    <div>
                        <strong>DATABASE OPERATIONAL:</strong> Connected to <code>MistingDB</code> on SQL Server (${dbProductName} ${dbProductVersion}).
                    </div>
                </div>
            </c:when>
            <c:otherwise>
                <div class="alert alert-danger" style="margin-bottom: 20px;">
                    <svg style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                        <strong>CANNOT CONNECT TO SQL SERVER:</strong><br>
                        <code>${dbError}</code>
                    </div>
                </div>
            </c:otherwise>
        </c:choose>

        <%
            service.LatestData.Snap snap = service.LatestData.get(1);
            long ageMs = service.AlertManager.getInstance().telemetryAgeMs();
            long ageSec = ageMs >= 0 ? ageMs / 1000 : -1;
            boolean isStopped = service.AlertManager.getInstance().isIntentionalStop();
            long pingAt = service.Heartbeat.getLastPingAt();
            long pingAgoSec = pingAt > 0 ? (System.currentTimeMillis() - pingAt) / 1000 : -1;
            int pingStatus = service.Heartbeat.getLastPingStatus();
            java.util.List<service.AlertManager.AlertEvent> recentAlerts = service.AlertManager.getRecentEvents();

%>

        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">
            Integration &amp; Watchdog Status:
        </h3>
        <div class="status-grid">
            <div class="status-box">
                <div class="status-title">Discord Webhook</div>
                <div class="status-val">
                    <c:choose>
                        <c:when test="${discordConfigured}">
                            <span class="badge badge-success">CONFIGURED</span>
                        </c:when>
                        <c:otherwise>
                            <span class="badge badge-danger">NOT CONFIGURED</span>
                        </c:otherwise>
                    </c:choose>
                </div>
            </div>

            <div class="status-box">
                <div class="status-title">Healthchecks.io</div>
                <div class="status-val">
                    <c:choose>
                        <c:when test="${healthchecksConfigured}">
                            <span class="badge badge-success">CONFIGURED</span>
                        </c:when>
                        <c:otherwise>
                            <span class="badge badge-danger">NOT CONFIGURED</span>
                        </c:otherwise>
                    </c:choose>
                </div>
            </div>

            <div class="status-box">
                <div class="status-title">Telemetry Stream</div>
                <div class="status-val">
                    <% if (isStopped) {
%>
                        <span class="badge badge-warn">STANDBY (STOPPED)</span>
                    <% } else if (ageSec >= 0 && ageSec <= 35) {
%>
                        <span class="badge badge-success">ONLINE (<%= snap != null && snap.sample ? "DEMO SIM" : "IOT HW"
%>)</span>
                    <% } else if (ageSec > 35) {
%>
                        <span class="badge badge-danger">OFFLINE (<%= ageSec
%>s ago)</span>
                    <% } else {
%>
                        <span class="badge badge-secondary">WAITING DATA</span>
                    <% }
%>
                </div>
            </div>

            <div class="status-box">
                <div class="status-title">Heartbeat Last Ping</div>
                <div class="status-val">
                    <% if (pingAgoSec >= 0) {
%>
                        <%= pingAgoSec
%>s ago <span class="badge <%= pingStatus == 200 ? "badge-success" : "badge-danger"
%>">HTTP <%= pingStatus
%></span>
                    <% } else {
%>
                        <span style="color: var(--text-secondary); font-size: 0.8rem;">Awaiting stream</span>
                    <% }
%>
                </div>
            </div>
        </div>

        <% if (snap != null) {
%>
        <div style="margin-bottom: 20px; font-size: 0.85rem; background: var(--bg-secondary); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <strong>Current Microclimate Snapshot:</strong><br>
            <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 14px;">
                <span>Soil: <strong><%= String.format("%.1f", snap.soil)
%>%</strong></span>
                <span>Air RH: <strong><%= snap.airHum != null ? String.format("%.1f", snap.airHum) + "%" : "--"
%></strong></span>
                <span>Air Temp: <strong><%= snap.airTemp != null ? String.format("%.1f", snap.airTemp) + "°C" : "--"
%></strong></span>
                <span>Water Tank: <strong><%= snap.waterOk ? "OK (>20%)" : "LOW (<=20%)"
%></strong></span>
                <span>Mist Pump: <strong><%= snap.pumpOn ? "RUNNING" : "IDLE"
%></strong></span>
            </div>
        </div>
        <% }
%>

        <% if (!recentAlerts.isEmpty()) {
%>
        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; color: var(--text-primary);">Recent Alert History:</h3>
        <div class="table-responsive" style="margin-bottom: 24px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Level</th>
                        <th>English Notification Message</th>
                    </tr>
                </thead>
                <tbody>
                <% for (service.AlertManager.AlertEvent ev : recentAlerts) {
%>
                    <tr>
                        <td><strong><%= ev.code
%></strong></td>
                        <td><span class="badge <%= "RECOVERY".equals(ev.level) ? "badge-success" : ("CRITICAL".equals(ev.level) ? "badge-danger" : "badge-warn")
%>"><%= ev.level
%></span></td>
                        <td style="font-size: 0.82rem;"><%= ev.message
%></td>
                    </tr>
                <% }
%>
                </tbody>
            </table>
        </div>
        <% }
%>

        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">Database Table Records:</h3>
        <div class="table-responsive" style="margin-bottom: 24px;">
            <table class="data-table">
                <thead>
                <tr>
                    <th>Table Name</th>
                    <th>Entity Domain</th>
                    <th style="text-align: right;">Count</th>
                </tr>
                </thead>
                <tbody>
                <c:forEach items="${tableCounts}" var="entry">
                    <tr>
                        <td><strong style="color: var(--secondary);">${entry.key}</strong></td>
                        <td style="font-size: 0.82rem; color: var(--text-secondary);">
                            <c:choose>
                                <c:when test="${entry.key == 'AppUser'}">User accounts &amp; RBAC roles</c:when>
                                <c:when test="${entry.key == 'Plant'}">Botanical plant profile catalog</c:when>
                                <c:when test="${entry.key == 'Device'}">IoT microcontroller units</c:when>
                                <c:when test="${entry.key == 'MistingSetting'}">Moisture thresholds &amp; mist duration</c:when>
                                <c:when test="${entry.key == 'SensorReading'}">Microclimate telemetry packets</c:when>
                                <c:when test="${entry.key == 'ControlCommand'}">Hardware actuation commands</c:when>
                                <c:when test="${entry.key == 'ActivityLog'}">Misting events &amp; audit records</c:when>
                                <c:otherwise>System Table</c:otherwise>
                            </c:choose>
                        </td>
                        <td style="text-align: right;">
                            <c:choose>
                                <c:when test="${entry.value >= 0}">
                                    <span class="badge badge-staff">${entry.value}</span>
                                </c:when>
                                <c:otherwise>
                                    <span class="badge badge-danger">Error</span>
                                </c:otherwise>
                            </c:choose>
                        </td>
                    </tr>
                </c:forEach>
                </tbody>
            </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
            <a href="${pageContext.request.contextPath}/login" class="btn btn-outline">
                &larr; Sign In
            </a>
            <a href="${pageContext.request.contextPath}/dashboard" class="btn btn-primary">
                Dashboard &rarr;
            </a>
        </div>
    </div>
</div>
</body>
</html>
