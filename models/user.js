const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema(
  {
    // Email field, must be unique
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    
    // Password field, should be required and stored as a hashed value
    password: { 
      type: String, 
      required: true 
    },

    // Optional field for user name
    name: { 
      type: String, 
      required: false, 
      trim: true 
    },

    // Optional field for user role, e.g., admin or user
    role: { 
      type: String, 
      enum: ['user', 'admin'], 
      default: 'user' 
    },

    // Timestamps for user creation and updates
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  {
    // Automatically create timestamps for when documents are created/updated
    timestamps: true
  }
);

// Create a model using the user schema
const User = mongoose.model('User', userSchema);

// Export the model to be used in other files
module.exports = User;
