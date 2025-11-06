
// ==============================
// Configurações e estado global
// ==============================
const API_BASE = "http://localhost:3000";
let modoEdicao = false;
let clienteId = null;
let enviando = false;
let contadorCilindros = 0;

// Tamanhos por gás
const TAM_CILIND = {
  OM: ['01L (Aluminio)','03L (Aço)','03L (Aluminio)','05L (Aluminio)','07L','10L','16L','20L','21L','30L','40L','50L','White Med'],
  AC: ['07L','16L','50L'],
  ON: ['02KG','4,5KG','07KG','14KG','28KG','33KG'],
  OI: ['07L','10L','16L','20L','50L'],
  Arg: ['07L','20L','40L','50L'],
  Hel: ['07L','20L','21L','40L','50L'],
  Ace: ['01KG (A40)','05KG','07KG','09KG'],
  GS: ['07L','20L','40L','50L'],
  Nit: ['07L','20L','40L','50L'],
  CO2: ['02KG','04KG','06KG','09KG','18KG','23KG','33KG','Soda Stream'],
  usp: ['4,5KG','23KG','33KG'],
  conserv: ['07L','20L','50L'],
  etil: ['40L'],
};

// ==============================
// Utilitários
// ==============================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function onlyDigits(str) { return String(str || "").replace(/\D/g, ""); }

function moedaBR(valorNumber) {
  return Number(valorNumber || 0).toLocaleString("pt-BR", { 
    style: "currency", 
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function uniquePush(list, msg) {
  if (!list.includes(msg)) list.push(msg);
}

function getGruposCilindros() {
  return $$('.grupo-cilindro')
    .filter(g => !g.closest('#template-cilindro') && g.offsetParent !== null);
}

// ==============================
// Máscaras
// ==============================
function maskDocumento(e) {
  let v = onlyDigits(e.target.value);
  if (v.length <= 11) {
    v = v.replace(/^(\d{3})(\d)/, '$1.$2');
    v = v.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  } else {
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4');
    v = v.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
  }
  e.target.value = v;
}

function maskTelefone(e) {
  let v = onlyDigits(e.target.value);
  if (v.length > 0) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1)$2-$3');
  }
  e.target.value = v;
}

function maskCEP(e) {
  let v = onlyDigits(e.target.value);
  if (v.length > 5) v = v.slice(0, 8);
  if (v.length > 5) v = v.replace(/^(\d{5})(\d+)/, '$1-$2');
  e.target.value = v;
}

// ==============================
// Formatação de preço
// ==============================
function formatarPreco(input) {
  const hidden = input.nextElementSibling;
  let dig = onlyDigits(input.value);
  
  if (!dig || dig === '0') {
    input.value = '';
    if (hidden) hidden.value = '';
    return;
  }
  
  const num = Number(dig) / 100;
  input.value = moedaBR(num);
  if (hidden) hidden.value = num.toFixed(2);
}

function bindPrecoListeners(root = document) {
  $$('.preco-gas, .preco-locacao', root).forEach(inp => {
    formatarPreco(inp);
    inp.addEventListener('input', () => formatarPreco(inp));
  });
}

// ==============================
// Área Urbana/Rural
// ==============================
function limparCampos(container) {
  if (!container) return;
  $$('input, select, textarea', container).forEach(inp => {
    if (inp.type === 'radio' || inp.type === 'checkbox') {
      inp.checked = false;
    } else {
      inp.value = '';
    }
    inp.classList.remove('erro');
    inp.disabled = true;
  });
}

function ativarCampos(container) {
  if (!container) return;
  $$('input, select, textarea', container).forEach(inp => inp.disabled = false);
}

function setupAreaUrbanaRural() {
  const radios = $$('input[name="area"]');
  const formU = $('#form-urbano');
  const formR = $('#form-rural');

  function apply(valor) {
    if (valor === 'urbana') {
      formU.style.display = 'block';
      formR.style.display = 'none';
      limparCampos(formR);
      ativarCampos(formU);
    } else if (valor === 'rural') {
      formU.style.display = 'none';
      formR.style.display = 'block';
      limparCampos(formU);
      ativarCampos(formR);
    }
  }

  radios.forEach(r => r.addEventListener('change', () => apply(r.value)));

  // Inicial: ambos desabilitados
  limparCampos(formU);
  limparCampos(formR);
  formU.style.display = 'none';
  formR.style.display = 'none';
}

// ==============================
// Condicionais por proprietário
// ==============================
function configurarCondicionais(grupo) {
  const condicionais = $$('.condicional', grupo);
  const radios = $$('input[type="radio"][name^="cilindro_"]', grupo);

  function atualizar() {
    const val = $('input[type="radio"][name^="cilindro_"]:checked', grupo)?.value;
    condicionais.forEach(div => {
      div.style.display = (div.dataset.showIf === val) ? 'block' : 'none';
    });
  }

  radios.forEach(r => r.addEventListener('change', atualizar));
  atualizar();
}

// ==============================
// Locação: mostrar blocos
// ==============================
function mostrarDinamico(radio) {
  const bloco = radio.closest('.grupo-cilindro');
  const posloc = $('.posloc', bloco);
  const perloc = $('.perloc', bloco);
  const intloc = $('.intloc', bloco);

  if (radio.value === 'Sim') {
    posloc.style.display = 'block';
  } else {
    posloc.style.display = 'none';
    perloc.style.display = 'none';
    intloc.style.display = 'none';
    $$('input[name^="detint_"]', bloco).forEach(r => r.checked = false);
    $$('input[type="date"]', bloco).forEach(i => i.value = '');
    return;
  }

  const radioDet = $('input[name^="detint_"]:checked', bloco);
  if (radioDet?.value === 'Determinado') {
    perloc.style.display = 'block';
    intloc.style.display = 'none';
  } else if (radioDet?.value === 'Indeterminado') {
    intloc.style.display = 'block';
    perloc.style.display = 'none';
  } else {
    perloc.style.display = 'none';
    intloc.style.display = 'none';
  }
}

function detlocDinamico(radio) {
  const bloco = radio.closest('.grupo-cilindro');
  const perloc = $('.perloc', bloco);
  const intloc = $('.intloc', bloco);

  if (radio.value === 'Determinado') {
    perloc.style.display = 'block';
    intloc.style.display = 'none';
  } else {
    intloc.style.display = 'block';
    perloc.style.display = 'none';
  }
}

// ==============================
// Gás → tamanhos
// ==============================
function atualizarItensDinamico(selectGases) {
  const gas = selectGases.value;
  const bloco = selectGases.closest('.grupo-cilindro');
  const selectTamanhos = $('select.tamanho', bloco);
  selectTamanhos.innerHTML = '<option value="">Escolha um Tamanho</option>';

  if (TAM_CILIND[gas]) {
    TAM_CILIND[gas].forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.toLowerCase();
      opt.textContent = item;
      selectTamanhos.appendChild(opt);
    });
  }
}

