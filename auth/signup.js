const express = require("express");
const bcrypt = require("bcryptjs");
const { MailtrapClient } = require("mailtrap");
const crypto = require("crypto");

const User = require("../models/user"); // Main user model
const router = express.Router();

// Mailtrap setup
const TOKEN = "f0f1e8442010950d2c90e4e048705a7b"; // Replace with your Mailtrap token
const client = new MailtrapClient({ token: TOKEN });

const sender = {
  email: "hello@yourdomain.com",
  name: "Your App",
};

// Temporary storage for unverified users
const unverifiedUsers = new Map(); // Use an in-memory Map for simplicity (not suitable for production)

// Signup route
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send("Email already in use");
  }

  // Generate a 5-digit verification code
  const verificationCode = crypto.randomInt(10000, 99999).toString();

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store user details temporarily
  unverifiedUsers.set(email, { name, email, password: hashedPassword, verificationCode });

  // Send the verification email
  const recipients = [{ email }];
  try {
    await client.send({
      from: sender,
      to: recipients,
      subject: "Email Verification",
      text: `Your verification code is: ${verificationCode}`,
      category: "Email Verification",
    });
    res.status(200).send("Verification email sent.");
  } catch (error) {
    console.error("Failed to send email:", error);
    unverifiedUsers.delete(email); // Remove from temporary storage
    res.status(500).send("Failed to send verification email.");
  }
});

// Verification route
router.post("/verify", async (req, res) => {
  const { email, verificationCode } = req.body;

  // Check if the email exists in the temporary storage
  const userData = unverifiedUsers.get(email);
  if (!userData) {
    return res.status(400).send("Invalid or expired verification request.");
  }

  // Verify the code
  if (userData.verificationCode !== verificationCode) {
    return res.status(400).send("Invalid verification code.");
  }

  // Create the user in the main database
  const newUser = new User({
    name: userData.name,
    email: userData.email,
    password: userData.password,
  });
  await newUser.save();

  // Remove the user from temporary storage
  unverifiedUsers.delete(email);

  res.status(201).send("User verified and created successfully.");
});

module.exports = router;
