// --- STATE AND CONFIGURATION ---
let currentScene = 1;
const totalScenes = 3;
let data = [];

// --- NARRATIVE CONTENT ---
const narratives = {
    1: "This chart shows global annual temperature changes from 1880 to today, measured as deviations (anomalies) from a 1951-1980 baseline. Early years show fluctuations, but a clear long-term warming trend is visible.",
    2: "Let's focus on the period from 1970 onwards. The rate of temperature increase sharpens dramatically in this modern era, indicating an acceleration in global warming.",
    3: "The last decade contains the hottest years ever recorded. These points, highlighted in red, starkly illustrate the unprecedented heat extremes we are now experiencing."
};

// --- D3 SETUP ---
const margin = { top: 40, right: 30, bottom: 60, left: 60 };
const width = 960 - margin.left - margin.right;
const aheight = 500 - margin.top - margin.bottom;

const svg = d3.select("#visualization")
    .attr("width", width + margin.left + margin.right)
    .attr("height", aheight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

// Scales
const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([aheight, 0]);

// Axes
const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y"));
const yAxis = d3.axisLeft(yScale);

const xAxisGroup = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${aheight})`);

const yAxisGroup = svg.append("g")
    .attr("class", "y-axis");

// Axis Labels
svg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", aheight + margin.bottom - 10)
    .text("Year");

svg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -aheight / 2)
    .text("Temperature Anomaly (°C)");
    
const zeroLine = svg.append("line").attr("class", "zero-line");
const path = svg.append("path").attr("class", "line");
const dotsGroup = svg.append("g");
const annotationGroup = svg.append("g").attr("class", "annotation-group");

// --- DATA LOADING ---
d3.csv("GLB.Ts+dSST.csv") 
    .then(
        rawText => {
        const lines = rawText.split('\n');
        const csvText = lines.slice(1).join('\n');
        const loadedData = d3.csvParse(csvText);
        data = loadedData.map(d => {
            const year = d3.timeParse("%Y")(d.Year);
            const anomaly = +d['J-D'];
            if (year && !isNaN(anomaly)) {
                return { Year: year, Anomaly: anomaly };
            }
            return null;
        }).filter(d => d !== null);

        xScale.domain(d3.extent(data, d => d.Year));
        const yMax = d3.max(data, d => Math.abs(d.Anomaly));
        yScale.domain([-yMax, yMax]).nice();

        xAxisGroup.call(xAxis);
        yAxisGroup.call(yAxis);
        
        zeroLine
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0));
            
        drawScene(currentScene);
    })
    .catch(error => {
        console.error("Error loading the data:", error);
        document.getElementById('narrative-text').innerText = "Failed to load visualization data. Please check the browser console for details.";
    });

// --- SCENE RENDERING LOGIC ---
function drawScene(sceneNumber) {
    document.getElementById('narrative-text').innerText = narratives[sceneNumber];
    document.getElementById('scene-indicator').innerText = `Scene ${sceneNumber} of ${totalScenes}`;

    d3.select("#prev-button").property("disabled", sceneNumber === 1);
    d3.select("#next-button").property("disabled", sceneNumber === totalScenes);

    let sceneData = data;
    if (sceneNumber === 2) {
        sceneData = data.filter(d => d.Year.getFullYear() >= 1970);
    }
    
    path.datum(sceneData)
        .transition().duration(1000)
        .attr("d", d3.line().x(d => xScale(d.Year)).y(d => yScale(d.Anomaly)));

    const dots = dotsGroup.selectAll(".dot")
        .data(data, d => d.Year);

    dots.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.Year))
        .attr("cy", d => yScale(d.Anomaly))
        .attr("r", 0)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                   .html(`Year: ${d.Year.getFullYear()}<br>Anomaly: ${d.Anomaly.toFixed(2)}°C`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .merge(dots)
        .transition().duration(1000)
        .attr("r", 4)
        .attr("class", d => {
            if (sceneNumber === 3) {
                const sortedData = [...data].sort((a, b) => b.Anomaly - a.Anomaly);
                const top10Years = sortedData.slice(0, 10).map(y => y.Year.getFullYear());
                return top10Years.includes(d.Year.getFullYear()) ? "dot highlighted" : "dot faded";
            }
            if (sceneNumber === 2 && d.Year.getFullYear() < 1970) {
                 return "dot faded";
            }
            return "dot";
        });
        
    annotationGroup.selectAll("*").remove();

    let annotations;
    if (sceneNumber === 1) {
        annotations = [{
            note: { label: "A clear warming trend is visible over the long term.", title: "Long-Term Trend" },
            x: xScale(d3.timeParse("%Y")("1940")), y: yScale(-0.1), dy: -50, dx: 50
        }];
    } else if (sceneNumber === 2) {
        annotations = [{
            note: { label: "From 1970 onwards, the rate of warming accelerates significantly.", title: "The Acceleration" },
            x: xScale(d3.timeParse("%Y")("1995")), y: yScale(0.4), dy: 50, dx: -50
        }];
    } else if (sceneNumber === 3) {
        const latestYear = data[data.length - 1];
        annotations = [{
            note: { label: "The most recent years are consistently the warmest on record.", title: "Record Heat" },
            subject: { radius: 60, radiusPadding: 5 },
            x: xScale(latestYear.Year), y: yScale(latestYear.Anomaly), dy: -50, dx: -50
        }];
    }
    
    const makeAnnotations = d3.annotation().type(d3.annotationCallout).annotations(annotations);
    annotationGroup.call(makeAnnotations);
}

// --- EVENT LISTENERS (TRIGGERS) ---
d3.select("#next-button").on("click", () => {
    if (currentScene < totalScenes) {
        currentScene++;
        drawScene(currentScene);
    }
});

d3.select("#prev-button").on("click", () => {
    if (currentScene > 1) {
        currentScene--;
        drawScene(currentScene);
    }
});