// ==============================
// Adicionar/Remover cilindros
// ==============================
function adicionarCilindro() {
  contadorCilindros++;

  const template = $('#template-cilindro');
  const clone = template.cloneNode(true);
  clone.style.display = 'block';
  clone.removeAttribute('id');

  // Atualizar nomes dos radios
  $$('input[name="cilindro-temporario"]', clone).forEach(r => {
    r.name = `cilindro_${contadorCilindros}`;
  });
  
  $$('input[name="locacao-temporario"]', clone).forEach(r => {
    r.name = `locacao_${contadorCilindros}`;
    r.addEventListener('change', function() { mostrarDinamico(this); });
  });
  
  $$('input[name="detint-temporario"]', clone).forEach(r => {
    r.name = `detint_${contadorCilindros}`;
    r.addEventListener('change', function() { detlocDinamico(this); });
  });

  // Configurar eventos do select de gás
  const selectGas = $('select.gas', clone);
  if (selectGas) {
    selectGas.addEventListener('change', function() { atualizarItensDinamico(this); });
  }

  // Configurar botão de remover
  const btnRemover = $('.remover-cilindro', clone);
  if (btnRemover) {
    btnRemover.addEventListener('click', () => clone.remove());
  }

  $('#container-cilindros').appendChild(clone);

  // Configurar formatação de preço
  bindPrecoListeners(clone);
  configurarCondicionais(clone);
  
  return clone;
}

function setPrecoCampo(inputMoeda, valorNumero) {
  if (!inputMoeda) return;
  const hidden = inputMoeda.nextElementSibling;
  if (!hidden) return;
  
  if (valorNumero == null || valorNumero === '') {
    inputMoeda.value = '';
    hidden.value = '';
  } else {
    hidden.value = Number(valorNumero).toFixed(2);
    inputMoeda.value = moedaBR(Number(valorNumero));
  }
}

