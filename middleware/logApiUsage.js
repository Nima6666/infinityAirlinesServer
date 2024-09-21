// Custom Middleware to log api requested path and api usage

const fs = require("fs");
const path = require("path");

// Ensure logs folder exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Middleware to log basic API request data to a file (e.g., HTTP method, URL, IP)
module.exports.logApiRequest = (req, res, next) => {
  const log = `${new Date().toISOString()} - ${req.method} ${
    req.originalUrl
  } - ${req.ip}\n`;

  // Append the log synchronously to the api_request.log file
  try {
    fs.appendFileSync(path.join(logsDir, "api_request.log"), log);
  } catch (err) {
    console.error("Failed to write API request log:", err);
  }

  next();
};

// Path to the api_usage.log file
const logFilePath = path.join(logsDir, "api_usage.log");

// Function to append log details synchronously to the file
const logToFileSync = (logDetails) => {
  const logEntry = JSON.stringify(logDetails) + "\n";

  // Append the log entry synchronously to the log file
  try {
    fs.appendFileSync(logFilePath, logEntry);
  } catch (err) {
    console.error("Failed to write API usage log:", err);
  }
};

// Middleware to log detailed API usage (response time, status code, etc.)
module.exports.logApiUsage = (req, res, next) => {
  const startTime = Date.now(); // Start timing the request

  // When the response finishes, log the details
  res.on("finish", () => {
    const duration = Date.now() - startTime; // Calculate how long the request took
    const logDetails = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ip: req.ip, // Optionally log the user's IP address
    };

    // Write log details synchronously to the file
    logToFileSync(logDetails);
  });

  next(); // Call the next middleware or route handler
};
