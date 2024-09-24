// Replace with your ThingSpeak channel ID and API key (if private)
const channelID = '2653968';
const apiKey = '2OXX36HTLS8A0NQG'; // Leave empty if the channel is public

// API URL to fetch data
const url = `https://api.thingspeak.com/channels/${channelID}/feeds.json?${apiKey ? 'api_key=' + apiKey + '&' : ''}results=8000`; // Increase results limit if needed

// Variables to store fetched data
let pathData = [];

// Function to fetch data from ThingSpeak
function fetchData() {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Extract data from ThingSpeak JSON response
            const feeds = data.feeds;
            pathData = feeds.map(feed => ({
                timestamp: new Date(feed.created_at),
                x: +feed.field3, // Replace with your actual field number for X
                y: +feed.field4, // Replace with your actual field number for Y
                z: +feed.field5, // Replace with your actual field number for Z
                temperature: +feed.field1, // Add temperature from field 1
                humidity: +feed.field2, // Add humidity from field 2
                pulseRate: +feed.field8 // Add pulse rate from field 8
            }));

            pathData.sort((a, b) => a.timestamp - b.timestamp); // Sort data by timestamp
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Function to filter data based on selected date
function filterDataByDate(selectedDate) {
    const filteredData = pathData.filter(point => {
        // Compare only the date part (ignoring time)
        return point.timestamp.toISOString().split('T')[0] === selectedDate;
    });
    return filteredData;
}

// Function to animate the path using Plotly
function animatePath(data) {
    const x = data.map(point => point.x);
    const y = data.map(point => point.y);
    const z = data.map(point => point.z);
    const timestamps = data.map(point => point.timestamp.toISOString());
    const hoverText = data.map(point =>
        `x: ${point.x.toFixed(2)} <br> 
        y: ${point.y.toFixed(2)} <br>
        z: ${point.z.toFixed(2)} <br>
        Time: ${point.timestamp.toISOString()} <br> 
        Temperature: ${point.temperature} °C<br>
        Humidity: ${point.humidity} %<br>
        Pulse Rate: ${point.pulseRate} bpm`
    );

    const tracePath = {
        x: [],
        y: [],
        z: [],
        mode: 'lines+markers',
        marker: {
            size: 4,
            color: z,
            colorscale: 'Viridis',
            colorbar: {
                title: 'Z Value'
            }
        },
        line: {
            color: 'rgb(44, 160, 44)',
            width: 2
        },
        type: 'scatter3d',
        text: [], // Initialize with empty array for hover text
        hoverinfo: 'text'
    };

    const traceCurrent = {
        x: [x[0]],
        y: [y[0]],
        z: [z[0]],
        mode: 'markers',
        marker: {
            size: 8,
            color: '#2E8B57'
        },
        type: 'scatter3d',
        name: 'Current Position',
        text: [hoverText[0]], // Add initial hover text for current position
        hoverinfo: 'text'
    };

    const layout = {
        title: {
            text: 'Path Traced by Device',
            font: {
                family: 'Arial, sans-serif',
                size: 24,
                color: '#2E8B57',
                weight: 'bold'
            }
        },
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' }
        },
        showlegend: false,
        margin: { t: 50, l: 0, r: 0, b: 0 },
        updatemenus: [] // Remove default button from Plotly
    };

    const frames = data.map((point, index) => ({
        name: index,
        data: [
            {
                x: data.slice(0, index + 1).map(p => p.x),
                y: data.slice(0, index + 1).map(p => p.y),
                z: data.slice(0, index + 1).map(p => p.z),
                text: hoverText.slice(0, index + 1) // Add hover text for each frame
            },
            {
                x: [point.x],
                y: [point.y],
                z: [point.z],
                text: [hoverText[index]] // Add hover text for current point
            }
        ]
    }));

    Plotly.newPlot('plot', [tracePath, traceCurrent], layout).then(() => {
        Plotly.addFrames('plot', frames);
    });

    // Play button event listener
    document.querySelector('.play-button').addEventListener('click', function () {
        Plotly.animate('plot', null, {
            mode: 'immediate',
            frame: { redraw: true, duration: 1000 },
            transition: { duration: 100 }
        });
    });
}

function resetPlot() {
    // Get the plot div
    const plotDiv = document.getElementById('plot');
    
    // Clear the plot
    Plotly.purge(plotDiv);

    // Reset the date selection input
    document.getElementById('date-select').value = '';

    console.log('Plot reset and date selection cleared.');
}

// Event listener for filter button
document.getElementById('filter-btn').addEventListener('click', function () {
    const selectedDate = document.getElementById('date-select').value;
    if (selectedDate) {
        const filteredData = filterDataByDate(selectedDate);
        if (filteredData.length > 0) {
            animatePath(filteredData); // Animate the filtered data
        } else {
            console.warn('No data available for the selected date.');
        }
    } else {
        console.warn('Please select a date.');
    }
});

// Event listener for the reset button
document.querySelector('.reset-button').addEventListener('click', resetPlot);

// Fetch and store initial data
fetchData();