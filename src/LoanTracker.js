// src/LoanTracker.js
import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Tabs,
  Tab,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Box,
} from "@mui/material";

const LoanTracker = () => {
  // State variables
  const [activeTab, setActiveTab] = useState(0);
  const [loans, setLoans] = useState([]);
  const [borrower, setBorrower] = useState("");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [loanDate, setLoanDate] = useState("");
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [formattedDueDate, setFormattedDueDate] = useState("");

  // Create a ref to always access the latest paymentRecords
  const paymentRecordsRef = useRef(paymentRecords);
  useEffect(() => {
    paymentRecordsRef.current = paymentRecords;
  }, [paymentRecords]);

  // Update formatted due date on component mount
  useEffect(() => {
    updateFormattedDueDate();
  }, []);

  // Function to update the freeze date display (first day of current month)
  const updateFormattedDueDate = () => {
    const firstOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    setFormattedDueDate(
      `Till 1st ${firstOfMonth.toLocaleString("en-IN", { month: "long" })} ${firstOfMonth.getFullYear()}`
    );
  };

  // Format a number as Indian Rupees
  const formatRupees = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  // Calculate interest due on a loan (accrued until the first day of the current month)
  const calculateInterestDue = (loanDate, principal, annualInterestRate, payments) => {
    const today = new Date();
    // Freeze interest calculation on the first day of the current month
    const freezeDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = new Date(loanDate);

    // If the loan starts on or after the freeze date, no interest is accrued
    if (startDate >= freezeDate) return formatRupees(0);

    const monthlyInterest = principal * (annualInterestRate / 100) / 12;
    let totalInterest = 0;

    // Calculate details for the loan month
    const startOfLoanMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const startOfNextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    const daysInLoanMonth = (startOfNextMonth - startOfLoanMonth) / (1000 * 60 * 60 * 24);

    // If the freeze date is still in the loan month, calculate pro-rated interest only
    if (freezeDate <= startOfNextMonth) {
      const daysAccrued = (freezeDate - startDate) / (1000 * 60 * 60 * 24);
      totalInterest += monthlyInterest * (daysAccrued / daysInLoanMonth);
    } else {
      // Pro-rated interest for the remainder of the loan month
      const daysAccrued = (startOfNextMonth - startDate) / (1000 * 60 * 60 * 24);
      totalInterest += monthlyInterest * (daysAccrued / daysInLoanMonth);

      // Add full monthly interest for each full month until the freeze date
      let current = startOfNextMonth;
      while (current < freezeDate) {
        totalInterest += monthlyInterest;
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }

    // Subtract any recorded payments
    const totalPaid = payments.reduce((acc, cur) => acc + cur.amount, 0);
    totalInterest -= totalPaid;
    if (totalInterest < 0) totalInterest = 0;

    return formatRupees(totalInterest.toFixed(2));
  };

  // Function to add a new loan
  const addLoan = () => {
    if (!borrower || !amount || !interest || !loanDate) {
      alert("Please fill all loan details");
      return;
    }
    setLoans([
      ...loans,
      {
        borrower,
        amount: Number(amount),
        interest: Number(interest),
        loanDate,
        monthlyInterest: formatRupees(
          (Number(amount) * (Number(interest) / 100) / 12).toFixed(2)
        ),
        dueTillDate: calculateInterestDue(loanDate, Number(amount), Number(interest), []),
      },
    ]);
    setBorrower("");
    setAmount("");
    setInterest("");
    setLoanDate("");
  };

  // Function to record a payment for a loan
  const recordPayment = (loanIndex, paymentAmount, paymentDate) => {
    if (!paymentAmount || !paymentDate) return;
    const newPayment = {
      loanIndex,
      borrower: loans[loanIndex].borrower,
      amount: Number(paymentAmount),
      date: paymentDate,
    };
    const updatedPayments = [...paymentRecords, newPayment];
    setPaymentRecords(updatedPayments);

    // Update the interest due for this loan based on recorded payments
    setLoans(
      loans.map((loan, index) =>
        index === loanIndex
          ? {
              ...loan,
              dueTillDate: calculateInterestDue(
                loan.loanDate,
                loan.amount,
                loan.interest,
                updatedPayments.filter((p) => p.loanIndex === index)
              ),
            }
          : loan
      )
    );
  };

  // ---------------------------
  // New useEffect for Automatic Updates:
  // This interval updates the freeze date and recalculates interest due every hour.
  // Adjust the interval (currently 3600000ms = 1 hour) if needed.
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the freeze date display
      updateFormattedDueDate();
      // Recalculate the interest due for all loans using the latest paymentRecords
      setLoans((prevLoans) =>
        prevLoans.map((loan, index) => ({
          ...loan,
          dueTillDate: calculateInterestDue(
            loan.loanDate,
            loan.amount,
            loan.interest,
            paymentRecordsRef.current.filter((p) => p.loanIndex === index)
          ),
        }))
      );
    }, 3600000); // 1 hour interval

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array so this effect runs only once on mount.
  // ---------------------------

  return (
    <Box className="p-4">
      <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
        <Tab label="Loans" />
        <Tab label="Payment History" />
      </Tabs>

      {/* Loans Tab */}
      {activeTab === 0 && (
        <Box mt={2}>
          <Box className="grid grid-cols-3 gap-4">
            <TextField
              label="Borrower Name"
              value={borrower}
              onChange={(e) => setBorrower(e.target.value)}
            />
            <TextField
              label="Loan Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TextField
              label="Interest Rate (%)"
              type="number"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            />
            <TextField
              label="Loan Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
            />
            <Button variant="contained" onClick={addLoan}>
              Add Loan
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ marginTop: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Borrower</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Interest (%)</TableCell>
                  <TableCell>Loan Date</TableCell>
                  <TableCell>Monthly Interest</TableCell>
                  <TableCell>Interest Due {formattedDueDate}</TableCell>
                  <TableCell>Payment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map((loan, index) => (
                  <TableRow key={index}>
                    <TableCell>{loan.borrower}</TableCell>
                    <TableCell>{formatRupees(loan.amount)}</TableCell>
                    <TableCell>{loan.interest}</TableCell>
                    <TableCell>{loan.loanDate}</TableCell>
                    <TableCell>{loan.monthlyInterest}</TableCell>
                    <TableCell>{loan.dueTillDate}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        placeholder="Amount"
                        id={`payment-${index}`}
                        size="small"
                        sx={{ marginRight: 1 }}
                      />
                      <TextField
                        type="date"
                        id={`payment-date-${index}`}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ marginRight: 1 }}
                      />
                      <Button
                        variant="contained"
                        onClick={() =>
                          recordPayment(
                            index,
                            document.getElementById(`payment-${index}`).value,
                            document.getElementById(`payment-date-${index}`).value
                          )
                        }
                      >
                        Record
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Payment History Tab */}
      {activeTab === 1 && (
        <Box mt={2}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Borrower</TableCell>
                  <TableCell>Payment Amount</TableCell>
                  <TableCell>Payment Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentRecords.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>{payment.borrower}</TableCell>
                    <TableCell>{formatRupees(payment.amount)}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default LoanTracker;
