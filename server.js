const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/submit', async (req, res) => {
  const { vorname, name, email, bot, idea } = req.body;

  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `\"Idea Form\" <${process.env.SMTP_USER}>`,
      to: 'ki-test@gmx.com',
      subject: `Neue Idee f\u00fcr ${bot}`,
      text: `Vorname: ${vorname}\nName: ${name}\nE-Mail: ${email}\nBot: ${bot}\n\nBeschreibung:\n${idea}`,
    });
    res.send('Vielen Dank f\u00fcr Ihre Idee!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Senden der Email');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
