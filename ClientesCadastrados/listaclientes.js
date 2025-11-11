// --- Normalização para comparação ---
function normalizeCompare(str) {
  if (str == null) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ") // colapsa espaços
    .trim();
}

const gases = {
  OM: "Oxigênio Medicinal",
  AC: "Ar Comprimido",
  ON: "Óxido Nitroso",
  OI: "Oxigênio Industrial",
  Arg: "Argônio",
  Hel: "Gás Hélio",
  Ace: "Acetileno",
  GS: "Mistura/Gás de Solda",
  Nit: "Nitrogênio",
  CO2: "CO2",
  conserv: "Conservare",
  etil: "Etil",
  usp: "COS2 USP"
};

// --- Carregar clientes ---
async function carregarClientes() {
  try {
    const resp = await fetch("http://localhost:3000/api/clientes");
    const lista = await resp.json();
    const tbody = document.querySelector("#tabela tbody");
    tbody.innerHTML = "";

    lista.forEach(c => {
      const tr = document.createElement("tr");
      console.log("Cliente:", c.nome, "Cilindros:", c.cilindros);

      if (c.cilindros && Array.isArray(c.cilindros)) {
        tr.dataset.cilindros = JSON.stringify(c.cilindros);
      } else {
        tr.dataset.cilindros = "[]";
      }

      tr.dataset.documento = (c.documento || "").replace(/\D/g, "");
      tr.dataset.telefone = (c.telefone || "").replace(/\D/g, "");
      tr.dataset.cep = (c.cep || "").replace(/\D/g, "");
      tr.dataset.nome = (c.nome || "").toLowerCase();

      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.nome || ""}</td>
        <td>${c.profissao || ""}</td>
        <td>${c.documento || ""}</td>
        <td>${c.telefone || ""}</td>
        <td>${c.email || ""}</td>
        <td>${c.area || ""}</td>
        <td>${c.cidade || c.municipio || ""}</td>
        <td>${formatarData(c.criado_em)}</td>
        <td>
          <button onclick="verDetalhes(${c.id})">Ver detalhes</button>
          <button onclick="editarCliente(${c.id})">Editar</button>
          <button onclick="excluirCliente(${c.id})">Excluir</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    console.log("Clientes carregados:", lista.length);
  } catch (e) {
    console.error("Erro ao carregar clientes:", e);
    Swal.fire("Erro", String(e.message || e), "error");
  }
}

carregarClientes();

// --- Filtro rápido ---
function normalizarTexto(txt) {
  if (!txt) return "";
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function filtrarClientes(termo) {
  const termoNormalizado = normalizarTexto(termo);
  const termoNumeros = termo.replace(/\D/g, "");

  document.querySelectorAll("#tabela tbody tr").forEach(tr => {
    if (!termoNormalizado && !termoNumeros) {
      tr.style.display = ""; // mostra todos
      return;
    }

    const textoLinhaNormalizado = normalizarTexto(tr.innerText);
    const documento = tr.dataset.documento || "";
    const telefone = tr.dataset.telefone || "";

    let match = false;
    if (termoNormalizado && textoLinhaNormalizado.includes(termoNormalizado)) {
      match = true;
    }
    if (termoNumeros && (documento.includes(termoNumeros) || telefone.includes(termoNumeros))) {
      match = true;
    }

    tr.style.display = match ? "" : "none";
  });
}

// --- Filtro de cilindros ---
function filtrarCilindros({ gas, tamanho, proprietario, locacao }) {
  const linhas = document.querySelectorAll("#tabela tbody tr");

  const gasN = normalizeCompare(gas || "");
  const tamN = normalizeCompare(tamanho || "");
  const propN = normalizeCompare(proprietario || "");
  const locN = normalizeCompare(locacao || "");

  linhas.forEach(row => {
    let visivel = true;

    if (!gasN && !tamN && !propN && !locN) {
      row.style.display = "";
      return;
    }

    try {
      const cilindros = JSON.parse(row.dataset.cilindros || "[]");

      if ((!cilindros || cilindros.length === 0) && (gasN || tamN || propN || locN)) {
        visivel = false;
      } else {
        const match = cilindros.some(c => {
          const gasOk = !gasN || normalizeCompare(c.gas) === gasN;
          const tamOk = !tamN || normalizeCompare(c.tamanho) === tamN;
          const propOk = !propN || normalizeCompare(c.proprietario) === propN;
          const locOk = !locN || normalizeCompare(c.locacao) === locN;
          return gasOk && tamOk && propOk && locOk;
        });

        if (!match) visivel = false;
      }
    } catch (e) {
      console.warn("Erro parse cilindros:", e);
      visivel = false;
    }

    row.style.display = visivel ? "" : "none";
  });

  console.log("Critérios:", { gasN, tamN, propN, locN });
}

// --- Preencher tamanhos conforme gás ---
document.getElementById("filtro-gas")?.addEventListener("change", () => {
  const gas = document.getElementById("filtro-gas").value;
  const selectTamanho = document.getElementById("filtro-tamanho");

  selectTamanho.innerHTML = `<option value="">Todos</option>`;

  if (!gas) {
    selectTamanho.disabled = true;
    return;
  }

  const tamanhos = new Map();
  document.querySelectorAll("#tabela tbody tr").forEach(row => {
    try {
      const cilindros = JSON.parse(row.dataset.cilindros || "[]");
      cilindros.forEach(c => {
        if (normalizeCompare(c.gas) === normalizeCompare(gas) && c.tamanho) {
          tamanhos.set(normalizeCompare(c.tamanho), c.tamanho); // chave = normalizado, valor = original
        }
      });
    } catch {}
  });

  tamanhos.forEach((label, valNorm) => {
    const opt = document.createElement("option");
    opt.value = valNorm;
    opt.textContent = label;
    selectTamanho.appendChild(opt);
  });

  selectTamanho.disabled = false;
});

// --- Formulário de filtros ---
document.getElementById("form-filtro")?.addEventListener("submit", e => {
  e.preventDefault();
  const gas = document.getElementById("filtro-gas").value;
  const tamanho = document.getElementById("filtro-tamanho").value;
  const proprietario = document.getElementById("filtro-proprietario").value;
  const locacao = document.getElementById("filtro-locacao").value;

  filtrarCilindros({ gas, tamanho, proprietario, locacao });
});

// --- Botão reset ---
document.getElementById("reset-filtro")?.addEventListener("click", () => {
  document.getElementById("form-filtro").reset();
  document.querySelectorAll("#tabela tbody tr").forEach(row => (row.style.display = ""));
  document.getElementById("filtro-tamanho").disabled = true;
});

// --- Filtro rápido input ---
document.getElementById("filtroRapido")?.addEventListener("input", ev => {
  filtrarClientes(ev.target.value);
});




async function excluirCliente(id) {
  const confirmacao = await Swal.fire({
    title: "Tem certeza?",
    text: "Essa ação não pode ser desfeita!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar",
    cancelButtonColor:"red",
    confirmButtonColor:"#08451C",
     color:"black",
  });

  if (!confirmacao.isConfirmed) return;

  try {
    const resp = await fetch(`http://localhost:3000/api/clientes/${id}`, {
      method: "DELETE"
    });
    const data = await resp.json();

    if (data.ok) {
      await Swal.fire({
        title: "Excluído!",
        text: "O cliente foi removido com sucesso.",
        icon: "success",
        confirmButtonText: "OK"
      });
      carregarClientes(); 
    } else {
      Swal.fire("Erro", data.error || "Não foi possível excluir.", "error");
    }
  } catch (e) {
    console.error(e);
    Swal.fire("Erro", "Erro ao excluir cliente", "error");
  }
}

function editarCliente(id) {
  window.location.href = `../CadastroClientes/cadclientes.html?id=${id}`;
}



// --- função para buscar detalhes de um cliente ---
async function verDetalhes(id) {
  try {
    const resp = await fetch(`http://localhost:3000/api/clientes/${id}`);
    const c = await resp.json();

    const labelCidade = c.area === 'rural' ? 'Município' : 'Cidade';
    const cidadeOuMunicipio = c.area === 'rural' ? (c.municipio || '-') : (c.cidade || '-');

    const cilindroHtml = (c.cilindros && c.cilindros.length)
      ? c.cilindros.map((ci, idx) => `
        <div class="cil-card">
        <div><b>Gás:</b> <span>${gases[ci.gas] || ci.gas || '-'}</span></div>
          <div><b>Tamanho:</b> <span>${ci.tamanho || '-'}</span></div>
          <div><b>Quantidade:</b> <span>${ci.qnt ?? '-'}</span></div>
          <div><b>Preço Gás:</b> <span>${formatBRL(ci.precogas)}</span></div>
          <div><b>Locação:</b> <span>${ci.locacao || '-'}</span></div>
          ${ci.locacao === 'Sim' ? `
            <div><b>Preço Locação:</b> <span>${formatBRL(ci.preco_locacao)}</span></div>
            <div><b>Período:</b> <span>${ci.periodo || '-'}</span></div>
            <div><b>Início da Locação:</b> <span>${formatarDataSimples(ci.inicio) || '-'}</span></div>
            <div><b>Fim da Locação:</b> <span>${formatarDataSimples(ci.fim) || '-'}</span></div>
          ` : ''}
          <div><b>Cilindro:</b> <span>${ci.proprietario || '-'}</span></div>
          ${ci.aplicado ? `<div><b>Início da Aplicação:</b><span>${formatarDataSimples(ci.aplicado)}</span></div>` : ''}
        </div>
      `).join('')
      : `<p class="muted">Nenhum cilindro cadastrado</p>`;

    const html = `
      <div class="detalhes-grid">
        <div><b>ID</b><span>${c.id}</span></div>
        <div><b>Nome</b><span>${c.nome || '-'}</span></div>
        <div><b>Segmento</b><span>${c.profissao || '-'}</span></div>
        <div><b>CPF/CNPJ</b><span>${c.documento || '-'}</span></div>
        <div><b>Telefone</b><span>${c.telefone || '-'}</span></div>
        <div><b>Email</b><span>${c.email || '-'}</span></div>
        <div><b>Área</b><span>${c.area || '-'}</span></div>
        <div><b>${labelCidade}</b><span>${cidadeOuMunicipio}</span></div>
        <div><b>Endereço</b><span>${c.endereco || '-'}</span></div>
        <div><b>Número</b><span>${c.numero || '-'}</span></div>
        <div><b>CEP</b><span>${c.cep || '-'}</span></div>
        <div><b>Complemento</b><span>${c.complemento || '-'}</span></div>
        <div><b>Ponto Ref.</b><span>${c.ponto || '-'}</span></div>
        <div><b>Criado em</b><span>${formatarData(c.criado_em) || '-'}</span></div>
      </div>

      <h3 class="sec-title">Cilindros</h3>
      <div class="cil-grid">${cilindroHtml}</div>
    `;

    console.log("Cilindros recebidos do servidor:", c.cilindros);

    Swal.fire({
      title: "Detalhes do Cliente",
      html,
      width: 800,
      confirmButtonText: "Fechar",
      customClass: {
        popup: 'swal-detalhes',
        title: 'swal-detalhes__title',
        confirmButton: 'swal-detalhes__btn',
        htmlContainer: 'swal-detalhes__content'
      }
    });
  } catch (e) {
    console.error(e);
    Swal.fire("Erro", "Erro ao carregar detalhes do cliente", "error");
  }
}

function formatBRL(v) {
  if (v == null || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataISO) {
  if (!dataISO) return "-";

  // Se já estiver no formato brasileiro, retorna como está
  if (typeof dataISO === 'string' && dataISO.includes('/')) {
    return dataISO;
  }

  // Cria a data em UTC
  const data = new Date(dataISO + "Z"); // força interpretar como UTC

  // Verifica se é uma data válida
  if (isNaN(data.getTime())) {
    return dataISO; // Retorna original se não for data válida
  }

  // Ajusta para fuso horário de Brasília (UTC-3)
  data.setHours(data.getHours());

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  const segundos = String(data.getSeconds()).padStart(2, "0");

  return `${dia}/${mes}/${ano} ${horas}:${minutos}:${segundos}`;
}

function formatarDataSimples(dataISO) {
  if (!dataISO || dataISO === '-') return '-';

  // Se já estiver no formato brasileiro, retorna como está
  if (typeof dataISO === 'string' && dataISO.includes('/')) {
    return dataISO;
  }

  try {
    const data = new Date(dataISO + "T00:00:00Z"); // Força UTC
    if (isNaN(data.getTime())) return dataISO;

    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return dataISO;
  }
}