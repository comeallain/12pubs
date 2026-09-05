/* ------------------------------------------------------------------
   12PUBS — 13 crawls, 155 pubs.
   v = true  : location confirmed against a real listing
   v = false : best guess. Shows amber on the map. Drag it to correct.
   Order within each year is walking order.
   ------------------------------------------------------------------ */

const ARCHIVE = [
  { year: 2011, district: "South City Centre", pubs: [
    ["Toners", 53.3355, -6.2478, true],
    ["Doheny & Nesbitt", 53.3364, -6.2506, true],
    ["O'Donoghues", 53.3376, -6.2532, true],
    ["The Shelbourne", 53.3387, -6.2549, true],
    ["Dawson Lounge", 53.3405, -6.2582, true],
    ["Kehoes", 53.3416, -6.2589, true],
    ["Bruxelles", 53.3410, -6.2617, true],
    ["McDaids", 53.3412, -6.2616, true],
    ["Neary's", 53.3413, -6.2622, true],
    ["Sheehans", 53.3411, -6.2628, true],
    ["Hairy Lemon", 53.3417, -6.2652, true],
    ["Long Hall", 53.3421, -6.2661, true]
  ]},
  { year: 2012, district: "Smithfield", pubs: [
    ["Delaneys", 53.34981, -6.27850, true],
    ["Cobblestone", 53.3498, -6.2778, true],
    ["Dice Bar", 53.3479, -6.2795, true],
    ["Frank Ryans", 53.3465, -6.2794, true],
    ["Hughes", 53.3467, -6.2740, true],
    ["Boars Head", 53.3474, -6.2685, true],
    ["McNeills (Capel St)", 53.3479, -6.2687, true],
    ["TP Smiths", 53.3480, -6.2666, true],
    ["Lotts Bar", 53.3470, -6.2634, true],
    ["Gin Palace", 53.3479, -6.2620, true],
    ["The Oval", 53.3477, -6.2606, true],
    ["Flowing Tide", 53.3487, -6.2568, true]
  ]},
  { year: 2013, district: "South City Centre", pubs: [
    ["Hal'penny Inn", 53.3459, -6.2637, true],
    ["Bison Bar", 53.3455, -6.2660, true],
    ["Fitzgeralds", 53.34663, -6.25964, true],
    ["Palace Bar", 53.3459, -6.2596, true],
    ["Cassidys (Westmoreland St)", 53.3462, -6.2588, true],
    ["Kennedys — now The Workshop", 53.3470, -6.2540, true],
    ["The Dark Horse", 53.34735, -6.25580, true],
    ["Mulligans (Poolbeg St)", 53.3466, -6.2544, true],
    ["The Long Stone", 53.3459, -6.2528, true],
    ["Chaplins", 53.3462, -6.2564, true],
    ["Bowes", 53.3457, -6.2590, true],
    ["Doyles (College St)", 53.3451, -6.2578, true]
  ]},
  { year: 2014, district: "Liberties & Camden St", pubs: [
    ["Bull and Castle", 53.3435, -6.2699, true],
    ["Lord Edward", 53.3432, -6.2711, true],
    ["Ryans Christchurch", 53.34336, -6.27333, true],
    ["O'Shea's Merchant", 53.3450, -6.2762, true],
    ["Brazen Head", 53.3449, -6.2763, true],
    ["Bakers Pub", 53.34265, -6.27894, true],
    ["Thomas House", 53.3427, -6.2818, true],
    ["Liberty Belle", 53.3411, -6.2761, true],
    ["Shanahans", 53.33980, -6.27570, true],
    ["J Fallon's", 53.3390, -6.2790, true],
    ["Kavanaghs (Long Lane)", 53.3378, -6.2700, true],
    ["Ryans Camden St", 53.33634, -6.26596, true]
  ]},
  { year: 2015, district: "Rathmines", pubs: [
    ["Mother Reillys", 53.3210, -6.2660, true],
    ["Roddy Bolands", 53.3243, -6.2653, true],
    ["Graces", 53.32181, -6.26644, true],
    ["Slattery's Rathmines", 53.3262, -6.2648, true],
    ["Blackbird", 53.3268, -6.2645, true],
    ["Corrigans", 53.32755, -6.26167, true],
    ["Portobello", 53.3311, -6.2640, true],
    ["J O'Connell's", 53.3315, -6.2638, true],
    ["Bernard Shaw (southside)", 53.3319, -6.2637, true],
    ["Cassidys (Camden St)", 53.3341, -6.2645, true],
    ["Anseo", 53.3348, -6.2648, true],
    ["Devitts", 53.3352, -6.2653, true]
  ]},
  { year: 2017, district: "Glasnevin", pubs: [
    ["Gravediggers", 53.3696, -6.2720, true],
    ["The Bald Eagle", 53.3640, -6.2718, true],
    ["Brian Boru", 53.3652, -6.2720, true],
    ["The Hut", 53.3610, -6.2725, true],
    ["The Bohemian", 53.3609, -6.2729, true],
    ["The Back Page", 53.3585, -6.2731, true],
    ["MacGowans Phibsborough", 53.3566, -6.2738, true],
    ["Walshs Stoneybatter", 53.3504, -6.2817, true],
    ["The Mission Bar", 53.34710, -6.28369, true],
    ["The Cobblestone", 53.3498, -6.2778, true],
    ["Slatterys Capel St", 53.3483, -6.2689, true],
    ["Jack Nealons", 53.3486, -6.2688, true]
  ]},
  { year: 2018, district: "Sandymount & Ringsend", pubs: [
    ["Mulligans (Sandymount)", 53.33293, -6.21584, true],
    ["The Merry Cobbler", 53.33858, -6.22260, true],
    ["The Vintage Inn", 53.33869, -6.22293, true],
    ["The Irishtown House", 53.3400, -6.2270, true],
    ["The Yacht (Ringsend)", 53.3418, -6.2290, true],
    ["Padraig Pearse", 53.3428, -6.2333, true],
    ["The Oarsman", 53.3427, -6.2337, true],
    ["Slatterys (South Lotts Rd)", 53.3400, -6.2380, true],
    ["Becky Morgans", 53.33969, -6.24209, true],
    ["The Square Ball", 53.3400, -6.2455, true],
    ["The Lombard", 53.3448, -6.2495, true],
    ["O'Neills (Pearse St)", 53.3444, -6.2510, true]
  ]},
  { year: 2019, district: "Howth & Marino", pubs: [
    ["Wrights Findlater", 53.3897, -6.0670, true],
    ["Harbour Bar", 53.3893, -6.0658, true],
    ["Top House", 53.3866, -6.0669, true],
    ["McNeills (Howth)", 53.3872, -6.0665, true],
    ["Abbey Tavern", 53.3876, -6.0648, true],
    ["Loft Bar and Grill", 53.38700, -6.06576, false],
    ["O'Connells Pub", 53.38822, -6.06399, true],
    ["Fishermans Bar", 53.3902, -6.0703, true],
    ["Bloody Stream", 53.3886, -6.0672, true],
    ["Graingers Malahide Road", 53.3679, -6.2265, true],
    ["Kavanaghs Marino House", 53.3629, -6.2306, true],
    ["Gaffney and Sons", 53.3630, -6.2365, true]
  ]},
  { year: 2021, district: "Inchicore", pubs: [
    ["Slatts", 53.33779, -6.32887, true],
    ["Rascals", 53.3390, -6.3140, true],
    ["The Grattan", 53.33949, -6.32134, true],
    ["Clearys (Inchicore)", 53.3407, -6.3160, true],
    ["Black Lion", 53.3437, -6.3110, true],
    ["Timothy Croughs", 53.3406, -6.3130, true],
    ["McDowells", 53.34025, -6.31682, true],
    ["The Glen of Aherlow", 53.34080, -6.31069, true],
    ["The Patriot Inn", 53.3428, -6.3050, true],
    ["Old Royal Oak", 53.3430, -6.3040, true],
    ["Kenny's Bar", 53.34243, -6.29446, true],
    ["The Malt House", 53.3428, -6.2925, true]
  ]},
  { year: 2022, district: "Drumcondra", pubs: [
    ["Patrick Carthys", 53.37234, -6.25221, true],
    ["Cat & Cage", 53.3712, -6.2533, true],
    ["Millmount House", 53.3689, -6.2551, true],
    ["Junos", 53.36108, -6.25950, true],
    ["Kennedys (Drumcondra)", 53.3671, -6.2557, true],
    ["McGraths (Drumcondra)", 53.3626, -6.2589, true],
    ["The Hideout", 53.35971, -6.25702, true],
    ["Hogan Stand", 53.3584, -6.2559, true],
    ["Auld Triangle", 53.3590, -6.2616, true],
    ["The Temple", 53.3575, -6.2635, true],
    ["The Findlater", 53.35697, -6.26459, true],
    ["The Berkeley", 53.35579, -6.26794, true]
  ]},
  { year: 2023, district: "Ballsbridge", pubs: [
    ["The Horse Show", 53.3300, -6.2280, true],
    ["Crowes", 53.3287, -6.2300, true],
    ["Mary Macs", 53.3290, -6.2298, true],
    ["Paddy Cullens", 53.3295, -6.2285, true],
    ["The Bridge", 53.3293, -6.2305, true],
    ["The Den", 53.33225, -6.24128, true],
    ["Searsons", 53.3330, -6.2430, true],
    ["The Waterloo", 53.3334, -6.2437, true],
    ["Smyths", 53.3345, -6.2400, true],
    ["The 51", 53.3348, -6.2395, true],
    ["Beggars Bush", 53.3355, -6.2385, true],
    ["The Bath", 53.3372, -6.2340, true]
  ]},
  { year: 2024, district: "Cabra & Stoneybatter", pubs: [
    ["E McGraths", 53.36709, -6.29330, true],
    ["The Homestead", 53.36259, -6.29037, true],
    ["Downeys", 53.36120, -6.28298, true],
    ["Hanlons Corner", 53.3574, -6.2888, true],
    ["Clarkes City Arms", 53.3560, -6.2880, true],
    ["Hynes", 53.3543, -6.2867, true],
    ["Tommy O Garas", 53.3511, -6.2823, true],
    ["The Glimmer Man", 53.3508, -6.2820, true],
    ["The Barbers", 53.35215, -6.27981, true],
    ["The Underdog", 53.35090, -6.27017, true],
    ["The Kings Inn", 53.3523, -6.2691, true],
    ["Cumiskeys", 53.35434, -6.27201, true]
  ]},
  { year: 2025, district: "Harold's Cross & the Liberties", pubs: [
    ["MacGowans", 53.32323, -6.28032, true],
    ["Peggy Kellys", 53.32375, -6.27851, true],
    ["Board — formerly MVP", 53.3280, -6.2760, true],
    ["Harold House", 53.3262, -6.2785, true],
    ["Leonards Corner", 53.3320, -6.2760, true],
    ["Peader Browns", 53.3335, -6.2750, true],
    ["The Fourth Corner", 53.3405, -6.2790, true],
    ["Luckys", 53.3403, -6.2792, true],
    ["Lark Inn", 53.3400, -6.2795, true],
    ["Tom Kennedys", 53.3425, -6.2830, true],
    ["Swift", 53.3408, -6.2788, true],
    ["Arthurs", 53.3427, -6.2845, true]
  ]}
];

