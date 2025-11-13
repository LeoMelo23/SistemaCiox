// ====== CONFIGURAÇÕES INICIAIS ======
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ====== ARQUIVOS ESTÁTICOS - SIMPLES ======
app.use(express.static(path.join(__dirname, "..")));

// ====== BANCO DE DADOS ======
const dbPath = process.env.NODE_ENV === "production"
  ? "/tmp/sistemaciox.db"
  : path.join(__dirname, "data", "sistemaciox.db");

if (process.env.NODE_ENV !== "production") {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// ====== TABELAS ======
db.exec(`
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  profissao TEXT,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  area TEXT,
  endereco TEXT,
  numero TEXT,
  cep TEXT,
  cidade TEXT,
  complemento TEXT,
  municipio TEXT,
  ponto TEXT,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cilindros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  gas TEXT,
  tamanho TEXT,
  precogas REAL,
  qnt INTEGER,
  locacao TEXT,
  preco_locacao REAL,
  periodo TEXT,
  inicio TEXT,
  fim TEXT,
  aplicado TEXT,
  proprietario TEXT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);
`);

// ====== ROTAS API - VERIFICADAS ======

// Listar clientes
app.get("/api/clientes", (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM clientes ORDER BY datetime(criado_em) DESC`).all();
    const stmtCil = db.prepare(`SELECT * FROM cilindros WHERE cliente_id = ?`);
    const result = rows.map(c => {
      const cilindros = stmtCil.all(c.id) || [];
      return { ...c, cilindros };
    });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar clientes" });
  }
});

// Cadastrar cliente
app.post("/api/clientes", (req, res) => {
  try {
    const {
      nome, profissao, documento, telefone, email,
      area, endereco, numero, cep, cidade, complemento,
      municipio, ponto, cilindros = []
    } = req.body;

    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

    const docLimpo = documento ? documento.replace(/[^\d]/g, "") : null;

    if (docLimpo) {
      const clienteExistente = db
        .prepare(`SELECT id, nome FROM clientes WHERE REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', '') = ?`)
        .get(docLimpo);

      if (clienteExistente) {
        return res.status(409).json({
          aviso: true,
          message: `O cliente "${clienteExistente.nome}" já está cadastrado com este CPF/CNPJ.`
        });
      }
    }

    const insertCliente = db.prepare(`
      INSERT INTO clientes (nome, profissao, documento, telefone, email, area, endereco, numero, cep, cidade, complemento, municipio, ponto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertCliente.run(
      nome, profissao, documento, telefone, email,
      area, endereco, numero, cep, cidade,
      complemento, municipio, ponto
    );

    const clienteId = info.lastInsertRowid;

    if (Array.isArray(cilindros) && cilindros.length) {
      const insertCil = db.prepare(`
        INSERT INTO cilindros (cliente_id, gas, tamanho, precogas, qnt, locacao, preco_locacao, periodo, inicio, fim, aplicado, proprietario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertMany = db.transaction((arr) => {
        for (const c of arr) {
          insertCil.run(
            clienteId,
            c.gas,
            c.tamanho,
            c.precogas ? Number(String(c.precogas).replace(",", ".")) : null,
            c.qnt ? Number(c.qnt) : null,
            c.locacao,
            c.preco_locacao ? Number(String(c.preco_locacao).replace(",", ".")) : null,
            c.periodo,
            c.inicio,
            c.fim,
            c.aplicado,
            c.proprietario
          );
        }
      });
      insertMany(cilindros);
    }

    res.status(201).json({ ok: true, id: clienteId, message: "Cliente cadastrado com sucesso" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao salvar cliente" });
  }
});

// Detalhar cliente
app.get("/api/clientes/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const cliente = db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(id);
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
    const cil = db.prepare(`SELECT * FROM cilindros WHERE cliente_id = ?`).all(id);
    res.json({ ...cliente, cilindros: cil });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

// Excluir cliente
app.delete("/api/clientes/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare("DELETE FROM cilindros WHERE cliente_id = ?").run(id);
    const info = db.prepare("DELETE FROM clientes WHERE id = ?").run(id);
    if (info.changes > 0) {
      res.json({ ok: true, message: "Cliente excluído com sucesso" });
    } else {
      res.status(404).json({ ok: false, error: "Cliente não encontrado" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Erro ao excluir cliente" });
  }
});

// ====== ROTAS DAS PÁGINAS ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "acesso.html"));
});

// ====== INICIALIZAÇÃO ======
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Modo: ${process.env.NODE_ENV || 'development'}`);
});