// ==============================
// FILE: script.js (versione migliorata)
// ==============================

const BASE_URL = "https://cordovado-booking1.onrender.com";

let bookings = [];
let currentYear;
let currentMonth;

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  // Navigazione mesi
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  // Form prenotazione
  document
    .getElementById("bookingForm")
    .addEventListener("submit", handleBookingSubmit);

  // Nuovi bottoni
  document.getElementById("btnList").addEventListener("click", showList);
  document.getElementById("btnStats").addEventListener("click", showStats);

  // Carica prenotazioni e mostra calendario
  loadBookings().then(renderCalendar);
});

// ==============================
// CARICAMENTO PRENOTAZIONI
// ==============================
async function loadBookings() {
  try {
    const res = await fetch(`${BASE_URL}/api/bookings`);
    bookings = await res.json();
  } catch (err) {
    console.error("Errore caricamento prenotazioni:", err);
    bookings = [];
  }
}

// ==============================
// RENDER CALENDARIO
// ==============================
function renderCalendar() {
  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  document.getElementById("currentMonth").textContent =
    monthNames[currentMonth] + " " + currentYear;

  const headerRow = document.createElement("div");
  headerRow.className = "calendar-grid";

  const dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  dayNames.forEach((d) => {
    const cell = document.createElement("div");
    cell.className = "calendar-header";
    cell.textContent = d;
    headerRow.appendChild(cell);
  });

  calendarEl.appendChild(headerRow);

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < firstWeekday; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day";
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    const dateStr = dateObj.toISOString().slice(0, 10);

    const cell = document.createElement("div");
    cell.className = "calendar-day";

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    const dayBookings = bookings.filter((b) =>
      isDateInRange(dateStr, b.startDate, b.endDate)
    );

    if (dayBookings.length > 0) {
      cell.classList.add("booked");
      const info = document.createElement("div");
      info.className = "booking-info";
      info.textContent =
        "Occupato da: " +
        dayBookings
          .map((b) => b.name)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ");
      cell.appendChild(info);
    } else {
      cell.classList.add("free");
    }

    grid.appendChild(cell);
  }

  calendarEl.appendChild(grid);
}

function isDateInRange(dateStr, startStr, endStr) {
  const d = new Date(dateStr);
  const s = new Date(startStr);
  const e = new Date(endStr);
  return d >= s && d <= e;
}

// ==============================
// INVIO PRENOTAZIONE
// ==============================
async function handleBookingSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const messageEl = document.getElementById("message");
  messageEl.textContent = "";

  if (!name || !startDate || !endDate) {
    messageEl.textContent = "Compila tutti i campi.";
    messageEl.style.color = "red";
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate })
    });

    if (!res.ok) {
      const errData = await res.json();
      messageEl.textContent = errData.error || "Errore nella prenotazione.";
      messageEl.style.color = "red";
      return;
    }

    await loadBookings();
    renderCalendar();

    messageEl.textContent = "Prenotazione inserita con successo!";
    messageEl.style.color = "green";

    document.getElementById("bookingForm").reset();
  } catch (err) {
    console.error("Errore invio prenotazione:", err);
    messageEl.textContent = "Errore di comunicazione con il server.";
    messageEl.style.color = "red";
  }
}

// ==============================
// LISTA PRENOTAZIONI ORDINATA
// ==============================
function showList() {
  const container = document.getElementById("listContainer");
  container.innerHTML = "";

  if (bookings.length === 0) {
    container.textContent = "Nessuna prenotazione presente.";
    return;
  }

  const sorted = [...bookings].sort((a, b) => a.name.localeCompare(b.name));

  const ul = document.createElement("ul");

  sorted.forEach(b => {
    const li = document.createElement("li");
    li.textContent = `${b.name}: dal ${b.startDate} al ${b.endDate}`;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// ==============================
// STATISTICHE IN PERCENTUALE
// ==============================
function showStats() {
  const container = document.getElementById("statsContainer");
  container.innerHTML = "";

  if (bookings.length === 0) {
    container.textContent = "Nessuna prenotazione presente.";
    return;
  }

  const stats = {};
  let totalDays = 0;

  bookings.forEach(b => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (!stats[b.name]) stats[b.name] = 0;
    stats[b.name] += days;

    totalDays += days;
  });

  const ul = document.createElement("ul");

  Object.entries(stats).forEach(([name, days]) => {
    const perc = ((days / totalDays) * 100).toFixed(1);
    const li = document.createElement("li");
    li.textContent = `${name}: ${days} giorni (${perc}%)`;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}
