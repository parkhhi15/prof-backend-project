import mongoose from "mongoose";

const uri = "mongodb+srv://parkhhisaneal1503_db_user:YOUR_PASSWORD@cluster0.5rffocf.mongodb.net/Project0?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  console.log("✅ Connected successfully!");
  await mongoose.connection.close();
} catch (err) {
  console.error("❌ Connection failed:", err);
}
