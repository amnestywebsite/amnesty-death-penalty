if('querySelector' in document
     && 'addEventListener' in window) {
      var jsCheck = document.getElementById('map-no-show');
      jsCheck.id="map";
     }

d3.select(window).on("resize", throttle);

var zoom = d3.behavior.zoom()
    .scaleExtent([1, 7])
    .on("zoom", move);

var width = document.getElementById('map').offsetWidth;
var height = width / 1.2;

var topo,projection,path,svg,g;

setup(width,height);

function setup(width,height){
  projection = d3.geo.times()
    .translate([(width/2), (height/2)])
    .scale(160)
    .precision(.1);

  path = d3.geo.path().projection(projection);

  svg = d3.select("#map").append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .append("g");

  g = svg.append("g");

}

d3.json("data/world-topo.json", function(error, world) {

  var countries = topojson.feature(world, world.objects.countries).features;

  topo = countries;
  draw(topo);

});

function draw(topo) {

  var country = g.selectAll(".country").data(topo);

  country.enter().insert("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("id", function(d,i) { return d.id; })
      .attr("title", function(d,i) { return d.properties.name; })
      .style("fill", function(d, i) { return d.properties.color; });

}


function redraw() {
  width = document.getElementById('map').offsetWidth;
  height = width / 1.3;
  d3.select('svg').remove();
  setup(width,height);
  draw(topo);
}

d3.selectAll("button[data-zoom]")
    .on("click", zoomClicked);

function zoomClicked() {
  console.log ("zoom clicked");
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

}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw();
    }, 200);
}



