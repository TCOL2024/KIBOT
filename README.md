# Idea Submission Form

This project provides a small Node.js application with a form to collect ideas for different bots. The form asks for first name, last name, email address, the target bot, and a detailed description of the idea.

Submitted ideas are sent to **ki-test@gmx.com** via email. SMTP settings must be supplied via environment variables.

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

4. Open `http://localhost:3000` in your browser. The form uses `style.css` to provide a modern look similar to ServiceNow.

## Testing

This project does not include automated tests. Running `npm test` prints a placeholder message.
