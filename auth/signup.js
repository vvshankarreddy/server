const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Path to your User model

const router = express.Router();

// Signup route
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Email already in use');
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name, // Include name in the User model
    email,
    password: hashedPassword,
  });

  try {
    await user.save();
    res.status(201).send('User created successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
});

module.exports = router;