/* ------------------------------------------------------------------
   CANDIDATE POOL — pubs NOT yet on the 12Pubs list, with confirmed
   locations and Wednesday opening times. Add to these as you find more.
   open / close are 24h decimal, e.g. 15.5 = 15:30
   ------------------------------------------------------------------ */

const CANDIDATES = [
  // --- Northside: Raheny, Harmonstown, Killester ---
  ["Blackbanks", 53.3861, -6.1557, 12.0, 23.5, "N", "Raheny"],
  ["The Cedar Lounge", 53.3812, -6.1649, 15.0, 23.5, "N", "Raheny"],
  ["The Manhattan", 53.3806, -6.1749, 10.0, 23.5, "N", "Raheny"],
  ["The Raheny Inn", 53.3801, -6.1741, 10.0, 23.5, "N", "Raheny"],
  ["The Watermill Bar", 53.3799, -6.1771, 11.0, 23.5, "N", "Raheny"],
  ["Horse and Hound", 53.3784, -6.1934, 12.5, 23.5, "N", "Harmonstown"],
  ["The Ramble Inn", 53.3755, -6.2095, 12.0, 23.5, "N", "Killester"],
  ["The Beachcomber", 53.3707, -6.2061, 12.0, 23.5, "N", "Killester"],
  // --- Northside: Clontarf & Fairview ---
  ["Grainger's Pebble Beach", 53.3595, -6.1897, 10.5, 23.5, "N", "Clontarf"],
  ["Connolly's The Sheds", 53.3591, -6.1957, 12.5, 23.5, "N", "Clontarf"],
  ["The Yacht (Clontarf)", 53.3617, -6.2151, 10.5, 23.5, "N", "Clontarf"],
  ["Harry Byrnes", 53.3671, -6.2166, 12.5, 23.5, "N", "Clontarf"],
  ["The Strand House", 53.3632, -6.2357, 16.0, 23.5, "N", "Fairview"],
  // --- Northside: Whitehall & Drumcondra ---
  ["Kilmardinny Inn", 53.3913, -6.2354, 10.5, 23.5, "N", "Whitehall"],
  ["The Comet Bar", 53.3885, -6.2463, 10.5, 23.5, "N", "Santry"],
  ["The Viscount", 53.3810, -6.2458, 12.0, 23.0, "N", "Whitehall"],
  ["McGettigan's D9", 53.3777, -6.2468, 17.0, 23.5, "N", "Whitehall"],
  ["The Ivy House", 53.3724, -6.2524, 12.0, 24.0, "N", "Drumcondra"],
  ["Fagan's", 53.3675, -6.2560, 10.5, 23.5, "N", "Drumcondra"],
  ["Quinns of Drumcondra", 53.3636, -6.2580, 7.0, 22.5, "N", "Drumcondra"],
  ["The Tolka House", 53.3738, -6.2690, 10.0, 23.5, "N", "Glasnevin"],
  // --- Northside: Ballybough, North Strand, Amiens St ---
  ["Meaghers", 53.3627, -6.2423, 12.0, 23.5, "N", "Ballybough"],
  ["Clonliffe House", 53.3612, -6.2426, 10.5, 23.5, "N", "Ballybough"],
  ["The Ref", 53.3595, -6.2449, 10.5, 23.5, "N", "Ballybough"],
  ["Annesley House", 53.3596, -6.2403, 10.5, 23.5, "N", "North Strand"],
  ["Cusack's", 53.3575, -6.2425, 10.5, 23.5, "N", "North Strand"],
  ["Bridge Tavern", 53.3573, -6.2489, 10.0, 26.0, "N", "Summerhill"],
  ["Cleary's", 53.3522, -6.2497, 11.0, 23.5, "N", "Amiens St"],
  ["Mullet's", 53.3526, -6.2493, 11.0, 23.5, "N", "Amiens St"],
  // --- Northside: Phibsborough & Dorset St ---
  ["Doyle's Corner", 53.3609, -6.2725, 15.0, 23.5, "N", "Phibsborough"],
  ["Phibsborough House", 53.3589, -6.2737, 12.0, 23.5, "N", "Phibsborough"],
  ["Bleecker Street Bar", 53.3572, -6.2639, 15.0, 23.5, "N", "Dorset St"],
  ["Delahunty's", 53.3556, -6.2658, 10.5, 23.5, "N", "Dorset St"],
  ["The Big Tree", 53.3598, -6.2608, -1, -1, "N", "Dorset St"],
  // --- Northside: Dublin 1 ---
  ["The Confession Box", 53.3503, -6.2584, 11.5, 23.5, "N", "Dublin 1"],
  ["Brannigans", 53.3504, -6.2598, 12.0, 23.5, "N", "Dublin 1"],
  ["The Celt", 53.3506, -6.2550, 12.0, 23.5, "N", "Dublin 1"],
  ["The Black Sheep", 53.3498, -6.2691, 12.0, 23.5, "N", "Capel St"],
  ["BoCo", 53.3513, -6.2701, 16.0, 23.0, "N", "Bolton St"],
  ["Bar Anam", 53.3509, -6.2701, 12.0, 24.0, "N", "Bolton St"],
  ["The Parnell", 53.3522, -6.2620, 11.0, 23.5, "N", "Parnell St"],
  ["The Shakespeare", 53.3530, -6.2608, 12.0, 23.0, "N", "Parnell St"],
  ["The Big Romance", 53.3534, -6.2592, 16.0, 24.0, "N", "Parnell St"],
  // --- Northside: Coolock & Artane ---
  ["Kyles Pub", 53.3889, -6.2010, 10.0, 23.5, "N", "Coolock"],
  ["The Cock and Bull", 53.3892, -6.2008, 10.5, 24.0, "N", "Coolock"],
  ["The Goblet", 53.3803, -6.2101, 10.5, 23.5, "N", "Artane"],
  ["Kitty Kiernan's", 53.3767, -6.2233, 12.0, 23.5, "N", "Donnycarney"],
  ["The 1884", 53.3677, -6.2270, 12.0, 23.5, "N", "Marino"],
  // --- Northside: Finglas & Ballygall ---
  ["Martins Bar", 53.3907, -6.2881, 12.0, 23.0, "N", "Finglas"],
  ["The Village Inn (Finglas)", 53.3876, -6.3014, 10.5, 23.5, "N", "Finglas"],
  ["The Shamrock Lodge", 53.3903, -6.2997, 10.5, 23.5, "N", "Finglas"],
  ["Quarry House", 53.3821, -6.2767, 11.0, 23.0, "N", "Ballygall"],
  ["Autobahn", 53.3897, -6.2714, 10.5, 23.5, "N", "Glasnevin"],
  ["The Deputy Mayor", 53.4013, -6.2973, 12.0, 23.5, "N", "Meakstown"],
  // --- Southside: a starting pool, extend as you research ---
  ["The Barge", 53.3306, -6.2620, 12.0, 23.5, "S", "Portobello"],
  ["The Lower Deck", 53.3300, -6.2650, 12.0, 23.5, "S", "Portobello"],
  ["The Bleeding Horse", 53.3339, -6.2648, 12.0, 23.5, "S", "Camden St"],
  ["The Swan", 53.3403, -6.2666, 12.0, 23.5, "S", "Aungier St"],
  ["Kennedys (Westland Row)", 53.3435, -6.2495, 12.0, 23.5, "S", "Westland Row"],
  ["The Ginger Man", 53.3428, -6.2492, 12.0, 23.5, "S", "Fenian St"],
  ["Hartigans", 53.3369, -6.2531, 12.0, 23.5, "S", "Leeson St"],
  ["O'Briens (Leeson St)", 53.3345, -6.2537, 12.0, 23.5, "S", "Leeson St"],
  ["Larry Murphys", 53.3341, -6.2515, 12.0, 23.5, "S", "Baggot St"],
  // --- Southside: Ranelagh ---
  ["Smyth's Pub", 53.3241, -6.2524, 10.0, 24.5, "S", "Ranelagh"],
  ["Birchalls (Ranelagh)", 53.3234, -6.2503, 15.0, 23.5, "S", "Ranelagh"],
  ["The Hill Pub", 53.3266, -6.2584, 14.0, 23.5, "S", "Ranelagh"],
  ["TapHouse", 53.3251, -6.2543, 15.0, 23.5, "S", "Ranelagh"],
  ["Humphrey's", 53.3241, -6.2523, 12.0, 24.0, "S", "Ranelagh"],
  ["R McSorley's", 53.3233, -6.2500, 15.0, 24.0, "S", "Ranelagh"],
  // --- Southside: Donnybrook ---
  ["Arthur Mayne's", 53.3217, -6.2352, 15.0, 23.5, "S", "Donnybrook"],
  ["The Morehampton", 53.3228, -6.2385, 12.0, 23.5, "S", "Donnybrook"],
  ["McCloskeys", 53.3245, -6.2404, 8.0, 23.5, "S", "Donnybrook"],
  // --- Southside: Clonskeagh & Milltown ---
  ["The Dropping Well", 53.3081, -6.2549, 9.5, 24.0, "S", "Milltown"],
  ["Farmer Browns", 53.3141, -6.2388, 12.0, 24.0, "S", "Clonskeagh"],
  ["Ashton's", 53.3160, -6.2372, 12.0, 23.5, "S", "Clonskeagh"],
  // --- Southside: Rathgar & Terenure ---
  ["The Rathgar 108", 53.3121, -6.2745, 15.0, 23.5, "S", "Rathgar"],
  ["Bottler's Bank", 53.3120, -6.2749, 16.0, 23.5, "S", "Rathgar"],
  ["The Terenure Inn", 53.3113, -6.2830, 10.5, 23.5, "S", "Terenure"],
  ["Bradys", 53.3098, -6.2841, 12.0, 23.5, "S", "Terenure"],
  ["The Two Sisters", 53.3092, -6.3054, 10.5, 23.5, "S", "Terenure"],
  ["The Morgue", 53.2984, -6.3027, 10.5, 23.5, "S", "Templeogue"],
  ["Lyster's Bar", 53.3217, -6.2795, 16.0, 23.5, "S", "Harold's Cross"],
  // --- Southside: Crumlin, Kimmage, Drimnagh ---
  ["The Horse Shoe", 53.3201, -6.3162, 10.5, 24.0, "S", "Crumlin"],
  ["Frehill's Tavern", 53.3196, -6.3130, 10.5, 23.5, "S", "Kimmage"],
  ["The Village Inn (Walkinstown)", 53.3202, -6.3168, 10.5, 23.0, "S", "Walkinstown"],
  ["The Gate Bar", 53.3287, -6.3033, 12.0, 23.5, "S", "Drimnagh"],
  ["Birchall's (Drimnagh)", 53.3281, -6.3049, 10.5, 23.5, "S", "Drimnagh"],
  ["The Four Provinces", 53.3148, -6.3000, 14.0, 23.5, "S", "Kimmage"],
  ["The Stone Boat", 53.3207, -6.2922, 10.5, 23.5, "S", "Kimmage"],
  // --- Southside: Dolphin's Barn & Rialto ---
  ["Lowes Pub", 53.3338, -6.2907, 10.5, 24.5, "S", "Dolphin's Barn"],
  ["The Bird Flanagan", 53.3365, -6.2992, 10.5, 24.0, "S", "Rialto"],
  ["The Circular", 53.3362, -6.2979, 15.5, 24.0, "S", "Rialto"],
  // --- Southside: Thomas St & the Liberties ---
  ["Dudley's", 53.3427, -6.2790, 12.0, 24.0, "S", "Thomas St"],
  ["John's Bar", 53.3427, -6.2775, 12.0, 23.5, "S", "Thomas St"],
  // --- Southside: Dame St & George's St (city-centre finishers) ---
  ["Brogans", 53.3443, -6.2663, 16.0, 23.5, "S", "Dame St"],
  ["The Dame Tavern", 53.3438, -6.2639, 10.5, 23.5, "S", "Dame Ct"],
  ["Hogan's", 53.3420, -6.2646, 13.5, 23.5, "S", "George's St"],
  ["J.T. Pim's", 53.3438, -6.2642, 12.0, 23.5, "S", "George's St"],
  ["The Globe", 53.3433, -6.2643, 12.0, 27.0, "S", "George's St"],
  ["The Voyager", 53.3441, -6.2632, 15.5, 23.5, "S", "Dame St"],
  ["Trinity Bar", 53.3444, -6.2636, 8.0, 24.5, "S", "Dame St"]
];
