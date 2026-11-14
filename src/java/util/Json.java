package util;
import java.util.*;
import javax.servlet.http.*;
import java.io.*;
public final class Json {
 private Json(){}
 public static String quote(String s){if(s==null)return "null";StringBuilder b=new StringBuilder("\"");for(char c:s.toCharArray()){switch(c){case '"':b.append("\\\"");break;case '\\':b.append("\\\\");break;case '\n':b.append("\\n");break;case '\r':b.append("\\r");break;case '\t':b.append("\\t");break;default:if(c<32||c=='<'||c=='>'||c=='&'||c=='\u2028'||c=='\u2029')b.append(String.format("\\u%04x",(int)c));else b.append(c);}}return b.append('"').toString();}
 public static String stringify(Object x){if(x==null)return "null";if(x instanceof String)return quote((String)x);if(x instanceof Boolean)return x.toString();if(x instanceof Number){double d=((Number)x).doubleValue();return Double.isNaN(d)||Double.isInfinite(d)?"null":x.toString();}StringBuilder b=new StringBuilder();if(x instanceof Map){b.append('{');for(Object k:((Map<?,?>)x).keySet()){if(b.length()>1)b.append(',');b.append(quote(String.valueOf(k))).append(':').append(stringify(((Map<?,?>)x).get(k)));}return b.append('}').toString();}if(x instanceof Iterable){b.append('[');for(Object v:(Iterable<?>)x){if(b.length()>1)b.append(',');b.append(stringify(v));}return b.append(']').toString();}return quote(x.toString());}
 public static Map<String,Object> map(Object... kv){Map<String,Object> m=new LinkedHashMap<>();for(int i=0;i<kv.length;i+=2)m.put((String)kv[i],kv[i+1]);return m;}
 public static void send(HttpServletResponse r,int status,Object value)throws IOException{r.setStatus(status);r.setContentType("application/json;charset=UTF-8");r.getWriter().write(stringify(value));}

 public static Map<String,String> body(HttpServletRequest req)throws IOException{
  Map<String,String> m=new HashMap<>();for(Map.Entry<String,String[]>e:req.getParameterMap().entrySet())if(e.getValue().length>0)m.put(e.getKey(),e.getValue()[0]);
  if(req.getContentType()!=null&&req.getContentType().contains("application/json")){
   StringBuilder b=new StringBuilder();char[] buf=new char[1024];int n;Reader rd=req.getReader();while((n=rd.read(buf))!=-1){b.append(buf,0,n);if(b.length()>8192)throw new IllegalArgumentException("Request too large");}
   java.util.regex.Matcher mt=java.util.regex.Pattern.compile("\"([a-zA-Z_][a-zA-Z_0-9]*)\"\\s*:\\s*(\"[^\"\\\\]*\"|true|false|null|-?[0-9]+(?:\\.[0-9]+)?)").matcher(b);
   while(mt.find()){String v=mt.group(2);m.put(mt.group(1),v.startsWith("\"")?v.substring(1,v.length()-1):v);}
  }return m;
 }
 public static Double number(Map<String,String>m,String...keys){for(String k:keys){String s=m.get(k);if(s!=null&&!s.equals("null")&&!s.isEmpty()){double v=Double.parseDouble(s);if(!Double.isFinite(v))throw new IllegalArgumentException("Invalid number");return v;}}return null;}
 public static boolean flag(Map<String,String>m,String k){String v=m.get(k);return "1".equals(v)||"true".equalsIgnoreCase(v);}
}
