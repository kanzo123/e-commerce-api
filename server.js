import 'dotenv/config';
import app from "./app.js";
import connectDB from "./db/connect.js";

const port = process.env.PORT || 5000;

// Stop early, with a clear message, if a setting is missing in .env
for (const name of ['MONGO_URL', 'JWT_SECRET']) {   // NEW
  if (!process.env[name]) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
}

// Stop early if the token secret is weak
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is too short (use at least 32 random characters)');
  process.exit(1);
}

try {
  const { connection } = await connectDB(process.env.MONGO_URL);
  console.log(`Connected to MongoDB (database: ${connection.name})`);
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    console.error(`Could not start the server on port ${port}:`, err.message);
    process.exit(1);
  }
  console.log(`Server is listening on port ${port}...`);
});