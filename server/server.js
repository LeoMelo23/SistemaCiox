// ====== CONFIGURAÇÕES INICIAIS ======
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ====== BANCO DE DADOS - SQLite com sqlite3 (nativo) ======
const sqlite3 = require('sqlite3').verbose();

// No Render, usa /tmp; localmente usa pasta data
const dbPath = process.env.NODE_ENV === "production" 
  ? "/tmp/sistemaciox.db" 
  : path.join(__dirname, "data", "sistemaciox.db");

// Garante que o diretório existe localmente
if (process.env.NODE_ENV !== "production") {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

// Conecta ao banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
  } else {
    console.log('✅ Conectado ao SQLite:', dbPath);
  }
});

// ====== CRIAÇÃO DAS TABELAS ======
db.serialize(() => {
  db.run(`
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
    )
  `);

  db.run(`
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
    )
  `);
});

// ====== FUNÇÕES ÚTEIS ======
function normalizeText(text) {
  return text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
}

// Promisify para facilitar
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ====== ROTAS API ======

// Listar clientes
app.get("/api/clientes", async (req, res) => {
  try {
    const clientes = await dbAll(`SELECT * FROM clientes ORDER BY datetime(criado_em) DESC`);
    
    // Buscar cilindros para cada cliente
    for (let cliente of clientes) {
      const cilindros = await dbAll(`SELECT * FROM cilindros WHERE cliente_id = ?`, [cliente.id]);
      cliente.cilindros = cilindros || [];
    }
    
    res.json(clientes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar clientes" });
  }
});

// Cadastrar cliente
app.post("/api/clientes", async (req, res) => {
  try {
    const {
      nome, profissao, documento, telefone, email,
      area, endereco, numero, cep, cidade, complemento,
      municipio, ponto, cilindros = []
    } = req.body;

    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

    // Verificar se documento já existe
    if (documento) {
      const docLimpo = documento.replace(/[^\d]/g, "");
      const clienteExistente = await dbGet(
        `SELECT id, nome FROM clientes WHERE REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', '') = ?`,
        [docLimpo]
      );

      if (clienteExistente) {
        return res.status(409).json({
          aviso: true,
          message: `O cliente "${clienteExistente.nome}" já está cadastrado com este CPF/CNPJ.`
        });
      }
    }

    // Inserir cliente
    const result = await dbRun(`
      INSERT INTO clientes 
      (nome, profissao, documento, telefone, email, area, endereco, numero, cep, cidade, complemento, municipio, ponto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome || null, profissao || null, documento || null, telefone || null, email || null,
      area || null, endereco || null, numero || null, cep || null, cidade || null,
      complemento || null, municipio || null, ponto || null
    ]);

    const clienteId = result.lastID;

    // Inserir cilindros
    if (Array.isArray(cilindros) && cilindros.length) {
      for (const c of cilindros) {
        await dbRun(`
          INSERT INTO cilindros 
          (cliente_id, gas, tamanho, precogas, qnt, locacao, preco_locacao, periodo, inicio, fim, aplicado, proprietario)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
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
        ]);
      }
    }

    res.status(201).json({ 
      ok: true, 
      id: clienteId, 
      message: "Cliente cadastrado com sucesso",
      warning: process.env.NODE_ENV === 'production' ? 
        "⚠️ MODO RENDER: Dados em /tmp - podem ser perdidos periodicamente" : 
        undefined
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao salvar cliente" });
  }
});

// Detalhar cliente
app.get("/api/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cliente = await dbGet(`SELECT * FROM clientes WHERE id = ?`, [id]);
    
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
    
    const cilindros = await dbAll(`SELECT * FROM cilindros WHERE cliente_id = ?`, [id]);
    
    res.json({ ...cliente, cilindros });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

// Excluir cliente
app.delete("/api/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Excluir cilindros primeiro
    await dbRun("DELETE FROM cilindros WHERE cliente_id = ?", [id]);
    
    // Excluir cliente
    const result = await dbRun("DELETE FROM clientes WHERE id = ?", [id]);
    
    if (result.changes > 0) {
      res.json({ ok: true, message: "Cliente excluído com sucesso" });
    } else {
      res.status(404).json({ ok: false, error: "Cliente não encontrado" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Erro ao excluir cliente" });
  }
});

// ====== ARQUIVOS ESTÁTICOS ======
app.use(express.static(path.join(__dirname, "..")));

// ====== ROTAS DAS PÁGINAS ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "acesso.html"));
});

app.get("/cadastro-clientes", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "CadastroClientes", "cadclientes.html"));
});

app.get("/clientes-cadastrados", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "ClientesCadastrados", "listaclientes.html"));
});

// ====== INICIALIZAÇÃO ======
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Banco: ${dbPath}`);
});