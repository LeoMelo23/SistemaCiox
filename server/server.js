// CommonJS para evitar mexer no "type" do package.json"
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// cria pasta /server/data e o arquivo do banco
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "sistemaciox.db"));
db.pragma("foreign_keys = ON");


// Função para normalizar texto removendo acentos
function normalizeText(text) {
  return text
    ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    : "";
}

// Tabelas
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
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);
`);

// -------- ROTAS --------

// Cadastrar cliente
app.post("/api/clientes", (req, res) => {
  try {
    const {
      nome, profissao, documento, telefone, email,
      area, endereco, numero, cep, cidade, complemento,
      municipio, ponto, cilindros = []
    } = req.body;

    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

    // 🔎 Normaliza documento (remove ., -, /)
    const docLimpo = documento ? documento.replace(/[^\d]/g, "") : null;

    // 🛑 Verifica se já existe cliente com mesmo CPF/CNPJ
    if (docLimpo) {
      const clienteExistente = db
        .prepare(`
          SELECT id, nome FROM clientes 
          WHERE REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', '') = ?
        `)
        .get(docLimpo);

      if (clienteExistente) {
        // ⚠️ Retorna aviso, não erro genérico
        return res.status(409).json({
          aviso: true,
          message: `O cliente "${clienteExistente.nome}" já está cadastrado com este CPF/CNPJ.`
        });
      }
    }

    // 🟢 Insere cliente novo
    const insertCliente = db.prepare(`
      INSERT INTO clientes
      (nome, profissao, documento, telefone, email, area, endereco, numero, cep, cidade, complemento, municipio, ponto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertCliente.run(
      nome || null, profissao || null, documento || null, telefone || null, email || null,
      area || null, endereco || null, numero || null, cep || null, cidade || null,
      complemento || null, municipio || null, ponto || null
    );

    const clienteId = info.lastInsertRowid;

    // 🧱 Insere cilindros (igual antes)
    if (Array.isArray(cilindros) && cilindros.length) {
      const insertCil = db.prepare(`
        INSERT INTO cilindros
        (cliente_id, gas, tamanho, precogas, qnt, locacao, preco_locacao, periodo, inicio, fim, aplicado, proprietario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `);
      const insertMany = db.transaction((arr) => {
        for (const c of arr) {
          insertCil.run(
            clienteId,
            c.gas || null,
            c.tamanho || null,
            c.precogas ? Number(String(c.precogas).replace(",", ".")) : null,
            c.qnt ? Number(c.qnt) : null,
            c.locacao || null,
            c.preco_locacao ? Number(String(c.preco_locacao).replace(",", ".")) : null,
            c.periodo || null,
            c.inicio || null,
            c.fim || null,
            c.aplicado || null,
            c.proprietario || null
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


// Listar clientes (para a tela de Clientes Cadastrados) - inclui cilindros
app.get("/api/clientes", (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM clientes ORDER BY datetime(criado_em) DESC`).all();

    // Pega cilindros por cliente (uma query por cliente)
    // Se forem muitos clientes, poderia ser otimizado com JOIN, mas isso já resolve o problema de imediato.
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


// Contar clientes
app.get("/api/clientes/count", (req, res) => {
  try {
    const row = db.prepare("SELECT COUNT(*) as total FROM clientes").get();
    res.json({ total: row.total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao contar clientes" });
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

// Atualizar cliente
app.put("/api/clientes/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      nome, profissao, documento, telefone, email,
      area, endereco, numero, cep, cidade, complemento,
      municipio, ponto, cilindros = []
    } = req.body;

    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

    const updateCliente = db.prepare(`
      UPDATE clientes SET
        nome = ?, profissao = ?, documento = ?, telefone = ?, email = ?,
        area = ?, endereco = ?, numero = ?, cep = ?, cidade = ?,
        complemento = ?, municipio = ?, ponto = ?
      WHERE id = ?
    `);

    const info = updateCliente.run(
      nome || null, profissao || null, documento || null, telefone || null, email || null,
      area || null, endereco || null, numero || null, cep || null, cidade || null,
      complemento || null, municipio || null, ponto || null,
      id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    db.prepare("DELETE FROM cilindros WHERE cliente_id = ?").run(id);

    if (Array.isArray(cilindros) && cilindros.length) {
      const insertCil = db.prepare(`
        INSERT INTO cilindros
        (cliente_id, gas, tamanho, precogas, qnt, locacao, preco_locacao, periodo, inicio, fim, aplicado,proprietario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `);

      const insertMany = db.transaction((arr) => {
        for (const c of arr) {
          insertCil.run(
            id,
            c.gas || null,
            c.tamanho || null,
            c.precogas ? Number(String(c.precogas).replace(",", ".")) : null,
            c.qnt ? Number(c.qnt) : null,
            c.locacao || null,
            c.preco_locacao ? Number(String(c.preco_locacao).replace(",", ".")) : null,
            c.periodo || null,
            c.inicio || null,
            c.fim || null,
            c.aplicado || null,
            c.proprietario || null
          );
        }
      });
      insertMany(cilindros);
    }

    res.json({ ok: true, message: "Cliente atualizado com sucesso" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, "..")));

// Rota principal → acesso.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "acesso.html"));
});

// Rota /site → site.html
app.get("/site", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "site.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