function adicionarCilindroExistente(c) {
  const grupo = adicionarCilindro();

  // Preencher dados do cilindro
  const selGas = $('.gas', grupo);
  if (selGas && c.gas) {
    selGas.value = c.gas;
    atualizarItensDinamico(selGas);
  }

  const selTam = $('.tamanho', grupo);
  if (selTam && c.tamanho) {
    // Aguardar um pouco para o select ser preenchido
    setTimeout(() => {
      selTam.value = (c.tamanho || '').toLowerCase();
    }, 100);
  }

  // Preços
  setPrecoCampo($('.preco-gas', grupo), c.precogas);
  setPrecoCampo($('.preco-locacao', grupo), c.preco_locacao);

  // Quantidade
  const qnt = $('.qnt', grupo);
  if (qnt && c.qnt) qnt.value = c.qnt;

  // Proprietário
  if (c.proprietario) {
    const radios = $$(`input[name^="cilindro_"]`, grupo);
    const radio = radios.find(r => r.value === c.proprietario);
    if (radio) {
      radio.checked = true;
      configurarCondicionais(grupo);
    }
  }

  // Locação
  if (c.locacao) {
    const radios = $$(`input[name^="locacao_"]`, grupo);
    const radio = radios.find(r => r.value === c.locacao);
    if (radio) {
      radio.checked = true;
      mostrarDinamico(radio);
    }
  }

  // Período
  if (c.periodo) {
    const radios = $$(`input[name^="detint_"]`, grupo);
    const radio = radios.find(r => r.value === c.periodo);
    if (radio) {
      radio.checked = true;
      detlocDinamico(radio);
    }
  }

  // Datas
  if (c.periodo === 'Determinado') {
    $('.inicio_determinado', grupo).value = c.inicio || '';
    $('.fim_determinado', grupo).value = c.fim || '';
  } else if (c.periodo === 'Indeterminado') {
    $('.inicio_indeterminado', grupo).value = c.inicio || '';
  }

  // Aplicação
  if (c.aplicado) {
    $('.aplicacao', grupo).value = c.aplicado || '';
  }
}

// ==============================
// CEP → endereço (ViaCEP)
// ==============================
async function preencherPorCEP() {
  const cepInput = $('#cep');
  if (!cepInput) return;
  const cep = onlyDigits(cepInput.value);
  if (cep.length !== 8) {
    Swal.fire("CEP inválido", "Digite 8 números.", "warning");
    return;
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) {
      Swal.fire("CEP não encontrado", "Confira o CEP digitado.", "warning");
      return;
    }
    $('#endereco').value = data.logradouro || '';
    $('#cidade').value = data.localidade || '';
  } catch (e) {
    console.error(e);
    Swal.fire("Erro", "Erro ao buscar o CEP.", "error");
  }
}

// ==============================
// Coleta e validação
// ==============================
function coletarCilindros() {
  const arr = [];
  const grupos = getGruposCilindros();
  
  grupos.forEach(grupo => {
    const cilindro = {
      gas: $('.gas', grupo)?.value || null,
      tamanho: $('.tamanho', grupo)?.value || null,
      precogas: $('.preco-gas-numerico', grupo)?.value || null,
      qnt: $('.qnt', grupo)?.value || null,
      locacao: $('input[name^="locacao_"]:checked', grupo)?.value || null,
      preco_locacao: $('.preco-locacao-numerico', grupo)?.value || null,
      periodo: $('input[name^="detint_"]:checked', grupo)?.value || null,
      inicio: null,
      fim: null,
      aplicado: $('.aplicacao', grupo)?.value || null,
      proprietario: grupo.querySelector('input[type="radio"][name^="cilindro_"]:checked')?.value || null

      
    };
    



    // Datas conforme o período
    if (cilindro.periodo === 'Determinado') {
      cilindro.inicio = $('.inicio_determinado', grupo)?.value || null;
      cilindro.fim = $('.fim_determinado', grupo)?.value || null;
    } else if (cilindro.periodo === 'Indeterminado') {
      cilindro.inicio = $('.inicio_indeterminado', grupo)?.value || null;
    }

    arr.push(cilindro);
  });
  
  return arr;
}

