// configure dotenv
require('dotenv').config();

module.exports = {
  mongoURI: `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@transactions-unified.h0btp.mongodb.net/transactions-unified-db`,
  secretOrKey: "secret"
};