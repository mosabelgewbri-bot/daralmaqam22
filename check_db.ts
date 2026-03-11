import Database from "better-sqlite3";
import fs from "fs";

const dbFile = "database.sqlite";
if (fs.existsSync(dbFile)) {
  const stats = fs.statSync(dbFile);
  console.log(`Database file size: ${stats.size} bytes`);
  console.log(`Last modified: ${stats.mtime}`);
} else {
  console.log("Database file does not exist.");
}

const db = new Database(dbFile);
const bookings = db.prepare("SELECT id, headName, createdAt FROM bookings").all();
console.log("Bookings in DB:", bookings);

const trips = db.prepare("SELECT id, name FROM trips").all();
console.log("Trips in DB:", trips);

const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10").all();
console.log("Recent Logs:", logs);
