const supabase = require("../config/supabase");

const adminAuth = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) {
			return res.status(401).json({ message: "No token provided" });
		}

		// Verify the token
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);
		if (error) {
			return res.status(401).json({ message: "Invalid token" });
		}

		// Check if user is admin
		const { data: adminData } = await supabase.from("admin").select("*").eq("email", user.email).single();

		if (!adminData) {
			return res.status(403).json({ message: "Access denied. Admin only." });
		}

		req.admin = adminData;
		next();
	} catch (error) {
		res.status(500).json({ message: "Server error" });
	}
};

module.exports = adminAuth;
