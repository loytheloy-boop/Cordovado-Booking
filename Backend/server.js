// ==============================
// FILE: backend/server.js
// Backend con salvataggio su GitHub
// ==============================

const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// CONFIGURAZIONE GITHUB
// ==============================
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || "data/bookings.json";

const GITHUB_API_BASE = "https://api.github.com";

// ==============================
// MIDDLEWARE
// ==============================
app.use(cors());
app.use(express.json());

// ==============================
// LEGGI BOOKINGS DA GITHUB
// ==============================
async function readBookings() {
  try {
    const res = await axios.get(
      `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    const contentBase64 = res.data.content;
    const jsonStr = Buffer.from(contentBase64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Errore lettura bookings da GitHub:", err.response?.status, err.response?.data || err.message);
    return [];
  }
}

// ==============================
// SCRIVI BOOKINGS SU GITHUB
// ==============================
async function writeBookings(bookings) {
  try {
    // 1) Leggi SHA del file attuale
    const getRes = await axios.get(
      `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    const sha = getRes.data.sha;

    // 2) Codifica nuovo contenuto
    const newContent = Buffer.from(
      JSON.stringify(bookings, null, 2),
      "utf-8"
    ).toString("base64");

    // 3) Aggiorna file su GitHub
    await axios.put(
      `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`,
      {
        message: "Update bookings.json",
        content: newContent,
        sha
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

  } catch (err) {
    console.error("Errore scrittura bookings su GitHub:", err.response?.status, err.response?.data || err.message);
  }
}

// ==============================
// FUNZIONE OVERLAP DATE
// ==============================
function rangesOverlap(startA, endA, startB, endB) {
  const aStart = new Date(startA);
  const aEnd = new Date(endA);
  const bStart = new Date(startB);
  const bEnd = new Date(endB);
  return aStart <= bEnd && bStart <= aEnd;
}

// ==============================
// API
// ==============================

// Test backend
app.get("/", (req, res) => {
  res.send("Backend attivo con database GitHub!");
});

// GET PRENOTAZIONI
app.get("/api/bookings", async (req, res) => {
  const bookings = await readBookings();
  res.json(bookings);
});

// POST PRENOTAZIONE
app.post("/api/bookings", async (req, res) => {
  const { name, startDate, endDate } = req.body;

  if (!name || !startDate || !endDate)
    return res.status(400).json({ error: "Dati mancanti" });

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end))
    return res.status(400).json({ error: "Date non valide" });

  if (end < start)
    return res.status(400).json({
      error: "La data di fine non può essere precedente alla data di inizio"
    });

  const bookings = await readBookings();

  const overlap = bookings.some((b) =>
    rangesOverlap(startDate, endDate, b.startDate, b.endDate)
  );

  if (overlap)
    return res.status(409).json({ error: "Le date selezionate sono già occupate" });

  const newBooking = {
    id: Date.now(),
    name,
    startDate,
    endDate
  };

  bookings.push(newBooking);
  await writeBookings(bookings);

  res.status(201).json(newBooking);
});

// DELETE PRENOTAZIONE
app.delete("/api/bookings/:id", async (req, res) => {
  const id = Number(req.params.id);

  let bookings = await readBookings();
  const newList = bookings.filter(b => b.id !== id);

  if (newList.length === bookings.length) {
    return res.status(404).json({ error: "Prenotazione non trovata" });
  }

  await writeBookings(newList);
  res.json({ success: true });
});

// ==============================
// AVVIO SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
