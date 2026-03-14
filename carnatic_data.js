// Complete 72 Melakarta Ragas with nested Janya Ragas
// Notation key:
// S = Sa (1/1)
// r = Shuddha Rishabham / Komal Re (16/15)
// R = Chathusruthi Rishabham / Shuddha Re (9/8)
// g = Sadharana Gandharam / Komal Ga (6/5)
// G = Antara Gandharam / Shuddha Ga (5/4)
// m = Shuddha Madhyamam / Shuddha Ma (4/3)
// M = Prati Madhyamam / Tivra Ma (45/32)
// P = Pa (3/2)
// d = Shuddha Dhaivatham / Komal Dha (8/5)
// D = Chathusruthi Dhaivatham / Shuddha Dha (5/3)
// n = Kaisiki Nishadham / Komal Ni (9/5)
// N = Kakali Nishadham / Shuddha Ni (15/8)

window.CARNATIC_HIERARCHY = [
    // Chakra 1: Indu (r, R)
    { name: "01 Kanakangi", swaras: ["S", "r", "R", "m", "P", "d", "D"], janyas: [] },
    { name: "02 Ratnangi", swaras: ["S", "r", "R", "m", "P", "d", "n"], janyas: [] },
    { name: "03 Ganamurti", swaras: ["S", "r", "R", "m", "P", "d", "N"], janyas: [] },
    { name: "04 Vanaspati", swaras: ["S", "r", "R", "m", "P", "D", "n"], janyas: [] },
    { name: "05 Manavati", swaras: ["S", "r", "R", "m", "P", "D", "N"], janyas: [] },
    { name: "06 Tanarupi", swaras: ["S", "r", "R", "m", "P", "n", "N"], janyas: [] },

    // Chakra 2: Netra (r, g)
    { name: "07 Senavati", swaras: ["S", "r", "g", "m", "P", "d", "D"], janyas: [] },
    { name: "08 Hanumatodi", swaras: ["S", "r", "g", "m", "P", "d", "n"], janyas: [
        { name: "Dhanyasi", swaras: ["S", "g", "m", "P", "n"] },
        { name: "Punnagavarali", swaras: ["n", "s", "r", "g", "m", "p", "d", "n"] }
    ]},
    { name: "09 Dhenuka", swaras: ["S", "r", "g", "m", "P", "d", "N"], janyas: [] },
    { name: "10 Natakapriya", swaras: ["S", "r", "g", "m", "P", "D", "n"], janyas: [
        { name: "Hindolam", swaras: ["S", "g", "m", "d", "n"] }
    ]},
    { name: "11 Kokilapriya", swaras: ["S", "r", "g", "m", "P", "D", "N"], janyas: [] },
    { name: "12 Rupavati", swaras: ["S", "r", "g", "m", "P", "n", "N"], janyas: [] },

    // Chakra 3: Agni (r, G)
    { name: "13 Gayakapriya", swaras: ["S", "r", "G", "m", "P", "d", "D"], janyas: [] },
    { name: "14 Vakulabharanam", swaras: ["S", "r", "G", "m", "P", "d", "n"], janyas: [
        { name: "Vasantha", swaras: ["S", "G", "m", "d", "N"] }
    ]},
    { name: "15 Mayamalavagowla", swaras: ["S", "r", "G", "m", "P", "d", "N"], janyas: [
        { name: "Bowli", swaras: ["S", "r", "G", "P", "d"] },
        { name: "Malahari", swaras: ["S", "r", "m", "P", "d"] },
        { name: "Revagupti", swaras: ["S", "r", "G", "P", "d"] },
        { name: "Saveri", swaras: ["S", "r", "m", "P", "d"] }
    ]},
    { name: "16 Chakravakam", swaras: ["S", "r", "G", "m", "P", "D", "n"], janyas: [
        { name: "Bindumalini", swaras: ["S", "r", "G", "P", "n", "S", "n", "D", "P", "G", "r", "S"] }
    ]},
    { name: "17 Suryakantam", swaras: ["S", "r", "G", "m", "P", "D", "N"], janyas: [
        { name: "Saurashtram", swaras: ["S", "r", "G", "M", "P", "M", "D", "N", "S", "N", "D", "P", "M", "G", "r", "S"] }
    ]},
    { name: "18 Hatakambari", swaras: ["S", "r", "G", "m", "P", "n", "N"], janyas: [] },

    // Chakra 4: Veda (R, g)
    { name: "19 Jhankaradhvani", swaras: ["S", "R", "g", "m", "P", "d", "D"], janyas: [] },
    { name: "20 Natabhairavi", swaras: ["S", "R", "g", "m", "P", "d", "n"], janyas: [
        { name: "Abhogi", swaras: ["S", "R", "g", "m", "D"] },
        { name: "Anandabhairavi", swaras: ["S", "R", "g", "m", "P", "D", "n"] },
        { name: "Bhairavi (Carnatic)", swaras: ["S", "R", "g", "m", "P", "d", "D", "n"] },
        { name: "Hindolam", swaras: ["S", "g", "m", "d", "n"] },
        { name: "Jayanthasri", swaras: ["S", "g", "m", "d", "n", "S", "n", "d", "m", "p", "m", "g", "S"] }
    ]},
    { name: "21 Kiravani", swaras: ["S", "R", "g", "m", "P", "d", "N"], janyas: [
        { name: "Kalyanavasantam", swaras: ["S", "g", "m", "d", "N", "S", "N", "d", "P", "m", "g", "R", "S"] }
    ]},
    { name: "22 Kharaharapriya", swaras: ["S", "R", "g", "m", "P", "D", "n"], janyas: [
        { name: "Abhogi", swaras: ["S", "R", "g", "m", "D"] },
        { name: "Darbar", swaras: ["S", "R", "m", "P", "D", "N", "S", "R", "S", "D", "P", "M", "R", "G", "G", "R", "S"] },
        { name: "Mukhari", swaras: ["S", "R", "m", "P", "N", "d", "S", "N", "D", "P", "M", "G", "R", "S"] },
        { name: "Reethigowla", swaras: ["S", "g", "R", "g", "m", "n", "d", "m", "n", "N"] },
        { name: "Sriranjani", swaras: ["S", "R", "g", "m", "D", "n"] }
    ]},
    { name: "23 Gourimanohari", swaras: ["S", "R", "g", "m", "P", "D", "N"], janyas: [] },
    { name: "24 Varunapriya", swaras: ["S", "R", "g", "m", "P", "n", "N"], janyas: [] },

    // Chakra 5: Bana (R, G)
    { name: "25 Mararanjani", swaras: ["S", "R", "G", "m", "P", "d", "D"], janyas: [] },
    { name: "26 Charukesi", swaras: ["S", "R", "G", "m", "P", "d", "n"], janyas: [] },
    { name: "27 Sarasangi", swaras: ["S", "R", "G", "m", "P", "d", "N"], janyas: [
        { name: "Kamala Manohari", swaras: ["S", "G", "m", "P", "N", "S", "N", "d", "P", "m", "G", "S"] }
    ]},
    { name: "28 Harikambhoji", swaras: ["S", "R", "G", "m", "P", "D", "n"], janyas: [
        { name: "Kambhoji", swaras: ["S", "R", "G", "m", "P", "D", "S", "S", "N", "D", "P", "M", "G", "R", "S"] },
        { name: "Khamas", swaras: ["S", "m", "G", "m", "P", "D", "n", "N", "S", "S", "N", "D", "P", "M", "G", "M", "R", "S"] },
        { name: "Mohanam", swaras: ["S", "R", "G", "P", "D"] }, // Can be Dheerasankarabharanam too
        { name: "Sahana", swaras: ["S", "R", "G", "m", "P", "M", "D", "N", "S", "N", "D", "P", "M", "G", "M", "R", "G", "R", "S"] }
    ]},
    { name: "29 Dheerasankarabharanam", swaras: ["S", "R", "G", "m", "P", "D", "N"], janyas: [
        { name: "Arabhi", swaras: ["S", "R", "m", "P", "D"] },
        { name: "Begada", swaras: ["S", "G", "R", "G", "M", "P", "D", "P", "S", "S", "N", "D", "P", "M", "G", "R", "S"] },
        { name: "Bilahari", swaras: ["S", "R", "G", "P", "D", "S", "S", "N", "D", "P", "M", "G", "R", "S"] },
        { name: "Hamsadhvani", swaras: ["S", "R", "G", "P", "N"] },
        { name: "Kedaragowla", swaras: ["S", "R", "M", "P", "N", "S", "S", "N", "D", "P", "M", "G", "R", "S"] },
        { name: "Niroshta", swaras: ["S", "R", "G", "D", "N", "S", "S", "N", "D", "G", "R", "S"] }
    ]},
    { name: "30 Naganandini", swaras: ["S", "R", "G", "m", "P", "n", "N"], janyas: [] },

    // Chakra 6: Rutu (g, G)
    { name: "31 Yagapriya", swaras: ["S", "g", "G", "m", "P", "d", "D"], janyas: [] },
    { name: "32 Ragavardhani", swaras: ["S", "g", "G", "m", "P", "d", "n"], janyas: [] },
    { name: "33 Gangeyabhushani", swaras: ["S", "g", "G", "m", "P", "d", "N"], janyas: [] },
    { name: "34 Vagadheeswari", swaras: ["S", "g", "G", "m", "P", "D", "n"], janyas: [] },
    { name: "35 Shulini", swaras: ["S", "g", "G", "m", "P", "D", "N"], janyas: [] },
    { name: "36 Chalanata", swaras: ["S", "g", "G", "m", "P", "n", "N"], janyas: [
        { name: "Nata", swaras: ["S", "g", "G", "m", "P", "N"] }
    ]},

    // Chakra 7: Rishi (r, R)
    { name: "37 Salagam", swaras: ["S", "r", "R", "M", "P", "d", "D"], janyas: [] },
    { name: "38 Jalarnavam", swaras: ["S", "r", "R", "M", "P", "d", "n"], janyas: [] },
    { name: "39 Jhalavarali", swaras: ["S", "r", "R", "M", "P", "d", "N"], janyas: [] },
    { name: "40 Navaneetam", swaras: ["S", "r", "R", "M", "P", "D", "n"], janyas: [] },
    { name: "41 Pavani", swaras: ["S", "r", "R", "M", "P", "D", "N"], janyas: [] },
    { name: "42 Raghupriya", swaras: ["S", "r", "R", "M", "P", "n", "N"], janyas: [] },

    // Chakra 8: Vasu (r, g)
    { name: "43 Gavambhodi", swaras: ["S", "r", "g", "M", "P", "d", "D"], janyas: [] },
    { name: "44 Bhavapriya", swaras: ["S", "r", "g", "M", "P", "d", "n"], janyas: [] },
    { name: "45 Shubhapantuvarali", swaras: ["S", "r", "g", "M", "P", "d", "N"], janyas: [] },
    { name: "46 Shadvidhamargini", swaras: ["S", "r", "g", "M", "P", "D", "n"], janyas: [] },
    { name: "47 Suvarnangi", swaras: ["S", "r", "g", "M", "P", "D", "N"], janyas: [] },
    { name: "48 Divyamani", swaras: ["S", "r", "g", "M", "P", "n", "N"], janyas: [] },

    // Chakra 9: Brahma (r, G)
    { name: "49 Dhavalambari", swaras: ["S", "r", "G", "M", "P", "d", "D"], janyas: [] },
    { name: "50 Namanarayani", swaras: ["S", "r", "G", "M", "P", "d", "n"], janyas: [] },
    { name: "51 Kamavardhani (Pantuvarali)", swaras: ["S", "r", "G", "M", "P", "d", "N"], janyas: [] },
    { name: "52 Ramapriya", swaras: ["S", "r", "G", "M", "P", "D", "n"], janyas: [] },
    { name: "53 Gamanashrama", swaras: ["S", "r", "G", "M", "P", "D", "N"], janyas: [
        { name: "Purvikalyani", swaras: ["S", "r", "G", "M", "P", "D", "P", "S", "S", "N", "D", "P", "M", "G", "r", "S"] }
    ]},
    { name: "54 Vishwambari", swaras: ["S", "r", "G", "M", "P", "n", "N"], janyas: [] },

    // Chakra 10: Disi (R, g)
    { name: "55 Shyamalangi", swaras: ["S", "R", "g", "M", "P", "d", "D"], janyas: [] },
    { name: "56 Shanmukhapriya", swaras: ["S", "R", "g", "M", "P", "d", "n"], janyas: [] },
    { name: "57 Simhendramadhyamam", swaras: ["S", "R", "g", "M", "P", "d", "N"], janyas: [] },
    { name: "58 Hemavati", swaras: ["S", "R", "g", "M", "P", "D", "n"], janyas: [] },
    { name: "59 Dharmavati", swaras: ["S", "R", "g", "M", "P", "D", "N"], janyas: [
        { name: "Ranjani", swaras: ["S", "R", "g", "M", "D", "S", "S", "N", "D", "M", "g", "S"] }
    ]},
    { name: "60 Neetimati", swaras: ["S", "R", "g", "M", "P", "n", "N"], janyas: [] },

    // Chakra 11: Rudra (R, G)
    { name: "61 Kantamani", swaras: ["S", "R", "G", "M", "P", "d", "D"], janyas: [] },
    { name: "62 Rishabhapriya", swaras: ["S", "R", "G", "M", "P", "d", "n"], janyas: [] },
    { name: "63 Latangi", swaras: ["S", "R", "G", "M", "P", "d", "N"], janyas: [] },
    { name: "64 Vachaspati", swaras: ["S", "R", "G", "M", "P", "D", "n"], janyas: [
        { name: "Saraswati", swaras: ["S", "R", "M", "P", "D", "S", "S", "n", "D", "P", "M", "R", "S"] }
    ]},
    { name: "65 Mechakalyani", swaras: ["S", "R", "G", "M", "P", "D", "N"], janyas: [
        { name: "Amritavarshini", swaras: ["S", "G", "M", "P", "N"] },
        { name: "Hamir Kalyani", swaras: ["S", "G", "P", "D", "N", "S", "S", "N", "D", "P", "M", "G", "M", "R", "S"] }
    ]},
    { name: "66 Chitrambari", swaras: ["S", "R", "G", "M", "P", "n", "N"], janyas: [] },

    // Chakra 12: Aditya (g, G) // Fixed swara map for visualization
    { name: "67 Sucharitra", swaras: ["S", "g", "G", "M", "P", "d", "D"], janyas: [] },
    { name: "68 Jyoti Swarupini", swaras: ["S", "g", "G", "M", "P", "d", "n"], janyas: [] },
    { name: "69 Dhatuvardhani", swaras: ["S", "g", "G", "M", "P", "d", "N"], janyas: [] },
    { name: "70 Nasikabhushani", swaras: ["S", "g", "G", "M", "P", "D", "n"], janyas: [] },
    { name: "71 Kosalam", swaras: ["S", "g", "G", "M", "P", "D", "N"], janyas: [] },
    { name: "72 Rasikapriya", swaras: ["S", "g", "G", "M", "P", "n", "N"], janyas: [] }
];
