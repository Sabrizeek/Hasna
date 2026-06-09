import nodemailer from "nodemailer";

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

const sendMailSafely = async ({ to, subject, text }) => {
  if (!hasSmtpConfig()) {
    console.log(`[Email preview] ${subject} -> ${to} | SMTP is not configured.`);
    return { preview: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email delivery failed for ${to}:`, error.message);
    return { sent: false, error: error.message };
  }
};

export const sendAccountCreatedEmail = async ({ to, name, universityId, email, defaultPassword }) => {
  const subject = "Lecturer Evaluation System Account Created";
  const text = `Dear ${name},

Your Lecturer Evaluation System account has been created.

University ID: ${universityId}
Email: ${email}
Default Password: ${defaultPassword}

Please log in and change your password immediately.

Faculty of Science
University of Ruhuna`;

  return sendMailSafely({ to, subject, text });
};

export const sendPasswordResetEmail = async ({ to, name, universityId, defaultPassword }) => {
  const subject = "Lecturer Evaluation System Password Reset";
  const text = `Dear ${name},

Your password has been reset to the default password.

University ID: ${universityId}
Default Password: ${defaultPassword}

Please log in and change your password immediately.

Faculty of Science
University of Ruhuna`;

  return sendMailSafely({ to, subject, text });
};

export const sendPasswordResetApprovedEmail = async ({ to, name, universityId, defaultPassword }) => {
  const subject = "Lecturer Evaluation System Password Reset Approved";
  const text = `Dear ${name},

Your password reset request has been approved.

University ID: ${universityId}
Default Password: ${defaultPassword}

Please log in and change your password immediately.

Faculty of Science
University of Ruhuna`;

  return sendMailSafely({ to, subject, text });
};

export const sendPasswordResetRejectedEmail = async ({ to, name, adminNote }) => {
  const subject = "Lecturer Evaluation System Password Reset Request Rejected";
  const note = adminNote ? `\nAdmin note: ${adminNote}\n` : "";
  const text = `Dear ${name},

Your password reset request was rejected. Please contact the system administrator for support.${note}

Faculty of Science
University of Ruhuna`;

  return sendMailSafely({ to, subject, text });
};
