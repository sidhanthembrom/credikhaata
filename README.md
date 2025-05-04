Credikhaata -

- Build a backend which will help local and small business owners to keep a record of goods that they have sold to known customers on credit.
- This will help the storeowners keep the records all in digital form.
- It used a database which is controlled by SQLite and has 4 tables in it namely - user, customers, loans, repayments.
- Visual representation -
  -> A user will have multiple customers.
  -> A customer will have multiple loans.
  -> A loan will have multiple repayments.
- LOGIN DETAILS -
  -> email - user@example.com
  -> password - password123
- I already have some dummy data present in the database.
- All user-routes are user-scoped and used a middleWare for authenticating token.
- For any more information, please see the schema of the tables in the database.

To run the project locally :-

- download the project from github
- npm install
- node index.js

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

APIs Endpoints and their functionality -

- "/register" -
  -> POST method.
  -> It helps the user (shopkeeper) to register via email and password.
  -> Checks the email if taken, creates a hash password via bcrypt.hash() and stores it in the user table.
  -> Successs Response - "User created successfully"
  -> Error Response - "Internal Server Error"

- "/login" -
  -> POST method.
  -> It helps the user (shopkeeper) to login via email and password.
  -> Checks whether the email exists, checks the password via bcrypt.compare() from the user table.
  -> Generates a JWT Token (token) via jwt.sign() which is valid for 24 hours.
  -> req.body - email (TEXT), password (TEXT)
  -> Successs Response - JWT token generation
  -> Error Response - "Internal Server Error"

- "/add" -
  -> POST method
  -> The data is being validated by validateCustomer().
  -> This API is used to add the customer to the customers table.
  -> req.body - name (TEXT), phone (TEXT), address(TEXT), trustScore (INTEGER), creditLimit (REAL)
  -> Successs Response - "Customer added successfully"
  -> Error Response - "Internal Server Error"

- "/customer/:id" -
  -> PUT method.
  -> The data is being validated by validateCustomer().
  -> This API is used to edit the details of the customers.
  -> Successs Response - "Customer updated successfully"
  -> Error Response - "Internal Server Error"

- "/customer/:id" -
  -> DELETE method.
  -> This API is used to delete a customer by the user after their work is over.
  -> Successs Response - "Customer deleted successfully"
  -> Error Response - "Internal Server Error"

- "/loans" -
  -> POST method.
  -> This API is used to create new loans by making a query through SQL and keep it in loan table.
  -> req.body - customerId (INTEGER), itemDesc (TEXT), amount (INTEGER), issueDate(TEXT), dueDate (TEXT), frequency (TEXT), status(TEXT)
  -> Successs Response - "Loan created successfully"
  -> Error Response - "Internal Server Error"

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
  -> req.body - loanId (INTEGER), amount (INTEGER), date(TEXT)
  -> Successs Response - "Payment recorded successfully"
  -> Error Response - "Internal Server Error"

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
-> createSuccessResponse(), createErrorResponse() - These two functions have been created inorder to make the responses and error handling efficient and standardize.

-> validateCustomer(), loanValidator() - These are created to validate data and store the errors in an array and return all the errors at the end.
