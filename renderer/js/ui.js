// renderer/js/ui.js
import { $, state, moneyPT, ensureEmpBucket, computeGrandTotals } from "./state.js";
import {
  addEmployeeToTeam, deactivateWorker, hardDeleteWorker, activateWorker,
  addToDaily, removeFromDaily
} from "./services.js";
import {
  PRECO_CORTE, PRECO_BARBA, ADDONS_FEM, HAIR_LENGTHS,
  CABELEIREIRA_TABELA, ESTETICISTA_PRECOS
} from "./constants.js";

/* =================== Toast & Confirm =================== */
export function toast(msg, type="ok", ms=2200){
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), ms);
}
function confirmModal(message){
  return new Promise((resolve)=> {
    const overlay = document.createElement("div");
    overlay.className = "modal show";
    overlay.innerHTML = `
      <div class="modalContent">
        <div class="modalHeader"><h3>Confirmação</h3></div>
        <div class="modalBody"><p>${message}</p></div>
        <div class="modalFooter modalActions">
          <button class="btn">Cancelar</button>
          <button class="btn btn-danger">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const content = overlay.querySelector(".modalContent");
    overlay.addEventListener("pointerdown",(e)=> {
      if (!content.contains(e.target)) { overlay.remove(); resolve(false); }
    });
    const [cancel, ok] = overlay.querySelectorAll("button");
    cancel.onclick = ()=>{ overlay.remove(); resolve(false); };
    ok.onclick     = ()=>{ overlay.remove(); resolve(true); };
  });
}

/* =================== Generic modal =================== */
export function closeModal(){ $("modal").classList.remove("show"); }
function btn(label, cls, onclick){ const b = document.createElement("button"); b.className=cls; b.textContent=label; b.onclick=onclick; return b; }
function showModal(title, bodyNode, footerNodes=[]){
  $("modalTitle").textContent = title || "";
  const body = $("modalBody"); body.innerHTML = "";
  if (typeof bodyNode === "string") body.innerHTML = bodyNode;
  else if (bodyNode) body.appendChild(bodyNode);
  const footer = $("modalFooter"); footer.innerHTML = "";
  footerNodes.forEach(n => footer.appendChild(n));
  $("modal").classList.add("show");

  const overlay = $("modal");
  const content = overlay.querySelector(".modalContent");
  overlay.addEventListener("pointerdown", (e)=>{
    if (!content.contains(e.target)) closeModal();
  }, { once:true });
}
$("modalClose")?.addEventListener("click", closeModal);

/* =================== Header (desk) =================== */
export function populateDeskOptions() {
  const deskSelect = $("deskSelect");
  const desks = state.team.filter(e => e.role === "desk" && e.active).map(e => e.name);
  deskSelect.innerHTML = "";

  if (!state.deskEmployee) {
    const ph = document.createElement("option");
    ph.value = ""; ph.textContent = "— Selecionar —";
    deskSelect.appendChild(ph);
  }
  desks.forEach(n=>{
    const opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    deskSelect.appendChild(opt);
  });

  if (state.deskEmployee && desks.includes(state.deskEmployee)) {
    deskSelect.value = state.deskEmployee;
    if (deskSelect.options.length && deskSelect.options[0].value === "") deskSelect.remove(0);
  } else {
    deskSelect.value = "";
  }
}

/* =================== Rows (DAILY roster) =================== */
export function renderEmployeeRows() {
  const rows = {
    hairdresser: $("hairdressersRow"),
    barber: $("barbersRow"),
    beautician: $("beauticiansRow"),
  };
  rows.hairdresser.innerHTML = rows.barber.innerHTML = rows.beautician.innerHTML = "";

  const map = { hairdresser:[], barber:[], beautician:[] };
  state.daily.forEach(e => {
    if (e.role === "hairdresser") map.hairdresser.push(e);
    else if (e.role === "barber") map.barber.push(e);
    else if (e.role === "beautician") map.beautician.push(e);
  });

  const makeCard = (emp, roleLabel) => {
    ensureEmpBucket(emp.id);
    const list = state.servicesByEmp[emp.id] || [];
    const total = list.reduce((s,i)=>s+Number(i.price||0),0);
    const card = document.createElement("button");
    card.className = "emp-card";
    card.style.flex = "0 0 auto"; // ensure horizontal scroll cards
    card.innerHTML = `
      <div class="emp-top">
        <div class="emp-name">${emp.name}</div>
        <div class="emp-side">${roleLabel}</div>
      </div>
      <div class="emp-meta">Hoje: ${list.length} serviços • ${moneyPT(total)}</div>
    `;
    card.onclick = () => openEmployeeModal(emp);
    return card;
  };

  map.hairdresser.forEach(e => rows.hairdresser.appendChild(makeCard(e,"Cabeleireira")));
  map.barber.forEach(e => rows.barber.appendChild(makeCard(e,"Barbeiro")));
  map.beautician.forEach(e => rows.beautician.appendChild(makeCard(e,"Esteticista")));
}

/* =================== Add-to-day (＋) =================== */
export function openAddDayWorkerModal(role) {
  const dailyIds = new Set(state.daily.map(d=>d.id));
  const candidates = state.team
    .filter(e => e.active && e.role === role && !dailyIds.has(e.id))
    .sort((a,b)=>a.name.localeCompare(b.name));

  const body = document.createElement("div");
  body.className = "col";
  const sel = document.createElement("select"); sel.className = "select";
  candidates.forEach(c=>{
    const o = document.createElement("option");
    o.value = c.id; o.textContent = c.name;
    sel.appendChild(o);
  });
  if (candidates.length === 0) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Sem candidatos (todos já no dia ou nenhum ativo).";
    body.appendChild(hint);
  } else {
    body.appendChild(sel);
  }

  const closeB = btn("Fechar","btn", closeModal);
  const addB   = btn("Adicionar","btn btn-primary", ()=>{
    if (!candidates.length) return closeModal();
    addToDaily(sel.value);
    renderEmployeeRows();
    closeModal();
    toast("Adicionado ao dia");
  });

  showModal("Adicionar ao dia", body, [closeB, addB]);
}

/* =================== Employee modal =================== */
function openEmployeeModal(emp) {
  ensureEmpBucket(emp.id);
  const list = state.servicesByEmp[emp.id] || [];
  const total = list.reduce((s,c)=>s+Number(c.price||0),0);
  const rolePt = emp.role==="barber"?"Barbeiro": emp.role==="beautician"?"Esteticista":"Cabeleireira";

  const header = document.createElement("div");
  header.className = "modalHeader";
  header.innerHTML = `
    <div class="titleRow">
      <h3>${emp.name} — ${rolePt}</h3>
      <div class="metaRow" style="font-size:17px;">
        <span>Serviços: <strong>${list.length}</strong></span>
        <span>Total: <strong>${moneyPT(total)}</strong></span>
      </div>
    </div>
  `;

  const listBox = document.createElement("div");
  listBox.className = "listBox";
  renderEmpListRows(listBox, emp);

  const body = document.createElement("div");
  body.className = "modalBody";
  body.appendChild(listBox);

  const closeBtn = btn("Fechar", "btn", closeModal);
  const removeBtn = btn("Remover do dia", "btn", async ()=>{
    const ok = await confirmModal(`Remover ${emp.name} do dia? Os serviços de hoje serão apagados.`);
    if (!ok) return;
    removeFromDaily(emp.id);
    renderEmployeeRows();
    closeModal();
    toast("Removido do dia");
  });
  const addBtn = btn("Adicionar serviço", "btn btn-primary", ()=> openAddServiceModal(emp, ()=>{
    renderEmployeeRows();
    const list2 = state.servicesByEmp[emp.id] || [];
    const tot2 = list2.reduce((s,c)=>s+Number(c.price||0),0);
    header.querySelector(".metaRow").innerHTML =
      `<span>Serviços: <strong>${list2.length}</strong></span>
       <span>Total: <strong>${moneyPT(tot2)}</strong></span>`;
    renderEmpListRows(listBox, emp);
  }));

  const footer = document.createElement("div");
  footer.className = "modalFooter modalActions";
  footer.appendChild(addBtn);
  footer.appendChild(removeBtn);
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  footer.appendChild(spacer);
  footer.appendChild(closeBtn);

  $("modalTitle").textContent = "";
  const container = document.createElement("div");
  container.appendChild(header);
  container.appendChild(body);

  showModal("", container, [footer]);
}

function renderEmpListRows(container, emp) {
  container.innerHTML = "";
  const list = state.servicesByEmp[emp.id] || [];
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.style.padding = "6px";
    empty.textContent = "Sem serviços ainda.";
    container.appendChild(empty);
    return;
  }
  list.forEach((c, idx)=>{
    const row = document.createElement("div");
    row.className = "cutItem";
    row.innerHTML = `
      <div class="cutLeft">
        <strong>${c.service}</strong>
        <div class="hint">${moneyPT(c.price)}</div>
      </div>
      <button class="binBtn" title="Eliminar">🗑️</button>
    `;
    row.querySelector(".binBtn").onclick = async ()=>{
      const ok = await confirmModal(`Eliminar "${c.service}" (${moneyPT(c.price)})?`);
      if (!ok) return;
      state.servicesByEmp[emp.id].splice(idx,1);
      renderEmpListRows(container, emp);
      toast("Serviço eliminado");
      renderEmployeeRows();
    };
    container.appendChild(row);
  });
}

/* =================== Add Service modal =================== */
function openAddServiceModal(emp, onSaved){
  const role = emp.role;
  const modal = document.createElement("div");
  modal.className = "modal show";
  const content = document.createElement("div");
  content.className = "modalContent";

  const header = document.createElement("div");
  header.className = "modalHeader";
  header.innerHTML = `<h3 style="margin-bottom:6px;">Adicionar serviço — ${emp.name}</h3>`;

  const body = document.createElement("div");
  body.className = "modalBody";
  body.style.marginTop = "6px";
  if (role === "barber") body.appendChild(barberForm());
  else if (role === "beautician") body.appendChild(beauticianForm());
  else body.appendChild(hairdresserForm());

  const footer = document.createElement("div");
  footer.className = "modalFooter modalActions";
  const close = btn("Fechar","btn", ()=> modal.remove());
  const save  = btn("Guardar","btn btn-primary", ()=>{
    const data = readServiceForm(body, role);
    if (!data) { toast("Preenche serviço e preço.", "err"); return; }
    ensureEmpBucket(emp.id);
    state.servicesByEmp[emp.id].push(data);
    modal.remove();
    toast("Serviço adicionado");
    if (typeof onSaved === "function") onSaved();
  });
  footer.appendChild(close);
  footer.appendChild(save);

  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.addEventListener("pointerdown",(e)=> {
    if (!content.contains(e.target)) modal.remove();
  });
}

/* helpers for forms */
function selectRow(labelText, options){
  const row = document.createElement("div");
  row.className = "inlineInputs";
  row.innerHTML = `<label>${labelText}</label>`;
  const sel = document.createElement("select"); sel.className = "select";
  options.forEach(opt=>{
    const o = document.createElement("option");
    o.value = opt === "— nenhum —" ? "" : opt;
    o.textContent = opt;
    sel.appendChild(o);
  });
  row.appendChild(sel);
  Object.defineProperty(row, "value", { get(){ return sel.value; }});
  row.getSelectEl = () => sel;
  row.onchange = ()=>{};
  return row;
}
function priceRow(labelText){
  const row = document.createElement("div");
  row.className = "inlineInputs";
  row.innerHTML = `<label>${labelText}</label>`;
  const inp = document.createElement("input");
  inp.type="number"; inp.step="0.01"; inp.placeholder="0,00"; inp.className="select";
  row.appendChild(inp);
  Object.defineProperty(row, "value", { get(){ return Number(inp.value); }});
  row.setPrice = (v)=> { inp.value = (v==null?"":Number(v).toFixed(2)); };
  row.disable  = (flag)=> { inp.disabled = !!flag; };
  return row;
}
function setPrice(row, v){ if (row.setPrice) row.setPrice(v); }
function checkboxRow(labelText, items){
  const wrap = document.createElement("div");
  wrap.className = "col";
  const lab = document.createElement("div");
  lab.className = "hint";
  lab.textContent = labelText;
  const box = document.createElement("div");
  box.className = "chips";
  items.forEach(it=>{
    const ch = document.createElement("label");
    ch.className = "chip";
    ch.innerHTML = `<input type="checkbox" value="${it.key}" style="accent-color:#5b8cff; width:18px; height:18px; margin-right:6px;" /> ${it.label}`;
    box.appendChild(ch);
  });
  wrap.appendChild(lab);
  wrap.appendChild(box);
  wrap.onchange = ()=>{};
  return wrap;
}
function readServiceForm(container, role){
  if (role === "barber") {
    const sels = container.querySelectorAll(".inlineInputs select");
    const [corteSel, barbaSel] = sels;
    const corte = corteSel.value;
    const barba = barbaSel.value;
    const price = Number(container.querySelector("input[type=number]").value);
    const risca = container.querySelector("input[type=checkbox]")?.checked;
    if (!corte && !barba) return null;
    if (Number.isNaN(price)) return null;
    const name = [corte, barba, risca ? "Risca" : null].filter(Boolean).join(" + ");
    return { service: name, price };
  }
  if (role === "beautician") {
    const s = container.querySelector(".inlineInputs select").value;
    const price = Number(container.querySelector("input[type=number]").value);
    if (!s) return null;
    if (Number.isNaN(price)) return null;
    return { service: s, price };
  }
  const selects = container.querySelectorAll(".inlineInputs select");
  const [srvSel, lenSel] = selects;
  const srv = srvSel.value, len = (lenSel ? lenSel.value : "");
  const price = Number(container.querySelector("input[type=number]").value);
  // if service requires length but none selected → invalid
  const lengths = availableLengthsForService(srv);
  const requiresLength = (srv && lengths && lengths.length > 0);
  if (!srv) return null;
  if (requiresLength && !len) return null;
  if (Number.isNaN(price)) return null;
  const addons = [...container.querySelectorAll("input[type=checkbox]")].filter(i=>i.checked).map(i=>i.value);
  const baseName = requiresLength ? `${srv} — ${len}` : srv;
  const name = addons.length ? `${baseName} + ${addons.join(" + ")}` : baseName;
  return { service: name, price };
}

/* ===== Price helpers ===== */
function availableLengthsForService(service){
  if (!service) return [];
  const arr = CABELEIREIRA_TABELA[service];
  if (!Array.isArray(arr)) return [];            // no length (single price)
  // map by price presence
  const out = [];
  for (let i=0;i<arr.length;i++){
    if (arr[i] != null) out.push(HAIR_LENGTHS[i]);
  }
  return out;
}

/* Price forms */
function barberForm() {
  const wrap = document.createElement("div");
  wrap.className = "col";
  const corteSel = selectRow("Corte", ["— nenhum —", ...Object.keys(PRECO_CORTE)]);
  const barbaSel = selectRow("Barba", ["— nenhum —", ...Object.keys(PRECO_BARBA)]);
  // Extra masculino: Risca +1,00 €
  const risca = checkboxRow("Adicionar", [{ key:"Risca", label:"Risca (+1,00€)" }]);
  const preco = priceRow("Preço total (€)");
  const recalc = ()=>{
    let p = 0;
    const c = corteSel.value;
    const b = barbaSel.value;
    if (c) p += PRECO_CORTE[c] || 0;
    if (b) p += PRECO_BARBA[b] || 0;
    if (risca.querySelector("input")?.checked) p += 1.0;
    setPrice(preco, p || null);
  };
  corteSel.onchange = barbaSel.onchange = risca.onchange = recalc;
  // start with none → price blank
  setPrice(preco, null);
  wrap.appendChild(corteSel); wrap.appendChild(barbaSel); wrap.appendChild(risca); wrap.appendChild(preco);
  return wrap;
}

function hairdresserForm() {
  const wrap = document.createElement("div"); wrap.className="col";
  const services = Object.keys(CABELEIREIRA_TABELA);
  const serviceSel = selectRow("Serviço", ["— nenhum —", ...services]);
  const lengthSel  = selectRow("Comprimento", ["— nenhum —", ...HAIR_LENGTHS]);
  const addons     = checkboxRow("Adicionais", Object.entries(ADDONS_FEM).map(([k,v])=>({key:k,label:`${k} (+${moneyPT(v)})`})));
  const precoInp   = priceRow("Preço (€)");

  // dynamic behavior:
  const applyVisibility = ()=>{
    const srv = serviceSel.value;
    // lengths available for this service
    const avail = availableLengthsForService(srv);
    const selEl = lengthSel.getSelectEl();
    if (!srv) {
      // hide/disable length when no service
      lengthSel.style.display = "none";
      selEl.innerHTML = `<option value="">— nenhum —</option>`;
      setPrice(precoInp, null);
      return;
    }
    if (!avail.length) {
      // service has single price (no size) → hide length
      lengthSel.style.display = "none";
      // compute base price from first defined price in table (index 0 if present)
      const arr = CABELEIREIRA_TABELA[srv];
      let base = null;
      if (Array.isArray(arr)) {
        base = arr.find(v => v != null) ?? null;
      } else if (typeof arr === "number") {
        base = arr;
      }
      // add selected addons
      let price = base || 0;
      addons.querySelectorAll("input[type=checkbox]").forEach(ch=>{
        if (ch.checked) price += (ADDONS_FEM[ch.value]||0);
      });
      setPrice(precoInp, price || null);
      return;
    }
    // service has sizes → show length with only available options
    lengthSel.style.display = "";
    selEl.innerHTML = `<option value="">— nenhum —</option>`;
    avail.forEach(l=>{
      const o = document.createElement("option"); o.value = l; o.textContent = l; selEl.appendChild(o);
    });
    // if previously selected length not in avail, reset
    if (!avail.includes(selEl.value)) selEl.value = "";
    // recompute price
    recalc();
  };

  const recalc = ()=>{
    const srv = serviceSel.value;
    const len = lengthSel.getSelectEl().value;
    const avail = availableLengthsForService(srv);
    let p = 0;
    if (srv && avail.length) {
      const idx = HAIR_LENGTHS.indexOf(len);
      const base = CABELEIREIRA_TABELA[srv]?.[idx] ?? null;
      p = base || 0;
    } else if (srv && !avail.length) {
      // single price service
      const arr = CABELEIREIRA_TABELA[srv];
      let base = null;
      if (Array.isArray(arr)) base = arr.find(v=>v!=null) ?? null;
      else if (typeof arr === "number") base = arr;
      p = base || 0;
    }
    addons.querySelectorAll("input[type=checkbox]").forEach(ch=>{
      if (ch.checked) p += (ADDONS_FEM[ch.value]||0);
    });
    setPrice(precoInp, p || null);
  };

  serviceSel.onchange = ()=>{
    // clear addons when changing service (optional)
    addons.querySelectorAll("input[type=checkbox]").forEach(ch=> ch.checked = false);
    applyVisibility();
  };
  lengthSel.onchange = recalc;
  addons.onchange = recalc;

  // initial: none selected
  lengthSel.style.display = "none";
  setPrice(precoInp, null);

  wrap.appendChild(serviceSel); wrap.appendChild(lengthSel); wrap.appendChild(addons); wrap.appendChild(precoInp);
  return wrap;
}

function beauticianForm() {
  const wrap = document.createElement("div"); wrap.className="col";
  const servs = Object.keys(ESTETICISTA_PRECOS);
  const serviceSel = selectRow("Serviço", ["— nenhum —", ...servs]);
  const precoInp   = priceRow("Preço (€)");

  serviceSel.onchange = ()=>{
    const s = serviceSel.value;
    if (!s) { setPrice(precoInp, null); return; }
    setPrice(precoInp, ESTETICISTA_PRECOS[s] ?? null);
  };

  // initial none
  setPrice(precoInp, null);

  wrap.appendChild(serviceSel); wrap.appendChild(precoInp);
  return wrap;
}

/* =================== Info modal =================== */
export function openInfoModal() {
  const { total_sales, total_clients } = computeGrandTotals();
  const body = `
    <div class="row"><div class="hint">Data:</div><div><strong>${state.currentDate}</strong></div></div>
    <div class="row"><div class="hint">Rececionista:</div><div><strong>${state.deskEmployee || "—"}</strong></div></div>
    <div class="row"><div class="hint">Clientes:</div><div><strong>${total_clients}</strong></div></div>
    <div class="row"><div class="hint">Faturação:</div><div><strong>${moneyPT(total_sales)}</strong></div></div>
  `;
  showModal("Totais do dia", body, [ btn("Fechar","btn", closeModal) ]);
}

/* =================== Manage team =================== */
function roleLabel(role){
  switch(role){
    case "barber": return "Barbeiro";
    case "beautician": return "Esteticista";
    case "desk": return "Rececionista";
    default: return "Cabeleireira";
  }
}
export function openManageTeamModal(){
  const container = document.createElement("div");
  container.className = "col";

  const grid = document.createElement("div");
  grid.className = "teamGrid";
  grid.style.alignItems = "start";       // start at top
  grid.innerHTML = `
    <div class="teamCol" data-role="hairdresser"><h4>Cabeleireiras</h4></div>
    <div class="teamCol" data-role="barber"><h4>Barbeiros</h4></div>
    <div class="teamCol" data-role="beautician"><h4>Esteticistas</h4></div>
    <div class="teamCol" data-role="desk"><h4>Rececionistas</h4></div>
  `;
  container.appendChild(grid);

  const cols = {
    hairdresser: grid.querySelector('[data-role="hairdresser"]'),
    barber: grid.querySelector('[data-role="barber"]'),
    beautician: grid.querySelector('[data-role="beautician"]'),
    desk: grid.querySelector('[data-role="desk"]'),
  };

  const draw = ()=>{
    Object.values(cols).forEach(c => (c.innerHTML = `<h4>${c.querySelector("h4").textContent}</h4>`));
    state.team.forEach(emp=>{
      const col = cols[emp.role || "hairdresser"];
      if (!col) return;
      const row = document.createElement("div");
      row.className = "teamRow";
      const inactive = emp.active ? "" : `<span class="badge">Inativo</span>`;
      row.innerHTML = `
        <div>
          <strong>${emp.name}</strong>
          <span class="role"> — ${roleLabel(emp.role)}</span>
          ${inactive}
        </div>
        <div class="row">
          ${emp.active
            ? `<button class="btn" data-act="deact">Inativar</button>`
            : `<button class="btn" data-act="act">Ativar</button>`}
          <button class="btn btn-danger" data-act="hard">Apagar</button>
        </div>
      `;
      const de = row.querySelector('[data-act="deact"]');
      if (de) de.onclick = async ()=>{
        const ok = await confirmModal(`Inativar ${emp.name}?`);
        if (!ok) return;
        await deactivateWorker(emp.id);
        draw();
        toast("Inativado");
      };
      const ac = row.querySelector('[data-act="act"]');
      if (ac) ac.onclick = async ()=>{
        await activateWorker(emp.id);
        draw();
        populateDeskOptions(); // refresh receptionists list
        toast("Ativado");
      };
      row.querySelector('[data-act="hard"]').onclick = async ()=>{
        const ok = await confirmModal(`Apagar definitivamente ${emp.name}?`);
        if (!ok) return;
        await hardDeleteWorker(emp.id);
        draw();
        toast("Apagado");
      };
      col.appendChild(row);
    });
    Object.values(cols).forEach(col=>{
      if (col.children.length === 1){
        const empty = document.createElement("div");
        empty.className = "hint";
        empty.textContent = "Sem membros";
        col.appendChild(empty);
      }
    });
  };

  draw();

  // mini-modal: add new member
  const openAdder = ()=>{
    const mm = document.createElement("div");
    mm.className = "modal show";
    const content = document.createElement("div");
    content.className = "modalContent";
    content.innerHTML = `
      <div class="modalHeader"><h3>Adicionar membro</h3></div>
      <div class="modalBody col">
        <label class="hint">Função</label>
        <select id="mmRole" class="select">
          <option value="hairdresser">Cabeleireira</option>
          <option value="barber">Barbeiro</option>
          <option value="beautician">Esteticista</option>
          <option value="desk">Rececionista</option>
        </select>
        <label class="hint">Nome</label>
        <input id="mmName" class="select" placeholder="Nome do membro" />
      </div>
      <div class="modalFooter modalActions">
        <button class="btn" id="mmClose">Fechar</button>
        <button class="btn btn-primary" id="mmSave">Guardar</button>
      </div>
    `;
    mm.appendChild(content);
    document.body.appendChild(mm);
    mm.addEventListener("pointerdown",(e)=>{ if (!content.contains(e.target)) mm.remove(); });
    content.querySelector("#mmClose").onclick = ()=> mm.remove();
    content.querySelector("#mmSave").onclick = async ()=>{
      const role = content.querySelector("#mmRole").value;
      const name = (content.querySelector("#mmName").value||"").trim();
      if (!name) { toast("Escreve um nome.", "err"); return; }
      await addEmployeeToTeam(name, role);
      draw();
      populateDeskOptions();
      mm.remove();
      toast("Membro adicionado");
    };
  };

  const closeB = btn("Fechar","btn", closeModal);
  const addB   = btn("Adicionar membro","btn btn-primary", openAdder);
  const footer = document.createElement("div");
  footer.className = "modalFooter modalActions";
  footer.appendChild(addB);
  const spacer = document.createElement("div"); spacer.style.flex = "1";
  footer.appendChild(spacer);
  footer.appendChild(closeB);

  showModal("Gerir equipa", container, [footer]);

  // Make modal bigger + scrollable content
  const modalBox = document.querySelector("#modal .modalContent");
  modalBox.style.width = "min(1500px, 150vw)";
  modalBox.style.maxHeight = "94vh";
  modalBox.style.display = "flex";
  modalBox.style.flexDirection = "column";
  const body = document.querySelector("#modal .modalBody");
  if (body) { body.style.maxHeight = "70vh"; body.style.overflow = "auto"; }
}
