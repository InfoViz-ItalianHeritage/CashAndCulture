// --- Configuration ---
// Use the corrected path structure based on your GitHub Pages setup
const DATA_PATH = "data/mic_visitors.csv";
const YEARS_TO_SHOW = [2016, 2017, 2018, 2019, 2022];
const COLOR_SHADES = ['#08306B', '#08519C', '#2171B5', '#4292C6', '#6BAED6'];
const OTHER_COLOR = "#A0A0A0"; // Gray for "Other Regions"

/**
 * Cleans numerical strings by removing thousands separators and converting to Number (float).
 * Matches Python's .astype(float) for division purposes.
 * @param {string} strValue - The string representation of a number (e.g., "1.379.306").
 * @returns {number} The cleaned number (float/double).
 */
function cleanNumber(strValue) {
    let parsedValue = 0;
    if (typeof strValue === 'string') {
        // Replace all dots (thousands separators in Italian format) with nothing
        parsedValue = parseFloat(strValue.replace(/\./g, ''));
    } else {
        parsedValue = parseFloat(strValue);
    }
    // IMPORTANT: Return as float/Number, matching Python's float conversion before percentage calculation.
    return parsedValue || 0;
}

/**
 * Replicates the complex pandas data processing logic in pure JavaScript and renders the Plotly chart.
 * @param {Array<Object>} rawData - The array of objects loaded from the CSV.
 */
