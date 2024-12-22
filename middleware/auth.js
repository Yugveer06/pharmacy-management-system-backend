const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const auth = async (req, res, next) => {
	try {
		const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
		if (!token) {
			return res.status(401).json({ message: "No token provided" });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Verify user exists in database
		const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.id).single();

		if (error || !user) {
			return res.status(401).json({ message: "Invalid token" });
		}

		delete user.password;
		req.user = user;
		next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid token" });
	}
};

const checkRole =
	(...roles) =>
	(req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		if (!roles.includes(req.user.role_id)) {
			return res.status(403).json({ message: "Forbidden" });
		}

		next();
	};

module.exports = { auth, checkRole };
