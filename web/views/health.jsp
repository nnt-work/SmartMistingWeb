<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Check - Database & System Status | Smart Misting</title>
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
            max-width: 640px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 36px;
            box-shadow: var(--shadow-lg);
        }
    </style>
</head>
<body>
<div class="health-wrapper">
    <div class="health-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 18px;">
            <div>
                <h2 style="font-size: 1.35rem; font-weight: 800; color: #fff;">Kiểm Tra Kết Nối Hệ Thống (Health Check)</h2>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">Môn PRJ301 • Đề tài Smart Misting System • Test Case DB-01</p>
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
                            <span class="pulse-indicator danger"></span> FAILED
                        </span>
                    </c:otherwise>
                </c:choose>
            </div>
        </div>

        <c:choose>
            <c:when test="${dbConnected}">
                <div class="alert alert-success">
                    <svg style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    <div>
                        <strong>KẾT NỐI THÀNH CÔNG:</strong> Ứng dụng đã kết nối ổn định tới cơ sở dữ liệu <code>MistingDB</code> trên SQL Server.
                    </div>
                </div>

                <div style="margin-bottom: 24px; font-size: 0.88rem; background: rgba(15, 23, 42, 0.6); padding: 18px; border-radius: var(--radius-md);">
                    <div style="margin-bottom: 8px;"><strong>Cơ sở dữ liệu:</strong> MistingDB</div>
                    <div style="margin-bottom: 8px;"><strong>Hệ quản trị CSDL:</strong> ${dbProductName}</div>
                    <div><strong>Phiên bản:</strong> ${dbProductVersion}</div>
                </div>

                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 14px; color: #fff;">Số Lượng Bản Ghi Trong 7 Bảng:</h3>
                <div class="table-responsive" style="margin-bottom: 24px;">
                    <table class="data-table">
                        <thead>
                        <tr>
                            <th>Bảng (Table)</th>
                            <th>Mục Đích Dữ Liệu</th>
                            <th style="text-align: right;">Số Bản Ghi</th>
                        </tr>
                        </thead>
                        <tbody>
                        <c:forEach items="${tableCounts}" var="entry">
                            <tr>
                                <td><strong style="color: var(--secondary);">${entry.key}</strong></td>
                                <td style="font-size: 0.82rem; color: var(--text-secondary);">
                                    <c:choose>
                                        <c:when test="${entry.key == 'AppUser'}">Tài khoản & Phân quyền (Admin, Staff, Viewer)</c:when>
                                        <c:when test="${entry.key == 'Plant'}">Hồ sơ danh mục cây trồng</c:when>
                                        <c:when test="${entry.key == 'Device'}">Thiết bị ESP32 điều khiển</c:when>
                                        <c:when test="${entry.key == 'MistingSetting'}">Cấu hình ngưỡng độ ẩm bật/tắt & thời gian</c:when>
                                        <c:when test="${entry.key == 'SensorReading'}">Số đo cảm biến nhiệt độ & độ ẩm DHT11</c:when>
                                        <c:when test="${entry.key == 'ControlCommand'}">Lệnh điều khiển bật/tắt bơm & chuyển chế độ</c:when>
                                        <c:when test="${entry.key == 'ActivityLog'}">Nhật ký sự kiện phun sương & kiểm toán quản trị</c:when>
                                        <c:otherwise>Bảng dữ liệu</c:otherwise>
                                    </c:choose>
                                </td>
                                <td style="text-align: right;">
                                    <c:choose>
                                        <c:when test="${entry.value >= 0}">
                                            <span class="badge badge-staff">${entry.value}</span>
                                        </c:when>
                                        <c:otherwise>
                                            <span class="badge badge-danger">Lỗi</span>
                                        </c:otherwise>
                                    </c:choose>
                                </td>
                            </tr>
                        </c:forEach>
                        </tbody>
                    </table>
                </div>
            </c:when>
            <c:otherwise>
                <div class="alert alert-danger">
                    <svg style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                        <strong>KHÔNG THỂ KẾT NỐI TỚI SQL SERVER:</strong><br>
                        <code>${dbError}</code>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
                    Gợi ý khắc phục:
                    <br>1. Kiểm tra dịch vụ SQL Server (MSSQLSERVER) có đang Running không.
                    <br>2. Kiểm tra tài khoản <code>sa</code> và mật khẩu <code>12345</code> trong <code>DBContext.java</code>.
                    <br>3. Kiểm tra cổng TCP 1433 đã được kích hoạt trong SQL Server Configuration Manager chưa.
                    <br>4. Đã chạy script tạo cơ sở dữ liệu <code>database/01_schema.sql</code> và <code>database/02_sample_data.sql</code> chưa.
                </div>
            </c:otherwise>
        </c:choose>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
            <a href="${pageContext.request.contextPath}/login" class="btn btn-outline">
                ← Đến Trang Đăng Nhập
            </a>
            <a href="${pageContext.request.contextPath}/dashboard" class="btn btn-primary">
                Đến Dashboard →
            </a>
        </div>
    </div>
</div>
</body>
</html>
