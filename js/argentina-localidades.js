/**
 * Datos geográficos de Argentina (24 jurisdicciones y localidades principales)
 * y prefijos telefónicos internacionales para el formulario de ConVoz.
 */

window.CONVOZ_GEO = {
  countryCodes: [
    { code: "+54", label: "Argentina (+54)", defaultAreaPlaceholder: "Ej: 11, 351, 341" },
    { code: "+598", label: "Uruguay (+598)", defaultAreaPlaceholder: "Ej: 9, 2" },
    { code: "+56", label: "Chile (+56)", defaultAreaPlaceholder: "Ej: 9, 2" },
    { code: "+595", label: "Paraguay (+595)", defaultAreaPlaceholder: "Ej: 981, 21" },
    { code: "+55", label: "Brasil (+55)", defaultAreaPlaceholder: "Ej: 11, 21" },
    { code: "+591", label: "Bolivia (+591)", defaultAreaPlaceholder: "Ej: 7, 2" },
    { code: "+51", label: "Perú (+51)", defaultAreaPlaceholder: "Ej: 9, 1" },
    { code: "+57", label: "Colombia (+57)", defaultAreaPlaceholder: "Ej: 300, 601" },
    { code: "+52", label: "México (+52)", defaultAreaPlaceholder: "Ej: 55, 33" },
    { code: "+34", label: "España (+34)", defaultAreaPlaceholder: "Ej: 6, 91" },
    { code: "+1", label: "Estados Unidos / Canadá (+1)", defaultAreaPlaceholder: "Ej: 305, 212" },
    { code: "other", label: "Otro país", defaultAreaPlaceholder: "Ej: código de área" },
  ],

  argentinaProvinces: {
    "Ciudad Autónoma de Buenos Aires": [
      "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo", "Caballito",
      "Chacarita", "Colegiales", "Flores", "Floresta", "Liniers", "Mataderos",
      "Núñez", "Palermo", "Parque Patricios", "Puerto Madero", "Recoleta",
      "Retiro", "Saavedra", "San Cristóbal", "San Nicolás", "San Telmo",
      "Villa Crespo", "Villa del Parque", "Villa Devoto", "Villa Urquiza"
    ],
    "Buenos Aires": [
      "Avellaneda", "Bahía Blanca", "Banfield", "Berazategui", "Campana",
      "Castelar", "Escobar", "Ezeiza", "Florencio Varela", "Haedo", "Ituzaingó",
      "Junín", "La Plata", "Lanús", "Lomas de Zamora", "Luján", "Mar del Plata",
      "Martínez", "Merlo", "Moreno", "Morón", "Necochea", "Nordelta", "Olavarría",
      "Olivos", "Pergamino", "Pilar", "Pinamar", "Quilmes", "Ramos Mejía",
      "San Fernando", "San Isidro", "San Justo", "San Martín", "San Miguel",
      "San Nicolás de los Arroyos", "Tandil", "Tigre", "Vicente López", "Villa Gesell", "Zárate"
    ],
    "Catamarca": ["San Fernando del Valle de Catamarca", "Andalgalá", "Belén", "Santa María", "Tinogasta", "Valle Viejo"],
    "Chaco": ["Resistencia", "Presidencia Roque Sáenz Peña", "Barranqueras", "Fontana", "Villa Ángela", "Charata"],
    "Chubut": ["Rawson", "Comodoro Rivadavia", "Puerto Madryn", "Trelew", "Esquel", "Rada Tilly"],
    "Córdoba": [
      "Córdoba Capital", "Alta Gracia", "Bell Ville", "Carlos Paz (Villa Carlos Paz)",
      "Cosquín", "Jesús María", "La Calera", "La Falda", "Río Cuarto",
      "Río Tercero", "San Francisco", "Villa Allende", "Villa Dolores", "Villa María"
    ],
    "Corrientes": ["Corrientes Capital", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Mercedes", "Bella Vista", "Esquina"],
    "Entre Ríos": ["Paraná", "Concordia", "Gualeguaychú", "Concepción del Uruguay", "Gualeguay", "Victoria", "Chajarí", "Colón"],
    "Formosa": ["Formosa Capital", "Clorinda", "Pirané", "El Colorado", "Las Lomitas"],
    "Jujuy": ["San Salvador de Jujuy", "Palpalá", "San Pedro de Jujuy", "Libertador General San Martín", "Perico", "Humahuaca", "Tilcara"],
    "La Pampa": ["Santa Rosa", "General Pico", "Toay", "General Acha", "Eduardo Castex", "Realicó"],
    "La Rioja": ["La Rioja Capital", "Chilecito", "Aimogasta", "Chamical", "Chepes"],
    "Mendoza": [
      "Mendoza Capital", "Godoy Cruz", "Guaymallén", "Las Heras", "Luján de Cuyo",
      "Maipú", "San Martín", "San Rafael", "General Alvear", "Tunuyán", "Malargüe"
    ],
    "Misiones": ["Posadas", "Oberá", "Eldorado", "Puerto Iguazú", "Apóstoles", "Leandro N. Alem", "Montecarlo"],
    "Neuquén": ["Neuquén Capital", "Plottier", "Centenario", "Cutral Có", "San Martín de los Andes", "Villa La Angostura", "Zapala"],
    "Río Negro": ["Viedma", "San Carlos de Bariloche", "General Roca", "Cipolletti", "Villa Regina", "El Bolsón", "Las Grutas"],
    "Salta": ["Salta Capital", "San Ramón de la Nueva Orán", "Tartagal", "General Güemes", "Cafayate", "Metán", "Rosario de la Frontera"],
    "San Juan": ["San Juan Capital", "Rawson", "Rivadavia", "Chimbas", "Santa Lucía", "Pocito", "Caucete"],
    "San Luis": ["San Luis Capital", "Villa Mercedes", "Villa de Merlo", "Juana Koslay", "La Punta", "Justo Daract"],
    "Santa Cruz": ["Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Puerto Deseado", "Las Heras"],
    "Santa Fe": [
      "Santa Fe Capital", "Rosario", "Rafaela", "Venado Tuerto", "Reconquista",
      "Santo Tomé", "Villa Gobernador Gálvez", "San Lorenzo", "Casilda", "Esperanza", "Funes", "Roldán"
    ],
    "Santiago del Estero": ["Santiago del Estero Capital", "La Banda", "Termas de Río Hondo", "Frías", "Añatuya"],
    "Tierra del Fuego": ["Ushuaia", "Río Grande", "Tolhuin"],
    "Tucumán": ["San Miguel de Tucumán", "Yerba Buena", "Tafí Viejo", "Banda del Río Salí", "Concepción", "Monteros", "Alderetes"]
  }
};
