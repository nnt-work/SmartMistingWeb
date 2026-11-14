import model.SensorReading;import service.HardwarePolicy;import util.*;import java.sql.Timestamp;
public class PolicyTest {
 static int n=0;static void check(boolean x,String msg){n++;if(!x)throw new AssertionError(msg);}
 public static void main(String[]args){
  check(HardwarePolicy.autoDemand(false,59,60,70),"RH59 ON");check(HardwarePolicy.autoDemand(true,60,60,70),"RH60 HOLD ON");check(!HardwarePolicy.autoDemand(false,60,60,70),"RH60 HOLD OFF");check(HardwarePolicy.autoDemand(true,69,60,70),"RH69 HOLD ON");check(!HardwarePolicy.autoDemand(true,70,60,70),"RH70 OFF");
  SensorReading r=new SensorReading();long now=System.currentTimeMillis();r.setReceivedAt(new Timestamp(now));r.setSensorOk(true);r.setDhtOk(true);r.setWaterOk(true);r.setWaterPercent(20.0);r.setHumidityPct(65.0);r.setAirTemperature(18.0);
  check(HardwarePolicy.startBlock(r,now)==null,"All exact boundaries allowed");r.setAirTemperature(17.9);check(HardwarePolicy.startBlock(r,now)!=null,"cold blocked");r.setAirTemperature(18.0);r.setHumidityPct(65.1);check(HardwarePolicy.startBlock(r,now)!=null,"wet blocked");r.setHumidityPct(65.0);r.setWaterPercent(19.9);check(HardwarePolicy.startBlock(r,now)!=null,"low water blocked");r.setWaterPercent(20.0);r.setDhtOk(false);check(HardwarePolicy.startBlock(r,now)!=null,"DHT blocked");r.setDhtOk(true);r.setIsSample(true);check(HardwarePolicy.startBlock(r,now)!=null,"sample cannot authorize hardware");r.setIsSample(false);check(HardwarePolicy.startBlock(r,now+10001)!=null,"stale blocked");
  String hash=PasswordUtil.hashPassword("test123");check(PasswordUtil.verify("test123",hash),"PBKDF2 roundtrip");check(!PasswordUtil.verify("wrong",hash),"wrong password rejected");check(!hash.equals(PasswordUtil.hashPassword("test123")),"unique salts");check(PasswordUtil.verify("12345","827ccb0eea8a706c4c34a16891f84e7b"),"legacy seed migration");check(!PasswordUtil.verify("12345","12345"),"plaintext rejected");
  String j=Json.stringify(Json.map("name","</script>\n\"O'Brien\""));check(!j.contains("</script>"),"safe script embedding");check(j.contains("\\n"),"newline escaped");
  System.out.println("PASS "+n+" Java policy, password and JSON assertions");
 }
}
