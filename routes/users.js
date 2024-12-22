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

module.exports = router;
