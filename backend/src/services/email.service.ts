import nodemailer from 'nodemailer';
import { config } from '../config';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
    }
    return this.transporter;
  }

  private isConfigured(): boolean {
    return !!(config.email.user && config.email.pass);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured()) {
      // In dev without SMTP configured, log to console instead of failing
      console.log(`[Email] Would send to ${to}: ${subject}`);
      return;
    }

    try {
      await this.getTransporter().sendMail({
        from: `"Strategi" <${config.email.from}>`,
        to,
        subject,
        html,
      });
    } catch (err) {
      // Never crash the app over a failed email
      console.error(`[Email] Failed to send "${subject}" to ${to}:`, err);
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to Strategi</h1>
        <p style="color: #555; margin-bottom: 32px;">Hi ${name}, please verify your email address to get started.</p>

        <a href="${verifyUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px;
                  border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Verify Email
        </a>

        <p style="margin-top: 32px; color: #888; font-size: 13px;">
          Or copy this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #6366f1;">${verifyUrl}</a>
        </p>

        <p style="color: #888; font-size: 13px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #bbb; font-size: 12px;">Strategi · AI-powered GEO Analytics</p>
      </div>
    `;

    await this.send(email, 'Verify your Strategi account', html);
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #555; margin-bottom: 32px;">Hi ${name}, we received a request to reset your password.</p>

        <a href="${resetUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px;
                  border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Reset Password
        </a>

        <p style="margin-top: 32px; color: #888; font-size: 13px;">
          Or copy this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
        </p>

        <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #bbb; font-size: 12px;">Strategi · AI-powered GEO Analytics</p>
      </div>
    `;

    await this.send(email, 'Reset your Strategi password', html);
  }

  async sendAnalysisCompleteEmail(
    email: string,
    name: string,
    companyName: string,
    analysisId: string,
  ): Promise<void> {
    const reportUrl = `${config.frontendUrl}/analyses/${analysisId}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Your analysis is ready</h1>
        <p style="color: #555; margin-bottom: 8px;">Hi ${name},</p>
        <p style="color: #555; margin-bottom: 32px;">
          The GEO analysis for <strong>${companyName}</strong> has completed.
          Your GEO score, page recommendations, and blog posts are ready to review.
        </p>

        <a href="${reportUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px;
                  border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
          View Report
        </a>

        <div style="margin-top: 32px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 0 0 8px; font-weight: 600; font-size: 14px;">What's in your report:</p>
          <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
            <li>GEO score (0–100) with attribute breakdown</li>
            <li>Share of Voice across AI engines</li>
            <li>Page-level recommendations</li>
            <li>3 AI-optimised blog posts ready to publish</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #bbb; font-size: 12px;">Strategi · AI-powered GEO Analytics</p>
      </div>
    `;

    await this.send(email, `Your GEO analysis for ${companyName} is ready`, html);
  }
}

export const emailService = new EmailService();
