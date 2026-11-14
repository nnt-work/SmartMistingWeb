package controller;
import dao.*;import model.*;import util.Json;import javax.servlet.annotation.WebServlet;import javax.servlet.http.*;import javax.servlet.*;import java.io.*;
@WebServlet(name="SettingServlet",urlPatterns={"/admin/settings","/settings"})
public class SettingServlet extends HttpServlet {
 protected void doGet(HttpServletRequest q,HttpServletResponse p)throws IOException,ServletException{q.setAttribute("activeNav","settings");q.getRequestDispatcher("/dashboard").forward(q,p);}
 protected void doPost(HttpServletRequest q,HttpServletResponse p)throws IOException{
  try{int id=Integer.parseInt(q.getParameter("device_id")==null?"1":q.getParameter("device_id"));MistingSettingDAO dao=new MistingSettingDAO();MistingSetting s=dao.getSettingByDeviceId(id);if(s==null)throw new IllegalArgumentException("Device settings not found");
   if("save_duration".equals(q.getParameter("action"))){int sec=Integer.parseInt(q.getParameter("max_run_sec"));if(sec<1||sec>600)throw new IllegalArgumentException("Manual pulse duration must be 1 to 600 seconds");dao.updateMaxRunSec(id,sec);Json.send(p,200,Json.map("status","success","max_run_sec",sec));return;}
   double on=Double.parseDouble(q.getParameter("humidity_on")),off=Double.parseDouble(q.getParameter("humidity_off"));int duration=Integer.parseInt(q.getParameter("max_run_sec")),cool=Integer.parseInt(q.getParameter("cooldown_sec"));String mode=q.getParameter("desired_mode");
   if(!Double.isFinite(on)||!Double.isFinite(off)||on!=Math.rint(on)||off!=Math.rint(off)||on<1||on>=off||off>100||duration<1||duration>600||cool<0||cool>600||(!"AUTO".equals(mode)&&!"MANUAL".equals(mode)))throw new IllegalArgumentException("Use integer RH bounds 1 <= on < off <= 100, pulse 1 to 600 seconds, cooldown 0 to 600");
   s.setHumidityOn(on);s.setHumidityOff(off);s.setMaxRunSec(duration);s.setCooldownSec(cool);s.setDesiredMode(mode);if(!dao.updateSetting(s))throw new IllegalArgumentException("Settings not updated");
   AppUser u=(AppUser)q.getSession().getAttribute("user");ControlCommand c=new ControlCommand();c.setDeviceId(id);c.setUserId(u.getUserId());c.setCommandType("SYNC_SETTING");c.setPayloadJson(Json.stringify(Json.map("on",(int)on,"off",(int)off,"mode",mode)));c.setStatus("PENDING");int cid=new ControlCommandDAO().createCommand(c);
   new ActivityLogDAO().log("ADMIN",id,u.getUserId(),cid,"SETTING_UPDATE","Air RH "+on+" to "+off+"; AUTO continuous; manual pulse="+duration+"s");Json.send(p,200,Json.map("status","success","command_id",cid,"message","Saved to database. Hardware sync pending; connect USB bridge."));
  }catch(IllegalArgumentException e){Json.send(p,400,Json.map("status","error","message",e.getMessage()));}catch(Exception e){getServletContext().log("Settings failed",e);Json.send(p,503,Json.map("status","error","message","Settings not saved. Check SQL Server."));}
 }
}
