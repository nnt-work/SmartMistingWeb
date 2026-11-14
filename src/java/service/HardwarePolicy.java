package service;
import model.SensorReading;
public final class HardwarePolicy {
 public static String startBlock(SensorReading r,long now){
  if(r==null||r.getReceivedAt()==null||now-r.getReceivedAt().getTime()>10000||r.isIsSample())return "No fresh physical telemetry (10 seconds). Connect USB bridge.";
  if(!r.isSensorOk()||!Boolean.TRUE.equals(r.getDhtOk()))return "Sensor data unavailable";
  if(r.getAirTemperature()==null||r.getAirTemperature()<18)return "Temperature below 18 C";
  if(r.getHumidityPct()==null||r.getHumidityPct()>65)return "Soil above 65 percent or unavailable";
  if(r.getWaterPercent()==null||r.getWaterPercent()<20||!Boolean.TRUE.equals(r.getWaterOk()))return "Reservoir below 20 percent or unavailable";
  return null;
 }
 public static boolean autoDemand(boolean wasOn,double rh,int on,int off){return rh<on || (rh<off&&wasOn);}
}
