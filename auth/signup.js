const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Path to your User model
const { MailtrapClient } = require("mailtrap");

const router = express.Router();

// Mailtrap setup
const TOKEN = "f0f1e8442010950d2c90e4e048705a7b"; // Replace with your Mailtrap API token
const client = new MailtrapClient({ token: TOKEN });
const sender = {
  email: "hello@vesarecine.xyz", // Replace with your Mailtrap verified sender email
  name: "Email verification", // Replace with your app name
};

// Temporary storage for unverified users
const unverifiedUsers = {};

// Signup route
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // Check if the user already exists in the database
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Email already in use');
  }

  // Check if the email is already in the unverified users list
  if (unverifiedUsers[email]) {
    return res.status(400).send('Email verification is pending. Please verify.');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a 5-digit verification code
  const verificationCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code

  // Store the unverified user in memory
  unverifiedUsers[email] = {
    name,
    email,
    password: hashedPassword,
    verificationCode,
  };

  try {
    // Send verification email
    const recipients = [{ email }];
    await client.send({
      from: sender,
      to: recipients,
      subject: "Verify your email address",
      text: `Welcome, ${name}! Your verification code is: ${verificationCode}`,
    });

    res.status(200).send('Verification code sent to your email.');
  } catch (error) {
    console.error(error);
    delete unverifiedUsers[email]; // Remove from temporary storage in case of failure
    res.status(500).send('Server error. Please try again later.');
  }
});

// Email verification route
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  // Check if email and code are provided
  if (!email || !code) {
    return res.status(400).send('Email and verification code are required');
  }

  // Retrieve the user from the unverified users list
  const unverifiedUser = unverifiedUsers[email];

  if (!unverifiedUser) {
    return res.status(404).send('No unverified user found with this email.');
  }

  // Check if the code matches
  if (unverifiedUser.verificationCode === code) {
    try {
      // Create and save the user in the database
      const newUser = new User({
        name: unverifiedUser.name,
        email: unverifiedUser.email,
        password: unverifiedUser.password,
      });
      await newUser.save();

      // Remove the user from temporary storage
      delete unverifiedUsers[email];

      res.status(200).send('Email verified successfully. User created.');
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error. Please try again later.');
    }
  } else {
    res.status(400).send('Invalid verification code.');
  }
});

module.exports = router;
