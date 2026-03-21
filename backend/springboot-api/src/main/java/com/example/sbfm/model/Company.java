package com.example.sbfm.model;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

@Entity
@Table(name = "companies")
public class Company {
    @Id
    private UUID id;
    @Column(name = "owner_id")
    private UUID ownerId;
    private String name;
    private String businessType;
    private Double openingCash;
    private Double openingBank;
    private Double ownerCapital;
    private LocalDate fiscalStart;
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBusinessType() { return businessType; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }

    public Double getOpeningCash() { return openingCash; }
    public void setOpeningCash(Double openingCash) { this.openingCash = openingCash; }

    public Double getOpeningBank() { return openingBank; }
    public void setOpeningBank(Double openingBank) { this.openingBank = openingBank; }

    public Double getOwnerCapital() { return ownerCapital; }
    public void setOwnerCapital(Double ownerCapital) { this.ownerCapital = ownerCapital; }

    public LocalDate getFiscalStart() { return fiscalStart; }
    public void setFiscalStart(LocalDate fiscalStart) { this.fiscalStart = fiscalStart; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
