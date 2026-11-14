package dao;

import model.ControlCommand;
import util.DBContext;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class ControlCommandDAO {

    public int createCommand(ControlCommand cmd) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            if("STOP".equals(cmd.getCommandType())){
                try(PreparedStatement cancel=conn.prepareStatement("UPDATE ControlCommand SET status='EXPIRED' WHERE device_id=? AND status='PENDING'")){cancel.setInt(1,cmd.getDeviceId());cancel.executeUpdate();}
            }
            String sql = "INSERT INTO ControlCommand (device_id, user_id, command_type, payload_json, status, created_at, expires_at, ack_at) "
                       + "VALUES (?, ?, ?, ?, ?, SYSDATETIME(), DATEADD(second, 12, SYSDATETIME()), NULL)";
            ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, cmd.getDeviceId());
            if (cmd.getUserId() > 0) {
                ps.setInt(2, cmd.getUserId());
            } else {
                ps.setNull(2, java.sql.Types.INTEGER);
            }
            ps.setString(3, cmd.getCommandType());
            ps.setString(4, cmd.getPayloadJson());
            ps.setString(5, cmd.getStatus() != null ? cmd.getStatus() : "PENDING");

            ps.executeUpdate();
            rs = ps.getGeneratedKeys();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return -1;
    }

    public List<ControlCommand> getLatestCommands(int deviceId, int limit) throws SQLException, ClassNotFoundException {
        List<ControlCommand> list = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DBContext.getConnection();
            String sql = "SELECT TOP " + limit + " c.command_id, c.device_id, c.user_id, c.command_type, c.payload_json, "
                       + "c.status, c.created_at, c.expires_at, c.ack_at, u.username, d.device_name "
                       + "FROM ControlCommand c "
                       + "LEFT JOIN AppUser u ON c.user_id = u.user_id "
                       + "LEFT JOIN Device d ON c.device_id = d.device_id "
                       + (deviceId > 0 ? "WHERE c.device_id = ? " : "")
                       + "ORDER BY c.command_id DESC";
            ps = conn.prepareStatement(sql);
            int idx = 1;
            if (deviceId > 0) {
                ps.setInt(idx++, deviceId);
            }
            rs = ps.executeQuery();
            while (rs.next()) {
                ControlCommand c = new ControlCommand();
                c.setCommandId(rs.getInt("command_id"));
                c.setDeviceId(rs.getInt("device_id"));
                int uid = rs.getInt("user_id");
                if (!rs.wasNull()) c.setUserId(uid);
                c.setCommandType(rs.getString("command_type"));
                c.setPayloadJson(rs.getString("payload_json"));
                c.setStatus(rs.getString("status"));
                c.setCreatedAt(rs.getTimestamp("created_at"));
                c.setExpiresAt(rs.getTimestamp("expires_at"));
                c.setAckAt(rs.getTimestamp("ack_at"));
                c.setUsername(rs.getString("username"));
                c.setDeviceName(rs.getString("device_name"));
                list.add(c);
            }
        } finally {
            DBContext.close(conn, ps, rs);
        }
        return list;
    }

    public boolean updateStatus(int commandId, String status) throws SQLException, ClassNotFoundException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBContext.getConnection();
            String sql = "UPDATE ControlCommand SET status = ?, ack_at = SYSDATETIME() WHERE command_id = ?";
            ps = conn.prepareStatement(sql);
            ps.setString(1, status);
            ps.setInt(2, commandId);
            return ps.executeUpdate() > 0;
        } finally {
            DBContext.close(conn, ps, null);
        }
    }

    public ControlCommand claim(int deviceId)throws Exception{
        try(Connection c=DBContext.getConnection()){
            try(PreparedStatement expire=c.prepareStatement("UPDATE ControlCommand SET status='EXPIRED' WHERE device_id=? AND status='PENDING' AND expires_at<SYSDATETIME()")){expire.setInt(1,deviceId);expire.executeUpdate();}
            String sql=";WITH next_cmd AS (SELECT TOP 1 * FROM ControlCommand WITH (UPDLOCK, READPAST, ROWLOCK) WHERE device_id=? AND status='PENDING' AND dispatched_at IS NULL AND expires_at>=SYSDATETIME() ORDER BY command_id) UPDATE next_cmd SET dispatched_at=SYSDATETIME() OUTPUT inserted.command_id,inserted.command_type,inserted.payload_json";
            try(PreparedStatement p=c.prepareStatement(sql)){p.setInt(1,deviceId);try(ResultSet r=p.executeQuery()){if(!r.next())return null;ControlCommand cmd=new ControlCommand();cmd.setCommandId(r.getInt(1));cmd.setDeviceId(deviceId);cmd.setCommandType(r.getString(2));cmd.setPayloadJson(r.getString(3));return cmd;}}
        }
    }
    public boolean complete(int id,int device,String status)throws Exception{
        try(Connection c=DBContext.getConnection();PreparedStatement p=c.prepareStatement("UPDATE ControlCommand SET status=?,ack_at=SYSDATETIME() WHERE command_id=? AND device_id=? AND status='PENDING' AND dispatched_at IS NOT NULL AND expires_at>=SYSDATETIME()")){p.setString(1,status);p.setInt(2,id);p.setInt(3,device);return p.executeUpdate()>0;}
    }
}
