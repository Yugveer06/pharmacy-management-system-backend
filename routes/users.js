const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const supabase = require("../config/supabase");

// GET all users
router.get("/", auth, async (req, res) => {
	try {
		const { data: users, error } = await supabase.from("users").select("*");

		if (error) throw error;

		// Remove password from each user object
		const sanitizedUsers = users.map(({ password, ...user }) => user);

		res.json(sanitizedUsers);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Error fetching users" });
	}
});

// GET users by role
router.get("/:role", auth, async (req, res) => {
	try {
		const { role } = req.params;
		// Convert role parameter to proper case
		const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

		const { data: users, error } = await supabase.from("users").select("*").eq("role_id", formattedRole);

		if (error) throw error;

		// Remove password from each user object
		const sanitizedUsers = users.map(({ password, ...user }) => user);

		res.json(sanitizedUsers);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Error fetching users" });
	}
});

// GET user by ID
router.get("/id/:id", auth, async (req, res) => {
	try {
		const { id } = req.params;
		const { data: user, error } = await supabase.from("users").select("*").eq("id", id).single();

		if (error) {
			if (error.code === "22P02") {
				return res.status(400).json({ message: "Invalid ID format" });
			}
			throw error;
		}
		if (!user) return res.status(404).json({ message: "User not found" });

		// Remove password from user object
		const { password, ...sanitizedUser } = user;

		res.json(sanitizedUser);
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ message: "Error fetching user" });
	}
});

module.exports = router;
