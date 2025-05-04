const dotenv = require("dotenv");
dotenv.config();
const express = require("express");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const validator = require("validator");
const { format } = require("date-fns");

//  connecting to the database
let db = null;
const dbPath = path.join(__dirname, "./database.db");
const PORT = process.env.PORT || 3001;
const initializeDbAndServer = async () => {
  try {
    // starting the server and DB
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log("Error in connecting DB", error);
  }
};
initializeDbAndServer();

// used for creating success response
function createSuccessResponse(message, data = null) {
  return {
    success: true,
    message,
    data,
  };
}

// used for creating error response
function createErrorResponse(message, details = []) {
  return {
    success: false,
    error: {
      message,
      details,
    },
  };
}

// middleWare for authenticating
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // token not found
  if (!token) {
    return res.status(401).json(createErrorResponse("Token not found"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    // invalid token
    if (err) {
      return res.status(403).json(createErrorResponse("Invalid Token"));
    }

    // correct token
    req.user = user;
    next();
  });
}

// validator function for customer
function validateCustomer(data) {
  const errors = [];

  // validating userId
  if (!validator.isInt(String(data.userId))) {
    errors.push({ field: "userId", message: "userId must be an integer" });
  }

  // validating name
  if (validator.isEmpty(data.name || "")) {
    errors.push({ field: "name", message: "Name is required" });
  }

  //   validating mobile number for 10-digit and starting from [6-9]
  if (!validator.matches(data.phone || "", /^[6-9]\d{9}$/)) {
    errors.push({ field: "phone", message: "Phone number must be valid" });
  }

  // validating address
  if (validator.isEmpty(data.address || "")) {
    errors.push({ field: "address", message: "Address is required" });
  }

  // validating trustScore
  if (!validator.isInt(String(data.trustScore), { min: 0, max: 10 })) {
    errors.push({
      field: "trustScore",
      message: "Trust score must be between 0 and 10",
    });
  }

  // validating creditLimit
  if (!validator.isFloat(String(data.creditLimit), { min: 0 })) {
    errors.push({
      field: "creditLimit",
      message: "Credit limit must be a non-negative number",
    });
  }

  return errors;
}

// validator function for loan
function loanValidator(data) {
  const errors = [];

  // validate customerId
  if (!validator.isInt(String(data.customerId))) {
    errors.push({
      field: "customerId must be an integer",
    });
  }

  // validate itemDesc
  if (validator.isEmpty(data.itemDesc || "")) {
    errors.push({
      field: "Item Description is required",
    });
  }

  // validate amount
  if (!validator.isFloat(String(data.amount), { min: 0 })) {
    errors.push({
      field: "Amount must be a non-negative number",
    });
  }

  // validate date
  if (
    !validator.isDate(data.issueDate || "") ||
    !validator.isDate(data.dueDate || "")
  ) {
    errors.push({
      field: "Invalid Date",
    });
  } else if (new Date(data.dueDate) <= new Date(data.issueDate)) {
    errors.push({ field: "Due date must be after issue date." });
  }

  // validate frequency
  const allowedFreq = ["bi-weekly", "monthly"];
  if (!allowedFreq.includes(data.frequency)) {
    errors.push({
      field: "Frequency must be 'bi-weekly' or 'monthly'.",
    });
  }

  // validate status
  const allowedStatus = ["pending", "paid", "overdue"];
  if (!allowedStatus.includes(data.status)) {
    errors.push({
      field: "Invalid Status",
    });
  }

  return errors;
}

// register user (shopkeeper)
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json(
      createErrorResponse("Validation failed", [
        { field: "email", message: "Email is required" },
        { field: "password", message: "Password is required" },
      ])
    );
  }

  try {
    const query = `
        SELECT * FROM user WHERE email = ?;`;
    const dbUser = await db.get(query, [email]);
    if (dbUser !== undefined) {
      return res.status(409).json(createErrorResponse("User already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO user (email, password) VALUES (?, ?);`;
    await db.run(insertQuery, [email, hashedPassword]);

    res.status(200).json(createSuccessResponse("User Created Successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        createErrorResponse("Internal Server Error", [
          { message: error.message },
        ])
      );
  }
});

