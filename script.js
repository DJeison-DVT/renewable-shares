// The svg
const svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

// Map and projection
const path = d3.geoPath();
const projection = d3.geoMercator()
    .scale(100)
    .center([0, 20])
    .translate([width / 2, height / 2]);

// Data and color scale
let data = new Map();
let csvData; // Variable to store the loaded CSV data
const colorScale = d3.scaleThreshold()
    .domain([0, 10, 20, 30, 40, 50, 60, 70])
    .range(d3.schemeBuGn[8]);

// Create a tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");


// Slider setup
const slider = d3.select("#yearSlider");
const selectedYearLabel = d3.select("#selectedYear");

let isPlaying = false;
let intervalId;

// Get the Play/Pause button and slider elements
const playPauseButton = d3.select("#playPauseButton");
const sliderElement = document.getElementById("yearSlider");

// Update the button text based on play/pause state
playPauseButton.on("click", function () {
    const maxYear = +slider.property("max");
    const minYear = +slider.property("min");
    let currentValue = +slider.property("value");

    if (isPlaying) {
        clearInterval(intervalId);
        playPauseButton.text("Play");
        sliderElement.disabled = false;
    } else {
        // If slider is at max value (2023), reset it to the start year (1965)
        if (currentValue === maxYear) {
            slider.property("value", minYear).dispatch("input");
        }

        playPauseButton.text("Pause");
        sliderElement.disabled = true;

        // Start an interval to automatically move the slider
        intervalId = setInterval(() => {
            currentValue = +slider.property("value");

            if (currentValue < maxYear) {
                slider.property("value", currentValue + 1).dispatch("input");
            } else {
                clearInterval(intervalId);
                playPauseButton.text("Play");
                sliderElement.disabled = false;
                isPlaying = false;
            }
        }, 1000); // Interval duration 
    }

    isPlaying = !isPlaying; // Toggle the play/pause state
});


// Update the selected year label
slider.on("input", function () {
    selectedYearLabel.text(this.value);
    updateMap(this.value);
});

function updateMap(selectedYear) {
    data.clear();

    csvData.forEach(d => {
        if (d.Year === selectedYear) {
            data.set(d.Code, +d["Renewables (% equivalent primary energy)"]);
        }
    });


    svg.selectAll("path")
        .transition()
        .duration(300)
        .attr("fill", function (d) {
            d.total = data.get(d.id) || 0;
            return d.total === 0 ? "url(#diagonalHatch)" : colorScale(d.total);
        });
}

// Load GeoJSON data and CSV data once and set up the map
let topo;
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("renewable-share-energy.csv")
]).then(function (loadData) {
    topo = loadData[0];
    csvData = loadData[1]; // Store the CSV data for later use

    // Draw the initial map
    svg.append("g")
        .selectAll("path")
        .data(topo.features)
        .join("path")
        // draw each country
        .attr("d", d3.geoPath().projection(projection))
        // Set initial color
        .attr("fill", function (d) {
            d.total = data.get(d.id) || 0;
            return colorScale(d.total);
        })
        // Add events for tooltip
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(d.properties.name + "<br>" + "Renewables: " + (d.total ? d.total.toFixed(2) + "%" : "No data"))
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 15) + "px");
            d3.select(this).style("stroke", "black");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition().duration(200).style("opacity", 0);
            d3.select(this).style("stroke", "none");
        });

    updateMap(slider.property("value"));
});
