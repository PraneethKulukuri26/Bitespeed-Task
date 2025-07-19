import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const db = new Database("bitespeed.sqlite");

const schemaPath = path.join(__dirname, "../schema/init.sql");
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

export default db;
