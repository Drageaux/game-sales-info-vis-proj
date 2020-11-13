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

let sliderRange;
let currYear = 2001;

const sidebar = d3.select("#sidebar");

const svg = d3
  .select("svg")
  .attr(
    "viewBox",
    `-${width / 2 + 50} -${height / 2 + 50} ${width + 100} ${height + 100}`
  )
  .style("background", color(0))
  .style("cursor", "pointer");

let timer;
d3.csv("./circle_pack.csv").then((data) => {
  games = data.filter((game) => game[YEAR] != -1);
  const years = games.map((d) => +d[YEAR]);
  sliderRange = d3
    .sliderBottom()
    .min(d3.min(years))
    .max(d3.max(years))
    .width(width * 0.8)
    .ticks(5)
    .step(1)
    .default(currYear)
    .fill("white")
    .on("onchange", (val) => {
      currYear = val;
      // IMPORTANT: delay before updating the entire chart with new data
      clearTimeout(timer);
      timer = setTimeout(() => {
        updateChart();
      }, 750);
      d3.select("p#value-simple").text(d3.format(".0")(val));
    });

  let gRange = d3
    .select("#slider-range")
    .append("svg")
    .attr(
      "width",
      d3.select("#slider").select("div").node().getBoundingClientRect().width *
        0.9
    )
    .attr("height", 100)
    .append("g")
    .attr(
      "transform",
      `translate(${
        d3.select("#slider").select("div").node().getBoundingClientRect()
          .width * 0.1
      },30)`
    );
  d3.select("p#value-range").text(d3.format(".0")(sliderRange.value()));

  gRange.call(sliderRange);

  updateChart();
});

window.onresize = () => {
  let gRange = d3
    .select("#slider-range")
    .select("svg")
    .attr(
      "width",
      d3.select("#slider").select("div").node().getBoundingClientRect().width *
        0.9
    )
    .attr("height", 100)
    .select("g")
    .attr(
      "transform",
      `translate(${
        d3.select("#slider").select("div").node().getBoundingClientRect()
          .width * 0.1
      },30)`
    );
};

let layers = [REGION, GENRE, PLATFORM];
let shuffleArray = () => {
  for (let i = layers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [layers[i], layers[j]] = [layers[j], layers[i]];
  }

  // right now only changing the order of the layers require exit
  zoom(currFocus);
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
  let filteredGames = games.filter((e) => e[SALES] > 0 && +e[YEAR] == currYear);
  let groupedData = d3.group(
    filteredGames,
    (d) => d[layers[0]],
    (d) => d[layers[1]],
    (d) => d[layers[2]]
  );
  if (groupedData.size === 0) return;

  let cPack = pack(groupedData);
  if (!currFocus) currFocus = cPack;

  svg.on("click", () => zoom(cPack));

  const nodeJoin = svg
    .selectAll("g")
    .data(cPack.descendants(), (d) => d.data[0] || d.data[GAME])
    // .filter(function (d) {
    //   return d.depth - 1 === currFocus.depth;
    // })
    .join(
      (group) => {
        let enter = group
          .append("g")
          .style("display", (d) => (d.parent === cPack ? "inline" : "none"))
          // create circles
          .call((enter) =>
            enter
              .append("circle")
              .attr("fill", (d) => circleColors[d.depth])
              .attr("fill-opacity", 0)
              .attr("stroke", (d) => circleColors[d.depth])
              .attr("stroke-width", "1px")
              .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0))
              .attr("depth", (d) => d.depth)
          )
          // create nucleus
          .call((enter) =>
            enter
              .append("circle")
              .attr("class", "nucleus")
              .attr("fill", (d) => circleColors[d.depth])
              .attr("fill-opacity", 0)
              .attr("depth", (d) => d.depth)
              .attr("pointer-events", "none")
              .attr("r", 15)
          )
          // create label
          .call((enter) =>
            enter
              .append("text")
              .attr("fill", (d) => circleColors[d.depth])
              .attr("y", -5.5)
              .attr("x", 22)
              .attr("fill-opacity", 0)
          )
          // transition children in
          .call((enter) => {
            let currentNodes = enter.filter((d) => d.parent === currFocus);
            fadeSelectedNodesContentIn(currentNodes);
            // updateText();
            return enter;
          });
        return enter;
      },
      (update) => {
        // because the data had been updated, === comparisons can't work
        let currentNodes = update.filter(
          (d) =>
            !d.parent || (d.parent && d.parent.data.key === currFocus.data.key)
        );
        fadeSelectedNodesContentIn(currentNodes);

        return update;
      },
      (exit) => {
        // TODO: remove
        return exit
          .filter(function (d) {
            return this.style.display === "inline";
          })
          .remove();
        // console.log("exit", exit.nodes());
        // return exit.remove();
      }
    );

  updateText();

  // ********************************************************************* //
  // **************************** MOUSE EVENTS *************************** //
  // ********************************************************************* //
  nodeJoin
    .on("mouseover", onMouseOver)
    .on("mouseout", onMouseOut)
    .on("click", (event, d, i) => {
      if (currFocus === d) {
        zoom(d.parent), event.stopPropagation();
      } else {
        zoom(d), event.stopPropagation();
      }
    });

  zoomTo([currFocus.x, currFocus.y, currFocus.r * 2]);
};

let fadeSelectedNodesContentIn = (selectedNodes) => {
  selectedNodes
    .select("circle")
    .transition()
    .duration(750)
    .attr("r", (d) => d.r)
    .attr("fill-opacity", 0.5);

  selectedNodes
    .select("circle.nucleus")
    .transition()
    .duration(750)
    .attr("fill-opacity", 1);

  selectedNodes
    .select("text")
    .transition()
    .duration(750)
    .attr("fill-opacity", 1);
};

