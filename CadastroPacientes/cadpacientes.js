let contadorCilindros = 0;

function adicionarCilindro() {
  contadorCilindros++;

  const template = document.getElementById('template-cilindro');
  const clone = template.cloneNode(true);
  clone.style.display = 'block';
  clone.removeAttribute('id');

  
  const radiosCilindro = clone.querySelectorAll('input[name="cilindro-temporario"]');
  radiosCilindro.forEach(r => r.name = `cilindro_${contadorCilindros}`);

  const radiosLocacao = clone.querySelectorAll('input[name="locacao-temporario"]');
  radiosLocacao.forEach(r => {
    r.name = `locacao_${contadorCilindros}`;
    r.setAttribute('onchange', 'mostrarDinamico(this)');
  });

  const radiosDet = clone.querySelectorAll('input[name="detint-temporario"]');
  radiosDet.forEach(r => {
    r.name = `detint_${contadorCilindros}`;
    r.setAttribute('onchange', 'detlocDinamico(this)');
  });


  document.getElementById('container-cilindros').appendChild(clone);

  clone.querySelectorAll('.preco-gas,.preco-locacao').forEach(input => {
    formatarPreco(input);
  });

    // Adiciona botão de remover cilindro
  const botaoRemover = clone.querySelector('.remover-cilindro');
  botaoRemover.addEventListener('click', () => {
    clone.remove();
  });


  configurarCondicionais(clone);
  

}

function mostrarDinamico(radio) {
  const bloco = radio.closest('.grupo-cilindro');
  const posloc = bloco.querySelector('.posloc');
  const perloc = bloco.querySelector('.perloc');
  const intloc = bloco.querySelector('.intloc');

  // Mostra ou esconde a área principal de locação
  if (radio.value === 'sim') {
    posloc.style.display = 'block';
  } else {
    posloc.style.display = 'none';
    perloc.style.display = 'none';
    intloc.style.display = 'none';

    // Limpa seleção e campos de datas
    bloco.querySelectorAll('input[name="detint-temporario"]').forEach(r => r.checked = false);
    bloco.querySelectorAll('input[type="date"]').forEach(i => i.value = '');
    return;
  }

  // Verifica se já foi selecionado determinado ou indeterminado
  const radioDet = bloco.querySelector('input[name="detint-temporario"]:checked');
  if (radioDet) {
    if (radioDet.value === 'determinado') {
      perloc.style.display = 'block';
      intloc.style.display = 'none';
    } else if (radioDet.value === 'indeterminado') {
      perloc.style.display = 'none';
      intloc.style.display = 'block';
    }
  } else {
    perloc.style.display = 'none';
    intloc.style.display = 'none';
  }
}

function detlocDinamico(radio) {
  const bloco = radio.closest('.grupo-cilindro');
  const perloc = bloco.querySelector('.perloc');
  const intloc = bloco.querySelector('.intloc');

  if (radio.value === 'determinado') {
    perloc.style.display = 'block';
    intloc.style.display = 'none';
  } else if (radio.value === 'indeterminado') {
    intloc.style.display = 'block';
    perloc.style.display = 'none';
  }
}



function cadastrar(event) {
  event.preventDefault();

  
  document.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));
  const mensagensErro = [];

 

  // Campos para área urbana
  const camposUrbano = [
    { id: 'nomepac', mensagem: 'Preencha o campo Nome do Paciente' },
    { id: 'nomeresp', mensagem: 'Preencha o campo Nome do Responsável' },
    { id: 'profissao', mensagem: 'Preencha o campo Segmento' },
    { id: 'telefone', mensagem: 'Preencha o campo Telefone' },
    { id: 'endereco', mensagem: 'Preencha o campo Endereço' },
    { id: 'numero', mensagem: 'Preencha o campo Número' },
    { id: 'cep', mensagem: 'Preencha o campo CEP' },
    { id: 'cidade', mensagem: 'Preencha o campo Cidade' }
  ];

  // Campos para área rural
  const camposRural = [
    { id: 'nome', mensagem: 'Preencha o campo Nome' },
    { id: 'profissao', mensagem: 'Preencha o campo Segmento' },
    { id: 'telefone', mensagem: 'Preencha o campo Telefone' },
    { id: 'municipio', mensagem: 'Preencha o campo Municipio' }
  ];
