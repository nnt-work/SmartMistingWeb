package service;

import dao.ActivityLogDAO;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import service.Notifier.Level;

public class AlertManager {

    public static class RuleState {
        public boolean active;
        public long since;
        public long lastSent;
        public long okSince;
        public int sent;
        public String message = "";
    }

    public static class AlertEvent {
        public final long timeMs;
        public final String code;
        public final String level;
        public final String message;

        public AlertEvent(String code, String level, String message) {
            this.timeMs = System.currentTimeMillis();
            this.code = code;
            this.level = level;
            this.message = message;
        }
    }

    public static final long RECOVER_HOLD_MS = 5_000L;
    public static final int MAX_PER_MINUTE = 15;

    private static volatile AlertManager instance;
    private Notifier notifier;
    private final ActivityLogDAO logDAO = new ActivityLogDAO();
    private final Map<String, RuleState> states = new ConcurrentHashMap<>();
    private static final LinkedList<AlertEvent> RECENT_EVENTS = new LinkedList<>();

    private final Deque<Long> sendTimestamps = new ArrayDeque<>();
    private int aggregatedCount = 0;

    private volatile long lastTelemetryMs = 0;
    private volatile boolean lastSample = false;
    private volatile boolean intentionalStop = false;

    public AlertManager(Notifier notifier) {
        this.notifier = notifier;
    }

    public static synchronized AlertManager getInstance() {
        if (instance == null) {
            instance = new AlertManager(new DiscordNotifier());
        }
        return instance;
    }

    public synchronized void setNotifier(Notifier notifier) {
        this.notifier = notifier;
    }

    public Notifier getNotifier() {
        return notifier;
    }

    public void markTelemetry(boolean sample) {
        this.lastTelemetryMs = System.currentTimeMillis();
        this.lastSample = sample;
        this.intentionalStop = false;
    }

    public long telemetryAgeMs() {
        return lastTelemetryMs == 0 ? -1 : (System.currentTimeMillis() - lastTelemetryMs);
    }

    public boolean lastWasSample() {
        return lastSample;
    }

    public boolean isIntentionalStop() {
        return intentionalStop;
    }

    public void setIntentionalStop(boolean stop) {
        this.intentionalStop = stop;
    }

    public synchronized void notifyDeviceConnected() {
        dispatchNotification("ARDUINO_CONNECTED", Level.INFO, "Hardware controller connected via USB WebSerial.");
    }

    public synchronized void notifyDeviceReconnected() {
        dispatchNotification("ARDUINO_RECONNECTED", Level.INFO, "Hardware telemetry link restored after communication gap.");
    }

    public synchronized void notifyModeConfirmed(String mode) {
        boolean isManual = "MANUAL".equalsIgnoreCase(mode);
        String code = isManual ? "MODE_CONFIRMED_MANUAL" : "MODE_CONFIRMED_AUTO";
        dispatchNotification(code, Level.INFO, isManual ? "MANUAL" : "AUTO");
    }

    public synchronized void notifyManualReminder(int reminderLevel) {
        String dur = reminderLevel == 1 ? "15 minutes" : (reminderLevel == 2 ? "1 hour" : "2 hours");
        dispatchNotification("MANUAL_REMINDER", Level.WARN, "System operating under Manual Mode for " + dur + ".");
    }

    public synchronized void notifyPumpActuation(boolean pumpOn, String mode, String reason) {
        String code = pumpOn ? "PUMP_START" : "PUMP_STOP";
        String detail = "Mode: " + mode + " | Lock Reason: " + (reason != null ? reason : "NONE");
        dispatchNotification(code, Level.INFO, detail);
    }

    public RuleState getState(String code) {
        return states.get(code);
    }

    public Map<String, RuleState> getStates() {
        return Collections.unmodifiableMap(states);
    }

    public synchronized void evaluate(String code, Level level, boolean violated, long holdMs, String message) {
        evaluate(code, level, violated, holdMs, message, null);
    }

