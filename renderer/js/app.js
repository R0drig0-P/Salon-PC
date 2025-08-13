// renderer/js/app.js
import { $, state, todayStr } from "./state.js";
import { ensurePcLoginForSalon } from "./auth.js";
import { bootstrapDay, sendEndOfDay } from "./services.js";
import { populateDeskOptions, renderEmployeeRows,
         openAddDayWorkerModal, openInfoModal, openManageTeamModal, toast } from "./ui.js";

function hookUI(){
  // add-to-day
  $("addHairBtn").addEventListener("click", () => openAddDayWorkerModal("hairdresser"));
  $("addBarberBtn").addEventListener("click", () => openAddDayWorkerModal("barber"));
  $("addBeautBtn").addEventListener("click", () => openAddDayWorkerModal("beautician"));

  $("manageTeamBtn").addEventListener("click", openManageTeamModal);

  $("infoBtn").addEventListener("click", openInfoModal);
  $("sendBtn").addEventListener("click", async ()=>{
    const res = await sendEndOfDay();
    toast(`Enviado: ${state.currentDate} • ${res.total_clients} serviços • ${res.total_sales.toFixed(2)}€`);
  });

  $("deskSelect").addEventListener("change", () => {
    state.deskEmployee = $("deskSelect").value || null;
    if (state.deskEmployee) {
      const sel = $("deskSelect");
      if (sel.options.length && sel.options[0].value === "") sel.remove(0);
    }
  });

  $("salonSelect").addEventListener("change", async () => {
    state.salonId = $("salonSelect").value;
    state.currentDate = todayStr();
    state.servicesByEmp = {};
    state.daily = [];
    state.deskEmployee = null;
    populateDeskOptions();
    await bootstrapForSalon();
  });

  $("closeBtn").addEventListener("click", () => window.close());
}

async function bootstrapForSalon(){
  await ensurePcLoginForSalon(state.salonId);
  await bootstrapDay();          // team + build roster/services from logs/totals
  populateDeskOptions();
  renderEmployeeRows();
}

async function init(){
  $("salonSelect").value = state.salonId;
  hookUI();
  await bootstrapForSalon();

  // rollover
  setInterval(async ()=>{
    const t = todayStr();
    if (t !== state.currentDate) {
      state.currentDate = t;
      state.servicesByEmp = {};
      state.daily = [];
      await bootstrapForSalon();
    }
  }, 60 * 1000);
}

window.addEventListener("DOMContentLoaded", init);
