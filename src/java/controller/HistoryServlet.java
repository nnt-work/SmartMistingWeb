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

        try {
            List<ActivityLog> mistingLogs = logDAO.getLogs("MISTING", keyword, 50);
            List<SensorReading> sensorReadings = sensorDAO.getRecentReadings(1, 50);
            List<ActivityLog> adminLogs = null;

            if (user != null && user.isAdmin()) {
                adminLogs = logDAO.getLogs("ADMIN", keyword, 50);
            }

            request.setAttribute("activeTab", tab);
            request.setAttribute("searchKeyword", keyword);
            request.setAttribute("mistingLogs", mistingLogs);
            request.setAttribute("sensorReadings", sensorReadings);
            request.setAttribute("adminLogs", adminLogs);

            request.getRequestDispatcher("/views/history/history.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp nhật ký: " + e.getMessage());
            request.getRequestDispatcher("/views/history/history.jsp").forward(request, response);
        }
    }
}
