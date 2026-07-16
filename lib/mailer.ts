import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  // Fail fast instead of hanging near the serverless function's execution
  // limit — a silent hang looks identical to "nothing happened" in the logs.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export const FROM =
  process.env.EMAIL_FROM ||
  process.env.RESEND_FROM_EMAIL ||
  `VytlacTo3D <${process.env.GMAIL_USER}>`;