let updateText = () => {
  const label = svg.selectAll("g").select("text");
  label.selectAll("tspan").remove();
  label.append("tspan").text((d) => {
    return d.data[0] || d.data[GAME];
  });
  label
    .append("tspan")
    .attr("font-weight", 400)
    .attr("dy", "1.15em")
    .attr("x", 22)
    .text((d) => `$${d.value.toFixed(2)}m`);

  label.on("mousedown", () => false);
};

// ********************************************************************* //
// ************************ MOUSE EVENT HELPERS ************************ //
// ********************************************************************* //
let onMouseOver = (event, d) => {
  const filtered = svg
    .selectAll("g")
    .filter((e) => e.parent === d.parent && e !== d);
  filtered
    .select("circle")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.2);
  filtered
    .select("circle.nucleus")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.2);
  filtered
    .filter((e) => e.rank == null || (e.rank != null && e.rank <= 5))
    .select("text")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.2);
  // dim the non-selected games in the sidebar too
  if (currFocus.depth === 3) {
    sidebar
      .select("#details")
      .selectAll("li")
      .filter((e) => e.parent === d.parent && e !== d)
      .transition()
      .duration(250)
      .style("opacity", 0.2);
  }
};

let onMouseOut = (event, d) => {
  const filtered = svg
    .selectAll("g")
    .filter((e) => e !== d && e.parent === d.parent);
  filtered
    .select("circle")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.5);
  filtered
    .select("circle.nucleus")
    .transition()
    .duration(250)
    .attr("fill-opacity", 1);
  filtered
    .filter((e) => e.rank == null || (e.rank != null && e.rank <= 5))
    .select("text")
    .transition()
    .duration(250)
    .attr("fill-opacity", 1);
  // return the dimmed games in the sidebar to normal
  if (currFocus.depth === 3) {
    sidebar
      .select("#details")
      .selectAll("li")
      .filter((e) => e.parent === d.parent && e !== d)
      .transition(250)
      .style("opacity", 1);
  }
};

// ********************************************************************* //
// ***************************** FUNCTIONS ***************************** //
// ********************************************************************* //
let changeLayers = () => {
  // update animation
  const node = svg.selectAll("g");

  // hide  nodes except current

  node
    .transition()
    .duration(zoomDuration)
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
    .transition()
    .duration(zoomDuration)
    .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0))
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 0.5 : 0))
    // make the outer circle hide properly
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
    .transition()
    .duration(zoomDuration)
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0));

  node
    .select("text")
    .transition()
    .duration(zoomDuration)
    .attr("fill-opacity", (d) =>
      d.parent === currFocus &&
      // if is a game, display text for only top 5
      (d.rank == null || (d.rank != null && d.rank <= 5))
        ? 1
        : 0
    );
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
  // const label = node.select("text");
  // label.selectAll("tspan").remove();
  // label.append("tspan").text((d) => {
  //   return d.data[0] || d.data[GAME];
  // });
  // label
  //   .append("tspan")
  //   .attr("font-weight", 400)
  //   .attr("dy", "1.15em")
  //   .attr("x", 22)
  //   .text((d) => `$${d.value.toFixed(2)}m`);
};

let zoom = (d) => {
  if (!d) return;
  // change focus to new node
  currFocus = d;

  if (currFocus.depth === 3) {
    // display game details at game level
    svg.select("#slider").style("display", "none");
    sidebar.select("#orderer").style("display", "none");
    const details = sidebar
      .select("#details")
      .style("display", "inline")
      .style("color", circleColors[4]);
    details.selectAll("*").remove();

    let exampleGame = currFocus.children[0].data;
    // create list and add title
    let list = details
      .append("ul")
      .text(
        `Full list of all games for ${exampleGame[layers[0]]}, ${
          exampleGame[layers[1]]
        }, ${exampleGame[layers[2]]}`
      );
    // add subtitle text
    list
      .append("div")
      .style("font-weight", 400)
      .style("font-size", "0.75rem")
      .style("opacity", 0.75)
      .text("(Ranked by game sales)");
    // list out game items
    const gameItems = list
      .selectAll("li")
      .data(currFocus.children)
      .enter()
      .append("li")
      .style("list-style", "none")
      .style("font-size", "0.75rem")
      .style("margin-top", "0.5rem")
      .text((d) => d.data[GAME])
      .on("mouseover", onMouseOver)
      .on("mouseout", onMouseOut);

    gameItems
      .append("div")
      .style("font-weight", 400)
      .text((d) => `$${d.data[SALES]}m`);

    currFocus.children // also lazy ranking the games in its final nested category
      .map((d, i) => {
        d.rank = i + 1;
        return d;
      });
  } else if (currFocus.depth === 0) {
    // slider appears
    d3.select("#slider").style("display", "inline");
    // orderer appears
    sidebar.select("#orderer").style("display", "inline");
    sidebar.select("#details").style("display", "none");
  } else {
    // hide both at mid levels
    d3.select("#slider").style("display", "none");
    sidebar.select("#orderer").style("display", "none");
    sidebar.select("#details").style("display", "none");
  }

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
      console.log(view);
      return (t) => zoomTo(i(t));
    });

  changeLayers();
};

// circle packing function
let pack = (data) => {
  let result = d3
    .pack()
    .size([width - 2, height - 2])
    .padding(3)(
    d3
      .hierarchy(data)
      .sum((d) => d[SALES])
      .sort((a, b) => b[SALES] - a[SALES])
  );
  return result;
};
