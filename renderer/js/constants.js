export const BUSINESS_ID = "JulioBeautySpa";

export const SALON_PC_EMAIL = {
  s01: "rodrigopina0906@gmail.com",
  s02: "rodrigopina0906@gmail.com",
};

// ⚠️ Rececionistas passam a vir da BD (role === "desk")
// SALON_META fica só para nomes dos salões (sem desk fixo)
export const SALON_META = {
  s01: { nome: "Mira Maia" },
  s02: { nome: "Póvoa de Varzim" }
};

/* --------- PREÇÁRIO --------- */

// Barbeiro (já tinhas)
export const PRECO_CORTE = {
  "Corte social": 14.0,
  "Corte degradê": 15.0,
  "Corte máquina": 12.5,
};
export const PRECO_BARBA = {
  "Barba simples": 6.5,
  "Barba desenhada": 8.0,
};
// Addon masculino
export const ADDONS_MASC = {
  "Risca": 1.0,
};

// Cabeleireira
// Tamanhos canónicos usados nos selects (curto, médio, comprido, muito comprido)
export const HAIR_LENGTHS = ["Curto","Médio","Comprido","Muito comprido"];

// Tabelas por serviço → array de preços por comprimento (alinha por HAIR_LENGTHS)
export const CABELEIREIRA_TABELA = {
  "Coloração":      [40.50, 45.50, 50.50, null],   // último em branco? deixa null
  "Corte":          [16.50, 18.50, 23.50, 26.00],
  "Brushing":       [12.00, 14.00, 16.00, 18.00],
  "Madeixas":       [67.50, 82.50, 97.50, null],
  "Balayage":       [77.50, 87.50, 87.50, 97.50],
  "Botox":          [50.00, 50.00, 60.00, null],
  "Permanente":     [35.00, null,  null,  null],
  "Alisamento":     [150.00, null, null, null],
};

// Addons femininos (valores que somam ao preço base)
export const ADDONS_FEM = {
  "Prancha": 3.0,
  "Ondas": 3.0,
  "Shampoo": 2.50,
  "Máscara": 5.0,
  "Sérum": 2.0
};

// Esteticista (serviços fixos; “Massagem” sem preço por defeito)
export const ESTETICISTA_PRECOS = {
  "Sobrancelha cera": 5,
  "Buço cera": 4,
  "Sobrancelha em linha": 7,
  "Buço em linha": 6,
  "Manicure": 8,
  "Pedicure completa": 20,
  "Pedicure c/ verniz gel": 25,
  "Colocação gel alongamento": 30,
  "Manutenção": 20,
  "Verniz de gel": 15,
  "Remoção gelinho": 5,
  "Remoção gel": 10,
  "Massagem": null // sem preço predefinido
};
