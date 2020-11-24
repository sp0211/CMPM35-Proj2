let tooltipBoxStack = [];
let tooltipTextStack = [];
let mealCosts = [];
let barCounter = 0;

function getCostByID(idTag){
  let idNum = idTag.slice(3);
  idNum = parseInt(idNum);
  return mealCosts[idNum];
}

function init(data){

  let timeOfLastFrame = 0;

  width = 975;

  height = width;

  // Set the starting position of the bottom bar
  innerRadius = 100;

  // Set the ending position of the top bar
  finalOuterRadius = Math.min(width, height) / 3;

  currentOuterRadius = innerRadius;

  // Compute the total cost for each day
  for (let i = 0; i < data.length; i++){
    let total = 0;

    for (let j = 1; j < data.columns.length; j++){
      total += parseInt(data[i][data.columns[j]]);
    }

    data[i].total = total;
  }

  let t = d3.timer(drawGraph, 75);


  function drawGraph(e){
    let timeSinceLastFrame = e - timeOfLastFrame;
    
    d3.select("svg").remove();

    currentOuterRadius += (finalOuterRadius - innerRadius) * (timeSinceLastFrame / 3000);
    timeOfLastFrame = e;
    
    if (e >= 3000){
      currentOuterRadius = finalOuterRadius;
      t.stop();
    }

    x = d3.scaleBand()
        .domain(data.map(d => d.day))
        .range([0, 2 * Math.PI])
        .align(0);

    // This scale maintains area proportionality of radial bars
    y = d3.scaleRadial()
          .domain([0, d3.max(data, d => d.total)])
          .range([innerRadius, currentOuterRadius]);

    costAxis = d3.scaleRadial()
          .domain([0, d3.max(data, d => d.total)])
          .range([innerRadius, finalOuterRadius]);

    // Map each column in the csv file to a different color
    z = d3.scaleOrdinal()
        .domain(data.columns.slice(1))
        .range(["#ffd980", "#ffd70f", "#ffba19", "#e39f00"]);

    // Function for drawing bars
    arc = d3.arc()
      .innerRadius(d => y(d[0]))
      .outerRadius(d => y(d[1]))
      .startAngle(d => x(d.data.day))
      .endAngle(d => x(d.data.day) + x.bandwidth())
      .padAngle(0.01)
      .padRadius(innerRadius)

    // Function for drawing the days axis
    xAxis = g => g
        .attr("text-anchor", "middle")
        .call(g => g.selectAll("g")
          .data(data)
          .join("g")
            .attr("transform", d => `
              rotate(${((x(d.day) + x.bandwidth() / 2) * 180 / Math.PI - 90)})
              translate(${innerRadius},0)
            `)
            .call(g => g.append("line")
                .attr("x2", -5)
                .attr("stroke", "#000"))
            .call(g => g.append("text")
                .attr("transform", d => (x(d.day) + x.bandwidth() / 2 + Math.PI / 2) % (2 * Math.PI) < Math.PI
                    ? "rotate(90)translate(0,16)"
                    : "rotate(-90)translate(0,-9)")
                .text(d => d.day)))
    
    // Function for drawing the cost axis
    yAxis = g => g
        .attr("text-anchor", "middle")
        .call(g => g.append("text")
            .attr("y", d => -costAxis(costAxis.ticks(3).pop()))
            .attr("dy", "-15")
            .text("Cost in THB"))
        .call(g => g.selectAll("g")
          .data(costAxis.ticks(5).slice(1))
          .join("g")
            .attr("fill", "none")
            .call(g => g.append("circle")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.5)
                .attr("r", costAxis))
            .call(g => g.append("text")
                .attr("y", d => -costAxis(d))
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .text(costAxis.tickFormat(5, "s"))
            .clone(true)
                .attr("fill", "#000")
                .attr("stroke", "none")))
    
    // Function for drawing the legend
    legend = g => g.append("g")
      .selectAll("g")
      .data(data.columns.slice(1).reverse())
      .join("g")
        .attr("transform", (d, i) => `translate(-40,${(i - (data.columns.length - 1) / 2) * 20})`)
        .call(g => g.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", z))
        .call(g => g.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(d => d))

    let svg = d3.select("body").append("svg")
        .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto")
        .style("font", "10px sans-serif");
    
    // Draw the stacked bars
    svg.append("g")
      .selectAll("g")
      .data(d3.stack().keys(data.columns.slice(1))(data))
      .join("g")
        .attr("fill", d => z(d.key))
      .selectAll("path")
      .data(d => d)
      .join("path")
        .attr("d", d => {let mealCost = d[1] - d[0];
                         mealCosts.push(mealCost);
                         return arc(d);})
        .attr("id", function(){
          let id = "bar" + barCounter;
          barCounter++;
          return id;
        })
        .on("mouseover", e => {
          console.log(e);
          let elementID = e.srcElement.id;
          let mousePos = d3.pointer(e);
          let x = mousePos[0];
          let y = mousePos[1];
          
          let sum = 0;

          for (let i = 0; i < data.length; i++){
            let total = 0;
        
            for (let j = 1; j < data.columns.length; j++){
              total += parseInt(data[i][data.columns[j]]);
            }
            sum[i] = total;
          }

          let tooltipBox = d3.select("svg").append("rect")
                          .attr("x", x + 25)
                          .attr("y", y)
                          .attr("width", 200)
                          .attr("height", 30)
                          .attr("id", "rect" + x + y)
                          .attr("fill", "#dedede");
          
          let tooltipText = d3.select("svg").append("text")
                            .attr("x", x + 30)
                            .attr("y", y + 15)
                            .attr("text-anchor", "start")
                            .attr("font-size", "12px")
                            .attr("fill", "black")
                            .text("Cost in THB for this meal: " + getCostByID(elementID));
                            
          
          tooltipBoxStack.push(tooltipBox);
          tooltipTextStack.push(tooltipText);
        })
        .on("mouseout", function(){
          let targetBox = tooltipBoxStack.pop();
          let targetText = tooltipTextStack.pop();
          
          targetBox.remove();
          targetText.remove();
        })
      
    // Draw the days axis
    svg.append("g")
        .call(xAxis);

    // Draw the cost axis
    svg.append("g")
        .call(yAxis);

    // Draw the legend
    svg.append("g")
        .call(legend);

    return svg.node();
  }
}