const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
stripe.accounts.retrieve().then(console.log).catch(console.error)
// Middleware
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } })); // Parse JSON request body
app.use(
  cors({
    origin: "https://freelance-sage-two.vercel.app", // ✅ No trailing slash
    methods: ["GET", "POST"], // ✅ Use array format
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ Use array format
  })
);




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
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
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