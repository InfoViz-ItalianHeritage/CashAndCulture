// 1. Data Normalization Helpers
const regionMap = {
    "'Valle d\"'Aosta / Vallée d\"'Aoste'": "Valle d'Aosta",
    "Trentino Alto Adige / Südtirol": "Trentino-Alto Adige",
    "Emilia-Romagna": "Emilia-Romagna",
    "Friuli-Venezia Giulia": "Friuli-Venezia Giulia",
    "Abruzzo": "Abruzzo", "Basilicata": "Basilicata", "Calabria": "Calabria",
    "Campania": "Campania", "Lazio": "Lazio", "Liguria": "Liguria",
    "Lombardia": "Lombardia", "Marche": "Marche", "Molise": "Molise",
    "Piemonte": "Piemonte", "Puglia": "Puglia", "Sardegna": "Sardegna",
    "Sicilia": "Sicilia", "Toscana": "Toscana", "Umbria": "Umbria", "Veneto": "Veneto"
};

function normalizeRegion(name) { return regionMap[name] || name; }

function meltData(data, valueName) {
    const melted = [];
    data.forEach(row => {
        const region = normalizeRegion(row.Regione);
        Object.keys(row).forEach(key => {
            if (key.startsWith('Indice_')) {
                const year = parseInt(key.replace('Indice_', ''));
                const value = parseFloat(row[key]);
                if (!isNaN(value)) {
                    melted.push({ Regione: region, Year: year, [valueName]: value });
                }
            }
        });
    });
    return melted;
}

// 2. Style Logic: Get Font AND Color from CSS variables
const style = getComputedStyle(document.body);
const customFont = style.getPropertyValue('--heading-font').trim() || 'sans-serif';
// Extract the color variable, default to black if missing
const customColor = style.getPropertyValue('--heading-color').trim() || '#000000';

// 3. Main Data Pipeline
Promise.all([
    d3.csv("data/tpl_efficiency.csv"),
    d3.csv("data/index_cult.csv")
]).then(([tplRaw, cultRaw]) => {

    // --- DATA PROCESSING START ---
    const tplMelted = meltData(tplRaw, 'TPL_Index');
    const cultMelted = meltData(cultRaw, 'Cult_Index');
    const mergedData = [];

    tplMelted.forEach(tplItem => {
        const cultItem = cultMelted.find(c => c.Regione === tplItem.Regione && c.Year === tplItem.Year);
        if (cultItem) {
            mergedData.push({
                Regione: tplItem.Regione,
                Year: tplItem.Year,
                TPL_Index: tplItem.TPL_Index,
                Cult_Index: cultItem.Cult_Index
            });
        }
    });

    const groupedData = d3.rollup(mergedData,
        v => ({
            TPL_Index: d3.mean(v, d => d.TPL_Index),
            Cult_Index: d3.mean(v, d => d.Cult_Index)
        }),
        d => d.Regione
    );
    // --- DATA PROCESSING END ---

    const averageData = Array.from(groupedData, ([Regione, values]) => ({
        Regione: Regione,
        TPL_Index: values.TPL_Index,
        Cult_Index: values.Cult_Index
    }));

    // 4. Vega-Lite Specification
    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",

        "width": 1300,
        "height": 600,
        "autosize": { "type": "fit", "contains": "padding" },

        "config": {
            "font": customFont,
            "title": {
                "font": customFont,
                // MATCHING YOUR D3 CODE HERE:
                "fontSize": 25,         // Matches .style("font-size", "25px")
                "fontWeight": 700,      // Matches .style("font-weight", "700")
                "color": customColor,   // Matches .style("fill", "var(--heading-color)")
                "anchor": "middle",     // Matches .attr("text-anchor", "middle")
                "offset": 20            // Adds space similar to y = -30
            },
            "axis": { "labelFont": customFont, "titleFont": customFont, "titleFontSize": 12, "labelFontSize": 10 },
            "legend": { "labelFont": customFont, "titleFont": customFont, "titleFontSize": 12, "labelFontSize": 10 },
            "header": { "labelFont": customFont, "titleFont": customFont },
            "text": { "font": customFont, "fontSize": 10 }
        },

        "title": "Local Public Transportation VS. Cultural Appeal Index",
        "data": { "values": averageData },
        "layer": [
            {
                "mark": { "type": "circle", "size": 200 },
                "encoding": {
                    "x": { "field": "TPL_Index", "type": "quantitative", "title": "Local Public Transportation (Number of seats and Kilometers for each resident)" },
                    "y": { "field": "Cult_Index", "type": "quantitative", "title": "Cultural Appeal Index" },
                    "color": {
                        "field": "Regione",
                        "type": "nominal",
                        "scale": { "scheme": "tableau20" },
                        "legend": { "title": "Regione" }
                    },
                    "tooltip": [
                        { "field": "Regione", "type": "nominal" },
                        { "field": "TPL_Index", "type": "quantitative", "format": ".0f", "title": "Media TPL" },
                        { "field": "Cult_Index", "type": "quantitative", "format": ".2f", "title": "Media Cult" }
                    ]
                }
            },
            {
                "mark": { "type": "text", "align": "left", "baseline": "middle", "dx": 8 },
                "encoding": {
                    "x": { "field": "TPL_Index", "type": "quantitative" },
                    "y": { "field": "Cult_Index", "type": "quantitative" },
                    "text": { "field": "Regione", "type": "nominal" }
                }
            }
        ],
        "selection": {
            "grid": { "type": "interval", "bind": "scales" }
        }
    };

    vegaEmbed('#scatterplot', spec, { actions: false });

}).catch(error => {
    console.error("Error loading data:", error);
    const container = document.getElementById('scatterplot');
    if (container) {
        container.innerHTML = "Error loading data: " + error.message;
    }
});