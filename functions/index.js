/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin once at the top level
admin.initializeApp();

// Export functions
exports.exchangeToken = require('./src/oauth').exchangeToken;
exports.syncPlatformData = require('./src/syncPlatforms').syncPlatformData;
exports.triggerSync = require('./src/syncPlatforms').triggerSync;

// Only set up email functions if SendGrid is configured
try {
  const sendgridKey = functions.config().sendgrid?.key;
  if (sendgridKey && sendgridKey.startsWith('SG.')) {
    sgMail.setApiKey(sendgridKey);

    const FROM_EMAIL = 'welcome@blister.dev';
    const BRAND_COLOR = '#9333EA'; // Purple from your theme

    const welcomeEmailTemplate = (userEmail) => {
      return {
        to: userEmail,
        from: FROM_EMAIL,
        subject: 'Welcome to Blister - Your Journey Begins Here',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${BRAND_COLOR}; margin-bottom: 30px;">Welcome to Blister!</h1>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We're excited to have you join our community of ambitious athletes!
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              At Blister, you'll find:
            </p>
            
            <ul style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              <li>Curated running events across road, trail, and ultra distances</li>
              <li>A community of like-minded athletes setting ambitious goals</li>
              <li>Tools to track your upcoming races and connect with fellow runners</li>
            </ul>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Ready to get started? Browse upcoming events, follow other athletes, and start planning your next adventure!
            </p>
            
            <a href="https://blister.dev/run" 
               style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Explore Events
            </a>
            
            <p style="font-size: 14px; color: #666; margin-top: 40px;">
              See you on the trails!<br>
              The Blister Team
            </p>
          </div>
        `
      };
    };

    const newFollowerEmailTemplate = (toEmail, followerName) => {
      return {
        to: toEmail,
        from: FROM_EMAIL,
        subject: `${followerName} is now following you on Blister`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${BRAND_COLOR}; margin-bottom: 30px;">You have a new follower!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              ${followerName} is now following you on Blister. They'll be able to see your upcoming events and activities.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Want to check out their profile and follow them back?
            </p>
            
            <a href="https://blister.dev/profile" 
               style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Profile
            </a>
            
            <p style="font-size: 14px; color: #666; margin-top: 40px;">
              Keep pushing forward!<br>
              The Blister Team
            </p>
          </div>
        `
      };
    };

    exports.sendWelcomeEmail = functions.auth.user().onCreate((userRecord) => {
      if (!userRecord || !userRecord.email) {
        console.error('No user email found');
        return Promise.resolve();
      }

      const msg = welcomeEmailTemplate(userRecord.email);
      return sgMail.send(msg)
        .then(() => {
          console.log(`Welcome email sent to ${userRecord.email}`);
          return null;
        })
        .catch((error) => {
          console.error('Error sending welcome email:', error);
          return null;
        });
    });

    exports.sendNewFollowerEmail = functions.firestore
      .document('followers/{followerId}')
      .onCreate((snap, context) => {
        const followerDoc = snap.data();
        if (!followerDoc || !followerDoc.followerId || !followerDoc.followedId) {
          console.error('Invalid follower data');
          return Promise.resolve();
        }

        return Promise.all([
          admin.firestore().collection('users').doc(followerDoc.followerId).get(),
          admin.firestore().collection('users').doc(followerDoc.followedId).get()
        ])
          .then(([followerUserDoc, followedUserDoc]) => {
            if (!followedUserDoc.exists || !followerUserDoc.exists) {
              console.error('User document not found');
              return null;
            }

            const followerUserData = followerUserDoc.data();
            const followedUserData = followedUserDoc.data();

            if (!followerUserData || !followedUserData || !followedUserData.email) {
              console.error('Missing user data or email');
              return null;
            }

            const followerName = followerUserData.displayName || followerUserData.email.split('@')[0];
            const followedUserEmail = followedUserData.email;

            const msg = newFollowerEmailTemplate(followedUserEmail, followerName);
            return sgMail.send(msg);
          })
          .then(() => {
            console.log('New follower email sent successfully');
            return null;
          })
          .catch((error) => {
            console.error('Error sending new follower email:', error);
            return null;
          });
      });
  } else {
    console.warn('SendGrid API key not configured or invalid. Email functions will not be deployed.');
  }
} catch (error) {
  console.warn('Error configuring SendGrid:', error);
}
