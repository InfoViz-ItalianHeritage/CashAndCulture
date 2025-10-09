// --- Shared Helper: Normalize region names ---
function normalizeRegionName(name) {
    if (typeof name !== 'string') return '';
    let normalized = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    // Handle known hyphenated regions
    if (normalized.includes('trentino')) return 'trentinoaltoadige';
    if (normalized.includes('valle')) return 'valledaosta';

    return normalized;
}

// --- Shared Helper: Create the Slider Control ---
function createYearSliderControl(mapInstance, yearsArray, onChangeCallback) {
    if (yearsArray.length === 0) {
        console.warn("Cannot create slider: No valid years found in data after filtering.");
        return;
    }

    const SliderControl = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom year-slider-control');
            container.style.backgroundColor = 'white';
            container.style.padding = '10px';
            container.style.width = '200px';
            container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
            container.style.borderRadius = '5px';

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const yearLabel = L.DomUtil.create('div', 'year-label', container);
            yearLabel.innerHTML = `Year: <b>${yearsArray[0]}</b>`;
            yearLabel.style.marginBottom = '5px';
            yearLabel.style.textAlign = 'center';

            const slider = L.DomUtil.create('input', 'year-slider', container);
            slider.type = 'range';
            slider.min = 0;
            slider.max = yearsArray.length - 1;
            slider.value = 0;
            slider.step = 1;
            slider.style.width = '100%';

            L.DomEvent.on(slider, 'input', function (e) {
                const yearIndex = parseInt(e.target.value);
                const selectedYear = yearsArray[yearIndex];
                yearLabel.innerHTML = `Year: <b>${selectedYear}</b>`;
                onChangeCallback(selectedYear);
            });

            onChangeCallback(yearsArray[0]);
            return container;
        }
    });
    new SliderControl({ position: 'bottomleft' }).addTo(mapInstance);
}

