import { NextResponse } from 'next/server';
// @ts-ignore
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // 0. Basic Security Validation
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload.' }, { status: 400 });
    }
    if (!data.name || !data.email) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }
    if (data.message && data.message.length > 5000) {
      return NextResponse.json({ success: false, error: 'Payload too large.' }, { status: 413 });
    }

    // Check if it's a contact or appointment
    const type = data.service ? 'Appointment' : 'Contact';

    // 1. Contact Logic: Disable outgoing emails entirely for contact form
    if (type === 'Contact') {
      return NextResponse.json({ success: true, message: 'Contact saved. No email sent.' });
    }

    // 2. Appointment Logic: Simplified Customer Confirmation
    const customerSubject = "Booking Confirmed: Let's Build Something Great Together!";
    const customerHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; color: #333333; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #050505; margin-top: 0; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0; font-size: 24px; font-weight: bold;">Kryto Studio</h2>
        <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Dear ${data.name},</p>
        <p style="font-size: 16px; line-height: 1.6;">Thank you for choosing Kryto Studio. We have received your request and our team is already reviewing the details.</p>
        <p style="font-size: 16px; line-height: 1.6;">We will reach out to you as soon as possible with a personalized strategy and a Google Meet/Zoom link for our discussion.</p>
        
        <div style="margin: 35px 0; padding: 25px 20px; background-color: #f8fbfa; border: 1px solid #e2f0e9; border-radius: 8px; text-align: center;">
          <p style="font-size: 15px; line-height: 1.5; margin-top: 0; margin-bottom: 20px; color: #444;">If you have any immediate questions, feel free to chat with us directly on WhatsApp.</p>
          <a href="https://wa.me/919294625866?text=Hi%20Kryto%20Studio,%20I%20just%20booked%20an%20appointment." style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; padding: 14px 28px; border-radius: 6px; border-bottom: 3px solid #1da851;">Message us on WhatsApp</a>
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px; color: #555;">Best Regards,</p>
        <p style="font-size: 16px; font-weight: bold; color: #050505; margin-top: 0;">Team Kryto Studio</p>
      </div>
    `;

    // 3. Admin Notification: Keep sending short alert for Appointments
    const adminSubject = `🚨 New Lead: ${data.service} booking from ${data.name}`;
    const adminHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d9381e;">🚨 New Appointment Lead</h2>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
          <tr style="background-color: #f9f9f9;"><td width="30%"><strong>Name</strong></td><td>${data.name}</td></tr>
          <tr><td><strong>Email</strong></td><td>${data.email}</td></tr>
          <tr style="background-color: #f9f9f9;"><td><strong>Phone</strong></td><td>${data.phone}</td></tr>
          <tr><td><strong>Address</strong></td><td>${data.address || 'N/A'}</td></tr>
          <tr style="background-color: #f9f9f9;"><td><strong>Service</strong></td><td>${data.service}</td></tr>
          <tr><td><strong>Date</strong></td><td>${data.date}</td></tr>
          <tr style="background-color: #f9f9f9;"><td><strong>Message</strong></td><td>${data.message || 'No message provided'}</td></tr>
        </table>
      </div>
    `;

    const fromAddress = '"Kryto Studio" <gamermirchi08@gmail.com>';

    const [resCustomer, resAdmin] = await Promise.all([
      transporter.sendMail({
        from: fromAddress,
        to: data.email,
        subject: customerSubject,
        html: customerHtml,
      }),
      transporter.sendMail({
        from: fromAddress,
        to: ['gamermirchi08@gmail.com', 'krytostudio@gmail.com'],
        subject: adminSubject,
        html: adminHtml,
      })
    ]);

    return NextResponse.json({ success: true, customer: resCustomer, admin: resAdmin });
  } catch (error: any) {
    console.error('=== SMTP ERROR DUMP ===');
    console.error('Failed to send emails via Brevo SMTP.');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error Object:', error);
    console.error('=======================');
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