const campoDocumento = document.getElementById('cpfpac');
const docNumeros = campoDocumento.value.replace(/\D/g, '');

if (docNumeros.length !== 11) {
  mensagensErro.push('Preencha o campo CPF do Paciente');
  campoDocumento.classList.add('erro');
}

const camporgpac = document.getElementById('rgpac');
const docrgpac = camporgpac.value.replace(/\D/g, '');

if (docrgpac.length !== 9) {
  mensagensErro.push('Preencha o campo RG do Paciente');
  camporgpac.classList.add('erro');
}

const campoDocumento2 = document.getElementById('cpfresp');
const docNumeros2 = campoDocumento2.value.replace(/\D/g, '');

if (docNumeros2.length !== 11) {
  mensagensErro.push('Preencha o campo CPF do Responsável');
  campoDocumento2.classList.add('erro');
}

const camporgresp = document.getElementById('rgresp');
const docrgresp = camporgresp.value.replace(/\D/g, '');

if (docrgresp.length !== 9) {
  mensagensErro.push('Preencha o campo RG do Responsável');
  camporgresp.classList.add('erro');
}

 const areaSelecionada = document.querySelector('input[name="area"]:checked');
  if (!areaSelecionada) {
    mensagensErro.push('Selecione se é área Urbana ou Rural');
  }
  const tipoArea = areaSelecionada?.value;
  // Escolhe os campos conforme o tipo de área
  const camposSelecionados = tipoArea === 'rural' ? camposRural : camposUrbano;
  

  camposSelecionados.forEach(campo => {
    const input = document.getElementById(campo.id);
    if (!input || input.offsetParent === null || input.disabled) return;

    if (input.value.trim() === '') {
      if (!mensagensErro.includes(campo.mensagem)) {
        mensagensErro.push(campo.mensagem);
      }
      input.classList.add('erro');
    }
  }) ;

  

  
