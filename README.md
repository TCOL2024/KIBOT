# Idea Submission Form

This project provides a small Node.js application with a form to collect ideas for different bots. The form asks for first name, last name, email address, the target bot, and a detailed description of the idea. The server only serves the form page; submissions are sent to a Make webhook.

Submitted ideas are posted directly to a Make webhook and can then be processed there.
If you want to use the previous email functionality, supply SMTP credentials via
environment variables and change the form action back to `/submit`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Provide SMTP credentials via environment variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `PORT` (optional, defaults to 3000)

3. Start the application:
   ```bash
   node server.js
   ```

4. Open `http://localhost:3000` in your browser and fill out the form.

## Testing

This project does not include automated tests. Running `npm test` prints a placeholder message.
