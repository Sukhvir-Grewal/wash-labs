// carList.js
const carList = [
    {
        name: "Honda",
        models: [
            "Civic",
            "Accord",
            "CR-V",
            "HR-V",
            "Pilot",
            "Odyssey",
            "Ridgeline",
            "Insight",
            "Passport",
            "Fit",
        ],
    },
    {
        name: "Toyota",
        models: [
            "Corolla",
            "Camry",
            "RAV4",
            "Highlander",
            "Tacoma",
            "Prius",
            "Sienna",
            "Tundra",
            "Sequoia",
            "Avalon",
            "4Runner",
        ],
    },
    {
        name: "Ford",
        models: [
            "F-150",
            "Escape",
            "Mustang",
            "Explorer",
            "Edge",
            "Super Duty",
            "Bronco",
            "Expedition",
            "Maverick",
            "Fusion",
        ],
    },
    {
        name: "Chevrolet",
        models: [
            "Silverado",
            "Equinox",
            "Malibu",
            "Traverse",
            "Colorado",
            "Bolt EV",
            "Spark",
            "Tahoe",
            "Suburban",
            "Blazer",
        ],
    },
    {
        name: "Hyundai",
        models: [
            "Kona",
            "Elantra",
            "Tucson",
            "Santa Fe",
            "Palisade",
            "Ioniq",
            "Veloster",
            "Sonata",
            "Venue",
        ],
    },
    {
        name: "Nissan",
        models: [
            "Rogue",
            "Altima",
            "Sentra",
            "Murano",
            "Frontier",
            "Leaf",
            "Kicks",
            "Titan",
            "Pathfinder",
            "Maxima",
            "Armada",
        ],
    },
    { name: "Ram", models: ["1500", "2500", "3500", "ProMaster"] },
    { name: "GMC", models: ["Sierra", "Canyon", "Terrain", "Acadia", "Yukon"] },
    {
        name: "Kia",
        models: [
            "Sorento",
            "Sportage",
            "Telluride",
            "Forte",
            "Soul",
            "K5",
            "Carnival",
            "Seltos",
        ],
    },
    {
        name: "Mazda",
        models: [
            "CX-5",
            "Mazda3",
            "CX-30",
            "Mazda6",
            "CX-9",
            "MX-5",
            "CX-50",
            "CX-90",
        ],
    },
    {
        name: "Volkswagen",
        models: [
            "Jetta",
            "Golf",
            "Tiguan",
            "Passat",
            "ID.4",
            "ID. Buzz",
            "Arteon",
            "Atlas",
        ],
    },
    {
        name: "BMW",
        models: [
            "3 Series",
            "X5",
            "X3",
            "5 Series",
            "X7",
            "i4",
            "iX",
            "i3",
            "M3",
            "M5",
        ],
    },
    {
        name: "Mercedes-Benz",
        models: [
            "C-Class",
            "GLC",
            "E-Class",
            "GLS",
            "EQB",
            "EQS",
            "EQE",
            "EQC",
            "S-Class",
            "A-Class",
        ],
    },
    {
        name: "Audi",
        models: [
            "A4",
            "Q5",
            "A3",
            "Q7",
            "e-tron",
            "Q4 e-tron",
            "Q5 e-tron",
            "A6 e-tron",
            "A8",
        ],
    },
    {
        name: "Tesla",
        models: [
            "Model 3",
            "Model Y",
            "Model S",
            "Model X",
            "Cybertruck",
            "Roadster",
            "Model S Plaid",
        ],
    },
    {
        name: "Jeep",
        models: [
            "Grand Cherokee",
            "Cherokee",
            "Wrangler",
            "Compass",
            "Gladiator",
            "Wagoneer",
            "Grand Wagoneer",
            "Renegade",
        ],
    },
    {
        name: "Subaru",
        models: [
            "Outback",
            "Forester",
            "Impreza",
            "Crosstrek",
            "Ascent",
            "WRX",
            "BRZ",
            "Legacy",
        ],
    },
    {
        name: "Chrysler",
        models: [
            "Pacifica",
            "Voyager",
            "Grand Caravan",
            "300",
            "Aspen",
            "Pacifica Hybrid",
        ],
    },
    {
        name: "Buick",
        models: [
            "Envision",
            "Encore",
            "Enclave",
            "Regal",
            "Cascada",
            "Verano",
            "Encore GX",
        ],
    },
    { name: "Lexus", models: ["RX", "NX", "ES", "UX", "GX", "LX", "LC", "IS"] },
    {
        name: "Porsche",
        models: [
            "911",
            "Macan",
            "Cayenne",
            "Taycan",
            "718 Cayman",
            "718 Boxster",
            "Panamera",
        ],
    },
    { name: "Acura", models: ["MDX", "RDX", "TLX", "ILX", "Integra", "NSX"] },
    { name: "Volvo", models: ["XC40", "XC60", "XC90", "S60", "S90", "V60"] },
    {
        name: "Jaguar",
        models: ["F-Pace", "E-Pace", "I-Pace", "XF", "XE", "F-Type"],
    },
    {
        name: "Land Rover",
        models: [
            "Range Rover",
            "Range Rover Sport",
            "Range Rover Velar",
            "Defender",
            "Discovery",
        ],
    },
    {
        name: "Mitsubishi",
        models: ["Outlander", "Eclipse Cross", "Mirage", "RVR"],
    },

    {
        name: "Dodge",
        models: [
            "Charger",
            "Challenger",
            "Durango",
            "Hornet",
            "Journey",
            "Caravan",
        ],
    },
    {
        name: "Infiniti",
        models: ["Q50", "Q60", "QX50", "QX60", "QX80"],
    },
    {
        name: "Lincoln",
        models: ["Navigator", "Aviator", "Corsair", "Nautilus"],
    },
    {
        name: "Cadillac",
        models: ["Escalade", "XT5", "XT6", "Lyriq", "CT5", "CT4"],
    },
    {
        name: "Genesis",
        models: ["G70", "G80", "G90", "GV70", "GV80"],
    },
    {
        name: "Alfa Romeo",
        models: ["Giulia", "Stelvio", "Tonale", "4C"],
    },
    {
        name: "Mini",
        models: ["Cooper", "Clubman", "Countryman", "Hardtop"],
    },
    {
        name: "Fiat",
        models: ["500", "500X", "500e", "124 Spider"],
    },
    {
        name: "Peugeot",
        models: ["208", "2008", "3008", "5008"],
    },
    {
        name: "Renault",
        models: ["Clio", "Megane", "Captur", "Kadjar", "Koleos"],
    },
    {
        name: "Suzuki",
        models: ["Swift", "Vitara", "Jimny", "SX4"],
    },
    {
        name: "Maserati",
        models: ["Ghibli", "Quattroporte", "Levante", "MC20", "GranTurismo"],
    },
    {
        name: "Ferrari",
        models: ["488", "F8 Tributo", "Roma", "Portofino", "SF90 Stradale"],
    },
    {
        name: "Lamborghini",
        models: ["Huracán", "Aventador", "Urus", "Revuelto", "Gallardo"],
    },
    {
        name: "Aston Martin",
        models: ["DB11", "DBS", "Vantage", "DBX", "Valhalla"],
    },
    {
        name: "Bentley",
        models: ["Continental GT", "Flying Spur", "Bentayga", "Mulsanne"],
    },
    {
        name: "Rolls-Royce",
        models: ["Phantom", "Ghost", "Cullinan", "Wraith", "Dawn"],
    },
    {
        name: "Bugatti",
        models: ["Chiron", "Veyron", "Divo", "Bolide"],
    },
    {
        name: "McLaren",
        models: ["720S", "570S", "Artura", "P1", "GT"],
    },
    {
        name: "Polestar",
        models: ["Polestar 2", "Polestar 3", "Polestar 4", "Polestar 5"],
    },
    {
        name: "Lucid",
        models: ["Air", "Gravity"],
    },
    {
        name: "Rivian",
        models: ["R1T", "R1S"],
    },
    {
        name: "BYD",
        models: ["Tang", "Han", "Atto 3", "Dolphin", "Seal"],
    },
    {
        name: "Chery",
        models: ["Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5"],
    },
    {
        name: "Geely",
        models: ["Coolray", "Emgrand", "Atlas", "Preface"],
    },
    {
        name: "Mahindra",
        models: ["XUV700", "Scorpio", "Bolero", "Thar"],
    },
    {
        name: "Tata",
        models: ["Nexon", "Harrier", "Safari", "Altroz", "Punch"],
    },
    {
        name: "Citroën",
        models: ["C3", "C4", "C5 Aircross", "Berlingo", "Ami"],
    },
    {
        name: "Opel",
        models: ["Corsa", "Astra", "Mokka", "Insignia", "Crossland"],
    },
    {
        name: "Vauxhall",
        models: ["Corsa", "Astra", "Mokka", "Crossland"], // UK versions of Opel
    },
    {
        name: "Skoda",
        models: ["Octavia", "Superb", "Kodiaq", "Kamiq", "Fabia"],
    },
    {
        name: "Seat",
        models: ["Ibiza", "Leon", "Ateca", "Arona", "Tarraco"],
    },
    {
        name: "Dacia",
        models: ["Duster", "Sandero", "Logan", "Jogger"],
    },
    {
        name: "Saab",
        models: ["9-3", "9-5", "900", "9000"], // legacy brand, but recognizable
    },
    {
        name: "Holden",
        models: ["Commodore", "Colorado", "Captiva", "Barina"], // Australia, discontinued but common
    },
    {
        name: "Perodua",
        models: ["Myvi", "Axia", "Bezza", "Ativa"], // Malaysia
    },
    {
        name: "Proton",
        models: ["Saga", "Persona", "X70", "X50"], // Malaysia
    },
    {
        name: "Great Wall",
        models: ["Haval H6", "Haval Jolion", "Poer", "Tank 300"], // China
    },
    {
        name: "FAW",
        models: ["Bestune T77", "Bestune T99", "Hongqi H9"], // China
    },
    {
        name: "Dongfeng",
        models: ["Aeolus AX7", "Fengshen E70"], // China
    },
    {
        name: "SAIC Motor",
        models: ["MG ZS", "MG Hector", "MG5 EV"], // Owns MG brand now
    },
    {
        name: "Lada",
        models: ["Niva", "Vesta", "Granta", "XRay"], // Russia
    },
    {
        name: "UAZ",
        models: ["Patriot", "Hunter", "Bukhanka"], // Russia
    },
    {
        name: "Koenigsegg",
        models: ["Jesko", "Regera", "Agera RS", "Gemera"], // Sweden supercars
    },
    {
        name: "Pagani",
        models: ["Huayra", "Zonda", "Utopia"], // Italy hypercars
    },
    {
        name: "Fisker",
        models: ["Ocean", "Karma", "Ronin"], // US EV startup
    },
    {
        name: "Nikola",
        models: ["Tre", "Badger"], // US EV/hydrogen startup
    },
    {
        name: "Pontiac",
        models: ["Firebird", "GTO", "Grand Prix", "Bonneville"],
    },
    {
        name: "Saturn",
        models: ["Ion", "Vue", "Sky", "Aura"],
    },
    {
        name: "Hummer",
        models: ["H1", "H2", "H3", "EV"],
    },
    {
        name: "AMC",
        models: ["Gremlin", "Pacer", "Javelin", "Eagle"],
    },
    {
        name: "Lancia",
        models: ["Ypsilon", "Delta", "Thema"],
    },
    {
        name: "De Tomaso",
        models: ["Pantera", "P72"],
    },
    {
        name: "Maybach",
        models: ["57", "62", "S-Class Maybach", "GLS Maybach"],
    },
    {
        name: "Smart",
        models: ["Fortwo", "Forfour", "EQ Fortwo"],
    },
    {
        name: "Isuzu",
        models: ["D-Max", "MU-X", "Trooper", "VehiCROSS"],
    },
    {
        name: "Daihatsu",
        models: ["Terios", "Cuore", "Mira", "Rocky"],
    },
    {
        name: "Lotus",
        models: ["Elise", "Exige", "Evora", "Emira", "Eletre"],
    },
    {
        name: "TVR",
        models: ["Griffith", "Chimaera", "Sagaris"],
    },
    {
        name: "Morgan",
        models: ["Plus Four", "Plus Six", "3 Wheeler", "Super 3"],
    },
    {
        name: "Caterham",
        models: ["Seven 270", "Seven 420", "Seven 620"],
    },
    {
        name: "Saab", // you already added but noting again if needed
        models: ["9-3", "9-5", "900", "9000"],
    },
    {
        name: "Bugatti", // luxury hypercars
        models: ["Chiron", "Veyron", "Divo", "Bolide"],
    },
    {
        name: "DS Automobiles",
        models: ["DS3 Crossback", "DS4", "DS7", "DS9"],
    },
    {
        name: "SsangYong",
        models: ["Rexton", "Tivoli", "Korando", "Musso"],
    },
    {
        name: "Nio",
        models: ["ES6", "ES8", "EC6", "ET7"],
    },
    {
        name: "XPeng",
        models: ["P7", "G3", "G9", "P5"],
    },
    {
        name: "Hongqi",
        models: ["H5", "H9", "E-HS9"],
    },
];

export default carList;
