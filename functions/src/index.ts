import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateWelcomeEmailHtml } from './email';

admin.initializeApp();

export const sendWelcomeEmail = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const newUser = snap.data();
    const email = newUser.email;
    const name = newUser.name;

    if (!email) {
      console.log('No email for user', context.params.userId);
      return null;
    }

    const html = generateWelcomeEmailHtml(name, {}); // Add settings if needed

    try {
      // Assuming Nodemailer/SendGrid logic here, reusing or reimplementing based on project needs
      // For now, logging to console as a placeholder until SMTP is configured in the functions environment
      console.log(`Sending welcome email to ${email}`);
      // await transporter.sendMail({ ... });
      return { success: true };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return null;
    }
  });
