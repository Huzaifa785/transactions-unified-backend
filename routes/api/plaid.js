const express = require("express");
const plaid = require("plaid");
const router = express.Router();
const passport = require("passport");
const moment = require("moment");
const mongoose = require("mongoose");
// Load Account and User models
const Account = require("../../models/Account");
const User = require("../../models/User");

const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const client = new PlaidApi(configuration);

// Create a link token
router.post("/create_link_token", async (req, res) => {
  const LinkTokenCreateRequest = {
    user: {
      client_user_id: process.env.PLAID_CLIENT_ID,
    },
    client_name: "Transactions Unified",
    products: ["transactions"],
    country_codes: ["CA"],
    language: "en",
    // redirect_uri: "http://localhost:3000/banks",
  };
  try {
    const createTokenResponse = await client.linkTokenCreate(
      LinkTokenCreateRequest
    );
    res.json(createTokenResponse.data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// Exchange a public token for an access token and add the account
router.post(
  "/accounts/add",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const publicToken = req.body.public_token;
    const userId = req.user.id;
    const institution = req.body.metadata.institution;
    const { name, institution_id } = institution;
    try {
      const response = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      const accessToken = response.data.access_token;
      const itemID = response.data.item_id;
      // Check if account already exists for specific user
      const account = await Account.findOne({
        userId: req.user.id,
        institutionId: institution_id,
      });

      const user = await User.findById(userId);

      if (account) {
        console.log("Account already exists");
      } else {
        const newAccount = new Account({
          userId: userId,
          userName: user.name,
          accessToken: accessToken,
          itemId: itemID,
          institutionId: institution_id,
          institutionName: name,
        });
        await newAccount.save();
        res.status(200).json({
          message: "Account added successfully",
        });
        console.log("Account added successfully");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// Fetching all accounts
router.get(
  "/accounts",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const accounts = await Account.find({ userId: req.user.id });
      if (accounts) {
        res.json(accounts);
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// Deleting a account
router.delete(
  "/accounts/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const account = await Account.findById(req.params.id);
      if (account) {
        // Delete account
        await account.remove();
        res.json({ success: true });
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// Fetching Transactions
router.get(
  "/accounts/transactions",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      let account = await Account.findOne({ userId: req.user.id });
      let user = await Account.findOne({ userId: req.user.id });
      // fetch transactions for the access token
      const response = await client.transactionsGet({
        access_token: account.accessToken,
        start_date: moment().subtract(5, "years").format("YYYY-MM-DD"),
        end_date: moment().format("YYYY-MM-DD"),
      });
      const transactions = response.data.transactions;
      res.status(200).json(transactions);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error });
    }
  }
);

module.exports = router;
