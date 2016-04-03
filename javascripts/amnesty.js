if('querySelector' in document
  && 'addEventListener' in window) {
    var jsCheck = document.getElementById('map-no-show');
    jsCheck.id="map";
  }

d3.select(window).on("resize", throttle);

var scaleAdjust;
var windowWidth = window.innerWidth;

if (windowWidth < 640) {
  scaleAdjust = 1.6;
  var clientHeight = document.getElementById('overview-year');
  var distanceFromTop = clientHeight.getBoundingClientRect().bottom;
  var detailBoxHeight = document.getElementById('detail-box');
  detailBoxHeight.style.top = '"' + distanceFromTop + 'px"';
}

else {
  scaleAdjust = 1.05;
}

var width = document.getElementById('map').offsetWidth;
var height = width / scaleAdjust;
var center = [width / 2, height / 2];

var startYear = '2015';
var currentYear = startYear;
var tooltip = d3.select("#map").append("div").attr("class", "tooltip hidden");
var activeCountries, yearCountries, topo, borders, coastline, projection, path, svg, g, zoom;
var active = d3.select(null);

setup(width,height);

function setup(width,height){
  zoom = d3.behavior.zoom()
            .scaleExtent([1, 6])
            .on("zoom", move);

  projection = d3.geo.mercator()
    .translate([(width/2), (height/2)])
    .scale( width / 2 / Math.PI);

  path = d3.geo.path()
          .projection(projection);

  svg = d3.select("#map").append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .append("g");

  g = svg.append("g");
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);
  g.transition().duration(750).attr("transform", "");
}

//Loads in the world data and the active countries
queue()
    .defer(d3.json, "data/world-topo.json")
    .defer(d3.json, "data/data.json")
    .await(ready);

function ready(error, world, active) {
  var countries = topojson.feature(world, world.objects.countries).features;
  topo = countries;
  activeCountries = active;
  coastline = topojson.mesh(world, world.objects.countries, function(a, b) { return a === b });
  draw(topo, activeCountries, coastline);
}

function draw(topo, activeCountries, coastline) {

  var yearData = activeCountries.filter(function(val) {
    return val.year === currentYear;
  });
  console.log (yearData);
  yearCountries = yearData[0].countries;

  topo.forEach(function(d, i) {
        yearCountries.forEach(function(e, j) {
            if (d.id === e.id) {
                e.geometry = d.geometry;
                e.type = d.type;
            }
        })
    });

  var executionsTotal = document.getElementById('executions-total');
  var template = Hogan.compile("{{total-executions}}");
  var output = template.render(yearData[0]);
  executionsTotal.innerHTML = output;

  var country = g.selectAll(".country").data(topo);
  country.enter().insert("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("id", function(d,i) { return d.id; })
      .attr("title", function(d,i) { return d.properties.name; })
      .style("fill", function(d, i) { return d.properties.color; });

  var activeCountry = g.selectAll(".activeCountry").data(yearCountries);

   g.selectAll(".country")
        .data(topo)
       .enter().append("path")
        .attr("class", "country")
        .attr("id", function(d) { return d.id; })
        .attr("d", path);

   g.insert("path", ".graticule")
      .datum(coastline)
      .attr("class","coastline")
      .attr("d", path);

  activeCountry.enter().append("path")
      .attr("class", function(d,i) {
        var status = d.status.toLowerCase().replace(/.\s/g,"");
        console.log (status);
        return status;
      })
      .attr("id", function(d) { return d.id; })
      .attr("d", path);

  //ofsets plus width/height of transform, plus 20 px of padding, plus 20 extra for tooltip offset off mouse
  var offsetL = document.getElementById('map').offsetLeft+(width/80);
  var offsetT =document.getElementById('map').offsetTop+(height/80);

  activeCountry
    .on("mousemove", function(d,i) {
        var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );
          tooltip
            .classed("hidden", false)
            .attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px")
            .html('<div class="title-text">'+ d.name + '</div>')
        })
        .on("mouseout",  function(d,i) {
          tooltip.classed("hidden", true)
        });

  activeCountry.on('click', function(d){
    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var detailBox = document.getElementById('detail-box');
    detailBox.classList.add("reveal");
    var detailTemplate = Hogan.compile("<div class='wrapper'><div id='btn-close'>×</div><h1 class='no-caps-title'>{{name}}</h1><div class='status-block'><h2>{{status}}{{#since}} since {{since}}{{/since}}</h2></div><div class='totals-block'>{{#death-penalties}}<div class='media bg-white pa3'><div class='media__img'><img class='death-sentences-icon' src='images/death.jpg'></div><div class='media__body'><h2 class='ttu kilo mt0 mb0'>{{death-penalties}}</h2><h3 class='ttu gamma mt0 mb2 lh-reset'>Death Sentences</h3></div></div>{{/death-penalties}}{{#executions}}<div class='media bg-black white pa3'><div class='media__img'><img class='executions-icon' src='images/execution.jpg'></div><div class='media__body'><h2 class='ttu kilo mt0 mb2'>{{executions}}</h2><h3 class='ttu gamma mt0 mb0 lh-reset'>Executions</h3></div></div>{{/executions}}</div></div>");
    var output = detailTemplate.render(d);
    detailBox.innerHTML = output;

    var btnClose = document.getElementById('btn-close');
    btnClose.addEventListener('click', function(event) {
      reset();
      detailBox.classList.remove("reveal");
    });
  });

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
        "value": 102
}, {
    "fullname": "Abolitionists for ordinary crimes",
        "value": 6
}, {
    "fullname": "Abolitionists in practice",
        "value": 32
}, {
    "fullname": "Retentionist",
        "value": 58
}];

var donutWidth = document.getElementById('donut-chart-wrapper').offsetWidth;
var donutHeight = (donutWidth/2)+(donutWidth/2.5);
var radius = Math.min(donutWidth, donutHeight) / 2;

console.log (donutWidth);

setupDonut(donutWidth,donutHeight);

function setupDonut (donutWidth,donutHeight){

var color = d3.scale.ordinal()
    .range(["#FFFF00", "#b6b6b6", "#7a7d81", "#000000"]);

var arc = d3.svg.arc()
    .outerRadius(radius)
    .innerRadius(radius * (50 / 100));

var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.value; });

var svgPie = d3.select("#donut-chart").append("svg")
    .attr("width", donutWidth)
    .data([data])
    .attr("height", (donutHeight+10))
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
}

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


function redraw() {
  width = document.getElementById('map').offsetWidth;
  windowWidth = window.innerWidth;
  console.log ("width: " + windowWidth);

  if (windowWidth < 640) {
    scaleAdjust = 1.6;
    var clientHeight = document.getElementById('overview-year');
    var distanceFromTop = clientHeight.getBoundingClientRect().bottom;
    var detailBoxHeight = document.getElementById('detail-box');
    detailBoxHeight.style.top = '"' + distanceFromTop + 'px"';
  }

  else {
    scaleAdjust = 1.05;
  }

  var height = width / scaleAdjust;
  d3.select('svg').remove();
  center = [width / 2, height / 2];
  setup(width,height);
  draw(topo, activeCountries, coastline);

  console.log (scaleAdjust);

  donutWidth = document.getElementById('donut-chart-wrapper').offsetWidth;
  donutHeight = (donutWidth/2)+(donutWidth/2.5);
  radius = Math.min(donutWidth, donutHeight) / 2;
  d3.select("#donut-chart > svg").remove();
  setupDonut(donutWidth,donutHeight);
}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw();
    }, 200);
}
