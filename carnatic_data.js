// Complete 72 Melakarta Ragas mapping to internal Swara notation (S r R g G m M P d D n N)

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

// Note: Carnatic music has overlapping swara names for the same frequencies depending on the raga
// For example:
// R2 (Chathusruthi Rishabham) = G1 (Shuddha Gandharam) -> We map to 'R' (9/8)
// R3 (Shatsruthi Rishabham) = G2 (Sadharana Gandharam) -> We map to 'g' (6/5)
// D2 (Chathusruthi Dhaivatham) = N1 (Shuddha Nishadham) -> We map to 'D' (5/3)
// D3 (Shatsruthi Dhaivatham) = N2 (Kaisiki Nishadham) -> We map to 'n' (9/5)

window.CARNATIC_RAGAS = {
    // Chakra 1: Indu (r, R) [Note mapping G1 to R for visualization]
    "01 Kanakangi": ["S", "r", "R", "m", "P", "d", "D"],
    "02 Ratnangi": ["S", "r", "R", "m", "P", "d", "n"],
    "03 Ganamurti": ["S", "r", "R", "m", "P", "d", "N"],
    "04 Vanaspati": ["S", "r", "R", "m", "P", "D", "n"],
    "05 Manavati": ["S", "r", "R", "m", "P", "D", "N"],
    "06 Tanarupi": ["S", "r", "R", "m", "P", "n", "N"],

    // Chakra 2: Netra (r, g)
    "07 Senavati": ["S", "r", "g", "m", "P", "d", "D"],
    "08 Hanumatodi": ["S", "r", "g", "m", "P", "d", "n"],
    "09 Dhenuka": ["S", "r", "g", "m", "P", "d", "N"],
    "10 Natakapriya": ["S", "r", "g", "m", "P", "D", "n"],
    "11 Kokilapriya": ["S", "r", "g", "m", "P", "D", "N"],
    "12 Rupavati": ["S", "r", "g", "m", "P", "n", "N"],

    // Chakra 3: Agni (r, G)
    "13 Gayakapriya": ["S", "r", "G", "m", "P", "d", "D"],
    "14 Vakulabharanam": ["S", "r", "G", "m", "P", "d", "n"],
    "15 Mayamalavagowla": ["S", "r", "G", "m", "P", "d", "N"],
    "16 Chakravakam": ["S", "r", "G", "m", "P", "D", "n"],
    "17 Suryakantam": ["S", "r", "G", "m", "P", "D", "N"],
    "18 Hatakambari": ["S", "r", "G", "m", "P", "n", "N"],

    // Chakra 4: Veda (R, g)
    "19 Jhankaradhvani": ["S", "R", "g", "m", "P", "d", "D"],
    "20 Natabhairavi": ["S", "R", "g", "m", "P", "d", "n"],
    "21 Keeravani": ["S", "R", "g", "m", "P", "d", "N"],
    "22 Kharaharapriya": ["S", "R", "g", "m", "P", "D", "n"],
    "23 Gourimanohari": ["S", "R", "g", "m", "P", "D", "N"],
    "24 Varunapriya": ["S", "R", "g", "m", "P", "n", "N"],

    // Chakra 5: Bana (R, G)
    "25 Mararanjani": ["S", "R", "G", "m", "P", "d", "D"],
    "26 Charukesi": ["S", "R", "G", "m", "P", "d", "n"],
    "27 Sarasangi": ["S", "R", "G", "m", "P", "d", "N"],
    "28 Harikambhoji": ["S", "R", "G", "m", "P", "D", "n"],
    "29 Sankarabharanam": ["S", "R", "G", "m", "P", "D", "N"],
    "30 Naganandini": ["S", "R", "G", "m", "P", "n", "N"],

    // Chakra 6: Rutu (g, G)
    "31 Yagapriya": ["S", "g", "G", "m", "P", "d", "D"],
    "32 Ragavardhini": ["S", "g", "G", "m", "P", "d", "n"],
    "33 Gangeyabhushani": ["S", "g", "G", "m", "P", "d", "N"],
    "34 Vagadheeswari": ["S", "g", "G", "m", "P", "D", "n"],
    "35 Shulini": ["S", "g", "G", "m", "P", "D", "N"],
    "36 Chalanata": ["S", "g", "G", "m", "P", "n", "N"],

    // Chakra 7: Rishi (r, R) - Prati Madhyamam (M)
    "37 Salagam": ["S", "r", "R", "M", "P", "d", "D"],
    "38 Jalarnavam": ["S", "r", "R", "M", "P", "d", "n"],
    "39 Jhalavarali": ["S", "r", "R", "M", "P", "d", "N"],
    "40 Navaneetam": ["S", "r", "R", "M", "P", "D", "n"],
    "41 Pavani": ["S", "r", "R", "M", "P", "D", "N"],
    "42 Raghupriya": ["S", "r", "R", "M", "P", "n", "N"],

    // Chakra 8: Vasu (r, g)
    "43 Gavambhodi": ["S", "r", "g", "M", "P", "d", "D"],
    "44 Bhavapriya": ["S", "r", "g", "M", "P", "d", "n"],
    "45 Shubhapantuvarali": ["S", "r", "g", "M", "P", "d", "N"],
    "46 Shadvidhamargini": ["S", "r", "g", "M", "P", "D", "n"],
    "47 Suvarnangi": ["S", "r", "g", "M", "P", "D", "N"],
    "48 Divyamani": ["S", "r", "g", "M", "P", "n", "N"],

    // Chakra 9: Brahma (r, G)
    "49 Dhavalambari": ["S", "r", "G", "M", "P", "d", "D"],
    "50 Namanarayani": ["S", "r", "G", "M", "P", "d", "n"],
    "51 Kamavardhani (Pantuvarali)": ["S", "r", "G", "M", "P", "d", "N"],
    "52 Ramapriya": ["S", "r", "G", "M", "P", "D", "n"],
    "53 Gamanashrama": ["S", "r", "G", "M", "P", "D", "N"],
    "54 Vishwambari": ["S", "r", "G", "M", "P", "n", "N"],

    // Chakra 10: Disi (R, g)
    "55 Shyamalangi": ["S", "R", "g", "M", "P", "d", "D"],
    "56 Shanmukhapriya": ["S", "R", "g", "M", "P", "d", "n"],
    "57 Simhendramadhyamam": ["S", "R", "g", "M", "P", "d", "N"],
    "58 Hemavati": ["S", "R", "g", "M", "P", "D", "n"],
    "59 Dharmavati": ["S", "R", "g", "M", "P", "D", "N"],
    "60 Neetimati": ["S", "R", "g", "M", "P", "n", "N"],

    // Chakra 11: Rudra (R, G)
    "61 Kantamani": ["S", "R", "G", "M", "P", "d", "D"],
    "62 Rishabhapriya": ["S", "R", "G", "M", "P", "d", "n"],
    "63 Latangi": ["S", "R", "G", "M", "P", "d", "N"],
    "64 Vachaspati": ["S", "R", "G", "M", "P", "D", "n"],
    "65 Mechakalyani (Kalyani)": ["S", "R", "G", "M", "P", "D", "N"],
    "66 Chitrambari": ["S", "R", "G", "M", "P", "n", "N"],

    // Chakra 12: Aditya (g, G)
    "67 Sucharitra": ["S", "g", "G", "M", "P", "d", "D"],
    "68 Jyotiswarupini": ["S", "g", "G", "M", "P", "d", "n"],
    "69 Dhatuvardhani": ["S", "g", "G", "M", "P", "d", "N"],
    "70 Nasikabhushani": ["S", "g", "G", "M", "P", "D", "n"],
    "71 Kosalam": ["S", "g", "G", "M", "P", "D", "N"],
    "72 Rasikapriya": ["S", "g", "G", "M", "P", "n", "N"],

    // --- Popular Janya Ragas ---
    "[J] Mohanam": ["S", "R", "G", "P", "D"],
    "[J] Hamsadhvani": ["S", "R", "G", "P", "N"],
    "[J] Hindolam": ["S", "g", "m", "d", "n"],
    "[J] Abhogi": ["S", "R", "g", "m", "D"],
    "[J] Sriranjani": ["S", "R", "g", "m", "D", "n"],
    "[J] Kambhoji": ["S", "R", "G", "m", "P", "D", "n", "N"], // Bhashanga (uses both Ni)
    "[J] Bhairavi (Carnatic)": ["S", "R", "g", "m", "P", "d", "D", "n"], // Bhashanga (uses both Dha)
    "[J] Anandabhairavi": ["S", "R", "g", "G", "m", "P", "d", "n"], // Bhashanga
    "[J] Vasantha": ["S", "G", "m", "d", "N"],
    "[J] Bowli": ["S", "r", "G", "P", "d"],
    "[J] Malahari": ["S", "r", "m", "P", "d"],
    "[J] Bilahari": ["S", "R", "G", "P", "D", "N"],
    "[J] Madhyamavati": ["S", "R", "m", "P", "n"],
    "[J] Arabhi": ["S", "R", "m", "P", "D"],
    "[J] Kedaragowla": ["S", "R", "m", "P", "n"]
};
