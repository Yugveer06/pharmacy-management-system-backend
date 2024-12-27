const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// Get all drugs
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase.from("drugs").select("*");

		if (error) throw error;
		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Add new drug
router.post("/", async (req, res) => {
	try {
		const { name, quantity, mfg_date, exp_date, price, manufacturer, description } = req.body;

		const { data, error } = await supabase
			.from("drugs")
			.insert([
				{
					name,
					quantity,
					mfg_date,
					exp_date,
					price,
					manufacturer,
					description,
				},
			])
			.select()
			.single();

		if (error) throw error;
		res.status(201).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update drug
router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { name, quantity, mfg_date, exp_date, price, manufacturer, description } = req.body;

		const { data, error } = await supabase
			.from("drugs")
			.update({
				name,
				quantity,
				mfg_date,
				exp_date,
				price,
				manufacturer,
				description,
			})
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		if (!data) {
			return res.status(404).json({ error: "Drug not found" });
		}
		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Delete drug
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { error } = await supabase.from("drugs").delete().eq("id", id);

		if (error) throw error;
		res.json({ message: "Drug deleted successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
