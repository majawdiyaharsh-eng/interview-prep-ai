const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables FIRST
dotenv.config();

const { connectDB, sequelize } = require("./config/db");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://interview-prep-ai-web.vercel.app",
    "https://interview-prep-ai-git-main-majawdiyaharsh-engs-projects.vercel.app",
    "https://interview-prep-7sow9ez7x-majawdiyaharsh-engs-projects.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/session", require("./routes/sessionRoutes"));
app.use("/api/question", require("./routes/questionRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

app.get("/", (req, res) => res.send("Interview Prep API Running ✅"));

const PORT = process.env.PORT || 5000;

// Connect DB and sync tables BEFORE starting server
const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log("✅ Database tables synced successfully!");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();