package filter;

import model.AppUser;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class AuthFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        // Force UTF-8 for all requests/responses
        request.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");

        String contextPath = request.getContextPath();
        String uri = request.getRequestURI().substring(contextPath.length());

        // 1. Allow static resources and public endpoints
        if (isPublicResource(uri)) {
            chain.doFilter(req, res);
            return;
        }

        // 2. Check session authentication
        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            // Not logged in -> redirect to login page
            String query = request.getQueryString();
            String redirectUrl = uri + (query != null ? "?" + query : "");
            response.sendRedirect(contextPath + "/login?redirect=" + java.net.URLEncoder.encode(redirectUrl, "UTF-8"));
            return;
        }

        // Check if user is locked
        if (user.isIsLocked()) {
            session.invalidate();
            response.sendRedirect(contextPath + "/login?error=account_locked");
            return;
        }

        String role = user.getRoleCode() != null ? user.getRoleCode().toUpperCase() : "";

        // 3. Role-based access control (RBAC)
        // Rule A: Admin-only paths
        if (isAdminOnlyPath(uri)) {
            if (!"ADMIN".equals(role)) {
                request.setAttribute("errorMessage", "Bạn không có quyền quản trị viên (ADMIN) để truy cập chức năng này.");
                request.getRequestDispatcher("/views/error/403.jsp").forward(request, response);
                return;
            }
        }

        // Rule B: Control & Mutation paths (ADMIN and STAFF allowed, VIEWER blocked)
        if (isControlOrMutationPath(request, uri)) {
            if ("VIEWER".equals(role)) {
                request.setAttribute("errorMessage", "Tài khoản Người xem (VIEWER) chỉ có quyền xem dữ liệu, không được phép điều khiển bơm hoặc chỉnh sửa dữ liệu.");
                request.getRequestDispatcher("/views/error/403.jsp").forward(request, response);
                return;
            }
        }

        // User is authorized
        chain.doFilter(req, res);
    }

    private boolean isPublicResource(String uri) {
        if (uri.equals("/") || uri.equals("/login") || uri.equals("/logout") || uri.equals("/health")) {
            return true;
        }
        if (uri.startsWith("/css/") || uri.startsWith("/js/") || uri.startsWith("/images/") || uri.startsWith("/fonts/")) {
            return true;
        }
        if (uri.startsWith("/api/sensor") || uri.startsWith("/api/iot")) {
            return true;
        }
        if (uri.endsWith(".css") || uri.endsWith(".js") || uri.endsWith(".ico") || uri.endsWith(".png") || uri.endsWith(".jpg")) {
            return true;
        }
        return false;
    }

    private boolean isAdminOnlyPath(String uri) {
        return uri.startsWith("/admin") || uri.equals("/admin/users") || uri.equals("/admin/devices") || uri.equals("/admin/settings");
    }

    private boolean isControlOrMutationPath(HttpServletRequest request, String uri) {
        // Control pump or change mode
        if (uri.startsWith("/control")) {
            return true;
        }
        // Plant add/edit/delete mutations
        if (uri.startsWith("/plants") && "POST".equalsIgnoreCase(request.getMethod())) {
            String action = request.getParameter("action");
            if ("add".equalsIgnoreCase(action) || "edit".equalsIgnoreCase(action) || "delete".equalsIgnoreCase(action)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public void destroy() {
    }
}
