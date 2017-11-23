d3.csv("data/airports.csv", function(data) {
  data.forEach(function(d) {
    console.log(d.LATITUDE,d.LONGITUDE)
  });
});
