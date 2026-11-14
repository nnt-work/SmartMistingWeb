package util;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Universal Database Utility Class for PRJ301 Architecture.
 * Delegates to DBContext for centralized connection pooling and credential management.
 */
public class DBUtil {

    /**
     * Obtains an active SQL Server database connection.
     * @return java.sql.Connection instance
     * @throws ClassNotFoundException if the JDBC driver is missing
     * @throws SQLException if a database connection error occurs
     */
    public static Connection getConnection() throws ClassNotFoundException, SQLException {
        return DBContext.getConnection();
    }

    /**
     * Safely closes a Statement and ResultSet.
     */
    public static void close(Statement stmt, ResultSet rs) {
        DBContext.close(null, stmt, rs);
    }

    /**
     * Safely closes a Connection, Statement, and ResultSet.
     */
    public static void close(Connection conn, Statement stmt, ResultSet rs) {
        DBContext.close(conn, stmt, rs);
    }
}