function validarFormulario() {
  // Limpar erros antigos
  $$('.erro').forEach(el => el.classList.remove('erro'));

  const erros = [];

  // Documento
  const doc = $('#documento');
  const docNum = onlyDigits(doc?.value);
  if (doc && (docNum.length !== 11 && docNum.length !== 14)) {
    doc.classList.add('erro');
    uniquePush(erros, 'Documento inválido: deve conter o CPF ou o CNPJ');
  }

  // Telefone
  const tel = $('#telefone');
  const telNum = onlyDigits(tel?.value);
  if (tel && telNum.length !== 11) {
    tel.classList.add('erro');
    uniquePush(erros, 'Telefone inválido (use DDD + 9 dígitos)');
  }

  // Área
  const areaSel = $('input[name="area"]:checked');
  if (!areaSel) {
    uniquePush(erros, 'Selecione se é área Urbana ou Rural');
  }

  // Campos obrigatórios por área
  const camposUrbano = [
    { id: 'nome', msg: 'Preencha o campo Nome' },
    { id: 'profissao', msg: 'Preencha o campo Segmento' },
    { id: 'endereco', msg: 'Preencha o campo Endereço' },
    { id: 'numero', msg: 'Preencha o campo Número' },
    { id: 'cep', msg: 'Preencha o campo CEP' },
    { id: 'cidade', msg: 'Preencha o campo Cidade' }
  ];
  
  const camposRural = [
    { id: 'nome', msg: 'Preencha o campo Nome' },
    { id: 'profissao', msg: 'Preencha o campo Segmento' },
    { id: 'municipio', msg: 'Preencha o campo Municipio' }
  ];

  const tipoArea = areaSel?.value;
  const campos = (tipoArea === 'rural') ? camposRural : camposUrbano;

  campos.forEach(c => {
    const inp = $('#' + c.id);
    if (!inp || inp.offsetParent === null || inp.disabled) return;
    if (String(inp.value).trim() === '') {
      inp.classList.add('erro');
      uniquePush(erros, c.msg);
    }
  });

  // Cilindros
  const grupos = getGruposCilindros();
  if (grupos.length === 0) {
    uniquePush(erros, 'Adicione pelo menos um cilindro');
  } else {
    grupos.forEach(grupo => {
      const gas = $('.gas', grupo);
      const tam = $('.tamanho', grupo);
      const qnt = $('.qnt', grupo);
      const precoGas = $('.preco-gas', grupo);
      const rCil = $('input[name^="cilindro_"]:checked', grupo);
      const rLoc = $('input[name^="locacao_"]:checked', grupo);

      if (!gas || !gas.value) { 
        gas?.classList.add('erro'); 
        uniquePush(erros, 'Selecione um Gás'); 
      }
      if (!tam || !tam.value) { 
        tam?.classList.add('erro'); 
        uniquePush(erros, 'Selecione um Tamanho'); 
      }
      if (!rCil) {
        $$('input[name^="cilindro_"]', grupo).forEach(r => r.classList.add('erro'));
        uniquePush(erros, 'Selecione Cilindro Aplicado ou Próprio');
      }
      if (!precoGas || precoGas.value.trim() === "") {
        precoGas?.classList.add('erro');
        uniquePush(erros, 'Preencha o Preço do Gás');
      }
      if (!qnt || !qnt.value) { 
        qnt?.classList.add('erro'); 
        uniquePush(erros, 'Selecione uma Quantidade'); 
      }

      if (rLoc) {
        if (rLoc.value === 'Sim') {
          const precoLoc = $('.preco-locacao', grupo);
          const rDet = $('input[name^="detint_"]:checked', grupo);

          if (!precoLoc || precoLoc.value.trim() === "") {
            precoLoc?.classList.add('erro');
            uniquePush(erros, 'Preencha o Preço da Locação');
          }

          if (!rDet) {
            $$('input[name^="detint_"]', grupo).forEach(r => r.classList.add('erro'));
            uniquePush(erros, 'Escolha entre período Determinado ou Indeterminado');
          } else if (rDet.value === 'Determinado') {
            const ini = $('.inicio_determinado', grupo);
            const fim = $('.fim_determinado', grupo);
            if (!ini || !ini.value) { 
              ini?.classList.add('erro'); 
              uniquePush(erros, 'Preencha a Data de Início da Locação'); 
            }
            if (!fim || !fim.value) { 
              fim?.classList.add('erro'); 
              uniquePush(erros, 'Preencha a Data de Fim da Locação'); 
            }
          } else if (rDet.value === 'Indeterminado') {
            const iniInt = $('.inicio_indeterminado', grupo);
            if (!iniInt || !iniInt.value) { 
              iniInt?.classList.add('erro'); 
              uniquePush(erros, 'Preencha a Data de Início da Locação'); 
            }
          }
        }
      } else {
        $$('input[name^="locacao_"]', grupo).forEach(r => r.classList.add('erro'));
        uniquePush(erros, 'Selecione se o Cilindro é de Locação');
      }

      // Validação condicional para aplicação
      const aplicacao = $('.aplicacao', grupo);
      const proprietario = $('input[name^="cilindro_"]:checked', grupo)?.value;
      if (proprietario === 'Aplicado' && (!aplicacao || !aplicacao.value)) {
        aplicacao?.classList.add('erro');
        uniquePush(erros, 'Preencha o campo Início da Aplicação');
      }
    });
  }

  return { ok: erros.length === 0, erros };
}

