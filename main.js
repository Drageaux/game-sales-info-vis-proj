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
let currYears = [2000, 2020];

const svg = d3
  .select("svg")
  .attr(
    "viewBox",
    `-${width / 2 + 50} -${height / 2 + 50} ${width + 100} ${height + 100}`
  )
  .style("background", color(0))
  .style("cursor", "pointer");

const sidebar = d3
  .select("#sidebar")
  .style("height", `${svg.node().getBoundingClientRect().height}px`);
sidebar
  .select("#details")
  .style("height", `${svg.node().getBoundingClientRect().height}px`);

let timer;
d3.csv("./circle_pack.csv").then((data) => {
  games = data.filter((game) => game[YEAR] != -1);
  const years = games.map((d) => +d[YEAR]);
  sliderRange = d3
    .sliderBottom()
    .min(d3.min(years))
    .max(d3.max(years))
    .width(
      d3.select("#slider").select("div").node().getBoundingClientRect().width *
        1
    )
    .tickFormat(d3.format(".0d"))
    .ticks(5)
    .step(1)
    .default(currYears)
    .fill("#2196f3")
    .on("onchange", (val) => {
      currYears = val;
      // IMPORTANT: delay before updating the entire chart with new data
      clearTimeout(timer);
      timer = setTimeout(() => {
        svg.selectAll("g").remove();
        currFocus = null;
        updateData();
        updateChart();
        if (currFocus) zoomTo([currFocus.x, currFocus.y, currFocus.r * 2]);
      }, 750);
      d3.select("p#value-simple").text(val.join("-"));
    });

  let gRange = d3
    .select("#slider-range")
    .append("svg")
    .attr(
      "width",
      d3.select("#slider").node().getBoundingClientRect().width + 100
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
  d3.select("p#value-range").text(sliderRange.value());

  gRange.call(sliderRange);
  gRange.selectAll("text").attr("fill", "white");

  window.onresize();

  updateData();
  updateChart();
  // zoomTo([currFocus.x, currFocus.y, currFocus.r * 2]);
  zoom(cPack);
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
  const currentNodes = svg.selectAll("g");
  currentNodes
    .select("circle.nodeCircle")
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

let cPack;
let updateData = () => {
  let filteredGames = games.filter(
    (e) => +e[SALES] > 0 && +e[YEAR] >= currYears[0] && +e[YEAR] <= currYears[1]
  );
  let groupedData = d3.group(
    filteredGames,
    (d) => d[layers[0]],
    (d) => d[layers[1]],
    (d) => d[layers[2]]
  );
  if (groupedData.size === 0) return;

  cPack = pack(groupedData);
  currFocus = cPack;

  svg.on("click", () => zoom(cPack));
};

let updateChart = () => {
  // console.log("cpack", cPack);
  if (!currFocus || cPack.descendants().length === 0) return;
  const nodeJoin = svg
    .selectAll("g")
    .data(cPack.descendants(), (d) => d.data[0] || d.data[GAME])
    .join(
      (group) => {
        let enter = group
          .filter((d) => {
            return d.parent === currFocus || d === currFocus;
          })
          .append("g")
          .attr("key", (d) => d.data[0])
          // create circles
          .call((enter) =>
            enter
              .append("circle")
              .attr("class", "nodeCircle")
              .attr("fill", (d) => circleColors[d.depth])
              .attr("fill-opacity", 0)
              .attr("stroke", (d) => circleColors[d.depth])
              .attr("stroke-width", "1px")
              .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0))
              .attr("depth", (d) => d.depth)
              .attr("r", (d) => 0)
          )
          // create nucleus
          .call((enter) =>
            enter
              .filter((d) => {
                const k = width / (currFocus.r * 2);
                return d.r * k > 16;
              })
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
            return enter;
          });

        return enter;
      },
      (update) => {
        // // because the data had been updated, === comparisons can't work
        // let currentNodes = update.filter(
        //   (d) =>
        //     !d.parent || (d.parent && d.parent.data.key === currFocus.data.key)
        // );
        // currentNodes.attr("r", 0);
        // fadeSelectedNodesContentIn(currentNodes);

        return update;
      },
      (exit) => {
        // TODO: remove
        // exit.select("circle").transition().duration(750).attr("r", 0);

        return exit.transition().duration(750).style("opacity", 0);
      }
    );

  let others = nodeJoin.filter(
    (d) => d.parent != currFocus && d.depth !== currFocus.depth
  );
  others.remove();

  updateText();

  // ********************************************************************* //
  // **************************** MOUSE EVENTS *************************** //
  // ********************************************************************* //
  nodeJoin
    .on("mouseover", function (event, d) {
      if (currFocus.children.length > 15 && currFocus.depth === 3)
        d3.select(this).select("text").style("display", "inline");
      onMouseOver(event, d);
    })
    .on("mouseout", function (event, d) {
      if (currFocus.children.length > 15 && currFocus.depth === 3)
        d3.select(this).select("text").style("display", "none");
      onMouseOut(event, d);
    })
    .on("click", (event, d, i) => {
      if (currFocus === d) {
        zoom(d.parent), event.stopPropagation();
      } else if (d.depth > 3) {
        event.stopPropagation();
      } else {
        zoom(d), event.stopPropagation();
      }
    });
};

