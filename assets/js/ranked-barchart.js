const CSV_PATH = 'data/tpl_efficiency.csv';
const CHART_DIV_ID = '#ranked-barchart';
const CONTROLS_DIV_ID = '#chart-controls';

const regionNormalizationMap = {
    "'Valle d\"'Aosta / Vallée d\"'Aoste'": "Valle d'Aosta",
    "Trentino Alto Adige / Südtirol": "Trentino-Alto Adige",
    "Emilia-Romagna": "Emilia-Romagna",
    "Friuli-Venezia Giulia": "Friuli-Venezia Giulia",
    "Abruzzo": "Abruzzo",
    "Basilicata": "Basilicata",
    "Calabria": "Calabria",
    "Campania": "Campania",
    "Lazio": "Lazio",
    "Liguria": "Liguria",
    "Lombardia": "Lombardia",
    "Marche": "Marche",
    "Molise": "Molise",
    "Piemonte": "Piemonte",
    "Puglia": "Puglia",
    "Sardegna": "Sardegna",
    "Sicilia": "Sicilia",
    "Toscana": "Toscana",
    "Umbria": "Umbria",
    "Veneto": "Veneto"
};

async function renderChart() {
    try {
        const style = getComputedStyle(document.body);
        const customFont = style.getPropertyValue('--heading-font').trim() || 'sans-serif';


        const data = await d3.csv(CSV_PATH);


        const meltedData = [];
        const years = new Set();

        data.forEach(row => {
            let regionName = row['Regione'];
            if (regionNormalizationMap[regionName]) {
                regionName = regionNormalizationMap[regionName];
            }

            Object.keys(row).forEach(key => {
                if (key.startsWith('Indice_')) {
                    const year = parseInt(key.replace('Indice_', ''));
                    const value = parseFloat(row[key]);
                    if (!isNaN(value)) {
                        years.add(year);
                        meltedData.push({ Regione: regionName, Year: year, TPL_Index: value });
                    }
                }
            });
        });

        const sortedYears = Array.from(years).sort((a, b) => a - b);


        const spec = {
            $schema: "https://vega.github.io/schema/vega-lite/v5.json",
            description: "Regional TPL Efficiency Ranking",
            width: "container",
            height: 500,
            data: { values: meltedData },

            config: {
                font: customFont,
                axis: { labelFont: customFont, titleFont: customFont },
                legend: { labelFont: customFont, titleFont: customFont },
                text: { font: customFont }
            },

            params: [
                {
                    name: "SelectedYear",
                    value: sortedYears[0],
                    bind: {
                        input: "select",
                        options: sortedYears,
                        name: "Select Year: "
                    }
                }
            ],

            transform: [
                { filter: "datum.Year == SelectedYear" },
                { window: [{ op: "rank", as: "rank" }], sort: [{ field: "TPL_Index", order: "descending" }] }
            ],

            layer: [
                {
                    mark: "bar",
                    encoding: {
                        x: { field: "TPL_Index", type: "quantitative", title: "Indice TPL (Efficienza)" },
                        y: { field: "Regione", type: "nominal", sort: "-x", title: null },
                        color: { field: "Regione", type: "nominal", legend: null, scale: { scheme: "tableau20" } },
                        tooltip: [
                            { field: "Regione", type: "nominal" },
                            { field: "TPL_Index", type: "quantitative" },
                            { field: "Year", type: "quantitative" }
                        ]
                    }
                },
                {
                    mark: { type: "text", align: "left", baseline: "middle", dx: 3 },
                    encoding: {
                        x: { field: "TPL_Index", type: "quantitative" },
                        y: { field: "Regione", type: "nominal", sort: "-x" },
                        text: { field: "TPL_Index", type: "quantitative" }
                    }
                }
            ]
        };


        vegaEmbed(CHART_DIV_ID, spec).then(function (result) {

            const bindings = document.querySelector(CHART_DIV_ID + ' .vega-bindings');
            const controlsContainer = document.querySelector(CONTROLS_DIV_ID);


            if (bindings && controlsContainer) {
                controlsContainer.appendChild(bindings);
            }

        }).catch(console.error);

    } catch (error) {
        console.error("Error loading or rendering chart:", error);
    }
}

renderChart();