package controller;
import dao.*;import model.*;import util.Json;import java.io.*;import java.util.*;
import javax.servlet.annotation.WebServlet;import javax.servlet.http.*;
/** One logged-in browser owns a short device lease and dispatches pending commands over USB. */
@WebServlet(name="HardwareBridgeServlet",urlPatterns={"/api/bridge"})
public class HardwareBridgeServlet extends HttpServlet {
 private static final Map<Integer,String> owners=new HashMap<>();private static final Map<Integer,Long> leases=new HashMap<>();
 private static synchronized boolean lease(int d,String session){long now=System.currentTimeMillis();if(leases.containsKey(d)&&leases.get(d)>now&&!session.equals(owners.get(d)))return false;owners.put(d,session);leases.put(d,now+10000);return true;}
 @Override protected void doGet(HttpServletRequest q,HttpServletResponse p)throws IOException{
  try{int d=Integer.parseInt(q.getParameter("device_id")==null?"1":q.getParameter("device_id"));if(!lease(d,q.getSession().getId())){Json.send(p,409,Json.map("status","busy","message","Another browser owns the hardware bridge"));return;}
   ControlCommand c=new ControlCommandDAO().claim(d);Json.send(p,200,Json.map("status","success","command",c==null?null:Json.map("id",c.getCommandId(),"type",c.getCommandType(),"payload",c.getPayloadJson())));
  }catch(Exception e){getServletContext().log("Bridge poll failed",e);Json.send(p,503,Json.map("status","error","message","Bridge database unavailable"));}
 }
 @Override protected void doPost(HttpServletRequest q,HttpServletResponse p)throws IOException{
  try{Map<String,String>m=Json.body(q);int d=Integer.parseInt(m.get("device_id")),id=Integer.parseInt(m.get("command_id"));if(!lease(d,q.getSession().getId())){Json.send(p,409,Json.map("status","busy"));return;}
   String status="true".equals(m.get("confirmed"))?"ACKED":"FAILED";
   if(!new ControlCommandDAO().complete(id,d,status)){Json.send(p,409,Json.map("status","expired"));return;}
   AppUser u=(AppUser)q.getSession().getAttribute("user");new ActivityLogDAO().log("MISTING",d,u.getUserId(),id,status,"Bridge observed "+status+" in Arduino telemetry");Json.send(p,200,Json.map("status",status));
  }catch(Exception e){getServletContext().log("Bridge ack failed",e);Json.send(p,503,Json.map("status","error"));}
 }
}