// --- 1. FUNDING MAP (OpenCoesione) ---
function createFundingMap() {
    const map = L.map('map').setView([41.87194, 12.56738], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    Promise.all([
        d3.csv('data/open_coesione.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([csvData, geojsonData]) => {

        const longData = [];
        csvData.forEach(d => {
            const dateStr = d["OC_DATA_INIZIO_PROGETTO"];
            const year = dateStr ? +dateStr.substring(0, 4) : null;
            if (year) {
                const cleanFunding = d["FINANZ_TOTALE_PUBBLICO"]
                    ? d["FINANZ_TOTALE_PUBBLICO"].replace(/\./g, '').replace(',', '.')
                    : '0';

                longData.push({
                    Year: year,
                    Region: d["DEN_REGIONE"],
                    Funding: parseFloat(cleanFunding) || 0,
                    region_norm: normalizeRegionName(d["DEN_REGIONE"])
                });
            }
        });

        const yearlyRegionData = d3.rollups(
            longData,
            v => d3.sum(v, d => d.Funding),
            d => `${d.region_norm}-${d.Year}`
        );

        const getFunding = (region, year) => {
            const key = `${region}-${year}`;
            const item = yearlyRegionData.find(([k]) => k === key);
            return item ? item[1] : 0;
        };

        const maxFunding = d3.max(longData.map(d => d.Funding));
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxFunding]);

        let geoJsonLayer = null;
        function drawMap(selectedYear) {
            if (geoJsonLayer) map.removeLayer(geoJsonLayer);
            geoJsonLayer = L.geoJson(geojsonData, {
                style: feature => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const region = normalizeRegionName(name);
                    const value = getFunding(region, selectedYear);
                    return {
                        fillColor: colorScale(value),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const value = getFunding(normalizeRegionName(name), selectedYear);
                    layer.bindPopup(`<b>${name}</b><br>Year: ${selectedYear}<br>Funding: €${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
                    layer.on({
                        mouseover: e => {
                            e.target.setStyle({ weight: 5, color: '#666', dashArray: '', fillOpacity: 0.9 });
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                        },
                        mouseout: e => geoJsonLayer.resetStyle(e.target)
                    });
                }
            }).addTo(map);
        }

        const allowedYears = [2016, 2017, 2018, 2019, 2022];
        const years = Array.from(new Set(longData.map(d => d.Year)))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);

        if (years.length > 0) {
            createYearSliderControl(map, years, drawMap);
        }
    }).catch(err => console.error("Error loading funding data:", err));
}

// --- 2. VISITOR MAP (MiC data) ---
function createVisitorMap() {
    const map1 = L.map('map1').setView([41.87194, 12.56738], 5.5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map1);

    if (typeof turf === 'undefined') {
        console.error("Turf.js is required for centroid calculations. Please include the script.");
        return;
    }

    Promise.all([
        d3.csv('data/mic_visitors.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([csvData, geoData]) => {

        // --- DIAGNOSTIC LOG: Check what D3 is calling the first column ---
        if (csvData.columns) {
            console.log("D3 CSV Headers (check first column name):", csvData.columns);
        }
        // ------------------------------------------------------------------

        const longData = [];
        // Determine the correct ID column name: prioritize Unnamed: 0, then check for a blank header ""
        const idCol = csvData.columns && csvData.columns.includes('Unnamed: 0') ? 'Unnamed: 0' : '';

        // Final fallback in case the ID column is neither "Unnamed: 0" nor ""
        const idKey = idCol || csvData.columns[0];

        const allowedRegions = [
            'ABRUZZO', 'BASILICATA', 'CALABRIA', 'CAMPANIA', 'EMILIA ROMAGNA',
            'FRIULI-VENEZIA GIULIA', 'LAZIO', 'LIGURIA', 'LOMBARDIA', 'MARCHE',
            'MOLISE', 'PIEMONTE', 'PUGLIA', 'SARDEGNA', 'TOSCANA', 'UMBRIA', 'VENETO'
        ];

        csvData.forEach(row => {
            // Use the determined key to access the row identifier
            const id = row[idKey];
            if (!id) return;

            const trimmedId = id.trim().toLowerCase();
            if (trimmedId.startsWith('totale_regione')) {
                const yearMatch = trimmedId.match(/\d{4}$/);
                const year = yearMatch ? +yearMatch[0] : null;
                if (!year) return;

                Object.entries(row).forEach(([region, value]) => {
                    if (allowedRegions.includes(region.toUpperCase())) {
                        const clean = (value || '0').replace(/\./g, '').replace(',', '.');
                        const visitors = parseFloat(clean) || 0;
                        longData.push({
                            Year: year,
                            Region: region,
                            Visitors: visitors,
                            region_norm: normalizeRegionName(region)
                        });
                    }
                });
            }
        });

        if (longData.length === 0) {
            console.warn(`No visitor data rows were successfully processed. Check file path, CSV format, and that the ID column name is correctly identified as '${idKey}'.`);
            return;
        }

        console.log("SUCCESS: Parsed visitor rows (first 5):", longData.slice(0, 5));

        const yearlyData = d3.rollups(
            longData,
            v => d3.sum(v, d => d.Visitors),
            d => `${d.region_norm}-${d.Year}`
        );

        const getVisitors = (region, year) => {
            const key = `${region}-${year}`;
            const item = yearlyData.find(([k]) => k === key);
            return item ? item[1] : 0;
        };

        const maxVisitors = d3.max(longData, d => d.Visitors);
        const minRadius = 4, maxRadius = 30;
        const scaleRadius = v => v <= 0 ? 0 : minRadius + Math.sqrt(v / maxVisitors) * (maxRadius - minRadius);

        function drawMap(selectedYear) {
            map1.eachLayer(layer => {
                if (layer instanceof L.CircleMarker) map1.removeLayer(layer);
            });

            const yearData = longData.filter(d => d.Year === selectedYear);
            const totalVisitors = d3.sum(yearData, d => d.Visitors);
            console.log(`Drawing visitor map for ${selectedYear}, total visitors: ${totalVisitors}`);

            geoData.features.forEach(feature => {
                const props = feature.properties;
                const regionName = props.name || props.reg_name || '';
                const norm = normalizeRegionName(regionName);
                const visitors = getVisitors(norm, selectedYear);

                if (visitors > 0) {
                    const centroid = turf.centroid(feature).geometry.coordinates;
                    const percentage = (visitors / totalVisitors) * 100;

                    L.circleMarker([centroid[1], centroid[0]], {
                        radius: scaleRadius(visitors),
                        color: '#3186cc',
                        fillColor: '#3186cc',
                        fillOpacity: 0.6
                    })
                        .bindPopup(`<b>${regionName}</b><br>Year: ${selectedYear}<br>Visitors: ${visitors.toLocaleString()} (${percentage.toFixed(1)}%)`)
                        .addTo(map1);
                }
            });
        }

        // --- Slider setup ---
        const allowedYears = [2016, 2017, 2018, 2019, 2022];
        const years = Array.from(new Set(longData.map(d => d.Year)))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);

        console.log("Years available for visitor slider:", years);

        if (years.length > 0) {
            createYearSliderControl(map1, years, drawMap);
        } else {
            console.warn("No matching years found for visitor data after filtering.");
        }

    }).catch(err => console.error("Error loading visitor data:", err));
}


// --- 3. Initialize both maps ---
createFundingMap();
createVisitorMap();