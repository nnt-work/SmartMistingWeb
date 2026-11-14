package util;
import java.sql.*;
import service.Config;
/** SQL Server JDBC configuration. Explicit credentials; no password guessing. */
public class DBContext {
 public static Connection getConnection() throws ClassNotFoundException, SQLException {
  Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
  return DriverManager.getConnection(value("DB_URL","db.url","jdbc:sqlserver://127.0.0.1:1433;databaseName=MistingDB;encrypt=false;trustServerCertificate=true;loginTimeout=3;socketTimeout=5000"),value("DB_USER","db.user","sa"),value("DB_PASSWORD","db.password","12345"));
 }
 private static String value(String env,String key,String def){
  String v=System.getenv(env); if(v==null)v=System.getProperty(key); return v!=null?v:Config.get(key,def);
 }
 public static boolean isPortListening(String host,int port,int timeout){try(java.net.Socket s=new java.net.Socket()){s.connect(new java.net.InetSocketAddress(host,port),timeout);return true;}catch(Exception e){return false;}}
 public static boolean testConnection(){try(Connection c=getConnection()){return c.isValid(2);}catch(Exception e){return false;}}
 public static void close(Connection c,Statement s,ResultSet r){try{if(r!=null)r.close();}catch(Exception ignored){}try{if(s!=null)s.close();}catch(Exception ignored){}try{if(c!=null)c.close();}catch(Exception ignored){}}
}
