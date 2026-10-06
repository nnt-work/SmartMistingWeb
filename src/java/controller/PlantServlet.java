package controller;

import dao.ActivityLogDAO;
import dao.PlantDAO;
import model.AppUser;
import model.Plant;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.Date;
import java.util.List;

@WebServlet(name = "PlantServlet", urlPatterns = {"/plants"})
public class PlantServlet extends HttpServlet {

    private final PlantDAO plantDAO = new PlantDAO();
    private final ActivityLogDAO logDAO = new ActivityLogDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String keyword = request.getParameter("search");
        int page = 1;
        int pageSize = 6;

        String pageParam = request.getParameter("page");
        if (pageParam != null && !pageParam.trim().isEmpty()) {
            try {
                page = Math.max(1, Integer.parseInt(pageParam.trim()));
            } catch (NumberFormatException ignored) {
            }
        }

        try {
            int totalPlants = plantDAO.countPlants(keyword);
            int totalPages = (int) Math.ceil((double) totalPlants / pageSize);
            if (totalPages == 0) totalPages = 1;
            if (page > totalPages) page = totalPages;

            List<Plant> plants = plantDAO.getPlants(keyword, page, pageSize);

            request.setAttribute("plants", plants);
            request.setAttribute("currentPage", page);
            request.setAttribute("totalPages", totalPages);
            request.setAttribute("totalCount", totalPlants);
            request.setAttribute("searchKeyword", keyword);

            // Pop flash messages if any
            HttpSession session = request.getSession(false);
            if (session != null) {
                if (session.getAttribute("flashSuccess") != null) {
                    request.setAttribute("successMessage", session.getAttribute("flashSuccess"));
                    session.removeAttribute("flashSuccess");
                }
                if (session.getAttribute("flashError") != null) {
                    request.setAttribute("errorMessage", session.getAttribute("flashError"));
                    session.removeAttribute("flashError");
                }
            }

            request.getRequestDispatcher("/views/plants/plant-list.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Lỗi nạp danh sách cây: " + e.getMessage());
            request.getRequestDispatcher("/views/plants/plant-list.jsp").forward(request, response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);
        AppUser user = (session != null) ? (AppUser) session.getAttribute("user") : null;

        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }

        // RBAC validation: Only ADMIN and STAFF can add/edit/delete
        if (user.isViewer()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Tài khoản VIEWER không có quyền thao tác dữ liệu cây trồng!");
            return;
        }

        String action = request.getParameter("action");

        try {
            if ("add".equalsIgnoreCase(action)) {
                String plantName = request.getParameter("plant_name");
                String species = request.getParameter("species");
                String dateStr = request.getParameter("planted_date");
                String note = request.getParameter("note");

                if (plantName == null || plantName.trim().isEmpty()) {
                    session.setAttribute("flashError", "Tên cây trồng không được để trống!");
                    response.sendRedirect(request.getContextPath() + "/plants");
                    return;
                }

                Plant p = new Plant();
                p.setPlantName(plantName.trim());
                p.setSpecies(species != null ? species.trim() : "");
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    try {
                        p.setPlantedDate(Date.valueOf(dateStr.trim()));
                    } catch (IllegalArgumentException ignored) {
                    }
                }
                p.setNote(note != null ? note.trim() : "");
                p.setCreatedBy(user.getUserId());

                plantDAO.addPlant(p);
                logDAO.log("ADMIN", null, user.getUserId(), null, "PLANT_ADD",
                        "[" + user.getFullName() + "] đã thêm hồ sơ cây mới: " + p.getPlantName());

                session.setAttribute("flashSuccess", "Thêm cây trồng thành công: " + p.getPlantName());

            } else if ("edit".equalsIgnoreCase(action)) {
                int plantId = Integer.parseInt(request.getParameter("plant_id"));
                String plantName = request.getParameter("plant_name");
                String species = request.getParameter("species");
                String dateStr = request.getParameter("planted_date");
                String note = request.getParameter("note");

                if (plantName == null || plantName.trim().isEmpty()) {
                    session.setAttribute("flashError", "Tên cây trồng không được để trống!");
                    response.sendRedirect(request.getContextPath() + "/plants");
                    return;
                }

                Plant p = plantDAO.getPlantById(plantId);
                if (p != null) {
                    p.setPlantName(plantName.trim());
                    p.setSpecies(species != null ? species.trim() : "");
                    if (dateStr != null && !dateStr.trim().isEmpty()) {
                        try {
                            p.setPlantedDate(Date.valueOf(dateStr.trim()));
                        } catch (IllegalArgumentException ignored) {
                        }
                    }
                    p.setNote(note != null ? note.trim() : "");
                    plantDAO.updatePlant(p);

                    logDAO.log("ADMIN", null, user.getUserId(), null, "PLANT_UPDATE",
                            "[" + user.getFullName() + "] đã cập nhật cây: " + p.getPlantName());

                    session.setAttribute("flashSuccess", "Cập nhật thông tin cây thành công!");
                } else {
                    session.setAttribute("flashError", "Không tìm thấy cây cần cập nhật!");
                }

            } else if ("delete".equalsIgnoreCase(action)) {
                int plantId = Integer.parseInt(request.getParameter("plant_id"));
                Plant p = plantDAO.getPlantById(plantId);
                if (p != null) {
                    plantDAO.deletePlant(plantId);
                    logDAO.log("ADMIN", null, user.getUserId(), null, "PLANT_DELETE",
                            "[" + user.getFullName() + "] đã xóa cây: " + p.getPlantName());
                    session.setAttribute("flashSuccess", "Đã xóa cây [" + p.getPlantName() + "] thành công.");
                } else {
                    session.setAttribute("flashError", "Không tìm thấy cây để xóa!");
                }
            }

            response.sendRedirect(request.getContextPath() + "/plants");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Lỗi xử lý cây trồng: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/plants");
        }
    }
}
