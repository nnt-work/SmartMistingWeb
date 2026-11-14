package controller;

import dao.ActivityLogDAO;
import dao.UserDAO;
import model.AppUser;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

@WebServlet(name = "UserManagementServlet", urlPatterns = {"/admin/users", "/users"})
public class UserManagementServlet extends HttpServlet {

    private final UserDAO userDAO = new UserDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String keyword = request.getParameter("search");
        String roleFilter = request.getParameter("role");

        try {
            List<AppUser> users = userDAO.getAllUsers(keyword, roleFilter);

            request.setAttribute("users", users);
            request.setAttribute("searchKeyword", keyword);
            request.setAttribute("selectedRole", roleFilter != null ? roleFilter : "ALL");

            // Pop flash messages if any
            HttpSession session = request.getSession(false);
            if (session != null) {
                if (session.getAttribute("flashSuccess") != null) {
                    request.setAttribute("successMessage", session.getAttribute("flashSuccess"));
                    session.removeAttribute("flashSuccess");
                }
                if (session.getAttribute("flashError") != null) {
                    request.setAttribute("errorMessage", session.getAttribute("flashError"));
                    session.removeAttribute("flashError");
                }
            }

            request.setAttribute("activeNav", "users");
            request.getRequestDispatcher("/dashboard").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Error loading user accounts: " + e.getMessage());
            request.setAttribute("activeNav", "users");
            request.getRequestDispatcher("/dashboard").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser currentUser = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (currentUser == null || !currentUser.isAdmin()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Only administrators are authorized to manage user accounts.");
            return;
        }

        String action = request.getParameter("action");

        try {
            if("create".equalsIgnoreCase(action)||"update".equalsIgnoreCase(action)) {
                String role=request.getParameter("role_code"),full=request.getParameter("full_name");
                if(!"ADMIN".equals(role)&&!"STAFF".equals(role)&&!"VIEWER".equals(role))throw new IllegalArgumentException("Invalid role");
                if(full==null||full.trim().isEmpty()||full.length()>100)throw new IllegalArgumentException("Full name is required and maximum 100 characters");
            }
            if ("create".equalsIgnoreCase(action)) {
                String username = request.getParameter("username");
                String fullName = request.getParameter("full_name");
                String email = request.getParameter("email");
                String roleCode = request.getParameter("role_code");
                String password = request.getParameter("password");

                if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
                    session.setAttribute("flashError", "Username and password cannot be empty!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                if (userDAO.getUserByUsername(username.trim()) != null) {
                    session.setAttribute("flashError", "Username [" + username.trim() + "] already exists in the system!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                AppUser newUser = new AppUser();
                newUser.setUsername(username.trim());
                newUser.setFullName(fullName != null ? fullName.trim() : username.trim());
                newUser.setEmail(email != null ? email.trim() : "");
                newUser.setRoleCode(roleCode != null ? roleCode.trim().toUpperCase() : "STAFF");

                userDAO.createUser(newUser, password);
                logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_CREATE",
                        "[" + currentUser.getUsername() + "] created new user: " + newUser.getUsername() + " (" + newUser.getRoleCode() + ")");

                session.setAttribute("flashSuccess", "User account [" + newUser.getUsername() + "] created successfully!");

            } else if ("update".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                String fullName = request.getParameter("full_name");
                String email = request.getParameter("email");
                String roleCode = request.getParameter("role_code");

                AppUser target = userDAO.getUserById(targetId);
                if (target == null) {
                    session.setAttribute("flashError", "User account not found!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                // Business rule: Do not demote the last active admin
                if (target.isAdmin() && !"ADMIN".equalsIgnoreCase(roleCode)) {
                    if (userDAO.countActiveAdmins() <= 1) {
                        session.setAttribute("flashError", "Cannot demote the only remaining active Administrator!");
                        response.sendRedirect(request.getContextPath() + "/admin/users");
                        return;
                    }
                }

                target.setFullName(fullName != null ? fullName.trim() : target.getFullName());
                target.setEmail(email != null ? email.trim() : target.getEmail());
                target.setRoleCode(roleCode != null ? roleCode.trim().toUpperCase() : target.getRoleCode());

                userDAO.updateUser(target);
                logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_UPDATE",
                        "[" + currentUser.getUsername() + "] updated account details for [" + target.getUsername() + "].");

                session.setAttribute("flashSuccess", "User account [" + target.getUsername() + "] updated successfully!");

            } else if ("toggle_lock".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                if (targetId == currentUser.getUserId()) {
                    session.setAttribute("flashError", "You cannot lock your own account!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                AppUser target = userDAO.getUserById(targetId);
                if (target != null) {
                    boolean newLockState = !target.isIsLocked();
                    // Prevent locking last admin
                    if (target.isAdmin() && newLockState && userDAO.countActiveAdmins() <= 1) {
                        session.setAttribute("flashError", "Cannot lock the only remaining active Administrator!");
                        response.sendRedirect(request.getContextPath() + "/admin/users");
                        return;
                    }

                    userDAO.setLockStatus(targetId, newLockState);
                    logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_LOCK",
                            "[" + currentUser.getUsername() + "] " + (newLockState ? "LOCKED" : "UNLOCKED") + " account [" + target.getUsername() + "].");

                    session.setAttribute("flashSuccess", (newLockState ? "Locked" : "Unlocked") + " account [" + target.getUsername() + "].");
                }

            } else if ("reset_password".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                AppUser target = userDAO.getUserById(targetId);
                if (target != null) {
                    userDAO.updatePassword(targetId, "12345");
                    logDAO.log("ADMIN", null, currentUser.getUserId(), null, "PASSWORD_RESET",
                            "[" + currentUser.getUsername() + "] reset password for [" + target.getUsername() + "] to default: 12345");

                    session.setAttribute("flashSuccess", "Reset password for [" + target.getUsername() + "] to default: 12345");
                }

            } else if ("delete".equalsIgnoreCase(action)) {
                int targetId = Integer.parseInt(request.getParameter("user_id"));
                if (targetId == currentUser.getUserId()) {
                    session.setAttribute("flashError", "You cannot delete your own account!");
                    response.sendRedirect(request.getContextPath() + "/admin/users");
                    return;
                }

                AppUser target = userDAO.getUserById(targetId);
                if (target != null) {
                    if (target.isAdmin() && userDAO.countActiveAdmins() <= 1) {
                        session.setAttribute("flashError", "Cannot delete the only remaining active Administrator!");
                        response.sendRedirect(request.getContextPath() + "/admin/users");
                        return;
                    }

                    userDAO.deleteUser(targetId);
                    logDAO.log("ADMIN", null, currentUser.getUserId(), null, "USER_DELETE",
                            "[" + currentUser.getUsername() + "] deleted account [" + target.getUsername() + "].");

                    session.setAttribute("flashSuccess", "Deleted user account [" + target.getUsername() + "] successfully.");
                }
            }

            response.sendRedirect(request.getContextPath() + "/admin/users");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "User management error: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/admin/users");
        }
    }
}
