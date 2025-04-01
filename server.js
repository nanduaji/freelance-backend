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




// Create Payment Intent Route
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;
    console.log("amount",amount)
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, 
      currency: "aed",
      automatic_payment_methods: { enabled: true },
    });
    console.log("clientSecret",paymentIntent.client_secret)
    res.status(200).json({ message:"payment successfull",clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/send-confirmation-email", async (req, res) => {
  const { email, bookingDetails:{roomName, checkinDate, checkoutDate, totalPrice} } = req.body;
console.log("send-confirmation-email",req.body)
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
              <td style="padding: 10px;">AED ${totalPrice}</td>
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
              <td style="padding: 10px;">AED ${totalPrice}</td>
            </tr>
          </table>
    
          <hr style="margin: 20px 0;">
          <p style="font-size: 14px; color: #888;">This is an internal confirmation email for record-keeping.</p>
        </div>
      `,
    };
    
    

    await transporter.sendMail(mailOptions);
    await transporter.sendMail(mailOptionsForTheOwner);

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