// --- Shared Helper: Normalize region names ---
function normalizeRegionName(name) {
    if (typeof name !== 'string') return '';
    let normalized = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    if (normalized.includes('trentino')) return 'trentinoaltoadige';
    if (normalized.includes('valle')) return 'valledaosta';

    return normalized;
}

// Helper function to process raw funding value (Equivalent to Python pandas string ops)
function parseFundingValue(val) {
    if (val === null || val === undefined || val === '') {
        return 0;
    }
    let s = String(val).trim();
    s = s.replace(/€/g, "").replace(/ /g, "");

    // Handle dot as thousands separator and comma as decimal (common Italian format)
    if (s.includes(",") && s.includes(".")) {
        s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
        s = s.replace(/,/g, ".");
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}

// --- Shared Helper: Create the Slider Control (Used by Maps 1, 2, and 3) ---
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

// ================================================================================
// --- 1. FUNDING MAP (OpenCoesione - Time-Aware) on #map ---
// ================================================================================
function createFundingMap() {
    if (L.DomUtil.get('map')) {
        // Remove map if it already exists, preventing double initialization
        if (L.DomUtil.get('map')._leaflet_id) L.map('map').remove();
    } else {
        console.error("Map container #map not found.");
        return;
    }

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
                const funding = parseFundingValue(d["FINANZ_TOTALE_PUBBLICO"]);

                longData.push({
                    Year: year,
                    Region: d["DEN_REGIONE"],
                    Funding: funding,
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
    }).catch(err => console.error("Error loading funding data for Map 1:", err));
}

// ================================================================================
// --- 2. VISITOR MAP (MiC data - Time-Aware Proportional Symbols) on #map1 ---
// ================================================================================
function createVisitorMap() {
    if (L.DomUtil.get('map1')) {
        if (L.DomUtil.get('map1')._leaflet_id) L.map('map1').remove();
    } else {
        console.error("Map container #map1 not found.");
        return;
    }

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

        const longData = [];
        const idCol = csvData.columns && csvData.columns.includes('Unnamed: 0') ? 'Unnamed: 0' : '';
        const idKey = idCol || csvData.columns[0];

        const allowedRegions = [
            'ABRUZZO', 'BASILICATA', 'CALABRIA', 'CAMPANIA', 'EMILIA ROMAGNA',
            'FRIULI-VENEZIA GIULIA', 'LAZIO', 'LIGURIA', 'LOMBARDIA', 'MARCHE',
            'MOLISE', 'PIEMONTE', 'PUGLIA', 'SARDEGNA', 'TOSCANA', 'UMBRIA', 'VENETO'
        ];

        csvData.forEach(row => {
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

            geoData.features.forEach(feature => {
                const props = feature.properties;
                const regionName = props.name || props.reg_name || '';
                const norm = normalizeRegionName(regionName);
                const visitors = getVisitors(norm, selectedYear);

                if (visitors > 0) {
                    const centroid = turf.centroid(feature).geometry.coordinates;

                    L.circleMarker([centroid[1], centroid[0]], {
                        radius: scaleRadius(visitors),
                        color: '#3186cc',
                        fillColor: '#3186cc',
                        fillOpacity: 0.6
                    })
                        .bindPopup(`<b>${regionName}</b><br>Year: ${selectedYear}<br>Visitors: ${visitors.toLocaleString()}`)
                        .addTo(map1);
                }
            });
        }

        const allowedYears = [2016, 2017, 2018, 2019, 2022];
        const years = Array.from(new Set(longData.map(d => d.Year)))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);

        if (years.length > 0) {
            createYearSliderControl(map1, years, drawMap);
        } else {
            console.warn("No matching years found for visitor data after filtering.");
        }

    }).catch(err => console.error("Error loading visitor data for Map 2:", err));
}