// 2. Validação dos cilindros (só se houver cilindros adicionados)
  const gruposCilindros = Array.from(document.querySelectorAll('.grupo-cilindro'))
  .filter(grupo => !grupo.closest('#template-cilindro') && grupo.offsetParent !== null);



  if (gruposCilindros.length > 0) {
    gruposCilindros.forEach((grupo, index) => {
      // Validação básica do cilindro
      const tamanho = grupo.querySelector('#tamanho');
      const concentrador = grupo.querySelector('#concentrador');
      const quantidade = grupo.querySelector('.qnt');
      const radioCilindro = grupo.querySelector('input[name^="cilindro_"]:checked');
      const radioLocacao = grupo.querySelector('input[name^="locacao_"]:checked');
      const precoGas = grupo.querySelector('.preco-gas');
     
      
      


      if (!tamanho || tamanho.value === '') {
        if (!mensagensErro.includes('Selecione um Tamanho')) {
          mensagensErro.push('Selecione um Tamanho');
        }
        if (tamanho) tamanho.classList.add('erro');
      }

       if (!concentrador || concentrador.value === '') {
        if (!mensagensErro.includes('Selecione um Concentrador')) {
          mensagensErro.push('Selecione um Concentrador');
        }
        if (concentrador) concentrador.classList.add('erro');
      }
        if(!radioCilindro){
          mensagensErro.push('Selecione uma opção entre Cilindro Aplicado ou Próprio');
          document.querySelectorAll('input[name="cilindro_"]').forEach(el => el.classList.add('erro'));
        }else if(radioCilindro.value==="aplicado"){
          const cilindrosubopcao = document.getElementById('aplicacao');
          if (!cilindrosubopcao || cilindrosubopcao.value.trim()==='') {
            mensagensErro.push('Preencha o campo de Inicio da Aplicação');
            if(cilindrosubopcao) cilindrosubopcao.classList.add('erro')
          }
        }

      


      if (!precoGas || precoGas.value.trim() === '' || precoGas.value === 'R$ 0,00') {
        if (!mensagensErro.includes('Preencha o Preço do Gás')) {
          mensagensErro.push('Preencha o Preço do Gás');
        }
        if (precoGas) precoGas.classList.add('erro');
      }

       if (!quantidade || quantidade.value === '') {
        if (!mensagensErro.includes('Selecione uma Quantidade')) {
          mensagensErro.push('Selecione uma Quantidade');
        }
        if (quantidade) quantidade.classList.add('erro');
      }
  
      // Validação específica para locação (só se selecionou "Sim" para locação)
      if (radioLocacao) {
        if (radioLocacao.value === 'sim') {
         const precoLocacao = grupo.querySelector('.preco-locacao'); 
          const radioDet = grupo.querySelector('input[name^="detint_"]:checked');

          if (!precoLocacao || precoLocacao.value.trim() === '' || 
      precoLocacao.value === 'R$ 0,00' ||
      precoLocacao.value === precoLocacao.defaultValue) {
    
    if (!mensagensErro.includes('Preencha o Preço da Locação')) {
      mensagensErro.push('Preencha o Preço da Locação');
    }
    if (precoLocacao) {
      precoLocacao.classList.add('erro');
      // Força mostrar a seção se estiver oculta
      const posloc = grupo.querySelector('.posloc');
      if (posloc) posloc.style.display = 'block';
    }
  }

          

          if (!radioDet) {
            if (!mensagensErro.includes('Escolha entre Período Determinado ou Indeterminado')) {
              mensagensErro.push('Escolha entre Período Determinado ou Indeterminado');
            }
            grupo.querySelectorAll('input[name^="detint_"]').forEach(r => r.classList.add('erro'));
          } else if (radioDet.value === 'determinado') {
            const inicio = grupo.querySelector('#inicio_determinado');
            const fim = grupo.querySelector('#fim_determinado');


            if (!inicio || inicio.value.trim() === '') {
              if (!mensagensErro.includes('Preencha a Data de Início da Locação')) {
                mensagensErro.push('Preencha a Data de Início da Locação');
              }
              if (inicio) inicio.classList.add('erro');
            }


            if (!fim || fim.value.trim() === '') {
              if (!mensagensErro.includes('Preencha a Data de Fim da Locação')) {
                mensagensErro.push('Preencha a Data de Fim da Locação');
              }
              if (fim) fim.classList.add('erro');
            }
          }else if(radioDet.value === 'indeterminado'){
            const inicio_int = grupo.querySelector('#inicio_indeterminado')
            if (!inicio_int || inicio_int.value.trim() === '') {
              if (!mensagensErro.includes('Preencha a Data de Início da Locação')) {
                mensagensErro.push('Preencha a Data de Início da Locação');
              }
              if (inicio_int) inicio_int.classList.add('erro');
            }
            
          }
        }
      } else {
        if (!mensagensErro.includes('Selecione se o Cilindro é de Locação')) {
          mensagensErro.push('Selecione se o Cilindro é de Locação');
        }
        grupo.querySelectorAll('input[name^="locacao_"]').forEach(r => r.classList.add('erro'));
      }
    });
  }
 
const cilindrosAdicionados = Array.from(document.querySelectorAll('.grupo-cilindro'))
  .filter(grupo => !grupo.closest('#template-cilindro') && grupo.offsetParent !== null);




