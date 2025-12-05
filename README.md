# Cash & Culture: Who Gets Funded, Who Gets Visited
Final project for the course of *Information Visualization*, 2024-2025, held at the **University of Bologna** by Professor *Marilena Daquino*.

The project starts with the core question of whether regions are funded where visitor demand is highest. We use three interactive lenses to evaluate the effectiveness of these policies from 2014 to 2024:

- The Allocation Gap: Mapping the balance between public investment and private income.
- The Self-Sufficiency Test: Tracking whether regions can turn government funds into financial independence.
- The Bottleneck Indicator: Identifying culturally rich regions where poor transportation infrastructure might be the primary limit on tourism growth.

# Research Questions
*RQ1*\
How evenly have public funds been distributed across Italian regions, and does this distribution match visitor participation?

*RQ2*\
Do current funding policies result in financial self-sufficiency across these regions?

*RQ3*\
Does infrastructure accessibility act as a bottleneck for regions with high cultural appeal?

# Libraries Used
- pandas
- os
- glob
- matplotlib
- seaborn
- geopandas
- folium
- plotly

# Workflow Summary
1. *Data Preparation*: identify the data sources, evaluate each for its relevance and feasibility, and select the raw data for extraction.
2. *Data Extraction*: ingest the raw data, clean the rows of any duplicate or empty values, normalize the variable names, and save clean CSV files for visualization.
3. *Data Visualization*: graph the funding allocated to cultural heritage projects in each region, and the visitor fluctuations within the years under study.
4. *Data Interpretation*: observe the graphs and interesting trends, and extract useful information.

# Key Findings
1. There is a mismatch between project funding allocation and regional visitor engagement. Lazio consistently records the highest visitor numbers, but does not receive the largest share of project funding. Campania receives the highest total project funding, yet does not achieve comparable visitor levels.
- This disparity suggests that funding allocation is often driven by criteria other than immediate visitor demand, such as structural development needs, legacy policy, or delays in funding utilization, rather than reflecting a direct return on investment based on visitor appeal.
2. Financial sustainability remains elusive for most regions, with the majority operating in a state of financial dependency. It must be interpreted through the lens of cultural heritage management, where the primary objective is public value (preservation and access), not commercial profit. Negative returns are often a structural necessity for maintaining non-profit assets, particularly in less central areas.
- The calculated "return" is likely an underestimation of actual financial performance. The dataset strictly tracks ticket sales, omitting critical revenue streams (guided tours, merchandising, venue rentals) standard in modern cultural management, suggesting the actual degree of self-sufficiency is higher than reported.
- While regions like Lazio and Toscana demonstrate that commercial success is possible, the data also highlights significant reporting gaps. Cases of "zero income" in autonomous regions suggest missing data rather than a complete lack of revenue.
3. Transport efficiency is a critical determinant of regional cultural tourism outcomes, acting as a structural constraint in some areas. 
- Bottleneck: High-appeal regions (Campania, Toscana) show mid-low TPL efficiency, constraining visitor flow and limiting the financial viability of cultural projects.
- Synergy Benchmark: Lazio serves as the star performer, demonstrating that high TPL amplifies high cultural appeal.
- High Potential: Lombardia possesses high TPL efficiency but low cultural appeal, positioning it as a high-potential area where existing infrastructure can be leveraged to boost cultural tourism.
- Lagging Majority: The majority of regions (16/20) are in the Bottom-Left quadrant (Low TPL / Low Cultural Index), showing that transport and cultural improvements tend to coincide.

If cultural policy undergoes a shift from simply funding projects to strategically integrating infrastructure development, it might smooth the conversion of cultural appeal into actual visitation and economic scale.

# Team
- Anna Nicoletti - anna.nicoletti5@studio.unibo.it: Data Analysis, Web Communication
- Mohamed Iheb Ouerghi - mohamediheb.ouerghi@studio.unibo.it: Data Visualization, Web Communication
- Nazanin Fakharian - nazanin.fakharian@studio.unibo.it: Data Visualization, Web Communication

# Licences
- The website is published under a Free Licence: Designed by BootstrapMade; credits for icons and external images are shown in the footer of the website.
- [OpenCoesione](https://opencoesione.gov.it/en/opendata/dataset/progetti_esteso_cultura_turismo_2014-2020/) datasource is published under CC BY 4.0 licence.
- [Ministero della Cultura](https://statistica.cultura.gov.it/?page_id=500) datasource is published under CC BY 3.0 licence.
- [Istat - Qualità dei servizi](https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0930TER,1.0/BES_T/IT1,DF_BES_TERRIT_12,1.0) datasource is published under CC BY 4.0 licence.
- [Istat - Paesaggio e Patrimonio culturale](https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0930TER,1.0/BES_T/IT1,DF_BES_TERRIT_9,1.0) datasource is published under CC BY 4.0 licence.
- Our csv files [open_coesione.csv](data/open_coesione.csv), [mic_visitors.csv](data/mic_visitors.csv), [mic_income.csv](data/mic_visitors.csv), [income&funding.csv](https://github.com/InfoViz-ItalianHeritage/CashAndCulture/blob/main/data/income%26funding.csv), [tpl_efficiency.csv](https://github.com/InfoViz-ItalianHeritage/CashAndCulture/blob/main/data/tpl_efficiency.csv), [index_cult.csv](https://github.com/InfoViz-ItalianHeritage/CashAndCulture/blob/main/data/index_cult.csv) are published under CC BY 4.0 licence.
