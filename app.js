const express = require("express");
const app = express();
const port = 3434;

const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const apiLogger = require("./middleware/logApiUsage");

// Middlewares
app.use(morgan("dev"));
app.use(apiLogger.logApiRequest); // logs api requests .
app.use(apiLogger.logApiUsage); // logs api usage .

app.use(cors());
app.use(express.json());

// Database Connection
require("./database/dbConnection");

// Routes
const packageRoute = require("./routes/packageRoute");
const userRoute = require("./routes/userRoute");
const paymentRoute = require("./routes/paymentRoute");
const googleOauthRoute = require("./routes/googleRegistrationRoute");

app.use("/packages", packageRoute);
app.use("/users", userRoute);
app.use("/payment", paymentRoute);
app.use("/googleoauth", googleOauthRoute);

// Starting Server
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
