package model;

import java.sql.Date;
import java.sql.Timestamp;

public class Plant {
    private int plantId;
    private String plantName;
    private String species;
    private Date plantedDate;
    private String note;
    private boolean isDeleted;
    private Integer createdBy;
    private String creatorName;
    private Timestamp createdAt;

    public Plant() {
    }

    public Plant(int plantId, String plantName, String species, Date plantedDate, String note, boolean isDeleted, Integer createdBy, Timestamp createdAt) {
        this.plantId = plantId;
        this.plantName = plantName;
        this.species = species;
        this.plantedDate = plantedDate;
        this.note = note;
        this.isDeleted = isDeleted;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    public int getPlantId() {
        return plantId;
    }

    public void setPlantId(int plantId) {
        this.plantId = plantId;
    }

    public String getPlantName() {
        return plantName;
    }

    public void setPlantName(String plantName) {
        this.plantName = plantName;
    }

    public String getSpecies() {
        return species;
    }

    public void setSpecies(String species) {
        this.species = species;
    }

    public Date getPlantedDate() {
        return plantedDate;
    }

    public void setPlantedDate(Date plantedDate) {
        this.plantedDate = plantedDate;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public boolean isIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public Integer getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Integer createdBy) {
        this.createdBy = createdBy;
    }

    public String getCreatorName() {
        return creatorName;
    }

    public void setCreatorName(String creatorName) {
        this.creatorName = creatorName;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
}
