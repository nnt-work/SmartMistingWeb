package util;

import java.io.IOException;
import java.io.Reader;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Lightweight, zero-dependency JSON serialization and parsing utility.
 * Designed for embedded SCADA telemetry payloads and REST servlet responses.
 */
public final class Json {

    private static final Pattern FLAT_JSON_PATTERN = Pattern.compile(
            "\"([a-zA-Z_][a-zA-Z_0-9]*)\"\\s*:\\s*(\"[^\"\\\\]*\"|true|false|null|-?[0-9]+(?:\\.[0-9]+)?)"
    );

    private Json() {
    }

    /**
     * Escapes and quotes a string for JSON compliance.
     *
     * @param s Plain string
     * @return Quoted JSON string
     */
    public static String quote(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (c < 32 || c == '<' || c == '>' || c == '&' || c == '\u2028' || c == '\u2029') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.append('"').toString();
    }

    /**
     * Serializes an arbitrary Java object, Map, Iterable, or primitive into JSON.
     *
     * @param x Target object
     * @return Serialized JSON string
     */
    public static String stringify(Object x) {
        if (x == null) {
            return "null";
        }
        if (x instanceof String) {
            return quote((String) x);
        }
        if (x instanceof Boolean) {
            return x.toString();
        }
        if (x instanceof Number) {
            double d = ((Number) x).doubleValue();
            return (Double.isNaN(d) || Double.isInfinite(d)) ? "null" : x.toString();
        }
        StringBuilder sb = new StringBuilder();
        if (x instanceof Map) {
            sb.append('{');
            for (Object k : ((Map<?, ?>) x).keySet()) {
                if (sb.length() > 1) {
                    sb.append(',');
                }
                sb.append(quote(String.valueOf(k))).append(':').append(stringify(((Map<?, ?>) x).get(k)));
            }
            return sb.append('}').toString();
        }
        if (x instanceof Iterable) {
            sb.append('[');
            for (Object v : (Iterable<?>) x) {
                if (sb.length() > 1) {
                    sb.append(',');
                }
                sb.append(stringify(v));
            }
            return sb.append(']').toString();
        }
        return quote(x.toString());
    }

    /**
     * Constructs a LinkedHashMap from alternating key-value varargs.
     *
     * @param kv Key-value pairs
     * @return Map containing given entries
     */
    public static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    /**
     * Flushes a JSON status and serialized object to an HTTP response.
     *
     * @param resp Target servlet response
     * @param status HTTP response code
     * @param value Payload object to serialize
     * @throws IOException on network or stream error
     */
    public static void send(HttpServletResponse resp, int status, Object value) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write(stringify(value));
    }

    /**
     * Parses request parameters and flat JSON request bodies into key-value map.
     * Flat telemetry JSON only; nested structures are outside this API scope.
     *
     * @param req HttpServletRequest
     * @return Key-value parameter map
     * @throws IOException on read error
     */
    public static Map<String, String> body(HttpServletRequest req) throws IOException {
        Map<String, String> map = new HashMap<>();
        for (Map.Entry<String, String[]> entry : req.getParameterMap().entrySet()) {
            if (entry.getValue().length > 0) {
                map.put(entry.getKey(), entry.getValue()[0]);
            }
        }
        if (req.getContentType() != null && req.getContentType().contains("application/json")) {
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[1024];
            int n;
            Reader rd = req.getReader();
            while ((n = rd.read(buf)) != -1) {
                sb.append(buf, 0, n);
                if (sb.length() > 8192) {
                    throw new IllegalArgumentException("Request body too large");
                }
            }
            Matcher matcher = FLAT_JSON_PATTERN.matcher(sb);
            while (matcher.find()) {
                String val = matcher.group(2);
                map.put(matcher.group(1), val.startsWith("\"") ? val.substring(1, val.length() - 1) : val);
            }
        }
        return map;
    }

    /**
     * Extracts and parses the first matching numeric value from the parameter map.
     *
     * @param map Parameter map
     * @param keys Candidate key names
     * @return Double value, or null if absent/null
     */
    public static Double number(Map<String, String> map, String... keys) {
        for (String k : keys) {
            String s = map.get(k);
            if (s != null && !"null".equals(s) && !s.isEmpty()) {
                double val = Double.parseDouble(s);
                if (!Double.isFinite(val)) {
                    throw new IllegalArgumentException("Invalid number: " + s);
                }
                return val;
            }
        }
        return null;
    }

    /**
     * Extracts a boolean flag from the map ('1' or 'true').
     *
     * @param map Parameter map
     * @param key Key name
     * @return true if flag is present and set
     */
    public static boolean flag(Map<String, String> map, String key) {
        String val = map.get(key);
        return "1".equals(val) || "true".equalsIgnoreCase(val);
    }
}
