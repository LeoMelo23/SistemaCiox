let slideIndex = 0;
const slideGroups = document.querySelectorAll('.slide-group');
const totalSlides = slideGroups.length;

showSlides();

function plusSlides(n) {
    slideIndex += n;
    
    document.querySelector('.catalog-grid').style.opacity = '0';
    
    setTimeout(() => {
        showSlides();
        document.querySelector('.catalog-grid').style.opacity = '1';
    }, 300);
}

function showSlides() {
    
    if (slideIndex >= totalSlides) slideIndex = 0;
    if (slideIndex < 0) slideIndex = totalSlides - 1;
    
    
    slideGroups.forEach(group => {
        group.style.display = 'none';
    });
    
    
    slideGroups[slideIndex].style.display = 'flex';
    
    
    slideGroups[slideIndex].style.transition = 'opacity 0.5s ease';
    slideGroups[slideIndex].style.opacity = '1';
    
}

async function carregarTotalClientes() {
  try {
   const res = await fetch("http://localhost:3000/api/clientes/count");
   /*  const res = await fetch("/api/clientes/count"); */
    const data = await res.json();
    document.getElementById("total-clientes").innerText = data.total;
  } catch (err) {
    console.error("Erro ao buscar total de clientes:", err);
  }
}

// Carregar assim que a página abrir
document.addEventListener("DOMContentLoaded", carregarTotalClientes);


  if (sessionStorage.getItem("acessoCiox") !== "autorizado") {
    window.location.href = "acesso.html";
  }
