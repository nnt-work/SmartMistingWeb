package controller;

import dao.ActivityLogDAO;
import dao.ControlCommandDAO;
import dao.DeviceDAO;
import dao.MistingSettingDAO;
import dao.PlantDAO;
import dao.SensorReadingDAO;
import dao.UserDAO;
import model.ActivityLog;
import model.AppUser;
import model.ControlCommand;
import model.Device;
import model.MistingSetting;
import model.Plant;
import model.SensorReading;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

@WebServlet(name = "DashboardServlet", urlPatterns = {"/dashboard", "/index"})
public class DashboardServlet extends HttpServlet {

    private final SensorReadingDAO sensorDAO = new SensorReadingDAO();
    private final MistingSettingDAO settingDAO = new MistingSettingDAO();
    private final DeviceDAO deviceDAO = new DeviceDAO();
    private final ControlCommandDAO commandDAO = new ControlCommandDAO();
    private final PlantDAO plantDAO = new PlantDAO();
    private final UserDAO userDAO = new UserDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            for(String key:new String[]{"flashSuccess","flashError"})if(request.getSession().getAttribute(key)!=null){request.setAttribute(key.equals("flashError")?"errorMessage":"successMessage",request.getSession().getAttribute(key));request.getSession().removeAttribute(key);}
            String activeNav = (String) request.getAttribute("activeNav");
            if (activeNav == null || activeNav.trim().isEmpty()) {
                activeNav = request.getParameter("view");
            }
            if (activeNav == null || activeNav.trim().isEmpty()) {
                activeNav = "dashboard";
            }
            request.setAttribute("activeNav", activeNav);

            int deviceId = 1; // Default demo device
            String devParam = request.getParameter("device_id");
            if (devParam != null && !devParam.trim().isEmpty()) {
                try {
                    deviceId = Integer.parseInt(devParam.trim());
                } catch (NumberFormatException ignored) {
                }
            }

            // 1. Get latest sensor telemetry (with safe offline fallback)
            SensorReading latestReading = null;
            try {
                latestReading = sensorDAO.getLatestReading(deviceId);
            } catch (Exception ignored) {}
            if (latestReading == null) {
                latestReading = new SensorReading();
                latestReading.setDeviceId(deviceId);
                latestReading.setTemperatureC(null);
                latestReading.setHumidityPct(null);
                latestReading.setWaterOk(false);
                latestReading.setSensorOk(false);
                latestReading.setPumpOn(false);
                latestReading.setReportedMode("AUTO");
                latestReading.setPacketId("DEFAULT");
            }

            // 2. Get misting settings (with safe defaults)
            MistingSetting setting = null;
            try {
                setting = settingDAO.getSettingByDeviceId(deviceId);
            } catch (Exception ignored) {}
            if (setting == null) {
                setting = new MistingSetting();
                setting.setDeviceId(deviceId);
                setting.setHumidityOn(60.0);
                setting.setHumidityOff(70.0);
                setting.setMaxRunSec(15);
                setting.setCooldownSec(0);
                setting.setDesiredMode("AUTO");
            }

            // 3. Get device info
            Device device = null;
            List<Device> allDevices = new java.util.ArrayList<>();
            try {
                device = deviceDAO.getDeviceById(deviceId);
                allDevices = deviceDAO.getAllDevices();
            } catch (Exception ignored) {}

            // 4. Get recent readings for chart / table
            List<SensorReading> recentReadings = new java.util.ArrayList<>();
            try {
                recentReadings = sensorDAO.getRecentReadings(deviceId, 10);
            } catch (Exception ignored) {}

            // 5. Get recent commands
            List<ControlCommand> recentCommands = new java.util.ArrayList<>();
            try {
                recentCommands = commandDAO.getLatestCommands(deviceId, 5);
            } catch (Exception ignored) {}

            // 6. Quick statistics & full entity collections for console views
            int totalPlants = 0;
            int totalUsers = 0;
            List<Plant> allPlants = new java.util.ArrayList<>();
            List<AppUser> allUsers = new java.util.ArrayList<>();
            List<ActivityLog> mistingLogs = new java.util.ArrayList<>();
            List<ActivityLog> auditLogs = new java.util.ArrayList<>();
            try { totalPlants = plantDAO.countPlants(null); } catch (Exception ignored) {}
            model.AppUser actor=(model.AppUser)request.getSession().getAttribute("user");
            try { if(actor.isAdmin()) totalUsers = userDAO.countUsers(); } catch (Exception ignored) {}
            try { allPlants = plantDAO.getPlants(null, 1, 1000); } catch (Exception ignored) {}
            try { if(actor.isAdmin()) allUsers = userDAO.getAllUsers(request.getParameter("search"), request.getParameter("role")); } catch (Exception ignored) {}
            try { mistingLogs = logDAO.getLogs("MISTING", null, 50); } catch (Exception ignored) {}
            try { if(actor.isAdmin()) auditLogs = logDAO.getLogs("ADMIN", null, 100); } catch (Exception ignored) {}

            // Evaluate system alerts
            boolean alertLowWater   = Boolean.FALSE.equals(latestReading.getWaterOk());
            boolean alertSensorError = !latestReading.isSensorOk();
            boolean alertPumpRunning = latestReading.isPumpOn();

            // Offline detection: if last data received > 5 minutes ago, mark as offline
            boolean alertOffline = false;
            if (latestReading.getReceivedAt() != null) {
                long diffMs = System.currentTimeMillis() - latestReading.getReceivedAt().getTime();
                alertOffline = diffMs > 5 * 60 * 1000L; // 5 minutes
            } else {
                alertOffline = true; // No data ever received
            }

            request.setAttribute("latestReading", latestReading);
            request.setAttribute("setting", setting);
            request.setAttribute("device", device);
            request.setAttribute("allDevices", allDevices);
            request.setAttribute("recentReadings", recentReadings);
            request.setAttribute("recentCommands", recentCommands);
            request.setAttribute("totalPlants", totalPlants);
            request.setAttribute("totalUsers", totalUsers);
            request.setAttribute("allPlants", allPlants);
            request.setAttribute("allUsers", allUsers);
            if(request.getAttribute("mistingLogs")==null)request.setAttribute("mistingLogs", mistingLogs);
            request.setAttribute("auditLogs", auditLogs);
            request.setAttribute("alertLowWater", alertLowWater);
            request.setAttribute("alertSensorError", alertSensorError);
            request.setAttribute("alertPumpRunning", alertPumpRunning);

            request.setAttribute("permissions", new dao.RolePermissionDAO().getAllPermissions());
            request.setAttribute("bootstrapJson", service.Bootstrap.create(request, setting, allPlants, allUsers, recentCommands, recentReadings, auditLogs));
            request.getRequestDispatcher("/WEB-INF/views/dashboard/dashboard.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Error loading Dashboard telemetry: " + e.getMessage());
            request.getRequestDispatcher("/WEB-INF/views/dashboard/dashboard.jsp").forward(request, response);
        }
    }
}
