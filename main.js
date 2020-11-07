/**
d3.json("./highest-grossing-per-region.json").then((raw) => {
  let dataset = Object.keys(raw).reduce((accumulator, currentVal) => {
    let regions = [];
    Object.keys(raw[currentVal]).forEach((x) => {
      regions.push({ region: x, data: raw[currentVal][x] });
    });
    accumulator.push({ year: +[currentVal], regions });
    return accumulator;
  }, []);
  let nested = d3
    .nest()
    .key((x) => x.year)
    .entries(dataset);
  console.log(nested);

  // ********************************************************************* //
  // ******************************* SLIDER ****************************** //
  // ********************************************************************* //
  var slider = d3
    .sliderHorizontal()
    .min(d3.min(dataset, (y) => y.year))
    .max(d3.max(dataset, (y) => y.year))
    .step(1)
    .width(300)
    .displayValue(true)
    .on("onchange", (val) => {
      d3.select("#value").text(val);
      d3.select("#result")
        .selectAll("div")
        .data(
          nested
            .filter((x) => +[x.key] === val)
            .map((x) => {
              console.log(x.values[0]);
              return x;
            })
        )
        .enter()
        .append("div")
        .text((el, i) => {
          return JSON.stringify(el.values);
        });
    });

  d3.select("#slider")
    .append("svg")
    .attr("width", 500)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(slider);

  // ********************************************************************* //
  // ******************************* CHART ******************************* //
  // ********************************************************************* //
  var svg = d3.select("svg");
});
 */
let width =
  window.innerWidth > window.innerHeight
    ? window.innerHeight
    : window.innerWidth;
let height = width;
let color = d3
  .scaleLinear()
  .domain([0, 5])
  .range([
    "hsl(224,56%,16%)",
    "white",
    "hsl(186,59%,60%)",
    "hsl(218,92%,69%)",
    "hsl(237,100%,77%)",
  ]);
let circleColors = [
  "hsl(224,56%,16%)",
  "white",
  "hsl(186,59%,60%)",
  "hsl(218,92%,69%)",
  "hsl(237,100%,77%)",
];
let circleFontSizes = [64, 24, 13];
// .interpolate(d3.interpolateHcl);

let games;
let currFocus;
let view;
let zoomDuration = 750;

const svg = d3
  .select("svg")
  .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
  .style("background", color(0))
  .style("cursor", "pointer");

d3.csv("./circle_pack.csv").then((data) => {
  games = data;
  updateChart();
});

let layers = [REGION, GENRE, PLATFORM];
let shuffleArray = () => {
  for (let i = layers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [layers[i], layers[j]] = [layers[j], layers[i]];
  }

  // right now only changing the order of the layers require exit
  zoomTo(currFocus);
  const currentNodes = svg.selectAll("g").filter(function (d) {
    return d.parent === currFocus || this.style.display === "inline";
  });
  currentNodes
    .select("circle")
    .transition()
    .duration(750)
    .attr("r", 0)
    .attr("fill-opacity", 0);
  currentNodes
    .select("circle.nucleus")
    .transition()
    .duration(750)
    .attr("r", 0)
    .attr("fill-opacity", 0);
  currentNodes
    .select("text")
    .transition()
    .duration(750)
    .attr("fill-opacity", 0);

  svg.selectAll("g").transition().delay(750).remove();
  updateChart();
};

