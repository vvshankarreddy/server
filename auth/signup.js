// auth/signup.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');  // Path to your User model

const router = express.Router();

// Signup route
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send("Email already in use");
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashedPassword,
  });

  await user.save();

  res.status(201).send("User created successfully.");
});

module.exports = router;
