// Replace with your ThingSpeak channel ID and API key (if private)
const channelID = '2653968';
const apiKey = '2OXX36HTLS8A0NQG'; // Leave empty if the channel is public

// API URL to fetch data
const url = `https://api.thingspeak.com/channels/${channelID}/feeds.json?${apiKey ? 'api_key=' + apiKey + '&' : ''}results=8000`; // Increase results limit if needed

// Variables to store fetched data and ideal path data
let pathData = [];
let idealPathData = [];
let idealPathTrace = null;
// Function to fetch data from ThingSpeak
function fetchData() {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Extract data from ThingSpeak JSON response
            const feeds = data.feeds;
            pathData = feeds.map(feed => ({
                timestamp: convertToIST(new Date(feed.created_at)), // Convert to IST
                x: +feed.field3,
                y: +feed.field4,
                z: +feed.field5,
                temperature: +feed.field1,
                humidity: +feed.field2,
                pulseRate: +feed.field8
            }));

            pathData.sort((a, b) => a.timestamp - b.timestamp); // Sort data by timestamp
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Function to parse CSV file and plot ideal path
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            console.log("csvData");
            parseCSVData(csvData);
        };
        reader.readAsText(file);
    }
}
// Function to convert UTC to IST
// Function to convert UTC to IST
// Function to convert UTC to IST
function convertToIST(date) {
    return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}
const testDate = new Date("2024-09-24T13:13:41+00:00");
const istDate = convertToIST(testDate);
console.log(istDate.toLocaleString()); // 
// ... existing code ...

function parseCSVData(csvData) {
    const rows = csvData.split('\n').filter(row => row.trim() !== '');
    idealPathData = [];
    let errorRows = [];

    rows.forEach((row, index) => {
        const [timestamp, x, y, z] = row.split(',').map(item => item.trim());
        try {
            const date = new Date(timestamp); // Use the full ISO string
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            idealPathData.push({
                timestamp: convertToIST(date), // Convert to IST
                x: parseFloat(x) || 0,
                y: parseFloat(y) || 0,
                z: parseFloat(z) || 0
            });
        } catch (error) {
            console.error(`Error in row ${index + 1}: ${row}`, error);
            errorRows.push(index + 1);
        }
    });

    if (errorRows.length > 0) {
        alert(`Warning: Invalid data in rows ${errorRows.join(', ')}. These rows will be skipped.`);
    }

    if (idealPathData.length > 0) {
        plotIdealPath();
    } else {
        alert('No valid data found in the CSV file. Please check the format and try again.');
    }
}

// ... existing code ...
// Function to plot ideal path
function plotIdealPath() {
    const x = idealPathData.map(point => point.x);
    const y = idealPathData.map(point => point.y);
    const z = idealPathData.map(point => point.z);
    const timestamps = idealPathData.map(point => point.timestamp.toISOString());

    idealPathTrace = {
        x: x,
        y: y,
        z: z,
        text: timestamps.map(ts => convertToIST(new Date(ts)).toLocaleString()), // Convert to IST for display
        mode: 'lines+markers',
        marker: {
            size: 4,
            color: 'blue'
        },
        line: {
            color: 'blue',
            width: 2
        },
        type: 'scatter3d',
        name: 'Ideal Path'
    };

    Plotly.newPlot('plot', [idealPathTrace], {
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' }
        },
        title: 'Ideal Path'
    });
}

function plotFilteredData(data) {
    const x = data.map(point => point.x);
    const y = data.map(point => point.y);
    const z = data.map(point => point.z);
    const hoverText = data.map(point =>
        `x: ${point.x.toFixed(2)} <br> 
        y: ${point.y.toFixed(2)} <br>
        z: ${point.z.toFixed(2)} <br>
        Time: ${convertToIST(point.timestamp).toLocaleString()} 
        Temperature: ${point.temperature} °C<br>
        Humidity: ${point.humidity} %<br>
        Pulse Rate: ${point.pulseRate} bpm`
    );

    const actualPathTrace = {
        x: x,
        y: y,
        z: z,
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
        text: hoverText,
        hoverinfo: 'text',
        name: 'Actual Path'
    };

    const traces = idealPathTrace ? [idealPathTrace, actualPathTrace] : [actualPathTrace];

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
        showlegend: true,
        legend: {
            x: 0.7,  // Adjust this value to move the legend horizontally (0 to 1)
            y: 0.9,  // Adjust this value to move the legend vertically (0 to 1)
            bgcolor: 'rgba(255, 255, 255, 0.5)',  // Semi-transparent white background
            bordercolor: '#444',
            borderwidth: 1
        },
        margin: { t: 50, l: 0, r: 0, b: 0 }
    };

    Plotly.newPlot('plot', traces, layout);
}

