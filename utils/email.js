const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	host: "smtp.gmail.com",
	port: 587,
	secure: false,
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular Gmail password
	},
	tls: {
		rejectUnauthorized: false,
	},
});

// Verify connection configuration
transporter.verify(function (error, success) {
	if (error) {
		console.log("SMTP Connection Error:", error);
	} else {
		console.log("SMTP Server is ready to take our messages");
	}
});

const sendResetPasswordEmail = async (email, token) => {
	const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

	const mailOptions = {
		from: {
			name: "Pharmacy Management System",
			address: process.env.GMAIL_USER,
		},
		to: email,
		subject: "Reset Your Password",
		html: `
            <h1>Reset Your Password</h1>
            <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
            <p>If you didn't request this, please ignore this email.</p>
            <p>The link will expire in 1 hour.</p>
        `,
	};

	try {
		const maxRetries = 3;
		let lastError;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const info = await transporter.sendMail(mailOptions);
				console.log("Email sent successfully:", info.messageId);
				return;
			} catch (error) {
				console.log(`Attempt ${attempt} failed:`, error);
				lastError = error;

				if (attempt < maxRetries) {
					// Wait for 2 seconds before retrying
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
		}

		// If we get here, all attempts failed
		throw lastError;
	} catch (error) {
		console.error("Failed to send email after all retries:", error);
		throw new Error("Failed to send password reset email");
	}
};

module.exports = {
	sendResetPasswordEmail,
};
