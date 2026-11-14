package service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LatestData {
    public static class Snap {
        public final double soil;
        public final Double airHum;
        public final Double airTemp;
        public final boolean waterOk;
        public final boolean sensorOk;
        public final boolean dhtOk;
        public final boolean pumpOn;
        public final boolean sample;
        public final long at;

        public Snap(double soil, Double airHum, Double airTemp, boolean waterOk,
                    boolean sensorOk, boolean dhtOk, boolean pumpOn, boolean sample) {
            this.soil = soil;
            this.airHum = airHum;
            this.airTemp = airTemp;
            this.waterOk = waterOk;
            this.sensorOk = sensorOk;
            this.dhtOk = dhtOk;
            this.pumpOn = pumpOn;
            this.sample = sample;
            this.at = System.currentTimeMillis();
        }
    }

    private static final Map<Integer, Snap> MAP = new ConcurrentHashMap<>();

    public static void update(int deviceId, Snap s) {
        MAP.put(deviceId, s);
        Heartbeat.onData();
    }

    public static Snap get(int deviceId) {
        return MAP.get(deviceId);
    }
}
