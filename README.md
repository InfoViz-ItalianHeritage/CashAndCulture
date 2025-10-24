# Cash & Culture: Who Gets Funded, Who Gets Visited
Final project for the course of Information Visualization 2024-2025 held at University of Bologna by professor D'Aquino.

This project analyzes how public funding for cultural-heritage and tourism projects has been distributed across Italian regions and compares those investments with the number of visitors each region received in the same years (2014 → 2024). The goal is to identify regional mismatches (e.g. high funding / low visitation or vice versa), temporal trends, and possible explanations that can inform policy discussion and further research.

# Research Questions
RQ1
In the time scope of the project, 2014-2024, which years witnessed the highest amount of public funding allocated to cultural heritage?

RQ2
Which regions received the highest share of funding each year?

RQ3
How were regional visitors’ participation in cultural heritage events/activities?

# Libraries Used
- pandas
- os
- glob
- matplotlib/seaborn
- geopandas
- folium
- mpld3
- plotly

# Workflow Summary
1. Data Preparation: identify the data sources, evaluate each for its relevance and feasibility, and select the raw data for extraction.
2. Data Extraction: ingest the raw data, clean the rows of any duplicate or empty values, normalize the variable names, and save clean CSVs file for visualization.
3. Data Visualization: graph the funding allocated to cultural heritage projects and in each region and the visitor fluctuations within the years under study.
4. Data Analysis: observ from the graphs picks and interesting trends and extract useful information.

# Key Findings
The output of our analysis reveals a misalignment between the regions receiving the highest funding and those with the highest visitor numbers.
Considering the years that received the largest amounts of funding: 2016, 2017, 2018, 2019, and 2022 and the regions that recorded the highest visitor numbers: Lazio, Campania, Toscana, Piemonte, and Lombardia we expected a correspondence between the most visited and the most funded regions.\
Instead, the top-funded regions in those years are: Campania (2016), Campania (2017), Puglia (2018), Molise (2019), and Campania (2022).\
In other words, there is no direct correlation between high funding and high visitor numbers.

Furthermore, Molise appears as the top-funded region in 2019, despite being one of Italy’s smallest and least populated regions, with relatively modest visitor numbers. This anomaly reflects broader policy objectives, such as supporting regional equity, protecting cultural assets in peripheral areas, and implementing European cohesion initiatives.

# Team
- Anna Nicoletti - anna.nicoletti5@studio.unibo.it: Data Analysis, Web Communication
- Mohamed Iheb Ouerghi - mohamediheb.ouerghi@studio.unibo.it: Data Visualization, Web Communication
- Nazanin Fakharian - nazanin.fakharian@studio.unibo.it: Data Visualization, Web Communication

# Licences
- The website is published under a Free Licence: Designed by BootstrapMade; credits for icons and external images are shown in the footer of the website.
- [OpenCoesione](https://opencoesione.gov.it/en/opendata/dataset/progetti_esteso_cultura_turismo_2014-2020/) datasource is published under CC BY 4.0 licence.
- [Ministero della Cultura](https://statistica.cultura.gov.it/?page_id=500) datasource is published under CC BY 3.0 licence.
- Our csv files [open_coesione.csv](data/open_coesione.csv), [mic_visitors.csv](data/mic_visitors.csv), [mic_income.csv](data/mic_visitors.csv) are published under CC BY 4.0 licence.
