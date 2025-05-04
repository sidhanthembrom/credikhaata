Credikhaata - Loan Tracker for Shopkeepers

- It is a backend service designed to help local and small business owners track goods sold on credit. It provides an easy-to-use API to manage customers, loans, repayments, and overdue tracking — all stored in a lightweight SQLite database.
- It uses a database which is accessed by SQLite and has 4 tables in it namely - user, customers, loans, repayments.

To run the project locally :-

- git clone https://github.com/sidhanthembrom/credikhaata.git
- cd credikhaata
- npm install
- node index.js

Database Schema -

- Visual representation -
  -> A user will have multiple customers.
  -> A customer will have multiple loans.
  -> A loan will have multiple repayments.
- I already have some dummy data present in the database.
- All user-routes are user-scoped and used a middleWare for authenticating token.

Features :-

- User registration and login with JWT-based authentication
- Secure password hashing with bcrypt
- Add, edit, and delete customers
- Create and view loans with due dates and statuses
- Record partial or full repayments
- Track loan summaries and overdue reports

Dependecies Used :-

- bcryptjs
- date-fns
- dotenv
- express
- jsonwebtoken
- nodemon
- sqlite
- sqlite3
- validator

API Endpoints and their functionality -

- "/register" -
  -> POST method.
  -> It helps the user (shopkeeper) to register via email and password.
  -> Checks the email if taken, creates a hash password via bcrypt.hash() and stores it in the user table.
  -> Successs Response - "User created successfully"
  -> Error Response - "Internal Server Error"
  -> DEMO API CALL -
  {
  "email": "user@example.com",
  "password": "password123"
  }

- "/login" -
  -> POST method.
  -> It helps the user (shopkeeper) to login via email and password.
  -> Checks whether the email exists, checks the password via bcrypt.compare() from the user table.
  -> Generates a JWT Token (token) via jwt.sign() which is valid for 24 hours.
  -> Successs Response - JWT token generation
  -> Error Response - "Internal Server Error"
  -> DEMO API CALL -
  {
  "email": "user@example.com",
  "password": "password123"
  }

- "/add" -
  -> POST method
  -> The data is being validated by validateCustomer().
  -> This API is used to add the customer to the customers table.
  -> Successs Response - "Customer added successfully"
  -> Error Response - "Internal Server Error"
  -> DEMO API CALL -
  {
  "name": "Ravi Kumar",
  "phone": "9876543210",
  "address": "Bhubaneswar, Odisha",
  "trustScore": 8,
  "creditLimit": 20000
  }

- "/customer/:id" -
  -> PUT method.
  -> The data is being validated by validateCustomer().
  -> This API is used to edit the details of the customers.
  -> Successs Response - "Customer updated successfully"
  -> Error Response - "Internal Server Error"
  -> DEMO API CALL -
  {
  "name": "Ravi Kumar",
  "phone": "9876543210",
  "address": "Bhubaneswar, Odisha",
  "trustScore": 8,
  "creditLimit": 20000
  }

- "/customer/:id" -
  -> DELETE method.
  -> This API is used to delete a customer by the user after their work is over.
  -> Successs Response - "Customer deleted successfully"
  -> Error Response - "Internal Server Error"

- "/loans" -
  -> POST method.
  -> This API is used to create new loans by making a query through SQL and keep it in loan table.
  -> Successs Response - "Loan created successfully"
  -> Error Response - "Internal Server Error"
  -> DEMO API CALL -
  {
  "customerId": 1,
  "itemDesc": "Mobile Phone",
  "amount": 15000,
  "issueDate": "2025-05-05",
  "dueDate": "2025-08-05",
  "frequency": "monthly",
  "status": "pending",
  "balance": 15000
  }

- "/loans" -
  -> GET method.
  -> This API is used to view all active loans.
  -> It has conditional rendering where in if you pass status - "pending", "paid", "overdue" through query parameter.
  -> Successs Response - "Loans fetched successfully"
  -> Error Response - "Internal Server Error"

- "/repayments" -
  -> POST method
  -> This API is used to record a repayment of a loan as in repayments table, track partial payments.
  -> Updates the status according to the repayment and the balance is dynamically calculated and kept in the loan table.
  -> Successs Response - "Payment recorded successfully"
  -> Error Response - "Internal Server Error"
  -> DEMO API CALL -
  {
  "loanId" : 1,
  "amount" : 5000,
  "date" : "2024-04-10"
  }

- "/summary" -
  -> GET method.
  -> authenticateToken()
  -> This API is used to get the total loans given, total collected, overdueAmount, average repayment time by the customer.
  -> Successs Response - "Loan created successfully"
  -> Error Response - "Internal Server Error"

- "/overdue" -
  -> GET method.
  -> This API is used to fetch list of customers with overdue loans
  -> Success Response - "Overdue loans fetched successfully"
  -> Error Response - "Internal Server Error"

NOTE :-
-> LOGIN DETAILS -

- email - user@example.com
- password - password123

-> createSuccessResponse(), createErrorResponse() - These two functions have been created inorder to make the responses and error handling efficient and standardize.

-> validateCustomer(), loanValidator() - These are created to validate data and store the errors in an array and return all the errors at the end.
