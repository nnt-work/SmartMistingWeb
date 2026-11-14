package model;

import java.sql.Timestamp;

public class SensorReading {
    private long readingId;
    private int deviceId;
    private String deviceName;
    private String packetId;
    private Double temperatureC;
    private Double humidityPct;
    private Boolean waterOk;
    private boolean sensorOk;
    private String reportedMode;
    private boolean pumpOn;
    private Integer appliedVersion;
    private Timestamp measuredAt;
    private Timestamp receivedAt;
    private boolean isSample;
    private Boolean isRaining;

    private Double waterPercent;
    private String lockReason;
    public Double getWaterPercent(){return waterPercent;}
    public void setWaterPercent(Double v){waterPercent=v;}
    public String getLockReason(){return lockReason;}
    public void setLockReason(String v){lockReason=v;}

    public SensorReading() {
        this.sensorOk = true;
        this.pumpOn = false;
        this.isSample = false;
        this.isRaining = false;
    }

    public SensorReading(long readingId, int deviceId, String packetId, Double temperatureC, Double humidityPct, Boolean waterOk, boolean sensorOk, String reportedMode, boolean pumpOn, Integer appliedVersion, Timestamp measuredAt, Timestamp receivedAt, boolean isSample) {
        this.readingId = readingId;
        this.deviceId = deviceId;
        this.packetId = packetId;
        this.temperatureC = temperatureC;
        this.humidityPct = humidityPct;
        this.waterOk = waterOk;
        this.sensorOk = sensorOk;
        this.reportedMode = reportedMode;
        this.pumpOn = pumpOn;
        this.appliedVersion = appliedVersion;
        this.measuredAt = measuredAt;
        this.receivedAt = receivedAt;
        this.isSample = isSample;
    }

    public long getReadingId() {
        return readingId;
    }

    public void setReadingId(long readingId) {
        this.readingId = readingId;
    }

    public int getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(int deviceId) {
        this.deviceId = deviceId;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }

    public String getPacketId() {
        return packetId;
    }

    public void setPacketId(String packetId) {
        this.packetId = packetId;
    }

    public Double getTemperatureC() {
        return temperatureC;
    }

    public void setTemperatureC(Double temperatureC) {
        this.temperatureC = temperatureC;
    }

    public Double getHumidityPct() {
        return humidityPct;
    }

    public void setHumidityPct(Double humidityPct) {
        this.humidityPct = humidityPct;
    }

    public Boolean getWaterOk() {
        return waterOk;
    }

    public void setWaterOk(Boolean waterOk) {
        this.waterOk = waterOk;
    }

    public boolean isSensorOk() {
        return sensorOk;
    }

    public void setSensorOk(boolean sensorOk) {
        this.sensorOk = sensorOk;
    }

    public String getReportedMode() {
        return reportedMode;
    }

    public void setReportedMode(String reportedMode) {
        this.reportedMode = reportedMode;
    }

    public boolean isPumpOn() {
        return pumpOn;
    }

    public void setPumpOn(boolean pumpOn) {
        this.pumpOn = pumpOn;
    }

    public Integer getAppliedVersion() {
        return appliedVersion;
    }

    public void setAppliedVersion(Integer appliedVersion) {
        this.appliedVersion = appliedVersion;
    }

    public Timestamp getMeasuredAt() {
        return measuredAt;
    }

    public void setMeasuredAt(Timestamp measuredAt) {
        this.measuredAt = measuredAt;
    }

    public Timestamp getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Timestamp receivedAt) {
        this.receivedAt = receivedAt;
    }

    public boolean isIsSample() {
        return isSample;
    }

    public void setIsSample(boolean isSample) {
        this.isSample = isSample;
    }

    public Boolean getIsRaining() {
        return isRaining;
    }

    public void setIsRaining(Boolean isRaining) {
        this.isRaining = isRaining;
    }

    private Double airTemperature;
    private Double airHumidity;
    private Boolean dhtOk;
    private Boolean heatStress;

    public Double getAirTemperature() { return airTemperature; }
    public void setAirTemperature(Double airTemperature) { this.airTemperature = airTemperature; }

    public Double getAirHumidity() { return airHumidity; }
    public void setAirHumidity(Double airHumidity) { this.airHumidity = airHumidity; }

    public Boolean getDhtOk() { return dhtOk; }
    public void setDhtOk(Boolean dhtOk) { this.dhtOk = dhtOk; }

    public Boolean getHeatStress() { return heatStress; }
    public void setHeatStress(Boolean heatStress) { this.heatStress = heatStress; }
}
