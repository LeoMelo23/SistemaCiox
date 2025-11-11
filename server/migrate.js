const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data", "sistemaciox.db"));

try {
  db.exec(`ALTER TABLE cilindros ADD COLUMN proprietario TEXT;`);
  console.log("✅ Coluna 'proprietario' adicionada com sucesso!");
} catch (e) {
  console.log("⚠️ A coluna 'proprietario' já existe ou houve erro:", e.message);
}
