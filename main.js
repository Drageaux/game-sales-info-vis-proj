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

// const nodeGroup = svg.append("g");
// const labelGroup = svg.append("g");

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
  updateChart();
};

let updateChart = () => {
  let filteredGames = games.filter((e) => e[SALES] > 0.0 && +e[YEAR] == 2001);
  console.log(filteredGames);
  let dataByRegion = d3
    .nest()
    .key((d) => d[layers[0]])
    .key((d) => d[layers[1]])
    .key((d) => d[layers[2]])
    .entries(filteredGames);

  let root = {
    key: "Regions",
    values: dataByRegion,
  };
  const cPack = pack(root);
  currFocus = cPack;

  // console.log(root);

  svg.on("click", () => zoom(cPack));

  const node = svg
    .selectAll("g")
    .data(cPack.descendants().slice(1))
    .join("g")
    .style("display", (d) => (d.parent === cPack ? "inline" : "none")) // prevent mouseover and mousedown on invisible circles // skipping circle for top-most level
    .attr("pointer-events", (d) => (!d.children ? "none" : null)); // no children, no click

  const circle = node
    .append("circle")
    .attr("r", (d) => d.r)
    .attr("fill", (d) => circleColors[d.depth])
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 0.5 : 0))
    .attr("stroke", (d) => circleColors[d.depth])
    .attr("stroke-width", "1px")
    .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0)) // TODO: add ranking and only display high ranked games
    .attr("depth", (d) => d.depth);

  const nucleus = node
    .append("circle")
    .attr("class", "nucleus")
    .attr("r", 15)
    .attr("fill", (d) => circleColors[d.depth])
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0))
    .attr("depth", (d) => d.depth)
    .attr("pointer-events", "none");

  // node
  //   .selectAll("circle")
  //   .exit()
  //   .transition()
  //   .duration(750)
  //   .attr("r", function (d) {
  //     return 0;
  //   })
  //   .remove();
  // console.log("node", node);
  // console.log("node exit", node.select("circle").exit());

  node
    .on("mouseover", function (d) {
      const filtered = node.filter((e) => e !== d && e.parent === d.parent);

      filtered.select("circle").transition(250).attr("fill-opacity", 0.3);
      filtered
        .select("circle.nucleus")
        .transition(250)
        .attr("fill-opacity", 0.3);
      filtered.select("text").transition(250).attr("fill-opacity", 0.3);
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

  const label = node
    .append("text")
    .attr("dx", 22)
    .attr("fill", (d) => circleColors[d.depth])
    .text((d) => d.data["key"] || d.data["Game"]);

  label.on("mousedown", () => false);

  let zoomTo = (v) => {
    const k = width / v[2];

    view = v;

    node
      .filter(function (d) {
        return d.parent === currFocus || this.style.display === "inline";
      })
      .attr("transform", (d) => {
        return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
      });
    circle
      .filter(function (d) {
        return d.parent === currFocus || this.style.display === "inline";
      })
      .attr("r", (d) => d.r * k);
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

    // swap
    node
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

    circle
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

    nucleus
      .transition(zoomDuration)
      .attr("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0));

    label
      .transition(zoomDuration)
      .attr("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0));
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
      .sum((d) => d[SALES])
      .sort((a, b) => b[SALES] - a[SALES])
  );
};
