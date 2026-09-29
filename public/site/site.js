(function () {
  var c = window.SITE || {};

  // Quem já está logada (ex.: atalho na tela do celular) vai direto pro painel.
  try {
    var u = JSON.parse(localStorage.getItem("usuario") || "null");
    if (u && localStorage.getItem("token")) {
      location.replace(u.papel === "ADMIN" ? "/inicio-admin" : "/inicio");
      return;
    }
  } catch (e) {}

  var $ = function (s) { return document.querySelector(s); };

  document.getElementById("ano").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-login]").forEach(function (a) {
    if (c.loginConecta) a.href = c.loginConecta;
  });

  var whats = c.whatsapp
    ? "https://wa.me/" + c.whatsapp + "?text=" + encodeURIComponent("Olá! Gostaria de conhecer a Novo Millenium.")
    : "";
  document.querySelectorAll("[data-whats]").forEach(function (a) {
    if (whats) { a.href = whats; a.target = "_blank"; a.rel = "noopener"; }
    else { a.textContent = "Ver formas de contato"; }
  });

  var itens = [];
  if (whats) itens.push(["WhatsApp", '<a href="' + whats + '" target="_blank" rel="noopener">Enviar mensagem</a>']);
  if (c.email) itens.push(["E-mail", '<a href="mailto:' + c.email + '">' + c.email + "</a>"]);
  if (c.endereco) itens.push(["Endereço", c.endereco]);
  if (c.horario) itens.push(["Atendimento", c.horario]);
  if (c.instagram) itens.push(["Instagram", '<a href="' + c.instagram + '" target="_blank" rel="noopener">Siga a gente</a>']);

  var ul = $("#contatos");
  ul.innerHTML = itens.map(function (i) {
    return "<li><span>" + i[0] + "</span><strong>" + i[1] + "</strong></li>";
  }).join("");
  if (!itens.length) $("#aviso-contato").hidden = false;
})();