// login user (shopkeeper)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `
        SELECT *
        FROM user
        WHERE email = ?;`;
    const dbUser = await db.get(query, [email]);

    if (!dbUser) {
      // email doesnt exist
      return res.status(401).json(createErrorResponse("Invalid Email"));
    } else {
      // check for password
      const isMatch = await bcrypt.compare(password, dbUser.password);
      if (isMatch) {
        const token = jwt.sign(
          { id: dbUser.id, email },
          process.env.JWT_SECRET,
          {
            expiresIn: "24h",
          }
        );
        res.status(200).json({ token });
      } else {
        return res.status(401).json(createErrorResponse("Invalid Password"));
      }
    }
  } catch (error) {
    res
      .status(500)
      .json(
        createErrorResponse("Internal Server Error", [
          { message: error.message },
        ])
      );
  }
});

// Add Customer
app.post("/add", authenticateToken, async (req, res) => {
  const errors = validateCustomer(req.body);
  if (errors.length > 0) {
    return res
      .status(400)
      .json(createErrorResponse("Validation failed", errors));
  }

  const { name, phone, address, trustScore, creditLimit } = req.body;
  const userId = req.user.id; // from the authenticateToken

  const query = `
          INSERT INTO customers(userId, name, phone, address, trustScore, creditLimit)
          VALUES (?, ?, ?, ?, ?, ?);`;
  try {
    await db.run(query, [
      userId,
      name,
      phone,
      address,
      trustScore,
      creditLimit,
    ]);
    res.status(200).json(createSuccessResponse("Customer added successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        createErrorResponse("Internal Server Error", [
          { message: error.message },
        ])
      );
  }
});

// Edit Customer
app.put("/customer/:id", authenticateToken, async (req, res) => {
  const errors = validateCustomer(req.body);
  if (errors.length > 0) {
    return res
      .status(400)
      .json(createErrorResponse("Validation failed", errors));
  }

  const { name, phone, address, trustScore, creditLimit } = req.body;
  const { id } = req.params;

  // fetching customer from customers table
  const customerQuery = `SELECT * FROM customers WHERE id = ?;`;
  const customer = await db.get(customerQuery, [id]);

  if (!customer) {
    return res.status(404).json(createErrorResponse("Customer not found"));
  }

  // checking whether the user has access to modify customer
  if (customer.userId !== req.user.id) {
    return res
      .status(403)
      .json(
        createErrorResponse("You are not authorized to modify this customer")
      );
  }

  const query = `
        UPDATE customers
        SET
          name = ?,
          phone = ?,
          address = ?,
          trustScore = ?,
          creditLimit = ?
        WHERE id = ?;
    `;
  try {
    const dbResponse = await db.run(query, [
      name,
      phone,
      address,
      trustScore,
      creditLimit,
      id,
    ]);
    if (dbResponse.changes === 0) {
      return res.status(404).json(createErrorResponse("Customer not found"));
    }
    return res
      .status(200)
      .json(createSuccessResponse("Customer updated successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        createErrorResponse("Internal Server Error", [
          { message: error.message },
        ])
      );
  }
});

// Delete Customer
app.delete("/customer/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  // fetching customer from customers table
  const customerQuery = `SELECT * FROM customers WHERE id = ?;`;
  const customer = await db.get(customerQuery, [id]);

  if (!customer) {
    return res.status(404).json(createErrorResponse("Customer not found"));
  }

  // checking whether the user has access to modify customer
  if (customer.userId !== req.user.id) {
    return res
      .status(403)
      .json(
        createErrorResponse("You are not authorized to modify this customer")
      );
  }

  const query = `
        DELETE FROM customers
        WHERE id = ?;
    `;
  try {
    const dbResponse = await db.run(query, [id]);
    if (dbResponse.changes === 0) {
      return res.status(404).json(createErrorResponse("Customer not found"));
    }
    res
      .status(200)
      .json(createSuccessResponse("Customer deleted successfully"));
  } catch (error) {
    res.status(500).json(createErrorResponse("Internal Server Error", error));
  }
});

// create a new loan
app.post("/loans", authenticateToken, async (req, res) => {
  const {
    customerId,
    itemDesc,
    amount,
    issueDate,
    dueDate,
    frequency,
    status,
  } = req.body;

  try {
    const errors = loanValidator(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // user-scope
    const userQuery = `
    SELECT customers.*
    FROM user JOIN customers
      ON user.id = customers.userId
    where
      userId = ?
      AND id = ?;
  `;
    const dbResponse = await db.get(userQuery, [req.user.id, customerId]);
    if (!dbResponse) {
      res.status(403).json(createErrorResponse("Unauthorized customer access"));
    }

    const query = `
        INSERT INTO loans (customerId, itemDesc, amount, issueDate, dueDate, frequency, status)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
    await db.run(query, [
      customerId,
      itemDesc,
      amount,
      issueDate,
      dueDate,
      frequency,
      status,
    ]);
    res.status(200).json(createSuccessResponse("Loan created successfully"));
  } catch (error) {
    res.status(500).json(createErrorResponse("Internal Server Error", error));
  }
});

// view all active loans with conditional status
app.get("/loans", authenticateToken, async (req, res) => {
  const { status } = req.query;

  let query = null;
  let dbResponse = null;
  if (status) {
    query = `
    SELECT
      loans.*,
      customers.name AS customerName
    FROM
      loans JOIN customers
      ON loans.customerId = customers.id
    where
      loans.status = ? AND
      customers.userId = ?;
    `;
    dbResponse = await db.all(query, [status, req.user.id]);
  } else {
    query = `
    SELECT
      loans.*,
      customers.name AS customerName
    FROM loans JOIN customers
      ON loans.customerId = customers.id
    where
      customers.userId = ?;
  `;
    dbResponse = await db.all(query, [req.user.id]);
  }
  try {
    res
      .status(200)
      .json(createSuccessResponse("Loans fetched successfully", dbResponse));
  } catch (error) {
    res.status(500).json(createErrorResponse("Internal Server Error", error));
  }
});

