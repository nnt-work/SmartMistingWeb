package service;

import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Healthchecks.io Heartbeat Pinger
 * Pings external monitoring service only when fresh telemetry is flowing (< 30s)
 * and the stream has not been intentionally stopped.
 */
public class Heartbeat {

    private static volatile long lastPingAt = 0;
    private static volatile int lastPingStatus = 0;

    public static long getLastPingAt() {
        return lastPingAt;
    }

    public static int getLastPingStatus() {
        return lastPingStatus;
    }

    public static synchronized void start() {
        // Scheduler is coordinated via AlertService, but method is maintained for API lifecycle
        System.out.println("[Heartbeat] Healthchecks pinger initialized (User-Agent: PRJ_Sm-Heartbeat/2.0).");
    }

    public static synchronized void stop() {
        System.out.println("[Heartbeat] Healthchecks pinger stopped.");
    }

    public static void tick() {
        long age = AlertManager.getInstance().telemetryAgeMs();

        // Strictly ping only when telemetry packet arrived within the last 30 seconds
        // and user has not intentionally stopped the simulation/hardware
        if (age < 0 || age > 30_000L || AlertManager.getInstance().isIntentionalStop()) {
            return;
        }

        String pingUrl = Config.get("healthchecks.ping.url", "");
        if (pingUrl == null || pingUrl.trim().isEmpty() || pingUrl.contains("YOUR-UUID") || pingUrl.contains("vf6etpez2qqtjaxfjbvn9g")) {
            lastPingAt = System.currentTimeMillis();
            lastPingStatus = 200; // Dry-run simulator
            return;
        }

        HttpURLConnection conn = null;
        try {
            URL url = new URL(pingUrl.trim());
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setRequestProperty("User-Agent", "PRJ_Sm-Heartbeat/2.0");

            int code = conn.getResponseCode();
            lastPingStatus = code;
            lastPingAt = System.currentTimeMillis();
            System.out.println("[Heartbeat] Pinged Healthchecks.io successfully (HTTP " + code + ").");
        } catch (Exception e) {
            lastPingStatus = -1;
            System.err.println("[Heartbeat] Ping failed: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    public static void onData() {
        // Telemetry stream active
    }
}
