requirejs(["tooltip"]);

d3.select(window).on("resize", throttle);

var topo,projection,path,svg,g;
var width = 960,
height = 500,
centered;

setup("ALL");

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
  if(size == null ) size = "ALL";

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
      else if(size == "ALL" || size == null){
        addpoint(d);
      }
    });
  });
}

function redraw(size) {
  d3.select('svg').remove();
  setup(size);
}

function addpoint(d) {
  var lon = d.latitude;
  var lat = d.longitude;
  var text = d.city;
  var value = d.flight;
  var gpoint = g.append("g").attr("class", "gpoint");
  var x, y;
  try {
    x = projection([lat,lon])[0];
    y = projection([lat,lon])[1];
    let color;
    if(value> 250){
      color = "purple";
    }
    else if(value > 100){
      color = "blue";
      value = value*2;
    }
    else{
      color = "green";
      value = value*3;
    }

    gpoint.append("svg:circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("class","point")
      .attr("id",d.name)
      .attr("r", value/60)
      .style("fill",color)
      .style("cursor","pointer")
      .call(d3.helper.tooltip()
        .style({color: 'black'})
        .text(text+": "+value)
      )
      .on("mouseover", function() {
        d3.select(this).style("stroke","white");
      })
      .on("mouseout", function() {
        d3.select(this).style("stroke","");
      })
      .on("click", function() {
        d3.select(this).style("stroke","white");
        d3.select("#meme").remove();
        d3.select("#airport").text(d.airport+" ("+d.name+")");
        d3.select("#airport_city").text(d.city+", "+d.state+": "+d.current_time);
        d3.select("#airport_weather").text("Temperature:"+Math.round(d.temperature)+"°C, Humidity:"+Math.round(d.humiditiy)+"%, "+d.summary);
        var skycons = new Skycons();
        skycons.add("icon", d.icon);
        skycons.play();
      });
    }
    catch(err) {
      return;
    }
}

var throttleTimer;
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
