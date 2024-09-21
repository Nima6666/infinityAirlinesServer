const expressAsyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const PaymentModel = require("../model/payment");
const PackageModel = require("../model/package");

// initializing stripe
const stripe = require("stripe")(process.env.STRIPE_SEC_KEY);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

async function generateAndSendInvoice(paymentDetails) {
  return new Promise((resolve, reject) => {
    let success = false;
    let filePath = path.join(__dirname, "../bills_generated", "bill.pdf");
    let error = null;

    // Generate PDF
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Invoice / Bill", { align: "center" });
    doc.moveDown();

    // User info header
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Customer Information", { underline: true });
    doc.moveDown();

    // User info
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Name: ${paymentDetails.user_id.name}`);
    doc.text(`Email: ${paymentDetails.user_id.email}`);
    doc.text(`Invoice Date: ${paymentDetails.created.toDateString()}`);
    doc.text(`Invoice ID: ${paymentDetails._id}`);

    doc.moveDown();

    // Product info header
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Product Information", { underline: true });
    doc.moveDown();

    // Product info
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Product: ${paymentDetails.product.service_name}`);
    doc.text(`Description: ${paymentDetails.product.package_details}`);
    doc.text(`Quantity: ${paymentDetails.quantity}`);
    doc.text(`Price (per item): $${paymentDetails.product.price}`);
    doc.text(`Total: $${paymentDetails.total}`);

    // Payment status
    doc.moveDown();
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(
        `Payment Status: ${
          paymentDetails.paymentSuccess ? "Successful" : "Failed"
        }`
      );

    doc.text(`Payment Session ID: ${paymentDetails.paymentSession}`);

    // Footer
    doc.moveDown();

    doc
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text(
        `Please reply this mail with your documents for further processing`,
        { align: " center" }
      );

    doc.moveDown();

    doc
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text("Thank you for your business!", { align: "center" });

    // Finalize PDF creation
    doc.end();

    // Wait for the write stream to finish
    writeStream.on("finish", async () => {
      console.log("PDF generation finished");

      const mailOptions = {
        from: process.env.EMAIL, // Sender address
        to: paymentDetails.user_id.email, // Receiver address (customer)
        subject: "Your Invoice / Bill",
        text: "Please find attached your invoice.",
        attachments: [
          {
            filename: "bill.pdf",
            path: filePath, // Path to the generated PDF
          },
        ],
      };

      try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        success = true;
      } catch (err) {
        error = err;
        console.error("Error sending email:", error);
      } finally {
        console.log("PDF sent");

        // Clean up (delete the generated PDF file after sending)

        // Resolve the promise
        resolve({ success, error, filePath });
      }
    });

    writeStream.on("error", (writeError) => {
      console.error("Error writing PDF:", writeError);
      reject(writeError);
    });

    // Listen for errors in PDF generation
    doc.on("error", (pdfError) => {
      console.error("Error generating PDF:", pdfError);
      reject(pdfError);
    });
  });
}

// creating strype payment session
module.exports.createStripeSession = expressAsyncHandler(async (req, res) => {
  const package = req.body;

  const { userId } = req.headers.authData; // getting userId from token payload on user authentication

  const packageFound = await PackageModel.findById(package.packageDetails._id);

  if (packageFound) {
    const item = {
      price_data: {
        currency: "usd",
        product_data: {
          name: packageFound.service_name,
        },
        unit_amount: packageFound.price * 100,
      },
      quantity: package.quantity,
    };

    const payment = new PaymentModel({
      product: packageFound._id,
      quantity: package.quantity,
      total: package.quantity * packageFound.price,
      user_id: userId,
    });
    await payment.save();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [item],
      mode: "payment",
      success_url: `${process.env.CLIENT_ORIGIN}/payment/success?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment._id}`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/payment/cancel`,
    });

    payment.paymentSession = session.id;
    await payment.save();

    res.json({ success: true, id: session.id });
  } else {
    res.status(404).json({
      message: "Requested Package Not Found",
    });
  }
});

// verifying payment using stripe session id
module.exports.verifyStripeSession = expressAsyncHandler(async (req, res) => {
  const { sessionId, paymentId } = req.params;

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const userPayment = await PaymentModel.findById(paymentId).populate([
      "user_id",
      "product",
    ]);

    userPayment.completed = true;
    await userPayment.save();

    console.log("verification session ", session.payment_status);
    if (session.payment_status === "paid") {
      userPayment.paymentSuccess = true;
      await userPayment.save();

      const { success, error, filePath } = await generateAndSendInvoice(
        userPayment
      );

      console.log("callback ", success, error, filePath);

      if (error) {
        return res.json({
          success: true,
          message: "Success! Bill Sending Failed",
        });
      }

      if (success) {
        return res.json({
          success: true,
          message: "Success! Bill develered to Your mail.",
          filePath,
        });
      } else {
        res.json({ success: true, message: "Payment verified successfully." });
      }
    } else {
      res.json({ success: false, message: "Payment not completed." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment.",
      error: err.message,
    });
  }
});

// getting user payment details
module.exports.getUserPayments = expressAsyncHandler(async (req, res) => {
  const { userId } = req.headers.authData; // getting userId from token payload on user authentication

  // deleting incomplete payments
  const incompletedPayments = await PaymentModel.deleteMany({
    completed: false,
  });

  console.log(
    "deleted incompleted payments count: ",
    incompletedPayments.deletedCount
  );

  const payments = await PaymentModel.find({
    user_id: userId,
    completed: true,
  })
    .populate(["user_id", "product"])
    .select("-user_id.password") // Exclude the password field from user_id
    .sort("-created"); // Sort by created field in descending order

  res.json({
    success: true,
    payments,
  });
});
