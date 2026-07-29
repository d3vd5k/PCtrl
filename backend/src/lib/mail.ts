import nodemailer from "nodemailer";
import {google} from "googleapis";
import dotenv from "dotenv";
import cors from "cors";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
dotenv.config();

const CLIENT_ID = process.env.MAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.MAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.MAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.MAIL_REFRESH_TOKEN;
const SENDER_EMAIL = process.env.SMTP_USER;

if(!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !REFRESH_TOKEN || !SENDER_EMAIL) {
    throw new Error("Missing required environment variables for mail configuration.");
}

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
});

const accessToken = await oAuth2Client.getAccessToken();
if(!accessToken || !accessToken.token) {
    throw new Error("Failed to obtain access token for sending email.");
}
const options:SMTPTransport.Options={
service: "gmail",
auth: {
    type: "OAuth2",
    user: SENDER_EMAIL,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    accessToken: accessToken.token,
    }
}
const transporter = nodemailer.createTransport(options);


export const send_email = async (recipientEmail: string, subject: string, text: string, html: string) => {
  try {
    const mailOptions = {
        from: "PCtrl" + " <" + SENDER_EMAIL + ">",
        to: recipientEmail,
        subject: subject,
        text: text,
        html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("[mail] Email sent:", result.response);
    }
    catch (error) {
        console.error("[mail] Error sending email:", error);
    }
}

export const send_password_reset_email = async (to:string, reset_url:string) => await send_email(
    to, 
    "Reset your PCtrl password", 
    `Click the link to reset your password: ${reset_url}`, 
    `<h1>Hello from Nodemailer using OAuth2</h1><p>Click the link to reset your password: <a href="${reset_url}">Reset Password</a></p>`
);