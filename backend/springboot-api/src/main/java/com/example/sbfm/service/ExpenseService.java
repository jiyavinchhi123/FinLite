package com.example.sbfm.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.example.sbfm.model.Expense;
import com.example.sbfm.repository.ExpenseRepository;

@Service
public class ExpenseService {
    private final ExpenseRepository expenseRepository;

    public ExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    public Expense create(Expense expense) {
        return expenseRepository.save(expense);
    }

    public List<Expense> list(UUID companyId) {
        if (companyId == null) return expenseRepository.findAll();
        return expenseRepository.findByCompanyId(companyId);
    }
}
