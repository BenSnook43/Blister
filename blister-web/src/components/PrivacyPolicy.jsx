import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-sand-50 py-12">
      <Helmet>
        <title>Privacy Policy | Blister</title>
        <meta name="description" content="Learn about how Blister protects and handles your data." />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 mb-8">
            At Blister, we take your privacy seriously. This policy describes what personal information we collect
            and how we use it.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Information We Collect</h2>
            <ul className="space-y-3 text-slate-600">
              <li><strong>Account Information:</strong> Email address, name, and profile picture when you create an account.</li>
              <li><strong>Activity Data:</strong> Running and triathlon activities, including distance, time, pace, and GPS data when connected to fitness apps.</li>
              <li><strong>Health Metrics:</strong> When authorized, we collect health-related data such as:
                <ul className="ml-6 mt-2 space-y-2">
                  <li>- Heart rate data and zones</li>
                  <li>- VO2 max estimates</li>
                  <li>- Resting heart rate</li>
                  <li>- Sleep metrics (if shared from connected devices)</li>
                  <li>- Weight and body composition (if manually entered)</li>
                  <li>- Perceived exertion and fatigue levels</li>
                </ul>
              </li>
              <li><strong>Performance Metrics:</strong> Training data, race results, and personal records that you choose to share.</li>
              <li><strong>Device Information:</strong> Information about the devices and browsers you use to access Blister.</li>
              <li><strong>Location Data:</strong> General location for event discovery and activity tracking (when permitted).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">How We Use Your Information</h2>
            <ul className="space-y-3 text-slate-600">
              <li><strong>Activity Tracking:</strong> To provide you with insights about your training and racing.</li>
              <li><strong>Performance Analysis:</strong> To generate statistics and visualizations of your progress.</li>
              <li><strong>Social Features:</strong> To enable following other athletes and sharing achievements (only what you choose to make public).</li>
              <li><strong>Service Improvement:</strong> To analyze how our features are used and make improvements.</li>
              <li><strong>Communication:</strong> To send important updates and notifications about events or followers.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Data Privacy and Sharing</h2>
            <ul className="space-y-3 text-slate-600">
              <li><strong>Private by Default:</strong> Your activity data and performance metrics are private to you by default.</li>
              <li><strong>Controlled Sharing:</strong> You have complete control over what information is shared publicly.</li>
              <li><strong>Third-Party Services:</strong> When you connect fitness apps, we only access the data you explicitly authorize.</li>
              <li><strong>No Data Sales:</strong> We never sell your personal information or activity data to third parties.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Data Security</h2>
            <ul className="space-y-3 text-slate-600">
              <li><strong>Encryption:</strong> We implement industry-standard encryption practices:
                <ul className="ml-6 mt-2 space-y-2">
                  <li>- All data transmitted between your device and our servers uses TLS 1.3 encryption (HTTPS)</li>
                  <li>- Sensitive data like health metrics are encrypted using AES-256 before being stored</li>
                  <li>- Your personal information is stored in secure, encrypted databases</li>
                  <li>- Authentication tokens and credentials are encrypted and securely stored</li>
                </ul>
              </li>
              <li><strong>Access Controls:</strong> Strict access controls and authentication measures protect your data:
                <ul className="ml-6 mt-2 space-y-2">
                  <li>- Multi-factor authentication available for account security</li>
                  <li>- Regular security audits and access reviews</li>
                  <li>- Employee access to user data is strictly limited and monitored</li>
                </ul>
              </li>
              <li><strong>Data Storage:</strong> Your data is stored in secure, certified data centers with:
                <ul className="ml-6 mt-2 space-y-2">
                  <li>- Regular backups encrypted with different keys</li>
                  <li>- Physical security measures</li>
                  <li>- Disaster recovery plans</li>
                </ul>
              </li>
              <li><strong>Regular Audits:</strong> We regularly review and update our security practices.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Health Data Privacy</h2>
            <ul className="space-y-3 text-slate-600">
              <li><strong>Special Protection:</strong> Health-related data receives additional security measures and restricted access.</li>
              <li><strong>Consent Required:</strong> We only collect and process health data with your explicit consent.</li>
              <li><strong>Granular Control:</strong> You can choose which health metrics to share or keep private.</li>
              <li><strong>Data Retention:</strong> Health data can be deleted at any time through your account settings.</li>
              <li><strong>Third-Party Access:</strong> Health data is never shared with third parties without your explicit permission.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Rights</h2>
            <ul className="space-y-3 text-slate-600">
              <li><strong>Data Access:</strong> You can download your activity data at any time.</li>
              <li><strong>Data Deletion:</strong> You can request deletion of your account and associated data.</li>
              <li><strong>Privacy Controls:</strong> Manage your privacy settings and connected apps easily.</li>
              <li><strong>Updates:</strong> We'll notify you of any significant changes to this privacy policy.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Contact Us</h2>
            <p className="text-slate-600">
              If you have any questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:privacy@blister.dev" className="text-purple-600 hover:text-purple-700">
                privacy@blister.dev
              </a>
            </p>
          </section>

          <p className="text-sm text-slate-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
} 