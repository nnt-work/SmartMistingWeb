package service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import service.Notifier.Level;

public class AlertService {

    private static volatile AlertService instance;
    private ScheduledExecutorService scheduler;
    private boolean started = false;
    private AlertManager am;

    private volatile boolean hasSeenTelemetry = false;
    private volatile long lastTelemetryAt = 0L;
    private volatile String previousMode = null;
    private volatile Boolean previousPumpState = null;
    private volatile long manualModeStartTime = 0L;
    private volatile int manualRemindersSent = 0;
    private int lastDailySummaryDay = -1;

    private static ThreadFactory daemon(String name) {
        return r -> {
            Thread t = new Thread(r, name);
            t.setDaemon(true);
            return t;
        };
    }

    public static synchronized AlertService getInstance() {
        if (instance == null) {
            instance = new AlertService();
        }
        return instance;
    }

    public static synchronized void start(Notifier notifier) {
        getInstance().startService(notifier);
    }

    public static synchronized void stop() {
        if (instance != null) {
            instance.stopService();
        }
    }

    public synchronized void startService(Notifier notifier) {
        if (started) return;

        this.am = AlertManager.getInstance();
        if (notifier != null) {
            this.am.setNotifier(notifier);
        }

        scheduler = Executors.newScheduledThreadPool(2, daemon("scada-sched"));

        scheduler.scheduleWithFixedDelay(() -> {
            try {
                evaluateStreamTimeout();
                if (am != null) am.flushAggregatedAlerts();
            } catch (Throwable t) {
                System.err.println("[AlertService] Watchdog loop error: " + t.getMessage());
            }
        }, 2, 2, TimeUnit.SECONDS);

        scheduler.scheduleWithFixedDelay(this::checkDailySummary, 30, 60, TimeUnit.SECONDS);

        started = true;
        System.out.println("[AlertService] Started SCADA monitoring service with active watchers.");
    }

    public synchronized void stopService() {
        if (!started) return;
        try {
            if (scheduler != null) {
                scheduler.shutdownNow();
                scheduler.awaitTermination(2, TimeUnit.SECONDS);
            }
        } catch (Exception ignored) {}
        started = false;
        System.out.println("[AlertService] Stopped SCADA monitoring service.");
    }

    public boolean isStarted() {
        return started;
    }

