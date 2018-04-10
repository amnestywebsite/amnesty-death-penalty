(function (global) {

if('querySelector' in document && 'addEventListener' in window) {
  var jsCheck = document.getElementById('map-no-show');
  jsCheck.id="map";
}

d3.select(window).on("resize", throttle);

var mapHeightWidthRatio = 0.45;
var mapWidthScaleFactor = 0.18504;
var windowWidth = window.innerWidth;

var width = document.getElementById('map').offsetWidth;
var height = width*mapHeightWidthRatio;
var mapScale = (width-20)*mapWidthScaleFactor;
var center = [width / 2, height * 0.567];// For some reason, the height needs to be translated a little more than half to actually center the map. No idea why.

var startYear = '2017';
var maxYear = '2017';
var minYear = '2007';
var currentYear = startYear;
var tooltip = d3.select("#map").append("div").attr("class", "tooltip hidden");
var tooltipOffset;
var activeCountries, yearCountries, topo, borders, coastline, projection, path, svg, g, zoom;
var active = d3.select(null);
var tooltipBar = d3.select("#bar-chart").append("div").attr("class", "tooltip hidden");

var sliderContainer;
var customSlider;
var sliderPlayPauseButton;
var sliderPlayPauseButtonState;

var defaultLang= "en";
var supportedLanguages = ['ar', 'en', 'es', 'fr','zh_Hans','zh_Hant','zh_TW','pt'];
var lang = getLangFromQueryString();
var dir;
setLangAndDir(lang);
var dictionary;
var detailTemplate;
var detailBoxOpen = false;
var selectedCountryId;
var somalilandBorder, kosovoBorder, westernSaharaBorder, golanHeightsBorder;

function Dictionary(dictionaryJson) {
  this.dictionary = dictionaryJson;
}

Dictionary.prototype.getTranslation = function (key, language) {
  var translation = '';

  if (language == undefined) {
    language = lang;
  }

  if ( this.dictionary.hasOwnProperty(key) && this.dictionary[key].hasOwnProperty(language) ) {
    translation = this.dictionary[key][language];
  }

  else {
    translation = key;
  }

  return translation;
};

var data = [];

setup(width,height);

function setup(width,height){
  zoom = d3.behavior.zoom()
            .scaleExtent([1, 6])
            .on("zoom", move);

  projection = d3.geo.naturalEarth()
    .scale(mapScale)
    .translate(center);

  path = d3.geo.path()
          .projection(projection);

  svg = d3.select("#map").append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .append("g");

  g = svg.append("g");
}

function getLangFromQueryString(){
  // Mostly shamelessly cribbed from here: http://stackoverflow.com/a/901144/20578
  var lang = defaultLang;
  var regex = new RegExp("[?&]" + "lang" + "(=([^&#]*)|&|#|$)");
  var results = regex.exec(window.location.href);

  if (results && results[2]) {
    lang = decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  return lang;
}

function setLangAndDir(lang) {
  var htmlEl = document.getElementsByTagName("html")[0];

  if (supportedLanguages.indexOf(lang) > -1) {
    htmlEl.lang = lang;
  }

  if (lang === "ar") {
    htmlEl.dir = "rtl";
    dir = "rtl";
  }
  else {
    dir = "ltr";
  }
}

function translateHTML() {
  var el,
      translateTextEls = document.querySelectorAll('[data-translate]'),
      translateTitleEls = document.querySelectorAll('[data-translate-title]'),
      i;

  for (i=0; i<translateTextEls.length; i++) {
    el = translateTextEls[i];
    el.innerHTML = dictionary.getTranslation( el.getAttribute('data-translate') );
  }

  for (i=0; i<translateTitleEls.length; i++) {
    el = translateTitleEls[i];
    el.title = dictionary.getTranslation( el.getAttribute('data-translate-title') );
  }
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);
  g.transition().duration(750).attr("transform", "");
}

function removeLoadingScreen() {
  var loadingScreenEl = document.getElementById('loading');

  if (!loadingScreenEl) {
    return;
  }

  if(typeof loadingScreenEl.style['transition'] !== 'undefined') {
    loadingScreenEl && loadingScreenEl.addEventListener('transitionend', function () {
      loadingScreenEl.parentNode.removeChild(loadingScreenEl);
    });

    loadingScreenEl.style.opacity = '0';
  }

  else {
    loadingScreenEl.parentNode.removeChild(loadingScreenEl);
  }
}

//Loads in the world data, the active countries, and the translation dictionary
queue()
    .defer(d3.json, "data/world-topo-1-3.json?cachebust="+(+new Date()))
    .defer(d3.json, "data/data.json?cachebust="+(+new Date()))
    .defer(d3.json, "lang/dictionary.json?cachebust="+(+new Date()))
    .await(ready);

function ready(error, world, active, dict) {
  dictionary = new Dictionary(dict);
  translateHTML();

  var countries = topojson.feature(world, world.objects.countries).features;
  topo = countries;

  // Add localised names and statuses to data, so that they can be used more easily in templates.
  for (var i=0; i<active.length; i++) {
    var data_year = active[i];
    for (var j=0; j<data_year.countries.length; j++) {
      var data_country = data_year.countries[j];

      data_country.name__localised = dictionary.getTranslation(data_country.name);
      data_country.status__localised = dictionary.getTranslation(data_country.status);
      data_country.definition__localised = dictionary.getTranslation(data_country.status + " DEFINITION");
    }
  }

  activeCountries = active;
  coastline = topojson.mesh(world, world.objects.countries, function(a, b) {return a === b;});

  //bit of custom stuff to show borders of disputed territories
  somalilandBorder = topojson.mesh(world, world.objects.countries, function(a, b) {return a === b && a.id === "SOL";});
  kosovoBorder = topojson.mesh(world, world.objects.countries, function(a, b) {return a === b && a.id === "RKS";});
  westernSaharaBorder = topojson.mesh(world, world.objects.countries, function(a, b) {return a !== b && b.properties.name === "Western Sahara";});
  golanHeightsBorder = topojson.mesh(world, world.objects.countries, function(a, b) {return a === b && b.properties.name === "Golan Heights";});

  westernSaharaBorder = {"type": "LineString",
        "coordinates": [
          [
            -13.18359375,
            27.664068965384516
          ],
          [
            -8.701171874999998,
            27.664068965384516
          ]
        ]
      };

  draw(topo, activeCountries, coastline, somalilandBorder, kosovoBorder, westernSaharaBorder, golanHeightsBorder);

  setupBarChart(activeCountries);
  setUpSliderPlayPauseButton();
  setupSlider();
  setupNextPreviousYear();

  if ('parentIFrame' in window) {
      parentIFrame.size();
  }
  removeLoadingScreen();
}

function draw(topo, activeCountries, coastline, somalilandBorder, kosovoBorder, westernSaharaBorder, golanHeightsBorder) {
 var completeDataArray = activeCountries;
 var yearData = _.filter(activeCountries, function(val) {
    return val.year === currentYear;
  });

  yearCountries = yearData[0].countries;

  topo.forEach(function(d, i) {
        yearCountries.forEach(function(e, j) {
            if (d.id === e.id) {
                e.geometry = d.geometry;
                e.type = d.type;
            }
        });
    });

  updateYearTotal(yearData);
  updateExecutionsTotal(yearData);

  function getAll(originalArray) {
    var result = [];
    for (var i = 0; i < originalArray.length; i++) {
      result.push(originalArray[i].countries);
    }
    return result;
  }

  function getCountries(originalArray) {
    result = [];
    for (var i = 0; i < originalArray.length; i++) {
    var current = originalArray[i];
    for (var j=0; j<current.length; ++j){
        var country = current[j].name;
        var id = current[j].id;
        result.push({id: id, name: country});
      }
    }
    return result;
  }

  function removeDuplicates(originalArray, prop) {
       var newArray = [];
       var lookupObject  = {};

       for(var i in originalArray) {
          lookupObject[originalArray[i][prop]] = originalArray[i];
       }

       for(i in lookupObject) {
           newArray.push(lookupObject[i]);
       }
        return newArray;
   }

  function toObject(originalArray) {
    var result = {};
    for(var i = 0; i < originalArray.length; i++) {
      var translatedName =  dictionary.getTranslation(originalArray[i].name);
      result[translatedName] = originalArray[i].id;
    }
    return result;
  }

  function showObject(obj) {
    var result = "";
    for (var p in obj) {
      if( obj.hasOwnProperty(p) ) {
        result += p + ",";
      }
    }
    return result;
  }

  var allData = getAll(completeDataArray);
  var allCountries = getCountries(allData);
  var uniqueCountries = removeDuplicates(allCountries,'name');
  var countryIdByName = toObject(uniqueCountries);
  var translatedCountryNameOnly = showObject(countryIdByName);

  var searchCountries = document.getElementById('search-box');
  var searchOutput = '<form onsubmit="return false;"><label class="visually-hidden" for="search-box-input">' + dictionary.getTranslation('SEARCH COUNTRY') + '</label><input id="search-box-input" class="awesomplete" data-list="' + translatedCountryNameOnly + '"" placeholder="' + dictionary.getTranslation('SEARCH COUNTRY') + '" /></form>';
  searchCountries.innerHTML = searchOutput;

  new Awesomplete(document.querySelector('.awesomplete'));
  document.querySelector('.awesomplete').addEventListener('awesomplete-selectcomplete', function (e) {
    var selectedCountryName = e.text.value;

    var selectedCountryId = countryIdByName[selectedCountryName];

    for (var i=0; i<yearCountries.length; i++) {
      if (yearCountries[i].id === selectedCountryId || yearCountries[i].ID === selectedCountryId) {
        activateCountry(yearCountries[i]);
        break;
      }
    }
  });

  var country = g.selectAll(".country").data(topo);
  country.enter().insert("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("id", function(d,i) { return d.id; })
      .attr("title", function(d,i) { return d.properties.name__localised; })
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
        var className = getPathClassFromCountry(d);

        return className;
      })
      .attr("id", function(d) { return d.id; })
      .attr("d", path);

    g.insert("path")
      .datum(somalilandBorder)
      .attr("class","disputed-boundary-background")
      .attr("d", path);
    g.insert("path")
      .datum(somalilandBorder)
      .attr("class","disputed-boundary")
      .attr("d", path);

    g.insert("path")
      .datum(westernSaharaBorder)
      .attr("class","disputed-boundary-background")
      .attr("d", path);
    g.insert("path")
      .datum(westernSaharaBorder)
      .attr("class","disputed-boundary")
      .attr("d", path);

    g.insert("path")
      .datum(golanHeightsBorder)
      .attr("class","disputed-boundary-background")
      .attr("d", path);
    g.insert("path")
      .datum(golanHeightsBorder)
      .attr("class","disputed-boundary")
      .attr("d", path);

    g.insert("path")
      .datum(kosovoBorder)
      .attr("class","disputed-boundary-background")
      .attr("d", path);
    g.insert("path")
      .datum(kosovoBorder)
      .attr("class","disputed-boundary")
      .attr("d", path);

  activeCountry
    .on("mousemove", function(d,i) {
        var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

        var xPositionProperty = (dir === "rtl" ? "right" : "left");
        var xPositionValue = (dir === "rtl" ? width-mouse[0]+15 : mouse[0]+15);

          tooltip
            .classed("hidden", false)
            .attr("style", xPositionProperty+":"+xPositionValue+"px;top:"+(mouse[1]+15)+"px")
            .html('<div class="title-text">'+ dictionary.getTranslation(d.name) + '</div>');
        })
        .on("mouseout",  function(d,i) {
          tooltip.classed("hidden", true);
        });

  activeCountry.on('click', activateCountry);
  activeCountry.on('touchend', activateCountry);
}

function updateYearTotal(yearData) {
  var yearTotal = document.getElementById('overview-year');
  var yearTemplate = Hogan.compile("{{year}}");
  var yearOutput = yearTemplate.render(yearData[0]);
  yearTotal.innerHTML = yearOutput;
}

function updateExecutionsTotal(yearData) {
  var executionsTotal = document.getElementById('executions-total');
  var template = Hogan.compile("{{total-executions}}");
  var output = template.render(yearData[0]);
  executionsTotal.innerHTML = output;
}

function getPathClassFromCountry(countryData) {
  var pathClass = countryData.status.toLowerCase().replace(/.\s/g,"");

  return pathClass;
}

function activateCountry(d){
  var countryElement = this;
  detailBoxOpen = true;
  var note;

  if (d.hasOwnProperty('since') && d.hasOwnProperty('status')) {
    selectedCountryId = (d.id || d.ID);
  }
  else {
    // If d doesn't look like a country object, then it's probably a list of all country objects for the current year, passed in from the timeline's change event listener. We thus need to find just the data for the country currently displayed in the detail box.
    for (var i=0; i<d.length; i++) {
      if (d[i].id === selectedCountryId || d[i].ID === selectedCountryId) {
        d = d[i];
        break;
      }
    }
  }

  if (countryElement.nodeName !== 'path') {
    countryElement = document.querySelector('path[id="' + (d.id || d.ID) + '"]:not(.country)');
  }

  if (d.note) {
    note = "<p class = 'mv2 detailBox-definition'>" + d.note[lang] + "</p>";
  }

  active.classed("active", false);
  active = d3.select(countryElement).classed("active", true);

  var detailBox = document.getElementById('detail-box');
  detailBox.classList.add("reveal");
  if (d.status == "ABOLITIONIST") {
    detailBox.classList.add("ABOLITIONIST");
  }
  else {
    detailBox.classList.remove("ABOLITIONIST");
  }

  var deathPenalties = d['death-penalties'] || '';
  var executions = d['executions'] || '';

  detailTemplate = Hogan.compile("<div class='wrapper'><div id='btn-close'>×</div><h1 class='no-caps-title pb1'>{{name__localised}}</h1><div class='status-block'><h2 class='mv2'>{{status__localised}}</h2></div>{{#since}}<div class='since-date'><h3 class='since-header'>" + dictionary.getTranslation('SINCE') + "<span>&nbsp;{{since}}</span>" + dictionary.getTranslation('SINCE_SUFFIX') + "</h3></div>{{/since}}<div class='definition'><p class='mv2 detailBox-definition'>{{definition__localised}}</p>{{#note}}" + note + "{{/note}}</p></div></div><div class='totals-block'><div class='media bg-white'>{{#death-penalties}}<div class='media__img dp-image'><img class='death-sentences-icon' src='images/hammer.svg'></div><div class='media__body'><h2 class='dp-header' id='dp-header'>" + dictionary.getTranslation(deathPenalties) + "</h2></div><h3 class='dp-words lh-reset'>" + dictionary.getTranslation('DEATH SENTENCES') + "</h3>{{/death-penalties}}</div><div class='media bg-black white'>{{#executions}}<div class='media__img executions-image'><img class='executions-icon' src='images/WhiteNoose.svg'></div><div class='media__body'><h2 class='execution-header' id='execution-header'>" + dictionary.getTranslation(executions) + "</h2></div><h3 class='execution-words lh-reset'>" + dictionary.getTranslation('EXECUTIONS') + "</h3>{{/executions}}</div></div>");
  var output = detailTemplate.render(d);
  detailBox.innerHTML = output;

  var btnClose = document.getElementById('btn-close');
  btnClose.addEventListener('click', function(event) {
    reset();
    detailBox.classList.remove("reveal");
    detailBoxOpen = false;
    selectedCountryId = null;
    document.querySelector('#search-box-input').value = '';
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

function setupBarChart(activeCountries) {
  var yearData = _.filter(activeCountries, function(val) {
    return val.year === currentYear;
  });
  var fullnameKeys = ["ABOLITIONIST", "ABOLITIONIST FOR ORDINARY CRIMES", "ABOLITIONIST IN PRACTICE", "RETENTIONIST"]
  var fullnameKeyIndex;
  var countryCounts = [];
  var i;
  var coloursForPolicy = {
    "ABOLITIONIST": "#ff0",
    "ABOLITIONIST FOR ORDINARY CRIMES": "#7a7d82",
    "ABOLITIONIST IN PRACTICE": "#b6b6b6",
    "RETENTIONIST": "#000"
  };
  var w = 368;
  var h = 270;
  var padding = {
    bottom: 30
  };
  var barAreaHeight;
  var barHeight;
  var svg;
  var barGroups;
  var scale;
  var axis;


  //clear the data array so it's just the current year
  data = [];

  for (var yearDataProperty in yearData[0]) {
    fullnameKeyIndex = fullnameKeys.indexOf(yearDataProperty);

    if (fullnameKeyIndex > -1) {
      data.push({
        fullnameKey: fullnameKeys[fullnameKeyIndex],
        fullname: dictionary.getTranslation(fullnameKeys[fullnameKeyIndex]),
        value: yearData[0][yearDataProperty]
      });
    }
  }

  barAreaHeight = (h-padding.bottom)/data.length;
  barHeight = barAreaHeight*0.55;


  // Create SVG
  svg = d3.select("#bar-chart")
    .append("svg")
      .attr("viewBox", "0 0 " + w + " " + h)
      .attr("direction", dir)
      .attr("xml:lang", lang)
      .append("g")
        .attr("class", "wrapper");

  // Flip the bar chart horizontally if we’re in RTL mode
  if (dir === "rtl") {
    svg.attr("transform", "translate("+w+", 0) scale(-1, 1)");
  }

  // Create our D3 scale
  for (i=0; i<data.length; i++) {
    countryCounts.push( parseInt(data[i].value, 10) );
  }

  scale = d3.scale.linear()
    .domain([0, d3.sum(countryCounts)])
    .range([0, w]);


  // Draw and adjust the axis
  axis = d3.svg.axis()
    .scale( d3.scale.linear().domain([0, 1]).range([0, w]) )
    .tickValues([0, .25, .5, .75, 1])
    .tickSize(h - padding.bottom)
    .tickFormat( d3.format('%') );

  svg.append("g")
    .attr("class", "axis")
    .call(axis)
    .selectAll("g.tick text")
      // Center the text baseline in the padding area...
      .attr("y", function () {
        var tickLabelYPosition = h - (padding.bottom/2);

        return tickLabelYPosition;
      })
      // ...then vertically center-align the text in relation to the baseline...
      .attr("dominant-baseline", "middle")
      // ...and remove D3’s default vertical positioning for axis label text.
      .attr("dy", "0")
      // We should be able to leave the direction as-is. However, IE doesn't seem to lay text out right-to-left unless we also set unicode-bidi:bidi-override, and doing that to these labels makes the numbers get reversed (e.g. “25%” becomes “%52”), which I believe is wrong. So we force LTR to make other browsers behave like IE.
      .attr("direction", "ltr");

  // And because we’ve forced direction="ltr" on these labels, we need different text anchoring depending on the graph’s base RTL mode to get the first and last labels flush with the side of the graph.
  svg.select("g.tick:first-of-type text")
    .style("text-anchor", function () {
      var textAnchorValue = (dir === "rtl" ? "end" : "start");

      return textAnchorValue;
    });

  svg.select("g.tick:last-of-type text")
    .style("text-anchor", function () {
      var textAnchorValue = (dir === "rtl" ? "start" : "end");

      return textAnchorValue;
    });


  // Draw bars
  barGroups = svg.selectAll("g.barGroup")
    .data(data)
    .enter()
    .append("g")
      .attr("class", "barGroup");

  barGroups.append("rect")
    .attr("x", 1)
    .attr("y", function (d, i) {
      var barYPosition = (i * barAreaHeight) + (barAreaHeight - barHeight);

      return barYPosition;
    })
    .attr("width", function (d) {
      var width = scale( parseInt(d.value, 10) );

      return width;
    })
    .attr("height", barHeight)
    .attr("class", function (d) {
      var barClassName = d.fullnameKey.replace(/ /g, '_').toUpperCase();

      return barClassName;
    });

  barGroups.append("text")
    .attr("x", function () {
      var textXPosition = (dir === "rtl" ? -2 : 2);

      return textXPosition;
    })
    .attr("y", function (d, i) {
      var textBaselineYPosition = (i * barAreaHeight) + (barAreaHeight - barHeight) - 4;

      return textBaselineYPosition;
    })
    // It seems that we need unicode-bidi set to bidi-override on SVG <text> elements to make IE lay out text right-to-left when the SVG’s direction is RTL (other browsers seem to do this automatically). (See e.g. http://stackoverflow.com/questions/16696434/browser-difference-in-displaying-svg-rtl-text-with-bidi-override-and-text-anchor) I'm not sure why, or if this is entirely appropriate.
    .attr("unicode-bidi", "bidi-override")
    .text(function (d) {
      var text = d.fullname;

      return text;
    });

  // Set up bar chart tooltips
  barGroups
    .on("mousemove", function(d,i) {
      var mouse = d3.mouse(d3.select('#bar-chart').node());
      var barChartWidth = d3.select('#bar-chart').node().offsetWidth;
      var xPositionProperty = (dir === "rtl" ? "right" : "left");
      var xPositionValue = (dir === "rtl" ? barChartWidth-mouse[0]+15 : mouse[0]+15);

      tooltipBar
        .classed("hidden", false)
        .attr("style", xPositionProperty+":"+xPositionValue+"px;top:"+(mouse[1]+15)+"px")
        .html('<div class="title-text">' + d.value + ' ' + dictionary.getTranslation('COUNTRIES') + '<br><br>' + dictionary.getTranslation(d.fullnameKey + ' DEFINITION') + '</div>');
      })
      .on("mouseout",  function(d,i) {
        tooltipBar.classed("hidden", true);
      });

  // If we’re in RTL mode, re-flip text elements, so that the words aren’t mirrored.
  if (dir === "rtl") {
    svg.selectAll("text")
      .attr("transform", "scale(-1, 1)");
  }

}

function setUpSliderPlayPauseButton() {
  sliderPlayPauseButton = document.getElementById('slider-play-pause');
  sliderPlayPauseButton.style.height = '58px';/* Must match the custom slider’s height below, taking borders into account */

  sliderPlayPauseButton.addEventListener('click', function () {
    if (sliderPlayPauseButtonState === 'play') {
      playSlider();
    }
    else {
      pauseSlider();
    }
  });

  function playSlider() {
    sliderPlayPauseButton.className = 'pause';
    sliderPlayPauseButton.innerHTML = dictionary.getTranslation('PAUSE');
    sliderPlayPauseButtonState = 'pause';
    customSlider.play();
  }

  function pauseSlider() {
    sliderPlayPauseButton.className = 'play';
    sliderPlayPauseButton.innerHTML = dictionary.getTranslation('PLAY');
    sliderPlayPauseButtonState = 'play';
    customSlider.pause();
  }

  sliderPlayPauseButton.className = 'play';
  sliderPlayPauseButton.innerHTML = dictionary.getTranslation('PLAY');
  sliderPlayPauseButtonState = 'play';
}

function setupSlider() {
  sliderContainer = document.getElementById('slider');
  sliderContainer.style.width = windowWidth+'px';

  customSlider = chroniton()
    .domain([new Date(minYear), new Date(maxYear)])
    .hideLabel()
    .tapAxis(function (axis) {
      axis.orient('top');
    })
    .width(windowWidth - sliderPlayPauseButton.getBoundingClientRect().width)
    .height(58)
    .playButton(false)
        .playbackRate(1)
        .loop(true);

  d3.select("#slider")
      .call(customSlider);

  customSlider
    .setValue(new Date(startYear));

  customSlider
    .on('change', function(date) {
      var newYear = date.getFullYear().toString();
      changeYear(newYear);
    });
}

function updateSliderWidth() {
  var newSliderWidth = windowWidth - sliderPlayPauseButton.getBoundingClientRect().width,
      existingSliderSVGEl = document.querySelector('.chroniton .slider');

  // Removing existing slider pointer element, to avoid it being redrawn repeatedly for some reason
  existingSliderSVGEl.parentNode.removeChild(existingSliderSVGEl);

  customSlider.width(newSliderWidth);

  d3.select("#slider").call(customSlider);
}

function setupNextPreviousYear() {
  document.getElementById('timeline-previous').addEventListener('click', function () {
    var newYear;

    if (currentYear === minYear) {
      newYear = maxYear;
    }
    else {
      newYear = (parseInt(currentYear, 10)-1).toString();
    }

    // Setting a new customSlider value will result in changeYear() being called
    customSlider
      .setValue(new Date(newYear));
  });

  document.getElementById('timeline-next').addEventListener('click', function () {
    var newYear;

    if (currentYear === maxYear) {
      newYear = minYear;
    }
    else {
      newYear = (parseInt(currentYear, 10)+1).toString();
    }

    // Setting a new customSlider value will result in changeYear() being called
    customSlider
      .setValue(new Date(newYear));
  });
}

function changeYear(newYear) {

  if (newYear.toString() != currentYear) {
    currentYear = newYear;

    updateMapClasses();

    var yearData = _.filter(activeCountries, function(val) {
      return val.year === currentYear;
    });

    updateYearTotal(yearData);
    updateExecutionsTotal(yearData);

    d3.select("#bar-chart > svg").remove();
    setupBarChart(activeCountries);

    if (detailBoxOpen) {
      var d = yearData[0].countries;
      activateCountry(d);
    }

    document.getElementById('overview-year-m').innerText = newYear;
  }
}

function updateMapClasses() {
  var yearCountry,
      yearCountryMapElement,
      i,
      className,
      yearData = _.filter(activeCountries, function(val) {
        return val.year === currentYear;
      });

  yearCountries = yearData[0].countries;

  for (i=0; i<yearCountries.length; i++) {
    yearCountry = yearCountries[i];

    yearCountryMapElement = d3.select(document.querySelector('path[id="' + yearCountry.id + '"]:not(.country)'));

    className = getPathClassFromCountry(yearCountry);

    yearCountryMapElement.attr('class', className);
  }
}

function redraw() {
  width = document.getElementById('map').offsetWidth;
  windowWidth = window.innerWidth;

  if (windowWidth < 752) {
    var clientHeight = document.getElementById('overview-year');
    var distanceFromTop = clientHeight.getBoundingClientRect().bottom;
    var detailBoxHeight = document.getElementById('detail-box');
    detailBoxHeight.style.top = '"' + distanceFromTop + 'px"';
  }

  var height = width*mapHeightWidthRatio;
  d3.select('#map svg').remove();
  mapScale = (width-20)*mapWidthScaleFactor;
  center = [width / 2, height * 0.567];
  setup(width,height);
  draw(topo, activeCountries, coastline, somalilandBorder, kosovoBorder, westernSaharaBorder, golanHeightsBorder);

  d3.select("#bar-chart > svg").remove();
  setupBarChart(activeCountries);
}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw();
      updateSliderWidth();
      if ('parentIFrame' in window) {
          parentIFrame.size();
      }
    }, 200);
}

})(window);