let fadeSelectedNodesContentIn = (selectedNodes) => {
  let duration = currFocus ? 0 : 750;
  selectedNodes
    .select("circle.nodeCircle")
    .transition()
    .duration(duration)
    .attr("r", (d) => d.r)
    .attr("fill-opacity", 0.5);

  selectedNodes
    .select("circle.nucleus")
    .transition()
    .duration(duration)
    .attr("fill-opacity", 1);

  selectedNodes
    .select("text")
    .transition()
    .duration(duration)
    .attr("fill-opacity", 1)
    .style(
      "display",
      currFocus.depth === 3 && selectedNodes.nodes().length > 15
        ? "none"
        : "inline"
    );
};

let updateText = () => {
  if (currFocus.depth === 3) {
    currFocus.children // also lazy ranking the games in its final nested category
      .map((d, i) => {
        d.rank = i + 1;
        return d;
      });
  }

  const label = svg
    .selectAll("g")
    // .filter((d) => d.rank == null || d.rank < 5)
    .select("text");
  label.selectAll("tspan").remove();
  label.append("tspan").text((d) => {
    return d.data[0] || d.data[GAME];
  });
  label
    .append("tspan")
    .attr("font-weight", 400)
    .attr("dy", "1.15em")
    .attr("x", 22)
    .text(
      (d) =>
        `${d.value >= 0.01 ? "$" + d3.format(",.2f")(d.value) : "< $0.01"}m`
    );

  label.on("mousedown", () => false);
};

// ********************************************************************* //
// ************************ MOUSE EVENT HELPERS ************************ //
// ********************************************************************* //
let onMouseOver = (event, d) => {
  const siblings = svg
    .selectAll("g")
    .filter((e) => e.parent === d.parent && e !== d);
  siblings
    .select("circle.nodeCircle")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.2);
  siblings
    .select("circle.nucleus")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.2);
  siblings.select("text").transition().duration(250).attr("fill-opacity", 0.2);
  // dim the non-selected games in the sidebar too
  sidebar
    .select("#details")
    .selectAll("li")
    .filter((e) => e.parent === d.parent && e !== d)
    .transition()
    .duration(250)
    .style("opacity", 0.2);
};

let onMouseOut = (event, d) => {
  const siblings = svg
    .selectAll("g")
    .filter((e) => e !== d && e.parent === d.parent);
  siblings
    .select("circle.nodeCircle")
    .transition()
    .duration(250)
    .attr("fill-opacity", 0.5);
  siblings
    .select("circle.nucleus")
    .transition()
    .duration(250)
    .attr("fill-opacity", 1);
  siblings.select("text").transition().duration(250).attr("fill-opacity", 1);
  // return the dimmed games in the sidebar to normal
  sidebar
    .select("#details")
    .selectAll("li")
    .filter((e) => e.parent === d.parent && e !== d)
    .transition(250)
    .style("opacity", 1);
};

