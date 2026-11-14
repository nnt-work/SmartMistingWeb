package service;
import util.Json;import model.*;import javax.servlet.http.*;import java.util.*;
public final class Bootstrap {
 public static String create(HttpServletRequest q,MistingSetting s,List<Plant>plants,List<AppUser>users,List<ControlCommand>cmds,List<SensorReading>readings,List<ActivityLog>logs){
  AppUser u=(AppUser)q.getSession().getAttribute("user");Map<String,Object>m=Json.map("currentUserId",u.getUserId(),"currentUserRole",u.getRoleCode(),"currentUserName",u.getFullName(),"systemMode",s.getDesiredMode(),"activePlantId",plants.isEmpty()?0:plants.get(0).getPlantId(),"setting",Json.map("humOn",s.getHumidityOn(),"humOff",s.getHumidityOff(),"maxRun",s.getMaxRunSec(),"cooldown",s.getCooldownSec()));
  List<Object>p=new ArrayList<>(),us=new ArrayList<>(),cs=new ArrayList<>(),rs=new ArrayList<>(),ls=new ArrayList<>();
  for(Plant x:plants)p.add(Json.map("id",x.getPlantId(),"name",x.getPlantName(),"sci",x.getSpecies(),"min",x.getHumidityOn(),"max",x.getHumidityOff(),"burst",s.getMaxRunSec(),"notes",x.getNote()));
  if(u.isAdmin())for(AppUser x:users)us.add(Json.map("id",x.getUserId(),"username",x.getUsername(),"fullName",x.getFullName(),"email",x.getEmail(),"role",x.getRoleCode(),"isLocked",x.isIsLocked(),"createdAt",x.getCreatedAt()));
  for(ControlCommand x:cmds)cs.add(Json.map("time",x.getCreatedAt(),"mode","-","cmd",x.getCommandType(),"actor",x.getUsername(),"dur","-","tank","-","ack",x.getStatus()));
  for(SensorReading x:readings)rs.add(Json.map("time",x.getReceivedAt(),"soil",x.getHumidityPct()==null?"--":x.getHumidityPct()+"%","tank",x.getWaterPercent()==null?"--":x.getWaterPercent()+"%","rain",x.getAirHumidity()==null?"--":x.getAirHumidity()+"%","status",x.isIsSample()?"SAMPLE":x.getLockReason()));
  if(u.isAdmin())for(ActivityLog x:logs)ls.add(Json.map("time",x.getOccurredAt(),"action",x.getAction(),"detail",x.getDetail(),"user",x.getUsername(),"ip","-","sev","INFO"));
  m.put("plants",p);m.put("users",us);m.put("history",Json.map("pump",cs,"sensor",rs,"audit",ls));return Json.stringify(m);
 }
}
