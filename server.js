import 'dotenv/config';
import app from "./app.js";
import connectDB from "./db/connect.js";

const port = process.env.PORT || 5000;

try {
  const { connection } = await connectDB(process.env.MONGO_URL)
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