if (cilindrosAdicionados.length > 0) {
  // 1. Validação do Suporte Cilindro
  const suporteSelecionado = document.querySelector('input[name="suporte"]:checked');
  if (!suporteSelecionado) {
    mensagensErro.push('Selecione uma opção para Suporte Cilindro');
    document.querySelectorAll('input[name="suporte"]').forEach(el => el.classList.add('erro'));
  }
  

  // 2. Validação da Válvula Reguladora
  const valvulaSelecionada = document.querySelector('input[name="valvula"]:checked');
  if (!valvulaSelecionada) {
    mensagensErro.push('Selecione uma opção para Válvula Reguladora');
    document.querySelectorAll('input[name="valvula"]').forEach(el => el.classList.add('erro'));
  } else if (valvulaSelecionada.id === "valvsim") {
    const valvSubOpcao = document.querySelector('input[name="valvcioxpropria"]:checked');
    if (!valvSubOpcao) {
      mensagensErro.push('Selecione se a Válvula Reguladora é CIOX ou Própria');
      document.querySelectorAll('input[name="valvcioxpropria"]').forEach(el => el.classList.add('erro'));
    }
  }

  // 3. Validação do Transformador
  const transformadorSelecionado = document.querySelector('input[name="transformador"]:checked');
  if (!transformadorSelecionado) {
    mensagensErro.push('Selecione uma opção para Transformador de Energia');
    document.querySelectorAll('input[name="transformador"]').forEach(el => el.classList.add('erro'));
  } else if (transformadorSelecionado.id === "energsim") {
    const transSubOpcao = document.querySelector('input[name="transcioxpropria"]:checked');
    if (!transSubOpcao) {
      mensagensErro.push('Selecione se o Transformador de Energia é CIOX ou Próprio');
      document.querySelectorAll('input[name="transcioxpropria"]').forEach(el => el.classList.add('erro'));
    }
  }
}

  if (mensagensErro.length > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos obrigatórios!',
      html: mensagensErro.map(msg => `• ${msg}`).join('<br>'),
      showConfirmButton: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    });
    return;
  }

  Swal.fire({
    icon: 'success',
    title: 'Sucesso!',
    text: 'Cliente cadastrado com sucesso!',
    showConfirmButton: true
  }).then(() => {
  const form = document.querySelector('form.formulario');
  const formUrbano = document.getElementById('form-urbano');
  const formRural = document.getElementById('form-rural');

 
  form.reset();

 
  formUrbano.style.display = 'none';
  formRural.style.display = 'none';

  
  limparCampos(formUrbano);
  limparCampos(formRural);

 
  document.querySelectorAll('input[name="area"]').forEach(radio => radio.checked = false);

  
  document.getElementById('container-cilindros').innerHTML = '';
  contadorCilindros = 0;
});

}
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.preco-gas, .preco-locacao').forEach(input => {
    input.value = '';
    input.defaultValue = '';
  });
});


//URBANO E RURAL

document.addEventListener('DOMContentLoaded', function () {
  const radiosArea = document.querySelectorAll('input[name="area"]');
  const formUrbano = document.getElementById('form-urbano');
  const formRural = document.getElementById('form-rural');

  radiosArea.forEach(radio => {
    radio.addEventListener('change', function () {
      const valor = this.value;

      if (valor === 'urbana') {
        formUrbano.style.display = 'block';
        formRural.style.display = 'none';
        limparCampos(formRural);
        ativarCampos(formUrbano);
      } else if (valor === 'rural') {
        formUrbano.style.display = 'none';
        formRural.style.display = 'block';
        limparCampos(formUrbano);
        ativarCampos(formRural);
      }
    });
  });

  // Inicializa desabilitando ambos ao carregar, se necessário
  limparCampos(formUrbano);
  limparCampos(formRural);
});
function limparCampos(container) {
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (input.type === 'radio' || input.type === 'checkbox') {
      input.checked = false;
    } else {
      input.value = '';
    }
    input.classList.remove('erro');
    input.disabled = true; // Desativa o campo
  });
}

function ativarCampos(container) {
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach(input => input.disabled = false);
}

