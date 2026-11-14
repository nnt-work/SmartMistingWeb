package controller;

import dao.*;
import model.*;
import service.*;
import util.Json;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;

@WebServlet(name = "ApiSensorServlet", urlPatterns = {"/api/sensor"})
public class ApiSensorServlet extends HttpServlet {

    private final SensorReadingDAO dao = new SensorReadingDAO();
    private static final ConcurrentLinkedQueue<String> pendingCommands = new ConcurrentLinkedQueue<>();

    public static Map<String, Object> reading(SensorReading r) {
        if (r == null) {
            Map<String, Object> m = new HashMap<>();
            m.put("online", false);
            m.put("telemetry_live", false);
            m.put("soil_moisture", null);
            m.put("soil", null);
            m.put("humidity_pct", null);
            m.put("water", null);
            m.put("water_pct", null);
            m.put("water_ok", false);
            m.put("air_temp", null);
            m.put("air_hum", null);
            m.put("pump_on", false);
            m.put("mode", "AUTO");
            m.put("reported_mode", "AUTO");
            m.put("lock_reason", "NONE");
            return m;
        }

        boolean online = r.getReceivedAt() != null && !r.isIsSample()
                && (System.currentTimeMillis() - r.getReceivedAt().getTime() <= 10000);

        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getReadingId());
        m.put("device_id", r.getDeviceId());
        m.put("soil", r.getHumidityPct());
        m.put("soil_moisture", r.getHumidityPct());
        m.put("humidity_pct", r.getHumidityPct());
        m.put("water", r.getWaterPercent());
        m.put("water_pct", r.getWaterPercent());
        m.put("water_ok", r.getWaterOk());
        m.put("sensor_ok", r.isSensorOk());
        m.put("air_temp", r.getAirTemperature());
        m.put("air_hum", r.getAirHumidity());
        m.put("air_humidity", r.getAirHumidity());
        m.put("dht_ok", r.getDhtOk());
        m.put("pump_on", r.isPumpOn());
        m.put("relay_on", r.isPumpOn());
        m.put("reported_mode", r.getReportedMode());
        m.put("mode", r.getReportedMode());
        m.put("lock_reason", r.getLockReason());
        m.put("is_sample", r.isIsSample());
        m.put("received_at_ms", r.getReceivedAt() == null ? 0 : r.getReceivedAt().getTime());
        m.put("time", r.getReceivedAt());
        m.put("online", online);
        m.put("telemetry_live", online);
        return m;
    }

    @Override
    protected void doGet(HttpServletRequest q, HttpServletResponse p) throws IOException {
        p.setCharacterEncoding("UTF-8");
        p.setContentType("application/json;charset=UTF-8");
        try {
            int id = Integer.parseInt(q.getParameter("device_id") == null ? "1" : q.getParameter("device_id"));
            String a = q.getParameter("action");

            if ("poll_command".equalsIgnoreCase(a)) {
                String nextCmd = pendingCommands.poll();
                Json.send(p, 200, Json.map("status", "success", "command", nextCmd));
                return;
            }

            if ("history".equals(a)) {
                List<Object> list = new ArrayList<>();
                try {
                    for (SensorReading r : dao.getRecentReadings(id, 100)) {
                        list.add(reading(r));
                    }
                } catch (Exception ignored) {}
                Json.send(p, 200, Json.map("status", "success", "readings", list));
                return;
            }

            if ("logs".equals(a)) {
                AppUser u = (AppUser) q.getSession().getAttribute("user");
                List<Object> list = new ArrayList<>();
                boolean isAdmin = u != null && u.isAdmin();
                try {
                    for (ActivityLog l : new ActivityLogDAO().getLogs(isAdmin ? "ALL" : "MISTING", null, 100)) {
                        list.add(Json.map(
                                "id", l.getLogId(),
                                "time", l.getOccurredAt(),
                                "type", l.getLogType(),
                                "action", l.getAction(),
                                "detail", l.getDetail(),
                                "user", l.getUsername()
                        ));
                    }
                } catch (Exception ignored) {}
                Json.send(p, 200, Json.map("status", "success", "logs", list));
                return;
            }

            SensorReading latest = null;
            try {
                latest = dao.getLatestReading(id);
            } catch (Exception ignored) {}

            Map<String, Object> data = reading(latest);
            data.put("status", "success");
            try {
                MistingSetting s = new MistingSettingDAO().getSettingByDeviceId(id);
                if (s != null) {
                    data.put("setting", Json.map(
                            "humidity_on", s.getHumidityOn(),
                            "humidity_off", s.getHumidityOff(),
                            "max_run_sec", s.getMaxRunSec(),
                            "cooldown_sec", s.getCooldownSec(),
                            "desired_mode", s.getDesiredMode()
                    ));
                }
            } catch (Exception ignored) {}
            Json.send(p, 200, data);
        } catch (Exception e) {
            getServletContext().log("Telemetry read failed", e);
            Json.send(p, 200, Json.map("status", "offline", "message", "Database standby."));
        }
    }

    @Override
    protected void doPost(HttpServletRequest q, HttpServletResponse p) throws IOException {
        q.setCharacterEncoding("UTF-8");
        p.setCharacterEncoding("UTF-8");
        p.setContentType("application/json;charset=UTF-8");
        try {
            Map<String, String> m = Json.body(q);
            String action = m.get("action");

            if ("send_command".equalsIgnoreCase(action) || "command".equalsIgnoreCase(action)) {
                String cmd = m.get("command") != null ? m.get("command") : m.get("cmd");
                if (cmd != null && !cmd.trim().isEmpty()) {
                    String cleanCmd = cmd.trim().toUpperCase();
                    pendingCommands.offer(cleanCmd);
                    Json.send(p, 200, Json.map("status", "success", "queued_command", cleanCmd));
                    return;
                }
                Json.send(p, 400, Json.map("status", "error", "message", "Missing command parameter"));
                return;
            }

            if ("intentional_stop".equals(action)) {
                AlertManager.getInstance().setIntentionalStop(true);
                Json.send(p, 200, Json.map("status", "success"));
                return;
            }

            if ("cleanup_test".equals(action)) {
                AppUser u = (AppUser) q.getSession().getAttribute("user");
                if (u == null || !u.isAdmin()) {
                    Json.send(p, 403, Json.map("status", "error"));
                    return;
                }
                try {
                    dao.deleteSampleReadings();
                    new ActivityLogDAO().deleteSampleLogs();
                } catch (Exception ignored) {}
                Json.send(p, 200, Json.map("status", "success"));
                return;
            }

            int id = 1;
            try {
                id = Integer.parseInt(m.containsKey("device_id") ? m.get("device_id") : "1");
            } catch (Exception ignored) {}

            Double soil = Json.number(m, "humidity_pct", "soil", "humidity", "soil_moisture", "soilMoisture");
            Double water = Json.number(m, "water_pct", "water", "tank_level", "tankLevel");
            Double temp = Json.number(m, "air_temp", "temperature_c", "temp", "temperatureC");
            Double rh = Json.number(m, "air_hum", "air_humidity", "humidityPct");

            boolean pumpOn = m.containsKey("pump_on") ? Json.flag(m, "pump_on")
                    : (m.containsKey("relay_on") ? Json.flag(m, "relay_on")
                    : (m.containsKey("pump") ? Json.flag(m, "pump")
                    : (m.containsKey("relay") ? Json.flag(m, "relay") : false)));

            boolean sensorOk = m.containsKey("sensor_ok") ? Json.flag(m, "sensor_ok") : (soil != null && water != null);
            boolean dhtOk = m.containsKey("dht_ok") ? Json.flag(m, "dht_ok") : (temp != null && rh != null);
            boolean waterOk = m.containsKey("water_ok") ? Json.flag(m, "water_ok") : (water != null && water >= 20.0);
            boolean isSample = Json.flag(m, "is_sample");

            String mode = m.containsKey("reported_mode") ? m.get("reported_mode") : m.get("mode");
            if (mode == null || (!"AUTO".equalsIgnoreCase(mode) && !"MANUAL".equalsIgnoreCase(mode))) {
                mode = (mode != null && mode.toUpperCase().contains("MANUAL")) ? "MANUAL" : "AUTO";
            } else {
                mode = mode.toUpperCase();
            }

            String lock = m.containsKey("lock_reason") ? m.get("lock_reason") : m.get("lock");
            if (lock == null) lock = "NONE";

            // 1. Process Telemetry and Live SCADA Notifications IMMEDIATELY
            if (!isSample) {
                AlertService.getInstance().onTelemetry(id, soil, rh, temp, water, waterOk, sensorOk, dhtOk, pumpOn, mode, lock);
            }

            // 2. Safe Database Persistence (non-blocking for alerts)
            try {
                SensorReading r = new SensorReading();
                r.setDeviceId(id);
                r.setPacketId("PKT-" + System.currentTimeMillis() + "-" + java.util.UUID.randomUUID().toString().substring(0, 6));
                r.setHumidityPct(soil);
                r.setWaterPercent(water);
                r.setAirTemperature(temp);
                r.setTemperatureC(temp);
                r.setAirHumidity(rh);
                r.setSensorOk(sensorOk);
                r.setDhtOk(dhtOk);
                r.setWaterOk(waterOk);
                r.setPumpOn(pumpOn);
                r.setReportedMode(mode);
                r.setLockReason(lock);
                r.setIsSample(isSample);
                r.setIsRaining(false);
                r.setHeatStress(false);

                dao.addReading(r);
                new DeviceDAO().updateLastSeen(id);
            } catch (Exception dbEx) {
                // DB logging warning only - telemetry and alerts remain fully operational
                System.out.println("[ApiSensorServlet] DB persistence note: " + dbEx.getMessage());
            }

            String nextCmd = pendingCommands.poll();
            Json.send(p, 200, Json.map(
                    "status", "success",
                    "pump_on", pumpOn,
                    "mode", mode,
                    "command", nextCmd
            ));
        } catch (Exception e) {
            getServletContext().log("Telemetry processing exception", e);
            Json.send(p, 200, Json.map("status", "accepted", "note", e.getMessage()));
        }
    }
}
