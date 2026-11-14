package util;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class DBUtil {

    public static Connection getConnection() throws ClassNotFoundException, SQLException {
        return DBContext.getConnection();
    }

    public static void close(Statement stmt, ResultSet rs) {
        DBContext.close(null, stmt, rs);
    }

    public static void close(Connection conn, Statement stmt, ResultSet rs) {
        DBContext.close(conn, stmt, rs);
    }
}