document.addEventListener('DOMContentLoaded', function () {
  const campoDocumento = document.getElementById('cpfpac');

  campoDocumento.addEventListener('input', function () {
    let valor = this.value.replace(/\D/g, ''); 

    if (valor.length <= 11) {
      // CPF
      valor = valor.replace(/^(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
      valor = valor.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    this.value = valor;
  });
});
document.addEventListener('DOMContentLoaded', function () {
  const campoDocumento = document.getElementById('cpfresp');

  campoDocumento.addEventListener('input', function () {
    let valor = this.value.replace(/\D/g, ''); 

    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
      valor = valor.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    this.value = valor;
  });
});
document.addEventListener('DOMContentLoaded', function () {
const campoDocumento2 = document.getElementById('cpfpac');

  campoDocumento2.addEventListener('input', function () {
    let valor2 = this.value.replace(/\D/g, ''); 

    if (valor2.length <= 11) {
      valor2 = valor2.replace(/^(\d{3})(\d)/, '$1.$2');
      valor2 = valor2.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
      valor2 = valor2.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    this.value = valor2;
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const campoTelefone = document.getElementById('telefone');

  campoTelefone.addEventListener('input', function () {
    let valortel = this.value.replace(/\D/g, ''); 

    if (valortel.length <= 11) {
      valortel = valortel.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1)$2-$3');
    }

    this.value = valortel;
  });
});

document.addEventListener('DOMContentLoaded', function () {
 const camporgresp = document.getElementById('rgresp');

camporgresp.addEventListener('input', function () {
 let valorrgresp = this.value.replace(/\D/g, ''); 

    if (valorrgresp.length <= 9) {
      valorrgresp = valorrgresp.replace(/^(\d{2})(\d)/, '$1.$2');
      valorrgresp = valorrgresp.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      valorrgresp = valorrgresp.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    this.value = valorrgresp;
  });
  const campocep = document.getElementById('cep')
  campocep.addEventListener('input', function (){
    let valorcep = this.value.replace(/\D/g, '');
    if (valorcep.length<=9){
      valorcep = valorcep.replace(/^(\d{5})(\d)/, '$1-$2')
    }
    this.value = valorcep
  });
});

document.addEventListener('DOMContentLoaded', function () {
 const camporgpac = document.getElementById('rgpac');

camporgpac.addEventListener('input', function () {
 let valorrgpac = this.value.replace(/\D/g, ''); 

    if (valorrgpac.length <= 9) {
      valorrgpac = valorrgpac.replace(/^(\d{2})(\d)/, '$1.$2');
      valorrgpac = valorrgpac.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      valorrgpac = valorrgpac.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    this.value = valorrgpac;
  });
});

function formatarPreco(input) {
  // Se estiver vazio ou apenas R$ 0,00, limpe o campo
  if (input.value === '' || input.value === 'R$ 0,00') {
    input.value = '';
    return;
  }
  
  let valor = input.value.replace(/\D/g, '');
  if (valor === '') {
    input.value = '';
    return;
  }
  
  const valorFormatado = (Number(valor) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  input.value = valorFormatado;
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.preco-gas, .preco-locacao').forEach(input => {
    formatarPreco(input);
  });

  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('preco-gas') || 
        e.target.classList.contains('preco-locacao')) {
      formatarPreco(e.target);
    }
  });
});

function configurarCondicionais(grupo) {
  const radios = grupo.querySelectorAll('input[type="radio"][name^="cilindro_"]');
  const condicionais = grupo.querySelectorAll('.condicional');


  const valvulaCP = grupo.querySelectorAll('input[type="radio"][name^="valvula"]');
   const condicionaisvalvula = grupo.querySelectorAll('.valvprop');

   const  transCP = grupo.querySelectorAll('input[type="radio"][name^="transformador"]');
   const condicionaistransf = grupo.querySelectorAll('.transcioxprop');

  function atualizarCampos() {
    const selecionado = grupo.querySelector('input[type="radio"][name^="cilindro_"]:checked')?.value;

    condicionais.forEach(div => {
      if (div.dataset.showIf === selecionado) {
        div.style.display = 'block';
      } else {
        div.style.display = 'none';
      }
    });

    const selecionadovalv = grupo.querySelector('input[type="radio"][name^="valvula"]:checked')?.value;

    condicionaisvalvula.forEach(div => {
      if (div.dataset.showIf === selecionadovalv) {
        div.style.display = 'block';
      } else {
        div.style.display = 'none';
      }
    });

    const selecionadotransf = grupo.querySelector('input[type="radio"][name^="transformador"]:checked')?.value;

    condicionaistransf.forEach(div => {
      if (div.dataset.showIf === selecionadotransf) {
        div.style.display = 'block';
      } else {
        div.style.display = 'none';
      }
    });

  }

  radios.forEach(radio => {
    radio.addEventListener('change', atualizarCampos);
  });
  valvulaCP.forEach(radio => {
    radio.addEventListener('change', atualizarCampos);
  });
  transCP.forEach(radio => {
    radio.addEventListener('change', atualizarCampos);
  });

  atualizarCampos();
}

