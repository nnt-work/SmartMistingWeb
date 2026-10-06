package controller;

import dao.ControlCommandDAO;
import dao.DeviceDAO;
import dao.MistingSettingDAO;
import dao.PlantDAO;
import dao.SensorReadingDAO;
import dao.UserDAO;
import model.ControlCommand;
import model.Device;
import model.MistingSetting;
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

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            int deviceId = 1; // Default demo device
            String devParam = request.getParameter("device_id");
            if (devParam != null && !devParam.trim().isEmpty()) {
                try {
                    deviceId = Integer.parseInt(devParam.trim());
                } catch (NumberFormatException ignored) {
                }
            }

            // 1. Get latest sensor telemetry
            SensorReading latestReading = sensorDAO.getLatestReading(deviceId);
            if (latestReading == null) {
                // Mock default reading if empty
                latestReading = new SensorReading();
                latestReading.setDeviceId(deviceId);
                latestReading.setTemperatureC(28.5);
                latestReading.setHumidityPct(55.0);
                latestReading.setWaterOk(true);
                latestReading.setSensorOk(true);
                latestReading.setPumpOn(false);
                latestReading.setReportedMode("AUTO");
                latestReading.setPacketId("DEFAULT");
            }

            // 2. Get misting settings
            MistingSetting setting = settingDAO.getSettingByDeviceId(deviceId);
            if (setting == null) {
                setting = new MistingSetting();
                setting.setDeviceId(deviceId);
            }

            // 3. Get device info
            Device device = deviceDAO.getDeviceById(deviceId);
            List<Device> allDevices = deviceDAO.getAllDevices();

            // 4. Get recent readings for chart / table
            List<SensorReading> recentReadings = sensorDAO.getRecentReadings(deviceId, 10);

            // 5. Get recent commands
            List<ControlCommand> recentCommands = commandDAO.getLatestCommands(deviceId, 5);

            // 6. Quick statistics
            int totalPlants = plantDAO.countPlants(null);
            int totalUsers = userDAO.getAllUsers(null, "ALL").size();

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
            request.setAttribute("alertLowWater", alertLowWater);
            request.setAttribute("alertSensorError", alertSensorError);
            request.setAttribute("alertPumpRunning", alertPumpRunning);

            request.getRequestDispatcher("/views/dashboard/dashboard.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp dữ liệu Dashboard: " + e.getMessage());
            request.getRequestDispatcher("/views/dashboard/dashboard.jsp").forward(request, response);
        }
    }
}
