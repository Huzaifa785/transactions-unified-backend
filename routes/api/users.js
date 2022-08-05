const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const creds = require("../../config/creds");

const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

const User = require("../../models/User");

router.post("/register", async (req, res) => {
  try {
    const { errors, isValid } = validateRegisterInput(req.body);

    // Check validation
    if (!isValid) {
      return res.status(400).json(errors);
    }

    // Check if user exists
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    }

    // If does not exist, create new user
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });

    // Hashing password before saving in database
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    await newUser.save();
    res.status(200).json(newUser);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    // Form validation
    const { errors, isValid } = validateLoginInput(req.body);
    // Check validation
    if (!isValid) {
      return res.status(400).json(errors);
    }
    const email = req.body.email;
    const password = req.body.password;
    // Find user by email
    const user = await User.findOne({ email });
    // Check if user exists
    if (!user) {
      return res
        .status(404)
        .json({ emailnotfound: "User not found in our database!!" });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ passwordincorrect: "Password incorrect" });
    }
    // Return jsonwebtoken
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    jwt.sign(
      payload,
      creds.secretOrKey,
      {
        expiresIn: 31556926, // 1 year in seconds
      },
      (err, token) => {
        res.json({
          success: true,
          token: "Bearer " + token,
          name: user.name,
        });
      }
    );
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Server error" });
  }
});

module.exports = router;
