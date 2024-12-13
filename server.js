const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Serve the HTML file for health check
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.log("Failed to connect to MongoDB", err);
});

// Health check endpoint
app.get('/health-check', async (req, res) => {
  try {
    // Check if the server is running and if the database is connected
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'not connected';
    res.json({ server: 'up', database: dbStatus });
  } catch (error) {
    res.json({ server: 'down', database: 'not connected' });
  }
});

// Signup route (example route)
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    password: String,
  }));

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).send("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashedPassword,
  });

  await user.save();

  res.status(201).send("User created successfully.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
