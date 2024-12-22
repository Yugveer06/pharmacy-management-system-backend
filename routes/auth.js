const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { auth, checkRole } = require("../middleware/auth");
const multer = require("multer");
const { uploadAvatar, deleteAvatar } = require("../utils/storage");
const { sendResetPasswordEmail } = require("../utils/email");
const crypto = require("crypto");

// Configure multer for memory storage
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit to match frontend
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Invalid file type. Only images are allowed."));
		}
	},
});

// Fix login route
router.post("/login", async (req, res) => {
	console.log("Login attempt:", { email: req.body.email });

	try {
		const { email, password } = req.body;

		// Basic validation
		if (!email || !password) {
			return res.status(400).json({ message: "Email and password are required" });
		}

		// Find user by email
		const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();

		if (error || !user) {
			console.log("User not found:", email);
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Compare passwords
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			console.log("Password mismatch for user:", email);
			return res.status(401).json({ message: "Invalid credentials" });
		}

		console.log("User authenticated successfully:", { userId: user.id, role: user.role_id });

		// Remove password from user object
		delete user.password;

		// Generate JWT token
		const token = jwt.sign({ id: user.id, role: user.role_id }, process.env.JWT_SECRET, { expiresIn: "24h" });

		console.log("JWT token generated for user:", { userId: user.id });

		res.cookie("token", token, {
			secure: process.env.NODE_ENV === "production", // Use secure cookies in production
			sameSite: "strict",
		});
		return res.json({
			success: true,
			token,
			user: {
				id: user.id,
				email: user.email,
				name: `${user.f_name} ${user.l_name}`,
				role_id: user.role_id,
				avatar: user.avatar,
			},
		});
	} catch (error) {
		console.error("Server error during login:", error);
		return res.status(500).json({ message: "Server error" });
	}
});

const roles = [
	{ id: 1, name: "Admin" },
	{ id: 2, name: "Manager" },
	{ id: 3, name: "Pharmacist" },
	{ id: 4, name: "Salesman" },
];

// Create new user with avatar upload
router.post("/create-user", auth, checkRole(1), upload.single("avatar"), async (req, res) => {
	try {
		const { email, password, f_name, l_name, phone, role_id } = req.body;

		// Check if user with email already exists
		const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single();

		if (existingUser) {
			return res.status(400).json({ message: "User with this email already exists" });
		}

		// Hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		let avatarUrl = null;
		if (req.file) {
			try {
				avatarUrl = await uploadAvatar(req.file, f_name + l_name);
			} catch (error) {
				console.error("Avatar upload failed:", error);
				return res.status(400).json({ message: "Failed to upload avatar" });
			}
		}

		// Create user first to get the id
		const { data: user, error } = await supabase
			.from("users")
			.insert([
				{
					f_name,
					l_name,
					email,
					phone,
					password: hashedPassword,
					role_id,
					avatar: avatarUrl,
				},
			])
			.select()
			.single();

		if (error) {
			// If avatar was uploaded but user creation failed, cleanup the avatar
			if (avatarUrl) {
				await deleteAvatar(avatarUrl);
			}
			return res.status(400).json({ message: error.message });
		}

		res.status(201).json({
			success: true,
			message: "User created successfully",
			user: {
				id: user.id,
				email: user.email,
				name: `${user.f_name} ${user.l_name}`,
				role_id: user.role_id,
				avatar: avatarUrl,
			},
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Update user with avatar
router.put("/update-user/:userId", auth, checkRole(1), upload.single("avatar"), async (req, res) => {
	try {
		const { userId } = req.params;
		const { f_name, l_name, phone, role_id } = req.body;

		// Get current user data for avatar deletion
		const { data: currentUser } = await supabase.from("users").select("avatar").eq("id", userId).single();

		let avatarUrl = currentUser?.avatar;

		// Upload new avatar if provided
		if (req.file) {
			// Delete old avatar if exists
			if (currentUser?.avatar) {
				await deleteAvatar(currentUser.avatar);
			}

			// Upload new avatar
			avatarUrl = await uploadAvatar(req.file, userId);
		}

		const { data: user, error } = await supabase
			.from("users")
			.update({
				f_name,
				l_name,
				phone,
				role_id,
				avatar: avatarUrl,
			})
			.eq("id", userId)
			.select()
			.single();

		if (error) {
			return res.status(400).json({ message: error.message });
		}

		res.json({
			message: "User updated successfully",
			user,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error" });
	}
});

// Forgot password route
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = req.body;

		// Find user by email
		const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();

		if (error || !user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(32).toString("hex");
		const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

		// Store reset token in database
		await supabase
			.from("users")
			.update({
				reset_token: resetToken,
				reset_token_expiry: resetTokenExpiry,
			})
			.eq("id", user.id);

		// Send reset password email
		await sendResetPasswordEmail(user.email, resetToken);

		res.json({ message: "Password reset email sent successfully" });
	} catch (error) {
		console.error("Forgot password error:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Reset password route
router.post("/reset-password", async (req, res) => {
	try {
		const { token, newPassword } = req.body;

		// Find user by reset token and check expiry
		const { data: user, error } = await supabase.from("users").select("*").eq("reset_token", token).single();

		if (error || !user) {
			return res.status(400).json({ message: "Invalid or expired reset token" });
		}

		if (new Date() > new Date(user.reset_token_expiry)) {
			return res.status(400).json({ message: "Reset token has expired" });
		}

		// Hash new password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);

		// Update password and clear reset token
		await supabase
			.from("users")
			.update({
				password: hashedPassword,
				reset_token: null,
				reset_token_expiry: null,
			})
			.eq("id", user.id);

		res.json({ message: "Password reset successful" });
	} catch (error) {
		console.error("Reset password error:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Logout route
router.post("/logout", (req, res) => {
	res.clearCookie("token");
	return res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;