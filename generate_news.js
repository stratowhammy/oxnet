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

// Economic context templates (high school level -> 8th Grade Level)
const economicContexts = [
    "When a lot of people want something but there isn't much of it to go around, the price goes up. This discovery has made everyone want to buy it, meaning the company can easily charge more money.",
    "When it becomes cheaper to make something, companies can sell it for a lower price and still make a lot of money. This helps them steal customers away from other companies who can't match their prices.",
    "New rules from the government act almost like a forced extra tax. When it costs more money or time just to obey the law, companies make less profit and usually have to raise their prices.",
    "When the government gives out free money (subsidies) to help an industry, it makes building things much cheaper. Companies are encouraged to take big risks and build a ton of new products.",
    "Opportunity cost means deciding what you have to give up to get something else. By choosing to build this new technology, they had to shut down their old factories, but the profit from the new tech is much higher.",
    "When a company is the only one who knows how to make a special product, they have a monopoly. Because nobody else can sell it, they can charge as much as they want without losing customers.",
    "Inflation is when your money slowly buys less over time. However, because everyone relies on this specific product just to survive, people will keep buying it even if the rest of the economy is doing badly.",
    "Scarcity means there is never enough stuff for everybody on Earth. This new invention suddenly makes a very rare material super easy to find, which drops the price so everyone can afford it."
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
            context = `Recent advances in the field of ${niche} have created massive new opportunities for businesses. Companies are rushing to take advantage of the new technology.\n\n**Economic Impact**\n\n${contextBase}`;
        } else {
            headline = `Regulatory Hurdles Hit ${niche} Hard`;
            let flippedBase = contextBase.replace('goes up', 'goes down').replace('charge more money', 'charge less money').replace('cheaper to make', 'more expensive to make');
            context = `Unexpected challenges and government rules regarding ${niche} have delayed major projects. Investors are worried about the long-term viability of the sector.\n\n**Economic Impact**\n\n${flippedBase}`;
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

// Ensure exactly 250 items total by duplicating if necessary, or slicing
while (newsArray.length < 250) {
    const randomStory = newsArray[Math.floor(Math.random() * newsArray.length)];
    newsArray.push({ ...randomStory });
}
if (newsArray.length > 250) {
    newsArray.length = 250;
}

fs.writeFileSync('news_output.json', JSON.stringify(newsArray, null, 2));
console.log(`Generated ${newsArray.length} stories.`);