    public synchronized void onTelemetry(int deviceId, Double soil, Double rh, Double temp, Double water,
                                        boolean waterOk, boolean sensorOk, boolean dhtOk, boolean pumpOn,
                                        String mode, String lock) {
        if (!started) {
            startService(new DiscordNotifier());
        }

        long now = System.currentTimeMillis();
        long previousAt = lastTelemetryAt;
        lastTelemetryAt = now;

        if (!hasSeenTelemetry) {
            hasSeenTelemetry = true;
            am.notifyDeviceConnected();
            am.evaluate("DATA_LOST", Level.CRITICAL, false, 0L, "", "Telemetry connection established.");
        } else if (previousAt > 0L && (now - previousAt >= 30_000L)) {
            am.notifyDeviceReconnected();
            am.evaluate("DATA_LOST", Level.CRITICAL, false, 0L, "", "Telemetry connection restored.");
        }

        am.markTelemetry(false);

        LatestData.update(deviceId, new LatestData.Snap(
                soil == null ? Double.NaN : soil,
                rh,
                temp,
                waterOk,
                sensorOk,
                dhtOk,
                pumpOn,
                false
        ));

        String cleanMode = (mode != null && mode.toUpperCase().contains("MANUAL")) ? "MANUAL" : "AUTO";
        if (previousMode == null) {
            previousMode = cleanMode;
            if ("MANUAL".equals(cleanMode) && manualModeStartTime == 0L) {
                manualModeStartTime = now;
            }
        } else if (!previousMode.equals(cleanMode)) {
            am.notifyModeConfirmed(cleanMode);
            if ("MANUAL".equals(cleanMode)) {
                manualModeStartTime = now;
                manualRemindersSent = 0;
            } else {
                manualModeStartTime = 0L;
                manualRemindersSent = 0;
            }
            previousMode = cleanMode;
        }

        if (previousPumpState == null) {
            previousPumpState = pumpOn;
        } else if (previousPumpState != pumpOn) {
            am.notifyPumpActuation(pumpOn, cleanMode, lock);
            previousPumpState = pumpOn;
        }

        String cleanLock = (lock != null) ? lock.trim().toUpperCase() : "NONE";

        boolean waterCritical = !waterOk || (water != null && water < 20.0) || cleanLock.equals("WATER") || cleanLock.equals("5");
        String waterReading = "Water Reservoir: " + (water != null ? Math.round(water) + "%" : "< 20%");
        am.evaluate("WATER_LOW", Level.CRITICAL, waterCritical, 0L, waterReading, "Water Reservoir: " + (water != null ? Math.round(water) + "%" : ">= 20%"));

        boolean tempCold = (temp != null && temp < 18.0) || cleanLock.equals("TEMP") || cleanLock.equals("COLD") || cleanLock.equals("3");
        String tempReading = "Ambient Temperature: " + (temp != null ? String.format("%.1f", temp) + "°C" : "< 18.0°C");
        am.evaluate("COLD", Level.CRITICAL, tempCold, 0L, tempReading, "Ambient Temperature: " + (temp != null ? String.format("%.1f", temp) + "°C" : ">= 18.0°C"));

        boolean soilWet = (soil != null && soil > 65.0) || cleanLock.equals("SOIL") || cleanLock.equals("4");
        String soilWetReading = "Substrate Moisture: " + (soil != null ? Math.round(soil) + "%" : "> 65%");
        am.evaluate("WET_SOIL", Level.CRITICAL, soilWet, 0L, soilWetReading, "Substrate Moisture: " + (soil != null ? Math.round(soil) + "%" : "<= 65%"));

        boolean soilDry = (soil != null && soil < 40.0);
        String soilDryReading = "Substrate Moisture: " + (soil != null ? Math.round(soil) + "%" : "< 40%");
        am.evaluate("DRY_SOIL", Level.WARN, soilDry, 0L, soilDryReading, "Substrate Moisture: " + (soil != null ? Math.round(soil) + "%" : ">= 40%"));

        boolean airHumid = (rh != null && rh > 70.0);
        String rhReading = "Chamber Humidity: " + (rh != null ? String.format("%.1f", rh) + "%" : "> 70%");
        am.evaluate("HUMID_AIR", Level.WARN, airHumid, 0L, rhReading, "Chamber Humidity: " + (rh != null ? String.format("%.1f", rh) + "%" : "<= 70%"));

        boolean sensorFault = !sensorOk || !dhtOk || cleanLock.equals("SENSORS") || cleanLock.equals("DHT") || cleanLock.equals("1") || cleanLock.equals("2");
        String sensorMsg = !dhtOk ? "DHT11 communication timeout or detached probe." : "Substrate/Reservoir analog sensor channel disconnected.";
        am.evaluate("SENSOR_FAULT", Level.CRITICAL, sensorFault, 0L, sensorMsg, "All sensor probes operational and transmitting nominal values.");

        if ("MANUAL".equals(cleanMode) && manualModeStartTime > 0L) {
            long elapsed = now - manualModeStartTime;
            if (elapsed >= 7_200_000L && manualRemindersSent < 3) {
                manualRemindersSent = 3;
                am.notifyManualReminder(3);
            } else if (elapsed >= 3_600_000L && manualRemindersSent < 2) {
                manualRemindersSent = 2;
                am.notifyManualReminder(2);
            } else if (elapsed >= 900_000L && manualRemindersSent < 1) {
                manualRemindersSent = 1;
                am.notifyManualReminder(1);
            }
        }
    }

    private void evaluateStreamTimeout() {
        if (!hasSeenTelemetry || am == null) return;
        long age = am.telemetryAgeMs();

        if (age < 0 || am.isIntentionalStop()) {
            return;
        }

        boolean lost = (age > 30_000L);
        am.evaluate("DATA_LOST", Level.CRITICAL, lost, 0L,
                "Telemetry silent for " + (age / 1000) + " seconds.",
                "Telemetry communication re-established.");
    }

    private void checkDailySummary() {
        try {
            ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            int hour = now.getHour();
            int today = now.getDayOfYear();

            if (hour == 18 && lastDailySummaryDay != today) {
                lastDailySummaryDay = today;
                LatestData.Snap s = LatestData.get(1);
                String details = (s != null)
                        ? String.format("Soil: %.1f%% | Air RH: %.1f%% | Temp: %.1f°C | Water Tank: %s",
                            s.soil, (s.airHum != null ? s.airHum : 0.0), (s.airTemp != null ? s.airTemp : 0.0), (s.waterOk ? "NOMINAL (>20%)" : "LOW (<=20%)"))
                        : "No active telemetry stream at summary check.";

                String summary = "Automated SCADA Daily Status Report (18:00 ICT). " + details;
                if (am != null && am.getNotifier() != null) {
                    am.getNotifier().send("DAILY_SUMMARY", Level.INFO, summary);
                }
                System.out.println("[AlertService] Dispatched 18:00 Daily Summary to Discord.");
            }
        } catch (Exception e) {
            System.err.println("[AlertService] checkDailySummary error: " + e.getMessage());
        }
    }
}
