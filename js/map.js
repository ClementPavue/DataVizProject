var topo,projection,path,svg,g,centered,throttleTimer;
var width = 860;
var height = 500;
var state = "ALL" ;
d3.select(window).on("resize", throttle);
setup(state);
legend();
violin();

function setup(size){
  projection = d3.geo.albersUsa()
  .scale(1070)
  .translate([width / 2, height / 2]);

  path = d3.geo.path().projection(projection);

  svg = d3.select("#map").append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g");

  g = svg.append("g");

  d3.json("map/us.json", function(error, us) {
    if (error) throw error;

    g.append("g")
    .attr("id", "states")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
    .attr("d", path)
    .on("click", clicked);

    g.append("path")
    .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
    .attr("id", "state-borders")
    .attr("d", path);

    var usa = topojson.feature(us, us.objects.states).features;
    topo = usa;

    draw(topo,size);
  });
}

function draw(topo,size) {
  if(size === null ) size = "ALL";

  d3.csv("data/data.csv", function(data) {
    data.forEach(function(d){
      if(d.flight > 250 && size =="L"){
        addpoint(d);
      }
      else if(d.flight < 250 && d.flight > 100 && size =="M"){
        addpoint(d);
      }
      else if(d.flight < 250 && d.flight < 100 && size =="S"){
        addpoint(d);
      }
      else if(size == "ALL" || size === null){
        addpoint(d);
      }
    });
  });
}

function redraw(size) {
  if(size == state) size = "ALL";
  state = size;
  d3.select('svg').remove();
  setup(size);
}

function addpoint(d) {
  var lon = d.latitude;
  var lat = d.longitude;
  var text = d.city;
  var number_of_flight = d.flight;
  var gpoint = g.append("g").attr("class", "gpoint");
  var x, y;
  try {
    x = projection([lat,lon])[0];
    y = projection([lat,lon])[1];
    var color;
    var value = number_of_flight;
    if(value> 250){
      color = "#6D6875";
      value = 3*2;
    }
    else if(value > 100){
      color = "#4E8098";
      value = 3*1.5;
    }
    else{
      color = "#A31621";
      value = 3;
    }

    gpoint.append("svg:circle")
    .attr("cx", x)
    .attr("cy", y)
    .attr("class","point")
    .attr("id",d.name)
    .attr("r", value)
    .style("fill",color)
    .style("cursor","pointer")
    .call(d3.helper.tooltip()
    .style({color: 'black'})
    .text(text+": "+number_of_flight)
  )
  .on("mouseover", function() {
    d3.select(this).style("stroke","white");
  })
  .on("mouseout", function() {
    d3.select(this).style("stroke","");
  })
  .on("click", function() {
    d3.select(this).style("stroke","white");
    add_Line(this);
    d3.select("#airport").text(d.airport+" ("+d.name+")");
    d3.select("#airport_city").text(d.city+", "+d.state+", UTC"+d.offset);
    d3.select("#airport_weather").text(Math.round(d.temperature)+"°C, "+d.summary+", humidity: "+Math.round(d.humiditiy)+"%, ");
    var skycons = new Skycons("red");
    skycons.add("icon", d.icon);
    skycons.play();

    d3.csv('data/speed.csv', function(error, data) {
      data = data.filter(function(row) {
        return row.ORIGIN_AIRPORT == d.name;
      });
      var airlines = [];
      data.forEach(function(d){
        airlines.push(d.AIRLINE);
      });
      airlines = airlines.filter((v, i, a) => a.indexOf(v) === i);
      d3.select("#airline-available").text(airlines);
    });

  });
}
catch(err) {
  return;
}
}

function add_Line(c) {
  d3.selectAll("line").remove();
  origin_airport = c.id;
  c = d3.select(c);
  d3.csv("data/trace.csv", function(data) {
    data = data.filter(function(row) {
      return row.ORIGIN_AIRPORT == origin_airport;
    });
    data.forEach(function(d){
      destination_airport = d3.select("#"+d.DESTINATION_AIRPORT);
      try {
        var myLine = g.append("svg:line")
        .attr("x1", c.attr("cx"))
        .attr("y1", c.attr("cy"))
        .attr("x2", destination_airport.attr("cx"))
        .attr("y2", destination_airport.attr("cy"))
        .style("stroke", "rgb(6,120,155)")
        .style("stroke-width", 0.5)
        .style("opacity", 0.6);
      }
      catch(err) {
        return;
      }
    });
  });
}

function throttle() {
  window.clearTimeout(throttleTimer);
  throttleTimer = window.setTimeout(function() {
    draw();
  }, 200);
}

function move() {
  var t = d3.event.translate;
  var s = d3.event.scale;
  zscale = s;
  var h = height/4;

  t[0] = Math.min(
    (width/height)  * (s - 1),
    Math.max( width * (1 - s), t[0] )
  );

  t[1] = Math.min(
    h * (s - 1) + h * s,
    Math.max(height  * (1 - s) - h * s, t[1])
  );

  zoom.translate(t);
  g.attr("transform", "translate(" + t + ")scale(" + s + ")");
  d3.selectAll(".country").style("stroke-width", 1.5 / s);

}

function clicked(d) {
  var x, y, k;
  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
  }
  else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
  }

  g.selectAll("path")
  .classed("active", centered && function(d) { return d === centered; });

  g.transition()
  .duration(750)
  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
  .style("stroke-width", 1.5 / k + "px");
}

function violin(){
  var chart1;
  d3.csv('data/speed.csv', function(error, data) {
    data = data.filter(function(row) {
      return row.ORIGIN_AIRPORT == "LAX";
    });
    chart1 = makeDistroChart({data:data,xName:'IATA_CODE',yName:'SPEED',axisLabels: {xAxis: null, yAxis: 'speed (km/h)'},selector:"#speed",chartSize:{height:660, width:960},constrainExtremes:true});
    chart1.renderBoxPlot();
    chart1.renderDataPlots();
    chart1.renderNotchBoxes({showNotchBox:false});
    chart1.renderViolinPlot({showViolinPlot:true});
    chart1.violinPlots.show({reset:true,clamp:0});
    chart1.boxPlots.show({reset:true, showWhiskers:false,showOutliers:false,boxWidth:10,lineWidth:15,colors:['#555']});
    chart1.notchBoxes.hide();
    chart1.dataPlots.change({showPlot:false,showBeanLines:false});
  });
}

function legend(){
  var legendData = [[">250", "#6D6875", "circle", "L"], ["100<.<250", "#4E8098", "circle", "M"], ["1<.<100", "#A31621", "circle", "S"]];
  var svg = d3.select('#legend').append('svg').attr('width', 500).attr('height', 100);
  var legend = svg.append('g')
  .attr("class", "legend")
  .attr("height", 0)
  .attr("width", 0)
  .attr('transform', 'translate(20,20)');

  var legendRect = legend
  .selectAll('g')
  .data(legendData);

  var legendRectE = legendRect.enter()
  .append("g")
  .attr("transform", function(d,i){
    return 'translate(0, ' + (i * 20) + ')';
  });

  legendRectE
  .append('path')
  .attr("d", d3.svg.symbol().type((d) => {
     return d[2]
   }))
  .style("fill", function (d) {
    return d[1];
  })
  .style("cursor","pointer")
  .on("click", function(d,i) {
    redraw(d[3]);
  });

  legendRectE.append("text")
  .attr("x", 10)
  .attr("y", 5)
  .text(function (d) {
    return d[0];
  });
}
