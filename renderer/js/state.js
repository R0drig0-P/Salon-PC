// renderer/js/state.js

// quick DOM helpers
export const $  = (id) => document.getElementById(id);
export const $$ = (sel, root = document) => root.querySelectorAll(sel);

// global state
export const state = {
  salonId: "s01",

  // Full team (from employees)
  team: [],                   // [{id,name,role,active}]

  // Today's roster (in-memory only)
  daily: [],                  // [{id,name,role}]

  // Today's services (in-memory only)
  servicesByEmp: {},          // { [empId]: [{ service, price }] }

  deskEmployee: null,
  currentDate: todayStr(),
};

export function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function moneyPT(n) {
  const v = Number(n || 0);
  return "€" + v.toFixed(2).replace(".", ",");
}

export function ensureEmpBucket(empId) {
  if (!state.servicesByEmp[empId]) state.servicesByEmp[empId] = [];
}

export function computePerEmployeeTotals() {
  const out = [];
  for (const emp of state.daily) {
    const list = state.servicesByEmp[emp.id] || [];
    const total = list.reduce((s, it) => s + Number(it.price || 0), 0);
    out.push({
      employeeId: emp.id,
      name: emp.name,
      role: emp.role || "unknown",
      total: Number(total.toFixed(2)),
      servicesCount: list.length,
    });
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}

export function computeGrandTotals() {
  const perEmployee = computePerEmployeeTotals();
  const total_sales = perEmployee.reduce((s,e)=>s+e.total,0);
  const total_clients = perEmployee.reduce((s,e)=>s+e.servicesCount,0);
  return {
    perEmployee,
    total_sales: Number(total_sales.toFixed(2)),
    total_clients,
  };
}
