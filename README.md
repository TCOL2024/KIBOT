# Idea Submission Form

This project provides a small Node.js application with a form to collect ideas for different bots. The form uses a ServiceNow-like layout and gathers the user's first name, last name, email address, the target bot and a detailed description.

Submitted ideas are sent via JavaScript `fetch` to the Make webhook (`https://hook.us2.make.com/gdk7iqfavitf7qqplb3cyiptk7bf3l4x`).
Because the form submits directly to Make, `index.html` can be hosted as a static page without running the Node server.
If you want to revert to the original email submission, provide SMTP credentials via environment variables and change the form logic to post to `/submit`.

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
   npm start
   ```

4. Open `http://localhost:3000` in your browser and fill out the form.

## Testing

This project does not include automated tests. Running `npm test` prints a placeholder message.
