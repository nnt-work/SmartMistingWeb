package controller;

import util.DBContext;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

@WebServlet(name = "HealthServlet", urlPatterns = {"/health"})
public class HealthServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        boolean dbConnected = false;
        String dbError = null;
        String dbProductName = "";
        String dbProductVersion = "";
        Map<String, Integer> tableCounts = new HashMap<>();

        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            if (conn != null && !conn.isClosed()) {
                dbConnected = true;
                DatabaseMetaData meta = conn.getMetaData();
                dbProductName = meta.getDatabaseProductName();
                dbProductVersion = meta.getDatabaseProductVersion();

                stmt = conn.createStatement();
                String[] tables = {"AppUser", "Plant", "Device", "MistingSetting", "SensorReading", "ControlCommand", "ActivityLog"};
                for (String t : tables) {
                    try {
                        rs = stmt.executeQuery("SELECT COUNT(*) FROM " + t);
                        if (rs.next()) {
                            tableCounts.put(t, rs.getInt(1));
                        }
                    } catch (Exception tableEx) {
                        tableCounts.put(t, -1);
                    }
                }
            }
        } catch (Exception e) {
            dbConnected = false;
            dbError = e.getMessage();
        } finally {
            DBContext.close(conn, stmt, rs);
        }

        request.setAttribute("dbConnected", dbConnected);
        request.setAttribute("dbError", dbError);
        request.setAttribute("dbProductName", dbProductName);
        request.setAttribute("dbProductVersion", dbProductVersion);
        request.setAttribute("tableCounts", tableCounts);

        request.getRequestDispatcher("/views/health.jsp").forward(request, response);
    }
}
