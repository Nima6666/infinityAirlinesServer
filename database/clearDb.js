const { default: mongoose } = require("mongoose");
const User = require("../model/user");
const Payment = require("../model/payment");

mongoose
  .connect("mongodb+srv://nima:2367@cluster0.qmmq6cq.mongodb.net/assignmentME")
  .then(() => {
    console.log("Connected to Database");
    (async () => {
      try {
        await User.deleteMany({});
        await Payment.deleteMany({});
        console.log("All users and paymentt deleted.");
      } catch (error) {
        console.error("Error deleting users:", error);
      } finally {
        process.exit(); // Terminates the Node.js process
      }
    })();
  });
