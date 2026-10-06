<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${param.pageTitle != null ? param.pageTitle : "Smart Misting System"} | Group 5 PRJ301</title>
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
    <script>
        window.contextPath = "${pageContext.request.contextPath}";
    </script>
</head>
<body>
<div class="app-container">
    <!-- Sidebar Component -->
    <jsp:include page="/views/layout/sidebar.jsp" />

    <!-- Main Wrapper -->
    <div class="main-wrapper">
        <!-- Top Navbar -->
        <header class="top-navbar">
            <div class="page-title">
                <h1>${param.pageTitle != null ? param.pageTitle : "Hệ thống Phun Sương Tự Động"}</h1>
                <p>${param.pageSubtitle != null ? param.pageSubtitle : "Giám sát & Điều khiển IoT Nông Nghiệp Thông Minh"}</p>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px;">
                <!-- Theme Toggle Button -->
                <button id="themeToggleBtn" title="Chuyển chế độ Sáng/Tối" style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-primary); cursor: pointer; transition: var(--transition);">
                    <i class="fa-solid fa-moon" id="themeIcon"></i>
                </button>
                
                <div class="user-profile" style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.location.href='${pageContext.request.contextPath}/profile'">
                    <span class="user-greeting" style="color: var(--text-primary); font-size: 0.95rem;">Xin chào, <strong>${sessionScope.user.fullName}</strong></span>
                    <div class="avatar" style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fa-solid fa-user"></i>
                    </div>
                </div>
                <a href="${pageContext.request.contextPath}/logout" title="Đăng xuất" style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--danger); text-decoration: none; transition: var(--transition);">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </a>
            </div>
        </header>
        <!-- End Top Navbar -->
        
        <!-- Theme Toggle Script -->
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const themeBtn = document.getElementById('themeToggleBtn');
                const themeIcon = document.getElementById('themeIcon');
                
                // Load saved theme
                const savedTheme = localStorage.getItem('theme') || 'dark';
                if (savedTheme === 'light') {
                    document.body.setAttribute('data-theme', 'light');
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                }
                
                // Toggle theme on click
                themeBtn.addEventListener('click', () => {
                    const currentTheme = document.body.getAttribute('data-theme');
                    if (currentTheme === 'light') {
                        document.body.removeAttribute('data-theme');
                        localStorage.setItem('theme', 'dark');
                        themeIcon.classList.remove('fa-sun');
                        themeIcon.classList.add('fa-moon');
                    } else {
                        document.body.setAttribute('data-theme', 'light');
                        localStorage.setItem('theme', 'light');
                        themeIcon.classList.remove('fa-moon');
                        themeIcon.classList.add('fa-sun');
                    }
                });
            });
        </script>
        
        <!-- Main Content -->
        <main class="content-area">