    public synchronized void evaluate(String code, Level level, boolean violated, long holdMs, String message, String recoveryMessage) {
        RuleState s = states.computeIfAbsent(code, k -> new RuleState());
        long now = System.currentTimeMillis();

        if (violated) {
            s.okSince = 0;
            if (!s.active) {
                s.active = true;
                s.since = now;
                s.sent = 0;
            }
            s.message = message;

            boolean shouldSend = (s.sent == 0) || (now - s.lastSent >= calculateGap(level, s.sent));
            int maxAllowed = (level == Level.CRITICAL) ? 4 : 3;

            if (shouldSend && s.sent < maxAllowed) {
                String reminderTag = s.sent > 0 ? " (Reminder #" + (s.sent + 1) + ")" : "";
                dispatchNotification(code, level, message + reminderTag);
                s.lastSent = now;
                s.sent++;
            }
        } else if (s.active) {
            if (s.okSince == 0) {
                s.okSince = now;
            }
            if (now - s.okSince >= RECOVER_HOLD_MS) {
                if (s.sent > 0) {
                    String recCode = code.endsWith("_RECOVERY") ? code : code + "_RECOVERY";
                    String recMsg = (recoveryMessage != null && !recoveryMessage.isEmpty())
                            ? recoveryMessage
                            : "Condition [" + code + "] has normalized and verified stable.";
                    dispatchNotification(recCode, Level.RECOVERY, recMsg);
                }
                s.active = false;
                s.sent = 0;
                s.okSince = 0;
                s.since = 0;
            }
        }
    }

    private long calculateGap(Level lv, int sentCount) {
        if (sentCount == 0) return 0;
        boolean isDemo = Config.getBoolean("alert.demo", true);

        if (lv == Level.WARN) {
            return isDemo ? 120_000L : 3600_000L;
        }

        long normalMin = (sentCount == 1 ? 15 : 30) * 60_000L;
        return isDemo ? 120_000L : normalMin;
    }

    public synchronized void dispatchNotification(String code, Level level, String message) {
        long now = System.currentTimeMillis();

        while (!sendTimestamps.isEmpty() && (now - sendTimestamps.peekFirst() >= 60_000L)) {
            sendTimestamps.pollFirst();
        }

        if (sendTimestamps.size() >= MAX_PER_MINUTE && level != Level.CRITICAL && level != Level.RECOVERY) {
            aggregatedCount++;
            System.out.println("[AlertManager] Rate limiter active (" + MAX_PER_MINUTE + "/min). Queuing: " + code);
            recordEvent(code, level.name() + "_QUEUED", message);
            return;
        }

        sendTimestamps.addLast(now);
        recordEvent(code, level.name(), message);

        if (notifier != null) {
            try {
                notifier.send(code, level, message);
            } catch (Throwable t) {
                System.err.println("[AlertManager] Notifier dispatch failed: " + t.getMessage());
            }
        }

        asyncLog(code, level.name(), message);
    }

    public synchronized void flushAggregatedAlerts() {
        if (aggregatedCount > 0) {
            String summary = "Aggregated " + aggregatedCount + " non-critical alerts during high-frequency environmental fluctuation.";
            aggregatedCount = 0;
            if (notifier != null) {
                notifier.send("RATE_LIMIT", Level.WARN, summary);
            }
            recordEvent("RATE_LIMIT", "WARN", summary);
        }
    }

    private void asyncLog(String code, String action, String detail) {
        Thread t = new Thread(() -> {
            try {
                logDAO.log("MISTING", 1, null, null, code + "_" + action, detail);
            } catch (Exception ignored) {}
        }, "alert-db-log");
        t.setDaemon(true);
        t.start();
    }

    private static synchronized void recordEvent(String code, String level, String message) {
        RECENT_EVENTS.addFirst(new AlertEvent(code, level, message));
        while (RECENT_EVENTS.size() > 25) {
            RECENT_EVENTS.removeLast();
        }
    }

    public static synchronized List<AlertEvent> getRecentEvents() {
        return new ArrayList<>(RECENT_EVENTS);
    }
}
