package com.example.sbfm.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.example.sbfm.model.Income;
import com.example.sbfm.repository.IncomeRepository;

@Service
public class IncomeService {
    private final IncomeRepository incomeRepository;

    public IncomeService(IncomeRepository incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    public Income create(Income income) {
        return incomeRepository.save(income);
    }

    public List<Income> list(UUID companyId) {
        if (companyId == null) return incomeRepository.findAll();
        return incomeRepository.findByCompanyId(companyId);
    }
}