// ==============================
// Carregar cliente (edição)
// ==============================
async function carregarCliente(id) {
  try {
    const res = await fetch(`${API_BASE}/api/clientes/${id}`);
    if (!res.ok) throw new Error("Erro ao carregar cliente");
    const cliente = await res.json();
    preencherFormulario(cliente);
  } catch (err) {
    console.error(err);
    Swal.fire("Erro", "Não foi possível carregar os dados do cliente!", "error");
  }
}

function preencherFormulario(c) {
  $('#nome').value = c.nome || '';
  $('#profissao').value = c.profissao || '';
  $('#documento').value = c.documento || '';
  $('#telefone').value = c.telefone || '';
  $('#email').value = c.email || '';
  
  const areaRadio = c.area ? $(`input[name="area"][value="${c.area}"]`) : null;
  if (areaRadio) {
    areaRadio.checked = true;
    areaRadio.dispatchEvent(new Event('change'));
  }
  
  $('#endereco').value = c.endereco || '';
  $('#numero').value = c.numero || '';
  $('#cep').value = c.cep || '';
  $('#cidade').value = c.cidade || '';
  $('#complemento').value = c.complemento || '';
  $('#municipio').value = c.municipio || '';
  $('#ponto').value = c.ponto || '';

  // Limpa cilindros atuais
  $('#container-cilindros').innerHTML = '';

  if (Array.isArray(c.cilindros) && c.cilindros.length) {
    c.cilindros.forEach(ci => adicionarCilindroExistente(ci));
  }
}

function resetFormularioDepoisDeCadastrar() {
  const form = $('#formCliente');
  if (form) form.reset();

  // Esconder e desabilitar blocos de endereço
  const formU = $('#form-urbano');
  const formR = $('#form-rural');
  if (formU) { 
    formU.style.display = 'none'; 
    limparCampos(formU); 
  }
  if (formR) { 
    formR.style.display = 'none'; 
    limparCampos(formR); 
  }

  // Limpar radios de área
  $$('input[name="area"]').forEach(r => r.checked = false);

  // Limpar cilindros
  const cont = $('#container-cilindros');
  if (cont) cont.innerHTML = '';
  contadorCilindros = 0;

  // Tirar marcações de erro
  $$('.erro').forEach(el => el.classList.remove('erro'));
  
  // Focar no primeiro campo
  $('#nome')?.focus();
}

