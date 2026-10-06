<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt"%>

<jsp:include page="/views/layout/header.jsp">
    <jsp:param name="pageTitle" value="Lịch Sử &amp; Nhật Ký Hoạt Động" />
    <jsp:param name="pageSubtitle" value="Toàn bộ lệnh điều khiển và dữ liệu cảm biến đã ghi nhận" />
    <jsp:param name="activeNav" value="history" />
</jsp:include>

<style>
    .tab-bar {
        display: flex; gap: 8px; margin-bottom: 20px;
        border-bottom: 2px solid var(--border-color); padding-bottom: 0;
    }
    .tab-btn {
        padding: 10px 20px; background: transparent; border: none; cursor: pointer;
        font-weight: 600; font-size: 0.9rem; color: var(--text-muted);
        border-bottom: 2px solid transparent; margin-bottom: -2px;
        transition: var(--transition);
    }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-btn:hover  { color: var(--text-primary); }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .panel {
        background: var(--bg-card); border: 1px solid var(--border-color);
        border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm);
    }
    .panel-header {
        padding: 16px 20px; border-bottom: 1px solid var(--border-color);
        display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    .panel-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td {
        padding: 13px 18px; text-align: left;
        border-bottom: 1px solid var(--border-color);
    }
    .data-table th {
        background: var(--bg-secondary); font-size: 0.78rem; font-weight: 700;
        color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em;
    }
    .data-table td { color: var(--text-secondary); font-size: 0.92rem; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: rgba(148,163,184,0.05); }

    .badge-cmd {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 12px; border-radius: 20px;
        font-size: 0.8rem; font-weight: 700;
    }
    .badge-START     { background: rgba(16,185,129,0.15); color: #10B981; }
    .badge-STOP      { background: rgba(239,68,68,0.15);  color: #EF4444;  }
    .badge-AUTO_START{ background: rgba(6,182,212,0.15);  color: #06B6D4;  }
    .badge-SET_MODE  { background: rgba(139,92,246,0.15); color: #8B5CF6;  }
    .badge-PENDING   { background: rgba(245,158,11,0.15); color: #F59E0B;  }
    .badge-ACKED     { background: rgba(16,185,129,0.15); color: #10B981;  }

    .search-form { display: flex; gap: 10px; }
    .search-input {
        background: var(--bg-secondary); border: 1px solid var(--border-color);
        border-radius: var(--radius-sm); padding: 8px 14px;
        color: var(--text-primary); font-size: 0.9rem; outline: none;
        transition: var(--transition);
    }
    .search-input:focus { border-color: var(--primary); }
    .search-btn {
        background: var(--primary); color: white; border: none;
        border-radius: var(--radius-sm); padding: 8px 18px;
        font-weight: 700; cursor: pointer; font-size: 0.9rem;
        display: inline-flex; align-items: center; gap: 6px;
    }

    .empty-state {
        padding: 60px 20px; text-align: center; color: var(--text-muted);
    }
    .empty-state i { font-size: 2.5rem; opacity: 0.3; margin-bottom: 12px; display: block; }

    .humidity-bar {
        display: flex; align-items: center; gap: 10px;
    }
    .humidity-track {
        flex: 1; height: 8px; background: var(--bg-secondary);
        border-radius: 4px; overflow: hidden; max-width: 120px;
    }
    .humidity-fill {
        height: 100%; border-radius: 4px;
        background: linear-gradient(90deg, #10B981, #06B6D4);
    }
</style>

<%-- Tab Bar --%>
<div class="tab-bar">
    <button class="tab-btn ${activeTab == 'misting' || empty activeTab ? 'active' : ''}"
        onclick="switchTab('misting', this)">
        <i class="fa-solid fa-droplet"></i> Điều Khiển Bơm
    </button>
    <button class="tab-btn ${activeTab == 'sensor' ? 'active' : ''}"
        onclick="switchTab('sensor', this)">
        <i class="fa-solid fa-microchip"></i> Dữ Liệu Cảm Biến
    </button>
    <c:if test="${sessionScope.user.roleCode eq 'ADMIN'}">
        <button class="tab-btn ${activeTab == 'admin' ? 'active' : ''}"
            onclick="switchTab('admin', this)">
            <i class="fa-solid fa-shield-halved"></i> Nhật Ký Admin
        </button>
    </c:if>
</div>

<%-- Tab 1: Misting / Pump Commands --%>
<div id="tab-misting" class="tab-content ${activeTab == 'misting' || empty activeTab ? 'active' : ''}">
    <div class="panel">
        <div class="panel-header">
            <div class="panel-title"><i class="fa-solid fa-droplet" style="color:var(--primary);"></i> Lịch Sử Lệnh Bật/Tắt Bơm</div>
            <form class="search-form" method="get" action="${pageContext.request.contextPath}/history">
                <input type="hidden" name="tab" value="misting">
                <input type="text" name="search" class="search-input" placeholder="Tìm kiếm..." value="${searchKeyword}">
                <button type="submit" class="search-btn"><i class="fa-solid fa-magnifying-glass"></i> Tìm</button>
            </form>
        </div>
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Hành Động</th>
                        <th>Người Thực Hiện</th>
                        <th>Chi Tiết</th>
                        <th>Thời Gian</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="log" items="${mistingLogs}">
                        <tr>
                            <td>
                                <span class="badge-cmd badge-${log.action}">
                                    <c:choose>
                                        <c:when test="${log.action eq 'START'}"><i class="fa-solid fa-play"></i> BẬT BƠM</c:when>
                                        <c:when test="${log.action eq 'STOP'}"><i class="fa-solid fa-stop"></i> TẮT BƠM</c:when>
                                        <c:when test="${log.action eq 'AUTO_START'}"><i class="fa-solid fa-robot"></i> TỰ ĐỘNG BẬT</c:when>
                                        <c:otherwise><i class="fa-solid fa-gear"></i> ${log.action}</c:otherwise>
                                    </c:choose>
                                </span>
                            </td>
                            <td>
                                <i class="fa-solid fa-user" style="color:var(--text-muted); margin-right:5px;"></i>
                                ${log.username != null ? log.username : 'Hệ Thống'}
                            </td>
                            <td style="max-width:320px; font-size:0.85rem; color:var(--text-muted);">${log.detail}</td>
                            <td style="white-space:nowrap; color:var(--text-muted); font-size:0.85rem;">${log.occurredAt}</td>
                        </tr>
                    </c:forEach>
                    <c:if test="${empty mistingLogs}">
                        <tr><td colspan="4">
                            <div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i>Chưa có lịch sử điều khiển nào.</div>
                        </td></tr>
                    </c:if>
                </tbody>
            </table>
        </div>
    </div>
</div>

<%-- Tab 2: Sensor Readings --%>
<div id="tab-sensor" class="tab-content ${activeTab == 'sensor' ? 'active' : ''}">
    <div class="panel">
        <div class="panel-header">
            <div class="panel-title"><i class="fa-solid fa-microchip" style="color:var(--secondary);"></i> Dữ Liệu Cảm Biến Gần Đây (50 lần)</div>
        </div>
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Thời Gian</th>
                        <th>Độ Ẩm Đất</th>
                        <th>Nhiệt Độ</th>
                        <th>Bể Nước</th>
                        <th>Mưa</th>
                        <th>Bơm</th>
                        <th>Chế Độ</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="r" items="${sensorReadings}">
                        <tr>
                            <td style="white-space:nowrap; font-size:0.85rem;">${r.receivedAt}</td>
                            <td>
                                <div class="humidity-bar">
                                    <div class="humidity-track">
                                        <div class="humidity-fill" style="width:${r.humidityPct != null ? r.humidityPct : 0}%;"></div>
                                    </div>
                                    <span style="font-weight:700; color:var(--text-primary);">
                                        ${r.humidityPct != null ? r.humidityPct : '--'}%
                                    </span>
                                </div>
                            </td>
                            <td>${r.temperatureC != null ? r.temperatureC : '--'}°C</td>
                            <td>
                                <c:choose>
                                    <c:when test="${r.waterOk}"><span style="color:#10B981; font-weight:600;">✅ Đủ</span></c:when>
                                    <c:otherwise><span style="color:#EF4444; font-weight:600;">❌ Cạn</span></c:otherwise>
                                </c:choose>
                            </td>
                            <td>
                                <c:choose>
                                    <c:when test="${r.isRaining}"><span style="color:#06B6D4; font-weight:600;">🌧️ Mưa</span></c:when>
                                    <c:otherwise><span style="color:#F59E0B;">☀️ Tạnh</span></c:otherwise>
                                </c:choose>
                            </td>
                            <td>
                                <c:choose>
                                    <c:when test="${r.pumpOn}"><span class="badge-cmd badge-START">⚡ Chạy</span></c:when>
                                    <c:otherwise><span style="color:var(--text-muted);">— Tắt</span></c:otherwise>
                                </c:choose>
                            </td>
                            <td><span style="font-size:0.8rem; font-weight:600; color:var(--accent);">${r.reportedMode}</span></td>
                        </tr>
                    </c:forEach>
                    <c:if test="${empty sensorReadings}">
                        <tr><td colspan="7">
                            <div class="empty-state"><i class="fa-solid fa-database"></i>Chưa có dữ liệu cảm biến nào được ghi nhận.</div>
                        </td></tr>
                    </c:if>
                </tbody>
            </table>
        </div>
    </div>
</div>

<%-- Tab 3: Admin Logs --%>
<c:if test="${sessionScope.user.roleCode eq 'ADMIN'}">
<div id="tab-admin" class="tab-content ${activeTab == 'admin' ? 'active' : ''}">
    <div class="panel">
        <div class="panel-header">
            <div class="panel-title"><i class="fa-solid fa-shield-halved" style="color:#8B5CF6;"></i> Nhật Ký Quản Trị Hệ Thống</div>
            <form class="search-form" method="get" action="${pageContext.request.contextPath}/history">
                <input type="hidden" name="tab" value="admin">
                <input type="text" name="search" class="search-input" placeholder="Tìm kiếm..." value="${searchKeyword}">
                <button type="submit" class="search-btn"><i class="fa-solid fa-magnifying-glass"></i> Tìm</button>
            </form>
        </div>
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Hành Động</th>
                        <th>Người Dùng</th>
                        <th>Chi Tiết</th>
                        <th>Thời Gian</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="log" items="${adminLogs}">
                        <tr>
                            <td><span class="badge-cmd badge-SET_MODE"><i class="fa-solid fa-gear"></i> ${log.action}</span></td>
                            <td><i class="fa-solid fa-user" style="color:var(--text-muted); margin-right:5px;"></i>${log.username != null ? log.username : 'System'}</td>
                            <td style="max-width:360px; font-size:0.85rem; color:var(--text-muted);">${log.detail}</td>
                            <td style="white-space:nowrap; font-size:0.85rem;">${log.occurredAt}</td>
                        </tr>
                    </c:forEach>
                    <c:if test="${empty adminLogs}">
                        <tr><td colspan="4">
                            <div class="empty-state"><i class="fa-solid fa-shield-halved"></i>Chưa có nhật ký quản trị nào.</div>
                        </td></tr>
                    </c:if>
                </tbody>
            </table>
        </div>
    </div>
</div>
</c:if>

<script>
function switchTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    btn.classList.add('active');
}
</script>

<jsp:include page="/views/layout/footer.jsp" />