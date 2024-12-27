const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// Get all orders
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase.from("orders").select("*");

		if (error) throw error;
		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Create new order
router.post("/", async (req, res) => {
	try {
		const { status, quantity, price } = req.body;

		const { data, error } = await supabase
			.from("orders")
			.insert([
				{
					status,
					quantity,
					price,
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

// Update order
router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { status, quantity, price } = req.body;

		const { data, error } = await supabase
			.from("orders")
			.update({
				status,
				quantity,
				price,
			})
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		if (!data) {
			return res.status(404).json({ error: "Order not found" });
		}
		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Delete order
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { error } = await supabase.from("orders").delete().eq("id", id);

		if (error) throw error;
		res.json({ message: "Order deleted successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