// ==============================
// Submit (cadastro/edição) - REDIRECIONAMENTO GARANTIDO
// ==============================
async function handleSubmit(event) {
  if (event) event.preventDefault();

  if (enviando) return;
  enviando = true;

  try {
    const { ok, erros } = validarFormulario();
    if (!ok) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos obrigatórios!',
        html: erros.map(m => `• ${m}`).join('<br>'),
        showConfirmButton: true,
        confirmButtonColor: "#08451C",
      });
      enviando = false;
      return;
    }

    const payload = {
      nome: $('#nome')?.value,
      profissao: $('#profissao')?.value,
      documento: $('#documento')?.value,
      telefone: $('#telefone')?.value,
      email: $('#email')?.value,
      area: $('input[name="area"]:checked')?.value,
      endereco: $('#endereco')?.value,
      numero: $('#numero')?.value,
      cep: $('#cep')?.value,
      cidade: $('#cidade')?.value,
      complemento: $('#complemento')?.value,
      municipio: $('#municipio')?.value,
      ponto: $('#ponto')?.value,
      cilindros: coletarCilindros(),
    };

    const url = (modoEdicao && clienteId)
      ? `${API_BASE}/api/clientes/${clienteId}`
      : `${API_BASE}/api/clientes`;

    const method = (modoEdicao && clienteId) ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // ⚠️ CPF/CNPJ duplicado
    if (res.status === 409 && data.aviso) {
      await Swal.fire({
        icon: 'warning',
        title: 'Cliente já cadastrado',
        text: data.message || 'Já existe um cliente com este CPF ou CNPJ.',
        confirmButtonColor: "#08451C",
      });
      enviando = false;
      return;
    }

    // 🟥 Outros erros
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Erro ao salvar cliente");
    }

    // 🟢 Sucesso
    if (modoEdicao) {
      console.log('Redirecionando PARA LISTA DE CLIENTES');
      window.location.href = "../ClientesCadastrados/listaclientes.html";
    } else {
      await Swal.fire({
        icon: 'success',
        title: 'Cadastrado!',
        text: 'Cliente cadastrado com sucesso!',
        confirmButtonColor: "#08451C",
        showConfirmButton: true,
      });
      resetFormularioDepoisDeCadastrar();
    }

  } catch (err) {
    console.error('Erro no handleSubmit:', err);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: err.message || "Erro de conexão com o servidor!",
      confirmButtonColor: "#08451C"
    });
  } finally {
    enviando = false;
  }
}

// ==============================
// VERIFICAÇÃO DE MODO EDIÇÃO NA INICIALIZAÇÃO
// ==============================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM carregado');
  
  // máscaras
  $('#documento')?.addEventListener('input', maskDocumento);
  $('#telefone')?.addEventListener('input', maskTelefone);
  $('#cep')?.addEventListener('input', maskCEP);
  $('#cep')?.addEventListener('blur', preencherPorCEP);

  // moeda
  bindPrecoListeners();

  // área urbana/rural
  setupAreaUrbanaRural();

  // submit do form
  const form = $('#formCliente');
  console.log('Form encontrado:', form);
  if (form) {
    form.addEventListener('submit', handleSubmit);
    console.log('Event listener de submit adicionado');
  }

  // modo edição (via ?id=)
  const params = new URLSearchParams(window.location.search);
  clienteId = params.get('id');
  console.log('Parâmetros URL - ID:', clienteId);
  
  if (clienteId) {
    modoEdicao = true;
    console.log('MODO EDIÇÃO ATIVADO');
    
    // personaliza UI
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = 'Editar Cliente';
    
    const btn = document.querySelector('button[type="submit"]');
    if (btn) btn.textContent = 'Atualizar Cadastro';

    console.log('Carregando cliente...');
    await carregarCliente(clienteId);
  } else {
    console.log('Modo cadastro novo');
  }
});
// ==============================
// Inicialização
// ==============================
document.addEventListener('DOMContentLoaded', async () => {
  // Máscaras
  $('#documento')?.addEventListener('input', maskDocumento);
  $('#telefone')?.addEventListener('input', maskTelefone);
  $('#cep')?.addEventListener('input', maskCEP);
  $('#cep')?.addEventListener('blur', preencherPorCEP);

  // Formatação de preço
  bindPrecoListeners();

  // Área urbana/rural
  setupAreaUrbanaRural();

  // Submit do form
  const form = $('#formCliente');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Modo edição (via ?id=)
  const params = new URLSearchParams(window.location.search);
  clienteId = params.get('id');
  if (clienteId) {
    modoEdicao = true;
    
    // Personaliza UI
    const h1 = $('h1');
    if (h1) h1.textContent = 'Editar Cliente';
    
    const btn = $('button[type="submit"]');
    if (btn) btn.textContent = 'Atualizar Cadastro';

    await carregarCliente(clienteId);
  }
});

// ==============================
// Expor funções globais
// ==============================
window.adicionarCilindro = adicionarCilindro;
window.mostrarDinamico = mostrarDinamico;
window.detlocDinamico = detlocDinamico;
window.atualizarItensDinamico = atualizarItensDinamico;
window.formatarPreco = formatarPreco;