// ********************************************************************* //
// ***************************** FUNCTIONS ***************************** //
// ********************************************************************* //
let changeLayers = () => {
  // update animation
  const node = svg.selectAll("g");
  updateChart();

  // hide nodes except current
  node
    .transition()
    .duration(zoomDuration)
    .on("start", function (d) {
      if (d === currFocus || d.parent === currFocus)
        this.style.display = "inline";
      else d3.select(this).remove();
    })
    .on("end", function (d) {
      if (d !== currFocus && d.parent !== currFocus) d3.select(this).remove();
      else this.style.display = "inline";
    });

  node
    .select("circle.nodeCircle")
    .transition()
    .duration(zoomDuration)
    .attr("stroke-opacity", (d) => (d === currFocus ? 1 : 0))
    .attr("fill-opacity", (d) => (d.parent === currFocus ? 0.5 : 0));
  // // make the outer circle hide properly
  // .on("start", function (d) {
  //   if (d === currFocus || d.parent === currFocus)
  //     this.style.display = "inline";
  // })
  // .on("end", function (d) {
  //   if (d !== currFocus && d.parent !== currFocus)
  //     this.style.display = "none";
  // });

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
      (d.rank == null || d.rank <= 5)
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
      return d.parent === currFocus || d === currFocus;
    })
    .attr("transform", (d) => {
      return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
    });
  node.select("circle.nodeCircle").attr("r", (d) => d.r * k);
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
  console.log("zoom at", d);
  if (!d) return;
  // change focus to new node
  currFocus = d;

  sidebar.style("border-color", circleColors[d.depth + 1]);
  // display game details at game level
  sidebar.select("#orderer").style("display", "none");
  const details = sidebar
    .select("#details")
    .style("display", "inline")
    .style("color", circleColors[currFocus.depth + 1]);
  details.selectAll("*").remove();

  let layers = currFocus.ancestors().reverse().slice(1);
  let description = layers.reduce((prev, curr, i) => {
    return i === 0 ? curr.data[0] : prev + ", " + curr.data[0];
  }, "");
  console.log(description);

  // create list and add title
  let list = details
    .append("ul")
    .text(
      description
        ? `Full list of all games for ${description}`
        : "Full list of game sales for all regions"
    );
  // add subtitle text
  list
    .append("div")
    .style("font-weight", 400)
    .style("font-size", "0.75rem")
    .style("opacity", 0.75)
    .text("(Ranked by game sales)");
  // list out game items
  const listItems = list
    .selectAll("li")
    .data(currFocus.children.sort((a, b) => b.value - a.value))
    .enter()
    .append("li")
    .style("list-style", "none")
    .style("font-size", "0.75rem")
    .style("margin-top", "0.5rem")
    .style("cursor", (d) => (d.data[0] ? "pointer" : "initial"))
    .text((d) => d.data[0] || d.data[GAME])
    .on("mouseover", onMouseOver)
    .on("mouseout", onMouseOut)
    .on("click", (event, d, i) => {
      if (currFocus === d) {
        zoom(d.parent), event.stopPropagation();
      } else if (d.depth > 3) {
        event.stopPropagation();
      } else {
        zoom(d), event.stopPropagation();
      }
    });

  listItems
    .filter((d) => currFocus.depth < 3)
    .append("span")
    .style("font-weight", 400)
    .style("opacity", 0.75)
    .text((d) => ` (${d3.format(",.0d")(d.leaves().length)})`);

  listItems
    .append("div")
    .style("font-weight", 400)
    .text(
      (d) =>
        `${d.value >= 0.01 ? "$" + d3.format(",.2f")(d.value) : "< $0.01"}m`
    );
  // if (currFocus.depth === 3) {
  //   gameItems
  //     .append("div")
  //     .style("font-weight", 400)
  //     .text((d) => d3.format(".d")(d.data[YEAR]));
  // }

  // hide and show components
  if (currFocus.depth != 0) {
    svg.select("#slider").style("display", "none");
  } else if (currFocus.depth === 0) {
    // slider appears
    d3.select("#slider").style("display", "inline");
    // // orderer appears
    // sidebar.select("#orderer").style("display", "inline");
    // sidebar.select("#details").style("display", "none");
  } else {
    // hide both at mid levels
    d3.select("#slider").style("display", "none");
    sidebar.select("#orderer").style("display", "none");
    // sidebar.select("#details").style("display", "none");
  }

  // start absolute animation of all nodes
  changeLayers();
  // start zooming to change relative view
  svg
    .transition()
    .duration(zoomDuration)
    .tween("zoom", () => {
      // view is the starting point, current focus is the next point
      const i = d3.interpolateZoom(
        view || [currFocus.x, currFocus.y, currFocus.r * 2],
        [currFocus.x, currFocus.y, currFocus.r * 2]
      );
      return (t) => zoomTo(i(t));
    });
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
