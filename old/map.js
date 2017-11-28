
d3.select(window).on("resize", throttle);

var zoom = d3.behavior.zoom()
.scaleExtent([1, 9])
.on("zoom", move);


var width = document.getElementById('mapYY').offsetWidth;
var height = width / 2;
var topo,projection,path,svg,g;

var graticule = d3.geo.graticule();

var tooltip = d3.select("#mapYY").append("div").attr("class", "tooltip hidden");

setup(width,height);

function setup(width,height){
  projection = d3.geo.mercator()
  .translate([(width/2), (height/2)])
  .center([-97, 50])
  .scale(500);

  path = d3.geo.path().projection(projection);

  svg = d3.select("#mapYY").append("svg")
  .attr("width", width)
  .attr("height", height)
  .call(zoom)
  .on("click", click)
  .append("g");

  g = svg.append("g");

}

d3.json("map/world-topo-min.json", function(error, world) {

  var countries = topojson.feature(world, world.objects.countries).features;

  topo = countries;
  draw(topo);

});

function draw(topo,size) {

  svg.append("path")
  .datum(graticule)
  .attr("class", "graticule")
  .attr("d", path);


  g.append("path")
  .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
  .attr("class", "equator")
  .attr("d", path);

  var country = g.selectAll(".country").data(topo);

  country.enter().insert("path")
  .attr("class", "country")
  .attr("d", path)
  .attr("id", function(d,i) { return d.id; })
  .attr("title", function(d,i) { return d.properties.name; })
  .style("fill", function(d, i) {
    if(d.properties.name == "United States"){
      return d.properties.color;
    }
    else return "black";
  });

  //offsets for tooltips
  var offsetL = document.getElementById('mapYY').offsetLeft+20;
  var offsetT = document.getElementById('mapYY').offsetTop+10;

  //tooltips
  country
  .on("mousemove", function(d,i) {

    var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

    tooltip.classed("hidden", false)
    .attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px")
    .html(d.properties.name);

  })
  .on("mouseout",  function(d,i) {
    tooltip.classed("hidden", true);
  });

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
  width = document.getElementById('mapYY').offsetWidth;
  height = width / 2;
  d3.select('svg').remove();
  setup(width,height);
  draw(topo,size);
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

  //adjust the country hover stroke width based on zoom level
  d3.selectAll(".country").style("stroke-width", 1.5 / s);

}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
  throttleTimer = window.setTimeout(function() {
    redraw();
  }, 200);
}

//geo translation on mouse click in map
function click() {
  var latlon = projection.invert(d3.mouse(this));
  // console.log(latlon);
}

//function to add points and text to the map
function addpoint(d) {
  var lon = d.latitude;
  var lat = d.longitude;
  var text = d.city;
  var value = d.flight;
  var gpoint = g.append("g").attr("class", "gpoint");
  var x = projection([lat,lon])[0];
  var y = projection([lat,lon])[1];

  let color;
  if(value> 250){
    color = "purple";
  }
  else if(value > 100){
    color = "blue";
  }
  else{
    color = "green";
  }

  gpoint.append("svg:circle")
  .attr("cx", x)
  .attr("cy", y)
  .attr("class","point")
  .attr("r", value/60)
  .style("fill",color)
  .style("stroke","white")
  .style("stroke-width",0.1)
  .style("cursor","pointer")
  .call(d3.helper.tooltip()
    .style({color: 'black'})
    .text(text+": "+value)
  )
.on('mouseover', function(d, i){ d3.select(this).style({fill: 'color'}); })
.on('mouseout', function(d, i){ d3.select(this).style({fill: 'color'}); });

//conditional in case a point has no associated text
// if(text.length>0){
//
//   gpoint.append("text")
//         .attr("x", x+2)
//         .attr("y", y+2)
//         .attr("class","text")
//         .text(text);
// }

}

d3.helper = {};

d3.helper.tooltip = function(){
  var tooltipDiv;
  var bodyNode = d3.select('body').node();
  var attrs = {};
  var text = '';
  var styles = {};

  function tooltip(selection){

    selection.on('mouseover.tooltip', function(pD, pI){
      var name, value;
      // Clean up lost tooltips
      d3.select('body').selectAll('div.tooltip').remove();
      // Append tooltip
      tooltipDiv = d3.select('body').append('div');
      tooltipDiv.attr(attrs);
      tooltipDiv.style(styles);
      var absoluteMousePos = d3.mouse(bodyNode);
      tooltipDiv.style({
        left: (absoluteMousePos[0] + 10)+'px',
        top: (absoluteMousePos[1] - 15)+'px',
        position: 'absolute',
        'z-index': 1001
      });
      // Add text using the accessor function, Crop text arbitrarily
      tooltipDiv.style('width', function(d, i){ return (text(pD, pI).length > 80) ? '300px' : null; })
      .html(function(d, i){return text(pD, pI);});
    })
    .on('mousemove.tooltip', function(pD, pI){
      // Move tooltip
      var absoluteMousePos = d3.mouse(bodyNode);
      tooltipDiv.style({
        left: (absoluteMousePos[0] + 10)+'px',
        top: (absoluteMousePos[1] - 15)+'px'
      });
      // Keep updating the text, it could change according to position
      tooltipDiv.html(function(d, i){ return text(pD, pI); });
    })
    .on('mouseout.tooltip', function(pD, pI){
      // Remove tooltip
      tooltipDiv.remove();
    });

  }

  tooltip.attr = function(_x){
    if (!arguments.length) return attrs;
    attrs = _x;
    return this;
  };

  tooltip.style = function(_x){
    if (!arguments.length) return styles;
    styles = _x;
    return this;
  };

  tooltip.text = function(_x){
    if (!arguments.length) return text;
    text = d3.functor(_x);
    return this;
  };

  return tooltip;
};
