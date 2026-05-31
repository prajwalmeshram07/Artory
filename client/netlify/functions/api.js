const serverless = require('serverless-http');
const connectDB = require('../../../server/config/db');
const app = require('../../../server/app');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Prevent Lambda from hanging due to open database connection sockets
  context.callbackWaitsForEmptyEventLoop = false;

  // Establish connection to MongoDB Atlas
  try {
    await connectDB();
  } catch (err) {
    console.error('Database connection error in serverless function:', err);
  }

  // Handle the request using the Express app
  return await handler(event, context);
};
