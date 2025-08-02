import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

// Pfad-Helfer für ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Service Account Credentials (lade lokal, nicht in Git pushen!)
import serviceAccount from './service-account.json' assert { type: "json" };

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const calendarId = 'primary'; // Oder deine Kalender-ID hier

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

app.get('/api/slots', async (req, res) => {
  try {
    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1); // 1 Monat in die Zukunft

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = response.data.calendars[calendarId]?.busy || [];
    res.json({ busy });
  } catch (error) {
    console.error('Fehler bei freebusy:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/book', async (req, res) => {
  const { name, email, start, end } = req.body;
  if (!name || !email || !start || !end) {
    return res.status(400).json({ error: 'Fehlende Parameter' });
  }
  try {
    // Termin erstellen
    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `Termin mit ${name}`,
        description: `Gebucht von ${name} (${email})`,
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler bei Terminbuchung:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
