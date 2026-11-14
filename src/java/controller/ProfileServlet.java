package controller;

import dao.ActivityLogDAO;
import dao.RolePermissionDAO;
import dao.UserDAO;
import model.AppUser;
import model.RolePermission;
import util.PasswordUtil;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@WebServlet(name = "ProfileServlet", urlPatterns = {"/profile", "/change-password"})
public class ProfileServlet extends HttpServlet {

    private final UserDAO userDAO = new UserDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();
    private final RolePermissionDAO permDAO = new RolePermissionDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }

        try {
            AppUser fresh = userDAO.getUserById(user.getUserId());
            if (fresh != null) {
                request.setAttribute("userProfile", fresh);
                session.setAttribute("user", fresh);
            } else {
                request.setAttribute("userProfile", user);
            }

            List<RolePermission> permissions = permDAO.getAllPermissions();
            request.setAttribute("permissions", permissions);

            if (session.getAttribute("flashSuccess") != null) {
                request.setAttribute("successMessage", session.getAttribute("flashSuccess"));
                session.removeAttribute("flashSuccess");
            }
            if (session.getAttribute("flashError") != null) {
                request.setAttribute("errorMessage", session.getAttribute("flashError"));
                session.removeAttribute("flashError");
            }

            request.setAttribute("activeNav", "profile");
            request.getRequestDispatcher("/dashboard").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Error loading user profile: " + e.getMessage());
            request.setAttribute("activeNav", "profile");
            request.getRequestDispatcher("/dashboard").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }

        String action = request.getParameter("action");

        try {
            if ("update_status".equalsIgnoreCase(action)) {
                String statusText = request.getParameter("status_text");
                if (statusText == null || statusText.trim().isEmpty()) {
                    statusText = "Active";
                }
                userDAO.updateStatus(user.getUserId(), statusText.trim());
                user.setStatusText(statusText.trim());
                session.setAttribute("user", user);

                logDAO.log("ADMIN", null, user.getUserId(), null, "STATUS_UPDATE",
                        "[" + user.getUsername() + "] updated status text to: " + statusText.trim());

                session.setAttribute("flashSuccess", "Status updated successfully!");
                response.sendRedirect(request.getContextPath() + "/profile");
                return;

            } else if ("toggle_permission".equalsIgnoreCase(action)) {

                if (!user.isAdmin()) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Only administrators can modify RBAC permissions.");
                    return;
                }

                String moduleKey = request.getParameter("module_key");
                String roleTarget = request.getParameter("role_target");
                String allowedStr = request.getParameter("allowed");
                boolean allowed = "true".equalsIgnoreCase(allowedStr) || "1".equals(allowedStr);

                if (moduleKey != null && roleTarget != null) {
                    if (!permDAO.updatePermission(moduleKey, roleTarget, allowed)) throw new IllegalArgumentException("Permission not updated. ADMIN permissions are fixed.");
                    logDAO.log("ADMIN", null, user.getUserId(), null, "RBAC_UPDATE",
                            "[" + user.getUsername() + "] set permission " + moduleKey + " for role " + roleTarget + " to: " + (allowed ? "ALLOWED" : "REVOKED"));
                }

                String isAjax = request.getHeader("X-Requested-With");
                if ("XMLHttpRequest".equalsIgnoreCase(isAjax)) {
                    response.setContentType("application/json;charset=UTF-8");
                    PrintWriter out = response.getWriter();
                    out.write("{\"success\": true, \"module\": \"" + moduleKey + "\", \"role\": \"" + roleTarget + "\", \"allowed\": " + allowed + "}");
                    return;
                }

                session.setAttribute("flashSuccess", "Permission for " + moduleKey + " (" + roleTarget + ") updated!");
                response.sendRedirect(request.getContextPath() + "/profile");
                return;

            } else if ("update_profile".equalsIgnoreCase(action)) {
                String fullName = request.getParameter("full_name");
                String email = request.getParameter("email");

                if (fullName == null || fullName.trim().isEmpty()) {
                    session.setAttribute("flashError", "Full name cannot be empty!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                userDAO.updateProfile(user.getUserId(), fullName.trim(), email != null ? email.trim() : "");
                user.setFullName(fullName.trim());
                user.setEmail(email != null ? email.trim() : "");
                session.setAttribute("fullName", user.getFullName());

                logDAO.log("ADMIN", null, user.getUserId(), null, "PROFILE_UPDATE",
                        "[" + user.getUsername() + "] updated user profile.");

                session.setAttribute("flashSuccess", "Profile updated successfully!");

            } else if ("change_password".equalsIgnoreCase(action)) {
                String currentPass = request.getParameter("current_password");
                String newPass = request.getParameter("new_password");
                String confirmPass = request.getParameter("confirm_password");

                if (currentPass == null || currentPass.trim().isEmpty()
                        || newPass == null || newPass.trim().isEmpty()) {
                    session.setAttribute("flashError", "Please enter current password and new password!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                if (!newPass.equals(confirmPass)) {
                    session.setAttribute("flashError", "Confirmation password does not match!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                AppUser fresh = userDAO.getUserById(user.getUserId());
                if (fresh == null || !PasswordUtil.verify(currentPass, fresh.getPasswordHash())) {
                    session.setAttribute("flashError", "Current password is incorrect!");
                    response.sendRedirect(request.getContextPath() + "/profile");
                    return;
                }

                userDAO.updatePassword(user.getUserId(), newPass);
                logDAO.log("ADMIN", null, user.getUserId(), null, "PASSWORD_CHANGE",
                        "[" + user.getUsername() + "] changed account password successfully.");

                session.setAttribute("flashSuccess", "Password changed successfully!");
            }

            response.sendRedirect(request.getContextPath() + "/profile");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Operation error: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/profile");
        }
    }
}
