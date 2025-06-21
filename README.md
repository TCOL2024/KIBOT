# Idea Submission Form

This project provides a small Node.js application with a form to collect ideas for different bots. The form mimics a ServiceNow style in the metafinanz color scheme and gathers the user's first name, last name, email address and more details about the desired bot.

Submitted ideas are posted directly to the Make webhook (`https://hook.us2.make.com/5h08fyf8nuztv1b77lg5driw948ertr3`).
The form now asks for additional information such as the target audience, the problem the bot solves and any involved systems.
Because the form posts to Make on its own, `index.html` can be hosted as a static page without running the Node server.
If you want to revert to the original email submission, provide SMTP credentials via environment variables and update the form action to `/submit`.

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