// record a payment
app.post("/repayments", authenticateToken, async (req, res) => {
  const { loanId, amount, date } = req.body;

  // basic validation
  if (!loanId || !amount || !date) {
    return res.status(400).json(createErrorResponse("All fields are required"));
  }

  // checking if loanId exists
  const checkLoanIdQuery = `
    SELECT
      id, amount, balance, status
    FROM
      loans
    WHERE
      id = ?;   
  `;
  const dbResponse = await db.get(checkLoanIdQuery, [loanId]);
  if (!dbResponse) {
    return res.status(404).json(createErrorResponse("Loan not found"));
  }

  // checking if loan already paid
  if (dbResponse.balance <= 0) {
    return res.status(400).json(createErrorResponse("Loan already paid"));
  }

  // Overpayment Check
  if (amount > dbResponse.balance) {
    return res.status(400).json(createErrorResponse("Overpayment not allowed"));
  }

  try {
    // recording the repayment
    const repaymentQuery = `
    INSERT INTO repayments (loanId, amount, date)
    VALUES (?, ?, ?);
  `;
    await db.run(repaymentQuery, [loanId, amount, date]);

    // updating the balance in loan table
    const newBalance = dbResponse.balance - amount;
    const newBalanceQuery = `
      UPDATE
        loans
      SET
        balance = ?,
        status = ?
      WHERE
        id = ?;
    `;
    const status = newBalance <= 0 ? "paid" : "pending";
    await db.run(newBalanceQuery, [newBalance, status, loanId]);

    res
      .status(201)
      .json(createSuccessResponse("Payment recorded successfully"));
  } catch (error) {
    res.status(500).json(createErrorResponse("Internal Server Error", error));
  }
});

// summary
app.get("/summary", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  let totalLoaned = null;
  let totalCollected = null;
  let overdueAmount = null;
  let averageDays = null;

  try {
    // total loaned and total collected
    const firstQuery = `
    SELECT
      SUM(loans.amount) AS totalLoaned,
      SUM(repayments.amount) AS totalCollected
    FROM
      ((user JOIN customers
      ON user.id = customers.userId) AS
      a JOIN loans ON a.id = loans.customerId) AS
      c LEFT JOIN repayments ON c.id = repayments.loanId
    WHERE
      user.id = ?
    GROUP BY
      user.id;
    `;
    const dbfirstResponse = await db.get(firstQuery, [userId]);
    totalLoaned = dbfirstResponse.totalLoaned;
    totalCollected = dbfirstResponse.totalCollected;

    // overdue amount
    const secondQuery = `
      SELECT
        SUM(loans.balance) AS overdueAmount
      FROM
        (user JOIN customers
        ON user.id = customers.userId) as
        a JOIN loans ON a.id = loans.customerId
      WHERE
        user.id = ? AND 
        loans.status = 'pending' AND
        DATE(loans.dueDate) < DATE('now')
      GROUP BY
        user.id;
      `;
    const dbSecondResponse = (await db.get(secondQuery, [userId])) || 0;
    overdueAmount = dbSecondResponse.overdueAmount;

    // avg repayment time
    const avgRepaymentQuery = `
      SELECT
        AVG(julianday(repayments.date) - julianday(loans.issueDate)) AS avgRepaymentDays
      FROM user
        JOIN customers ON user.id = customers.userId
        JOIN loans ON customers.id = loans.customerId
        JOIN repayments ON loans.id = repayments.loanId
        WHERE user.id = ?;
      `;
    const avgRepaymentResponse = await db.get(avgRepaymentQuery, [req.user.id]);
    averageDays = avgRepaymentResponse.avgRepaymentDays;

    res.status(200).json(
      createSuccessResponse("Summary fetched successfully", {
        totalLoaned,
        totalCollected,
        overdueAmount,
        averageDays,
      })
    );
  } catch (error) {
    res.status(500).json(createErrorResponse("Internal Server Error", error));
  }
});

// list of customers with overdue loans
app.get("/overdue", authenticateToken, async (req, res) => {
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    const query = `
    SELECT
      customers.name,
      loans.issueDate,
      loans.balance
    FROM
      loans JOIN customers ON
      customers.id = loans.customerId
    WHERE
      loans.balance > 0 AND
      loans.dueDate < ?;
  `;
    const dbResponse = await db.all(query, [today]);
    return res
      .status(200)
      .json(
        createSuccessResponse("Overdue loans fetched successfully", dbResponse)
      );
  } catch (error) {
    return res
      .status(500)
      .json(createErrorResponse("Internal Server Error", error));
  }
});
