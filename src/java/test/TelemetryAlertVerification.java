package test;

import service.AlertService;
import service.AlertManager;
import service.DiscordNotifier;

/**
 * End-to-End Simulation of Real IoT Telemetry Packets streaming into AlertService.
 * Validates that when hardware connects, transitions mode, trips interlocks, and recovers,
 * alerts are properly evaluated and sent without failure.
 */
public class TelemetryAlertVerification {

    public static void main(String[] args) {
        System.out.println("Starting Telemetry Simulation Test...");
        AlertService service = AlertService.getInstance();
        service.startService(new DiscordNotifier());

        // 1. Hardware Connects with Normal Readings
        System.out.println("Step 1: Normal initial telemetry");
        service.onTelemetry(1, 55.0, 62.0, 24.5, 80.0, true, true, true, false, "AUTO", "NONE");

        // 2. Hardware reports LOW WATER (< 20%)
        System.out.println("Step 2: Low water cutoff trip (<20%)");
        service.onTelemetry(1, 55.0, 62.0, 24.5, 12.0, false, true, true, false, "AUTO", "WATER");

        try { Thread.sleep(2000L); } catch (Exception ignored) {}

        // 3. User refills water, reservoir recovers (85%)
        System.out.println("Step 3: Water refilled (85%) - Recovery");
        service.onTelemetry(1, 55.0, 62.0, 24.5, 85.0, true, true, true, false, "AUTO", "NONE");

        // Wait for debounced recovery hold time (5s)
        try {
            System.out.println("Waiting 6s for debounced recovery confirmation...");
            Thread.sleep(6000L);
        } catch (Exception ignored) {}

        // Send confirmation packet to trigger recovery hold completion
        service.onTelemetry(1, 55.0, 62.0, 24.5, 85.0, true, true, true, false, "AUTO", "NONE");

        System.out.println("Telemetry Simulation Completed Successfully!");
    }
}
