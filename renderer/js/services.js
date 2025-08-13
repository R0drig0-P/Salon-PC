// renderer/js/services.js
import { state, ensureEmpBucket } from "./state.js";
import { employeesCol, logsRef, totalsRef } from "./db.js";
import { guardSignedIn } from "./auth.js";

// compat firebase from global (for serverTimestamp)
const firebase = window.firebase;

/* ========================= TEAM (permanent) ========================= */

export async function loadMasterTeam() {
  guardSignedIn();
  const snap = await employeesCol(state.salonId).get();
  const team = [];
  snap.forEach(doc => {
    const d = doc.data() || {};
    team.push({
      id: doc.id,
      name: d.name,
      role: d.role || "hairdresser",
      active: d.active !== false,
    });
  });
  team.sort((a,b)=>a.name.localeCompare(b.name));
  state.team = team;
}

export async function addEmployeeToTeam(name, role) {
  guardSignedIn();
  // sequential id by prefix
  const prefix =
    role === "barber" ? "b" :
    role === "beautician" ? "e" :
    role === "desk" ? "d" : "h";

  const snap = await employeesCol(state.salonId).get();
  let maxNum = 0;
  snap.forEach(doc => {
    const id = doc.id || "";
    if (id.startsWith(prefix)) {
      const num = parseInt(id.substring(1), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  const newId = prefix + String(maxNum + 1).padStart(2, "0");

  await employeesCol(state.salonId).doc(newId).set({
    name,
    role,
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  state.team.push({ id: newId, name, role, active: true });
  state.team.sort((a,b)=>a.name.localeCompare(b.name));
}

export async function deactivateWorker(empId) {
  guardSignedIn();
  await employeesCol(state.salonId).doc(empId).update({ active: false });
  const t = state.team.find(e => e.id === empId);
  if (t) t.active = false;
}

export async function activateWorker(empId) {
  guardSignedIn();
  await employeesCol(state.salonId).doc(empId).update({ active: true });
  const t = state.team.find(e => e.id === empId);
  if (t) t.active = true;
}

export async function hardDeleteWorker(empId) {
  guardSignedIn();
  await employeesCol(state.salonId).doc(empId).delete();
  state.team = state.team.filter(e => e.id !== empId);
  state.daily = state.daily.filter(e => e.id !== empId);
  delete state.servicesByEmp[empId];
}

/* ========================= TODAY (in-memory) ========================= */

export function addToDaily(empId) {
  const emp = state.team.find(e => e.id === empId);
  if (!emp) throw new Error("Funcionário não encontrado.");
  if (!emp.active) throw new Error("Funcionário inativo.");
  if (state.daily.some(d => d.id === empId)) return;
  state.daily.push({ id: emp.id, name: emp.name, role: emp.role });
  state.daily.sort((a,b)=>a.name.localeCompare(b.name));
  ensureEmpBucket(emp.id);
}

export function removeFromDaily(empId) {
  state.daily = state.daily.filter(d => d.id !== empId);
  delete state.servicesByEmp[empId];
}

// Load services/roster at startup (no writes)
export async function loadTodayFromDb() {
  guardSignedIn();
  const date = state.currentDate;

  // Prefer service_logs (has services; roster = keys)
  const logs = await logsRef(state.salonId, date).get().catch(()=>null);
  if (logs?.exists) {
    const data = logs.data() || {};
    const map = (data.servicesByEmp && typeof data.servicesByEmp === "object") ? data.servicesByEmp : {};
    state.servicesByEmp = map;
    const ids = Object.keys(map);
    state.daily = ids.map(id => {
      const t = state.team.find(e => e.id === id);
      return t ? { id, name: t.name, role: t.role } : { id, name: id, role: "unknown" };
    }).sort((a,b)=>a.name.localeCompare(b.name));
    state.daily.forEach(e => ensureEmpBucket(e.id));
    return "logs";
  }

  // Else try daily_totals (has employees[], no services)
  const tot = await totalsRef(state.salonId, date).get().catch(()=>null);
  if (tot?.exists) {
    const data = tot.data() || {};
    const arr = Array.isArray(data.employees) ? data.employees : [];
    state.daily = arr.map(e => {
      const t = state.team.find(x => x.id === e.employeeId) || { name: e.name, role: e.role };
      return { id: e.employeeId, name: t.name, role: t.role };
    }).sort((a,b)=>a.name.localeCompare(b.name));
    state.servicesByEmp = {};
    state.daily.forEach(e => ensureEmpBucket(e.id));
    return "totals";
  }

  // Blank
  state.daily = [];
  state.servicesByEmp = {};
  return "empty";
}

/* ========================= SEND (writes) ========================= */

export async function sendEndOfDay() {
  guardSignedIn();
  const date = state.currentDate;

  const perEmployee = state.daily.map(emp => {
    const list = state.servicesByEmp[emp.id] || [];
    const total = list.reduce((s, it) => s + Number(it.price || 0), 0);
    return {
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      total: Number(total.toFixed(2)),
      servicesCount: list.length,
    };
  }).sort((a,b)=>a.name.localeCompare(b.name));

  const total_sales = perEmployee.reduce((s,e)=>s+e.total,0);
  const total_clients = perEmployee.reduce((s,e)=>s+e.servicesCount,0);

  await totalsRef(state.salonId, date).set({
    total_sales,
    total_clients,
    employees: perEmployee,
    desk_employee: state.deskEmployee || null,
    sent_at: firebase.firestore.FieldValue.serverTimestamp(),
  });

  await logsRef(state.salonId, date).set(
    { servicesByEmp: state.servicesByEmp || {} },
    { merge: false }
  );

  // return numbers so we can show a toast in app.js
  return { total_sales, total_clients };
}

/* ========================= Bootstrap ========================= */

export async function bootstrapDay() {
  await loadMasterTeam();
  await loadTodayFromDb(); // rebuild roster/services from logs or totals (or blank)
}
