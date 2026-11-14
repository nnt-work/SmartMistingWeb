package test;

import service.AlertService;
import service.AlertManager;
import service.DiscordNotifier;

public class TelemetryAlertVerification {

    public static void main(String[] args) {
        System.out.println("Starting Telemetry Simulation Test...");
        AlertService service = AlertService.getInstance();
        service.startService(new DiscordNotifier());

        System.out.println("Step 1: Normal initial telemetry");
        service.onTelemetry(1, 55.0, 62.0, 24.5, 80.0, true, true, true, false, "AUTO", "NONE");

        System.out.println("Step 2: Low water cutoff trip (<20%)");
        service.onTelemetry(1, 55.0, 62.0, 24.5, 12.0, false, true, true, false, "AUTO", "WATER");

        try { Thread.sleep(2000L); } catch (Exception ignored) {}

        System.out.println("Step 3: Water refilled (85%) - Recovery");
        service.onTelemetry(1, 55.0, 62.0, 24.5, 85.0, true, true, true, false, "AUTO", "NONE");

        try {
            System.out.println("Waiting 6s for debounced recovery confirmation...");
            Thread.sleep(6000L);
        } catch (Exception ignored) {}

        service.onTelemetry(1, 55.0, 62.0, 24.5, 85.0, true, true, true, false, "AUTO", "NONE");

        System.out.println("Telemetry Simulation Completed Successfully!");
    }
}
