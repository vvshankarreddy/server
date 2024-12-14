const express = require('express');
const cors = require('cors');  // Import CORS properly as a function
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Path to your User model
const { MailtrapClient } = require("mailtrap");

const app = express();

// Enable CORS for all origins (this must be invoked as a function)
app.use(cors());  // Correctly using cors() as a function

// Parse JSON bodies
app.use(express.json());

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
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('Email already in use');
    }

    if (unverifiedUsers[email]) {
      return res.status(400).send('Email verification is pending. Please verify.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(10000 + Math.random() * 90000);

    unverifiedUsers[email] = { name, email, password: hashedPassword, verificationCode };

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
    if (unverifiedUsers[email]) {
      delete unverifiedUsers[email];
    }
    res.status(500).send('Server error. Please try again later.');
  }
});

// Email verification route
app.post('/signup/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).send('Email and verification code are required');
  }

  const unverifiedUser = unverifiedUsers[email];

  if (!unverifiedUser) {
    return res.status(404).send('No unverified user found with this email.');
  }

  if (unverifiedUser.verificationCode === code) {
    try {
      const newUser = new User({
        name: unverifiedUser.name,
        email: unverifiedUser.email,
        password: unverifiedUser.password,
      });
      await newUser.save();
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
