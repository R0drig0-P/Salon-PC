import { $, state } from "./state.js";
import { SALON_PC_EMAIL } from "./constants.js";

export const auth = window.firebaseAuth;
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);

export function showLoginModal(email) {
  return new Promise((resolve, reject) => {
    const loginModal = $("loginModal");
    $("loginTitle").textContent = "Iniciar sessão na conta do PC";
    $("loginEmail").value = email;
    $("loginPassword").value = "";
    $("loginRemember").checked = true;
    const err = $("loginError"); err.style.display = "none"; err.textContent = "";

    const cleanup = () => {
      $("loginForm").onsubmit = null;
      $("loginCancel").onclick = null;
      loginModal.onclick = null;
    };

    $("loginForm").onsubmit = (e) => {
      e.preventDefault();
      const pw = $("loginPassword").value.trim();
      const remember = $("loginRemember").checked;
      if (!pw) { err.textContent = "Palavra-passe obrigatória."; err.style.display = "block"; return; }
      cleanup(); loginModal.classList.remove("show");
      resolve({ password: pw, remember });
    };
    $("loginCancel").onclick = () => { cleanup(); loginModal.classList.remove("show"); reject(new Error("Cancelado")); };

    // fechar clicando fora
    loginModal.onclick = (ev) => {
      if (ev.target?.dataset?.modal === "login") { cleanup(); loginModal.classList.remove("show"); reject(new Error("Cancelado")); }
    };

    loginModal.classList.add("show");
    setTimeout(()=>$("loginPassword").focus(), 30);
  });
}

export async function ensurePcLoginForSalon(salonId) {
  const targetEmail = SALON_PC_EMAIL[salonId];
  if (!targetEmail) throw new Error(`Nenhum email configurado para ${salonId}`);

  if (auth.currentUser?.email === targetEmail) return;

  if (auth.currentUser && auth.currentUser.email !== targetEmail) {
    await auth.signOut().catch(()=>{});
  }

  const pwKey = `pc_pw_${salonId}`;
  let password = localStorage.getItem(pwKey);
  if (!password) {
    const res = await showLoginModal(targetEmail);
    password = res.password;
    if (res.remember) localStorage.setItem(pwKey, password);
  }

  try {
    await auth.signInWithEmailAndPassword(targetEmail, password);
    await auth.currentUser.getIdToken(true);
  } catch (e) {
    localStorage.removeItem(pwKey);
    throw e;
  }
}

export function guardSignedIn() {
  if (!auth.currentUser) throw new Error("Não autenticado. Escolha um salão para iniciar sessão.");
}
