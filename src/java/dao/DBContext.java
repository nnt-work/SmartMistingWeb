package dao;

import java.sql.Connection;
import java.sql.SQLException;

public class DBContext extends util.DBContext {
    public static Connection getDbConnection() throws ClassNotFoundException, SQLException {
        return util.DBContext.getConnection();
    }
}
