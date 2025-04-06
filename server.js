const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
stripe.accounts.retrieve().then(console.log).catch(console.error)
// Middleware
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } })); // Parse JSON request body
app.use(cors()); // Enable CORS for all routes
app.use(express.static(__dirname));



// Create Payment Intent Route
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    let { amount } = req.body;
    console.log("totalAmount", amount)
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }
    amount = parseFloat(amount.toFixed(2));
    console.log("final amount", amount)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "aed",
      automatic_payment_methods: { enabled: true },
    });
    console.log("clientSecret", paymentIntent.client_secret)
    res.status(200).json({ message: "payment successfull", clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/send-confirmation-email", async (req, res) => {
  const { email, bookingDetails: { roomName, checkinDate, checkoutDate, roomQuantity, unitPrice, userName } } = req.body;
  console.log("send-confirmation-email", req.body);
  let { totalAmount } = req.body.bookingDetails;
  totalAmount = Number(totalAmount); 
  totalAmount = parseFloat(totalAmount.toFixed(2));
  console.log("totalAmount", totalAmount);
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    console.log("Zoho User:", process.env.EMAIL_USER);
    console.log("Zoho Pass:", process.env.EMAIL_PASS ? "Loaded" : "Missing");
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🏨 Booking Confirmation ✔",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #2c3e50; text-align: center;">🏨 Booking Confirmation</h2>
          <p style="font-size: 16px; color: #555;">Dear Guest,</p>
          <p style="font-size: 16px; color: #555;">Your booking for <strong>${roomName}</strong> has been confirmed.</p>
    
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Check-in:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(checkinDate).toDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Check-out:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(checkoutDate).toDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Total Price:</strong></td>
              <td style="padding: 10px;">AED ${totalAmount}</td>
            </tr>
          </table>
    
          <p style="font-size: 16px; color: #555; margin-top: 20px;">Thank you for choosing us! We look forward to your stay.</p>
        </div>
      `,
    };

    const mailOptionsForTheOwner = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "📌 New Booking Alert ✔",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #2c3e50; text-align: center;">📌 New Booking Alert</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Guest Email:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Room:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${roomName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Check-in:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(checkinDate).toDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Check-out:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(checkoutDate).toDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Total Price:</strong></td>
              <td style="padding: 10px;">AED ${totalAmount}</td>
            </tr>
          </table>
    
          <hr style="margin: 20px 0;">
          <p style="font-size: 14px; color: #888;">This is an internal confirmation email for record-keeping.</p>
        </div>
      `,
    };

    const generateInvoiceNumber = () => {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // Format YYYYMMDD
      const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      return `INV-${datePart}-${randomPart}`;
    };

    const invoiceNumber = generateInvoiceNumber();
    const invoiceMailForTheOwner = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "📌 Invoice ✔",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          
          <!-- Header with Hotel Name and Invoice -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
            <img src="https://freelance-backend-1-51yh.onrender.com/logo.jpg" alt="The Great Wall Hotel Logo" style="height: 50px;">
            <div>
              <h2 style="color: #2c3e50; margin: 0;">THE GREAT WALL HOTEL</h2>
              <p style="margin: 0; font-size: 10px;">Meet All Your Needs</p>
            </div>
          </div>

            <h2 style="color: #2c3e50; margin: 0;">INVOICE</h2>
          </div>
    
          <h5>${userName}</h5>
    
          <div style="background-color: #d1e7dd; padding: 10px; margin-top: 10px;">
            <p><strong>Date:</strong> ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" })}</p>
            <p><strong>Check-in Date:</strong> ${new Date(checkinDate).toDateString()}</p>
            <p><strong>Check-out Date:</strong> ${new Date(checkoutDate).toDateString()}</p>
            <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
          </div>
    
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ddd;">
            <thead style="background-color: #f8f9fa;">
              <tr>
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Quantity</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${roomName}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${roomQuantity}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${unitPrice}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${totalAmount}</td>
              </tr>
            </tbody>
          </table>
    
          <div style="text-align: right; margin-top: 20px;">
            <h6><strong>Subtotal:</strong> ${totalAmount}</h6>
            <h6 style="margin-top:10px"><strong>Tax:</strong> 0</h6>
            <hr style="border: 1px solid #ddd; margin: 10px 0;">
            <h5 style="font-weight: bold; margin-top: 10px;">Total: ${totalAmount}</h5>
          </div>

          <!-- Message with adjusted width and alignment -->
          <div style="background-color: #91cbbb; padding: 5px 15px; margin-top: 20px; display: inline-block; border-radius: 5px;">
            <p style="font-size: 14px; color: black; margin: 0;">We hope you had a great stay</p>
          </div>

          <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
           This is a computer-generated invoice and does not require a signature.
          </p>
          <div style="width: 95%; background-color: #91cbbb; padding: 15px; text-align: center; color: white; margin-top: 10px;">
  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; max-width: 1200px; margin: 0 auto;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span>📞</span>
      <span>+9156889909</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <span>✉️</span>
      <span>info@thegreatwallhotel.com</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; text-align: center; max-width: 200px;">
      <span>📍</span>
      <span style="word-wrap: break-word;">Dubai International City, Dubai, UAE</span>
    </div>
  </div>
</div>

      `,
    };
    const invoiceMailForTheCustomer = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "📌 Invoice ✔",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          
          <!-- Header with Hotel Name and Invoice -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
            <img src="https://freelance-backend-1-51yh.onrender.com/logo.jpg" alt="The Great Wall Hotel Logo" style="height: 50px;">
            <div>
              <h2 style="color: #2c3e50; margin: 0;">THE GREAT WALL HOTEL</h2>
              <p style="margin: 0; font-size: 10px;">Meet All Your Needs</p>
            </div>
          </div>

            <h2 style="color: #2c3e50; margin: 0;">INVOICE</h2>
          </div>
    
          <h5>${userName}</h5>
    
          <div style="background-color: #d1e7dd; padding: 10px; margin-top: 10px;">
            <p><strong>Date:</strong> ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" })}</p>
            <p><strong>Check-in Date:</strong> ${new Date(checkinDate).toDateString()}</p>
            <p><strong>Check-out Date:</strong> ${new Date(checkoutDate).toDateString()}</p>
            <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
          </div>
    
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ddd;">
            <thead style="background-color: #f8f9fa;">
              <tr>
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Quantity</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${roomName}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${roomQuantity}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${unitPrice}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${totalAmount}</td>
              </tr>
            </tbody>
          </table>
    
          <div style="text-align: right; margin-top: 20px;">
            <h6><strong>Subtotal:</strong> ${totalAmount}</h6>
            <h6 style="margin-top:10px"><strong>Tax:</strong> 0</h6>
            <hr style="border: 1px solid #ddd; margin: 10px 0;">
            <h5 style="font-weight: bold; margin-top: 10px;">Total: ${totalAmount}</h5>
          </div>

          <!-- Message with adjusted width and alignment -->
          <div style="background-color: #91cbbb; padding: 5px 15px; margin-top: 20px; display: inline-block; border-radius: 5px;">
            <p style="font-size: 14px; color: black; margin: 0;">We hope you had a great stay</p>
          </div>

          <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
           This is a computer-generated invoice and does not require a signature.
          </p>
          <div style="width: 95%; background-color: #91cbbb; padding: 15px; text-align: center; color: white; margin-top: 10px;">
  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; max-width: 1200px; margin: 0 auto;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span>📞</span>
      <span>+9156889909</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <span>✉️</span>
      <span>info@thegreatwallhotel.com</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; text-align: center; max-width: 200px;">
      <span>📍</span>
      <span style="word-wrap: break-word;">Dubai International City, Dubai, UAE</span>
    </div>
  </div>
</div>

      `,
    };




    await transporter.sendMail(mailOptions);
    await transporter.sendMail(mailOptionsForTheOwner);
    await transporter.sendMail(invoiceMailForTheOwner);
    await transporter.sendMail(invoiceMailForTheCustomer);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Email sending failed:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});


// Root Route
app.get("/", (req, res) => {
  res.send("Stripe Payment API is running 🚀");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});