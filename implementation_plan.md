# News Engine Implementation Plan

## Database Analysis
- **Total Distinct Sectors Identified**: 25
- **Identified Sectors**: Technology, Manufacturing, Healthcare, Energy, Finance, Food, Consumer, Space, Transport, Real Estate, Government, Corporate, Precious Metals, Industrial, Agriculture, Currency, Fiat, Materials, Education, Services, Crypto, Media, Utilities, Infrastructure, Hospitality.

## Sequential Task List
We are required to generate exactly 3 news stories for each of the 25 identified sectors (Total: 75 news stories), strictly adhering to the constraints in `news_engine_architecture.md`.

1. **Phase 1: Fetch Target Data**
   - Query the database programmatically to retrieve the complete list of fictionalized `name`, `sector`, and `niche` (hyperspecialization) for all 100+ active assets. Ensure exact string matches are mapped.

2. **Phase 2: Generate News Stories (Batch 1 - Tech to Finance)**
   - Utilize prompt logic matching `news_engine_architecture.md` specifications to generate 3 stories each for the first 5 sectors (Technology, Manufacturing, Healthcare, Energy, Finance).
   - Ensure the output strictly returns a Raw JSON array.

3. **Phase 3: Generate News Stories (Batch 2 - Food to Govt)**
   - Generate 3 stories each for the next 6 sectors (Food, Consumer, Space, Transport, Real Estate, Government).

4. **Phase 4: Generate News Stories (Batch 3 - Corp to Mat'l)**
   - Generate 3 stories each for the next 7 sectors (Corporate, Precious Metals, Industrial, Agriculture, Currency, Fiat, Materials).

5. **Phase 5: Generate News Stories (Batch 4 - Edu to Hosp)**
   - Generate 3 stories each for the remaining 7 sectors (Education, Services, Crypto, Media, Utilities, Infrastructure, Hospitality).

6. **Phase 6: Aggregation & Validation**
   - Combine all generated JSON arrays into a single master JSON payload containing exactly 75 stories.
   - Validate against the required data fields (`Headline`, `Context`, `Target_Sector`, `Target_Specialty`, `Impact_Scope`, `Direction`, `Intensity_Weight`, `Competitor_Inversion`).
   - Confirm Educational Constraints: Check that the contexts explain economic rationale using high-school appropriate terminology.
   - Wait for final user review of the completed JSON array.
