package service;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;

public class Config {
    private static final Properties PROPS = new Properties();

    static {
        load();
    }

    public static synchronized void load() {
        String customPath = System.getenv("PRJ_SM_CONFIG");
        File file = null;

        if (customPath != null && !customPath.trim().isEmpty()) {
            file = new File(customPath.trim());
        }

        if (file == null || !file.exists()) {
            File homeFile = new File(System.getProperty("user.home"), "prj_sm_config.properties");
            if (homeFile.exists()) {
                file = homeFile;
            }
        }

        if (file == null || !file.exists()) {
            File localFile = new File("prj_sm_config.properties");
            if (localFile.exists()) {
                file = localFile;
            }
        }

        if (file != null && file.exists() && file.isFile()) {
            try (InputStream in = new FileInputStream(file)) {
                PROPS.load(in);
                System.out.println("[Config] Loaded configuration from: " + file.getAbsolutePath());
            } catch (Exception e) {
                System.err.println("[Config] Error reading config file: " + e.getMessage());
            }
        } else {
            // Attempt classpath fallback
            try (InputStream in = Config.class.getResourceAsStream("/prj_sm_config.properties")) {
                if (in != null) {
                    PROPS.load(in);
                    System.out.println("[Config] Loaded configuration from classpath.");
                } else {
                    System.out.println("[Config] Config file not found, using default values.");
                }
            } catch (Exception ignored) {
            }
        }
    }

    private static String resolveAlias(String key) {
        if ("discord.webhook.url".equals(key)) return "discord.webhook";
        if ("discord.webhook".equals(key)) return "discord.webhook.url";
        if ("healthchecks.ping.url".equals(key)) return "hc.ping.url";
        if ("hc.ping.url".equals(key)) return "healthchecks.ping.url";
        return null;
    }

    public static String get(String key, String defaultVal) {
        String sys = System.getProperty(key);
        if (sys != null && !sys.trim().isEmpty()) return sys.trim();

        String val = PROPS.getProperty(key);
        if (val != null && !val.trim().isEmpty()) return val.trim();

        String alias = resolveAlias(key);
        if (alias != null) {
            String sysAlias = System.getProperty(alias);
            if (sysAlias != null && !sysAlias.trim().isEmpty()) return sysAlias.trim();
            String valAlias = PROPS.getProperty(alias);
            if (valAlias != null && !valAlias.trim().isEmpty()) return valAlias.trim();
        }

        if ("discord.webhook.url".equals(key) || "discord.webhook".equals(key)) {
            return (defaultVal != null && !defaultVal.trim().isEmpty()) ? defaultVal : "https://discord.com/api/webhooks/1563858029861150811/_sIvTXS95FMlMAGcay7oqMyvN2xVzKymOBHgJfppqiKprrFh6LBG42-QlabOvk2liv9q";
        }
        return defaultVal;
    }

    public static boolean getBoolean(String key, boolean defaultVal) {
        String val = get(key, null);
        return val != null ? Boolean.parseBoolean(val) : defaultVal;
    }

    public static double getDouble(String key, double defaultVal) {
        String val = get(key, null);
        if (val == null) return defaultVal;
        try {
            return Double.parseDouble(val);
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }
}
