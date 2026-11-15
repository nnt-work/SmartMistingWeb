package controller;

import dao.ActivityLogDAO;
import dao.SensorReadingDAO;
import model.ActivityLog;
import model.AppUser;
import model.SensorReading;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

@WebServlet(name = "HistoryServlet", urlPatterns = {"/history"})
public class HistoryServlet extends HttpServlet {

    private final ActivityLogDAO logDAO = new ActivityLogDAO();
    private final SensorReadingDAO sensorDAO = new SensorReadingDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        String tab = request.getParameter("tab");
        if (tab == null || tab.trim().isEmpty()) {
            tab = "misting";
        }

        // Security check: If viewer/staff requests admin tab, fallback to misting
        if ("admin".equalsIgnoreCase(tab) && (user == null || !user.isAdmin())) {
            tab = "misting";
        }

        String keyword = request.getParameter("search");
        String fromDate = request.getParameter("fromDate");
        String toDate = request.getParameter("toDate");

        try {
            List<ActivityLog> mistingLogs = logDAO.getLogs("MISTING", keyword, 50);
            
            List<SensorReading> sensorReadings;
            if ((fromDate != null && !fromDate.trim().isEmpty()) || (toDate != null && !toDate.trim().isEmpty())) {
                sensorReadings = sensorDAO.getReadingsByDateRange(1, fromDate, toDate, 100);
            } else {
                sensorReadings = sensorDAO.getRecentReadings(1, 50);
            }

            List<ActivityLog> adminLogs = null;
            if (user != null && user.isAdmin()) {
                adminLogs = logDAO.getLogs("ADMIN", keyword, 50);
            }

            request.setAttribute("activeTab", tab);
            request.setAttribute("searchKeyword", keyword);
            request.setAttribute("fromDate", fromDate);
            request.setAttribute("toDate", toDate);
            request.setAttribute("mistingLogs", mistingLogs);
            request.setAttribute("sensorReadings", sensorReadings);
            request.setAttribute("adminLogs", adminLogs);

            if (session != null && session.getAttribute("flashSuccess") != null) {
                request.setAttribute("successMessage", session.getAttribute("flashSuccess"));
                session.removeAttribute("flashSuccess");
            }

            request.setAttribute("activeNav", "history");
            request.getRequestDispatcher("/dashboard").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Error loading activity logs: " + e.getMessage());
            request.setAttribute("activeNav", "history");
            request.getRequestDispatcher("/dashboard").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null || !user.isAdmin()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Only administrators can clear history logs.");
            return;
        }

        String action = request.getParameter("action");
        String scope = request.getParameter("scope");
        if (scope == null || scope.trim().isEmpty()) {
            scope = "all";
        }

        try {
            if ("clear".equalsIgnoreCase(action)) {
                int count = 0;
                if ("misting".equalsIgnoreCase(scope)) {
                    count = logDAO.clearLogs("MISTING");
                } else if ("admin".equalsIgnoreCase(scope)) {
                    count = logDAO.clearLogs("ADMIN");
                } else if ("sensor".equalsIgnoreCase(scope)) {
                    count = sensorDAO.clearAllReadings();
                } else {
                    count = logDAO.clearLogs("ALL") + sensorDAO.clearAllReadings();
                }

                logDAO.log("ADMIN", null, user.getUserId(), null, "CLEAR_HISTORY",
                        "[" + user.getUsername() + "] cleared " + scope.toUpperCase() + " history logs (" + count + " records removed).");

                session.setAttribute("flashSuccess", "History logs (" + scope.toUpperCase() + ") purged successfully.");
            }

            response.sendRedirect(request.getContextPath() + "/history");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Failed to clear history: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/history");
        }
    }
}
