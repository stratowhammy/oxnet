import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const assetsData = [
    // --- TECHNOLOGY (Stocks) ---
    {
        symbol: 'S-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Quantum-resistant encryption hardware',
        basePrice: 154.20,
        supplyPool: 1000000,
        description: "Nexus Systems pioneers the post-silicon era with their quantum-resistant hardware modules, trusted by defense contractors and financial institutions globally to secure data against next-gen threats."
    },
    {
        symbol: 'L-$1',
        name: 'Lumina-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Generative AI for architectural blueprints',
        basePrice: 210.50,
        supplyPool: 800000,
        description: "Transforming the skylines of tomorrow, Vortex AI utilizes advanced generative algorithms to create structural blueprints that optimize for sustainability and aesthetics in seconds rather than months."
    },
    {
        symbol: 'L-$1',
        name: 'Quantum-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Autonomous cybersecurity defense swarms',
        basePrice: 89.75,
        supplyPool: 2000000,
        description: "CyberDyne Ops deploys autonomous software swarms that actively hunt and neutralize malware within corporate networks, offering a proactive defense layer that evolves faster than hackers."
    },
    {
        symbol: 'V-$1',
        name: 'Lumina-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Medical nanobots for non-invasive surgery',
        basePrice: 340.00,
        supplyPool: 500000,
        description: "Famed for their microscopic surgeons, NanoWorks designs programmable nanobots capable of clearing arteries and repairing tissue damage from the inside out, making scalpels obsolete."
    },
    {
        symbol: 'V-$1',
        name: 'Vanguard-$1-Bit Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Room-temperature quantum processing units',
        basePrice: 420.69,
        supplyPool: 400000,
        description: "Breaking the cryogenic barrier, Q-Bit Computing has developed the world's first stable room-temperature quantum processor, bringing exponential computing power to standard data centers."
    },
    {
        symbol: 'S-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Holographic telepresence for remote work',
        basePrice: 65.30,
        supplyPool: 1500000,
        description: "HoloXperience is redefining the home office with high-fidelity, volumetric displays that project life-size colleagues into your living room, eliminating the distance in remote work."
    },
    {
        symbol: 'H-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'High-altitude balloon internet synthesis',
        basePrice: 45.20,
        supplyPool: 3000000,
        description: "Bridging the digital divide, AeroNet maintains a global mesh network of stratospheric balloons, delivering high-speed, low-latency internet to the most remote corners of the planet."
    },
    {
        symbol: 'V-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Deep sea server farm cooling solutions',
        basePrice: 112.40,
        supplyPool: 1200000,
        description: "DataMine Corp leverages the natural cooling power of the ocean depths to run ultra-efficient, emission-free data centers located on the seafloor."
    },
    {
        symbol: 'N-$1',
        name: 'Echo-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Humanoid domestic assistance droids',
        basePrice: 180.90,
        supplyPool: 900000,
        description: "From laundry to latte art, RoboButler's line of polite, domestic androids are becoming a staple in upper-middle-class households, promising a chore-free existence."
    },
    {
        symbol: 'H-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Digital real estate development algorithms',
        basePrice: 28.50,
        supplyPool: 5000000,
        description: "As the premier developer of virtual worlds, MetaVerse Architects procedurally generates sprawling digital cities, selling prime voxel real estate to global brands and influencers."
    },
    {
        symbol: 'A-$1',
        name: 'Apex-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Biodegradable semiconductor manufacturing',
        basePrice: 95.10,
        supplyPool: 1800000,
        description: "Combating e-waste, Silicon Frontier manufactures high-performance chips using organic substrates that decompose harmlessly after their operational lifecycle."
    },
    {
        symbol: 'N-$1',
        name: 'Apex-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Brain-Computer Interfaces for gaming',
        basePrice: 255.00,
        supplyPool: 600000,
        description: "NeuralLinker's non-invasive headsets translate thought directly into digital action, allowing gamers to control avatars with pure intent and reaction times faster than any keystroke."
    },
    {
        symbol: 'A-$1',
        name: 'Catalyst-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'Decentralized fog computing storage',
        basePrice: 55.60,
        supplyPool: 2500000,
        description: "Nimbus Cloud fragments and distributes data across millions of idle consumer devices, creating a resilient, unhackable storage network that costs a fraction of centralized alternatives."
    },
    {
        symbol: 'H-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'LIDAR systems for underwater vehicles',
        basePrice: 78.30,
        supplyPool: 1600000,
        description: "Mapping the abyss, AutoDrive Logic specializes in sonar-LIDAR fusion technology that enables autonomous submersibles to navigate the complex, high-pressure environments of the deep ocean."
    },
    {
        symbol: 'V-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Technology',
        niche: 'AI-generated infinite open-world rpgs',
        basePrice: 42.10,
        supplyPool: 3500000,
        description: "PolyFill Games has created an engine that generates endless, coherent storylines and worlds on the fly, offering players an RPG experience that truly never ends."
    },

    // --- HEALTHCARE (Stocks) ---
    {
        symbol: 'Q-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'CRISPR therapies for hair loss',
        basePrice: 120.50,
        supplyPool: 1100000,
        description: "GeneFix targets the root cause of balding at the genetic level, offering a permanent, one-time CRISPR editing treatment that restores full, youthful hair growth."
    },
    {
        symbol: 'P-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Telomere regeneration supplements',
        basePrice: 290.00,
        supplyPool: 500000,
        description: "Pushing the boundaries of human longevity, LifeExtension's patented enzyme therapy rebuilds protective chromosomal caps, effectively reversing the cellular aging clock."
    },
    {
        symbol: 'N-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Drone delivery of emergency defibrillators',
        basePrice: 68.40,
        supplyPool: 1400000,
        description: "When seconds count, MediDrone dispatches autonomous heavy-lift flyers equipped with AEDs and epinephrine, beating ambulances to the scene of cardiac arrests by minutes."
    },
    {
        symbol: 'L-$1',
        name: 'Zenith-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: '3D printed custom organs for transplants',
        basePrice: 450.00,
        supplyPool: 300000,
        description: "Eliminating donor waiting lists, BioPrint Labs constructs functional, biocompatible kidneys and livers using a patient's own stem cells as the ink."
    },
    {
        symbol: 'P-$1',
        name: 'Apex-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Implants for instant anxiety suppression',
        basePrice: 135.20,
        supplyPool: 950000,
        description: "NeuroCalm's sub-dermal chip monitors cortisol levels in real-time and releases micro-pulses of calming agents, guaranteeing a panic-free existence for its users."
    },
    {
        symbol: 'A-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Universal flu vaccine patches',
        basePrice: 52.80,
        supplyPool: 2200000,
        description: "VaxSpeed has revolutionized immunization with a painless, micron-needle patch that provides year-round protection against all known influenza strains."
    },
    {
        symbol: 'N-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Smartphone-based retinal disease scanning',
        basePrice: 88.90,
        supplyPool: 1300000,
        description: "Turning every phone into a clinic, DiagAI's app analyzes retinal scans to detect early signs of diabetes, hypertension, and glaucoma with 99% accuracy."
    },
    {
        symbol: 'S-$1',
        name: 'Apex-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Circadian rhythm reset chambers',
        basePrice: 105.50,
        supplyPool: 800000,
        description: "Curing insomnia and jet lag, DeepSleep Institute enables clients to reset their biological clocks instantly through hyperbaric oxygen and light therapy chambers."
    },
    {
        symbol: 'A-$1',
        name: 'Zenith-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Flower-derived pain management opioids',
        basePrice: 72.10,
        supplyPool: 1700000,
        description: "Seeking a non-addictive alternative, Petals Pharma synthesizes powerful analgesics from rare, genetically modified Amazonian orchids."
    },
    {
        symbol: 'S-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Healthcare',
        niche: 'Synthetic skin for burn victims',
        basePrice: 160.30,
        supplyPool: 650000,
        description: "DermaTech's spray-on synthetic epidermis integrates seamlessly with human tissue, providing immediate protection and accelerated healing for severe burn patients."
    },

    // --- ENERGY (Stocks) ---
    {
        symbol: 'S-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Transparent solar windows for skyscrapers',
        basePrice: 48.50,
        supplyPool: 2800000,
        description: "HelioPower turns entire skylines into power plants with their photovoltaic glass, harvesting energy while maintaining crystal-clear views for office tenants."
    },
    {
        symbol: 'E-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Silent vertical-axis wind turbines for urban use',
        basePrice: 32.20,
        supplyPool: 4000000,
        description: "Designed for the city, Zephyr's silent, sculpturesque turbines capture turbulent urban airflows to generate clean power on rooftops and roadsides."
    },
    {
        symbol: 'V-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Compact muon-catalyzed cold fusion reactors',
        basePrice: 500.00,
        supplyPool: 200000,
        description: "The holy grail of energy, Stellar Fusion manufactures shipping-container-sized reactors that provide limitless, safe power for decades without refueling."
    },
    {
        symbol: 'A-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Seawater-to-hydrogen electrolysis at scale',
        basePrice: 75.60,
        supplyPool: 1500000,
        description: "HydroGenius extracts clean fuel from the ocean, utilizing advanced catalysts to split seawater into hydrogen and oxygen at industrial scales."
    },
    {
        symbol: 'S-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Graphene supercapacitor batteries for EVs',
        basePrice: 115.00,
        supplyPool: 1200000,
        description: "Eliminating charge anxiety, SolidState's graphene batteries charge in minutes and last for millions of miles, powering the next generation of electric fleets."
    },
    {
        symbol: 'A-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Deep-crust geothermal drilling technology',
        basePrice: 140.20,
        supplyPool: 900000,
        description: "Drilling deeper than ever before, MagmaTap accesses supercritical geothermal fluids near the mantle, delivering consistent baseload power anywhere on Earth."
    },
    {
        symbol: 'S-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Oscillating water column wave energy converters',
        basePrice: 28.90,
        supplyPool: 4500000,
        description: "Harnessing the pulse of the ocean, LunarTide's coastal arrays convert the kinetic energy of breaking waves into a steady stream of electricity."
    },
    {
        symbol: 'E-$1',
        name: 'Lumina-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Bio-jetfuel from genetically modified algae',
        basePrice: 62.40,
        supplyPool: 1800000,
        description: "Decarbonizing aviation, AlgaeFuel cultivates massive vats of engineered algae that secrete high-grade kerosene substitute, carbon-neutral and ready for jet engines."
    },
    {
        symbol: 'S-$1',
        name: 'Pinnacle-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'AI-driven peer-to-peer energy trading networks',
        basePrice: 85.10,
        supplyPool: 1300000,
        description: "SmartGrid Ops empowers homeowners to become energy moguls, managing a blockchain-based marketplace where neighbors trade excess solar power automatically."
    },
    {
        symbol: 'C-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Energy',
        niche: 'Molten salt thorium reactors',
        basePrice: 195.50,
        supplyPool: 600000,
        description: "Reviving a forgotten technology, SaltThorium builds fail-safe liquid fuel reactors that consume nuclear waste and cannot meltdown, reshaping public perception of nuclear energy."
    },

    // --- FINANCE (Stocks) ---
    {
        symbol: 'P-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'AI-only banking with zero human employees',
        basePrice: 125.60,
        supplyPool: 1000000,
        description: "With zero overhead and infinite scalability, NeoBank Corp offers impossible interest rates by replacing all tellers, managers, and traders with efficient algorithms."
    },
    {
        symbol: 'S-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Micro-insurance for gig economy freelance failure',
        basePrice: 45.30,
        supplyPool: 2500000,
        description: "A safety net for the side-hustle generation, SureThing offers bite-sized policies protecting freelancers against cancelled gigs, bad ratings, and sudden burnout."
    },
    {
        symbol: 'Z-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Social-reputation based unsecured lending',
        basePrice: 78.90,
        supplyPool: 1600000,
        description: "Your network is your net worth. PeerCred grants loans based on the creditworthiness of your social graph rather than your bank account history."
    },
    {
        symbol: 'A-$1',
        name: 'Zenith-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Algorithmic tax-loss harvesting for retail',
        basePrice: 150.20,
        supplyPool: 800000,
        description: "RoboWealth brings billionaire-tier tax strategies to the masses, automatically selling losing assets to offset capital gains and minimize tax liabilities in real-time."
    },
    {
        symbol: 'Z-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Atomic swap derivatives exchange',
        basePrice: 210.00,
        supplyPool: 550000,
        description: "Eliminating the middleman, BlockTrade facilitates instant, trustless exchange of exotic financial derivatives directly between blockchains without a centralized clearing house."
    },

    // --- CONSUMER & RETAIL (Stocks) ---
    {
        symbol: 'L-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: '3D printed personalized meal cubes',
        basePrice: 35.50,
        supplyPool: 3500000,
        description: "Efficiency meets nutrition. NutriPaste analyzes your biometrics to print customized edible cubes containing the exact caloric and vitamin blend your body needs for the day."
    },
    {
        symbol: 'H-$1',
        name: 'Echo-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'Clothes that change color with mood',
        basePrice: 82.10,
        supplyPool: 1400000,
        description: "Wear your heart on your sleeve—literally. SmartTextile weaves chromatic fibers that shift hues based on the wearer's skin temperature and heart rate."
    },
    {
        symbol: 'N-$1',
        name: 'Pinnacle-$1+ Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'Caffeinated sparkling holy water',
        basePrice: 15.20,
        supplyPool: 8000000,
        description: "A cultural phenomenon, H2O+ combines spiritual hydration with a jolt of espresso-grade caffeine, marketing itself as the ultimate morning ritual for the modern soul."
    },
    {
        symbol: 'P-$1',
        name: 'Catalyst-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'Beer brewed by AI optimizing for taste receptors',
        basePrice: 48.90,
        supplyPool: 2100000,
        description: "Using machine learning to map the human palate, HopQuantum crafts micro-brews scientifically guaranteed to hit the bliss point of bitterness and aroma."
    },
    {
        symbol: 'A-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'Genetically engineered miniature dinosaurs',
        basePrice: 850.00,
        supplyPool: 100000,
        description: "The ultimate status symbol, DinoPets breeds teacup-sized velociraptors and triceratops, gene-edited to be docile, house-trained, and absolutely adorable."
    },

    // --- TRANSPORT & SPACE (Stocks) ---
    {
        symbol: 'A-$1',
        name: 'Pinnacle-$1 Corp',
        type: 'STOCK',
        sector: 'Space',
        niche: 'Prefabricated habitats for Martian settlement',
        basePrice: 420.00,
        supplyPool: 400000,
        description: "Selling the dream of a backup planet, MarsColony manufactures radiation-shielded, self-sustaining habitats ready to be dropped onto the Red Planet's surface."
    },
    {
        symbol: 'N-$1',
        name: 'Echo-$1 Corp',
        type: 'STOCK',
        sector: 'Space',
        niche: 'Platinum group metals form near-earth asteroids',
        basePrice: 125.00,
        supplyPool: 1100000,
        description: "Why dig down when you can look up? AsteroidMine captures metallic rocks from orbit to harvest trillions of dollars worth of platinum and palladium."
    },
    {
        symbol: 'P-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Space',
        niche: 'Space debris capture and recycling',
        basePrice: 65.40,
        supplyPool: 1900000,
        description: "Keeping low-earth orbit safe, OrbitalTrash deploys 'net-sats' to snag dangerous debris, recycling the scrap metal for use in orbital manufacturing foundries."
    },
    {
        symbol: 'L-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Transport',
        niche: 'Vacuum tube trans-continental maglev',
        basePrice: 180.50,
        supplyPool: 700000,
        description: "NYC to London in 50 minutes. HyperLoop X is nearing completion of its vacuum-sealed Atlantic tunnel, poised to make air travel obsolete."
    },
    {
        symbol: 'V-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Transport',
        niche: 'Autonomous electric flying car network',
        basePrice: 245.20,
        supplyPool: 600000,
        description: "Rising above the gridlock, SkyTaxi operates a fleet of silent electric VTOLs, offering affordable, autonomous point-to-point aerial ridesharing."
    },

    // --- REAL ESTATE & CONSTRUCTION (Stocks) ---
    {
        symbol: 'P-$1',
        name: 'Catalyst-$1 Corp',
        type: 'STOCK',
        sector: 'Real Estate',
        niche: 'Flat-pack skyscrapers for rapid urbanization',
        basePrice: 95.60,
        supplyPool: 1300000,
        description: "Like IKEA for skylines, ModuHome ships pre-fabricated apartment blocks that stack together like Lego bricks, erecting full skyscrapers in weeks instead of years."
    },
    {
        symbol: 'Z-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Real Estate',
        niche: 'Luxury doomsday bunkers for the elite',
        basePrice: 310.00,
        supplyPool: 400000,
        description: "For those hedging against the apocalypse, SubTerra builds five-star subterranean resorts deep in granite mountains, complete with hydroponic gardens and golf simulators."
    },
    {
        symbol: 'A-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Real Estate',
        niche: 'Floating sovereign island nations',
        basePrice: 550.00,
        supplyPool: 250000,
        description: "AquaEstates creates artificial islands in international waters, selling sovereign territory to libertarians and tax exiles forming their own micro-nations."
    },

    // --- BONDS (Fixed Income) ---
    // Sovereign / Gov
    { symbol: 'SOL-10', name: 'Solar Dominion 10Y', type: 'BOND', sector: 'Government', niche: 'Hegemony yield curve anchor', basePrice: 98.50, supplyPool: 10000000, description: "The benchmark of the orbital economy. Backed by the energy output of the Sol-Dyson array, this 10-year note is the definition of a risk-safe asset." },
    { symbol: 'VAL-30', name: 'Valerian Union 30Y', type: 'BOND', sector: 'Government', niche: 'Long term planetary stability', basePrice: 95.20, supplyPool: 8000000, description: "A long-duration stability instrument representing the collective credit of the Valerian Union nations, preferred by longevity funds seeking multi-century security." },
    { symbol: 'NIP-GB', name: 'Neo-Imperial Bond', type: 'BOND', sector: 'Government', niche: 'Yield curve control protected', basePrice: 99.10, supplyPool: 9000000, description: "A staple of stability, the Neo-Imperial Bond is heavily managed by the Shogunate Central Bank to ensure low, predictable yields for conservative noble houses." },
    { symbol: 'URB-MUNI', name: 'Urban-Core Bond', type: 'BOND', sector: 'Government', niche: 'Grid-level infrastructure funding', basePrice: 101.20, supplyPool: 5000000, description: "Issued to fund the repair of aging atmospheric scrubbers, this municipal bond offers attractive tax-exempt interest payments for Mega-City residents." },
    { symbol: 'G-BILL', name: 'Galactic T-Bill', type: 'BOND', sector: 'Government', niche: 'Short term inter-system liquidity', basePrice: 99.90, supplyPool: 15000000, description: "A basket of short-term debt from the Inner Rim planets, this instrument serves as a credit-equivalent parking spot for massive capital pools seeking liquidity." },
    // Corporate (High Grade)
    { symbol: 'NEX-B', name: 'Nexus Corp Bond', type: 'BOND', sector: 'Corporate', niche: 'A+ rated tech giant debt', basePrice: 102.50, supplyPool: 3000000, description: "Senior secured debt from Nexus Systems. With energy reserves larger than most moons, this bond is virtually risk-free but pays a corporate premium." },
    { symbol: 'VOR-B', name: 'Vortex cvt Bond', type: 'BOND', sector: 'Corporate', niche: 'Convertible debt for AI expansion', basePrice: 110.00, supplyPool: 2000000, description: "A hybrid instrument financing Vortex AI's neural expansion. Holders can convert this debt into Vortex equity if the compute-index hits a strike target." },
    { symbol: 'GEN-B', name: 'GeneFix Bond', type: 'BOND', sector: 'Corporate', niche: 'Biotech R&D funding', basePrice: 92.50, supplyPool: 2500000, description: "Funding the next decade of clinical trials, this bond offers steady coupons backed by the reliable revenue stream of GeneFix's cellular rejuvenation patent." },
    { symbol: 'HEL-B', name: 'Helio Green Bond', type: 'BOND', sector: 'Corporate', niche: 'Renewable energy infrastructure', basePrice: 105.10, supplyPool: 3500000, description: "A verified Photovoltaic Bond. Proceeds are strictly earmarked for the construction of solar glass factories, appealing to ESG-mandated institutional investors." },
    { symbol: 'NEO-B', name: 'NeoBank SubDebt', type: 'BOND', sector: 'Corporate', niche: 'Tier 2 algo-capital notes', basePrice: 94.80, supplyPool: 4000000, description: "Subordinated debt notes issuing high yields. In the unlikely event of NeoBank's algorithmic failure, these bondholders are paid last, justifying the higher interest rate." },
    // Junk / High Yield
    { symbol: 'DIST', name: 'Distressed ETF', type: 'BOND', sector: 'Corporate', niche: 'Diversified junk-level debt', basePrice: 85.00, supplyPool: 6000000, description: "A basket of debt from companies on the brink. High risk, high reward—this ETF aggregates the highest paying junk bonds into a diversified pool." },
    { symbol: 'HYP-B', name: 'HyperLoop Bond', type: 'BOND', sector: 'Corporate', niche: 'Speculative transport infrastructure', basePrice: 75.50, supplyPool: 1500000, description: "Financing the world's longest vacuum tube. If the tunnel completes, this bond is golden. If solar storms stall it, it's paper. A gamble for the brave." },
    { symbol: 'MRS-B', name: 'Red-Planet Bond', type: 'BOND', sector: 'Corporate', niche: 'Off-world colonization financing', basePrice: 65.00, supplyPool: 1000000, description: "The ultimate frontier debt. Financing the first Martian dome, this bond pays astronomical interest rates to compensate for the risk of catastrophic mission failure." },
    { symbol: 'HASH-B', name: 'Compute Node Bond', type: 'BOND', sector: 'Corporate', niche: 'Hash-rate secured lending', basePrice: 80.20, supplyPool: 2000000, description: "Secured by thousands of orbital mining rigs. If energy costs spike, these bonds default. If compute demand rallies, the coupons are paid in lush credits." },
    { symbol: 'MOD-B', name: 'ModuHome SecDoc', type: 'BOND', sector: 'Corporate', niche: 'Modular housing backed securities', basePrice: 98.00, supplyPool: 5000000, description: "A bundle of thousands of contracts on ModuHome prefabs. Rated A, but sensitive to hyper-urbanization trends and changes in the credit market." },

    // --- COMMODITIES ---
    { symbol: 'AUR', name: 'Aurum Ingots', type: 'COMMODITY', sector: 'Precious Metals', niche: 'Traditional inflation hedge', basePrice: 1950.00, supplyPool: 500000, description: "The ancient store of wealth. Mined from the crust and refined to 99.99% purity, Aurum remains the ultimate hedge against currency debasement and chaos." },
    { symbol: 'ARG', name: 'Argent Bars', type: 'COMMODITY', sector: 'Precious Metals', niche: 'Industrial and monetary metal', basePrice: 24.50, supplyPool: 5000000, description: "Both a unit of account and an industrial component. Essential for photonics and electronics, Argent moves violently with industrial demand." },
    { symbol: 'FUEL', name: 'Refined Fuel', type: 'COMMODITY', sector: 'Energy', niche: 'Hydrocarbon energy baseline', basePrice: 75.00, supplyPool: 10000000, description: "Light sweet hydrocarbons. Despite the fusion shift, the outer rim still runs on liquid fuel. This contract represents 1,000 units delivered to the Orbital Refineries." },
    { symbol: 'LITH', name: 'Lithium Ore', type: 'COMMODITY', sector: 'Industrial', niche: 'Battery grade lithium carbonate', basePrice: 45.00, supplyPool: 2000000, description: "White gold for the energy era. Essential for every power pack on the planet, spot prices fluctuate wildly with extra-planetary mining output." },
    { symbol: 'BEAN', name: 'Synthetic Bean', type: 'COMMODITY', sector: 'Agriculture', niche: 'Bio-engineered stimulant crop', basePrice: 180.00, supplyPool: 3000000, description: "The fuel of productivity. This contract tracks premium bio-engineered beans, sensitive to greenhouse blight and global focus cycles." },
    { symbol: 'GRN', name: 'Staple Grain', type: 'COMMODITY', sector: 'Agriculture', niche: 'Global nutrition baseline', basePrice: 6.50, supplyPool: 20000000, description: "Basis for all synth-food. A political commodity, grain prices can topple city-states. This contract verifies delivery of high-yield winter wheat." },
    { symbol: 'HYDR', name: 'Liquid Hydrogen', type: 'COMMODITY', sector: 'Energy', niche: 'Clean fuel carrier', basePrice: 12.50, supplyPool: 5000000, description: "Cryogenic fuel for the future. Stored at near absolute zero, this commodity is the heavy transport fuel of choice for a carbon-free world." },
    { symbol: 'URAN', name: 'Fissile Core', type: 'COMMODITY', sector: 'Energy', niche: 'Nuclear fuel yellowcake', basePrice: 55.00, supplyPool: 800000, description: "Concentrated energy density. Traded as enriched powder, this controlled substance fuels the primary reactors and is subject to strict planetary monitoring." },
    { symbol: 'CUPR', name: 'Cuprum Cathode', type: 'COMMODITY', sector: 'Industrial', niche: 'Grid infrastructure metal', basePrice: 3.80, supplyPool: 12000000, description: "The conductor of civilization. It carries the pulse for the world, making its price a leading indicator of planetary economic health." },
    { symbol: 'MAG', name: 'Neodymium', type: 'COMMODITY', sector: 'Industrial', niche: 'Rare earth magnetic material', basePrice: 110.00, supplyPool: 600000, description: "The magnet maker. Critical for turbine generators and propulsion motors, this rare earth element is highly salvaged from orbital scrap." },

    // --- CURRENCIES (Crypto & Fiat) ---
    { symbol: 'PI', name: 'Pi (𝝅)', type: 'CRYPTO', sector: 'Currency', niche: 'Circular decentralized value', basePrice: 45000.00, supplyPool: 1000, description: "The mathematical constant turned asset. A censorship-resistant, decentralized store of value with a fixed supply cap based on the ratio of a circle's circumference." },
    { symbol: 'TAU', name: 'Tau (𝜏)', type: 'CRYPTO', sector: 'Currency', niche: 'Double-cycle protocol gas', basePrice: 3200.00, supplyPool: 15000, description: "The evolution of the circle. Tau is the fuel for the double-cycle web, powering complex smart contracts across the interplanetary network." },
    { symbol: 'XON', name: 'Xon Credits', type: 'CRYPTO', sector: 'Currency', niche: 'Inter-ledger settlement bridge', basePrice: 0.55, supplyPool: 100000000, description: "The ledger's pulse. Designed for instant bridging, Xon facilitates near-instant settlement between competing blockchain protocols." },
    { symbol: 'HELI', name: 'Helios Protocol', type: 'CRYPTO', sector: 'Currency', niche: 'Solar-minted asset', basePrice: 95.00, supplyPool: 500000, description: "Speed at the speed of light. Helios offers high-speed transactions backed by solar-harvesting nodes, making it a favorite for high-frequency trading." },
    { symbol: 'VOID', name: 'Void Coin', type: 'CRYPTO', sector: 'Currency', niche: 'Entropy-based privacy currency', basePrice: 0.12, supplyPool: 1000000000, description: "From the darkness. A privacy-centric asset that utilizes zero-knowledge proofs to ensure complete anonymity across the void of the network." },
    { symbol: 'DELTA', name: 'Delta (Δ)', type: 'CURRENCY', sector: 'Fiat', niche: 'Primary floating fiat currency', basePrice: 1.00, supplyPool: 1000000000, description: "The change agent. The primary reserve currency of the global federation. Used to price all debt, energy, and assets across the world." },
    { symbol: 'VALR', name: 'Valerian Mark', type: 'CURRENCY', sector: 'Fiat', niche: 'Valerian Union economic unit', basePrice: 1.08, supplyPool: 800000000, description: "The currency of the union. Shared by the inner-world states, the Mark rivals Delta for dominance, backed by the diverse economy of the coalition." },
    { symbol: 'ZEN', name: 'Zen Yen', type: 'CURRENCY', sector: 'Fiat', niche: 'Safe haven low yield currency', basePrice: 0.007, supplyPool: 10000000000, description: "The carry trade favorite. With controlled interest rates, Zen is often borrowed to fund investments elsewhere, and bought back during times of panic." },
    { symbol: 'AURE', name: 'Aurelius Pound', type: 'CURRENCY', sector: 'Fiat', niche: 'Oldest fiat currency in use', basePrice: 1.25, supplyPool: 500000000, description: "Sterling-Aurelius. The world's oldest currency still in use. Once the ruler of global finance, it remains a major trading pair in the Great Hub." },
    { symbol: 'BASE', name: 'Base Franc', type: 'CURRENCY', sector: 'Fiat', niche: 'Neutral banking haven currency', basePrice: 1.10, supplyPool: 300000000, description: "The ultimate safe haven. Backed by the neutrality of the Alpine Base and robust banking laws, the Franc is where capital flees during conflicts." },

    // --- Additional Diverse Stocks to reach 100 ---
    {
        symbol: 'S-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'Lab-grown bluefin tuna fish',
        basePrice: 210.00,
        supplyPool: 600000,
        description: "Saving the seas. BlueOcean cultivates sashimi-grade bluefin tuna meat in bioreactors, offering the taste of luxury seafood without harming a single fish or ecosystem."
    },
    {
        symbol: 'L-$1',
        name: 'Catalyst-$1 Corp',
        type: 'STOCK',
        sector: 'Materials',
        niche: 'Super-hardened transparent wood glass',
        basePrice: 65.50,
        supplyPool: 1400000,
        description: "Better than glass. TimberTech chemically treats fast-growing pine to create transparent, bulletproof wood panels that are better insulators and biodegrade safely."
    },
    {
        symbol: 'Z-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Education',
        niche: 'Direct-to-cortex skill downloading',
        basePrice: 340.00,
        supplyPool: 400000,
        description: "Learn Kung Fu in seconds. BrainUpload uses non-invasive stimulation to imprint muscle memory and technical knowledge directly into the user's motor cortex."
    },
    {
        symbol: 'S-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Transport',
        niche: 'Ghost ships autonomous shipping',
        basePrice: 42.00,
        supplyPool: 2500000,
        description: "Crewless commerce. AutoCargo operates a fleet of massive, autonomous container ships that sail the high seas without a single human on board, optimizing routes for fuel and weather."
    },
    {
        symbol: 'V-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Mercenary defense for corporations',
        basePrice: 88.00,
        supplyPool: 900000,
        description: "When the police are too slow. PrivateGuard offers paramilitary asset protection for multinational corporations operating in unstable regions, guaranteed by combat veterans."
    },
    {
        symbol: 'S-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Nuclear waste reprocessing into plastic',
        basePrice: 15.60,
        supplyPool: 5000000,
        description: "Alchemy for the modern age. NukeRecycle uses high-energy particle beams to transmute radioactive waste isotopes into stable polymers for use in industrial packaging."
    },
    {
        symbol: 'A-$1',
        name: 'Pinnacle-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Penetration testing as a service',
        basePrice: 120.00,
        supplyPool: 700000,
        description: "Breaking in to keep you safe. WhiteHat crowdsources elite hackers to continuously attack client infrastructure, finding vulnerabilities before the criminals do."
    },
    {
        symbol: 'S-$1',
        name: 'Catalyst-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'AI litigation and contract generation',
        basePrice: 195.00,
        supplyPool: 550000,
        description: "Justice is blind, and now it's digital. RoboLaw drafts ironclad contracts and simulates litigation outcomes with 99.8% accuracy, settling disputes instantly."
    },
    {
        symbol: 'S-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'VR tourism for extinct ecosystems',
        basePrice: 55.40,
        supplyPool: 1800000,
        description: "Walk with mammoths. VirtualSafari painstakingly reconstructs the Pleistocene era in sensory VR, allowing tourists to safely pet saber-toothed tigers."
    },
    {
        symbol: 'S-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Genetic compatibility dating app',
        basePrice: 78.20,
        supplyPool: 1200000,
        description: "Soulmates by science. MatchAI analyzes DNA samples to pair couples with perfect immune system compatibility and pheromonal attraction, guaranteeing chemistry."
    },
    {
        symbol: 'Z-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Whole body cryogenics for afterlife',
        basePrice: 550.00,
        supplyPool: 200000,
        description: "A waiting room for the future. CryoPreserve freezes terminally ill patients in liquid nitrogen, preserving them until medical technology advances enough to revive and cure them."
    },
    {
        symbol: 'A-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Crypto',
        niche: 'Decentralized fact-checking oracle',
        basePrice: 4.20,
        supplyPool: 10000000,
        description: "The source of truth. VeritasBlock incentivizes thousands of validators to verify real-world events, creating an immutable ledger of facts for news orgs and smart contracts."
    },
    {
        symbol: 'V-$1',
        name: 'Vertex-$1 Corp',
        type: 'STOCK',
        sector: 'Media',
        niche: 'Movies generated from prompt to screen',
        basePrice: 66.60,
        supplyPool: 1500000,
        description: "Hollywood in a box. AI Studios generates feature-length films with consistent characters and plots from a single text prompt, disrupting the entire film industry."
    },
    {
        symbol: 'C-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Media',
        niche: 'Algorithmic personalized news feeds',
        basePrice: 33.30,
        supplyPool: 3000000,
        description: "News for an audience of one. AutoJournal curates and rewrites global events into a personalized daily briefing tailored specifically to your reading level and interests."
    },
    {
        symbol: 'Z-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Agriculture',
        niche: 'Skyscraper hydroponic vegetable growing',
        basePrice: 85.50,
        supplyPool: 950000,
        description: "Farming up, not out. VerticalFarms converts abandoned city high-rises into lush, automated hydroponic greenhouses, supplying fresh produce with zero food miles."
    },
    {
        symbol: 'V-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Agriculture',
        niche: 'Methane-free synthetic bovine protein',
        basePrice: 115.20,
        supplyPool: 850000,
        description: "The steak without the cow. NoMoo ferments precision microbes to produce muscle proteins identical to beef, eliminating the environmental cost of traditional ranching."
    },
    {
        symbol: 'P-$1',
        name: 'Vertex-$1 Corp',
        type: 'STOCK',
        sector: 'Utilities',
        niche: 'Low-energy graphene desalination',
        basePrice: 92.40,
        supplyPool: 1400000,
        description: "Endless fresh water. DesalCorp uses single-layer graphene filters to sift salt from seawater at a fraction of the energy cost of reverse osmosis, greening the desert."
    },
    {
        symbol: 'Z-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Utilities',
        niche: 'Global free ad-supported satellite wifi',
        basePrice: 18.90,
        supplyPool: 6000000,
        description: "Internet is a human right (supported by ads). GlobalFi beams basic connectivity to every inch of the globe for free, monetizing users via unavoidable retinal-projection ads."
    },
    {
        symbol: 'E-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Utilities',
        niche: 'Plasma gasification waste destruction',
        basePrice: 45.60,
        supplyPool: 2200000,
        description: "Vaporizing the landfill. PlasmaWaste blasts garbage with plasma torches hotter than the sun, disintegrating it into useful syngas and inert obsidian slag."
    },
    {
        symbol: 'N-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Infrastructure',
        niche: 'Induction charging highway lanes',
        basePrice: 135.00,
        supplyPool: 800000,
        description: "Charge while you drive. SmartRoads embeds wireless induction coils under highway asphalt, allowing EVs to drive indefinitely without ever stopping to plug in."
    },
    {
        symbol: 'P-$1',
        name: 'Vertex-$1 Corp',
        type: 'STOCK',
        sector: 'Manufacturing',
        niche: 'Molecular assemblers for consumers',
        basePrice: 280.00,
        supplyPool: 450000,
        description: "The Star Trek replicator, nearly real. NanoFab sells desktop units that arrange atoms to build small objects from raw carbon feedstock, disrupting traditional supply chains."
    },
    {
        symbol: 'P-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Manufacturing',
        niche: 'Soft robotics for handling delicates',
        basePrice: 145.00,
        supplyPool: 750000,
        description: "Robots with a gentle touch. SoftBot uses silicone pneumatic muscles to create manipulators capable of picking strawberries or handling eggs without crushing them."
    },
    {
        symbol: 'P-$1',
        name: 'Vertex-$1 Corp',
        type: 'STOCK',
        sector: 'Materials',
        niche: 'Hydrogen-reduced zero carbon steel',
        basePrice: 58.00,
        supplyPool: 1800000,
        description: "Forging without fire. GreenSteel replaces coal with hydrogen in the smelting process, producing high-strength alloy steel with water vapor as the only byproduct."
    },
    {
        symbol: 'Q-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Materials',
        niche: 'Plastic made from capture atmospheric CO2',
        basePrice: 72.50,
        supplyPool: 1300000,
        description: "Turning pollution into product. BioPlast sucks carbon dioxide from the air and catalyzes it into durable, moldable polymers, effectively sequestering carbon in your phone case."
    },
    {
        symbol: 'Q-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Materials',
        niche: 'Automated mantle drilling rigs',
        basePrice: 210.00,
        supplyPool: 500000,
        description: "Journey to the center of the earth. DeepBore's tungsten-tipped autonomous rigs drill deeper than any human could survive to retrieve hyper-pure minerals from the mantle."
    },
    {
        symbol: 'P-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Hospitality',
        niche: 'Low orbit luxury vacations',
        basePrice: 850.00,
        supplyPool: 150000,
        description: "The ultimate room with a view. SpaceHotel operates a rotating toroidal station in low earth orbit, offering ultra-wealthy guests a week of zero-g luxury."
    },
    {
        symbol: 'S-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Food',
        niche: 'Cricket flour pasta and chips',
        basePrice: 18.50,
        supplyPool: 4000000,
        description: "Crunchy, sustainable, protein-packed. InsectProtein processes crickets into tasteless, high-nutrition flour used to fortify pasta, snacks, and protein bars."
    },
    {
        symbol: 'L-$1',
        name: 'Nova-$1 Corp',
        type: 'STOCK',
        sector: 'Food',
        niche: 'Alcohol without the hangover toxicity',
        basePrice: 65.00,
        supplyPool: 2000000,
        description: "All the buzz, none of the headache. SynAlcohol creates a synthetic molecule that mimics the relaxing effects of ethanol but is metabolized harmlessly without toxic byproducts."
    },
    {
        symbol: 'A-$1',
        name: 'Pulse-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'Aerosol fabric for instant outfits',
        basePrice: 42.00,
        supplyPool: 3000000,
        description: "Fashion in a can. SprayOnClothes allows users to spray a liquid polymer directly onto their skin which dries instantly into a custom-fitted, washable fabric garment."
    },
    {
        symbol: 'V-$1',
        name: 'Lumina-$1 Corp',
        type: 'STOCK',
        sector: 'Consumer',
        niche: 'AI tutors that act as toys',
        basePrice: 155.00,
        supplyPool: 900000,
        description: "The teddy bear that teaches calculus. EdutainBot hides a supercomputer inside a plush toy, patiently tutoring children from toddlerhood to university entrance exams."
    },
    {
        symbol: 'A-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Drone swarm window cleaning',
        basePrice: 38.00,
        supplyPool: 2500000,
        description: "No more daring feats on scaffolds. DroneSrv deploys flocks of tethered drones to wash the windows of the world's tallest skyscrapers quickly and safely."
    },
    {
        symbol: 'H-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'DNA-based door locks',
        basePrice: 190.00,
        supplyPool: 600000,
        description: "Keys are obsolete. BioLock uses rapid gene sequencing to verify identity at the door, ensuring that only you (and not your evil clone) can enter your home."
    },
    {
        symbol: 'S-$1',
        name: 'Horizon-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Parametric weather insurance',
        basePrice: 88.00,
        supplyPool: 1400000,
        description: "Payouts when it pours. ClimateIns triggers instant, automatic payments to farmers and businesses the moment local weather sensors detect adverse conditions."
    },
    {
        symbol: 'E-$1',
        name: 'Stratos-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Cross-chain collateralized loans',
        basePrice: 220.00,
        supplyPool: 400000,
        description: "Your assets, working for you anywhere. DefiLend allows users to lock Bitcoin on one chain to borrow Dollars on another, seamlessly bridging the crypto liquidity islands."
    },
    {
        symbol: 'L-$1',
        name: 'Quantum-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Anonymous institutional trading venue',
        basePrice: 350.00,
        supplyPool: 300000,
        description: "Where whales swim unseen. DarkPool X offers a fully private trading venue for large institutions to move massive blocks of stock without moving the market price."
    },
    {
        symbol: 'A-$1',
        name: 'Synergy-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'AI managed ETF of ETFs',
        basePrice: 140.00,
        supplyPool: 800000,
        description: "The fund that knows best. AlgoFund's AI rebalances its portfolio of other ETFs every millisecond, capitalizing on macro trends faster than human analysis permits."
    },
    {
        symbol: 'L-$1',
        name: 'Vanguard-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Real estate tokenization platform',
        basePrice: 60.00,
        supplyPool: 1800000,
        description: "Buy a brick, not a building. TokenizeIt splits high-value commercial properties into millions of digital tokens, allowing anyone to invest in a skyscraper with $10."
    },
    {
        symbol: 'P-$1',
        name: 'Quantum-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Fractional ownership of digital art',
        basePrice: 25.00,
        supplyPool: 5000000,
        description: "Owning the Mona Lisa of the Metaverse. NFTGallery acquires blue-chip digital art and sells shares to collectors, democratizing access to high-culture assets."
    },
    {
        symbol: 'V-$1',
        name: 'Vertex-$1 Corp',
        type: 'STOCK',
        sector: 'Finance',
        niche: 'Decentralized event betting',
        basePrice: 48.00,
        supplyPool: 2200000,
        description: "Bet on anything. PredictionMkt creates liquid markets for real-world outcomes, from election results to weather patterns, harnessing the wisdom of the crowd."
    },
    {
        symbol: 'V-$1',
        name: 'Aether-$1 Corp',
        type: 'STOCK',
        sector: 'Services',
        niche: 'Blockchain forensic accounting',
        basePrice: 175.00,
        supplyPool: 500000,
        description: "Following the digital money trail. ChainAudit maps illicit crypto flows for governments and exchanges, de-anonymizing transactions to catch bad actors on the blockchain."
    },
];

async function main() {
    console.log(`Seeding ${assetsData.length} assets...`);

    for (const asset of assetsData) {
        // Calculate demandPool to match basePrice = demand / supply
        const demandPool = asset.basePrice * asset.supplyPool;

        // Use the custom description
        const description = asset.description;

        await prisma.asset.upsert({
            where: { symbol: asset.symbol },
            update: {
                name: asset.name,
                type: asset.type,
                sector: asset.sector,
                niche: asset.niche,
                description: description,
                basePrice: asset.basePrice,
                supplyPool: asset.supplyPool,
                demandPool: demandPool,
            },
            create: {
                symbol: asset.symbol,
                name: asset.name,
                type: asset.type,
                sector: asset.sector,
                niche: asset.niche,
                description: description,
                basePrice: asset.basePrice,
                supplyPool: asset.supplyPool,
                demandPool: demandPool,
            },
        });
    }

    // Create Users
    const users = [
        { id: '10101010', role: 'ADMIN', deltaBalance: 1000000000.0 }, // Central exchange account
        { id: 'demo-user-1', role: 'STUDENT', deltaBalance: 100000.0 },
    ];

    console.log('Seeding users...');
    for (const user of users) {
        await prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: user,
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
