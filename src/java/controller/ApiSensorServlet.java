package controller;

import dao.ActivityLogDAO;
import dao.MistingSettingDAO;
import dao.SensorReadingDAO;
import model.MistingSetting;
import model.SensorReading;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

@WebServlet(name = "ApiSensorServlet", urlPatterns = {"/api/sensor"})
public class ApiSensorServlet extends HttpServlet {

    private final SensorReadingDAO sensorDAO = new SensorReadingDAO();
    private final MistingSettingDAO settingDAO = new MistingSettingDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        int deviceId = 1;
        try {
            deviceId = Integer.parseInt(request.getParameter("device_id"));
        } catch (Exception ignored) {
        }

        try {
            SensorReading latest = sensorDAO.getLatestReading(deviceId);
            MistingSetting setting = settingDAO.getSettingByDeviceId(deviceId);

            if (latest == null) {
                latest = new SensorReading();
                latest.setDeviceId(deviceId);
                latest.setTemperatureC(28.0);
                latest.setHumidityPct(55.0);
                latest.setWaterOk(true);
                latest.setSensorOk(true);
                latest.setPumpOn(false);
                latest.setReportedMode("AUTO");
            }

            StringBuilder json = new StringBuilder("{");
            json.append("\"status\": \"success\",");
            json.append("\"temperature_c\": ").append(latest.getTemperatureC()).append(",");
            json.append("\"humidity_pct\": ").append(latest.getHumidityPct()).append(",");
            json.append("\"water_ok\": ").append(latest.getWaterOk()).append(",");
            json.append("\"sensor_ok\": ").append(latest.isSensorOk()).append(",");
            json.append("\"pump_on\": ").append(latest.isPumpOn()).append(",");
            json.append("\"reported_mode\": \"").append(latest.getReportedMode() != null ? latest.getReportedMode() : "AUTO").append("\",");
            json.append("\"packet_id\": \"").append(latest.getPacketId() != null ? latest.getPacketId() : "").append("\",");
            json.append("\"measured_at\": \"").append(latest.getMeasuredAt() != null ? latest.getMeasuredAt().toString() : "").append("\",");
            json.append("\"setting\": {");
            if (setting != null) {
                json.append("\"humidity_on\": ").append(setting.getHumidityOn()).append(",");
                json.append("\"humidity_off\": ").append(setting.getHumidityOff()).append(",");
                json.append("\"max_run_sec\": ").append(setting.getMaxRunSec()).append(",");
                json.append("\"cooldown_sec\": ").append(setting.getCooldownSec()).append(",");
                json.append("\"desired_mode\": \"").append(setting.getDesiredMode()).append("\"");
            }
            json.append("}}");

            out.write(json.toString());

        } catch (Exception e) {
            e.printStackTrace();
            out.write("{\"status\": \"error\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        int deviceId = 1;
        try {
            deviceId = Integer.parseInt(request.getParameter("device_id"));
        } catch (Exception ignored) {
        }

        try {
            double temp = Double.parseDouble(request.getParameter("temperature_c"));
            double hum = Double.parseDouble(request.getParameter("humidity_pct"));
            boolean waterOk = "true".equalsIgnoreCase(request.getParameter("water_ok")) || "1".equals(request.getParameter("water_ok"));
            boolean sensorOk = request.getParameter("sensor_ok") == null || "true".equalsIgnoreCase(request.getParameter("sensor_ok")) || "1".equals(request.getParameter("sensor_ok"));
            boolean isRaining = "true".equalsIgnoreCase(request.getParameter("is_raining")) || "1".equals(request.getParameter("is_raining"));

            MistingSetting setting = settingDAO.getSettingByDeviceId(deviceId);
            String currentMode = setting != null ? setting.getDesiredMode() : "AUTO";

            boolean pumpOn = false;
            // AUTO Logic from project spec:
            if ("AUTO".equalsIgnoreCase(currentMode)) {
                if (!waterOk || !sensorOk || isRaining) {
                    pumpOn = false;
                } else if (setting != null && hum < setting.getHumidityOn()) {
                    pumpOn = true;
                } else if (setting != null && hum > setting.getHumidityOff()) {
                    pumpOn = false;
                }
            } else {
                // MANUAL mode: keep existing pump state or take explicit parameter
                String pumpParam = request.getParameter("pump_on");
                if (pumpParam != null) {
                    pumpOn = "true".equalsIgnoreCase(pumpParam) || "1".equals(pumpParam);
                } else {
                    SensorReading prev = sensorDAO.getLatestReading(deviceId);
                    pumpOn = (prev != null) && prev.isPumpOn();
                }
                if (!waterOk || !sensorOk) {
                    pumpOn = false; // Emergency failsafe override
                }
            }

            SensorReading reading = new SensorReading();
            reading.setDeviceId(deviceId);
            reading.setPacketId("PKT-" + System.currentTimeMillis());
            reading.setTemperatureC(temp);
            reading.setHumidityPct(hum);
            reading.setWaterOk(waterOk);
            reading.setSensorOk(sensorOk);
            reading.setIsRaining(isRaining);
            reading.setReportedMode(currentMode);
            reading.setPumpOn(pumpOn);
            reading.setAppliedVersion(setting != null ? setting.getVersion() : 1);
            reading.setIsSample(false);

            sensorDAO.addReading(reading);

            // Log AUTO event when pump state triggers
            if ("AUTO".equalsIgnoreCase(currentMode) && pumpOn) {
                logDAO.log("MISTING", deviceId, null, null, "AUTO_START",
                        "AUTO: Độ ẩm " + hum + "% < ngưỡng " + (setting != null ? setting.getHumidityOn() : 60) + "%, Bơm tự động BẬT.");
            }

            out.write("{\"status\": \"success\", \"pump_on\": " + pumpOn + ", \"mode\": \"" + currentMode + "\"}");

        } catch (Exception e) {
            e.printStackTrace();
            out.write("{\"status\": \"error\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }
}
