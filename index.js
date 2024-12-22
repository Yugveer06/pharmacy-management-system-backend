const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const session = require("express-session");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const { auth } = require("./middleware/auth");

const app = express();

app.use(
	cors({
		origin: "http://localhost:3000", // Your frontend URL
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Accept"],
	})
);
app.use(cookieParser());
app.use(express.json());

// Session configuration
app.use(
	session({
		secret: process.env.SESSION_SECRET || "your-secret-key",
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
		},
	})
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Replace the simple middleware with a proper handler
app.get("/api/auth/check", auth, (req, res) => {
	res.json({
		isAuthenticated: true,
		user: req.user,
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
