const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { CustomerHistory } = require('../models');

router.post('/', async (req, res) => {
  try {
    const { toEmail, subject, htmlBody, pdfBase64, pdfFileName, customer_no, mc_type, year, action_by } = req.body;

    if (!toEmail || !subject) {
      return res.status(400).json({ error: 'Missing required fields: toEmail, subject' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'SMTP credentials (SMTP_USER/SMTP_PASS) not configured in .env' });
    }

    const transporter = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '465', 10),
          secure: process.env.SMTP_SECURE === 'true' || (process.env.SMTP_PORT === '465') || (!process.env.SMTP_PORT),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
      : nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

    let finalHtmlBody = htmlBody || '';
    const attachments = [];

    if (pdfBase64) {
      const cleanPdfBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      attachments.push({
        filename: pdfFileName || 'Acknowledgement_Letter.pdf',
        content: cleanPdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      });
    }

    let imgCount = 0;
    finalHtmlBody = finalHtmlBody.replace(/src="(data:image\/[^;]+;base64,([^"]+))"/g, (match, fullDataUri, base64Data) => {
      imgCount++;
      const cid = `inline_img_${imgCount}@cma`;
      attachments.push({
        filename: `image_${imgCount}.png`,
        content: base64Data,
        encoding: 'base64',
        cid: cid
      });
      return `src="cid:${cid}"`;
    });

    const mailOptions = {
      from: `"Condominium Management Authority" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: subject,
      html: finalHtmlBody,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response || info.messageId);

    if (customer_no) {
      try {
        await CustomerHistory.create({
          customer_no,
          mc_type: mc_type || 'MC',
          action_type: 'Acknowledgement Email Sent',
          description: `Email sent to ${toEmail} with subject: ${subject}`,
          year: year || new Date().getFullYear(),
          file_path: pdfFileName || 'Acknowledgement_Letter.pdf',
          action_by: action_by || 'System'
        });
      } catch (histErr) {
        console.error('Failed to save to CustomerHistory:', histErr);
      }
    }

    res.status(200).json({ message: 'Email sent successfully', info: info.response });
  } catch (error) {
    console.error('Error in email route:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

module.exports = router;