// ================================================================================
// --- 3. COMBINED MAP (Time-Aware Choropleth + Symbols) on #map3 ---
// ================================================================================
function createCombinedMap() {
    if (L.DomUtil.get('map3')) {
        if (L.DomUtil.get('map3')._leaflet_id) L.map('map3').remove();
    } else {
        console.error("Map container #map3 not found.");
        return;
    }

    const map3 = L.map('map3').setView([41.87194, 12.56738], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map3);

    if (typeof turf === 'undefined') {
        console.error("Turf.js is required for centroid calculations. Please include the script.");
        return;
    }

    Promise.all([
        d3.csv('data/open_coesione.csv'),
        d3.csv('data/mic_visitors.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([fundingCsvData, visitorCsvData, geojsonData]) => {

        // --- Data Processing: Funding (Time-Aware) ---
        const fundingLongData = [];
        fundingCsvData.forEach(d => {
            const dateStr = d["OC_DATA_INIZIO_PROGETTO"];
            const year = dateStr ? +dateStr.substring(0, 4) : null;
            if (year) {
                const funding = parseFundingValue(d["FINANZ_TOTALE_PUBBLICO"]);

                fundingLongData.push({
                    Year: year,
                    Region: d["DEN_REGIONE"],
                    Funding: funding,
                    region_norm: normalizeRegionName(d["DEN_REGIONE"])
                });
            }
        });

        const yearlyFundingData = d3.rollups(
            fundingLongData,
            v => d3.sum(v, d => d.Funding),
            d => `${d.region_norm}-${d.Year}`
        );

        const getFunding = (region, year) => {
            const key = `${region}-${year}`;
            const item = yearlyFundingData.find(([k]) => k === key);
            return item ? item[1] : 0;
        };

        const maxFunding = d3.max(fundingLongData.map(d => d.Funding));
        const fundingColorScale = d3.scaleSequential(d3.interpolateYlOrBr).domain([0, maxFunding]);

        // --- Data Processing: Visitors (Time-Aware) ---
        const visitorLongData = [];
        const idCol = visitorCsvData.columns && visitorCsvData.columns.includes('Unnamed: 0') ? 'Unnamed: 0' : '';
        const idKey = idCol || visitorCsvData.columns[0];
        const allowedRegions = [
            'ABRUZZO', 'BASILICATA', 'CALABRIA', 'CAMPANIA', 'EMILIA ROMAGNA',
            'FRIULI-VENEZIA GIULIA', 'LAZIO', 'LIGURIA', 'LOMBARDIA', 'MARCHE',
            'MOLISE', 'PIEMONTE', 'PUGLIA', 'SARDEGNA', 'TOSCANA', 'UMBRIA', 'VENETO'
        ];

        visitorCsvData.forEach(row => {
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
                        visitorLongData.push({
                            Year: year,
                            Region: region,
                            Visitors: visitors,
                            region_norm: normalizeRegionName(region)
                        });
                    }
                });
            }
        });

        const maxVisitors = d3.max(visitorLongData, d => d.Visitors);
        const minRadius = 4, maxRadius = 30;
        const scaleRadius = v => v <= 0 ? 0 : minRadius + Math.sqrt(v / maxVisitors) * (maxRadius - minRadius);

        const yearlyVisitorData = d3.rollups(
            visitorLongData,
            v => d3.sum(v, d => d.Visitors),
            d => `${d.region_norm}-${d.Year}`
        );

        const getVisitors = (region, year) => {
            const key = `${region}-${year}`;
            const item = yearlyVisitorData.find(([k]) => k === key);
            return item ? item[1] : 0;
        };

        // --- Combined Draw Map Function ---
        let geoJsonLayer = null;

        function drawCombinedMap(selectedYear) {
            if (geoJsonLayer) map3.removeLayer(geoJsonLayer);
            map3.eachLayer(layer => {
                if (layer instanceof L.CircleMarker) map3.removeLayer(layer);
            });

            // 1. Draw Funding Choropleth (Polygons)
            geoJsonLayer = L.geoJson(geojsonData, {
                style: feature => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const region = normalizeRegionName(name);
                    const fundingValue = getFunding(region, selectedYear);
                    return {
                        fillColor: fundingColorScale(fundingValue),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const norm = normalizeRegionName(name);
                    const fundingValue = getFunding(norm, selectedYear);
                    const visitorsValue = getVisitors(norm, selectedYear);

                    layer.bindPopup(
                        `<b>${name}</b><br>` +
                        `Year: ${selectedYear}<br>` +
                        `Funding: €${fundingValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}<br>` +
                        `Visitors: ${visitorsValue.toLocaleString()}`
                    );

                    layer.on({
                        mouseover: e => {
                            e.target.setStyle({ weight: 5, color: '#666', dashArray: '', fillOpacity: 0.9 });
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                        },
                        mouseout: e => geoJsonLayer.resetStyle(e.target)
                    });
                }
            }).addTo(map3);

            // 2. Draw Visitor Proportional Symbols (CircleMarkers)
            geojsonData.features.forEach(feature => {
                const props = feature.properties;
                const regionName = props.name || props.reg_name || '';
                const norm = normalizeRegionName(regionName);
                const visitors = getVisitors(norm, selectedYear);

                if (visitors > 0) {
                    const centroid = turf.centroid(feature).geometry.coordinates;

                    L.circleMarker([centroid[1], centroid[0]], {
                        radius: scaleRadius(visitors),
                        color: '#3186cc',
                        fillColor: '#3186cc',
                        fillOpacity: 0.8
                    })
                        .bindPopup(`<b>${regionName}</b><br>Year: ${selectedYear}<br>Visitors: ${visitors.toLocaleString()}`)
                        .addTo(map3);
                }
            });
        }

        // 3. Slider Setup (Using the union of available years)
        const allowedYears = [2016, 2017, 2018, 2019, 2022];
        const allYears = [
            ...fundingLongData.map(d => d.Year),
            ...visitorLongData.map(d => d.Year)
        ];

        const years = Array.from(new Set(allYears))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);

        if (years.length > 0) {
            createYearSliderControl(map3, years, drawCombinedMap);
        } else {
            console.warn("No matching years found for combined map data after filtering.");
        }

    }).catch(err => console.error("Error loading combined data for Map 3:", err));
}

