import Database from "better-sqlite3";
try {
  const db = new Database("test.sqlite");
  console.log("Database initialized successfully");
  db.close();
} catch (error) {
  console.error("Database initialization failed:", error);
}