let updateChart = () => {
  let filteredGames = games.filter((e) => e[SALES] > 0.0 && +e[YEAR] == 2001);
  // TODO: add ranking and only display high ranked games
  let dataByRegion = d3
    .nest()
    .key((d) => d[layers[0]])
    .key((d) => d[layers[1]])
    .key((d) => d[layers[2]])
    .entries(filteredGames);

  let root = {
    key: layers[0],
    values: dataByRegion,
  };
  let cPack = pack(root);
  currFocus = cPack;

  svg.on("click", () => zoom(cPack));

  const nodeUpdate = svg
    .selectAll("g")
    .data(cPack.descendants(), (d) => d.data["key"] | d.data[GAME])
    .attr("pointer-events", (d) => (!d.children ? "none" : null)); // no children, no click

  const nodeEnter = nodeUpdate
    .enter()
    .append("g")
    .style("display", (d) => (d.parent === cPack ? "inline" : "none"));

  // create circle
  const circle = nodeEnter
    .append("circle")
    .attr("fill", (d) => circleColors[d.depth])
    .attr("fill-opacity", 0)
    .attr("stroke", (d) => circleColors[d.depth])
    .attr("stroke-width", "1px")
    .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0))
    .attr("depth", (d) => d.depth);
  // transition in
  circle
    .filter((d) => d.parent === cPack)
    .transition(750)
    .delay(1000)
    .attr("r", (d) => d.r)
    .attr("fill-opacity", (d) => (d.parent === cPack ? 0.5 : 0));

  // create nucleus
  const nucleus = nodeEnter
    .append("circle")
    .attr("class", "nucleus")
    .attr("fill", (d) => circleColors[d.depth])
    .attr("fill-opacity", 0)
    .attr("depth", (d) => d.depth)
    .attr("pointer-events", "none")
    .attr("r", 15);
  // transition in
  nucleus
    .filter((d) => d.parent === cPack)
    .transition(750)
    .delay(1000)
    .attr("fill-opacity", (d) => (d.parent === cPack ? 1 : 0));

  // create label
  const label = nodeEnter
    .append("text")
    .attr("fill", (d) => circleColors[d.depth])
    .attr("dx", 22)
    .text((d) => d.data["key"] || d.data[GAME])
    .attr("fill-opacity", 0);
  // transition
  label
    .filter((d) => d.parent === cPack)
    .transition(750)
    .delay(1000)
    .attr("fill-opacity", (d) => (d.parent === cPack ? 1 : 0));
  label.on("mousedown", () => false);

  // const nodeExit = svg.selectAll("g").exit().transition(250).remove();
  // nodeExit
  //   .select("circle")
  //   .attr("r", 0)
  //   .attr("display", (d) => (d.parent === cPack ? "inline" : "none"));
  // nodeExit.select("text").attr;

  // ********************************************************************* //
  // **************************** MOUSE EVENTS *************************** //
  // ********************************************************************* //
  const node = nodeUpdate
    .merge(nodeEnter)
    .on("mouseover", function (d) {
      const filtered = node.filter((e) => e !== d && e.parent === d.parent);
      filtered.select("circle").transition(250).attr("fill-opacity", 0.2);
      filtered
        .select("circle.nucleus")
        .transition(250)
        .attr("fill-opacity", 0.2);
      filtered.select("text").transition(250).attr("fill-opacity", 0.2);
    })
    .on("mouseout", (d) => {
      const filtered = node.filter((e) => e !== d && e.parent === d.parent);
      filtered.select("circle").transition(250).attr("fill-opacity", 0.5);
      filtered.select("circle.nucleus").transition(250).attr("fill-opacity", 1);
      filtered.select("text").transition(250).attr("fill-opacity", 1);
    })
    .on("click", (d, i) => {
      if (currFocus === d) {
        zoom(d.parent), d3.event.stopPropagation();
      } else {
        zoom(d), d3.event.stopPropagation();
      }
    });

  zoomTo([cPack.x, cPack.y, cPack.r * 2]);
};

// ********************************************************************* //
// ***************************** FUNCTIONS ***************************** //
// ********************************************************************* //
let animate = () => {
  // update animation
  const node = svg
    .selectAll("g")
    .transition(zoomDuration)
    .on("start", function (d) {
      if (d === currFocus || d.parent === currFocus)
        this.style.display = "inline";
      else this.style.display = "none";
    })
    .on("end", function (d) {
      if (d !== currFocus && d.parent !== currFocus)
        this.style.display = "none";
      else this.style.display = "inline";
    });

  node
    .select("circle")
    .transition(zoomDuration)
    .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0))
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 0.5 : 0))
    // make the outer circle display properly
    .on("start", function (d) {
      if (d === currFocus || d.parent === currFocus)
        this.style.display = "inline";
    })
    .on("end", function (d) {
      if (d !== currFocus && d.parent !== currFocus)
        this.style.display = "none";
    });

  node
    .select("circle.nucleus")
    .transition(zoomDuration)
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0));

  node
    .select("text")
    .transition(zoomDuration)
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0));
};

let zoomTo = (v) => {
  const k = width / v[2];

  view = v;

  const node = svg
    .selectAll("g")
    .filter(function (d) {
      return d.parent === currFocus || this.style.display === "inline";
    })
    .attr("transform", (d) => {
      return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
    });
  node.select("circle").attr("r", (d) => d.r * k);
};

let zoom = (d) => {
  // change focus to new node
  currFocus = d;

  // zoom
  const transition = svg
    .transition()
    .duration(zoomDuration)
    .tween("zoom", () => {
      // view is the starting point, current focus is the next point
      const i = d3.interpolateZoom(view, [
        currFocus.x,
        currFocus.y,
        currFocus.r * 2,
      ]);
      return (t) => zoomTo(i(t));
    });

  animate();
};

// circle packing function
let pack = (data) => {
  return d3
    .pack()
    .size([width - 2, height - 2])
    .padding(3)(
    d3
      .hierarchy(data, (d) => {
        // change children accessor
        return d["values"];
      })
      .sum((d) => d[SALES])
      .sort((a, b) => b[SALES] - a[SALES])
  );
};