function processDataAndRenderChart(rawData) {

    // --- DIAGNOSTICS: Check Console if chart fails ---
    // Look at the column names here (Raw Data Columns) to find the correct ID column name.
    console.log("Raw Data Columns:", Object.keys(rawData[0] || {}));
    console.log("First 5 Raw Data Rows:", rawData.slice(0, 5));
    // -------------------------------------------------

    // !!! CRITICAL FIX !!!
    // The Python script uses 'Unnamed: 0', but D3.js often assigns an empty string ('') 
    // to the key of an unlabeled first column, which was causing the filter error.
    const ID_COLUMN_NAME = ''; // <--- CORRECTED: Using empty string ('') for the row identifier column key.

    // 1. Initial Filtering (Keep only yearly totals, replicating df['Unnamed: 0'].str.contains('Totale_regione_', na=False) )
    const searchPattern = /Totale_regione_/;
    let filteredData = rawData.filter(row =>
        // Ensure row[ID_COLUMN_NAME] exists before calling String() and trim(). 
        row[ID_COLUMN_NAME] && searchPattern.test(String(row[ID_COLUMN_NAME]).trim())
    );

    if (filteredData.length === 0) {
        console.error(`Data filtering failed. No rows matched the pattern 'Totale_regione_' in the column '${ID_COLUMN_NAME}'. 
                      Please check the console for raw data columns and update the ID_COLUMN_NAME variable.`);
        return;
    }

    // Extract region columns dynamically (excluding known metadata columns)
    let allColumns = Object.keys(filteredData[0]);

    // Find the *exact* column name for 'Totale complessivo' by trimming the key
    const totalColumnName = allColumns.find(col => col && col.trim() === 'Totale complessivo');

    if (!totalColumnName) {
        console.error("Could not find a column named 'Totale complessivo'. Check column headers for extra/invisible characters.");
        return;
    }

    // Filter out the ID column AND the precisely identified total column key
    const regionCols = allColumns.filter(col =>
        col !== ID_COLUMN_NAME && col !== totalColumnName
    );

    // --- DEBUG: Check the exact region columns identified ---
    console.log("Identified Region Columns (should match Python's region_cols):", regionCols);
    console.log("Identified Total Column Name:", totalColumnName);
    // --------------------------------------------------------

    // Prepare processed data structure
    let processedData = filteredData.map(row => {
        let newRow = {};

        // Extract Year (replicating df['Year'] = df['Unnamed: 0'].str.extract...)
        const yearMatch = String(row[ID_COLUMN_NAME]).match(/Totale_regione_(\d{4})/);
        newRow.Year = yearMatch ? parseInt(yearMatch[1], 10) : null;

        // Clean and convert Totale_complessivo using the identified column name
        newRow.TotaleComplessivo = cleanNumber(row[totalColumnName]);

        // Clean and store region values
        regionCols.forEach(col => {
            newRow[col] = cleanNumber(row[col]);
        });

        return newRow;
    }).filter(row => row.Year && YEARS_TO_SHOW.includes(row.Year)); // Filter for selected years

    if (processedData.length === 0) {
        console.error("Data is empty after filtering for years:", YEARS_TO_SHOW);
        return;
    }


    // 2. Convert to percentages and find Top 5 + Others (Pandas logic replication)
    let stackedData = [];
    let allRegionsAcrossYears = new Set();

    processedData.forEach(row => {
        const year = row.Year;
        const total = row.TotaleComplessivo;

        // Create array of {region: name, percentage: value} objects
        let regionMetrics = regionCols.map(region => ({
            region: region,
            rawCount: row[region],
            // Calculate percentage based on high-precision floats
            percentage: total > 0 ? (row[region] / total) * 100 : 0
        }));

        // Sort descending by PERCENTAGE, matching the Python script: regions.sort_values(ascending=False)
        regionMetrics.sort((a, b) => b.percentage - a.percentage);

        let combinedEntry = { Year: year };
        let othersSum = 0;

        // Top 5 (replicating top5 = regions.head(5))
        const top5 = regionMetrics.slice(0, 5);

        top5.forEach(item => {
            combinedEntry[item.region] = item.percentage;
            allRegionsAcrossYears.add(item.region);
        });

        // Others (replicating others = regions.iloc[5:].sum())
        const others = regionMetrics.slice(5);

        others.forEach(item => {
            othersSum += item.percentage;
        });

        // Ensure high precision for the calculated sum before storing (for maximum accuracy)
        combinedEntry['Other Regions'] = parseFloat(othersSum.toFixed(10));
        stackedData.push(combinedEntry);

        // ** DEBUG 2017 & 2022 PERCENTAGE CALCULATION **
        if (year === 2017 || year === 2022) {
            console.log(`--- DEBUG ${year} FINAL PERCENTAGE CALCULATION ---`);
            console.log(`${year} Top 5 Regions (JS, sorted by Percentage):`, top5.map(d => ({ region: d.region, rawCount: d.rawCount, percentage: d.percentage.toFixed(2) + '%' })));
            console.log(`${year} Other Regions Sum (JS):`, combinedEntry['Other Regions'].toFixed(2) + '%');
            console.log("------------------------------------------");
        }
    });

    // 3. Melt for Plotly (Convert wide format to long format)
    let meltedData = [];

    stackedData.forEach(row => {
        const year = row.Year;
        Object.keys(row).forEach(key => {
            if (key !== 'Year') {
                meltedData.push({
                    Year: year,
                    Region: key,
                    Percentage: row[key]
                });
            }
        });
    });

    // 4. Determine Custom Sorting Order

    // a. Calculate total percentage for each region across all years
    let regionTotals = {};
    meltedData.forEach(d => {
        regionTotals[d.Region] = (regionTotals[d.Region] || 0) + d.Percentage;
    });

    // b. Separate 'Other Regions' key from the rest
    const allRegions = Object.keys(regionTotals);
    const primaryRegions = allRegions.filter(r => r !== 'Other Regions');

    // c. Sort primary regions by total percentage (descending)
    // This ensures the highest contributor is the first trace (far left of stack).
    const sortedPrimaryRegions = primaryRegions.sort((a, b) => {
        return regionTotals[b] - regionTotals[a];
    });

    // d. Reconstruct regionOrder: Primary regions first, 'Other Regions' last (far right)
    const regionOrder = sortedPrimaryRegions.concat(['Other Regions']);

    // e. Define Color Map using the final sorted order to maintain consistency
    let colorMap = { "Other Regions": OTHER_COLOR };
    let regionIndex = 0;
    // We use only the actual regions that were part of the Top 5 calculation (excluding 'Other Regions')
    const uniqueRegionsForColor = regionOrder.filter(r => r !== 'Other Regions');

    uniqueRegionsForColor.forEach(region => {
        colorMap[region] = COLOR_SHADES[regionIndex % COLOR_SHADES.length];
        regionIndex++;
    });

    // 5. Plotly Configuration and Rendering

    // The trace order in 'data' is now determined by the percentage-based 'regionOrder' array,
    // with 'Other Regions' guaranteed to be last (far right).
    let data = regionOrder.map(region => {
        const filtered = meltedData.filter(d => d.Region === region);
        // Ensure data is sorted by year to align traces correctly
        filtered.sort((a, b) => a.Year - b.Year);

        return {
            x: filtered.map(d => d.Percentage),
            y: filtered.map(d => d.Year),
            name: region,
            orientation: 'h',
            type: 'bar',
            hovertemplate: `%{y}: %{x:.1f}%<extra>${region}</extra>`,
            // Text template matching the Python script fig.update_traces
            text: filtered.map(d => `${d.Percentage.toFixed(1)}%`),
            textposition: 'inside',
            insidetextanchor: 'start',
            marker: {
                color: colorMap[region]
            }
        };
    });

    let layout = {
        barmode: 'stack',
        title: 'Fig.7: Top 5 Regions + Others: Yearly Visitor Distribution (2016–2019, 2022)',
        xaxis: {
            title: "Percentage of Total Visitors",
            automargin: true,
            tickformat: ',.0f%',
            range: [0, 100] // Ensure x-axis goes to 100%
        },
        yaxis: {
            title: "Year",
            tickmode: 'array',
            tickvals: YEARS_TO_SHOW,
            ticktext: YEARS_TO_SHOW.map(String)
        },
        legend: {
            title: { text: "Regions" }
        },
        template: "plotly_white",
        // REMOVED height: 600, to let parent CSS control height
        margin: { l: 80, r: 20, t: 80, b: 60 }
    };

    // Added config to ensure responsiveness, allowing parent CSS to control size
    Plotly.newPlot('chart2', data, layout, { responsive: true, displayModeBar: false });
}

// Use d3.csv to load and parse the data
d3.csv(DATA_PATH)
    .then(processDataAndRenderChart)
    .catch(error => {
        // Display a user-friendly error if data loading fails (e.g., 404)
        const errorDiv = document.getElementById('chart2');
        if (errorDiv) {
            // REMOVED all styling from the error div to comply with the request
            errorDiv.innerHTML = `<div>
                <h2>Error Loading Data (404)</h2>
                <p>The chart could not load data from: <code>${DATA_PATH}</code></p>
                <p>Please ensure the file <code>mic_visitors.csv</code> exists in the <code>/data/</code> folder 
                and is correctly published on GitHub Pages with the <code>/CashAndCulture/</code> prefix.</p>
            </div>`;
        }
        console.error("Data loading failed:", error);
    });
