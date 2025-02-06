import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";


const LoanTracker = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loans, setLoans] = useState([]);
  const [borrower, setBorrower] = useState("");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [loanDate, setLoanDate] = useState("");
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [formattedDueDate, setFormattedDueDate] = useState("");

  useEffect(() => {
    updateFormattedDueDate();
  }, []);

  // This "freeze date" is the first day of the current month.
  const updateFormattedDueDate = () => {
    const firstOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    setFormattedDueDate(
      `Till 1st ${firstOfMonth.toLocaleString("en-IN", {
        month: "long",
      })} ${firstOfMonth.getFullYear()}`
    );
  };

  // Format number into Indian Rupees currency
  const formatRupees = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  /**
   * Calculate the total interest due on a loan.
   *
   * Business Rules:
   * - The interest is accrued (only) until the first day of the current month.
   *   For example, if today is Feb 23, 2025, the calculation stops at Feb 1, 2025.
   * - For the month in which the loan is given, the interest is charged on a pro-rated basis
   *   (from the loan date until the end of that month).
   * - For each subsequent full month until the freeze date, full monthly interest is applied.
   * - The monthly interest is calculated as: (principal * (annual interest rate / 100) / 12)
   * - Any payments made on the loan are subtracted from the accrued interest.
   *
   * @param {string} loanDate - The loan start date.
   * @param {number} principal - The loan amount.
   * @param {number} annualInterestRate - The annual interest rate in percentage.
   * @param {Array} payments - Array of payment objects for this loan.
   * @returns {string} - The formatted interest due.
   */
  const calculateInterestDue = (loanDate, principal, annualInterestRate, payments) => {
    const today = new Date();
    // Freeze the interest calculation at the first day of the current month.
    const freezeDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = new Date(loanDate);

    // If the loan starts on or after the freeze date, no interest has accrued.
    if (startDate >= freezeDate) return formatRupees(0);

    const monthlyInterest = principal * (annualInterestRate / 100) / 12;
    let totalInterest = 0;

    // Determine the beginning and end of the loan’s starting month.
    const startOfLoanMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const startOfNextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    const daysInLoanMonth = (startOfNextMonth - startOfLoanMonth) / (1000 * 60 * 60 * 24);

    // If the freeze date falls within the same month as the loan date,
    // charge only the pro-rated interest until the freeze date.
    if (freezeDate <= startOfNextMonth) {
      const daysAccrued = (freezeDate - startDate) / (1000 * 60 * 60 * 24);
      totalInterest += monthlyInterest * (daysAccrued / daysInLoanMonth);
    } else {
      // For the month the loan was taken, charge pro-rated interest for the remaining days.
      const daysAccrued = (startOfNextMonth - startDate) / (1000 * 60 * 60 * 24);
      totalInterest += monthlyInterest * (daysAccrued / daysInLoanMonth);

      // For each full month after the loan month up to (but not including) the freeze date,
      // add full monthly interest.
      let current = startOfNextMonth;
      while (current < freezeDate) {
        totalInterest += monthlyInterest;
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }

    // Subtract any recorded payments.
    const totalPaid = payments.reduce((acc, cur) => acc + cur.amount, 0);
    totalInterest -= totalPaid;
    if (totalInterest < 0) totalInterest = 0;
    return formatRupees(totalInterest.toFixed(2));
  };

  // Add a new loan
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
        // Calculate the monthly interest (for display only)
        monthlyInterest: formatRupees(
          (Number(amount) * (Number(interest) / 100) / 12).toFixed(2)
        ),
        dueTillDate: calculateInterestDue(
          loanDate,
          Number(amount),
          Number(interest),
          [] // no payments yet
        ),
      },
    ]);
    setBorrower("");
    setAmount("");
    setInterest("");
    setLoanDate("");
  };

  // Record a payment against a loan.
  // The payment is saved and the loan’s interest due is recalculated.
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
