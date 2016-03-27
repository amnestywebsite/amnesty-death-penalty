if('querySelector' in document
  && 'addEventListener' in window) {
    var jsCheck = document.getElementById('map-no-show');
    jsCheck.id="map";
  }

d3.select(window).on("resize", throttle);

var scaleAdjust = 1.08;
var width = document.getElementById('map').offsetWidth;
var height = width / scaleAdjust;
var center = [width / 2, height / 2];

console.log ("width: " + width);
console.log ("height: " + height);
console.log ("centre: " + center);

var topo,projection,path,svg,g;

setup(width,height);

function setup(width,height){
  projection = d3.geo.mercator()
    .translate([(width/2), (height/2)])
    .scale( width / 2 / Math.PI);

  path = d3.geo.path().projection(projection);

  svg = d3.select("#map").append("svg")
      .attr("width", width)
      .attr("height", height)
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


var zoom = d3.behavior.zoom()
            .scaleExtent([1, 8])
            .on("zoom", move);
            svg.call(zoom);

function redraw() {
  width = document.getElementById('map').offsetWidth;
  var height = width / scaleAdjust;
  d3.select('svg').remove();
  center = [width / 2, height / 2];
  setup(width,height);
  draw(topo);
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

d3.select('#zoom-in').on('click', function () {
    var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate();
    var x = translate[0], y = translate[1];
    var factor = 1.2;

    var target_scale = scale * factor;

    if (scale === extent[1]) {
        return false;
    }
    var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
    if (clamped_target_scale != target_scale) {
        target_scale = clamped_target_scale;
        factor = target_scale / scale;
    }
    x = (x - center[0]) * factor + center[0];
    y = (y - center[1]) * factor + center[1];

    zoom.scale(target_scale).translate([x, y]);

    g.transition().attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")");
    g.selectAll("path")
            .attr("d", path.projection(projection));

});

d3.select('#zoom-out').on('click', function () {
    var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate();
    var x = translate[0], y = translate[1];
    var factor = 1 / 1.2;

    var target_scale = scale * factor;

    if (scale === extent[0]) {
        return false;
    }
    var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
    if (clamped_target_scale != target_scale) {
        target_scale = clamped_target_scale;
        factor = target_scale / scale;
    }
    x = (x - center[0]) * factor + center[0];
    y = (y - center[1]) * factor + center[1];

    zoom.scale(target_scale).translate([x, y]);

    g.transition()
            .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")");
    g.selectAll("path")
            .attr("d", path.projection(projection));

});

var data = [{
    "fullname": "Abolitionists",
        "value": 98
}, {
    "fullname": "Abolitionists for ordinary crimes",
        "value": 7
}, {
    "fullname": "Abolitionists in practice",
        "value": 35
}, {
    "fullname": "Retentionist",
        "value": 58
}];

var donutWidth = document.getElementById('info-box-inner').offsetWidth;
var donutHeight = (donutWidth)/2
var radius = Math.min(donutWidth, donutHeight) / 2;

console.log (donutWidth);

var color = d3.scale.ordinal()
    .range(["#FFFF00", "#515151", "#808080", "#000000"]);

var arc = d3.svg.arc()
    .outerRadius(radius)
    .innerRadius(radius * (50 / 100));

var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.value; });

var svgPie = d3.select("#donut-chart").append("svg")
    .attr("width", donutWidth)
    .data([data])
    .attr("height", donutHeight)
  .append("g")
    .attr("transform", "translate(" + donutWidth / 2 + "," + donutHeight / 2 + ")");

  var gPie = svgPie.selectAll(".arc")
      .data(pie(data))
    .enter().append("g")
      .attr("class", "arc");

  gPie.append("path")
      .attr("d", arc)
      .style("fill", function(d) { return color(d.data.value); });

  gPie.append("text")
      .attr("transform", function(d) {
        return "translate(" + ( (radius - 12) * Math.sin( ((d.endAngle - d.startAngle) / 2) + d.startAngle ) ) + "," + ( -1 * (radius - 12) * Math.cos( ((d.endAngle - d.startAngle) / 2) + d.startAngle ) ) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", function(d) {
        var rads = ((d.endAngle - d.startAngle) / 2) + d.startAngle;
        if ( (rads > 7 * Math.PI / 4 && rads < Math.PI / 4) || (rads > 3 * Math.PI / 4 && rads < 5 * Math.PI / 4) ) {
          return "middle";
        } else if (rads >= Math.PI / 4 && rads <= 3 * Math.PI / 4) {
          return "start";
        } else if (rads >= 5 * Math.PI / 4 && rads <= 7 * Math.PI / 4) {
          return "end";
        } else {
          return "middle";
        }
      })
      .attr("class", "title-text")
      .text(function(d) {
        return d.data.fullname; })
      .call(wrap, 100);

function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        lineHeight = 1.1, // ems
        tspan = text.text(null).append("tspan").attr("x", function(d) { return d.children || d._children ? -10 : 10; }).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            var textWidth = tspan.node().getComputedTextLength();
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                ++lineNumber;
                tspan = text.append("tspan").attr("x", function(d) { return d.children || d._children ? -10 : 10; }).attr("y", 0).attr("dy", lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}


