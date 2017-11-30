console.log("hhh");

var currentColor = 'dark';
var currentViolinColor = 'dark';
var chart1;
d3.csv("data/speed.csv", function(data) {
  // data = data.filter(function(row) {
  //       return row.IATA_CODE == "AA";
  //   })
  chart1 = makeDistroChart(data, 'IATA_CODE', 'SPEED');
  chart1.bind("#speed",{chartSize:{height:600, width:960}, constrainExtremes:false, axisLabels: {xAxis: 'Speed (km/h)', yAxis: 'Companies'}});
  chart1.renderViolinPlot({violinWidth:90, colors:["#555"]});
  chart1.renderBoxPlot({boxWidth:20, showOutliers:false});

});
