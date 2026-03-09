document.addEventListener('DOMContentLoaded', function () {
  // --- Máscara CNPJ ---
  const campoDocumento = document.getElementById('cnpj');
  campoDocumento.addEventListener('input', function () {
    let valor = this.value.replace(/\D/g, '');
    if (valor.length <= 14) {
      valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
      valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      valor = valor.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4');
      valor = valor.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
    }
    this.value = valor;
  });

  // --- Máscara Telefone ---
  const campoTelefone = document.getElementById('telefone');
  campoTelefone.addEventListener('input', function () {
    let valor = this.value.replace(/\D/g, '');
    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1)$2-$3');
    }
    this.value = valor;
  });

  const campocep = document.getElementById('cep')
  campocep.addEventListener('input', function (){
    let valorcep = this.value.replace(/\D/g, '');
    if (valorcep.length<=9){
      valorcep = valorcep.replace(/^(\d{5})(\d)/, '$1-$2')
    }
    this.value = valorcep
  });

  const radiopix = document.getElementById('pix');
  const radioboleto = document.getElementById('boleto');
  const radioted = document.getElementById('ted');
  const chave = document.getElementById('chavepix');

  radioted.addEventListener('change', () => {
    chave.style.display = 'none';
  });

  radiopix.addEventListener('change', () => {
    chave.style.display = 'block';
  });

  radioboleto.addEventListener('change', () => {
    chave.style.display = 'none';
  });

  // --- Cadastro ---
  const form = document.querySelector('form.formulario');
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const mensagensErro = [];
    const camposObrigatorios = [
      { id: 'razao', mensagem: 'Preencha o campo Razão Social' },
      { id: 'fantasia', mensagem: 'Preencha o campo Nome Fantasia' },
      { id: 'cnpj', mensagem: 'Preencha o campo CNPJ' },
      { id: 'nomecontato', mensagem: 'Preencha o campo Nome do Contato' },
      { id: 'telefone', mensagem: 'Preencha o campo Telefone' },
      { id: 'endereco', mensagem: 'Preencha o campo Logradouro' },
      { id: 'cep', mensagem: 'Preencha o campo CEP' },
      { id: 'cidade', mensagem: 'Preencha o campo Cidade' },
      { id: 'uf', mensagem: 'Preencha o campo Estado (UF)' },
      { id: 'numero', mensagem: 'Preencha o campo Número' },
      { id: 'banco', mensagem: 'Preencha o campo Banco' },
      { id: 'agencia', mensagem: 'Preencha o campo Agência' },
      { id: 'cic', mensagem: 'Preencha o campo CIC' }
    ];

    camposObrigatorios.forEach(campo => {
      const input = document.getElementById(campo.id);
      if (input && input.value.trim() === '') {
        mensagensErro.push(campo.mensagem);
        input.classList.add('erro');
      } else {
        input.classList.remove('erro');
      }
    });


    const radioSelecionado = document.querySelector('input[name="pag"]:checked');
    if (!radioSelecionado) {
      mensagensErro.push('Escolha um Meio de Pagamento');
    }

     // Verifica chave PIX se o PIX estiver selecionado
  if (radioSelecionado && radioSelecionado.id === 'pix') {
    const chave = document.getElementById('chave');
    if (chave.value.trim() === '') {
      mensagensErro.push('Preencha a Chave PIX');
      chave.classList.add('erro');
    } else {
      chave.classList.remove('erro');
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
      form.reset();
      togglePixField(); 
    });
  });
});
