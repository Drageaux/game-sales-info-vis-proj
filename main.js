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

d3.csv("./circle_pack.csv").then((data) => {
  games = data;
  updateChart();
});

let layers = ["Region", "Genre", "Platform"];
let shuffleArray = () => {
  for (let i = layers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [layers[i], layers[j]] = [layers[j], layers[i]];
  }
  updateChart();
};

let updateChart = () => {
  let bigGamesOnly = games.filter((e) => e["Sales (million)"] > 5);
  console.log(bigGamesOnly.length, games.length);
  let dataByRegion = d3
    .nest()
    .key((d) => d[layers[0]])
    .key((d) => d[layers[1]])
    .key((d) => d[layers[2]])
    .entries(bigGamesOnly);

  let root = {
    key: "Regions",
    values: dataByRegion,
  };
  const cPack = pack(root);
  currFocus = cPack;
  console.log(cPack);

  const svg = d3
    .select("svg")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .style("background", color(0))
    .style("cursor", "pointer")
    .on("click", () => zoom(cPack));

  console.log("cPack.descendants().slice(1)", cPack.descendants().slice(1));
  console.log("cPack.descendants()", cPack.descendants());
  const node = svg
    .append("g")
    .selectAll("circle")
    .data(cPack.descendants().slice(1))
    .join("circle") // if the joining selection isn't empty, run another iteration
    .attr("r", (d) => d.r)
    .attr("fill", circleColors[0])
    .attr("fill-opacity", "1")
    .attr("stroke", (d) => circleColors[d.depth])
    .attr("stroke-width", "1px")
    .attr("stroke-opacity", (d) => (d.parent === cPack ? 1 : 0))
    .attr("depth", (d) => d.depth)
    .attr("pointer-events", (d) => (!d.children ? "none" : null)) // no children, no click
    .style("display", (d) => (d.parent === cPack ? "inline" : "none")); // prevent mouseover and mousedown on invisible circles

  node
    .exit()
    .transition()
    .duration(750)
    .attr("r", function (d) {
      return 0;
    })
    .remove();
  console.log("node", node);
  console.log("node exit", node.exit());

  node
    .on("mousedown", function () {})
    .on(
      // if clicked the currently focused node, zoom all the way out(?)
      "click",
      (d, i) => {
        if (currFocus === d) {
          zoom(d.parent), d3.event.stopPropagation();
        } else {
          zoom(d), d3.event.stopPropagation();
        }
      }
    );

  const label = svg
    .append("g")
    .style("font", "24px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(cPack.descendants(), (d) => d.data["key"] || d.data["Game"])
    .join("text")
    .style("fill", (d) => circleColors[d.depth])
    .style("fill-opacity", (d) =>
      d.parent === cPack ? circleColors[d.depth] : 0
    )
    .style("display", (d) => (d.parent === cPack ? "inline" : "none"))
    .text((d) => d.data["key"] || d.data["Game"]);

  label.on("mousedown", () => false);

  let zoomTo = (v) => {
    const k = width / v[2];

    view = v;

    label.attr("transform", (d) => {
      return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
    });
    node.attr("transform", (d) => {
      return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
    });
    node.attr("r", (d) => d.r * k);
  };

  let zoom = (d) => {
    currFocus = d;

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

    node
      .transition(transition)
      .attr("stroke-opacity", (d) =>
        d === currFocus || d.parent === currFocus ? 1 : 0
      )
      .on("start", function (d) {
        if (d === currFocus || d.parent === currFocus)
          this.style.display = "inline";
      })
      .on("end", function (d) {
        if (d !== currFocus && d.parent !== currFocus)
          this.style.display = "none";
      });

    label
      .filter(function (d) {
        return d.parent === currFocus || this.style.display === "inline";
      })
      .transition(transition)
      .style("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0))
      .on("start", function (d) {
        if (d.parent === currFocus) this.style.display = "inline";
      })
      .on("end", function (d) {
        if (d.parent !== currFocus) this.style.display = "none";
      });
  };

  zoomTo([cPack.x, cPack.y, cPack.r * 2]);
};

// circle packing function
let pack = (data) => {
  return d3
    .pack()
    .size([width - 2, height - 2])
    .padding(3)(
    d3
      .hierarchy(data, (d) => {
        // children accessor
        return d["values"];
      })
      .sum((d) => d["Sales (million)"])
      .sort((a, b) => b["Sales (million)"] - a["Sales (million)"])
  );
};
