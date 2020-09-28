d3.json("./highest-grossing-per-region.json").then((raw) => {
  let dataset = Object.keys(raw).reduce((accumulator, currentVal) => {
    accumulator[+[currentVal]] = raw[currentVal];
    return accumulator;
  }, {});

  let min = Math.min(...Object.keys(dataset));
  let max = Math.max(...Object.keys(dataset));

  // ********************************************************************* //
  // ******************************* SLIDER ****************************** //
  // ********************************************************************* //
  var slider = d3
    .sliderHorizontal()
    .min(min)
    .max(max)
    .step(1)
    .width(300)
    .displayValue(true)
    .on("onchange", (val) => {
      d3.select("#value").text(val);
      let yearData = dataset[val];
      if (yearData) {
        console.log(val, yearData);
        d3.select("#result")
          .selectAll("div")
          .data(yearData)
          .enter()
          .append("div")
          .text((el, i) => {
            return i;
          });
      }
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
