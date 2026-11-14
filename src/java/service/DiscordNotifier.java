package service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Enterprise SCADA Discord Notification Dispatcher
 * Dispatches beautifully structured, clean, and highly readable rich embeds.
 * Strictly 100% Professional Industrial IoT English with precise telemetry color coding.
 */
public class DiscordNotifier implements Notifier {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
    private static volatile long lastDiscordPostTime = 0L;

    public static class EmbedField {
        public final String name;
        public final String value;
        public final boolean inline;

        public EmbedField(String name, String value, boolean inline) {
            this.name = name;
            this.value = value;
            this.inline = inline;
        }
    }

    @Override
    public void send(String code, Level level, String message) {
        String webhookUrl = Config.get("discord.webhook.url",
                "https://discord.com/api/webhooks/1563858029861150811/_sIvTXS95FMlMAGcay7oqMyvN2xVzKymOBHgJfppqiKprrFh6LBG42-QlabOvk2liv9q");

        if (webhookUrl == null || webhookUrl.trim().isEmpty() || webhookUrl.contains("YOUR_WEBHOOK")) {
            System.out.println("[DiscordNotifier-DryRun] [" + level + "] " + code + ": " + message);
            return;
        }

        buildAndDispatch(webhookUrl, code, level, message);
    }

    public void buildAndDispatch(String webhookUrl, String code, Level level, String message) {
        String cleanCode = (code != null) ? code.trim().toUpperCase() : "GENERAL";
        int color;
        String title;
        String description;
        List<EmbedField> fields = new ArrayList<>();

        // 1. Color Palette: Clean, purposeful, professional
        // Critical: Crimson Red (0xDC2626)
        // Warning: Amber Gold (0xD97706)
        // Recovery / Safe: Emerald Green (0x059669)
        // Information / Mode: Cobalt Blue (0x2563EB)
        switch (level) {
            case CRITICAL:
                color = 0xDC2626;
                break;
            case WARN:
                color = 0xD97706;
                break;
            case RECOVERY:
                color = 0x059669;
                break;
            case INFO:
            default:
                color = (cleanCode.contains("RECOVERY") || cleanCode.contains("RESTORED") || cleanCode.contains("SAFE"))
                        ? 0x059669 : 0x2563EB;
                break;
        }

        // 2. Structured Content Generation by Event Category
        if (cleanCode.equals("ARDUINO_CONNECTED")) {
            title = "SCADA Telemetry • Hardware Controller Connected";
            description = "The central SCADA host has established a reliable serial communication link with the Arduino hardware controller.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interface", "USB WebSerial @ 9600 Baud", true));
            fields.add(new EmbedField("Telemetry State", "ONLINE • Real-time Stream Active", true));
            fields.add(new EmbedField("System Action", "Initiating telemetry ingestion and digital twin synchronization.", false));
        }
        else if (cleanCode.equals("ARDUINO_RECONNECTED")) {
            title = "SCADA Telemetry • Hardware Link Restored";
            description = "Telemetry packet transmission from the Arduino controller has resumed after an unexpected communication gap.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Signal Status", "RESTORED • Stable", true));
            fields.add(new EmbedField("System Action", "Re-engaged closed-loop microclimate monitoring.", false));
        }
        else if (cleanCode.equals("DATA_LOST")) {
            title = "SCADA Diagnostic • Telemetry Stream Timeout";
            description = "No telemetry frames have been received from the microcontroller for over 30 seconds. Stream link is considered down.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Signal Status", "TIMEOUT (> 30s silent)", true));
            fields.add(new EmbedField("Recommended Action", "Inspect USB physical cabling, COM port assignment, and power supply.", false));
        }
        else if (cleanCode.equals("MODE_CONFIRMED_MANUAL") || (cleanCode.equals("MODE_CONFIRMED") && message != null && message.toUpperCase().contains("MANUAL"))) {
            title = "SCADA Operating Mode • Manual Control Engaged";
            description = "Hardware controller has confirmed transition to Manual Mode. Closed-loop automatic misting algorithms are currently suspended.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Active Mode", "MANUAL (Operator Actuation)", true));
            fields.add(new EmbedField("Safety Gate", "Priority safety interlocks remain armed in background.", false));
        }
        else if (cleanCode.equals("MODE_CONFIRMED_AUTO") || (cleanCode.equals("MODE_CONFIRMED") && message != null && message.toUpperCase().contains("AUTO"))) {
            title = "SCADA Operating Mode • Automatic Control Engaged";
            description = "Hardware controller has returned to Automatic Closed-Loop Mode. Microclimate parameters will govern misting actuation.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Active Mode", "AUTOMATIC (Closed-Loop SCADA)", true));
            fields.add(new EmbedField("Control Target", "Relative Humidity: ON < 60%, OFF >= 70%", false));
        }
        else if (cleanCode.equals("MANUAL_REMINDER")) {
            title = "SCADA Operator Notice • Manual Mode Duration Reminder";
            description = "The terrarium system continues running under Manual Mode. Automatic microclimate regulation remains inactive.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Operational Mode", "MANUAL", true));
            fields.add(new EmbedField("Duration Notice", (message != null && !message.isEmpty()) ? message : "Extended manual operation detected", true));
            fields.add(new EmbedField("Recommended Action", "Verify specimen moisture and return system to AUTO mode when finished.", false));
        }
        else if (cleanCode.equals("WATER_LOW")) {
            title = "SCADA Safety Interlock • Low Reservoir Level Cutoff";
            description = "Ultrasonic reservoir volume has dropped below the 20% critical threshold. The misting pump has been locked to prevent transducer burnout.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interlock State", "LOCKED (WATER_LOW)", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Reservoir Level: < 20%"), true));
            fields.add(new EmbedField("Required Action", "Replenish the water reservoir to restore misting capabilities.", false));
        }
        else if (cleanCode.equals("WATER_RECOVERY") || (cleanCode.equals("WATER_LOW") && level == Level.RECOVERY)) {
            title = "SCADA Interlock Cleared • Water Reservoir Restored";
            description = "Water reservoir level has returned to safe operational volume. Low water interlock has been successfully released.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interlock State", "CLEARED • Normal Operation", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Reservoir Level: >= 20%"), true));
            fields.add(new EmbedField("System Status", "Misting actuation is now re-enabled.", false));
        }
        else if (cleanCode.equals("COLD") || cleanCode.equals("TEMP_COLD")) {
            title = "SCADA Thermal Interlock • Low Ambient Temperature Cutoff";
            description = "Ambient temperature has dropped below 18.0°C. Misting is inhibited to prevent cold-water shock to Ludisia discolor root and leaf tissues.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interlock State", "LOCKED (COLD_TEMP)", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Temperature: < 18.0°C"), true));
            fields.add(new EmbedField("Automated Action", "Misting pump locked. Check terrarium thermal insulation or room heating.", false));
        }
        else if (cleanCode.equals("COLD_RECOVERY") || ((cleanCode.equals("COLD") || cleanCode.equals("TEMP_COLD")) && level == Level.RECOVERY)) {
            title = "SCADA Interlock Cleared • Ambient Temperature Restored";
            description = "Ambient chamber temperature has warmed back to nominal levels (>= 18.0°C). Thermal cutoff interlock released.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interlock State", "CLEARED • Normal Operation", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Temperature: >= 18.0°C"), true));
            fields.add(new EmbedField("System Status", "Thermal safety envelope verified.", false));
        }
        else if (cleanCode.equals("WET_SOIL")) {
            title = "SCADA Hydration Interlock • Substrate Saturation Cutoff";
            description = "Substrate moisture has exceeded 65%. Irrigation misting is inhibited to prevent root hypoxia and bacterial soft rot.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interlock State", "LOCKED (HIGH_SOIL_MOISTURE)", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Soil Moisture: > 65%"), true));
            fields.add(new EmbedField("Agronomic Note", "Ludisia discolor thrives in damp, loose media with excellent drainage.", false));
        }
        else if (cleanCode.equals("WET_SOIL_RECOVERY") || (cleanCode.equals("WET_SOIL") && level == Level.RECOVERY)) {
            title = "SCADA Interlock Cleared • Substrate Moisture Nominal";
            description = "Substrate moisture has drained below the 65% ceiling. Saturation interlock has been released.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Interlock State", "CLEARED • Normal Operation", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Soil Moisture: <= 65%"), true));
            fields.add(new EmbedField("System Status", "Substrate aeration normalized.", false));
        }
        else if (cleanCode.equals("DRY_SOIL")) {
            title = "SCADA Microclimate Warning • Substrate Moisture Deficit";
            description = "Substrate moisture has dropped below the 40% threshold. Root zone hydration is inadequate.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Condition", "WARNING • Low Substrate Moisture", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Soil Moisture: < 40%"), true));
            fields.add(new EmbedField("Recommended Action", "Verify supply lines and check if misting actuation is scheduled.", false));
        }
        else if (cleanCode.equals("DRY_SOIL_RECOVERY") || (cleanCode.equals("DRY_SOIL") && level == Level.RECOVERY)) {
            title = "SCADA Microclimate Restored • Substrate Moisture Nominal";
            description = "Substrate moisture has been replenished back above the 40% minimum threshold.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Condition", "NORMAL • Moisture Restored", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Soil Moisture: >= 40%"), true));
            fields.add(new EmbedField("System Status", "Root zone water deficit resolved.", false));
        }
        else if (cleanCode.equals("HUMID_AIR")) {
            title = "SCADA Microclimate Warning • High Chamber Humidity";
            description = "Chamber relative humidity has exceeded 70%. Persistent high humidity without active air circulation elevates fungal pathogen risks.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Condition", "WARNING • High Relative Humidity", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Air Humidity: > 70%"), true));
            fields.add(new EmbedField("Recommended Action", "Ensure terrarium ventilation vents are open.", false));
        }
        else if (cleanCode.equals("HUMID_AIR_RECOVERY") || (cleanCode.equals("HUMID_AIR") && level == Level.RECOVERY)) {
            title = "SCADA Microclimate Restored • Relative Humidity Nominal";
            description = "Chamber relative humidity has returned to nominal levels (<= 70%).";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Condition", "NORMAL • Humidity Balanced", true));
            fields.add(new EmbedField("Telemetry Value", extractTelemetryValue(message, "Air Humidity: <= 70%"), true));
            fields.add(new EmbedField("System Status", "Microclimate humidity stabilized.", false));
        }
        else if (cleanCode.equals("SENSOR_FAULT") || cleanCode.equals("DHT_FAULT")) {
            title = "SCADA Diagnostic • Sensor Signal Fault";
            description = "One or more environmental sensor channels reported an electrical disconnect, communication timeout, or out-of-range value.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Diagnostic State", "CRITICAL • Probe Fault", true));
            fields.add(new EmbedField("Fault Detail", (message != null && !message.isEmpty()) ? message : "Sensor signal lost or detached", false));
            fields.add(new EmbedField("Recommended Action", "Verify sensor wire continuity, analog pins (A0, A1, A2), and DC 5V rail.", false));
        }
        else if (cleanCode.equals("SENSOR_RECOVERY") || ((cleanCode.equals("SENSOR_FAULT") || cleanCode.equals("DHT_FAULT")) && level == Level.RECOVERY)) {
            title = "SCADA Diagnostic Cleared • Sensor Channels Operational";
            description = "All environmental sensor channels have re-established stable telemetry and verified within calibration range.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Diagnostic State", "CLEARED • Sensors Ready", true));
            fields.add(new EmbedField("System Status", "DHT11, substrate moisture, and water level probes nominal.", false));
        }
        else if (cleanCode.equals("PUMP_START")) {
            title = "SCADA Actuation • Misting Spray Started";
            description = "The ultrasonic misting relay has been triggered ON. High-frequency aerosol mist is dispersing into the terrarium.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Relay State", "ON • Actuated", true));
            fields.add(new EmbedField("Actuation Mode", (message != null && message.contains("MANUAL")) ? "MANUAL" : "AUTOMATIC", true));
            fields.add(new EmbedField("Details", (message != null && !message.isEmpty()) ? message : "Misting cycle initiated.", false));
        }
        else if (cleanCode.equals("PUMP_STOP")) {
            title = "SCADA Actuation • Misting Spray Stopped";
            description = "The ultrasonic misting relay has been switched OFF. Aerosol dispersion completed.";
            fields.add(new EmbedField("Target Node", "Terrarium Node #1 (Ludisia discolor)", true));
            fields.add(new EmbedField("Relay State", "OFF • Standby", true));
            fields.add(new EmbedField("Termination Reason", (message != null && !message.isEmpty()) ? message : "Cycle completed.", false));
        }
        else {
            title = "SCADA Notification • " + cleanCode;
            description = (message != null && !message.isEmpty()) ? message : "System status update.";
            fields.add(new EmbedField("Event Code", cleanCode, true));
            fields.add(new EmbedField("Severity Level", level.name(), true));
        }

        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        String timestamp = now.format(TIME_FORMATTER);
        String footerText = "Smart Misting SCADA • Industrial IoT Core • " + timestamp + " (ICT)";

        sendEmbed(webhookUrl, title, description, color, fields, footerText);
    }

    public void sendEmbed(String webhookUrl, String title, String description, int color, List<EmbedField> fields, String footerText) {
        StringBuilder json = new StringBuilder();
        json.append("{\"embeds\":[{");
        json.append("\"title\":\"").append(escapeJson(title)).append("\",");
        json.append("\"description\":\"").append(escapeJson(description)).append("\",");
        json.append("\"color\":").append(color).append(",");

        if (fields != null && !fields.isEmpty()) {
            json.append("\"fields\":[");
            for (int i = 0; i < fields.size(); i++) {
                EmbedField f = fields.get(i);
                if (i > 0) json.append(",");
                json.append("{")
                    .append("\"name\":\"").append(escapeJson(f.name)).append("\",")
                    .append("\"value\":\"").append(escapeJson(f.value)).append("\",")
                    .append("\"inline\":").append(f.inline)
                    .append("}");
            }
            json.append("],");
        }

        json.append("\"footer\":{\"text\":\"").append(escapeJson(footerText)).append("\"}");
        json.append("}]}");

        sendRawJson(webhookUrl, json.toString());
    }

    private void sendRawJson(String webhookUrl, String jsonPayload) {
        long now = System.currentTimeMillis();
        long diff = now - lastDiscordPostTime;
        // Moderate rate-limit spacer (1.2 seconds between outbound POSTs)
        if (diff >= 0 && diff < 1200L) {
            try { Thread.sleep(1200L - diff); } catch (InterruptedException ignored) {}
        }
        lastDiscordPostTime = System.currentTimeMillis();

        try {
            System.setProperty("https.protocols", "TLSv1.2");
        } catch (Throwable ignored) {}

        List<String> targetEndpoints = new ArrayList<>();
        targetEndpoints.add(webhookUrl.trim());
        if (webhookUrl.contains("discord.com") || webhookUrl.contains("discordapp.com")) {
            targetEndpoints.add(webhookUrl.trim()
                    .replace("https://discord.com", "https://webhook.lewisakura.moe")
                    .replace("https://discordapp.com", "https://webhook.lewisakura.moe"));
        }

        for (String targetUrl : targetEndpoints) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(7000);
                conn.setReadTimeout(7000);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("User-Agent", "SmartMisting-SCADA/3.0");

                byte[] out = jsonPayload.getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(out);
                    os.flush();
                }

                int status = conn.getResponseCode();
                if (status >= 200 && status < 300) {
                    System.out.println("[DiscordNotifier] Embed delivered successfully (HTTP " + status + ") via " + targetUrl);
                    return; // Success, exit
                } else {
                    System.err.println("[DiscordNotifier] HTTP response: " + status + " on " + targetUrl);
                }
            } catch (Exception e) {
                System.err.println("[DiscordNotifier] Delivery error on " + targetUrl + ": " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }
    }

    private static String extractTelemetryValue(String message, String fallback) {
        if (message == null || message.trim().isEmpty()) return fallback;
        return message.replace("**", "").replace("*", "").trim();
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "");
    }
}
