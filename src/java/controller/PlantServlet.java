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

            request.setAttribute("activeNav", "plants");
            request.getRequestDispatcher("/dashboard").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
            request.setAttribute("errorMessage", "Error loading plant profiles: " + e.getMessage());
            request.setAttribute("activeNav", "plants");
            request.getRequestDispatcher("/dashboard").forward(request, response);
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
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "VIEWER role is not authorized to modify plant data!");
            return;
        }

        String action = request.getParameter("action");

        try {
            if("add".equalsIgnoreCase(action)||"edit".equalsIgnoreCase(action)) {
                double on=Double.parseDouble(request.getParameter("humidity_on")),off=Double.parseDouble(request.getParameter("humidity_off"));
                if(!Double.isFinite(on)||!Double.isFinite(off)||on<1||on>=off||off>100)throw new IllegalArgumentException("RH bounds must satisfy 1 <= on < off <= 100");
                if(request.getParameter("plant_name")==null||request.getParameter("plant_name").trim().length()>100)throw new IllegalArgumentException("Plant name maximum 100 characters");
            }
            if ("add".equalsIgnoreCase(action)) {
                String plantName = request.getParameter("plant_name");
                String species = request.getParameter("species");
                String dateStr = request.getParameter("planted_date");
                String note = request.getParameter("note");
                String humOnStr = request.getParameter("humidity_on");
                String humOffStr = request.getParameter("humidity_off");

                if (plantName == null || plantName.trim().isEmpty()) {
                    session.setAttribute("flashError", "Plant name cannot be empty!");
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
                try {
                    if (humOnStr != null && !humOnStr.trim().isEmpty()) p.setHumidityOn(Double.parseDouble(humOnStr));
                    if (humOffStr != null && !humOffStr.trim().isEmpty()) p.setHumidityOff(Double.parseDouble(humOffStr));
                } catch (NumberFormatException ignored) {}
                p.setCreatedBy(user.getUserId());

                plantDAO.addPlant(p);
                logDAO.log("ADMIN", null, user.getUserId(), null, "PLANT_ADD",
                        "[" + user.getFullName() + "] added new plant: " + p.getPlantName());

                session.setAttribute("flashSuccess", "Plant profile added successfully: " + p.getPlantName());

            } else if ("edit".equalsIgnoreCase(action)) {
                int plantId = Integer.parseInt(request.getParameter("plant_id"));
                String plantName = request.getParameter("plant_name");
                String species = request.getParameter("species");
                String dateStr = request.getParameter("planted_date");
                String note = request.getParameter("note");
                String humOnStr = request.getParameter("humidity_on");
                String humOffStr = request.getParameter("humidity_off");

                if (plantName == null || plantName.trim().isEmpty()) {
                    session.setAttribute("flashError", "Plant name cannot be empty!");
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
                    try {
                        if (humOnStr != null && !humOnStr.trim().isEmpty()) p.setHumidityOn(Double.parseDouble(humOnStr));
                        if (humOffStr != null && !humOffStr.trim().isEmpty()) p.setHumidityOff(Double.parseDouble(humOffStr));
                    } catch (NumberFormatException ignored) {}
                    plantDAO.updatePlant(p);

                    logDAO.log("ADMIN", null, user.getUserId(), null, "PLANT_UPDATE",
                            "[" + user.getFullName() + "] updated plant: " + p.getPlantName());

                    session.setAttribute("flashSuccess", "Plant profile updated successfully!");
                } else {
                    session.setAttribute("flashError", "Plant profile not found!");
                }

            } else if ("delete".equalsIgnoreCase(action)) {
                int plantId = Integer.parseInt(request.getParameter("plant_id"));
                Plant p = plantDAO.getPlantById(plantId);
                if (p != null) {
                    plantDAO.deletePlant(plantId);
                    logDAO.log("ADMIN", null, user.getUserId(), null, "PLANT_DELETE",
                            "[" + user.getFullName() + "] deleted plant: " + p.getPlantName());
                    session.setAttribute("flashSuccess", "Plant [" + p.getPlantName() + "] deleted successfully.");
                } else {
                    session.setAttribute("flashError", "Plant profile to delete not found!");
                }
            }

            response.sendRedirect(request.getContextPath() + "/plants");

        } catch (Exception e) {
            e.printStackTrace();
            session.setAttribute("flashError", "Plant operation error: " + e.getMessage());
            response.sendRedirect(request.getContextPath() + "/plants");
        }
    }
}
