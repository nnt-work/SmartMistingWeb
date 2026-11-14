package controller;
import dao.*;import model.*;import service.HardwarePolicy;import util.Json;
import javax.servlet.annotation.WebServlet;import javax.servlet.http.*;import java.io.*;
@WebServlet(name="ControlServlet",urlPatterns={"/control"})
public class ControlServlet extends HttpServlet {
 @Override protected void doPost(HttpServletRequest q,HttpServletResponse p)throws IOException{
  AppUser u=(AppUser)q.getSession().getAttribute("user");
  try{int id=Integer.parseInt(q.getParameter("device_id")==null?"1":q.getParameter("device_id"));Device device=new DeviceDAO().getDeviceById(id);if(device==null||!device.isIsActive())throw new IllegalArgumentException("Unknown or inactive device");
   String a=q.getParameter("action"),type,payload;String mode=q.getParameter("mode");
   if("start_pump".equals(a)){String block=HardwarePolicy.startBlock(new SensorReadingDAO().getLatestReading(id),System.currentTimeMillis());if(block!=null)throw new IllegalArgumentException(block);type="START";int sec=q.getParameter("duration_sec")==null?0:Integer.parseInt(q.getParameter("duration_sec"));if(sec<0||sec>600)throw new IllegalArgumentException("Duration must be 0 to 600 seconds");payload=Json.stringify(Json.map("duration_sec",sec));}
   else if("stop_pump".equals(a)){type="STOP";payload="{}";}
   else if("set_mode".equals(a)&&("AUTO".equals(mode)||"MANUAL".equals(mode))){type="SET_MODE";payload=Json.stringify(Json.map("mode",mode));}
   else throw new IllegalArgumentException("Invalid action or mode");
   ControlCommand c=new ControlCommand();c.setDeviceId(id);c.setUserId(u.getUserId());c.setCommandType(type);c.setPayloadJson(payload);c.setStatus("PENDING");int cid=new ControlCommandDAO().createCommand(c);
   if("SET_MODE".equals(type))new MistingSettingDAO().updateDesiredMode(id,mode);
   new ActivityLogDAO().log("MISTING",id,u.getUserId(),cid,type,"Command queued by "+u.getUsername()+"; awaiting Arduino telemetry");
   Json.send(p,202,Json.map("success",true,"command_id",cid,"status","PENDING","message","Command queued; awaiting physical confirmation"));
  }catch(IllegalArgumentException e){Json.send(p,409,Json.map("success",false,"message",e.getMessage()));}catch(Exception e){getServletContext().log("Command failed",e);Json.send(p,503,Json.map("success",false,"message","Command not saved. Check SQL Server."));}
 }
}
