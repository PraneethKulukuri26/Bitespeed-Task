import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Create a new SQLite database connection (file: bitespeed.sqlite)
const db = new Database("bitespeed.sqlite");

// Load and execute the schema from the init.sql file
const schemaPath = path.join(__dirname, "../schema/init.sql");
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

// Export the database instance for use in other modules
export default db;
