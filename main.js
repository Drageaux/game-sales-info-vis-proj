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

const sidebar = d3.select("#sidebar");

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
    .attr("y", -5.5)
    .attr("x", 22)
    .attr("fill-opacity", 0);
  label.append("tspan").text((d) => d.data["key"] || d.data[GAME]);
  label
    .append("tspan")
    .attr("font-weight", 400)
    .attr("dy", "1.15em")
    .attr("x", 22)
    .text((d) => `$${d.value.toFixed(2)}m`);
  // transition
  label
    .filter((d) => d.parent === cPack)
    .transition(750)
    .delay(1000)
    .attr("fill-opacity", (d) => (d.parent === cPack ? 1 : 0));
  label.on("mousedown", () => false);

  // ********************************************************************* //
  // **************************** MOUSE EVENTS *************************** //
  // ********************************************************************* //
  const node = nodeUpdate
    .merge(nodeEnter)
    .on("mouseover", onMouseOver)
    .on("mouseout", onMouseOut)
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
// ************************ MOUSE EVENT HELPERS ************************ //
// ********************************************************************* //
let onMouseOver = (d) => {
  const filtered = svg
    .selectAll("g")
    .filter((e) => e.parent === d.parent && e !== d);
  filtered.select("circle").transition(250).attr("fill-opacity", 0.2);
  filtered.select("circle.nucleus").transition(250).attr("fill-opacity", 0.2);
  filtered
    .filter((e) => e.rank == null || (e.rank != null && e.rank <= 5))
    .select("text")
    .transition(250)
    .attr("fill-opacity", 0.2);
  // dim the non-selected games in the sidebar too
  if (d.depth === 3) {
    sidebar
      .select("#details")
      .selectAll("li")
      .filter((e) => e.parent === d.parent && e !== d)
      .transition(250)
      .style("opacity", 0.2);
  }
};

let onMouseOut = (d) => {
  const filtered = svg
    .selectAll("g")
    .filter((e) => e !== d && e.parent === d.parent);
  filtered.select("circle").transition(250).attr("fill-opacity", 0.5);
  filtered.select("circle.nucleus").transition(250).attr("fill-opacity", 1);
  filtered
    .filter((e) => e.rank == null || (e.rank != null && e.rank <= 5))
    .select("text")
    .transition(250)
    .attr("fill-opacity", 1);
  // return the dimmed games in the sidebar to normal
  if (d.depth === 3) {
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
};

let zoom = (d) => {
  if (d === currFocus || !d) return;
  // change focus to new node
  currFocus = d;

  if (currFocus.depth === 3) {
    // display game details at game level
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
    // orderer appears
    sidebar.select("#orderer").style("display", "inline");
    sidebar.select("#details").style("display", "none");
  } else {
    // hide both at mid levels
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
