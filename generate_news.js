const fs = require('fs');

const rawData = fs.readFileSync('assets.json', 'utf8');
const assets = JSON.parse(rawData);

// Group by sector
const sectorsMap = {};
assets.forEach(asset => {
    if (!sectorsMap[asset.sector]) {
        sectorsMap[asset.sector] = [];
    }
    sectorsMap[asset.sector].push(asset.niche);
});

// Economic context templates (high school level)
const economicContexts = [
    "When demand outpaces supply, prices usually rise. This breakthrough has increased consumer desire, leading to potential revenue growth because more people want it but the amount available is limited.",
    "A decrease in the cost of production (like cheaper raw materials) shifts the supply curve outward. This allows companies to sell products for less and still make a profit, increasing their market share.",
    "New regulations can act like a tax, increasing the cost of doing business. When costs go up, supply goes down, which can hurt profitability and drive prices up for consumers.",
    "Subsidies from the government lower production costs. This encourages companies to innovate and expand, leading to a surplus of goods and making the industry much more attractive to investors.",
    "Opportunity cost is what a company gives up when making a choice. By focusing on this new trend, they sacrifice older markets, but the high potential profits make this a calculated and smart economic decision.",
    "When a company develops a unique product, it gains a competitive advantage. This monopoly-like position allows them to set higher prices and earn greater profits because consumers have few alternatives.",
    "Macroeconomic factors like inflation reduce the purchasing power of money. However, this industry provides essential goods, meaning consumer demand remains steady even when the broader economy weakens.",
    "Scarcity means there is never enough to satisfy everyone's wants. This recent development makes a previously scarce resource more abundant, which lowers prices and increases accessibility for everyone."
];

const directions = ["UP", "DOWN"];
const impactScopes = ["SECTOR", "SPECIALTY"];
const intensities = [1, 2, 3, 4, 5];

const newsArray = [];

let counter = 0;

for (const sector in sectorsMap) {
    const niches = sectorsMap[sector];

    // We need exactly 3 per sector
    for (let i = 0; i < 3; i++) {
        // pick a niche safely
        const niche = niches[i % niches.length];

        const isUp = Math.random() > 0.5;
        const direction = isUp ? "UP" : "DOWN";
        const intensity = intensities[Math.floor(Math.random() * intensities.length)];
        const scope = impactScopes[Math.floor(Math.random() * impactScopes.length)];
        const inversion = Math.random() > 0.7; // 30% chance for competitor inversion

        const contextBase = economicContexts[Math.floor(Math.random() * economicContexts.length)];

        let headline = "";
        let context = "";

        if (isUp) {
            headline = `Breakthrough in ${niche} Drives Historic Growth`;
            context = `Recent advances in ${niche} have created massive opportunities. ${contextBase}`;
        } else {
            headline = `Regulatory Hurdles Hit ${niche} Hard`;
            context = `Unexpected challenges in ${niche} have disrupted the market. ${contextBase.replace('increases availability', 'decreases availability').replace('lowers prices', 'raises prices')}`; // basic tweaking
        }

        newsArray.push({
            Headline: headline,
            Context: context,
            Target_Sector: sector,
            Target_Specialty: niche,
            Impact_Scope: scope,
            Direction: direction,
            Intensity_Weight: intensity,
            Competitor_Inversion: inversion
        });
    }
}

fs.writeFileSync('news_output.json', JSON.stringify(newsArray, null, 2));
console.log(`Generated ${newsArray.length} stories.`);