function animatePath(data) {
    const frames = data.map((point, index) => ({
        name: index,
        data: [{
            x: data.slice(0, index + 1).map(p => p.x),
            y: data.slice(0, index + 1).map(p => p.y),
            z: data.slice(0, index + 1).map(p => p.z)
        }]
    }));

    // Add the ideal path to each frame
    if (idealPathTrace) {
        frames.forEach(frame => {
            frame.data.unshift(idealPathTrace);
        });
    }

    Plotly.addFrames('plot', frames);

    Plotly.animate('plot', frames, {
        mode: 'immediate',
        frame: { redraw: true, duration: 1000 },
        transition: { duration: 100 }
    });
}

function resetPlot() {
    const plotDiv = document.getElementById('plot');
    Plotly.purge(plotDiv);
    document.getElementById('date-select').value = '';
    document.getElementById('start-time').value = '';
    document.getElementById('end-time').value = '';
    idealPathTrace = null;
    pathData = []; // Reset pathData
    idealPathData = []; // Reset idealPathData
    document.getElementById('csv-input').value = ''; // Reset CSV input
    console.log('Plot reset and date/time selection cleared.');
}
let filteredData = []; 
function filterDataByDateTime() {
    const selectedDate = document.getElementById('date-select').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;

    if (selectedDate && startTime && endTime) {
        // Create Date objects for start and end times in IST
        const startDateTimeIST = new Date(`${selectedDate}T${startTime}:00`);
        const endDateTimeIST = new Date(`${selectedDate}T${endTime}:00`);

        // Convert IST to UTC by subtracting 5 hours and 30 minutes
        const startDateTimeUTC = new Date(startDateTimeIST.getTime() - (5.5 * 60 * 60 * 1000));
        const endDateTimeUTC = new Date(endDateTimeIST.getTime() - (5.5 * 60 * 60 * 1000));

        console.log('Selected Date:', selectedDate);
        console.log('Start Time (IST):', startTime);
        console.log('End Time (IST):', endTime);
        console.log('Start DateTime (UTC):',   startDateTimeUTC);
        console.log('End DateTime (UTC):', endDateTimeUTC);
        
        filteredData = pathData.filter(point => {
            const pointTimeIST = point.timestamp; // Use the timestamp directly
         //   console.log('Point Time (IST):', pointTimeIST);
            return pointTimeIST >= startDateTimeIST && pointTimeIST <= endDateTimeIST; // Compare directly in IST
        });

        if (filteredData.length > 0) {
            console.log('Filtered Data:', filteredData);
            plotFilteredData(filteredData); // Plot the filtered data without animation
        } else {
            alert('No data available for the selected date and time range.'); // Alert for no data
            console.warn('No data available for the selected date and time range.');
        }
    } else {
        alert('Please select a time range.'); // Alert for missing selection
        console.warn('Please select a time range.');
    }
}
// Event listeners for date and time inputs
document.getElementById('date-select').addEventListener('change', filterDataByDateTime);
document.getElementById('start-time').addEventListener('change', filterDataByDateTime);
document.getElementById('end-time').addEventListener('change', filterDataByDateTime);





// Event listener for the reset button
document.querySelector('.reset-button').addEventListener('click', resetPlot);

// Event listener for CSV file input
document.getElementById('csv-input').addEventListener('change', handleCSVUpload);

// Event listener for play button
document.querySelector('.play-button').addEventListener('click', function () {
    if (filteredData.length > 0) {
        animatePath(filteredData);
    } else {
        console.warn('No filtered data available. Please select a date and time range first.');
    }
});

// Fetch and store initial data
fetchData();