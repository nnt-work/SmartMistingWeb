package filter;
import model.AppUser;import dao.UserDAO;import dao.RolePermissionDAO;import util.Json;
import javax.servlet.*;import javax.servlet.http.*;import java.io.*;
public class AuthFilter implements Filter {
 public void init(FilterConfig c){} public void destroy(){}
 public void doFilter(ServletRequest req,ServletResponse res,FilterChain chain)throws IOException,ServletException{
  HttpServletRequest q=(HttpServletRequest)req;HttpServletResponse p=(HttpServletResponse)res;q.setCharacterEncoding("UTF-8");p.setCharacterEncoding("UTF-8");
  String uri=q.getRequestURI().substring(q.getContextPath().length());
  if(uri.equals("/")||uri.equals("/login")||uri.equals("/index.jsp")||uri.startsWith("/css/")||uri.startsWith("/js/")||uri.startsWith("/images/")||uri.startsWith("/webfonts/")){chain.doFilter(req,res);return;}
  HttpSession s=q.getSession(false);AppUser u=s!=null&&s.getAttribute("user") instanceof AppUser?(AppUser)s.getAttribute("user"):null;
  if(u==null){reject(q,p,401,"Please log in");return;}
  try{AppUser fresh=new UserDAO().getUserById(u.getUserId());if(fresh==null||fresh.isIsLocked()){s.invalidate();reject(q,p,401,"Account locked or removed");return;}u=fresh;s.setAttribute("user",u);s.setAttribute("role",u.getRoleCode());}
  catch(Exception e){reject(q,p,503,"Database unavailable. Check SQL Server configuration.");return;}
  String origin=q.getHeader("Origin");if("POST".equals(q.getMethod())&&origin!=null&&!origin.equals(q.getScheme()+"://"+q.getHeader("Host"))){reject(q,p,403,"Cross-origin write denied");return;}
  String role=u.getRoleCode(),view=q.getParameter("view");boolean admin=uri.startsWith("/admin/users")||uri.startsWith("/users")||uri.startsWith("/admin/devices")||uri.startsWith("/devices")||("/dashboard".equals(uri)&&("users".equals(view)||"hardware".equals(view)||"devices".equals(view)));
  if(admin&&!u.isAdmin()){reject(q,p,403,"Administrator required");return;}
  boolean control=uri.equals("/control")||uri.equals("/api/bridge")||("POST".equals(q.getMethod())&&uri.equals("/api/sensor"));
  boolean setting=uri.equals("/settings")||uri.equals("/admin/settings")||("/dashboard".equals(uri)&&"settings".equals(view));
  boolean plant=uri.equals("/plants")&&"POST".equals(q.getMethod());
  if((control||setting||plant)&&u.isViewer()){reject(q,p,403,"VIEWER is read only");return;}
  String module=control?"PUMP_OVERRIDE":setting?"AUTO_SETTINGS":plant?"PLANT_CATALOG":null;
  if(module!=null&&!new RolePermissionDAO().allowed(module,role)){reject(q,p,403,"Permission disabled by administrator");return;}
  chain.doFilter(req,res);
 }
 private void reject(HttpServletRequest q,HttpServletResponse p,int code,String msg)throws IOException{
  if(code==401&&"GET".equals(q.getMethod())&&!q.getRequestURI().contains("/api/")){p.sendRedirect(q.getContextPath()+"/login");return;}
  Json.send(p,code,Json.map("status","error","success",false,"message",msg));
 }
}
