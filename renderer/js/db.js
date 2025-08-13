// renderer/js/db.js
import { BUSINESS_ID } from "./constants.js";

// Firestore (global from firebase-config.js)
const db = window.firebaseDB;

export function businessRoot() {
  return db.collection("businesses").doc(BUSINESS_ID);
}

export function salonDoc(salonId) {
  return businessRoot().collection("salons").doc(salonId);
}

// Master team
export function employeesCol(salonId) {
  return salonDoc(salonId).collection("employees");
}

// Day artifacts
export function logsRef(salonId, dateStr) {
  return salonDoc(salonId).collection("service_logs").doc(dateStr);
}

export function totalsRef(salonId, dateStr) {
  return salonDoc(salonId).collection("daily_totals").doc(dateStr);
}
