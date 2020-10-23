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
let width = 932;
let height = width;
let color = d3
  .scaleLinear()
  .domain([0, 5])
  .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
  .interpolate(d3.interpolateHcl);

let currFocus;
let view;

d3.csv("./circle_pack.csv").then((data) => {
  let bigGamesOnly = data.filter((e) => e["Sales (million)"] > 0);
  console.log(bigGamesOnly.length, data.length);
  let dataByRegion = d3
    .nest()
    .key((d) => d["Region"])
    .key((d) => d["Genre"])
    .key((d) => d["Platform"])
    .entries(bigGamesOnly);

  console.log(dataByRegion);
  let root = {
    key: "Regions",
    values: dataByRegion,
  };
  const cPack = pack(root);
  currFocus = cPack;

  const svg = d3
    .select("svg")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .style("display", "block")
    .style("margin", "0 -14px")
    .style("background", color(0))
    .style("cursor", "pointer")
    .on("click", (event) => {
      // TODO: handle event stopPropagation giving event=null
      // console.log(event);
      // zoom(event, root, label, svg);
    });

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(cPack.descendants().slice(1))
    .join("circle")
    .attr("r", (d) => d.r)
    .attr("fill", (d) => (d["values"] ? color(d.depth) : "white"))
    .attr("pointer-events", (d) => (!d["Sales (million)"] ? "none" : null))
    .on("mouseover", function () {
      d3.select(this).attr("stroke", "#000");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", null);
    })
    .on("click", (event, d) => {
      console.log(event);
      focus !== d && (zoom(event, d, label, svg), event.stopPropagation());
    });

  const label = svg
    .append("g")
    .style("font", "10px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(cPack.descendants())
    .join("text")
    .style("fill-opacity", (d) => (d.parent === cPack ? 1 : 0))
    .style("display", (d) => (d.parent === cPack ? "inline" : "none"))
    .text((d) => d.data["key"]);

  zoomTo([cPack.x, cPack.y, cPack.r * 2], node, label);
});

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

let zoomTo = (v, node, label) => {
  const k = width / v[2];

  view = v;
  console.log(v);

  label.attr("transform", (d) => {
    return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
  });
  node.attr("transform", (d) => {
    return `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`;
  });
  node.attr("r", (d) => d.r * k);
};

let zoom = (event, d, label, svg) => {
  const focus0 = currFocus;

  currFocus = d;
  console.log(event);

  const transition = svg
    .transition()
    .duration(event.altKey ? 7500 : 750)
    .tween("zoom", (d) => {
      const i = d3.interpolateZoom(view, [
        currFocus.x,
        currFocus.y,
        currFocus.r * 2,
      ]);
      return (t) => zoomTo(i(t));
    });

  label
    .filter(function (d) {
      console.log(d);
      return d.parent === focus || this.style.display === "inline";
    })
    .transition(transition)
    .style("fill-opacity", (d) => (d.parent === currFocus ? 1 : 0))
    .on("start", function (d) {
      if (d.parent === focus) this.style.display = "inline";
    })
    .on("end", function (d) {
      if (d.parent !== focus) this.style.display = "none";
    });
};
