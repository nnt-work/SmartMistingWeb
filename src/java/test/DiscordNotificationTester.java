package test;

import service.DiscordNotifier;
import service.Notifier.Level;

public class DiscordNotificationTester {

    public static void main(String[] args) {
        System.out.println("Starting SCADA Discord Notification Test Suite...");
        DiscordNotifier notifier = new DiscordNotifier();

        sendStep(notifier, "ARDUINO_CONNECTED", Level.INFO, "Hardware controller connected via USB WebSerial.");
        sendStep(notifier, "MODE_CONFIRMED_MANUAL", Level.INFO, "MANUAL");
        sendStep(notifier, "MANUAL_REMINDER", Level.WARN, "System has been operating in Manual Mode for 15 minutes.");
        sendStep(notifier, "WATER_LOW", Level.CRITICAL, "Water Reservoir: 14% (< 20% limit)");
        sendStep(notifier, "WATER_RECOVERY", Level.RECOVERY, "Water Reservoir: 85% (>= 20% limit)");
        sendStep(notifier, "COLD", Level.CRITICAL, "Ambient Temperature: 16.2°C (< 18.0°C cutoff)");
        sendStep(notifier, "COLD_RECOVERY", Level.RECOVERY, "Ambient Temperature: 22.4°C (>= 18.0°C nominal)");
        sendStep(notifier, "WET_SOIL", Level.CRITICAL, "Substrate Moisture: 72% (> 65% ceiling)");
        sendStep(notifier, "WET_SOIL_RECOVERY", Level.RECOVERY, "Substrate Moisture: 54% (<= 65% nominal)");
        sendStep(notifier, "DRY_SOIL", Level.WARN, "Substrate Moisture: 32% (< 40% threshold)");
        sendStep(notifier, "DRY_SOIL_RECOVERY", Level.RECOVERY, "Substrate Moisture: 52% (>= 40% nominal)");
        sendStep(notifier, "HUMID_AIR", Level.WARN, "Chamber Humidity: 78.5% (> 70.0% threshold)");
        sendStep(notifier, "HUMID_AIR_RECOVERY", Level.RECOVERY, "Chamber Humidity: 64.0% (<= 70.0% nominal)");
        sendStep(notifier, "SENSOR_FAULT", Level.CRITICAL, "DHT11 communication timeout or detached probe.");
        sendStep(notifier, "SENSOR_RECOVERY", Level.RECOVERY, "All sensor probes operational and transmitting nominal values.");
        sendStep(notifier, "DATA_LOST", Level.CRITICAL, "Telemetry silent for 35 seconds.");
        sendStep(notifier, "ARDUINO_RECONNECTED", Level.INFO, "Hardware telemetry link restored after communication gap.");
        sendStep(notifier, "MODE_CONFIRMED_AUTO", Level.INFO, "AUTO");

        System.out.println("SCADA Discord Notification Test Suite Finished Successfully!");
    }

    private static void sendStep(DiscordNotifier notifier, String code, Level level, String msg) {
        System.out.println("-> Sending [" + level + "] " + code + "...");
        notifier.send(code, level, msg);
        try {
            Thread.sleep(1500L);
        } catch (InterruptedException ignored) {}
    }
}
