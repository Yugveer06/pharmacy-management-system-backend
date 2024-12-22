const supabase = require("../config/supabase");
const path = require("path");

const uploadAvatar = async (file, userId) => {
	try {
		// Generate unique filename
		const ext = path.extname(file.originalname);
		const filename = `${userId}-${Date.now()}${ext}`;
		console.log(filename);
		// Upload file to Supabase Storage
		const { data, error } = await supabase.storage.from("avatars").upload(`users/${filename}`, file.buffer, {
			contentType: file.mimetype,
			cacheControl: "3600",
		});
		console.log("data", data);

		if (error) throw error;

		// Get public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("avatars").getPublicUrl(`users/${filename}`);

		return publicUrl;
	} catch (error) {
		throw new Error("Error uploading avatar: " + error.message);
	}
};

const deleteAvatar = async filepath => {
	try {
		if (!filepath) return;

		// Extract filename from URL
		const filename = filepath.split("/").pop();

		const { error } = await supabase.storage.from("avatars").remove([`users/${filename}`]);

		if (error) throw error;
	} catch (error) {
		throw new Error("Error deleting avatar: " + error.message);
	}
};

module.exports = { uploadAvatar, deleteAvatar };
