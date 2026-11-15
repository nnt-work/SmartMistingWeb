package filter;

import dao.RolePermissionDAO;
import dao.UserDAO;
import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import model.AppUser;
import util.Json;

/**
 * Authentication and authorization servlet filter.
 * Verifies active sessions, checks locked accounts, enforces CSRF protections,
 * and validates RBAC permissions across URL routes.
 */
public class AuthFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {
    }

    @Override
    public void destroy() {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        req.setCharacterEncoding("UTF-8");
        resp.setCharacterEncoding("UTF-8");

        String uri = req.getRequestURI().substring(req.getContextPath().length());

        // Whitelisted public resources
        if (uri.equals("/") || uri.equals("/login") || uri.equals("/index.jsp")
                || uri.startsWith("/css/") || uri.startsWith("/js/")
                || uri.startsWith("/images/") || uri.startsWith("/webfonts/")) {
            chain.doFilter(request, response);
            return;
        }

        // Verify session and logged-in user
        HttpSession session = req.getSession(false);
        AppUser user = (session != null && session.getAttribute("user") instanceof AppUser)
                ? (AppUser) session.getAttribute("user")
                : null;

        if (user == null) {
            reject(req, resp, 401, "Please log in");
            return;
        }

        // Validate user status from database
        try {
            AppUser fresh = new UserDAO().getUserById(user.getUserId());
            if (fresh == null || fresh.isIsLocked()) {
                session.invalidate();
                reject(req, resp, 401, "Account locked or removed");
                return;
            }
            user = fresh;
            session.setAttribute("user", user);
            session.setAttribute("role", user.getRoleCode());
        } catch (Exception e) {
            reject(req, resp, 503, "Database unavailable. Check SQL Server configuration.");
            return;
        }

        // Cross-Origin Request protection on state-modifying requests
        String origin = req.getHeader("Origin");
        if ("POST".equals(req.getMethod()) && origin != null
                && !origin.equals(req.getScheme() + "://" + req.getHeader("Host"))) {
            reject(req, resp, 403, "Cross-origin write denied");
            return;
        }

        String role = user.getRoleCode();
        String view = req.getParameter("view");

        // Admin-only modules
        boolean adminOnly = uri.startsWith("/admin/users") || uri.startsWith("/users")
                || uri.startsWith("/admin/devices") || uri.startsWith("/devices")
                || ("/dashboard".equals(uri) && ("users".equals(view) || "hardware".equals(view) || "devices".equals(view)));

        if (adminOnly && !user.isAdmin()) {
            reject(req, resp, 403, "Administrator access required");
            return;
        }

        // Write actions restricted from VIEWER role
        boolean isControl = uri.equals("/control") || uri.equals("/api/bridge")
                || ("POST".equals(req.getMethod()) && uri.equals("/api/sensor"));
        boolean isSetting = uri.equals("/settings") || uri.equals("/admin/settings")
                || ("/dashboard".equals(uri) && "settings".equals(view));
        boolean isPlantWrite = uri.equals("/plants") && "POST".equals(req.getMethod());

        if ((isControl || isSetting || isPlantWrite) && user.isViewer()) {
            reject(req, resp, 403, "VIEWER role is read-only");
            return;
        }

        // Enforce granular module permission matrix
        String module = isControl ? "PUMP_OVERRIDE" : (isSetting ? "AUTO_SETTINGS" : (isPlantWrite ? "PLANT_CATALOG" : null));
        if (module != null && !new RolePermissionDAO().allowed(module, role)) {
            reject(req, resp, 403, "Permission disabled by administrator");
            return;
        }

        chain.doFilter(request, response);
    }

    private void reject(HttpServletRequest req, HttpServletResponse resp, int code, String msg) throws IOException {
        if (code == 401 && "GET".equals(req.getMethod()) && !req.getRequestURI().contains("/api/")) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }
        Json.send(resp, code, Json.map("status", "error", "success", false, "message", msg));
    }
}
