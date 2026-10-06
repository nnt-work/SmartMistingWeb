package util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class DBContext {

    private static final String DRIVER = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
    private static final String HOST = "localhost";
    private static final int PORT = 1433;
    private static final String DB_NAME = "MistingDB";
    private static final String USER = "sa";
    private static final String PASS = "12345";

    public DBContext() {
    }

    public static Connection getConnection() throws ClassNotFoundException, SQLException {
        Class.forName(DRIVER);
        String url = "jdbc:sqlserver://" + HOST + ":" + PORT + ";databaseName=" + DB_NAME + ";encrypt=false;trustServerCertificate=true;";
        return DriverManager.getConnection(url, USER, PASS);
    }

    public static void close(Connection conn, Statement stmt, ResultSet rs) {
        if (rs != null) {
            try {
                rs.close();
            } catch (SQLException ignored) {
            }
        }
        if (stmt != null) {
            try {
                stmt.close();
            } catch (SQLException ignored) {
            }
        }
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException ignored) {
            }
        }
    }

    public static boolean testConnection() {
        Connection conn = null;
        try {
            conn = getConnection();
            return conn != null && !conn.isClosed();
        } catch (Exception e) {
            return false;
        } finally {
            close(conn, null, null);
        }
    }
}
