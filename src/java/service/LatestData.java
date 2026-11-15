package service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LatestData {
    public static class Snap {
        public final double soil;          // humidity_pct (Do am dat)
        public final Double airHum;        // Do am khong khi RH (%)
        public final Double airTemp;       // Nhiet do khong khi (C)
        public final boolean waterOk;      // Trang thai khay nuoc (>20%)
        public final boolean sensorOk;     // Trang thai cam bien dat
        public final boolean dhtOk;        // Trang thai cam bien DHT
        public final boolean pumpOn;       // Trang thai vi phun
        public final boolean sample;       // true = DEMO SIM, false = Phan cung that
        public final long at;              // Thoi diem nhan goi tin (epoch ms)

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