// ================================================================================
// --- 4. STATIC TOTAL FUNDING MAP (Based on Python Folium Logic) on #map4 ---
// ================================================================================
function createMap4_StaticFunding() {
    if (L.DomUtil.get('map4')) {
        if (L.DomUtil.get('map4')._leaflet_id) L.map('map4').remove();
    } else {
        console.error("Map container #map4 not found.");
        return;
    }

    const map4 = L.map('map4').setView([41.87194, 12.56738], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map4);

    Promise.all([
        d3.csv('data/open_coesione.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([csvData, geojsonData]) => {

        const totalRegionFunding = {};

        csvData.forEach(d => {
            const regionNorm = normalizeRegionName(d["DEN_REGIONE"]);
            const funding = parseFundingValue(d["FINANZ_TOTALE_PUBBLICO"]);

            if (regionNorm) {
                totalRegionFunding[regionNorm] = (totalRegionFunding[regionNorm] || 0) + funding;
            }
        });

        let maxFunding = 0;

        // Inject funding data into GeoJSON properties and find max funding
        geojsonData.features.forEach(feature => {
            const props = feature.properties;
            const regionRawName = props.reg_name || props.name || "";
            const regionNorm = normalizeRegionName(regionRawName);
            const funding = totalRegionFunding[regionNorm] || 0;
            feature.properties.funding = funding;

            if (funding > maxFunding) {
                maxFunding = funding;
            }
        });

        // Use D3's color scale (YlOrRd matches the Folium default)
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxFunding]);

        function style(feature) {
            const funding = feature.properties.funding;
            return {
                fillColor: colorScale(funding),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        }

        function highlightFeature(e) {
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
        }

        function resetHighlight(e) {
            geojsonLayer.resetStyle(e.target);
        }

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight
            });

            const formattedFunding = (feature.properties.funding || 0).toLocaleString('it-IT', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });

            layer.bindPopup(`<b>${feature.properties.reg_name || feature.properties.name || 'N/A'}</b><br>Total Funding: ${formattedFunding}`);
        }

        const geojsonLayer = L.geoJson(geojsonData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map4);

        // Add Legend (Simple D3-based approach)
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend'),
                // Define 5 thresholds for the legend based on the color scale domain
                grades = [0, maxFunding / 5, maxFunding * 2 / 5, maxFunding * 3 / 5, maxFunding * 4 / 5];



            for (let i = 0; i < grades.length; i++) {
                const grade = grades[i];
                // Calculate the next grade for the range label
                const nextGrade = grades[i + 1] || maxFunding;

            }
            return div;
        };

        legend.addTo(map4);

    }).catch(err => console.error("Error loading Map 4 data:", err));
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("Running Map 4 isolation test...");

    createFundingMap();
    createVisitorMap();
    createCombinedMap();

    // Run ONLY the static funding map
    createMap4_StaticFunding();

    // If Map 4 appears now, the issue is an unhandled error or data loading failure 
    // in one of the other three map functions.
});