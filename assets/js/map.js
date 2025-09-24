// --- A helper function to normalize region names ---
function normalizeRegionName(name) {
    // Convert to lowercase and remove spaces, hyphens, and apostrophes
    let normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Handle specific region name discrepancies
    if (normalized.includes('trentino')) {
        normalized = 'trentinoaltoadige';
    }
    if (normalized.includes('valle')) {
        normalized = 'valledaosta';
    }

    return normalized;
}

// --- 1. Initialize the map ---
const map = L.map('map').setView([41.87194, 12.56738], 6);

// Add a base tile layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// --- 2. Load the data ---
Promise.all([
    d3.csv('https://raw.githubusercontent.com/InfoViz-ItalianHeritage/CHRS/refs/heads/main/data/OpenCoesione.csv?token=GHSAT0AAAAAADJHPZCBCPSHNXI3CVCHCSWS2GUBHKA'),
    d3.json('assets/data/italy_regions.geojson')
]).then(([csvData, geojsonData]) => {

    // --- 3. Process the CSV data and normalize region names ---
    const regionData = d3.rollup(csvData,
        v => d3.sum(v, d => {
            const cleanValue = d["FINANZ_TOTALE_PUBBLICO"]
                ? d["FINANZ_TOTALE_PUBBLICO"].replace(/\./g, '').replace(',', '.')
                : '0';
            return parseFloat(cleanValue) || 0;
        }),
        d => normalizeRegionName(d["DEN_REGIONE"])
    );

    // --- 4. Create a color scale based on the data ---
    const maxFunding = d3.max(Array.from(regionData.values()));
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxFunding]);

    // --- 5. Add the GeoJSON layer to the map ---
    const geoJsonLayer = L.geoJson(geojsonData, {
        style: function (feature) {
            const originalRegionName = feature.properties.name || feature.properties.reg_name || '';
            const normalizedName = normalizeRegionName(originalRegionName);
            const funding = regionData.get(normalizedName) || 0;
            return {
                fillColor: colorScale(funding),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function (feature, layer) {
            const originalRegionName = feature.properties.name || feature.properties.reg_name || '';
            const normalizedName = normalizeRegionName(originalRegionName);
            const funding = regionData.get(normalizedName) || 0;

            layer.bindPopup(`<b>${originalRegionName}</b><br>Total Funding: €${funding.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);

            // Add interactivity for highlighting
            layer.on({
                mouseover: function (e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 5,
                        color: '#666',
                        dashArray: '',
                        fillOpacity: 0.9
                    });
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        layer.bringToFront();
                    }
                },
                mouseout: function (e) {
                    geoJsonLayer.resetStyle(e.target);
                }
            });
        }
    }).addTo(map);
}).catch(error => {
    console.error("Error loading data:", error);
});