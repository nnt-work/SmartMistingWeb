package model;

import java.sql.Timestamp;

public class MistingSetting {
    private int deviceId;
    private double humidityOn;
    private double humidityOff;
    private int maxRunSec;
    private int cooldownSec;
    private String desiredMode; // 'AUTO', 'MANUAL'
    private int version;
    private Timestamp updatedAt;

    public MistingSetting() {
        this.humidityOn = 60.0;
        this.humidityOff = 70.0;
        this.maxRunSec = 10;
        this.cooldownSec = 60;
        this.desiredMode = "AUTO";
        this.version = 1;
    }

    public MistingSetting(int deviceId, double humidityOn, double humidityOff, int maxRunSec, int cooldownSec, String desiredMode, int version, Timestamp updatedAt) {
        this.deviceId = deviceId;
        this.humidityOn = humidityOn;
        this.humidityOff = humidityOff;
        this.maxRunSec = maxRunSec;
        this.cooldownSec = cooldownSec;
        this.desiredMode = desiredMode;
        this.version = version;
        this.updatedAt = updatedAt;
    }

    public int getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(int deviceId) {
        this.deviceId = deviceId;
    }

    public double getHumidityOn() {
        return humidityOn;
    }

    public void setHumidityOn(double humidityOn) {
        this.humidityOn = humidityOn;
    }

    public double getHumidityOff() {
        return humidityOff;
    }

    public void setHumidityOff(double humidityOff) {
        this.humidityOff = humidityOff;
    }

    public int getMaxRunSec() {
        return maxRunSec;
    }

    public void setMaxRunSec(int maxRunSec) {
        this.maxRunSec = maxRunSec;
    }

    public int getCooldownSec() {
        return cooldownSec;
    }

    public void setCooldownSec(int cooldownSec) {
        this.cooldownSec = cooldownSec;
    }

    public String getDesiredMode() {
        return desiredMode;
    }

    public void setDesiredMode(String desiredMode) {
        this.desiredMode = desiredMode;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isAutoMode() {
        return "AUTO".equalsIgnoreCase(desiredMode);
    }
}
